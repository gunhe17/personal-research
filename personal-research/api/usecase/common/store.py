from __future__ import annotations

import contextvars
import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import date, datetime, timezone
from pathlib import Path

API = Path(__file__).resolve().parents[2]
DATABASE = API / (os.environ.get("DATABASE_PATH") or "database/research.db")
CLI = API / "data" / "cli"
IDENTIFIER = r"[a-zA-Z0-9_-]+"
USER = "default"
CURRENT: contextvars.ContextVar[str | None] = contextvars.ContextVar("user", default=None)
MESSAGE = (
    "id", "conversation_id", "role", "kind", "content", "context", "rich", "sources",
    "question_id", "client_id", "status", "error", "created_at",
)
SCHEMA = """
CREATE TABLE IF NOT EXISTS collected (
    id   TEXT PRIMARY KEY,
    url  TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    meta TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS collected_url ON collected (url);

CREATE TABLE IF NOT EXISTS collected_content (
    collected_id TEXT NOT NULL,
    language     TEXT NOT NULL,
    version      INTEGER NOT NULL,
    decoration   TEXT NOT NULL DEFAULT '',
    content      TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    PRIMARY KEY (collected_id, language, version)
);

CREATE TABLE IF NOT EXISTS space (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    user_id    TEXT NOT NULL DEFAULT 'default',
    deleted_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS space_material (
    id         TEXT PRIMARY KEY,
    space_id   TEXT NOT NULL,
    kind       TEXT NOT NULL,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS space_material_space ON space_material (space_id);

CREATE TABLE IF NOT EXISTS space_conversation (
    id           TEXT PRIMARY KEY,
    space_id     TEXT NOT NULL,
    collected_id TEXT NOT NULL DEFAULT '',
    title        TEXT NOT NULL,
    meta         TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    user_id      TEXT NOT NULL DEFAULT 'default',
    deleted_at   TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS space_conversation_space ON space_conversation (space_id);

CREATE TABLE IF NOT EXISTS space_message (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role            TEXT NOT NULL,
    kind            TEXT,
    content         TEXT NOT NULL,
    context         TEXT,
    rich            TEXT,
    sources         TEXT,
    question_id     TEXT,
    client_id       TEXT,
    status          TEXT,
    error           TEXT,
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS space_message_conversation ON space_message (conversation_id);

CREATE TABLE IF NOT EXISTS agent_conversation (
    id           TEXT PRIMARY KEY,
    collected_id TEXT NOT NULL DEFAULT '',
    title        TEXT NOT NULL,
    meta         TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    user_id      TEXT NOT NULL DEFAULT 'default',
    deleted_at   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS agent_message (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role            TEXT NOT NULL,
    kind            TEXT,
    content         TEXT NOT NULL,
    context         TEXT,
    rich            TEXT,
    sources         TEXT,
    question_id     TEXT,
    client_id       TEXT,
    status          TEXT,
    error           TEXT,
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS agent_message_conversation ON agent_message (conversation_id);

CREATE TABLE IF NOT EXISTS user (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL,
    password   TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL DEFAULT '',
    role       TEXT NOT NULL DEFAULT 'user',
    deleted_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS user_session (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_meta (
    user_id      TEXT NOT NULL,
    kind         TEXT NOT NULL,
    collected_id TEXT NOT NULL DEFAULT '',
    value        TEXT NOT NULL DEFAULT '{}',
    secret       TEXT NOT NULL DEFAULT '',
    updated_at   TEXT NOT NULL,
    PRIMARY KEY (user_id, kind, collected_id)
);

CREATE TABLE IF NOT EXISTS llm (
    id          TEXT PRIMARY KEY,
    provider    TEXT NOT NULL,
    model       TEXT NOT NULL DEFAULT '',
    purpose     TEXT NOT NULL,
    owner_id    TEXT NOT NULL DEFAULT '',
    command     TEXT NOT NULL,
    request     TEXT NOT NULL,
    response    TEXT NOT NULL,
    stderr      TEXT NOT NULL DEFAULT '',
    exit_code   INTEGER,
    started_at  TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    auth        TEXT NOT NULL DEFAULT '',
    user_id     TEXT NOT NULL DEFAULT 'default'
);
CREATE INDEX IF NOT EXISTS llm_owner ON llm (owner_id);

CREATE TABLE IF NOT EXISTS log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    level      TEXT NOT NULL,
    message    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS log_created_at ON log (created_at);
"""


def today() -> str:
    return date.today().isoformat()


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def user() -> str:
    current = CURRENT.get()
    if current is None:
        raise RuntimeError("사용자가 정해지지 않았습니다.")

    return current


# #
# session

@contextmanager
def session():
    from usecase.common import migrate

    DATABASE.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE, timeout=30)
    try:
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA busy_timeout = 30000")
        connection.executescript(SCHEMA)
        migrate.upgrade(connection=connection)
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def columns(*, connection, table: str) -> set[str]:
    return {
        r[1] for r in connection.execute(f"PRAGMA table_info({table})")
    }


# #
# opened

def touch(*, id: str) -> str:
    with session() as connection:
        connection.execute(
            "INSERT OR REPLACE INTO user_meta (user_id, kind, collected_id, value, updated_at) VALUES (?, 'opened', ?, '{}', ?)",
            (user(), id, now()),
        )

    return id


# #
# shared

def material(*, connection, space_id: str, kind: str, title: str, content: str, created_at: str) -> None:
    if not content:
        return
    connection.execute(
        "INSERT INTO space_material (id, space_id, kind, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), space_id, kind, title, content, created_at, created_at),
    )


def insert_message(*, connection, domain: str, message: dict, conversation_id: str, ignore: bool = False) -> None:
    connection.execute(
        f"INSERT {'OR IGNORE ' if ignore else ''}INTO {domain}_message ({', '.join(MESSAGE)}) VALUES ({', '.join('?' * len(MESSAGE))})",
        stored(message=message, conversation_id=conversation_id),
    )


def stored(*, message: dict, conversation_id: str) -> tuple:
    encoded = lambda value: None if value is None else json.dumps(value, ensure_ascii=False)

    return (
        message["id"],
        conversation_id,
        message["role"],
        message.get("kind"),
        message.get("content", message.get("body")) or "",
        encoded(message.get("context")),
        encoded(message.get("rich")),
        encoded(message.get("sources")),
        message.get("question_id"),
        message.get("client_id"),
        message.get("status"),
        message.get("error"),
        message.get("created_at") or now(),
    )

from __future__ import annotations

import json
import os
import re
import sqlite3
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path

API = Path(__file__).resolve().parents[2]
DATABASE = API / (os.environ.get("DATABASE_PATH") or "database/research.db")
LANGUAGES = ("eng", "kor")
DOCUMENT_SUFFIX = (".md", ".html")
DECORATION = re.compile(r"\A(?:> ## Documentation Index\n(?:>.*\n)*|---\n(?s:.*?)\n---\n)\n*")
USER = "default"
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
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS space_material (
    id         TEXT PRIMARY KEY,
    space_id   TEXT NOT NULL,
    kind       TEXT NOT NULL,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS space_material_space ON space_material (space_id);

CREATE TABLE IF NOT EXISTS space_conversation (
    id           TEXT PRIMARY KEY,
    space_id     TEXT NOT NULL,
    collected_id TEXT NOT NULL DEFAULT '',
    title        TEXT NOT NULL,
    meta         TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
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
    updated_at   TEXT NOT NULL
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
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_meta (
    user_id      TEXT NOT NULL,
    kind         TEXT NOT NULL,
    collected_id TEXT NOT NULL DEFAULT '',
    value        TEXT NOT NULL DEFAULT '{}',
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
    finished_at TEXT NOT NULL
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


@dataclass
class Document:
    path: str
    body: str
    url: str
    decoration: str = ""
    extra: dict = field(default_factory=dict)


def today() -> str:
    return date.today().isoformat()


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


# #
# session

@contextmanager
def session():
    DATABASE.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE, timeout=30)
    try:
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA busy_timeout = 30000")
        connection.executescript(SCHEMA)
        if not UPGRADED:
            upgrade(connection=connection)
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


# #
# locate

def locate(*, text: str) -> str | None:
    wanted = text.strip().replace("\\", "/")
    if "/collected/" in wanted:
        wanted = wanted.rsplit("/collected/", 1)[1]
    wanted = wanted.lstrip("/")
    for language in LANGUAGES:
        wanted = wanted.removeprefix(f"{language}/")
    with session() as connection:
        row = connection.execute(
            """SELECT id FROM collected
               WHERE id = ?1 OR path = ?1 OR rtrim(url, '/') = rtrim(?1, '/')
               ORDER BY path LIMIT 1""",
            (wanted,),
        ).fetchone()

    return row[0] if row else None


def resolve(*, text: str) -> str:
    found = locate(text=text)
    if found is None:
        raise ValueError(f"Document not found: {text}")

    return found


def path_of(*, id: str) -> str:
    with session() as connection:
        row = connection.execute("SELECT path FROM collected WHERE id = ?", (id,)).fetchone()
    if row is None:
        raise ValueError(f"Document not found: {id}")

    return row[0]


def slugify(*, title: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", title.lower())

    return re.sub(r"[\s_]+", "-", slug).strip("-")[:90]


# #
# content

def read(*, id: str, language: str) -> str:
    with session() as connection:
        row = latest(connection=connection, id=id, language=language)
    if row is None:
        raise ValueError(f"No body for {id} {language}")

    return row["content"]


def exists(*, id: str, language: str) -> bool:
    with session() as connection:
        return latest(connection=connection, id=id, language=language) is not None


def version(*, id: str, language: str) -> int:
    with session() as connection:
        row = latest(connection=connection, id=id, language=language)

    return row["version"] if row else 0


def latest(*, connection, id: str, language: str):
    connection.row_factory = sqlite3.Row

    return connection.execute(
        """SELECT * FROM collected_content
           WHERE collected_id = ? AND language = ?
           ORDER BY version DESC LIMIT 1""",
        (id, language),
    ).fetchone()


def save(*, id: str, language: str, body: str, decoration: str = "") -> str:
    with session() as connection:
        current = latest(connection=connection, id=id, language=language)
        if language == "eng":
            if current and current["content"] == body and current["decoration"] == decoration:
                return id
            number = current["version"] + 1 if current else 1
        else:
            source = latest(connection=connection, id=id, language="eng")
            if source is None:
                raise ValueError(f"No English original for {id}")
            number = source["version"]
        connection.execute(
            "INSERT OR REPLACE INTO collected_content VALUES (?, ?, ?, ?, ?, ?)",
            (id, language, number, decoration, body, now()),
        )

    return id


def write(*, document: Document) -> str:
    id = record(path=document.path, url=document.url, extra=document.extra)
    save(id=id, language="eng", body=document.body, decoration=document.decoration)

    return id


def split(*, text: str) -> tuple[str, str]:
    matched = DECORATION.match(text)

    return (matched.group(0), text[matched.end():]) if matched else ("", text)


def mirror(*, url: str, path: str, text: str) -> str:
    decoration, body = split(text=text)
    id = record(path=path, url=url, extra={})
    save(id=id, language="eng", body=body, decoration=decoration)

    return id


# #
# meta

def meta(*, id: str) -> dict:
    with session() as connection:
        row = connection.execute("SELECT url, path, meta FROM collected WHERE id = ?", (id,)).fetchone()
    if row is None:
        return {}

    return {"url": row[0], "path": row[1], **json.loads(row[2])}


def record(*, path: str, url: str, extra: dict) -> str:
    cleaned = {k: v for k, v in extra.items() if v not in (None, "")}
    with session() as connection:
        row = connection.execute("SELECT id FROM collected WHERE path = ?", (path,)).fetchone()
        id = row[0] if row else str(uuid.uuid4())
        connection.execute(
            "INSERT OR REPLACE INTO collected VALUES (?, ?, ?, ?)",
            (id, url, path, json.dumps(cleaned, ensure_ascii=False)),
        )

    return id


def find(*, url: str) -> str | None:
    trimmed = url.rstrip("/")
    with session() as connection:
        row = connection.execute(
            """SELECT collected.id FROM collected
               JOIN collected_content ON collected_content.collected_id = collected.id
                                     AND collected_content.language = 'eng'
               WHERE rtrim(collected.url, '/') IN (?, ?)
               ORDER BY collected.path LIMIT 1""",
            (trimmed, trimmed + ".md"),
        ).fetchone()

    return row[0] if row else None


# #
# opened

def touch(*, id: str) -> str:
    with session() as connection:
        connection.execute(
            "INSERT OR REPLACE INTO user_meta (user_id, kind, collected_id, value, updated_at) VALUES (?, 'opened', ?, '{}', ?)",
            (USER, id, now()),
        )

    return id



# #
# export

def export(*, folder: Path) -> str:
    documents = records = 0
    with session() as connection:
        connection.row_factory = sqlite3.Row
        for row in connection.execute(
            """SELECT collected.path, c.language, c.content FROM collected_content AS c
               JOIN collected ON collected.id = c.collected_id
               JOIN (SELECT collected_id, language, MAX(version) AS version
                     FROM collected_content GROUP BY collected_id, language) AS top
                 ON top.collected_id = c.collected_id
                AND top.language = c.language
                AND top.version = c.version"""
        ):
            write_file(path=folder / row["language"] / row["path"], text=row["content"])
            documents += 1
        for row in connection.execute("SELECT id, url, path, meta FROM collected"):
            payload = {"id": row["id"], "url": row["url"], **json.loads(row["meta"])}
            write_file(
                path=folder / "meta" / f"{row['path']}.json",
                text=json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            )
            records += 1

    return f"{documents} documents and {records} metadata rows exported to {folder}"


def write_file(*, path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


# #
# upgrade

UPGRADED = False


def upgrade(*, connection) -> None:
    global UPGRADED
    tables = {r[0] for r in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    # rename
    if "extra" in columns(connection=connection, table="collected"):
        connection.execute("ALTER TABLE collected RENAME COLUMN extra TO meta")
    if "body" in columns(connection=connection, table="collected_content"):
        connection.execute("ALTER TABLE collected_content RENAME COLUMN body TO content")
    # user
    connection.execute("INSERT OR IGNORE INTO user (id, name, created_at) VALUES (?, ?, ?)", (USER, "나", now()))
    if "opened" in tables:
        connection.execute(
            """INSERT OR REPLACE INTO user_meta (user_id, kind, collected_id, value, updated_at)
               SELECT ?, 'opened', collected_id, '{}', opened_at FROM opened""",
            (USER,),
        )
        connection.execute("DROP TABLE opened")
    # conversation
    paths = dict(connection.execute("SELECT path, id FROM collected").fetchall())
    for table in ("conversations", "agent"):
        if table not in tables:
            continue
        for id, title, created_at, updated_at, messages in connection.execute(
            f"SELECT id, title, createdAt, updatedAt, messages FROM {table}"
        ).fetchall():
            converted, cited = legacy(messages=json.loads(messages), created_at=created_at)
            collected_id = next((paths[p] for p in cited if p in paths), "")
            if table == "agent":
                conversation(connection=connection, domain="agent", row={"id": id, "collected_id": collected_id, "title": title, "created_at": created_at, "updated_at": updated_at}, messages=converted)
            else:
                connection.execute("INSERT OR IGNORE INTO space (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)", (id, title, created_at, updated_at))
                conversation(connection=connection, domain="space", row={"id": id, "space_id": id, "collected_id": collected_id, "title": title, "created_at": created_at, "updated_at": updated_at}, messages=converted)
        connection.execute(f"DROP TABLE {table}")
    if "asked" in tables:
        for id, title, plan, log, thread_id, messages, created_at, updated_at in connection.execute(
            "SELECT id, title, plan, log, thread_id, messages, created_at, updated_at FROM asked"
        ).fetchall():
            connection.execute("INSERT OR IGNORE INTO space (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)", (id, title, created_at, updated_at))
            material(connection=connection, space_id=id, kind="plan", title="목적", content=plan, created_at=created_at)
            material(connection=connection, space_id=id, kind="log", title="웹 이전 학습 기록", content=log, created_at=created_at)
            conversation(connection=connection, domain="space", row={"id": id, "space_id": id, "title": title, "meta": codex(thread_id=thread_id), "created_at": created_at, "updated_at": updated_at}, messages=json.loads(messages))
        connection.execute("DROP TABLE asked")
    if "messages" in columns(connection=connection, table="space"):
        links = dict(connection.execute("SELECT space_id, MIN(collected_id) FROM space_collected GROUP BY space_id").fetchall()) if "space_collected" in tables else {}
        for id, title, thread_id, messages, created_at, updated_at in connection.execute(
            "SELECT id, title, thread_id, messages, created_at, updated_at FROM space"
        ).fetchall():
            conversation(connection=connection, domain="space", row={"id": id, "space_id": id, "collected_id": links.get(id, ""), "title": title, "meta": codex(thread_id=thread_id), "created_at": created_at, "updated_at": updated_at}, messages=json.loads(messages))
        connection.execute("ALTER TABLE space DROP COLUMN messages")
        connection.execute("ALTER TABLE space DROP COLUMN thread_id")
        connection.execute("DROP TABLE IF EXISTS space_collected")
    # material
    if "purpose" in columns(connection=connection, table="space"):
        for id, purpose, log, created_at in connection.execute("SELECT id, purpose, log, created_at FROM space").fetchall():
            material(connection=connection, space_id=id, kind="plan", title="목적", content=purpose, created_at=created_at)
            material(connection=connection, space_id=id, kind="log", title="웹 이전 학습 기록", content=log, created_at=created_at)
        connection.execute("ALTER TABLE space DROP COLUMN purpose")
        connection.execute("ALTER TABLE space DROP COLUMN log")
    for id, conversation_id, rich, created_at in connection.execute(
        "SELECT id, conversation_id, rich, created_at FROM space_message WHERE role = 'assistant' AND question_id IS NULL AND rich IS NOT NULL"
    ).fetchall():
        space_id = connection.execute("SELECT space_id FROM space_conversation WHERE id = ?", (conversation_id,)).fetchone()[0]
        material(connection=connection, space_id=space_id, kind="lesson", title=json.loads(rich)["title"], content=rich, created_at=created_at)
        connection.execute("DELETE FROM space_message WHERE id = ?", (id,))
    UPGRADED = True


def material(*, connection, space_id: str, kind: str, title: str, content: str, created_at: str) -> None:
    if not content:
        return
    connection.execute(
        "INSERT INTO space_material (id, space_id, kind, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), space_id, kind, title, content, created_at, created_at),
    )


def columns(*, connection, table: str) -> set[str]:
    return {
        r[1] for r in connection.execute(f"PRAGMA table_info({table})")
    }


def codex(*, thread_id: str | None) -> dict:
    return {"codex": {"thread_id": thread_id}} if thread_id else {}


def conversation(*, connection, domain: str, row: dict, messages: list[dict]) -> None:
    fields = ["id", "collected_id", "title", "meta", "created_at", "updated_at"] + (["space_id"] if domain == "space" else [])
    values = {**row, "collected_id": row.get("collected_id") or "", "meta": json.dumps(row.get("meta") or {}, ensure_ascii=False)}
    connection.execute(
        f"INSERT OR IGNORE INTO {domain}_conversation ({', '.join(fields)}) VALUES ({', '.join('?' * len(fields))})",
        tuple(values[f] for f in fields),
    )
    for message in messages:
        connection.execute(
            f"INSERT OR IGNORE INTO {domain}_message ({', '.join(MESSAGE)}) VALUES ({', '.join('?' * len(MESSAGE))})",
            stored(message=message, conversation_id=row["id"]),
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


def legacy(*, messages: list[dict], created_at: str) -> tuple[list[dict], list[str]]:
    converted, cited, question_id = [], [], None
    for message in messages:
        if message.get("role") == "user":
            question_id = str(uuid.uuid4())
            citations = message.get("citations") or []
            cited += [c["path"] for c in citations if c.get("path")]
            converted.append({"id": question_id, "role": "user", "kind": "question", "content": message.get("content") or "", "context": {"citations": citations}, "status": "completed", "created_at": created_at})
        elif message.get("role") == "assistant":
            converted.append({"id": str(uuid.uuid4()), "role": "assistant", "content": message.get("content") or "", "question_id": question_id, "created_at": created_at})

    return converted, cited

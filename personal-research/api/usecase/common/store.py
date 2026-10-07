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
SCHEMA = """
CREATE TABLE IF NOT EXISTS collected (
    id    TEXT PRIMARY KEY,
    url   TEXT NOT NULL,
    path  TEXT NOT NULL UNIQUE,
    extra TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS collected_url ON collected (url);

CREATE TABLE IF NOT EXISTS collected_content (
    collected_id TEXT NOT NULL,
    language     TEXT NOT NULL,
    version      INTEGER NOT NULL,
    decoration   TEXT NOT NULL DEFAULT '',
    body         TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    PRIMARY KEY (collected_id, language, version)
);

CREATE TABLE IF NOT EXISTS opened (
    collected_id TEXT PRIMARY KEY,
    opened_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    level      TEXT NOT NULL,
    message    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS log_created_at ON log (created_at);

CREATE TABLE IF NOT EXISTS conversations (
    id        TEXT PRIMARY KEY,
    title     TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    messages  TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS agent (
    id        TEXT PRIMARY KEY,
    title     TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    messages  TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS asked (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    plan       TEXT NOT NULL DEFAULT '',
    log        TEXT NOT NULL DEFAULT '',
    thread_id  TEXT,
    messages   TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
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

    return row["body"]


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
            if current and current["body"] == body and current["decoration"] == decoration:
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
        row = connection.execute("SELECT url, path, extra FROM collected WHERE id = ?", (id,)).fetchone()
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
            "INSERT OR REPLACE INTO opened VALUES (?, ?)",
            (id, now()),
        )

    return id


def opened() -> dict[str, str]:
    with session() as connection:
        rows = connection.execute("SELECT collected_id, opened_at FROM opened").fetchall()

    return dict(rows)


# #
# export

def export(*, folder: Path) -> str:
    documents = records = 0
    with session() as connection:
        connection.row_factory = sqlite3.Row
        for row in connection.execute(
            """SELECT collected.path, c.language, c.body FROM collected_content AS c
               JOIN collected ON collected.id = c.collected_id
               JOIN (SELECT collected_id, language, MAX(version) AS version
                     FROM collected_content GROUP BY collected_id, language) AS top
                 ON top.collected_id = c.collected_id
                AND top.language = c.language
                AND top.version = c.version"""
        ):
            write_file(path=folder / row["language"] / row["path"], text=row["body"])
            documents += 1
        for row in connection.execute("SELECT id, url, path, extra FROM collected"):
            payload = {"id": row["id"], "url": row["url"], **json.loads(row["extra"])}
            write_file(
                path=folder / "meta" / f"{row['path']}.json",
                text=json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            )
            records += 1

    return f"{documents} documents and {records} metadata rows exported to {folder}"


def write_file(*, path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")

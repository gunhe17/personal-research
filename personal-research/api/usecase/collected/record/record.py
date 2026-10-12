from __future__ import annotations

import json
import re
import sqlite3
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from usecase.common import store

LANGUAGES = ("eng", "kor")
RENAMED = {"docs": "document", "papers": "paper", "repos": "repository", "videos": "video"}
DOCUMENT_SUFFIX = (".md", ".html")
DECORATION = re.compile(r"\A(?:> ## Documentation Index\n(?:>.*\n)*|---\n(?s:.*?)\n---\n)\n*")
LATEST = """FROM collected_content AS c
JOIN collected ON collected.id = c.collected_id
JOIN (SELECT collected_id, language, MAX(version) AS version
      FROM collected_content GROUP BY collected_id, language) AS top
  ON top.collected_id = c.collected_id
 AND top.language = c.language
 AND top.version = c.version"""


@dataclass
class Document:
    path: str
    body: str
    url: str
    decoration: str = ""
    meta: dict = field(default_factory=dict)


# #
# locate

def locate(*, text: str) -> str | None:
    wanted = text.strip().replace("\\", "/")
    if "/collected/" in wanted:
        wanted = wanted.rsplit("/collected/", 1)[1]
    wanted = wanted.lstrip("/")
    for language in LANGUAGES:
        wanted = wanted.removeprefix(f"{language}/")
    kind, _, rest = wanted.partition("/")
    if kind in RENAMED and rest:
        wanted = f"{RENAMED[kind]}/{rest}"
    with store.session() as connection:
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
        raise ValueError(f"문서를 찾을 수 없습니다: {text}")

    return found


def path_of(*, id: str) -> str:
    with store.session() as connection:
        row = connection.execute("SELECT path FROM collected WHERE id = ?", (id,)).fetchone()
    if row is None:
        raise ValueError(f"문서를 찾을 수 없습니다: {id}")

    return row[0]


def slugify(*, title: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", title.lower())

    return re.sub(r"[\s_]+", "-", slug).strip("-")[:90]


# #
# content

def read(*, id: str, language: str) -> str:
    with store.session() as connection:
        row = latest(connection=connection, id=id, language=language)
    if row is None:
        raise ValueError(f"No body for {id} {language}")

    return row["content"]


def exists(*, id: str, language: str) -> bool:
    with store.session() as connection:
        return latest(connection=connection, id=id, language=language) is not None


def version(*, id: str, language: str) -> int:
    with store.session() as connection:
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


def write(*, document: Document) -> str:
    id = register(path=document.path, url=document.url, meta=document.meta)
    save(id=id, language="eng", content=document.body, decoration=document.decoration)

    return id


def save(*, id: str, language: str, content: str, decoration: str = "") -> str:
    with store.session() as connection:
        current = latest(connection=connection, id=id, language=language)
        if language == "eng":
            if current and current["content"] == content and current["decoration"] == decoration:
                return id
            number = current["version"] + 1 if current else 1
        else:
            source = latest(connection=connection, id=id, language="eng")
            if source is None:
                raise ValueError(f"No English original for {id}")
            number = source["version"]
        connection.execute(
            "INSERT OR REPLACE INTO collected_content VALUES (?, ?, ?, ?, ?, ?)",
            (id, language, number, decoration, content, store.now()),
        )

    return id


def split(*, text: str) -> tuple[str, str]:
    matched = DECORATION.match(text)

    return (matched.group(0), text[matched.end():]) if matched else ("", text)


# #
# meta

def meta(*, id: str) -> dict:
    with store.session() as connection:
        row = connection.execute("SELECT url, path, meta FROM collected WHERE id = ?", (id,)).fetchone()
    if row is None:
        return {}

    return {"url": row[0], "path": row[1], **json.loads(row[2])}


def register(*, path: str, url: str, meta: dict) -> str:
    cleaned = {k: v for k, v in meta.items() if v not in (None, "")}
    with store.session() as connection:
        row = connection.execute("SELECT id FROM collected WHERE path = ?", (path,)).fetchone()
        id = row[0] if row else str(uuid.uuid4())
        connection.execute(
            "INSERT OR REPLACE INTO collected VALUES (?, ?, ?, ?)",
            (id, url, path, json.dumps(cleaned, ensure_ascii=False)),
        )

    return id


def find(*, url: str) -> str | None:
    trimmed = url.rstrip("/")
    with store.session() as connection:
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
# query

def catalog() -> list[tuple]:
    with store.session() as connection:
        return connection.execute(
            """SELECT collected.id, collected.path, collected.meta,
                      GROUP_CONCAT(DISTINCT collected_content.language)
               FROM collected
               JOIN collected_content ON collected_content.collected_id = collected.id
               GROUP BY collected.id
               ORDER BY collected.path"""
        ).fetchall()


def matching(*, terms: list[str]) -> list[tuple]:
    clause = " AND ".join(["LOWER(c.content) LIKE ?"] * len(terms))
    with store.session() as connection:
        return connection.execute(
            f"SELECT collected.id, collected.path, collected.url, c.language, c.content {LATEST} WHERE {clause}",
            tuple(f"%{t}%" for t in terms),
        ).fetchall()


def editions() -> list[tuple]:
    with store.session() as connection:
        return connection.execute(
            f"SELECT collected.path, c.language, c.content, c.version {LATEST} ORDER BY c.language, collected.path"
        ).fetchall()


def versions() -> list[tuple]:
    with store.session() as connection:
        return connection.execute(
            """SELECT collected.path, collected_content.language, MAX(collected_content.version)
               FROM collected_content
               JOIN collected ON collected.id = collected_content.collected_id
               GROUP BY collected_content.collected_id, collected_content.language"""
        ).fetchall()


def paths() -> set[str]:
    with store.session() as connection:
        return {
            row[0] for row in connection.execute("SELECT path FROM collected")
        }


def stamp() -> str:
    with store.session() as connection:
        return str(connection.execute(
            "SELECT (SELECT COUNT(*) FROM collected), COUNT(*), MAX(created_at) FROM collected_content"
        ).fetchone())


def under(*, id: str) -> list[dict]:
    if not id:
        return []
    with store.session() as connection:
        rows = connection.execute(
            f"""SELECT document.id, document.path, document.url
                FROM collected AS root
                JOIN collected AS document ON {subtree(root="root", node="document")}
                WHERE root.id = ?
                ORDER BY document.path""",
            (id,),
        ).fetchall()

    return [
        {"id": r[0], "path": r[1], "url": r[2]}
        for r in rows
    ]


def subtree(*, root: str, node: str) -> str:
    return f"({node}.id = {root}.id OR {node}.path LIKE {root}.path || '/%')"


# #
# export

def export(*, folder: Path) -> str:
    documents = records = 0
    with store.session() as connection:
        connection.row_factory = sqlite3.Row
        for row in connection.execute(
            f"SELECT collected.path, c.language, c.content {LATEST}"
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

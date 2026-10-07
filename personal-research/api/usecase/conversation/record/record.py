from __future__ import annotations

import json
import re
import uuid

from usecase.common import store

IDENTIFIER = re.compile(r"[a-zA-Z0-9_-]+")
TABLES = ("conversations", "agent")


# #
# query

def listed(*, table: str) -> list[dict]:
    assert table in TABLES
    with store.session() as connection:
        rows = connection.execute(
            f"""SELECT id, title, createdAt, updatedAt,
                      json_array_length(messages) AS messageCount
               FROM {table} ORDER BY updatedAt DESC"""
        ).fetchall()

    return [
        {"id": r[0], "title": r[1], "createdAt": r[2], "updatedAt": r[3], "messageCount": r[4]}
        for r in rows
    ]


def get(*, table: str, id: str) -> dict | None:
    assert table in TABLES
    if not IDENTIFIER.fullmatch(id or ""):
        return None
    with store.session() as connection:
        row = connection.execute(
            f"SELECT id, title, createdAt, updatedAt, messages FROM {table} WHERE id = ?",
            (id,),
        ).fetchone()
    if not row:
        return None

    return {
        "id": row[0],
        "title": row[1],
        "createdAt": row[2],
        "updatedAt": row[3],
        "messages": json.loads(row[4]),
    }


# #
# command

def save(*, table: str, data: dict) -> dict:
    assert table in TABLES
    id = data.get("id") or str(uuid.uuid4())
    if not IDENTIFIER.fullmatch(id):
        id = str(uuid.uuid4())
    saved = {
        "id": id,
        "title": (data.get("title") or "새 대화").strip() or "새 대화",
        "createdAt": data.get("createdAt") or store.now(),
        "updatedAt": store.now(),
        "messages": data.get("messages") or [],
    }
    with store.session() as connection:
        connection.execute(
            f"INSERT OR REPLACE INTO {table} VALUES (?, ?, ?, ?, ?)",
            (
                saved["id"],
                saved["title"],
                saved["createdAt"],
                saved["updatedAt"],
                json.dumps(saved["messages"], ensure_ascii=False),
            ),
        )

    return saved


def delete(*, table: str, id: str) -> bool:
    assert table in TABLES
    if not IDENTIFIER.fullmatch(id or ""):
        return False
    with store.session() as connection:
        removed = connection.execute(f"DELETE FROM {table} WHERE id = ?", (id,)).rowcount

    return removed > 0

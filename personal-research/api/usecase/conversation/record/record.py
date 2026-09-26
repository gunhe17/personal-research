from __future__ import annotations

import json
import re
import uuid

from usecase.common import store

IDENTIFIER = re.compile(r"[a-zA-Z0-9_-]+")


# #
# query

def listed() -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT id, title, createdAt, updatedAt,
                      json_array_length(messages) AS messageCount
               FROM conversations ORDER BY updatedAt DESC"""
        ).fetchall()

    return [
        {"id": r[0], "title": r[1], "createdAt": r[2], "updatedAt": r[3], "messageCount": r[4]}
        for r in rows
    ]


def get(*, id: str) -> dict | None:
    if not IDENTIFIER.fullmatch(id or ""):
        return None
    with store.session() as connection:
        row = connection.execute(
            "SELECT id, title, createdAt, updatedAt, messages FROM conversations WHERE id = ?",
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

def save(*, data: dict) -> dict:
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
            "INSERT OR REPLACE INTO conversations VALUES (?, ?, ?, ?, ?)",
            (
                saved["id"],
                saved["title"],
                saved["createdAt"],
                saved["updatedAt"],
                json.dumps(saved["messages"], ensure_ascii=False),
            ),
        )

    return saved


def delete(*, id: str) -> bool:
    if not IDENTIFIER.fullmatch(id or ""):
        return False
    with store.session() as connection:
        removed = connection.execute("DELETE FROM conversations WHERE id = ?", (id,)).rowcount

    return removed > 0

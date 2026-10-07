from __future__ import annotations

import re
import uuid

from usecase.common import store
from usecase.conversation.record import record as conversation

IDENTIFIER = re.compile(r"[a-zA-Z0-9_-]+")


# #
# query

def listed() -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT s.id, s.title, s.created_at, MAX(s.updated_at, COALESCE(MAX(c.updated_at), '')), COUNT(c.id)
               FROM space AS s
               LEFT JOIN space_conversation AS c ON c.space_id = s.id
               GROUP BY s.id ORDER BY 4 DESC"""
        ).fetchall()

    return [
        {"id": r[0], "title": r[1], "created_at": r[2], "updated_at": r[3], "conversation_count": r[4]}
        for r in rows
    ]


def get(*, id: str) -> dict | None:
    if not IDENTIFIER.fullmatch(id or ""):
        return None
    with store.session() as connection:
        row = connection.execute(
            "SELECT id, title, purpose, log, created_at, updated_at FROM space WHERE id = ?",
            (id,),
        ).fetchone()
    if not row:
        return None

    return {
        "id": row[0],
        "title": row[1],
        "purpose": row[2],
        "log": row[3],
        "created_at": row[4],
        "updated_at": row[5],
        "conversations": conversation.listed(domain="space", space_id=row[0]),
    }


# #
# command

def create(*, data: dict) -> dict:
    created = {
        "id": str(uuid.uuid4()),
        "title": (data.get("title") or "").strip() or "새 space",
        "purpose": data.get("purpose") or "",
        "created_at": store.now(),
    }
    with store.session() as connection:
        connection.execute(
            "INSERT INTO space (id, title, purpose, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (created["id"], created["title"], created["purpose"], created["created_at"], created["created_at"]),
        )

    return created


def edit(*, id: str, data: dict) -> dict:
    with store.session() as connection:
        for key in ("title", "purpose"):
            if isinstance(data.get(key), str):
                connection.execute(f"UPDATE space SET {key} = ?, updated_at = ? WHERE id = ?", (data[key], store.now(), id))
    edited = get(id=id)
    if edited is None:
        raise ValueError("space 를 찾을 수 없습니다.")

    return edited


def remove(*, id: str) -> bool:
    for item in conversation.listed(domain="space", space_id=id):
        conversation.remove(domain="space", id=item["id"])
    with store.session() as connection:
        removed = connection.execute("DELETE FROM space WHERE id = ?", (id,)).rowcount

    return removed > 0

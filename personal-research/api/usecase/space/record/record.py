from __future__ import annotations

import json
import re
import uuid

from usecase.common import store
from usecase.conversation.record import record as conversation

KINDS = ("plan", "log", "lesson", "note")


# #
# query

def listed() -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT s.id, s.title, COALESCE(p.content, ''), s.created_at,
                      MAX(s.updated_at, COALESCE(MAX(c.updated_at), '')),
                      COUNT(DISTINCT c.id), COUNT(DISTINCT NULLIF(c.collected_id, ''))
               FROM space AS s
               LEFT JOIN space_conversation AS c ON c.space_id = s.id AND c.user_id = s.user_id
               LEFT JOIN space_material AS p ON p.space_id = s.id AND p.kind = 'plan'
               WHERE s.user_id = ?
               GROUP BY s.id ORDER BY 5 DESC""",
            (store.user(),),
        ).fetchall()

    return [
        {
            "id": r[0],
            "title": r[1],
            "purpose": r[2][:200],
            "created_at": r[3],
            "updated_at": r[4],
            "conversation_count": r[5],
            "collected_count": r[6],
        }
        for r in rows
    ]


def get(*, id: str) -> dict | None:
    if not re.fullmatch(store.IDENTIFIER, id or ""):
        return None
    with store.session() as connection:
        row = connection.execute("SELECT id, title, created_at, updated_at FROM space WHERE id = ? AND user_id = ?", (id, store.user())).fetchone()
    if not row:
        return None
    materials = listed_materials(space_id=row[0])

    return {
        "id": row[0],
        "title": row[1],
        "created_at": row[2],
        "updated_at": row[3],
        "purpose": next((m["content"] for m in materials if m["kind"] == "plan"), ""),
        "materials": [{k: v for k, v in m.items() if k != "content"} for m in materials if m["kind"] != "plan"],
        "conversations": conversation.listed(domain="space", space_id=row[0]),
        "collected": collected(id=row[0]),
    }


def collected(*, id: str) -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT root.id, root.path, root.url, COUNT(DISTINCT c.id), MAX(c.updated_at)
               FROM space_conversation AS c
               JOIN collected AS root ON root.id = c.collected_id
               WHERE c.space_id = ? AND c.user_id = ?
               GROUP BY root.id ORDER BY 5 DESC""",
            (id, store.user()),
        ).fetchall()

    found = []
    for r in rows:
        documents = conversation.documents(collected_id=r[0])
        found.append({
            "id": r[0],
            "path": r[1],
            "url": r[2],
            "conversation_count": r[3],
            "updated_at": r[4],
            "document_count": len(documents),
            "documents": documents,
        })

    return found


def listed_materials(*, space_id: str) -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT id, kind, title, content, created_at, updated_at FROM space_material
               WHERE space_id = ?
               ORDER BY CASE kind WHEN 'plan' THEN 0 WHEN 'lesson' THEN 1 WHEN 'note' THEN 2 ELSE 3 END, created_at""",
            (space_id,),
        ).fetchall()

    return [
        {"id": r[0], "kind": r[1], "title": r[2], "content": r[3], "created_at": r[4], "updated_at": r[5]}
        for r in rows
    ]


def material(*, id: str) -> dict | None:
    if not re.fullmatch(store.IDENTIFIER, id or ""):
        return None
    with store.session() as connection:
        row = connection.execute(
            """SELECT m.id, m.space_id, m.kind, m.title, m.content, m.created_at, m.updated_at FROM space_material AS m
               JOIN space AS s ON s.id = m.space_id WHERE m.id = ? AND s.user_id = ?""",
            (id, store.user()),
        ).fetchone()
    if not row:
        return None
    found = {"id": row[0], "space_id": row[1], "kind": row[2], "title": row[3], "content": row[4], "created_at": row[5], "updated_at": row[6]}
    if found["kind"] == "lesson":
        found["content"] = json.loads(found["content"])

    return found


# #
# command

def create(*, data: dict) -> dict:
    created = {
        "id": str(uuid.uuid4()),
        "title": (data.get("title") or "").strip() or "새 space",
        "created_at": store.now(),
    }
    with store.session() as connection:
        connection.execute(
            "INSERT INTO space (id, title, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?)",
            (created["id"], created["title"], created["created_at"], created["created_at"], store.user()),
        )
    if data.get("purpose"):
        edit(id=created["id"], data={"purpose": data["purpose"]})

    return created


def edit(*, id: str, data: dict) -> dict:
    if get(id=id) is None:
        raise ValueError("space 를 찾을 수 없습니다.")
    with store.session() as connection:
        if isinstance(data.get("title"), str) and data["title"].strip():
            connection.execute("UPDATE space SET title = ?, updated_at = ? WHERE id = ?", (data["title"].strip(), store.now(), id))
        if isinstance(data.get("purpose"), str):
            plan = connection.execute("SELECT id FROM space_material WHERE space_id = ? AND kind = 'plan'", (id,)).fetchone()
            if plan:
                connection.execute("UPDATE space_material SET content = ?, updated_at = ? WHERE id = ?", (data["purpose"], store.now(), plan[0]))
            else:
                store.material(connection=connection, space_id=id, kind="plan", title="목적", content=data["purpose"], created_at=store.now())

    return get(id=id)


def remove(*, id: str) -> bool:
    if get(id=id) is None:
        return False
    for item in conversation.listed(domain="space", space_id=id):
        conversation.remove(domain="space", id=item["id"])
    with store.session() as connection:
        connection.execute("DELETE FROM space_material WHERE space_id = ?", (id,))
        removed = connection.execute("DELETE FROM space WHERE id = ?", (id,)).rowcount

    return removed > 0


def save_material(*, space_id: str, data: dict, id: str = "") -> dict:
    kind = data.get("kind") or "note"
    title = (data.get("title") or "").strip()
    content = data.get("content")
    if kind not in KINDS or kind == "plan":
        raise ValueError("고칠 수 없는 자료 종류입니다.")
    if not title or not isinstance(content, (str, dict)):
        raise ValueError("제목과 본문이 필요합니다.")
    if get(id=space_id) is None:
        raise ValueError("space 를 찾을 수 없습니다.")
    encoded = json.dumps(content, ensure_ascii=False) if isinstance(content, dict) else content
    with store.session() as connection:
        if id:
            changed = connection.execute(
                "UPDATE space_material SET title = ?, content = ?, updated_at = ? WHERE id = ? AND space_id = ?",
                (title, encoded, store.now(), id, space_id),
            ).rowcount
            if not changed:
                raise ValueError("자료를 찾을 수 없습니다.")
        else:
            id = str(uuid.uuid4())
            connection.execute(
                "INSERT INTO space_material (id, space_id, kind, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (id, space_id, kind, title, encoded, store.now(), store.now()),
            )

    return material(id=id)


def remove_material(*, id: str) -> bool:
    with store.session() as connection:
        removed = connection.execute(
            "DELETE FROM space_material WHERE id = ? AND kind != 'plan' AND space_id IN (SELECT id FROM space WHERE user_id = ?)",
            (id, store.user()),
        ).rowcount

    return removed > 0


# #
# check

if __name__ == "__main__":
    import tempfile
    from pathlib import Path

    store.DATABASE = Path(tempfile.mkdtemp()) / "check.db"
    mine = create(data={"title": "mine", "purpose": "goal"})
    note = save_material(space_id=mine["id"], data={"kind": "note", "title": "n", "content": "body"})
    store.CURRENT.set("other")
    assert listed() == [] and get(id=mine["id"]) is None and material(id=note["id"]) is None
    assert not remove(id=mine["id"]) and not remove_material(id=note["id"])
    try:
        save_material(space_id=mine["id"], data={"kind": "note", "title": "x", "content": "y"})
    except ValueError:
        pass
    else:
        raise AssertionError("foreign material")
    theirs = create(data={"title": "theirs"})
    assert [s["id"] for s in listed()] == [theirs["id"]]
    store.CURRENT.set(store.USER)
    assert [s["id"] for s in listed()] == [mine["id"]] and get(id=mine["id"])["purpose"] == "goal"
    assert remove_material(id=note["id"]) and remove(id=mine["id"])
    print("ok")

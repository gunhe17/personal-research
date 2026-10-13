from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone

from usecase.collected.record import record as documents
from usecase.common import store
from usecase.common.error import NotFound
from usecase.conversation.record import record as conversations

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
               LEFT JOIN space_conversation AS c ON c.space_id = s.id AND c.user_id = s.user_id AND c.deleted_at = ''
               LEFT JOIN space_material AS p ON p.space_id = s.id AND p.kind = 'plan' AND p.deleted_at = ''
               WHERE s.user_id = ? AND s.deleted_at = ''
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
        row = connection.execute("SELECT id, title, created_at, updated_at FROM space WHERE id = ? AND user_id = ? AND deleted_at = ''", (id, store.user())).fetchone()
    if not row:
        return None
    found = materials(space_id=row[0])

    return {
        "id": row[0],
        "title": row[1],
        "created_at": row[2],
        "updated_at": row[3],
        "purpose": next((m["content"] for m in found if m["kind"] == "plan"), ""),
        "materials": [{k: v for k, v in m.items() if k != "content"} for m in found if m["kind"] != "plan"],
        "conversations": conversations.listed(domain="space", space_id=row[0]),
        "collected": collected(id=row[0]),
    }


def deleted() -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT s.id, s.title, s.deleted_at,
                      (SELECT COUNT(*) FROM space_conversation WHERE space_id = s.id AND deleted_at = s.deleted_at),
                      (SELECT COUNT(*) FROM space_material WHERE space_id = s.id AND kind != 'plan' AND deleted_at = s.deleted_at)
               FROM space AS s
               WHERE s.user_id = ? AND s.deleted_at != ''
               ORDER BY s.deleted_at DESC""",
            (store.user(),),
        ).fetchall()

    return [
        {"id": r[0], "title": r[1], "deleted_at": r[2], "conversation_count": r[3], "material_count": r[4]}
        for r in rows
    ]


def collected(*, id: str) -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT root.id, root.path, root.url, COUNT(DISTINCT c.id), MAX(c.updated_at)
               FROM space_conversation AS c
               JOIN collected AS root ON root.id = c.collected_id
               WHERE c.space_id = ? AND c.user_id = ? AND c.deleted_at = ''
               GROUP BY root.id ORDER BY 5 DESC""",
            (id, store.user()),
        ).fetchall()

    found = []
    for r in rows:
        members = documents.under(id=r[0])
        found.append({
            "id": r[0],
            "path": r[1],
            "url": r[2],
            "conversation_count": r[3],
            "updated_at": r[4],
            "document_count": len(members),
            "documents": members,
        })

    return found


def materials(*, space_id: str) -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT id, kind, title, content, created_at, updated_at FROM space_material
               WHERE space_id = ? AND deleted_at = ''
               ORDER BY CASE kind WHEN 'plan' THEN 0 WHEN 'lesson' THEN 1 WHEN 'note' THEN 2 ELSE 3 END, created_at""",
            (space_id,),
        ).fetchall()

    return [
        {"id": r[0], "kind": r[1], "title": r[2], "content": r[3], "created_at": r[4], "updated_at": r[5]}
        for r in rows
    ]


def get_material(*, id: str) -> dict | None:
    if not re.fullmatch(store.IDENTIFIER, id or ""):
        return None
    with store.session() as connection:
        row = connection.execute(
            """SELECT m.id, m.space_id, m.kind, m.title, m.content, m.created_at, m.updated_at FROM space_material AS m
               JOIN space AS s ON s.id = m.space_id
               WHERE m.id = ? AND s.user_id = ? AND m.deleted_at = '' AND s.deleted_at = ''""",
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
        raise NotFound("space 를 찾을 수 없습니다.")
    with store.session() as connection:
        if isinstance(data.get("title"), str) and data["title"].strip():
            connection.execute("UPDATE space SET title = ?, updated_at = ? WHERE id = ?", (data["title"].strip(), store.now(), id))
        if isinstance(data.get("purpose"), str):
            plan = connection.execute("SELECT id FROM space_material WHERE space_id = ? AND kind = 'plan' AND deleted_at = ''", (id,)).fetchone()
            if plan:
                connection.execute("UPDATE space_material SET content = ?, updated_at = ? WHERE id = ?", (data["purpose"], store.now(), plan[0]))
            else:
                store.material(connection=connection, space_id=id, kind="plan", title="목적", content=data["purpose"], created_at=store.now())

    return get(id=id)


def create_material(*, space_id: str, data: dict) -> dict:
    return write_material(space_id=space_id, data=data, id="")


def edit_material(*, id: str, data: dict) -> dict:
    found = get_material(id=id)
    if not found:
        raise NotFound("자료를 찾을 수 없습니다.")

    return write_material(space_id=found["space_id"], data={**found, **data}, id=found["id"])


def remove(*, id: str) -> bool:
    deleted_at = datetime.now(timezone.utc).isoformat(timespec="microseconds")
    with store.session() as connection:
        removed = connection.execute(
            "UPDATE space SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at = ''",
            (deleted_at, id, store.user()),
        ).rowcount
        if removed:
            connection.execute("UPDATE space_conversation SET deleted_at = ? WHERE space_id = ? AND deleted_at = ''", (deleted_at, id))
            connection.execute("UPDATE space_material SET deleted_at = ? WHERE space_id = ? AND deleted_at = ''", (deleted_at, id))

    return removed > 0


def restore(*, id: str) -> dict:
    with store.session() as connection:
        row = connection.execute("SELECT deleted_at FROM space WHERE id = ? AND user_id = ? AND deleted_at != ''", (id, store.user())).fetchone()
        if row is None:
            raise NotFound("지운 space 를 찾을 수 없습니다.")
        connection.execute("UPDATE space SET deleted_at = '' WHERE id = ?", (id,))
        connection.execute("UPDATE space_conversation SET deleted_at = '' WHERE space_id = ? AND deleted_at = ?", (id, row[0]))
        connection.execute("UPDATE space_material SET deleted_at = '' WHERE space_id = ? AND deleted_at = ?", (id, row[0]))

    return get(id=id)


def write_material(*, space_id: str, data: dict, id: str) -> dict:
    kind = data.get("kind") or "note"
    title = (data.get("title") or "").strip()
    content = data.get("content")
    if kind not in KINDS or kind == "plan":
        raise ValueError("고칠 수 없는 자료 종류입니다.")
    if not title or not isinstance(content, (str, dict)):
        raise ValueError("제목과 본문이 필요합니다.")
    if get(id=space_id) is None:
        raise NotFound("space 를 찾을 수 없습니다.")
    encoded = json.dumps(content, ensure_ascii=False) if isinstance(content, dict) else content
    with store.session() as connection:
        if id:
            changed = connection.execute(
                "UPDATE space_material SET title = ?, content = ?, updated_at = ? WHERE id = ? AND space_id = ?",
                (title, encoded, store.now(), id, space_id),
            ).rowcount
            if not changed:
                raise NotFound("자료를 찾을 수 없습니다.")
        else:
            id = str(uuid.uuid4())
            connection.execute(
                "INSERT INTO space_material (id, space_id, kind, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (id, space_id, kind, title, encoded, store.now(), store.now()),
            )

    return get_material(id=id)


def remove_material(*, id: str) -> bool:
    with store.session() as connection:
        removed = connection.execute(
            """UPDATE space_material SET deleted_at = ?
               WHERE id = ? AND kind != 'plan' AND deleted_at = '' AND space_id IN (SELECT id FROM space WHERE user_id = ? AND deleted_at = '')""",
            (store.now(), id, store.user()),
        ).rowcount

    return removed > 0


# #
# check

if __name__ == "__main__":
    import tempfile
    from pathlib import Path

    store.DATABASE = Path(tempfile.mkdtemp()) / "check.db"
    store.CURRENT.set(store.USER)
    mine = create(data={"title": "mine", "purpose": "goal"})
    note = create_material(space_id=mine["id"], data={"kind": "note", "title": "n", "content": "body"})
    store.CURRENT.set("other")
    assert listed() == [] and get(id=mine["id"]) is None and get_material(id=note["id"]) is None
    assert not remove(id=mine["id"]) and not remove_material(id=note["id"])
    try:
        create_material(space_id=mine["id"], data={"kind": "note", "title": "x", "content": "y"})
    except NotFound:
        pass
    else:
        raise AssertionError("foreign material")
    theirs = create(data={"title": "theirs"})
    assert [s["id"] for s in listed()] == [theirs["id"]]
    store.CURRENT.set(store.USER)
    assert [s["id"] for s in listed()] == [mine["id"]] and get(id=mine["id"])["purpose"] == "goal"
    kept = create_material(space_id=mine["id"], data={"kind": "note", "title": "k", "content": "kept"})
    talk = conversations.create(domain="space", data={"space_id": mine["id"]})
    assert remove_material(id=note["id"]) and get_material(id=note["id"]) is None and not remove_material(id=note["id"])
    assert [m["id"] for m in get(id=mine["id"])["materials"]] == [kept["id"]] and listed()[0]["conversation_count"] == 1
    assert remove(id=mine["id"]) and not remove(id=mine["id"])
    assert listed() == [] and get(id=mine["id"]) is None and get_material(id=kept["id"]) is None
    assert conversations.get(domain="space", id=talk["id"]) is None
    with store.session() as connection:
        rows = connection.execute(
            """SELECT s.deleted_at, c.deleted_at, COUNT(m.id), SUM(m.deleted_at != '') FROM space AS s
               JOIN space_conversation AS c ON c.space_id = s.id JOIN space_material AS m ON m.space_id = s.id
               WHERE s.id = ?""",
            (mine["id"],),
        ).fetchone()
    assert rows[0] and rows[0] == rows[1] and rows[2] == rows[3] == 3
    trashed = deleted()
    assert [(s["id"], s["conversation_count"], s["material_count"]) for s in trashed] == [(mine["id"], 1, 1)]
    store.CURRENT.set("other")
    assert deleted() == []
    try:
        restore(id=mine["id"])
    except NotFound:
        pass
    else:
        raise AssertionError("foreign restore")
    store.CURRENT.set(store.USER)
    back = restore(id=mine["id"])
    assert back["purpose"] == "goal" and [m["id"] for m in back["materials"]] == [kept["id"]]
    assert [c["id"] for c in back["conversations"]] == [talk["id"]] and get_material(id=note["id"]) is None
    assert deleted() == [] and [s["id"] for s in listed()] == [mine["id"]]
    try:
        restore(id=mine["id"])
    except NotFound:
        pass
    else:
        raise AssertionError("restored twice")
    print("ok")

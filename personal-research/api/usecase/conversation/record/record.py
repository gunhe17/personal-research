from __future__ import annotations

import json
import re
import sqlite3
import uuid

from usecase.collected.record import record as documents
from usecase.common import store
from usecase.common.error import NotFound

DOMAINS = ("space", "agent")
KINDS = ("question", "retrieval", "next", "collect")
REPOSITORY = re.compile(r"(repository/github/[^/]+/[^/]+)/")
ENCODED = ("context", "rich", "sources")


# #
# query

def listed(*, domain: str, space_id: str = "") -> list[dict]:
    assert domain in DOMAINS
    where, parameters = ("WHERE c.user_id = ? AND c.deleted_at = '' AND c.space_id = ?", (store.user(), space_id)) if space_id else ("WHERE c.user_id = ? AND c.deleted_at = ''", (store.user(),))
    with store.session() as connection:
        rows = connection.execute(
            f"""SELECT c.id, c.title, c.collected_id, c.created_at, c.updated_at, COUNT(m.id)
                FROM {domain}_conversation AS c
                LEFT JOIN {domain}_message AS m ON m.conversation_id = c.id
                {where}
                GROUP BY c.id ORDER BY c.updated_at DESC""",
            parameters,
        ).fetchall()

    return [
        {"id": r[0], "title": r[1], "collected_id": r[2], "created_at": r[3], "updated_at": r[4], "message_count": r[5]}
        for r in rows
    ]


def deleted(*, domain: str) -> list[dict]:
    assert domain in DOMAINS
    space, columns = ("JOIN space AS s ON s.id = c.space_id AND s.user_id = c.user_id AND s.deleted_at = ''", "s.id, s.title") if domain == "space" else ("", "'', ''")
    with store.session() as connection:
        rows = connection.execute(
            f"""SELECT c.id, c.title, c.deleted_at, {columns}
                FROM {domain}_conversation AS c
                {space}
                WHERE c.user_id = ? AND c.deleted_at != ''
                ORDER BY c.deleted_at DESC""",
            (store.user(),),
        ).fetchall()

    return [
        {"id": r[0], "title": r[1], "deleted_at": r[2], "domain": domain, "space_id": r[3], "space_title": r[4]}
        for r in rows
    ]


def by_collected(*, collected_id: str) -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            f"""SELECT c.id, c.space_id, c.title
                FROM space_conversation AS c
                JOIN collected AS root ON root.id = c.collected_id
                JOIN collected AS wanted ON wanted.id = ?
                WHERE c.user_id = ? AND c.deleted_at = '' AND {documents.subtree(root="root", node="wanted")}
                ORDER BY c.updated_at DESC""",
            (collected_id, store.user()),
        ).fetchall()

    return [
        {"id": r[0], "space_id": r[1], "title": r[2]}
        for r in rows
    ]


def get(*, domain: str, id: str) -> dict | None:
    assert domain in DOMAINS
    if not re.fullmatch(store.IDENTIFIER, id or ""):
        return None
    with store.session() as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(f"SELECT * FROM {domain}_conversation WHERE id = ? AND user_id = ? AND deleted_at = ''", (id, store.user())).fetchone()
        if row is None:
            return None
        messages = connection.execute(
            f"SELECT * FROM {domain}_message WHERE conversation_id = ? ORDER BY rowid",
            (id,),
        ).fetchall()
    found = {**dict(row), "meta": json.loads(row["meta"]), "domain": domain}
    found["messages"] = [decoded(row=m) for m in messages]
    found["documents"] = documents.under(id=found["collected_id"])

    return found


def message(*, domain: str, id: str) -> dict:
    assert domain in DOMAINS
    with store.session() as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(f"SELECT * FROM {domain}_message WHERE id = ?", (id,)).fetchone()
    if row is None:
        raise NotFound("메시지를 찾을 수 없습니다.")

    return decoded(row=row)


def notes(*, space_id: str) -> list[str]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT json_extract(m.rich, '$.learning_note')
               FROM space_message AS m
               JOIN space_conversation AS c ON c.id = m.conversation_id
               WHERE c.space_id = ? AND c.user_id = ? AND c.deleted_at = '' AND m.role = 'assistant' AND m.rich IS NOT NULL
               ORDER BY m.created_at DESC LIMIT 12""",
            (space_id, store.user()),
        ).fetchall()

    return [
        r[0] for r in reversed(rows) if r[0]
    ]


def decoded(*, row) -> dict:
    found = dict(row)
    for key in ENCODED:
        found[key] = json.loads(found[key]) if found[key] else None

    return found


# #
# command

def create(*, domain: str, data: dict) -> dict:
    assert domain in DOMAINS
    created = {
        "id": str(uuid.uuid4()),
        "collected_id": root(collected_id=data.get("collected_id") or ""),
        "title": (data.get("title") or "").strip() or "새 대화",
        "meta": {},
        "created_at": store.now(),
        "updated_at": store.now(),
        "user_id": store.user(),
    }
    if domain == "space":
        created["space_id"] = data["space_id"]
    stored = {**created, "meta": "{}"}
    with store.session() as connection:
        connection.execute(
            f"INSERT OR IGNORE INTO {domain}_conversation ({', '.join(stored)}) VALUES ({', '.join('?' * len(stored))})",
            tuple(stored.values()),
        )

    return created


def edit(*, domain: str, id: str, data: dict) -> dict:
    assert domain in DOMAINS
    if get(domain=domain, id=id) is None:
        raise NotFound("대화를 찾을 수 없습니다.")
    with store.session() as connection:
        if isinstance(data.get("title"), str):
            connection.execute(f"UPDATE {domain}_conversation SET title = ? WHERE id = ? AND user_id = ?", (data["title"], id, store.user()))
        if isinstance(data.get("collected_id"), str):
            connection.execute(
                f"UPDATE {domain}_conversation SET collected_id = ? WHERE id = ? AND user_id = ?",
                (root(collected_id=data["collected_id"]), id, store.user()),
            )

    return get(domain=domain, id=id)


def remove(*, domain: str, id: str) -> bool:
    assert domain in DOMAINS
    with store.session() as connection:
        removed = connection.execute(
            f"UPDATE {domain}_conversation SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at = ''",
            (store.now(), id, store.user()),
        ).rowcount

    return removed > 0


def restore(*, domain: str, id: str) -> dict:
    assert domain in DOMAINS
    with store.session() as connection:
        owner = "space_id" if domain == "space" else "id"
        row = connection.execute(f"SELECT {owner} FROM {domain}_conversation WHERE id = ? AND user_id = ? AND deleted_at != ''", (id, store.user())).fetchone()
        if row is None:
            raise NotFound("지운 대화를 찾을 수 없습니다.")
        if domain == "space" and not connection.execute("SELECT 1 FROM space WHERE id = ? AND deleted_at = ''", (row[0],)).fetchone():
            raise ValueError("먼저 space 를 되살려 주세요.")
        connection.execute(f"UPDATE {domain}_conversation SET deleted_at = '' WHERE id = ?", (id,))

    return get(domain=domain, id=id)


def ask(*, domain: str, id: str, data: dict) -> dict:
    content = data.get("content")
    if not isinstance(content, str) or not content.strip() or len(content) > 10_000:
        raise ValueError("질문을 1~10,000자로 입력해 주세요.")
    context = data.get("context") or {}
    if not isinstance(context, dict) or len(context.get("annotations") or []) > 10:
        raise ValueError("화면 상태나 주석이 올바르지 않습니다.")
    client_id = str(data.get("client_id") or uuid.uuid4())
    conversation = get(domain=domain, id=id)
    if conversation is None:
        raise NotFound("대화를 찾을 수 없습니다.")
    repeated = next((m for m in conversation["messages"] if m["client_id"] == client_id), None)
    if repeated:
        return repeated
    question = {
        "id": str(uuid.uuid4()),
        "role": "user",
        "kind": data.get("kind") if data.get("kind") in KINDS else "question",
        "content": content.strip(),
        "context": context,
        "client_id": client_id,
        "status": data.get("status") or "queued",
        "created_at": store.now(),
    }
    add(domain=domain, id=id, message=question)
    if not conversation["messages"] and conversation["title"] == "새 대화":
        edit(domain=domain, id=id, data={"title": question["content"][:48]})

    return question


def add(*, domain: str, id: str, message: dict) -> None:
    assert domain in DOMAINS
    with store.session() as connection:
        store.insert_message(connection=connection, domain=domain, message=message, conversation_id=id)
        connection.execute(f"UPDATE {domain}_conversation SET updated_at = ? WHERE id = ?", (store.now(), id))


def mark(*, domain: str, message_id: str, **fields) -> None:
    assert domain in DOMAINS and set(fields) <= {"status", "error"}
    assignments = ", ".join(f"{key} = ?" for key in fields)
    with store.session() as connection:
        connection.execute(
            f"UPDATE {domain}_message SET {assignments} WHERE id = ?",
            (*fields.values(), message_id),
        )


def answer(*, domain: str, id: str, question_id: str, rich: dict, sources: list[dict]) -> None:
    mark(domain=domain, message_id=question_id, status="completed", error=None)
    add(domain=domain, id=id, message={
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "content": "\n\n".join([rich["title"]] + [b["text"] for b in rich["blocks"] if b["text"]] + [rich["follow_up"]]),
        "rich": rich,
        "sources": sources,
        "question_id": question_id,
        "created_at": store.now(),
    })


def remember_session(*, domain: str, id: str, provider: str, values: dict) -> None:
    assert domain in DOMAINS
    with store.session() as connection:
        meta = json.loads(connection.execute(f"SELECT meta FROM {domain}_conversation WHERE id = ?", (id,)).fetchone()[0])
        meta[provider] = {**meta.get(provider, {}), **values}
        connection.execute(
            f"UPDATE {domain}_conversation SET meta = ? WHERE id = ?",
            (json.dumps(meta, ensure_ascii=False), id),
        )


def recover() -> None:
    with store.session() as connection:
        for domain in DOMAINS:
            connection.execute(
                f"""UPDATE {domain}_message SET status = 'interrupted', error = ?
                    WHERE status IN ('queued', 'running')
                      AND conversation_id IN (SELECT id FROM {domain}_conversation WHERE deleted_at = '')""",
                ("서버가 다시 시작되었습니다. 다시 시도할 수 있습니다.",),
            )


def root(*, collected_id: str) -> str:
    if not collected_id:
        return ""
    path = documents.path_of(id=collected_id)
    matched = REPOSITORY.match(path)
    card = documents.locate(text=matched.group(1)) if matched else None

    return card or collected_id


# #
# check

if __name__ == "__main__":
    import tempfile
    from pathlib import Path

    store.DATABASE = Path(tempfile.mkdtemp()) / "check.db"
    store.CURRENT.set(store.USER)
    card = documents.register(path="repository/github/o/r", url="https://github.com/o/r", meta={})
    readme = documents.write(document=documents.Document(path="repository/github/o/r/README.md", body="# R\n", url="https://github.com/o/r"))
    page = documents.write(document=documents.Document(path="document/t/a.md", body="# A\n", url="https://t/a"))
    assert root(collected_id=readme) == card and root(collected_id=page) == page and root(collected_id="") == ""
    mine = create(domain="agent", data={"collected_id": readme})
    assert mine["collected_id"] == card and [d["id"] for d in get(domain="agent", id=mine["id"])["documents"]] == [card, readme]
    first = ask(domain="agent", id=mine["id"], data={"content": " first question ", "client_id": "c1"})
    assert get(domain="agent", id=mine["id"])["title"] == "first question"
    assert ask(domain="agent", id=mine["id"], data={"content": "again", "client_id": "c1"})["id"] == first["id"]
    ask(domain="agent", id=mine["id"], data={"content": "second", "client_id": "c2"})
    found = get(domain="agent", id=mine["id"])
    assert found["title"] == "first question" and len(found["messages"]) == 2
    store.CURRENT.set("other")
    assert listed(domain="agent") == [] and get(domain="agent", id=mine["id"]) is None
    assert not remove(domain="agent", id=mine["id"])
    try:
        edit(domain="agent", id=mine["id"], data={"title": "stolen"})
    except NotFound:
        pass
    else:
        raise AssertionError("foreign edit")
    store.CURRENT.set(store.USER)
    assert [c["id"] for c in listed(domain="agent")] == [mine["id"]] and get(domain="agent", id=mine["id"])["title"] == "first question"
    space_side = create(domain="space", data={"space_id": "s1", "collected_id": page})
    assert [c["id"] for c in by_collected(collected_id=page)] == [space_side["id"]]
    assert remove(domain="space", id=space_side["id"]) and by_collected(collected_id=page) == [] and listed(domain="space", space_id="s1") == []
    assert remove(domain="agent", id=mine["id"]) and get(domain="agent", id=mine["id"]) is None
    assert listed(domain="agent") == [] and not remove(domain="agent", id=mine["id"])
    try:
        ask(domain="agent", id=mine["id"], data={"content": "late", "client_id": "c3"})
    except NotFound:
        pass
    else:
        raise AssertionError("deleted ask")
    with store.session() as connection:
        deleted_at = connection.execute("SELECT deleted_at FROM agent_conversation WHERE id = ?", (mine["id"],)).fetchone()[0]
        kept = connection.execute("SELECT COUNT(*) FROM agent_message WHERE conversation_id = ?", (mine["id"],)).fetchone()[0]
    assert deleted_at and kept == 2
    assert [c["id"] for c in deleted(domain="agent")] == [mine["id"]]
    store.CURRENT.set("other")
    assert deleted(domain="agent") == []
    try:
        restore(domain="agent", id=mine["id"])
    except NotFound:
        pass
    else:
        raise AssertionError("foreign restore")
    store.CURRENT.set(store.USER)
    assert len(restore(domain="agent", id=mine["id"])["messages"]) == 2 and deleted(domain="agent") == []
    with store.session() as connection:
        connection.execute("INSERT INTO space (id, title, created_at, updated_at, user_id) VALUES ('s1', 'S', '', '', ?)", (store.USER,))
    assert [(c["id"], c["space_title"]) for c in deleted(domain="space")] == [(space_side["id"], "S")]
    with store.session() as connection:
        connection.execute("UPDATE space SET deleted_at = 'x' WHERE id = 's1'")
    assert deleted(domain="space") == []
    try:
        restore(domain="space", id=space_side["id"])
    except ValueError as error:
        assert "space" in str(error)
    else:
        raise AssertionError("restore under deleted space")
    with store.session() as connection:
        connection.execute("UPDATE space SET deleted_at = '' WHERE id = 's1'")
    assert restore(domain="space", id=space_side["id"])["space_id"] == "s1" and deleted(domain="space") == []
    print("ok")

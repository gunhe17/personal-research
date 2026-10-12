from __future__ import annotations

import json
import re
import sqlite3
import uuid

from usecase.common import store

DOMAINS = ("space", "agent")
KINDS = ("question", "retrieval", "next", "collect")
IDENTIFIER = re.compile(r"[a-zA-Z0-9_-]+")
REPOSITORY = re.compile(r"(repos/github/[^/]+/[^/]+)/")
ENCODED = ("context", "rich", "sources")


# #
# query

def listed(*, domain: str, space_id: str = "") -> list[dict]:
    assert domain in DOMAINS
    where, parameters = ("WHERE c.user_id = ? AND c.space_id = ?", (store.user(), space_id)) if space_id else ("WHERE c.user_id = ?", (store.user(),))
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


def find(*, collected_id: str) -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT c.id, c.space_id, c.title
               FROM space_conversation AS c
               JOIN collected AS root ON root.id = c.collected_id
               JOIN collected AS wanted ON wanted.id = ?
               WHERE c.user_id = ? AND (root.id = wanted.id OR wanted.path LIKE root.path || '/%')
               ORDER BY c.updated_at DESC""",
            (collected_id, store.user()),
        ).fetchall()

    return [
        {"id": r[0], "space_id": r[1], "title": r[2]}
        for r in rows
    ]


def get(*, domain: str, id: str) -> dict | None:
    assert domain in DOMAINS
    if not IDENTIFIER.fullmatch(id or ""):
        return None
    with store.session() as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(f"SELECT * FROM {domain}_conversation WHERE id = ? AND user_id = ?", (id, store.user())).fetchone()
        if row is None:
            return None
        messages = connection.execute(
            f"SELECT * FROM {domain}_message WHERE conversation_id = ? ORDER BY rowid",
            (id,),
        ).fetchall()
    found = {**dict(row), "meta": json.loads(row["meta"]), "domain": domain}
    found["messages"] = [decoded(row=m) for m in messages]
    found["documents"] = documents(collected_id=found["collected_id"])

    return found


def message(*, domain: str, id: str) -> dict:
    assert domain in DOMAINS
    with store.session() as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(f"SELECT * FROM {domain}_message WHERE id = ?", (id,)).fetchone()
    if row is None:
        raise ValueError("메시지를 찾을 수 없습니다.")

    return decoded(row=row)


def documents(*, collected_id: str) -> list[dict]:
    if not collected_id:
        return []
    with store.session() as connection:
        rows = connection.execute(
            """SELECT document.id, document.path, document.url
               FROM collected AS root
               JOIN collected AS document ON document.id = root.id OR document.path LIKE root.path || '/%'
               WHERE root.id = ?
               ORDER BY document.path""",
            (collected_id,),
        ).fetchall()

    return [
        {"id": r[0], "path": r[1], "url": r[2]}
        for r in rows
    ]


def notes(*, space_id: str) -> list[str]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT json_extract(m.rich, '$.learning_note')
               FROM space_message AS m
               JOIN space_conversation AS c ON c.id = m.conversation_id
               WHERE c.space_id = ? AND c.user_id = ? AND m.role = 'assistant' AND m.rich IS NOT NULL
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
    with store.session() as connection:
        store.conversation(connection=connection, domain=domain, row=created, messages=[])

    return created


def edit(*, domain: str, id: str, data: dict) -> dict:
    assert domain in DOMAINS
    with store.session() as connection:
        if isinstance(data.get("title"), str):
            connection.execute(f"UPDATE {domain}_conversation SET title = ? WHERE id = ?", (data["title"], id))
        if isinstance(data.get("collected_id"), str):
            connection.execute(
                f"UPDATE {domain}_conversation SET collected_id = ? WHERE id = ?",
                (root(collected_id=data["collected_id"]), id),
            )
    edited = get(domain=domain, id=id)
    if edited is None:
        raise ValueError("대화를 찾을 수 없습니다.")

    return edited


def remove(*, domain: str, id: str) -> bool:
    assert domain in DOMAINS
    with store.session() as connection:
        removed = connection.execute(f"DELETE FROM {domain}_conversation WHERE id = ? AND user_id = ?", (id, store.user())).rowcount
        if removed:
            connection.execute(f"DELETE FROM {domain}_message WHERE conversation_id = ?", (id,))

    return removed > 0


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
        raise ValueError("대화를 찾을 수 없습니다.")
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
        connection.execute(
            f"INSERT INTO {domain}_message ({', '.join(store.MESSAGE)}) VALUES ({', '.join('?' * len(store.MESSAGE))})",
            store.stored(message=message, conversation_id=id),
        )
        connection.execute(f"UPDATE {domain}_conversation SET updated_at = ? WHERE id = ?", (store.now(), id))


def change(*, domain: str, message_id: str, **fields) -> None:
    assert domain in DOMAINS and set(fields) <= {"status", "error"}
    assignments = ", ".join(f"{key} = ?" for key in fields)
    with store.session() as connection:
        connection.execute(
            f"UPDATE {domain}_message SET {assignments} WHERE id = ?",
            (*fields.values(), message_id),
        )


def answer(*, domain: str, id: str, question_id: str, rich: dict, sources: list[dict]) -> None:
    change(domain=domain, message_id=question_id, status="completed", error=None)
    add(domain=domain, id=id, message={
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "content": "\n\n".join([rich["title"]] + [b["text"] for b in rich["blocks"] if b["text"]] + [rich["follow_up"]]),
        "rich": rich,
        "sources": sources,
        "question_id": question_id,
        "created_at": store.now(),
    })


def remember(*, domain: str, id: str, provider: str, values: dict) -> None:
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
                    WHERE status IN ('queued', 'running')""",
                ("서버가 다시 시작되었습니다. 다시 시도할 수 있습니다.",),
            )


def root(*, collected_id: str) -> str:
    if not collected_id:
        return ""
    path = store.path_of(id=collected_id)
    matched = REPOSITORY.match(path)
    card = store.locate(text=matched.group(1)) if matched else None

    return card or collected_id

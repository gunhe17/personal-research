from __future__ import annotations

import json
import re
import threading
import uuid

from usecase.common import store

IDENTIFIER = re.compile(r"[a-zA-Z0-9_-]+")
REPOSITORY = re.compile(r"(repos/github/[^/]+/[^/]+)/")
KINDS = ("question", "retrieval", "next")
WRITE = threading.Lock()
COLUMNS = "id, title, purpose, log, thread_id, messages, created_at, updated_at"


# #
# query

def listed(*, collected_id: str = "") -> list[dict]:
    with store.session() as connection:
        if collected_id:
            rows = connection.execute(
                """SELECT DISTINCT space.id, space.title, space.created_at, space.updated_at,
                          json_array_length(space.messages)
                   FROM space
                   JOIN space_collected AS link ON link.space_id = space.id
                   JOIN collected AS linked ON linked.id = link.collected_id
                   JOIN collected AS wanted ON wanted.id = ?
                   WHERE linked.id = wanted.id OR wanted.path LIKE linked.path || '/%'
                   ORDER BY space.updated_at DESC""",
                (collected_id,),
            ).fetchall()
        else:
            rows = connection.execute(
                """SELECT id, title, created_at, updated_at, json_array_length(messages)
                   FROM space ORDER BY updated_at DESC"""
            ).fetchall()

    return [
        {"id": r[0], "title": r[1], "created_at": r[2], "updated_at": r[3], "message_count": r[4]}
        for r in rows
    ]


def get(*, id: str) -> dict | None:
    if not IDENTIFIER.fullmatch(id or ""):
        return None
    with store.session() as connection:
        row = connection.execute(f"SELECT {COLUMNS} FROM space WHERE id = ?", (id,)).fetchone()
    if not row:
        return None

    return {
        "id": row[0],
        "title": row[1],
        "purpose": row[2],
        "log": row[3],
        "thread_id": row[4],
        "messages": json.loads(row[5]),
        "created_at": row[6],
        "updated_at": row[7],
    }


def linked(*, id: str) -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT DISTINCT document.id, document.path, document.url, link.collected_id = document.id
               FROM space_collected AS link
               JOIN collected AS root ON root.id = link.collected_id
               JOIN collected AS document
                 ON document.id = root.id OR document.path LIKE root.path || '/%'
               WHERE link.space_id = ?
               ORDER BY document.path""",
            (id,),
        ).fetchall()

    return [
        {"id": r[0], "path": r[1], "url": r[2], "direct": bool(r[3])}
        for r in rows
    ]


# #
# command

def save(*, data: dict) -> dict:
    saved = {
        "id": data.get("id") or str(uuid.uuid4()),
        "title": (data.get("title") or "").strip() or "새 space",
        "purpose": data.get("purpose") or "",
        "log": data.get("log") or "",
        "thread_id": data.get("thread_id"),
        "messages": data.get("messages") or [],
        "created_at": data.get("created_at") or store.now(),
        "updated_at": store.now(),
    }
    with store.session() as connection:
        connection.execute(
            f"INSERT OR REPLACE INTO space ({COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                saved["id"],
                saved["title"],
                saved["purpose"],
                saved["log"],
                saved["thread_id"],
                json.dumps(saved["messages"], ensure_ascii=False),
                saved["created_at"],
                saved["updated_at"],
            ),
        )

    return saved


def create(*, data: dict) -> dict:
    created = save(data={"title": data.get("title"), "purpose": data.get("purpose")})
    if data.get("collected_id"):
        link(id=created["id"], collected_id=root(collected_id=data["collected_id"]))

    return created


def edit(*, id: str, data: dict) -> dict:
    with WRITE:
        space = existing(id=id)
        for key in ("title", "purpose"):
            if isinstance(data.get(key), str):
                space[key] = data[key]
        edited = save(data=space)

    return edited


def remove(*, id: str) -> bool:
    with store.session() as connection:
        connection.execute("DELETE FROM space_collected WHERE space_id = ?", (id,))
        removed = connection.execute("DELETE FROM space WHERE id = ?", (id,)).rowcount

    return removed > 0


def link(*, id: str, collected_id: str) -> None:
    existing(id=id)
    with store.session() as connection:
        if not connection.execute("SELECT 1 FROM collected WHERE id = ?", (collected_id,)).fetchone():
            raise ValueError("수집물을 찾을 수 없습니다.")
        connection.execute(
            "INSERT OR IGNORE INTO space_collected (space_id, collected_id, linked_at) VALUES (?, ?, ?)",
            (id, collected_id, store.now()),
        )


def unlink(*, id: str, collected_id: str) -> None:
    with store.session() as connection:
        connection.execute(
            "DELETE FROM space_collected WHERE space_id = ? AND collected_id = ?",
            (id, collected_id),
        )


def root(*, collected_id: str) -> str:
    path = store.path_of(id=collected_id)
    matched = REPOSITORY.match(path)
    card = store.locate(text=matched.group(1)) if matched else None

    return card or collected_id


def ask(*, id: str, data: dict) -> dict:
    body = data.get("body")
    if not isinstance(body, str) or not body.strip() or len(body) > 10_000:
        raise ValueError("질문을 1~10,000자로 입력해 주세요.")
    context = data.get("context") or {}
    if not isinstance(context, dict) or len(context.get("annotations") or []) > 10:
        raise ValueError("화면 상태나 주석이 올바르지 않습니다.")
    client_id = str(data.get("client_id") or uuid.uuid4())
    with WRITE:
        space = existing(id=id)
        repeated = next((m for m in space["messages"] if m.get("client_id") == client_id), None)
        if repeated:
            return repeated
        question = {
            "id": str(uuid.uuid4()),
            "role": "user",
            "client_id": client_id,
            "kind": data.get("kind") if data.get("kind") in KINDS else "question",
            "body": body.strip(),
            "context": context,
            "status": "queued",
            "error": None,
            "created_at": store.now(),
        }
        space["messages"].append(question)
        if not any(m["role"] == "user" for m in space["messages"][:-1]) and space["title"] == "새 space":
            space["title"] = body.strip()[:48]
        save(data=space)

    return question


def change(*, id: str, message_id: str, **fields) -> dict:
    with WRITE:
        space = existing(id=id)
        message = next((m for m in space["messages"] if m["id"] == message_id), None)
        if message is None:
            raise ValueError("질문을 찾을 수 없습니다.")
        message.update(fields)
        save(data=space)

    return message


def answer(*, id: str, question_id: str, rich: dict, sources: list[dict]) -> None:
    with WRITE:
        space = existing(id=id)
        question = next(m for m in space["messages"] if m["id"] == question_id)
        question.update(status="completed", error=None)
        space["messages"].append({
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "question_id": question_id,
            "body": "\n\n".join([rich["title"]] + [b["text"] for b in rich["blocks"] if b["text"]] + [rich["follow_up"]]),
            "rich": rich,
            "sources": sources,
            "created_at": store.now(),
        })
        save(data=space)


def thread(*, id: str, thread_id: str) -> None:
    with WRITE:
        space = existing(id=id)
        space["thread_id"] = thread_id
        save(data=space)


def recover() -> None:
    with WRITE:
        for item in listed():
            space = existing(id=item["id"])
            stale = [m for m in space["messages"] if m.get("status") in ("queued", "running")]
            for message in stale:
                message.update(status="interrupted", error="서버가 다시 시작되었습니다. 다시 시도할 수 있습니다.")
            if stale:
                save(data=space)


def existing(*, id: str) -> dict:
    found = get(id=id)
    if found is None:
        raise ValueError("space 를 찾을 수 없습니다.")

    return found


# #
# adopt

def adopt() -> None:
    with store.session() as connection:
        tables = {r[0] for r in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        paths = dict(connection.execute("SELECT path, id FROM collected").fetchall())
        for table in ("conversations", "agent"):
            if table not in tables:
                continue
            for id, title, created_at, updated_at, messages in connection.execute(f"SELECT * FROM {table}").fetchall():
                converted, cited = chat(messages=json.loads(messages), created_at=created_at)
                insert(connection=connection, row=(id, title, "", "", None, converted, created_at, updated_at))
                for path in cited & paths.keys():
                    connection.execute(
                        "INSERT OR IGNORE INTO space_collected VALUES (?, ?, ?)",
                        (id, paths[path], created_at),
                    )
            connection.execute(f"DROP TABLE {table}")
        if "asked" in tables:
            for row in connection.execute(f"SELECT {COLUMNS.replace('purpose', 'plan')} FROM asked").fetchall():
                insert(connection=connection, row=(*row[:5], json.loads(row[5]), *row[6:]))
            connection.execute("DROP TABLE asked")


def chat(*, messages: list[dict], created_at: str) -> tuple[list[dict], set[str]]:
    converted, cited, question_id = [], set(), None
    for message in messages:
        if message.get("role") == "user":
            question_id = str(uuid.uuid4())
            citations = message.get("citations") or []
            cited |= {c.get("path") for c in citations if c.get("path")}
            converted.append({
                "id": question_id,
                "role": "user",
                "client_id": question_id,
                "kind": "question",
                "body": message.get("content") or "",
                "context": {"citations": citations},
                "status": "completed",
                "error": None,
                "created_at": created_at,
            })
        elif message.get("role") == "assistant":
            converted.append({
                "id": str(uuid.uuid4()),
                "role": "assistant",
                "question_id": question_id,
                "body": message.get("content") or "",
                "rich": None,
                "sources": [],
                "created_at": created_at,
            })

    return converted, cited


def insert(*, connection, row: tuple) -> None:
    connection.execute(
        f"INSERT OR IGNORE INTO space ({COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (*row[:5], json.dumps(row[5], ensure_ascii=False), *row[6:]),
    )

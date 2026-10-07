from __future__ import annotations

import json
import re
import threading
import uuid

from usecase.common import store

IDENTIFIER = re.compile(r"[a-zA-Z0-9_-]+")
KINDS = ("question", "retrieval", "next")
WRITE = threading.Lock()


# #
# query

def listed() -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT id, title, created_at, updated_at, json_array_length(messages)
               FROM asked ORDER BY updated_at DESC"""
        ).fetchall()

    return [
        {"id": r[0], "title": r[1], "created_at": r[2], "updated_at": r[3], "message_count": r[4]}
        for r in rows
    ]


def get(*, id: str) -> dict | None:
    if not IDENTIFIER.fullmatch(id or ""):
        return None
    with store.session() as connection:
        row = connection.execute(
            "SELECT id, title, plan, log, thread_id, messages, created_at, updated_at FROM asked WHERE id = ?",
            (id,),
        ).fetchone()
    if not row:
        return None

    return {
        "id": row[0],
        "title": row[1],
        "plan": row[2],
        "log": row[3],
        "thread_id": row[4],
        "messages": json.loads(row[5]),
        "created_at": row[6],
        "updated_at": row[7],
    }


# #
# command

def save(*, data: dict) -> dict:
    saved = {
        "id": data.get("id") or str(uuid.uuid4()),
        "title": (data.get("title") or "").strip() or "새 학습",
        "plan": data.get("plan") or "",
        "log": data.get("log") or "",
        "thread_id": data.get("thread_id"),
        "messages": data.get("messages") or [],
        "created_at": data.get("created_at") or store.now(),
        "updated_at": store.now(),
    }
    with store.session() as connection:
        connection.execute(
            "INSERT OR REPLACE INTO asked VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                saved["id"],
                saved["title"],
                saved["plan"],
                saved["log"],
                saved["thread_id"],
                json.dumps(saved["messages"], ensure_ascii=False),
                saved["created_at"],
                saved["updated_at"],
            ),
        )

    return saved


def ask(*, id: str, data: dict) -> dict:
    body = data.get("body")
    if not isinstance(body, str) or not body.strip() or len(body) > 10_000:
        raise ValueError("질문을 1~10,000자로 입력해 주세요.")
    context = data.get("context") or {}
    if not isinstance(context, dict) or len(context.get("annotations") or []) > 10:
        raise ValueError("화면 상태나 주석이 올바르지 않습니다.")
    client_id = str(data.get("client_id") or uuid.uuid4())
    with WRITE:
        asked = existing(id=id)
        repeated = next((m for m in asked["messages"] if m.get("client_id") == client_id), None)
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
        asked["messages"].append(question)
        save(data=asked)

    return question


def change(*, id: str, message_id: str, **fields) -> dict:
    with WRITE:
        asked = existing(id=id)
        message = next((m for m in asked["messages"] if m["id"] == message_id), None)
        if message is None:
            raise ValueError("질문을 찾을 수 없습니다.")
        message.update(fields)
        save(data=asked)

    return message


def answer(*, id: str, question_id: str, rich: dict) -> None:
    with WRITE:
        asked = existing(id=id)
        question = next(m for m in asked["messages"] if m["id"] == question_id)
        question.update(status="completed", error=None)
        asked["messages"].append({
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "question_id": question_id,
            "body": "\n\n".join([rich["title"]] + [b["text"] for b in rich["blocks"] if b["text"]] + [rich["follow_up"]]),
            "rich": rich,
            "created_at": store.now(),
        })
        save(data=asked)


def thread(*, id: str, thread_id: str) -> None:
    with WRITE:
        asked = existing(id=id)
        asked["thread_id"] = thread_id
        save(data=asked)


def recover() -> None:
    with WRITE:
        for item in listed():
            asked = existing(id=item["id"])
            stale = [m for m in asked["messages"] if m.get("status") in ("queued", "running")]
            for message in stale:
                message.update(status="interrupted", error="서버가 다시 시작되었습니다. 다시 시도할 수 있습니다.")
            if stale:
                save(data=asked)


def existing(*, id: str) -> dict:
    found = get(id=id)
    if found is None:
        raise ValueError("학습을 찾을 수 없습니다.")

    return found

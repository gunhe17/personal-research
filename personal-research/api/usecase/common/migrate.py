from __future__ import annotations

import json
import uuid

from usecase.collected.record import record as documents
from usecase.common import store

UPGRADED = False


# #
# upgrade

def upgrade(*, connection) -> None:
    global UPGRADED
    if UPGRADED:
        return
    tables = {r[0] for r in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    # rename
    if "extra" in store.columns(connection=connection, table="collected"):
        connection.execute("ALTER TABLE collected RENAME COLUMN extra TO meta")
    if "body" in store.columns(connection=connection, table="collected_content"):
        connection.execute("ALTER TABLE collected_content RENAME COLUMN body TO content")
    # user
    connection.execute("INSERT OR IGNORE INTO user (id, name, created_at) VALUES (?, ?, ?)", (store.USER, "나", store.now()))
    if "opened" in tables:
        connection.execute(
            """INSERT OR REPLACE INTO user_meta (user_id, kind, collected_id, value, updated_at)
               SELECT ?, 'opened', collected_id, '{}', opened_at FROM opened""",
            (store.USER,),
        )
        connection.execute("DROP TABLE opened")
    # credential
    if "auth" not in store.columns(connection=connection, table="llm"):
        connection.execute("ALTER TABLE llm ADD COLUMN auth TEXT NOT NULL DEFAULT ''")
    if "secret" not in store.columns(connection=connection, table="user_meta"):
        connection.execute("ALTER TABLE user_meta ADD COLUMN secret TEXT NOT NULL DEFAULT ''")
    # owner
    for table, column, fallback in (("user", "password", "''"), ("user", "email", "''"), ("user", "role", "'user'"), ("space", "user_id", "'default'"), ("space_conversation", "user_id", "'default'"), ("agent_conversation", "user_id", "'default'"), ("llm", "user_id", "'default'")):
        if column not in store.columns(connection=connection, table=table):
            connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} TEXT NOT NULL DEFAULT {fallback}")
    # deleted
    for table in ("space", "space_material", "space_conversation", "agent_conversation", "user"):
        if "deleted_at" not in store.columns(connection=connection, table=table):
            connection.execute(f"ALTER TABLE {table} ADD COLUMN deleted_at TEXT NOT NULL DEFAULT ''")
    # kind
    for old, new in documents.RENAMED.items():
        connection.execute("UPDATE collected SET path = ? || substr(path, ?) WHERE path LIKE ?", (new, len(old) + 1, f"{old}/%"))
    # conversation
    paths = dict(connection.execute("SELECT path, id FROM collected").fetchall())
    for table in ("conversations", "agent"):
        if table not in tables:
            continue
        for id, title, created_at, updated_at, messages in connection.execute(
            f"SELECT id, title, createdAt, updatedAt, messages FROM {table}"
        ).fetchall():
            converted, cited = legacy(messages=json.loads(messages), created_at=created_at)
            collected_id = next((paths[p] for p in cited if p in paths), "")
            if table == "agent":
                conversation(connection=connection, domain="agent", row={"id": id, "collected_id": collected_id, "title": title, "created_at": created_at, "updated_at": updated_at}, messages=converted)
            else:
                connection.execute("INSERT OR IGNORE INTO space (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)", (id, title, created_at, updated_at))
                conversation(connection=connection, domain="space", row={"id": id, "space_id": id, "collected_id": collected_id, "title": title, "created_at": created_at, "updated_at": updated_at}, messages=converted)
        connection.execute(f"DROP TABLE {table}")
    if "asked" in tables:
        for id, title, plan, log, thread_id, messages, created_at, updated_at in connection.execute(
            "SELECT id, title, plan, log, thread_id, messages, created_at, updated_at FROM asked"
        ).fetchall():
            connection.execute("INSERT OR IGNORE INTO space (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)", (id, title, created_at, updated_at))
            store.material(connection=connection, space_id=id, kind="plan", title="목적", content=plan, created_at=created_at)
            store.material(connection=connection, space_id=id, kind="log", title="웹 이전 학습 기록", content=log, created_at=created_at)
            conversation(connection=connection, domain="space", row={"id": id, "space_id": id, "title": title, "meta": codex(thread_id=thread_id), "created_at": created_at, "updated_at": updated_at}, messages=json.loads(messages))
        connection.execute("DROP TABLE asked")
    if "messages" in store.columns(connection=connection, table="space"):
        links = dict(connection.execute("SELECT space_id, MIN(collected_id) FROM space_collected GROUP BY space_id").fetchall()) if "space_collected" in tables else {}
        for id, title, thread_id, messages, created_at, updated_at in connection.execute(
            "SELECT id, title, thread_id, messages, created_at, updated_at FROM space"
        ).fetchall():
            conversation(connection=connection, domain="space", row={"id": id, "space_id": id, "collected_id": links.get(id, ""), "title": title, "meta": codex(thread_id=thread_id), "created_at": created_at, "updated_at": updated_at}, messages=json.loads(messages))
        connection.execute("ALTER TABLE space DROP COLUMN messages")
        connection.execute("ALTER TABLE space DROP COLUMN thread_id")
        connection.execute("DROP TABLE IF EXISTS space_collected")
    # material
    if "purpose" in store.columns(connection=connection, table="space"):
        for id, purpose, log, created_at in connection.execute("SELECT id, purpose, log, created_at FROM space").fetchall():
            store.material(connection=connection, space_id=id, kind="plan", title="목적", content=purpose, created_at=created_at)
            store.material(connection=connection, space_id=id, kind="log", title="웹 이전 학습 기록", content=log, created_at=created_at)
        connection.execute("ALTER TABLE space DROP COLUMN purpose")
        connection.execute("ALTER TABLE space DROP COLUMN log")
    for id, conversation_id, rich, created_at in connection.execute(
        "SELECT id, conversation_id, rich, created_at FROM space_message WHERE role = 'assistant' AND question_id IS NULL AND rich IS NOT NULL"
    ).fetchall():
        space_id = connection.execute("SELECT space_id FROM space_conversation WHERE id = ?", (conversation_id,)).fetchone()[0]
        store.material(connection=connection, space_id=space_id, kind="lesson", title=json.loads(rich)["title"], content=rich, created_at=created_at)
        connection.execute("DELETE FROM space_message WHERE id = ?", (id,))
    UPGRADED = True


def legacy(*, messages: list[dict], created_at: str) -> tuple[list[dict], list[str]]:
    converted, cited, question_id = [], [], None
    for message in messages:
        if message.get("role") == "user":
            question_id = str(uuid.uuid4())
            citations = message.get("citations") or []
            cited += [c["path"] for c in citations if c.get("path")]
            converted.append({"id": question_id, "role": "user", "kind": "question", "content": message.get("content") or "", "context": {"citations": citations}, "status": "completed", "created_at": created_at})
        elif message.get("role") == "assistant":
            converted.append({"id": str(uuid.uuid4()), "role": "assistant", "content": message.get("content") or "", "question_id": question_id, "created_at": created_at})

    return converted, cited


def conversation(*, connection, domain: str, row: dict, messages: list[dict]) -> None:
    fields = ["id", "collected_id", "title", "meta", "created_at", "updated_at", "user_id"] + (["space_id"] if domain == "space" else [])
    values = {**row, "collected_id": row.get("collected_id") or "", "meta": json.dumps(row.get("meta") or {}, ensure_ascii=False), "user_id": row.get("user_id") or store.user()}
    connection.execute(
        f"INSERT OR IGNORE INTO {domain}_conversation ({', '.join(fields)}) VALUES ({', '.join('?' * len(fields))})",
        tuple(values[f] for f in fields),
    )
    for message in messages:
        store.insert_message(connection=connection, domain=domain, message=message, conversation_id=row["id"], ignore=True)


def codex(*, thread_id: str | None) -> dict:
    return {"codex": {"thread_id": thread_id}} if thread_id else {}

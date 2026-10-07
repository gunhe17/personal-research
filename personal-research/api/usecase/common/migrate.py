from __future__ import annotations

import json
import sqlite3
import uuid
from pathlib import Path

from usecase.common import store

CARRIED = ("kor", "head")


# #
# migrate

def run(*, collected: Path, conversations: Path) -> str:
    documents = records = talks = 0
    old = sqlite3.connect(collected)
    old.row_factory = sqlite3.Row
    sidecars = {
        row["rel"]: json.loads(row["data"])
        for row in old.execute("SELECT rel, data FROM sidecar")
    }
    identifiers = {path: str(uuid.uuid4()) for path in sidecars}
    with store.session() as connection:
        for path, data in sidecars.items():
            extra = {k: v for k, v in data.items() if k not in CARRIED and k != "source"}
            connection.execute(
                "INSERT OR REPLACE INTO collected VALUES (?, ?, ?, ?)",
                (identifiers[path], data.get("source", ""), path, json.dumps(extra, ensure_ascii=False)),
            )
            records += 1
        for row in old.execute("SELECT lang, rel, body FROM document ORDER BY lang DESC, rel"):
            id = identifiers.get(row["rel"])
            if id is None:
                raise ValueError(f"메타 없는 원문: {row['rel']}")
            decoration = sidecars[row["rel"]].get("head", "") if row["lang"] == "eng" else ""
            connection.execute(
                "INSERT OR REPLACE INTO collected_content VALUES (?, ?, 1, ?, ?, ?)",
                (id, row["lang"], decoration, row["body"], store.now()),
            )
            documents += 1
        if conversations.is_file():
            talk = sqlite3.connect(conversations)
            connection.execute("CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT, createdAt TEXT, updatedAt TEXT, messages TEXT)")
            for row in talk.execute("SELECT id, title, createdAt, updatedAt, messages FROM conversations"):
                connection.execute("INSERT OR REPLACE INTO conversations VALUES (?, ?, ?, ?, ?)", row)
                talks += 1
            talk.close()
    old.close()

    return f"문서 {documents}건, 메타 {records}건, 대화 {talks}건 적재: {store.DATABASE}"

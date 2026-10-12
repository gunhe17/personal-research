from __future__ import annotations

import re

from usecase.common import store

WINDOW = 260


# #
# search

def run(*, terms: list[str], limit: int = 8) -> list[dict]:
    wanted = [t.strip().lower() for t in terms if t.strip()]
    if not wanted:
        return []
    clause = " AND ".join(["LOWER(c.content) LIKE ?"] * len(wanted))
    with store.session() as connection:
        rows = connection.execute(
            f"{LATEST} WHERE {clause}",
            tuple(f"%{t}%" for t in wanted),
        ).fetchall()
    scored = []
    for id, path, url, language, body in rows:
        lowered = body.lower()
        hits = sum(lowered.count(t) for t in wanted)
        scored.append(
            {
                "id": id,
                "path": path,
                "url": url,
                "language": language,
                "hits": hits,
                "excerpt": excerpt(body=body, lowered=lowered, term=wanted[0]),
            }
        )
    scored.sort(key=lambda found: (-found["hits"], found["path"]))

    return scored[:limit]


def excerpt(*, body: str, lowered: str, term: str) -> str:
    where = lowered.find(term)
    if where < 0:
        where = 0
    start = max(0, where - WINDOW // 3)
    text = body[start : start + WINDOW]

    return re.sub(r"\s+", " ", text).strip()

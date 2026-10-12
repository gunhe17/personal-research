from __future__ import annotations

import re

from usecase.collected.record import record as documents

WINDOW = 260


# #
# search

def run(*, terms: list[str], limit: int = 8) -> list[dict]:
    wanted = [t.strip().lower() for t in terms if t.strip()]
    if not wanted:
        return []
    scored = []
    for id, path, url, language, body in documents.matching(terms=wanted):
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

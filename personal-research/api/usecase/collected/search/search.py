from __future__ import annotations

import re

from usecase.common import store

LATEST = """
SELECT collected.id, collected.path, collected.url, c.language, c.content
FROM collected_content AS c
JOIN collected ON collected.id = c.collected_id
JOIN (SELECT collected_id, language, MAX(version) AS version
      FROM collected_content GROUP BY collected_id, language) AS top
  ON top.collected_id = c.collected_id
 AND top.language = c.language
 AND top.version = c.version
"""
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


def keywords(*, question: str) -> list[str]:
    words = re.findall(r"[A-Za-z][A-Za-z0-9.\-]{2,}", question)
    seen = []
    for word in words:
        if word.lower() not in [s.lower() for s in seen]:
            seen.append(word)

    return seen[:4]


# #
# related

STOP = {
    "the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "was",
    "how", "what", "when", "use", "using", "used", "docs", "doc", "index", "overview",
    "guide", "api", "get", "new", "all", "can", "その", "com", "www", "http", "https",
}


def stamp(*, items: list[dict]) -> list[dict]:
    seen = store.opened()
    for item in items:
        item["opened_at"] = seen.get(item["id"])

    return items


def related(*, id: str, limit: int = 5) -> list[dict]:
    with store.session() as connection:
        row = connection.execute("SELECT path FROM collected WHERE id = ?", (id,)).fetchone()
        if row is None:
            return recent(limit=limit)
        path = row[0]
        rows = connection.execute(
            """SELECT collected.id, collected.path, collected.url FROM collected
               JOIN collected_content ON collected_content.collected_id = collected.id
                                     AND collected_content.language = 'eng'
               WHERE collected.id IS NOT ?
               GROUP BY collected.id""",
            (id,),
        ).fetchall()
    words = set(name_terms(path=path))
    folder = path.rsplit("/", 1)[0]
    parent = folder.rsplit("/", 1)[0] if "/" in folder else folder
    scored = []
    for other, other_path, url in rows:
        other_folder = other_path.rsplit("/", 1)[0]
        score = 0
        if other_folder == folder:
            score += 6
        elif other_folder.startswith(parent + "/") or other_folder == parent:
            score += 3
        elif other_path.split("/")[:2] == path.split("/")[:2]:
            score += 1
        score += 2 * len(words & set(name_terms(path=other_path)))
        if score:
            scored.append((score, other_path, {"id": other, "path": other_path, "url": url, "score": score}))
    seen = store.opened()
    found = [item[2] for item in scored]
    visited = sorted(
        (item for item in found if seen.get(item["id"])),
        key=lambda item: seen[item["id"]],
        reverse=True,
    )
    unvisited = sorted(
        (item for item in found if not seen.get(item["id"])),
        key=lambda item: (-item["score"], item["path"]),
    )
    picked = (visited + unvisited)[:limit]

    return stamp(items=picked) or recent(limit=limit, skip=id)


def name_terms(*, path: str) -> list[str]:
    name = path.rsplit("/", 1)[-1].rsplit(".", 1)[0]

    return [w for w in re.split(r"[-_\s]+", name.lower()) if len(w) > 2 and w not in STOP]


def recent(*, limit: int = 5, skip: str | None = None) -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT collected.id, collected.path, collected.url
               FROM collected_content AS c
               JOIN collected ON collected.id = c.collected_id
               LEFT JOIN user_meta AS opened
                 ON opened.collected_id = collected.id AND opened.kind = 'opened' AND opened.user_id = ?
               WHERE c.language = 'eng' AND collected.id IS NOT ?
               GROUP BY collected.id
               ORDER BY opened.updated_at IS NULL, opened.updated_at DESC,
                        MAX(c.created_at) DESC, collected.path
               LIMIT ?""",
            (store.USER, skip, limit),
        ).fetchall()

    return stamp(items=[
        {"id": id, "path": path, "url": url, "language": "eng", "hits": 0, "excerpt": ""}
        for id, path, url in rows
    ])

from __future__ import annotations

import json
from pathlib import Path

from usecase.common import store


# #
# tree

def tree() -> list[dict]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT collected.id, collected.path, collected.extra,
                      GROUP_CONCAT(DISTINCT collected_content.language)
               FROM collected
               JOIN collected_content ON collected_content.collected_id = collected.id
               GROUP BY collected.id
               ORDER BY collected.path"""
        ).fetchall()
    root: dict = {}
    for id, path, extra, languages in rows:
        available = sorted((languages or "").split(","))
        if "eng" not in available:
            continue
        node = {
            "type": "file",
            "id": id,
            "name": path.rsplit("/", 1)[-1],
            "path": path,
            "ext": Path(path).suffix.lower(),
            "languages": available,
            "published": json.loads(extra).get("published"),
        }
        parent = root
        for part in path.split("/")[:-1]:
            parent = parent.setdefault(part, {})
        parent[node["name"]] = node

    return nodes(level=root, prefix="")


def nodes(*, level: dict, prefix: str) -> list[dict]:
    listed = []
    for name, value in level.items():
        if value.get("type") == "file":
            listed.append(value)
        else:
            path = f"{prefix}/{name}".lstrip("/")
            listed.append({"type": "dir", "name": name, "path": path, "children": nodes(level=value, prefix=path)})

    return sorted(listed, key=lambda n: (n["type"] != "dir", n.get("published") or "~", n["name"].lower()))


# #
# read

def document(*, reference: str, language: str) -> dict | None:
    id = store.locate(text=reference)
    if id is None or not store.exists(id=id, language=language):
        return None
    path = store.path_of(id=id)

    return {
        "id": id,
        "path": path,
        "name": path.rsplit("/", 1)[-1],
        "language": language,
        "content": store.read(id=id, language=language),
    }


def meta(*, reference: str) -> dict | None:
    id = store.locate(text=reference)

    return store.meta(id=id) or None if id else None


def content_type(*, path: str) -> str:
    return "text/html; charset=utf-8" if path.endswith(".html") else "text/plain; charset=utf-8"

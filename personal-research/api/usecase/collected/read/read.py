from __future__ import annotations

import json
from pathlib import Path

from usecase.collected.record import record as documents


# #
# tree

def tree() -> list[dict]:
    root: dict = {kind: {} for kind in documents.RENAMED.values()}
    for id, path, meta, languages in documents.catalog():
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
            "published": json.loads(meta).get("published"),
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
    id = documents.locate(text=reference)
    if id is None or not documents.exists(id=id, language=language):
        return None
    path = documents.path_of(id=id)

    return {
        "id": id,
        "path": path,
        "name": path.rsplit("/", 1)[-1],
        "language": language,
        "content": documents.read(id=id, language=language),
    }


def meta(*, reference: str) -> dict | None:
    id = documents.locate(text=reference)

    return documents.meta(id=id) or None if id else None


def content_type(*, path: str) -> str:
    return "text/html; charset=utf-8" if path.endswith(".html") else "text/plain; charset=utf-8"


# #
# check

if __name__ == "__main__":
    import tempfile

    from usecase.common import store

    store.DATABASE = Path(tempfile.mkdtemp()) / "check.db"
    store.CURRENT.set(store.USER)
    assert [n["name"] for n in tree()] == list(documents.RENAMED.values())
    for path in ("document/t/b.md", "document/t/a.md", "document/t/inner/deep/c.md", "document/z.md"):
        documents.write(document=documents.Document(path=path, body="# x\n", url=f"https://t/{path}"))
    top = {n["name"]: n for n in tree()}
    assert set(top) == set(documents.RENAMED.values()) and all(top[k]["children"] == [] for k in ("paper", "repository", "video"))
    assert [(n["type"], n["name"]) for n in top["document"]["children"]] == [("dir", "t"), ("file", "z.md")]
    folder = top["document"]["children"][0]
    assert [(n["type"], n["name"]) for n in folder["children"]] == [("dir", "inner"), ("file", "a.md"), ("file", "b.md")]
    deep = folder["children"][0]["children"][0]
    assert deep["path"] == "document/t/inner/deep" and deep["children"][0]["path"] == "document/t/inner/deep/c.md"
    print("ok")

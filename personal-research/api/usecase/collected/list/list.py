from __future__ import annotations

import re

from usecase.common import store


# #
# list

def lines() -> list[str]:
    with store.session() as connection:
        rows = connection.execute(
            f"SELECT collected.path, c.language, c.content, c.version {store.LATEST} ORDER BY c.language, collected.path"
        ).fetchall()
    out = []
    group = None
    for path, language, body, number in rows:
        if not path.endswith(store.DOCUMENT_SUFFIX):
            continue
        kind, _, rest = path.partition("/")
        current = f"{language}/{kind}/{rest.partition('/')[0]}"
        if current != group:
            out.append(f"\n[{current}]")
            group = current
        edition = f" v{number}" if number > 1 else ""
        out.append(f"  {path}{edition}  {title(path=path, body=body)}")

    return out


def title(*, path: str, body: str) -> str:
    if path.endswith(".html"):
        matched = re.search(r"<title>([^<]*)</title>", body)
        return matched.group(1).strip() if matched else ""
    for line in body.splitlines():
        if line.startswith("# "):
            return line[2:].strip()

    return ""

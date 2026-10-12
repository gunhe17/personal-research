from __future__ import annotations

import re

from usecase.collected.record import record as documents


# #
# list

def lines() -> list[str]:
    out = []
    group = None
    for path, language, body, number in documents.editions():
        if not path.endswith(documents.DOCUMENT_SUFFIX):
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

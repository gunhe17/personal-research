from __future__ import annotations

import re
from pathlib import Path

from usecase.collected.record import record as documents

from usecase.collected.collect.type import paper
from usecase.collected.collect.type import repo
from usecase.collected.collect.type import video
from usecase.collected.collect.type import web
from usecase.collected.collect.type import x


# #
# collect

def auto(*, input: str) -> str:
    return dispatch(kind=detect(input=input), input=input)


def dispatch(*, kind: str, input: str) -> str:
    run = {
        "paper": lambda: documents.write(document=paper.get(id=input)),
        "x": lambda: article(url=input),
        "repo": lambda: card(url=input),
        "repo-doc": lambda: repo_file(url=input),
        "video": lambda: documents.write(document=video.get(url=input)),
        "web": lambda: page(url=input),
        "existing": lambda: existing(path=input),
    }

    return run[kind]()


def detect(*, input: str) -> str:
    text = input.strip()
    if paper.ID.fullmatch(text) or "arxiv.org/" in text:
        return "paper"
    if x.URL.match(text):
        return "x"
    matched = repo.URL.match(text)
    if matched:
        return "repo-doc" if matched.group(4) else "repo"
    if re.match(r"^https?://(?:www\.|m\.)?(?:youtube\.com|youtu\.be)/", text):
        return "video"
    if re.match(r"^https?://", text):
        return "web"
    if documents.locate(text=text):
        return "existing"
    raise ValueError(f"Unrecognised input: {input}")


# #
# kind

def article(*, url: str, tweet_id: str | None = None) -> str:
    return documents.write(document=x.get(url=url, tweet_id=tweet_id))


def repo_file(*, url: str, path: str | None = None) -> str:
    return documents.write(document=repo.get(url=url, path=path))


def card(*, url: str) -> str:
    path, address, meta = repo.card(url=url)

    return documents.register(path=path, url=address, meta=meta)


def page(*, url: str, relative: str | None = None) -> str:
    if relative is None:
        found = documents.find(url=url)
        if found:
            return found
        if web.synced(url=url):
            raise ValueError(f"Managed by sync but not collected yet. Run sync.sh ({url})")

    return documents.write(document=web.get(url=url, relative=relative))


def existing(*, path: str) -> str:
    id = documents.resolve(text=path)
    if not documents.exists(id=id, language="eng"):
        raise ValueError(f"No original for: {path}")

    return id


def ingest(*, url: str, path: str, file: str) -> str:
    decoration, body = documents.split(text=Path(file).read_text(encoding="utf-8"))
    document = documents.Document(path=path, body=body, url=url, decoration=decoration)

    return documents.write(document=document)

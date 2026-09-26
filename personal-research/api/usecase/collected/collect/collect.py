from __future__ import annotations

import re
from pathlib import Path

from usecase.common import store

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
        "paper": lambda: store.write(document=paper.get(id=input)),
        "x": lambda: article(url=input),
        "repo": lambda: card(url=input),
        "repo-doc": lambda: repo_file(url=input),
        "video": lambda: store.write(document=video.get(url=input)),
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
    if store.locate(text=text):
        return "existing"
    raise ValueError(f"Unrecognised input: {input}")


# #
# kind

def article(*, url: str, tweet_id: str | None = None) -> str:
    return store.write(document=x.get(url=url, tweet_id=tweet_id))


def repo_file(*, url: str, path: str | None = None) -> str:
    return store.write(document=repo.get(url=url, path=path))


def card(*, url: str) -> str:
    path, address, extra = repo.card(url=url)

    return store.record(path=path, url=address, extra=extra)


def page(*, url: str, rel: str | None = None) -> str:
    if rel is None:
        found = store.find(url=url)
        if found:
            return found
        if web.synced(url=url):
            raise ValueError(f"Managed by sync but not collected yet. Run sync.sh ({url})")

    return store.write(document=web.get(url=url, rel=rel))


def existing(*, path: str) -> str:
    id = store.resolve(text=path)
    if not store.exists(id=id, language="eng"):
        raise ValueError(f"No original for: {path}")

    return id


def ingest(*, url: str, path: str, file: str) -> str:
    return store.mirror(url=url, path=path, text=Path(file).read_text(encoding="utf-8"))

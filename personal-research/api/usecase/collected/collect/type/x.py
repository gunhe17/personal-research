from __future__ import annotations

import json
import re
import subprocess
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

from usecase.common import store

URL = re.compile(r"^https?://(?:www\.)?(?:x|twitter)\.com/(\w+)/(?:article|status)/(\d+)/?(?:\?.*)?$")
PREFIX = {"header-one": "## ", "header-two": "### ", "header-three": "#### ",
          "blockquote": "> ", "unordered-list-item": "- ", "ordered-list-item": "1. "}
MARK = {"Bold": "**", "Italic": "*"}


# #
# get

def get(*, url: str, tweet_id: str | None = None) -> store.Document:
    matched = URL.match(url.strip())
    if not matched:
        raise ValueError(f"Not an X article or status URL: {url}")
    user, given = matched.groups()
    tweet_id = tweet_id or given
    try:
        status = fetch(user=user, tweet_id=tweet_id)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        status = {}
    article = status.get("article") or {}
    if not article:
        tweet_id = find_tweet(user=user, article_id=given)
        status = fetch(user=user, tweet_id=tweet_id)
        article = status.get("article") or {}
    if not article:
        raise ValueError(f"Tweet {tweet_id} has no article. Only tweets carrying an article are collected")
    document = store.Document(
        path=f"docs/x/{user}/article/{store.slugify(title=article['title'])}.md",
        body=f"# {article['title']}\n\n" + render(article=article),
        url=f"https://x.com/{user}/article/{article['id']}",
        extra={
            "author": f"@{status['author']['screen_name']}",
            "published": article["created_at"][:10],
            "fetched": store.today(),
            "via": f"https://api.fxtwitter.com/{user}/status/{tweet_id}",
        },
    )

    return document


# #
# grok

def grok(*, prompt: str, args: list[str]) -> dict:
    with tempfile.TemporaryDirectory() as cwd:
        prompt_file = Path(cwd) / "prompt.md"
        prompt_file.write_text(prompt, encoding="utf-8")
        done = subprocess.run(
            ["grok", "--prompt-file", str(prompt_file), "--output-format", "json",
             "--no-subagents", *args],
            cwd=cwd, capture_output=True, text=True, timeout=1800,
        )
    if done.returncode != 0:
        raise RuntimeError(f"grok failed: {done.stderr.strip()[-500:]}")

    return json.loads(done.stdout)


def find_tweet(*, user: str, article_id: str) -> str:
    out = grok(
        prompt=f"Using X search, find the tweet (status) id of the post by @{user} that "
               f"links the X Article https://x.com/{user}/article/{article_id} "
               f"(it may appear as https://x.com/i/article/{article_id}). Answer with that tweet id.",
        args=["--json-schema", json.dumps({"type": "object", "properties": {
            "tweet_id": {"type": "string"}}, "required": ["tweet_id"]})],
    )

    found = (out.get("structuredOutput") or {}).get("tweet_id") or "".join(re.findall(r"\b\d{15,20}\b", out.get("text") or "")[:1])
    if not found:
        raise ValueError(f"Could not find the tweet carrying @{user} article {article_id}. Pass --tweet-id")

    return found


# #
# fetch

def fetch(*, user: str, tweet_id: str) -> dict:
    request = urllib.request.Request(
        f"https://api.fxtwitter.com/{user}/status/{tweet_id}",
        headers={"User-Agent": "personal-lab document mirror"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))["tweet"]


# #
# render

def inline(*, block: dict, entities: dict) -> str:
    units = block["text"].encode("utf-16-le")
    n = len(units) // 2
    opens, closes = [[] for _ in range(n + 1)], [[] for _ in range(n + 1)]
    for style in block["inlineStyleRanges"]:
        mark = MARK.get(style["style"], "")
        opens[style["offset"]].append(mark)
        closes[style["offset"] + style["length"]].insert(0, mark)
    for span in block["entityRanges"]:
        entity = entities[str(span["key"])]
        if entity["type"] == "LINK":
            opens[span["offset"]].insert(0, "[")
            closes[span["offset"] + span["length"]].append(f"]({entity['data']['url']})")
    out = bytearray()
    for i in range(n + 1):
        out += "".join(closes[i] + opens[i]).encode("utf-16-le")
        if i < n:
            out += units[2 * i:2 * i + 2]

    return out.decode("utf-16-le")


def atomic(*, block: dict, entities: dict, media: dict) -> str:
    parts = []
    for span in block["entityRanges"]:
        entity = entities[str(span["key"])]
        if entity["type"] == "MARKDOWN":
            parts.append(entity["data"]["markdown"])
        elif entity["type"] == "DIVIDER":
            parts.append("---")
        elif entity["type"] == "MEDIA":
            caption = entity["data"].get("caption", "")
            for item in entity["data"]["mediaItems"]:
                parts.append(f"![{caption}]({media.get(item['mediaId'], '')})")
        else:
            parts.append(f"<!-- unconverted block: {entity['type']} -->")

    return "\n\n".join(parts)


def render(*, article: dict) -> str:
    content = article["content"]
    entities = {e["key"]: e["value"] for e in content["entityMap"]}
    media = {m["media_id"]: m["media_info"].get("original_img_url", "")
             for m in article.get("media_entities") or []}
    out, prev = [], None
    for block in content["blocks"]:
        if block["type"] == "atomic":
            text = atomic(block=block, entities=entities, media=media)
        elif block["text"].strip():
            text = PREFIX.get(block["type"], "") + inline(block=block, entities=entities)
        else:
            continue
        tight = prev == block["type"] and block["type"].endswith("list-item")
        out.append(("\n" if tight else "\n\n") + text)
        prev = block["type"]

    return "".join(out).strip() + "\n"


# #
# verify

def verify(*, source: str, translated: str) -> None:
    original = source.split("\n\n", 1)
    parts = translated.split("\n\n", 1)
    if len(parts) < 2 or parts[0] != original[0]:
        raise ValueError("The title line differs from the original")
    problem = mismatch(source=original[1], translated=parts[1])
    if problem:
        raise ValueError(f"Block structure differs from the original: {problem}")


def blocks(*, text: str) -> list[str]:
    return [b for b in re.split(r"\n\s*\n", text.strip()) if b.strip()]


def kind(*, block: str) -> str:
    for name, prefix in [("heading", "#"), ("quote", ">"), ("image", "!["), ("table", "|"),
                         ("ordered", "1. "), ("bullet", "- "), ("comment", "<!--"), ("rule", "---")]:
        if block.lstrip().startswith(prefix):
            return name

    return "paragraph"


def mismatch(*, source: str, translated: str) -> str | None:
    a, b = blocks(text=source), blocks(text=translated)
    if len(a) != len(b):
        return f"block count {len(a)} != {len(b)}"
    for i, (x, y) in enumerate(zip(a, b)):
        if kind(block=x) != kind(block=y):
            return f"block {i} kind {kind(block=x)} != {kind(block=y)}"
    urls = lambda s: re.findall(r"\]\(([^)]*)\)", s)
    if urls(source) != urls(translated):
        return "link or image URLs changed"

    return None

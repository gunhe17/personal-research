from __future__ import annotations

import json
import re
import subprocess
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

import store

URL = re.compile(r"^https?://(?:www\.)?(?:x|twitter)\.com/(\w+)/article/(\d+)/?$")
PREFIX = {"header-one": "## ", "header-two": "### ", "header-three": "#### ",
          "blockquote": "> ", "unordered-list-item": "- ", "ordered-list-item": "1. "}
MARK = {"Bold": "**", "Italic": "*"}


# #
# get

def get(*, url: str, tweet_id: str | None = None) -> store.Document:
    matched = URL.match(url.strip())
    if not matched:
        raise ValueError(f"X 아티클 URL 이 아니다: {url}")
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
    if given not in (article.get("id"), tweet_id):
        raise ValueError(f"트윗 {tweet_id} 에 이 아티클이 없다: {article.get('id')}")
    document = store.Document(
        rel=f"docs/x/{user}/article/{store.slugify(title=article['title'])}.md",
        body=f"# {article['title']}\n\n" + render(article=article),
        fields={
            "source": f"https://x.com/{user}/article/{article['id']}",
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
        raise RuntimeError(f"grok 실패: {done.stderr.strip()[-500:]}")

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
        raise ValueError(f"grok 이 @{user} 의 아티클 {article_id} 를 담은 트윗을 찾지 못했다. --tweet-id 로 직접 준다")

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
            parts.append(f"<!-- 변환 안 된 블록: {entity['type']} -->")

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
        raise ValueError("제목 줄이 원문과 다르다")
    problem = mismatch(source=original[1], translated=parts[1])
    if problem:
        raise ValueError(f"번역 구조가 원문과 다르다: {problem}")


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
        return f"블록 수 {len(a)} ≠ {len(b)}"
    for i, (x, y) in enumerate(zip(a, b)):
        if kind(block=x) != kind(block=y):
            return f"{i}번 블록 종류 {kind(block=x)} ≠ {kind(block=y)}"
    urls = lambda s: re.findall(r"\]\(([^)]*)\)", s)
    if urls(source) != urls(translated):
        return "링크·이미지 URL 이 달라졌다"

    return None

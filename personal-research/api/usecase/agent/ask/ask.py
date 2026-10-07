from __future__ import annotations

import json
import re
import subprocess
from typing import Callable

from usecase.collected.search import search
from usecase.common import store
from usecase.conversation.converse import converse


# #
# ask

ASK_SYSTEM = (
    "당신은 수집된 문서를 근거로 답하는 조사 에이전트입니다. "
    "아래 검색 결과에 없는 내용은 추측하지 말고 모른다고 하세요. "
    "쉬운 한국어로 답하고, 핵심 용어는 영문을 병기하세요. "
    "근거로 삼은 문서는 답변 끝에 경로로 적으세요."
)
TERM_PROMPT = (
    "You pick search keywords for a full-text search over a mirrored corpus of English "
    "AI and agent documentation. Given the user's question, answer with 2 to 4 English "
    "keywords or exact phrases that would appear verbatim in the relevant documents. "
    "Prefer technical nouns over common words.\n\nQuestion: "
)


def run(*, question: str, send: Callable[[dict], None]) -> None:
    send({"type": "start", "backend": converse.BACKEND, "bin": converse.binary()})
    picked = search_terms(question=question)
    terms, found = widen(terms=picked)
    send({"type": "terms", "terms": terms, "picked": picked})
    send({"type": "hits", "hits": [
        {"id": f["id"], "path": f["path"], "url": f["url"], "hits": f["hits"]} for f in found
    ]})
    if not found:
        send({"type": "done", "text": "수집물에서 관련 문서를 찾지 못했습니다.", "exit_code": 0})
        return
    converse.stream(
        body={
            "system": ASK_SYSTEM,
            "document": passages(found=found),
            "path": "수집물 검색 결과",
            "messages": [{"role": "user", "content": question}],
        },
        send=send,
    )


def widen(*, terms: list[str]) -> tuple[list[str], list[dict]]:
    for count in range(len(terms), 0, -1):
        narrowed = terms[:count]
        found = search.run(terms=narrowed, limit=6)
        if found:
            return narrowed, found
    for single in terms:
        found = search.run(terms=[single], limit=6)
        if found:
            return [single], found

    return terms[:1], []


def search_terms(*, question: str) -> list[str]:
    try:
        out = structured(
            question=question,
            schema={"type": "object", "properties": {
                "keywords": {"type": "array", "items": {"type": "string"}}}, "required": ["keywords"]},
        )
        picked = [t for t in (out.get("keywords") or []) if isinstance(t, str) and t.strip()]
    except (RuntimeError, ValueError, json.JSONDecodeError, subprocess.SubprocessError):
        picked = []

    return picked[:4] or search.keywords(question=question) or [question.strip()[:40]]


def structured(*, question: str, schema: dict) -> dict:
    if converse.BACKEND == "claude":
        done = subprocess.run(
            [converse.binary(), "-p", TERM_PROMPT + question + "\n\nAnswer with JSON only: " + json.dumps(schema),
             "--output-format", "json", "--disallowed-tools", converse.DISALLOWED, "--max-turns", "1"],
            capture_output=True, text=True, timeout=120,
        )
        if done.returncode != 0:
            raise RuntimeError(done.stderr.strip()[-300:])
        answer = json.loads(done.stdout).get("result") or ""
        matched = re.search(r"\{.*\}", answer, re.S)

        return json.loads(matched.group(0)) if matched else {}

    done = subprocess.run(
        [converse.binary(), "-p", TERM_PROMPT + question,
         "--output-format", "json", "--no-subagents",
         "--disallowed-tools", converse.DISALLOWED,
         "--json-schema", json.dumps(schema)],
        capture_output=True, text=True, timeout=120,
    )
    if done.returncode != 0:
        raise RuntimeError(done.stderr.strip()[-300:])

    return json.loads(done.stdout).get("structuredOutput") or {}


def passages(*, found: list[dict]) -> str:
    blocks = []
    for index, item in enumerate(found, 1):
        body = store.read(id=item["id"], language=item["language"])
        blocks.append(
            f"[문서 {index}] {item['path']}\n출처 {item['url']}\n\n{body[:converse.LIMIT // max(1, len(found))]}"
        )

    return "\n\n-----\n\n".join(blocks)

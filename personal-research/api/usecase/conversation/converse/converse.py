from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import threading
from pathlib import Path
from typing import Callable

from usecase.collected.search import search
from usecase.common import store

BACKEND = (os.environ.get("CHAT_BACKEND") or "grok").strip().lower()
BIN = os.environ.get("GROK_BIN") or shutil.which("grok") or str(Path.home() / ".grok" / "bin" / "grok")
CLAUDE = os.environ.get("CLAUDE_BIN") or shutil.which("claude") or str(Path.home() / ".local" / "bin" / "claude")
MODEL = os.environ.get("GROK_MODEL") or ""
DISALLOWED = "run_terminal_cmd,read_file,grep,list_dir,search_replace,write_file,web_search,web_fetch,Agent,Bash,Read,Write,Edit,Glob,Grep,Task,WebFetch,WebSearch"
LIMIT = 120_000
SYSTEM = (
    "당신은 수집된 문서를 근거로 답하는 학습 에이전트입니다. "
    "문서와 인용에 없는 내용은 추측하지 마세요. 쉬운 한국어, 핵심 용어는 영문 병기."
)
INSTRUCTION = (
    "\n### Instruction\n"
    "위 대화의 마지막 User 질문에 Assistant로서 답하세요. "
    "도구/파일 탐색 없이, 제공된 문서·인용만으로 답하는 것을 우선하세요. "
    "답변 본문만 출력하세요.\n"
)


def binary() -> str:
    chosen = CLAUDE if BACKEND == "claude" else BIN

    return chosen if Path(chosen).is_file() else BACKEND


def available() -> bool:
    return Path(CLAUDE if BACKEND == "claude" else BIN).is_file() or bool(shutil.which(BACKEND))


# #
# stream

def stream(*, body: dict, send: Callable[[dict], None]) -> None:
    send({"type": "start", "backend": BACKEND, "bin": binary()})
    parts: list[str] = []
    final = ""
    process = subprocess.Popen(
        command(body=body),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=0,
        env={**os.environ, "PATH": str(Path.home() / ".grok" / "bin") + ":" + os.environ.get("PATH", "")},
    )
    errors: list[bytes] = []
    drain = threading.Thread(target=collect_stderr, args=(process, errors), daemon=True)
    drain.start()
    try:
        for line in lines(stream=process.stdout):
            event = parse(line=line)
            if event is None:
                continue
            kind = event.get("type")
            if kind == "stream_event":
                text = delta(event=event.get("event") or {})
                if text:
                    parts.append(text)
                    send({"type": "delta", "text": text})
            elif kind == "assistant":
                final = spoken(message=event.get("message") or {}) or final
            elif kind == "result":
                final = (event.get("result") or final or "".join(parts)) if not event.get("is_error") else (final or "".join(parts))
                break
    finally:
        halt(process=process)
        drain.join(timeout=1)
    code = process.poll()
    text = final or "".join(parts)
    if not text and code not in (0, None):
        send({"type": "error", "error": f"grok exited {code}", "stderr": b"".join(errors).decode("utf-8", "replace")[-2000:]})
        return
    send({"type": "done", "text": text, "exit_code": code if code is not None else -1})


def command(*, body: dict) -> list[str]:
    turns = body.get("max_turns") or 1
    try:
        turns = max(1, min(int(turns), 8))
    except (TypeError, ValueError):
        turns = 1
    if BACKEND == "claude":
        return [
            binary(), "-p", prompt(body=body),
            "--output-format", "stream-json", "--include-partial-messages", "--verbose",
            "--disallowed-tools", DISALLOWED,
            "--max-turns", str(turns),
        ]
    model = (body.get("model") or MODEL).strip()
    built = [
        binary(), "-p", prompt(body=body),
        "--output-format", "streaming-messages-json",
        "--include-partial-messages",
        "--no-subagents",
        "--disallowed-tools", DISALLOWED,
        "--max-turns", str(turns),
        "--cwd", str(store.API),
        "--verbatim",
    ]

    return built + (["-m", model] if model else [])


def lines(*, stream):
    buffer = b""
    while True:
        chunk = stream.read(4096)
        if not chunk:
            break
        buffer += chunk
        while b"\n" in buffer:
            raw, buffer = buffer.split(b"\n", 1)
            yield raw.decode("utf-8", errors="replace")


def parse(*, line: str) -> dict | None:
    try:
        event = json.loads(line.strip()) if line.strip() else None
    except json.JSONDecodeError:
        return None

    return event if isinstance(event, dict) else None


def delta(*, event: dict) -> str:
    if event.get("type") != "content_block_delta":
        return ""
    change = event.get("delta") or {}

    return change.get("text") or "" if change.get("type") == "text_delta" else ""


def spoken(*, message: dict) -> str:
    return "".join(
        block.get("text") or ""
        for block in message.get("content") or []
        if isinstance(block, dict) and block.get("type") == "text"
    )


def collect_stderr(process, errors: list[bytes]) -> None:
    if process.stderr is None:
        return
    while True:
        chunk = process.stderr.read(4096)
        if not chunk:
            break
        errors.append(chunk)


def halt(*, process) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=3)
    except subprocess.TimeoutExpired:
        process.kill()


# #
# prompt

def prompt(*, body: dict) -> str:
    document = body.get("document") or ""
    if isinstance(document, str) and len(document) > LIMIT:
        document = document[:LIMIT] + "\n\n…(truncated)…"
    path = (body.get("path") or "").strip()
    parts = [(body.get("system") or "").strip() or SYSTEM]
    if path or document:
        parts.append(f"\n현재 문서 경로: {path or '(없음)'}")
        parts.append("\n----- 문서 본문 -----\n")
        parts.append(document or "(비어 있음)")
        parts.append("\n----- 문서 끝 -----\n")
    for message in body.get("messages") or []:
        if not isinstance(message, dict):
            continue
        content = (message.get("content") or "").strip()
        if not content:
            continue
        if message.get("role") == "user":
            parts.append(f"\n### User\n{quoted(message=message, content=content)}\n")
        elif message.get("role") == "assistant":
            parts.append(f"\n### Assistant\n{content}\n")
    parts.append(INSTRUCTION)

    return "".join(parts)


def quoted(*, message: dict, content: str) -> str:
    blocks = [
        f"[인용 {i} | {c.get('path') or ''}]\n\"\"\"\n{c.get('text') or ''}\n\"\"\""
        for i, c in enumerate(message.get("citations") or [], 1)
        if isinstance(c, dict)
    ]

    return "\n\n".join(blocks) + "\n\n질문:\n" + content if blocks else content


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


def ask(*, question: str, send: Callable[[dict], None]) -> None:
    send({"type": "start", "backend": BACKEND, "bin": binary()})
    picked = search_terms(question=question)
    terms, found = widen(terms=picked)
    send({"type": "terms", "terms": terms, "picked": picked})
    send({"type": "hits", "hits": [
        {"id": f["id"], "path": f["path"], "url": f["url"], "hits": f["hits"]} for f in found
    ]})
    if not found:
        send({"type": "done", "text": "수집물에서 관련 문서를 찾지 못했습니다.", "exit_code": 0})
        return
    stream(
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
    if BACKEND == "claude":
        done = subprocess.run(
            [binary(), "-p", TERM_PROMPT + question + "\n\nAnswer with JSON only: " + json.dumps(schema),
             "--output-format", "json", "--disallowed-tools", DISALLOWED, "--max-turns", "1"],
            capture_output=True, text=True, timeout=120,
        )
        if done.returncode != 0:
            raise RuntimeError(done.stderr.strip()[-300:])
        answer = json.loads(done.stdout).get("result") or ""
        matched = re.search(r"\{.*\}", answer, re.S)

        return json.loads(matched.group(0)) if matched else {}

    done = subprocess.run(
        [binary(), "-p", TERM_PROMPT + question,
         "--output-format", "json", "--no-subagents",
         "--disallowed-tools", DISALLOWED,
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
            f"[문서 {index}] {item['path']}\n출처 {item['url']}\n\n{body[:LIMIT // max(1, len(found))]}"
        )

    return "\n\n-----\n\n".join(blocks)

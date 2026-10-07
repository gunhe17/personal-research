from __future__ import annotations

import json
import os
import shutil
import subprocess
import threading
from pathlib import Path
from typing import Callable

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

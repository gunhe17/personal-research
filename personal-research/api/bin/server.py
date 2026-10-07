#!/usr/bin/env python3
from __future__ import annotations

import json
import mimetypes
import os
import re
import sys
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from usecase.common import log
from usecase.common import store

from usecase.conversation.converse import converse
from usecase.conversation.record import record
from usecase.space.record import record as spaces
from usecase.collected.collect import pipeline
from usecase.collected.read import read
from usecase.collected.search import search

VIEWER = store.API.parent / "wui" / "bin"
HOST = os.environ.get("HOST") or "127.0.0.1"
PORT = int(os.environ.get("PORT") or 8765)
SPACE = re.compile(r"/api/spaces/([a-zA-Z0-9_-]+)")
CONVERSATIONS = re.compile(r"/api/(space|agent)/conversations")
CONVERSATION = re.compile(r"/api/(space|agent)/conversations/([a-zA-Z0-9_-]+)(?:/(messages|retry|cancel))?")
INCLUDE = re.compile(r"\{\{include ([\w./-]+)\}\}")


def load_dotenv(*, path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip().removeprefix("export ")
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


# #
# route

class Handler(BaseHTTPRequestHandler):
    server_version = "ResearchViewer/2.0"

    def log_message(self, fmt: str, *args) -> None:
        log.write(level="info", message=f"{self.address_string()} {fmt % args}")

    def log_error(self, fmt: str, *args) -> None:
        log.write(level="error", message=f"{self.address_string()} {fmt % args}")

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path in ("/", "/viewer", "/viewer/"):
            return self.serve(path=VIEWER / "index.html")
        if path.startswith("/viewer/"):
            return self.serve(path=VIEWER / path[len("/viewer/"):])
        if path == "/api/health":
            return self.reply(code=200, payload={
                "ok": True,
                "codex_available": converse.available(),
                "database": str(store.DATABASE),
            })
        if path == "/api/tree":
            return self.reply(code=200, payload={"root": "collected", "tree": read.tree()})
        if path == "/api/raw":
            found = read.document(
                reference=(query.get("id") or [""])[0],
                language=(query.get("language") or ["eng"])[0],
            )
            if found is None:
                return self.send(code=404, data=b"not found", content_type="text/plain; charset=utf-8")
            return self.send(
                code=200,
                data=found["content"].encode("utf-8"),
                content_type=read.content_type(path=found["path"]),
            )
        if path == "/api/file":
            found = read.document(
                reference=(query.get("id") or [""])[0],
                language=(query.get("language") or ["eng"])[0],
            )
            if found is None:
                return self.reply(code=404, payload={"error": "not found"})
            return self.reply(code=200, payload=found)
        if path == "/api/meta":
            found = read.meta(reference=(query.get("id") or [""])[0])
            if found is None:
                return self.reply(code=404, payload={"error": "not found"})
            return self.reply(code=200, payload=found)
        if path == "/api/search":
            terms = [t for t in (query.get("q") or [""])[0].split() if t]
            return self.reply(code=200, payload={"items": search.run(terms=terms)})
        if path == "/api/spaces":
            return self.reply(code=200, payload={"items": spaces.listed()})
        if path == "/api/conversations":
            return self.reply(code=200, payload={"items": record.find(collected_id=(query.get("collected_id") or [""])[0])})
        if CONVERSATIONS.fullmatch(path):
            domain = CONVERSATIONS.fullmatch(path).group(1)
            return self.reply(code=200, payload={"items": record.listed(domain=domain, space_id=(query.get("space_id") or [""])[0])})

        matched = SPACE.fullmatch(path)
        if matched:
            found = spaces.get(id=matched.group(1))
            return self.reply(code=200 if found else 404, payload=found or {"error": "not found"})
        matched = CONVERSATION.fullmatch(path)
        if matched and not matched.group(3):
            found = record.get(domain=matched.group(1), id=matched.group(2))
            if found:
                found["codex_available"] = converse.available()
            return self.reply(code=200 if found else 404, payload=found or {"error": "not found"})

        self.reply(code=404, payload={"error": "not found", "path": path})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        body = self.payload()
        if body is None:
            return self.reply(code=400, payload={"error": "invalid json"})
        if parsed.path == "/api/opened":
            wanted = (body.get("id") or "").strip()
            if not wanted:
                return self.reply(code=400, payload={"error": "id 가 비어 있다"})
            store.touch(id=wanted)
            return self.reply(code=200, payload={"id": wanted})
        try:
            if parsed.path == "/api/spaces":
                return self.reply(code=200, payload=spaces.create(data=body))
            if CONVERSATIONS.fullmatch(parsed.path):
                return self.reply(code=200, payload=self.start(domain=CONVERSATIONS.fullmatch(parsed.path).group(1), body=body))
            matched = CONVERSATION.fullmatch(parsed.path)
            if matched and matched.group(3):
                return self.act(domain=matched.group(1), id=matched.group(2), action=matched.group(3), body=body)
        except (ValueError, KeyError, StopIteration) as error:
            return self.reply(code=400, payload={"error": str(error) or "요청을 처리하지 못했습니다."})
        if parsed.path == "/api/collect":
            given = (body.get("input") or "").strip()
            if not given:
                return self.reply(code=400, payload={"error": "input 이 비어 있다"})
            return self.stream(work=lambda send: collecting(given=given, send=send))

        self.reply(code=404, payload={"error": "not found"})

    def do_PUT(self) -> None:
        path = urlparse(self.path).path
        body = self.payload()
        if body is None:
            return self.reply(code=400, payload={"error": "invalid json"})
        try:
            if SPACE.fullmatch(path):
                return self.reply(code=200, payload=spaces.edit(id=SPACE.fullmatch(path).group(1), data=body))
            matched = CONVERSATION.fullmatch(path)
            if matched and not matched.group(3):
                return self.reply(code=200, payload=record.edit(domain=matched.group(1), id=matched.group(2), data=body))
        except ValueError as error:
            return self.reply(code=404, payload={"error": str(error)})

        self.reply(code=404, payload={"error": "not found"})

    def do_DELETE(self) -> None:
        path = urlparse(self.path).path
        matched = CONVERSATION.fullmatch(path)
        if SPACE.fullmatch(path):
            removed = spaces.remove(id=SPACE.fullmatch(path).group(1))
        elif matched and not matched.group(3):
            removed = record.remove(domain=matched.group(1), id=matched.group(2))
        else:
            return self.reply(code=404, payload={"error": "not found"})

        self.reply(code=200 if removed else 404, payload={"ok": removed})

    # #
    # conversation

    def start(self, *, domain: str, body: dict) -> dict:
        if domain == "space" and not spaces.get(id=body.get("space_id") or ""):
            raise ValueError("space 를 찾을 수 없습니다.")
        started = record.create(domain=domain, data=body)
        if (body.get("question") or "").strip():
            started["question"] = self.ask(domain=domain, id=started["id"], body={"content": body["question"], "client_id": body.get("client_id")})

        return started

    def act(self, *, domain: str, id: str, action: str, body: dict) -> None:
        if not converse.available():
            return self.reply(code=500, payload={"error": "codex CLI 가 없다"})
        if action == "messages":
            return self.reply(code=200, payload=self.ask(domain=domain, id=id, body=body))
        message_id = body.get("message_id") or ""
        if action == "cancel":
            converse.cancel(domain=domain, message_id=message_id)
        elif converse.status(domain=domain, message_id=message_id) in ("failed", "cancelled", "interrupted"):
            converse.submit(domain=domain, id=id, message_id=message_id)

        self.reply(code=200, payload={"ok": True})

    def ask(self, *, domain: str, id: str, body: dict) -> dict:
        question = record.ask(domain=domain, id=id, data=body)
        if question["status"] == "queued":
            converse.submit(domain=domain, id=id, message_id=question["id"])

        return question

    # #
    # chat

    def stream(self, *, work) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.cors()
        self.end_headers()

        def emit(event: dict) -> None:
            self.wfile.write(f"data: {json.dumps(event, ensure_ascii=False)}\n\n".encode("utf-8"))
            self.wfile.flush()

        try:
            work(emit)
        except Exception as error:
            log.write(level="error", message=f"stream {error}")
            emit({"type": "error", "error": str(error)})
        try:
            self.wfile.write(b"data: [DONE]\n\n")
            self.wfile.flush()
        except BrokenPipeError:
            pass

    # #
    # respond

    def payload(self) -> dict | None:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return None

        return body if isinstance(body, dict) else {}

    def cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def reply(self, *, code: int, payload) -> None:
        self.send(
            code=code,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            content_type="application/json; charset=utf-8",
        )

    def send(self, *, code: int, data: bytes, content_type: str, no_store: bool = False) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        if no_store:
            self.send_header("Cache-Control", "no-store, must-revalidate")
        self.cors()
        self.end_headers()
        self.wfile.write(data)

    def serve(self, *, path: Path) -> None:
        path = path.resolve()
        if not path.is_relative_to(VIEWER.resolve()):
            return self.send(code=403, data=b"forbidden", content_type="text/plain; charset=utf-8")
        if path.is_dir():
            path = path / "index.html"
        if not path.is_file() and path.with_suffix(".html").is_file():
            path = path.with_suffix(".html")
        if not path.is_file():
            return self.send(code=404, data=b"not found", content_type="text/plain; charset=utf-8")
        if path.suffix == ".html":
            page = INCLUDE.sub(
                lambda found: (VIEWER / found.group(1)).read_text(encoding="utf-8"),
                path.read_text(encoding="utf-8"),
            )
            return self.send(
                code=200, data=page.encode("utf-8"),
                content_type="text/html; charset=utf-8", no_store=True,
            )
        guessed = {".js": "application/javascript", ".css": "text/css"}.get(path.suffix)
        content_type = f"{guessed}; charset=utf-8" if guessed else (
            mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        )

        self.send(code=200, data=path.read_bytes(), content_type=content_type, no_store=True)


def collecting(*, given: str, send) -> None:
    started = record.create(domain="agent", data={})
    question = record.ask(domain="agent", id=started["id"], data={"content": given, "kind": "collect", "status": "completed"})
    send({"type": "conversation", "domain": "agent", "id": started["id"]})
    outcome = {}

    def forward(event: dict) -> None:
        if event.get("type") in ("done", "error"):
            outcome.update(event)
        send(event)

    try:
        pipeline.run(input=given, send=forward)
    except Exception as error:
        outcome["error"] = str(error)
        raise
    finally:
        if outcome.get("id"):
            record.edit(domain="agent", id=started["id"], data={"collected_id": outcome["id"]})
        record.add(domain="agent", id=started["id"], message={
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "question_id": question["id"],
            "content": outcome.get("text") or outcome.get("error") or "수집을 마치지 못했습니다.",
            "sources": [{"id": outcome["id"], "path": store.path_of(id=outcome["id"])}] if outcome.get("id") else None,
            "created_at": store.now(),
        })


# #
# run

def main() -> None:
    load_dotenv(path=store.API / ".env")
    if not store.DATABASE.is_file():
        raise SystemExit(f"DB 없음: {store.DATABASE} (collect.py migrate 로 만든다)")
    record.recover()
    log.write(level="info", message=f"start {HOST}:{PORT} database={store.DATABASE} codex={converse.BIN}")
    print(f"Open http://{HOST}:{PORT}/viewer/")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()

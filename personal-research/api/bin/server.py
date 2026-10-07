#!/usr/bin/env python3
from __future__ import annotations

import json
import mimetypes
import os
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from usecase.common import log
from usecase.common import store

from usecase.space.converse import converse
from usecase.space.record import record
from usecase.collected.collect import pipeline
from usecase.collected.read import read
from usecase.collected.search import search

VIEWER = store.API.parent / "wui" / "bin"
HOST = os.environ.get("HOST") or "127.0.0.1"
PORT = int(os.environ.get("PORT") or 8765)
SPACE = re.compile(r"/api/spaces/([a-zA-Z0-9_-]+)(?:/(messages|retry|cancel|links))?")
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
        if path == "/api/related":
            wanted = (query.get("id") or [""])[0]
            found = search.related(id=wanted) if wanted else search.recent()
            return self.reply(code=200, payload={"items": found})
        if path == "/api/search":
            terms = [t for t in (query.get("q") or [""])[0].split() if t]
            return self.reply(code=200, payload={"items": search.run(terms=terms)})
        if path == "/api/spaces":
            return self.reply(code=200, payload={"items": record.listed(collected_id=(query.get("collected_id") or [""])[0])})

        matched = SPACE.fullmatch(path)
        if matched and not matched.group(2):
            found = record.get(id=matched.group(1))
            if found:
                found["linked"] = record.linked(id=found["id"])
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
            return self.reply(code=200, payload={
                "id": wanted,
                "related": search.related(id=wanted),
            })
        if parsed.path == "/api/spaces":
            return self.create(body=body)
        matched = SPACE.fullmatch(parsed.path)
        if matched and matched.group(2):
            return self.space(id=matched.group(1), action=matched.group(2), body=body)
        if parsed.path == "/api/collect":
            given = (body.get("input") or "").strip()
            if not given:
                return self.reply(code=400, payload={"error": "input 이 비어 있다"})
            return self.stream(work=lambda send: pipeline.run(input=given, send=linking(space_id=body.get("space_id"), send=send)))

        self.reply(code=404, payload={"error": "not found"})

    def do_PUT(self) -> None:
        matched = SPACE.fullmatch(urlparse(self.path).path)
        body = self.payload()
        if not matched or matched.group(2) or body is None:
            return self.reply(code=400, payload={"error": "bad request"})
        try:
            self.reply(code=200, payload=record.edit(id=matched.group(1), data=body))
        except ValueError as error:
            self.reply(code=404, payload={"error": str(error)})

    def do_DELETE(self) -> None:
        matched = SPACE.fullmatch(urlparse(self.path).path)
        if not matched or matched.group(2):
            return self.reply(code=404, payload={"error": "not found"})
        removed = record.remove(id=matched.group(1))

        self.reply(code=200 if removed else 404, payload={"ok": removed})

    # #
    # space

    def create(self, *, body: dict) -> None:
        try:
            created = record.create(data=body)
            if (body.get("question") or "").strip():
                self.ask(id=created["id"], body={"body": body["question"], "client_id": body.get("client_id")})
        except ValueError as error:
            return self.reply(code=400, payload={"error": str(error)})

        self.reply(code=200, payload=created)

    def space(self, *, id: str, action: str, body: dict) -> None:
        try:
            if action == "links":
                change = record.link if body.get("linked", True) else record.unlink
                change(id=id, collected_id=body.get("collected_id") or "")
                return self.reply(code=200, payload={"linked": record.linked(id=id)})
            if not converse.available():
                return self.reply(code=500, payload={"error": "codex CLI 가 없다"})
            if action == "messages":
                return self.reply(code=200, payload=self.ask(id=id, body=body))
            message_id = body.get("message_id") or ""
            if action == "cancel":
                converse.cancel(id=id, message_id=message_id)
            elif converse.status(id=id, message_id=message_id) in ("failed", "cancelled", "interrupted"):
                converse.submit(id=id, message_id=message_id)
        except (ValueError, StopIteration) as error:
            return self.reply(code=400, payload={"error": str(error) or "질문을 찾을 수 없습니다."})

        self.reply(code=200, payload={"ok": True})

    def ask(self, *, id: str, body: dict) -> dict:
        question = record.ask(id=id, data=body)
        if question["status"] == "queued":
            converse.submit(id=id, message_id=question["id"])

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


def linking(*, space_id, send):
    def forward(event: dict) -> None:
        if space_id and event.get("type") == "done" and event.get("id"):
            record.link(id=space_id, collected_id=event["id"])
        send(event)

    return forward


# #
# run

def main() -> None:
    load_dotenv(path=store.API / ".env")
    if not store.DATABASE.is_file():
        raise SystemExit(f"DB 없음: {store.DATABASE} (collect.py migrate 로 만든다)")
    record.adopt()
    record.recover()
    log.write(level="info", message=f"start {HOST}:{PORT} database={store.DATABASE} codex={converse.BIN}")
    print(f"Open http://{HOST}:{PORT}/viewer/")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()

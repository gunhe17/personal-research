#!/usr/bin/env python3
from __future__ import annotations

import hmac
import json
import os
import re
import sys
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from usecase.common import agent
from usecase.common import log
from usecase.common import store

from usecase.conversation.converse import converse
from usecase.conversation.record import record
from usecase.space.record import record as spaces
from usecase.setting.login import login
from usecase.setting.record import record as setting
from usecase.user.account import account
from usecase.collected.collect import job
from usecase.collected.read import read
from usecase.collected.search import search

HOST = os.environ.get("HOST") or "127.0.0.1"
PORT = int(os.environ.get("PORT") or 8765)
SPACE = re.compile(r"/api/spaces/([a-zA-Z0-9_-]+)")
PUBLIC = {"/api/health", "/api/auth/login"}
SHARED = {"/api/search", "/api/file", "/api/tree"}
MATERIALS = re.compile(r"/api/spaces/([a-zA-Z0-9_-]+)/materials")
MATERIAL = re.compile(r"/api/materials/([a-zA-Z0-9_-]+)")
CONVERSATIONS = re.compile(r"/api/(space|agent)/conversations")
CONVERSATION = re.compile(r"/api/(space|agent)/conversations/([a-zA-Z0-9_-]+)(?:/(messages|retry|cancel))?")


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
    cookie = ""
    account: dict = {}

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
        if not self.identify(path=path, reading=True):
            return
        if path == "/api/auth/me":
            return self.reply(code=200, payload=self.account)
        if path == "/api/users":
            if self.account.get("role") != "admin":
                return self.reply(code=403, payload={"error": "관리자만 볼 수 있습니다."})
            return self.reply(code=200, payload={"items": account.listed()})

        if path == "/api/settings":
            return self.reply(code=200, payload=setting.get())
        if path == "/api/login":
            if not self.trusted():
                return self.reply(code=403, payload={"error": "forbidden"})
            try:
                return self.reply(code=200, payload=login.status(provider=(query.get("provider") or [""])[0], method=(query.get("method") or ["plan_key"])[0]))
            except ValueError as error:
                return self.reply(code=400, payload={"error": str(error)})
        if path == "/api/models":
            return self.reply(code=200, payload=converse.models())
        if path == "/api/collect":
            return self.reply(code=200, payload={"items": job.listed()})
        if path.startswith("/api/collect/"):
            found = job.get(id=path.removeprefix("/api/collect/"))
            if found is None:
                return self.reply(code=404, payload={"error": "not found"})
            return self.reply(code=200, payload=found)
        if path == "/api/skills":
            try:
                return self.reply(code=200, payload={"items": agent.skills()})
            except OSError as error:
                return self.reply(code=502, payload={"error": f"agent 에서 목록을 받지 못했습니다. {error}"})
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
                sandbox=True,
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

        matched = MATERIAL.fullmatch(path)
        if matched:
            found = spaces.material(id=matched.group(1))
            return self.reply(code=200 if found else 404, payload=found or {"error": "not found"})
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
        if not self.identify(path=parsed.path, reading=False):
            return
        if parsed.path == "/api/auth/login":
            if not self.trusted():
                return self.reply(code=403, payload={"error": "forbidden"})
            found = account.verify(email=str(body.get("email") or ""), password=str(body.get("password") or ""))
            if found is None:
                return self.reply(code=401, payload={"error": "이메일이나 비밀번호가 맞지 않습니다."})
            self.cookie = f"session={account.begin(user_id=found['id'])}; Path=/; HttpOnly; SameSite=Lax; Max-Age={account.DAYS * 86400}"
            return self.reply(code=200, payload=found)
        if parsed.path == "/api/users":
            if self.account.get("role") != "admin" or not self.trusted():
                return self.reply(code=403, payload={"error": "관리자만 사용자를 추가할 수 있습니다."})
            try:
                return self.reply(code=200, payload=account.create(email=str(body.get("email") or ""), name=str(body.get("name") or "")))
            except ValueError as error:
                return self.reply(code=400, payload={"error": str(error)})
        if parsed.path == "/api/auth/password":
            if not self.trusted():
                return self.reply(code=403, payload={"error": "forbidden"})
            try:
                account.change(user_id=self.account["id"], password=str(body.get("password") or ""))
            except ValueError as error:
                return self.reply(code=400, payload={"error": str(error)})
            return self.reply(code=200, payload={"ok": True})
        if parsed.path == "/api/auth/logout":
            account.end(token=self.token())
            self.cookie = "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
            return self.reply(code=200, payload={"ok": True})
        if parsed.path == "/api/opened":
            wanted = (body.get("id") or "").strip()
            if not wanted:
                return self.reply(code=400, payload={"error": "id 가 비어 있다"})
            store.touch(id=wanted)
            return self.reply(code=200, payload={"id": wanted})
        if parsed.path == "/api/login":
            if not self.trusted():
                return self.reply(code=403, payload={"error": "forbidden"})
            try:
                provider = body.get("provider") or ""
                method = body.get("method") or "plan_key"
                if body.get("code") is not None:
                    return self.reply(code=200, payload=login.submit(provider=provider, method=method, code=body["code"]))
                return self.reply(code=200, payload=login.start(provider=provider, method=method))
            except (ValueError, RuntimeError) as error:
                return self.reply(code=400, payload={"error": str(error)})
        try:
            if parsed.path == "/api/spaces":
                return self.reply(code=200, payload=spaces.create(data=body))
            if MATERIALS.fullmatch(parsed.path):
                return self.reply(code=200, payload=spaces.save_material(space_id=MATERIALS.fullmatch(parsed.path).group(1), data=body))
            if CONVERSATIONS.fullmatch(parsed.path):
                return self.reply(code=200, payload=self.start(domain=CONVERSATIONS.fullmatch(parsed.path).group(1), body=body))
            matched = CONVERSATION.fullmatch(parsed.path)
            if matched and matched.group(3):
                return self.act(domain=matched.group(1), id=matched.group(2), action=matched.group(3), body=body)
        except (ValueError, KeyError, StopIteration) as error:
            return self.reply(code=400, payload={"error": str(error) or "요청을 처리하지 못했습니다."})
        if parsed.path == "/api/collect":
            if not self.trusted():
                return self.reply(code=403, payload={"error": "forbidden"})
            try:
                return self.reply(code=200, payload=job.start(input=str(body.get("input") or "")))
            except ValueError as error:
                return self.reply(code=400, payload={"error": str(error)})

        self.reply(code=404, payload={"error": "not found"})

    def do_PUT(self) -> None:
        path = urlparse(self.path).path
        if not self.identify(path=path, reading=False):
            return
        body = self.payload()
        if body is None:
            return self.reply(code=400, payload={"error": "invalid json"})
        try:
            if path == "/api/settings":
                if not self.trusted():
                    return self.reply(code=403, payload={"error": "forbidden"})
                return self.reply(code=200, payload=setting.edit(data=body))
            if SPACE.fullmatch(path):
                return self.reply(code=200, payload=spaces.edit(id=SPACE.fullmatch(path).group(1), data=body))
            if MATERIAL.fullmatch(path):
                found = spaces.material(id=MATERIAL.fullmatch(path).group(1))
                if not found:
                    raise ValueError("자료를 찾을 수 없습니다.")
                return self.reply(code=200, payload=spaces.save_material(space_id=found["space_id"], data={**found, **body}, id=found["id"]))
            matched = CONVERSATION.fullmatch(path)
            if matched and not matched.group(3):
                return self.reply(code=200, payload=record.edit(domain=matched.group(1), id=matched.group(2), data=body))
        except ValueError as error:
            return self.reply(code=404, payload={"error": str(error)})

        self.reply(code=404, payload={"error": "not found"})

    def do_DELETE(self) -> None:
        path = urlparse(self.path).path
        if not self.identify(path=path, reading=False):
            return
        if path.startswith("/api/users/"):
            if self.account.get("role") != "admin" or not self.trusted():
                return self.reply(code=403, payload={"error": "관리자만 사용자를 지울 수 있습니다."})
            try:
                account.remove(user_id=path.removeprefix("/api/users/"), by=self.account["id"])
            except ValueError as error:
                return self.reply(code=400, payload={"error": str(error)})
            return self.reply(code=200, payload={"ok": True})
        if path == "/api/login":
            if not self.trusted():
                return self.reply(code=403, payload={"error": "forbidden"})
            asked = parse_qs(urlparse(self.path).query)
            provider = (asked.get("provider") or [""])[0]
            method = (asked.get("method") or ["plan_key"])[0]
            try:
                if asked.get("signout"):
                    return self.reply(code=200, payload=login.signout(provider=provider, method=method))
                login.check(provider=provider, method=method)
                login.cancel(provider=provider, method=method)
            except ValueError as error:
                return self.reply(code=400, payload={"error": str(error)})
            return self.reply(code=200, payload={"ok": True})
        matched = CONVERSATION.fullmatch(path)
        if SPACE.fullmatch(path):
            removed = spaces.remove(id=SPACE.fullmatch(path).group(1))
        elif MATERIAL.fullmatch(path):
            removed = spaces.remove_material(id=MATERIAL.fullmatch(path).group(1))
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
        owned = record.get(domain=domain, id=id)
        if owned is None:
            return self.reply(code=404, payload={"error": "not found"})
        if action != "messages" and not any(m["id"] == body.get("message_id") for m in owned["messages"]):
            return self.reply(code=404, payload={"error": "not found"})
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

    def trusted(self) -> bool:
        origin = self.headers.get("Origin")
        host = self.headers.get("X-Forwarded-Host") or self.headers.get("Host")

        return origin is None or urlparse(origin).netloc == host

    def identify(self, *, path: str, reading: bool) -> bool:
        if path in PUBLIC:
            return True
        if reading and path in SHARED and hmac.compare_digest(self.headers.get("Authorization") or "", f"Bearer {agent.TOKEN}"):
            return True
        found = account.resolve(token=self.token())
        if found is None:
            self.reply(code=401, payload={"error": "로그인이 필요합니다."})
            return False
        store.CURRENT.set(found["id"])
        self.account = found

        return True

    def token(self) -> str:
        jar = SimpleCookie(self.headers.get("Cookie") or "")

        return jar["session"].value if "session" in jar else ""

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

    def send(self, *, code: int, data: bytes, content_type: str, no_store: bool = False, sandbox: bool = False) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        if sandbox:
            self.send_header("Content-Security-Policy", "sandbox allow-scripts allow-popups")
        self.send_header("Content-Length", str(len(data)))
        if no_store:
            self.send_header("Cache-Control", "no-store, must-revalidate")
        if self.cookie:
            self.send_header("Set-Cookie", self.cookie)
        self.cors()
        self.end_headers()
        self.wfile.write(data)


# #
# run

def main() -> None:
    load_dotenv(path=store.API / ".env")
    if not store.DATABASE.is_file():
        raise SystemExit(f"DB 없음: {store.DATABASE} (collect.py migrate 로 만든다)")
    record.recover()
    log.write(level="info", message=f"start {HOST}:{PORT} database={store.DATABASE} codex={converse.BIN}")
    print(f"API http://{HOST}:{PORT}/api/health")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()

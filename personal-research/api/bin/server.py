#!/usr/bin/env python3
from __future__ import annotations

import hmac
import json
import os
import re
import sys
import traceback
from dataclasses import dataclass
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Callable
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from usecase.common import agent
from usecase.common import log
from usecase.common import store
from usecase.common.error import NotFound

from usecase.conversation.converse import converse
from usecase.conversation.record import record as conversations
from usecase.space.record import record as spaces
from usecase.setting.login import login
from usecase.setting.record import record as settings
from usecase.user.account import account
from usecase.collected.collect import job
from usecase.collected.read import read
from usecase.collected.search import search

HOST = os.environ.get("HOST") or "127.0.0.1"
PORT = int(os.environ.get("PORT") or 8765)
ID = store.IDENTIFIER
DOMAIN = "(space|agent)"
CONVERSATION = rf"/api/{DOMAIN}/conversations/({ID})"


# #
# route

@dataclass(frozen=True, kw_only=True)
class Route:
    method: str
    pattern: str
    guard: str
    handle: Callable
    denied: str = "권한이 없습니다."


@dataclass(frozen=True, kw_only=True)
class Request:
    groups: tuple
    query: dict
    body: dict
    account: dict
    token: str


@dataclass(frozen=True, kw_only=True)
class Response:
    payload: object = None
    code: int = 200
    text: str | None = None
    content_type: str = "application/json; charset=utf-8"
    sandbox: bool = False
    cookie: str = ""


ROUTES = [
    Route(method="GET", pattern="/api/health", guard="public", handle=lambda request: health()),
    Route(method="GET", pattern="/api/auth/me", guard="user", handle=lambda request: request.account),
    Route(method="GET", pattern="/api/users", guard="admin", handle=lambda request: {"items": account.listed()}, denied="관리자만 볼 수 있습니다."),
    Route(method="GET", pattern="/api/settings", guard="user", handle=lambda request: settings.get()),
    Route(method="GET", pattern="/api/login", guard="trusted", handle=lambda request: login.status(provider=argument(query=request.query, name="provider"), method=argument(query=request.query, name="method", default="plan_key"))),
    Route(method="GET", pattern="/api/models", guard="user", handle=lambda request: converse.models()),
    Route(method="GET", pattern="/api/collect", guard="user", handle=lambda request: {"items": job.listed()}),
    Route(method="GET", pattern=f"/api/collect/({ID})", guard="user", handle=lambda request: job.get(id=request.groups[0])),
    Route(method="GET", pattern="/api/skills", guard="user", handle=lambda request: skills()),
    Route(method="GET", pattern="/api/tree", guard="shared", handle=lambda request: {"root": "collected", "tree": read.tree()}),
    Route(method="GET", pattern="/api/raw", guard="user", handle=lambda request: raw(request=request)),
    Route(method="GET", pattern="/api/file", guard="shared", handle=lambda request: read.document(reference=argument(query=request.query, name="id"), language=argument(query=request.query, name="language", default="eng"))),
    Route(method="GET", pattern="/api/meta", guard="user", handle=lambda request: read.meta(reference=argument(query=request.query, name="id"))),
    Route(method="GET", pattern="/api/search", guard="shared", handle=lambda request: {"items": search.run(terms=argument(query=request.query, name="q").split())}),
    Route(method="GET", pattern="/api/spaces", guard="user", handle=lambda request: {"items": spaces.listed()}),
    Route(method="GET", pattern="/api/conversations", guard="user", handle=lambda request: {"items": conversations.by_collected(collected_id=argument(query=request.query, name="collected_id"))}),
    Route(method="GET", pattern=f"/api/{DOMAIN}/conversations", guard="user", handle=lambda request: {"items": conversations.listed(domain=request.groups[0], space_id=argument(query=request.query, name="space_id"))}),
    Route(method="GET", pattern=f"/api/materials/({ID})", guard="user", handle=lambda request: spaces.get_material(id=request.groups[0])),
    Route(method="GET", pattern=f"/api/spaces/({ID})", guard="user", handle=lambda request: spaces.get(id=request.groups[0])),
    Route(method="GET", pattern=CONVERSATION, guard="user", handle=lambda request: converse.get(domain=request.groups[0], id=request.groups[1])),
    Route(method="POST", pattern="/api/auth/login", guard="public", handle=lambda request: signin(request=request)),
    Route(method="POST", pattern="/api/users", guard="admin", handle=lambda request: account.create(email=str(request.body.get("email") or ""), name=str(request.body.get("name") or "")), denied="관리자만 사용자를 추가할 수 있습니다."),
    Route(method="POST", pattern="/api/auth/password", guard="trusted", handle=lambda request: password(request=request)),
    Route(method="POST", pattern="/api/auth/logout", guard="trusted", handle=lambda request: signout(request=request)),
    Route(method="POST", pattern="/api/opened", guard="trusted", handle=lambda request: opened(request=request)),
    Route(method="POST", pattern="/api/login", guard="trusted", handle=lambda request: provider_login(request=request)),
    Route(method="POST", pattern="/api/collect", guard="trusted", handle=lambda request: job.start(input=str(request.body.get("input") or ""))),
    Route(method="POST", pattern="/api/spaces", guard="trusted", handle=lambda request: spaces.create(data=request.body)),
    Route(method="POST", pattern=f"/api/spaces/({ID})/materials", guard="trusted", handle=lambda request: spaces.create_material(space_id=request.groups[0], data=request.body)),
    Route(method="POST", pattern=f"/api/{DOMAIN}/conversations", guard="trusted", handle=lambda request: converse.open(domain=request.groups[0], data=request.body)),
    Route(method="POST", pattern=f"{CONVERSATION}/messages", guard="trusted", handle=lambda request: converse.ask(domain=request.groups[0], id=request.groups[1], data=request.body)),
    Route(method="POST", pattern=f"{CONVERSATION}/retry", guard="trusted", handle=lambda request: converse.retry(domain=request.groups[0], id=request.groups[1], message_id=str(request.body.get("message_id") or ""))),
    Route(method="POST", pattern=f"{CONVERSATION}/cancel", guard="trusted", handle=lambda request: converse.cancel(domain=request.groups[0], id=request.groups[1], message_id=str(request.body.get("message_id") or ""))),
    Route(method="PUT", pattern="/api/settings", guard="trusted", handle=lambda request: settings.edit(data=request.body)),
    Route(method="PUT", pattern=f"/api/spaces/({ID})", guard="trusted", handle=lambda request: spaces.edit(id=request.groups[0], data=request.body)),
    Route(method="PUT", pattern=f"/api/materials/({ID})", guard="trusted", handle=lambda request: spaces.edit_material(id=request.groups[0], data=request.body)),
    Route(method="PUT", pattern=CONVERSATION, guard="trusted", handle=lambda request: conversations.edit(domain=request.groups[0], id=request.groups[1], data=request.body)),
    Route(method="DELETE", pattern=f"/api/users/({ID})", guard="admin", handle=lambda request: remove_user(request=request), denied="관리자만 사용자를 지울 수 있습니다."),
    Route(method="DELETE", pattern="/api/login", guard="trusted", handle=lambda request: provider_logout(request=request)),
    Route(method="DELETE", pattern=f"/api/spaces/({ID})", guard="trusted", handle=lambda request: removed(ok=spaces.remove(id=request.groups[0]))),
    Route(method="DELETE", pattern=f"/api/materials/({ID})", guard="trusted", handle=lambda request: removed(ok=spaces.remove_material(id=request.groups[0]))),
    Route(method="DELETE", pattern=CONVERSATION, guard="trusted", handle=lambda request: removed(ok=conversations.remove(domain=request.groups[0], id=request.groups[1]))),
]


def argument(*, query: dict, name: str, default: str = "") -> str:
    return (query.get(name) or [default])[0]


# #
# dispatch

def answer(*, method: str, target: str, headers, read_body: Callable) -> Response:
    parsed = urlparse(target)
    route, groups = matched(method=method, path=parsed.path)
    if route is None:
        missing = {"error": "찾을 수 없습니다."}
        if method == "GET":
            missing["path"] = parsed.path
        return Response(code=404, payload=missing)
    admitted = admit(route=route, method=method, headers=headers)
    if isinstance(admitted, Response):
        return admitted
    body = read_body() if method != "GET" else {}
    if body is None:
        return Response(code=400, payload={"error": "JSON 이 올바르지 않습니다."})
    request = Request(groups=groups, query=parse_qs(parsed.query), body=body, account=admitted, token=token(headers=headers))
    try:
        result = route.handle(request=request)
    except NotFound as error:
        return Response(code=404, payload={"error": str(error) or "찾을 수 없습니다."})
    except (ValueError, RuntimeError, KeyError, StopIteration) as error:
        return Response(code=400, payload={"error": str(error) or "요청을 처리하지 못했습니다."})
    except Exception:
        log.write(level="error", message=f"{method} {parsed.path} {traceback.format_exc()}")
        return Response(code=500, payload={"error": "서버 오류가 났습니다."})
    if result is None:
        return Response(code=404, payload={"error": "찾을 수 없습니다."})
    if isinstance(result, Response):
        return result

    return Response(payload=result)


def matched(*, method: str, path: str) -> tuple[Route | None, tuple]:
    for route in ROUTES:
        found = re.fullmatch(route.pattern, path)
        if found and route.method == method:
            return route, found.groups()

    return None, ()


def admit(*, route: Route, method: str, headers) -> dict | Response:
    if route.guard == "public":
        found = {}
    elif route.guard == "shared" and method == "GET" and hmac.compare_digest(headers.get("Authorization") or "", f"Bearer {agent.TOKEN}"):
        return {}
    else:
        found = account.resolve(token=token(headers=headers))
        if found is None:
            return Response(code=401, payload={"error": "로그인이 필요합니다."})
        store.CURRENT.set(found["id"])
    if route.guard == "admin" and (found.get("role") != "admin" or not trusted(headers=headers)):
        return Response(code=403, payload={"error": route.denied})
    if (route.guard == "trusted" or method != "GET") and not trusted(headers=headers):
        return Response(code=403, payload={"error": route.denied})

    return found


def trusted(*, headers) -> bool:
    origin = headers.get("Origin")
    host = headers.get("X-Forwarded-Host") or headers.get("Host")

    return origin is None or urlparse(origin).netloc == host


def token(*, headers) -> str:
    jar = SimpleCookie(headers.get("Cookie") or "")

    return jar["session"].value if "session" in jar else ""


# #
# handle

def health() -> dict:
    return {
        "ok": True,
        "codex_available": converse.available(),
        "database": str(store.DATABASE),
    }


def skills() -> dict | Response:
    try:
        return {"items": agent.skills()}
    except OSError as error:
        return Response(code=502, payload={"error": f"agent 에서 목록을 받지 못했습니다. {error}"})


def raw(*, request: Request) -> Response:
    found = read.document(
        reference=argument(query=request.query, name="id"),
        language=argument(query=request.query, name="language", default="eng"),
    )
    if found is None:
        return Response(code=404, text="찾을 수 없습니다.", content_type="text/plain; charset=utf-8")

    return Response(
        text=found["content"],
        content_type=read.content_type(path=found["path"]),
        sandbox=True,
    )


def signin(*, request: Request) -> Response:
    found = account.verify(email=str(request.body.get("email") or ""), password=str(request.body.get("password") or ""))
    if found is None:
        return Response(code=401, payload={"error": "이메일이나 비밀번호가 맞지 않습니다."})
    session = account.open_session(user_id=found["id"])

    return Response(
        payload=found,
        cookie=f"session={session}; Path=/; HttpOnly; SameSite=Lax; Max-Age={account.DAYS * 86400}",
    )


def signout(*, request: Request) -> Response:
    account.close_session(token=request.token)

    return Response(
        payload={"ok": True},
        cookie="session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    )


def password(*, request: Request) -> dict:
    account.change_password(user_id=request.account["id"], password=str(request.body.get("password") or ""))

    return {"ok": True}


def remove_user(*, request: Request) -> dict:
    account.remove(user_id=request.groups[0], by=request.account["id"])

    return {"ok": True}


def opened(*, request: Request) -> dict:
    wanted = (request.body.get("id") or "").strip()
    if not wanted:
        raise ValueError("id 가 비어 있습니다.")
    store.touch(id=wanted)

    return {"id": wanted}


def provider_login(*, request: Request) -> dict:
    provider = request.body.get("provider") or ""
    method = request.body.get("method") or "plan_key"
    if request.body.get("code") is not None:
        return login.submit(provider=provider, method=method, code=request.body["code"])

    return login.start(provider=provider, method=method)


def provider_logout(*, request: Request) -> dict:
    provider = argument(query=request.query, name="provider")
    method = argument(query=request.query, name="method", default="plan_key")
    if request.query.get("signout"):
        return login.signout(provider=provider, method=method)
    login.check(provider=provider, method=method)
    login.cancel(provider=provider, method=method)

    return {"ok": True}


def removed(*, ok: bool) -> Response:
    return Response(code=200 if ok else 404, payload={"ok": ok})


# #
# server

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
        self.dispatch(method="GET")

    def do_POST(self) -> None:
        self.dispatch(method="POST")

    def do_PUT(self) -> None:
        self.dispatch(method="PUT")

    def do_DELETE(self) -> None:
        self.dispatch(method="DELETE")

    def dispatch(self, *, method: str) -> None:
        store.CURRENT.set(None)
        response = answer(method=method, target=self.path, headers=self.headers, read_body=self.body)
        self.send(response=response)

    def body(self) -> dict | None:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            parsed = json.loads(raw.decode("utf-8") or "{}")
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None

        return parsed if isinstance(parsed, dict) else {}

    def cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def send(self, *, response: Response) -> None:
        data = (
            response.text if response.text is not None else json.dumps(response.payload, ensure_ascii=False)
        ).encode("utf-8")
        self.send_response(response.code)
        self.send_header("Content-Type", response.content_type)
        if response.sandbox:
            self.send_header("Content-Security-Policy", "sandbox allow-scripts allow-popups")
        self.send_header("Content-Length", str(len(data)))
        if response.cookie:
            self.send_header("Set-Cookie", response.cookie)
        self.cors()
        self.end_headers()
        self.wfile.write(data)


# #
# run

def main() -> None:
    load_dotenv(path=store.API / ".env")
    if not store.DATABASE.is_file():
        raise SystemExit(f"DB 없음: {store.DATABASE}")
    conversations.recover()
    log.write(level="info", message=f"start {HOST}:{PORT} database={store.DATABASE} codex={converse.BIN}")
    print(f"API http://{HOST}:{PORT}/api/health")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


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
# check

def check() -> None:
    cases = {
        ("GET", "/api/health"): ("public", ()),
        ("GET", "/api/tree"): ("shared", ()),
        ("GET", "/api/users"): ("admin", ()),
        ("GET", "/api/spaces/abc"): ("user", ("abc",)),
        ("PUT", "/api/spaces/abc"): ("trusted", ("abc",)),
        ("POST", "/api/spaces/abc/materials"): ("trusted", ("abc",)),
        ("POST", "/api/agent/conversations/c1/retry"): ("trusted", ("agent", "c1")),
        ("DELETE", "/api/users/u1"): ("admin", ("u1",)),
    }
    for (method, path), (guard, groups) in cases.items():
        route, found = matched(method=method, path=path)
        assert route is not None and (route.guard, found) == (guard, groups), (method, path)
    assert matched(method="PATCH", path="/api/spaces")[0] is None
    assert matched(method="GET", path="/api/spaces/a/b")[0] is None
    assert all(r.guard in ("public", "trusted", "admin") for r in ROUTES if r.method != "GET")
    unread = lambda: (_ for _ in ()).throw(AssertionError("body read"))
    assert answer(method="GET", target="/api/nope", headers={}, read_body=unread).code == 404
    assert answer(method="POST", target="/api/spaces", headers={}, read_body=unread).code == 401
    assert answer(method="POST", target="/api/auth/login", headers={"Origin": "http://evil", "Host": "a"}, read_body=unread).code == 403
    assert answer(method="GET", target="/api/spaces", headers={"Authorization": f"Bearer {agent.TOKEN}"}, read_body=unread).code == 401
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["check"]:
        check()
    else:
        main()

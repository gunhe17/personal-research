from __future__ import annotations

import fcntl
import json
import os
import pty
import re
import signal
import struct
import subprocess
import termios
import contextvars
import threading
import time
from pathlib import Path

from usecase.common import agent
from usecase.common import store
from usecase.setting.record import record as setting

STARTS = {
    "openai": ["login", "--device-auth"],
    "anthropic": ["setup-token"],
    "xai": ["login", "--device-auth"],
}
ESCAPE = re.compile(r"\x1b\[[0-9;?<>=]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-_]")
URL = re.compile(r"https://\S+")
CODE = re.compile(r"\b[A-Z0-9]{4}-[A-Z0-9]{4,5}\b")
TOKEN = re.compile(r"sk-ant-oat\d+-[A-Za-z0-9_\-]+")
PENDING: dict[tuple[str, str, str], dict] = {}
LOCK = threading.Lock()
EXPIRES = 900


# #
# query

def status(*, provider: str, method: str) -> dict:
    check(provider=provider, method=method)
    found = signed(provider=provider, method=method)
    with LOCK:
        pending = PENDING.get((store.user(), provider, method))
        if pending and pending["process"].poll() is not None:
            finish(provider=provider, method=method)
            pending = None

    return {
        **found,
        "pending": (
            {k: pending[k] for k in ("url", "code", "needs_code", "error")} if pending else None
        ),
    }


def signed(*, provider: str, method: str) -> dict:
    environment = setting.environment(provider=provider, method=method)
    if provider == "anthropic" and "CLAUDE_CODE_OAUTH_TOKEN" not in environment:
        return {"logged_in": False, "detail": ""}
    executable = agent.binary(runner=setting.RUNNERS[provider])
    command = {
        "openai": [executable, "login", "status"],
        "anthropic": [executable, "auth", "status"],
        "xai": [executable, "models"],
    }[provider]
    try:
        done = subprocess.run(command, capture_output=True, text=True, timeout=20, env=environment, stdin=subprocess.DEVNULL)
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"logged_in": False, "detail": f"{Path(command[0]).name} 를 실행하지 못했습니다. {error}"[:200]}
    setting.sync(provider=provider, method=method)
    output = clean(text=done.stdout + done.stderr).strip()
    first = output.splitlines()[0] if output else ""
    if provider == "anthropic":
        try:
            parsed = json.loads(done.stdout)
        except json.JSONDecodeError:
            parsed = {}
        return {"logged_in": bool(parsed.get("loggedIn")), "detail": (parsed.get("email") or parsed.get("authMethod") or "") if parsed.get("loggedIn") else ""}
    if provider == "openai":
        return {"logged_in": done.returncode == 0 and "Logged in" in output, "detail": first.removeprefix("Logged in using ").strip()}
    via = re.search(r"logged in with (\S+?)\.?$", first, re.IGNORECASE)

    return {"logged_in": "logged in" in first.lower(), "detail": via.group(1) if via else ""}


# #
# command

def start(*, provider: str, method: str) -> dict:
    check(provider=provider, method=method)
    cancel(provider=provider, method=method)
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 50, 4000, 0, 0))
    environment = setting.environment(provider=provider, method=method)
    environment.update({"BROWSER": "true", "TERM": "xterm-256color", "COLUMNS": "4000"})
    process = subprocess.Popen(
        [agent.binary(runner=setting.RUNNERS[provider]), *STARTS[provider]],
        stdin=slave,
        stdout=slave,
        stderr=slave,
        env=environment,
        start_new_session=True,
    )
    os.close(slave)
    pending = {
        "process": process,
        "master": master,
        "output": "",
        "url": "",
        "code": "",
        "needs_code": provider == "anthropic",
        "error": "",
        "started": time.time(),
    }
    with LOCK:
        PENDING[(store.user(), provider, method)] = pending
    threading.Thread(target=contextvars.copy_context().run, args=(read,), kwargs={"provider": provider, "method": method, "pending": pending}, daemon=True).start()
    deadline = time.time() + 20
    while time.time() < deadline and not pending["url"] and process.poll() is None:
        time.sleep(0.2)
    if not pending["url"]:
        cancel(provider=provider, method=method)
        raise RuntimeError(f"로그인 주소를 받지 못했습니다. {pending['output'].strip()[-200:]}")

    return status(provider=provider, method=method)


def submit(*, provider: str, method: str, code: str) -> dict:
    with LOCK:
        pending = PENDING.get((store.user(), provider, method))
    if not pending or not pending["needs_code"]:
        raise ValueError("진행 중인 로그인이 없습니다.")
    if not code.strip():
        raise ValueError("코드를 붙여 넣어 주세요.")
    os.write(pending["master"], code.strip().encode("utf-8"))
    time.sleep(0.3)
    os.write(pending["master"], b"\r")
    deadline = time.time() + 60
    while time.time() < deadline and pending["process"].poll() is None and not TOKEN.search(pending["output"]):
        time.sleep(0.3)
    found = TOKEN.search(pending["output"])
    if not found:
        pending["error"] = "토큰을 받지 못했습니다. 코드를 다시 확인해 주세요."
        return status(provider=provider, method=method)
    setting.remember(provider=provider, method=method, token=found.group(0))
    cancel(provider=provider, method=method)

    return status(provider=provider, method=method)


def signout(*, provider: str, method: str) -> dict:
    check(provider=provider, method=method)
    cancel(provider=provider, method=method)
    if provider != "anthropic":
        subprocess.run(
            [agent.binary(runner=setting.RUNNERS[provider]), "logout"],
            capture_output=True,
            timeout=20,
            env=setting.environment(provider=provider, method=method),
            stdin=subprocess.DEVNULL,
        )
    setting.remember(provider=provider, method=method, token="")
    if provider in setting.HOMES:
        (setting.home(provider=provider, method=method) / "auth.json").unlink(missing_ok=True)

    return status(provider=provider, method=method)


def cancel(*, provider: str, method: str) -> None:
    with LOCK:
        pending = PENDING.pop((store.user(), provider, method), None)
    if not pending:
        return
    try:
        os.killpg(pending["process"].pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        os.close(pending["master"])
    except OSError:
        pass


def finish(*, provider: str, method: str) -> None:
    pending = PENDING.pop((store.user(), provider, method), None)
    if pending:
        try:
            os.close(pending["master"])
        except OSError:
            pass


def read(*, provider: str, method: str, pending: dict) -> None:
    while True:
        try:
            chunk = os.read(pending["master"], 4096)
        except OSError:
            return
        if not chunk:
            return
        pending["output"] += clean(text=chunk.decode("utf-8", errors="replace"))
        if not pending["url"]:
            joined = pending["output"]
            urls = URL.findall(joined)
            if urls:
                pending["url"] = urls[-1].rstrip(".,)")
            code = CODE.search(joined)
            pending["code"] = code.group(0) if code else ""
        if time.time() - pending["started"] > EXPIRES:
            cancel(provider=provider, method=method)
            return


def check(*, provider: str, method: str) -> None:
    if provider not in setting.PROVIDERS:
        raise ValueError("알 수 없는 제공사입니다.")
    if setting.kind(method=method) != "plan_key" or not setting.METHOD.fullmatch(method):
        raise ValueError("로그인할 수 없는 인증 수단입니다.")


def clean(*, text: str) -> str:
    return ESCAPE.sub("", text)


# #
# check

if __name__ == "__main__":
    sample = "\x1b[1mOpen\x1b[0m https://accounts.x.ai/oauth2/device?user_code=NZDE-QF6K\n\x1b]0;t\x07Code NZDE-QF6K"
    cleaned = clean(text=sample)
    assert URL.findall(cleaned)[0] == "https://accounts.x.ai/oauth2/device?user_code=NZDE-QF6K"
    assert CODE.search(cleaned).group(0) == "NZDE-QF6K"
    assert CODE.search("2. Enter this one-time code\n   IX1A-GXWGB").group(0) == "IX1A-GXWGB"
    assert TOKEN.search("token: sk-ant-oat01-Ab_c-9xyz done").group(0) == "sk-ant-oat01-Ab_c-9xyz"
    assert TOKEN.search("Your token:\r\nsk-ant-oat01-Ab_c-9xyzAA\r\nStore this token securely").group(0) == "sk-ant-oat01-Ab_c-9xyzAA"
    print("ok")

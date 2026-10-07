from __future__ import annotations

import fcntl
import json
import os
import pty
import re
import shutil
import signal
import struct
import subprocess
import termios
import threading
import time
from pathlib import Path

from usecase.setting.record import record as setting

BINARIES = {
    "openai": os.environ.get("CODEX_BIN") or shutil.which("codex") or "codex",
    "anthropic": os.environ.get("CLAUDE_BIN") or shutil.which("claude") or str(Path.home() / ".local" / "bin" / "claude"),
    "xai": os.environ.get("GROK_BIN") or shutil.which("grok") or str(Path.home() / ".grok" / "bin" / "grok"),
}
STARTS = {
    "openai": ["login", "--device-auth"],
    "anthropic": ["setup-token"],
    "xai": ["login", "--device-auth"],
}
ESCAPE = re.compile(r"\x1b\[[0-9;?<>=]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-_]")
URL = re.compile(r"https://\S+")
CODE = re.compile(r"\b[A-Z0-9]{4}-[A-Z0-9]{4,5}\b")
TOKEN = re.compile(r"sk-ant-oat\d+-[A-Za-z0-9_\-]+")
PENDING: dict[str, dict] = {}
LOCK = threading.Lock()
EXPIRES = 900


# #
# query

def status(*, provider: str) -> dict:
    check(provider=provider)
    found = signed(provider=provider)
    with LOCK:
        pending = PENDING.get(provider)
        if pending and pending["process"].poll() is not None:
            finish(provider=provider)
            pending = None

    return {
        **found,
        "pending": (
            {k: pending[k] for k in ("url", "code", "needs_code", "error")} if pending else None
        ),
    }


def signed(*, provider: str) -> dict:
    environment = setting.environment(provider=provider) if setting.load()[0][provider] == "subscription" else os.environ.copy()
    command = {
        "openai": [binary(provider=provider), "login", "status"],
        "anthropic": [binary(provider=provider), "auth", "status"],
        "xai": [binary(provider=provider), "models"],
    }[provider]
    try:
        done = subprocess.run(command, capture_output=True, text=True, timeout=20, env=environment, stdin=subprocess.DEVNULL)
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"logged_in": False, "detail": f"{Path(command[0]).name} 를 실행하지 못했습니다. {error}"[:200]}
    output = clean(text=done.stdout + done.stderr).strip()
    if provider == "anthropic":
        try:
            parsed = json.loads(done.stdout)
        except json.JSONDecodeError:
            parsed = {}
        token = setting.get()["providers"][1]["token"]
        detail = (parsed.get("email") or parsed.get("authMethod") or "") if parsed.get("loggedIn") else ""
        return {"logged_in": bool(parsed.get("loggedIn")), "detail": f"{detail} · 토큰 {token}" if token else detail}
    if provider == "openai":
        return {"logged_in": done.returncode == 0 and "Logged in" in output, "detail": output.splitlines()[0] if output else ""}

    first = output.splitlines()[0] if output else ""
    return {"logged_in": "logged in" in first.lower(), "detail": first}


# #
# command

def start(*, provider: str) -> dict:
    check(provider=provider)
    cancel(provider=provider)
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 50, 4000, 0, 0))
    environment = {k: v for k, v in setting.environment(provider=provider).items() if k != setting.PROVIDERS[provider]["variable"]}
    environment.update({"BROWSER": "true", "TERM": "xterm-256color", "COLUMNS": "4000"})
    process = subprocess.Popen(
        [binary(provider=provider), *STARTS[provider]],
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
        PENDING[provider] = pending
    threading.Thread(target=read, kwargs={"provider": provider, "pending": pending}, daemon=True).start()
    deadline = time.time() + 20
    while time.time() < deadline and not pending["url"] and process.poll() is None:
        time.sleep(0.2)
    if not pending["url"]:
        cancel(provider=provider)
        raise RuntimeError(f"로그인 주소를 받지 못했습니다. {pending['output'].strip()[-200:]}")

    return status(provider=provider)


def submit(*, provider: str, code: str) -> dict:
    with LOCK:
        pending = PENDING.get(provider)
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
    found = TOKEN.search(pending["output"].replace("\n", "").replace("\r", ""))
    if not found:
        pending["error"] = "토큰을 받지 못했습니다. 코드를 다시 확인해 주세요."
        return status(provider=provider)
    setting.remember(provider=provider, token=found.group(0))
    cancel(provider=provider)

    return status(provider=provider)


def cancel(*, provider: str) -> None:
    with LOCK:
        pending = PENDING.pop(provider, None)
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


def finish(*, provider: str) -> None:
    pending = PENDING.pop(provider, None)
    if pending:
        try:
            os.close(pending["master"])
        except OSError:
            pass


def read(*, provider: str, pending: dict) -> None:
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
            cancel(provider=provider)
            return


def check(*, provider: str) -> None:
    if provider not in setting.PROVIDERS:
        raise ValueError("알 수 없는 제공사입니다.")


def binary(*, provider: str) -> str:
    found = BINARIES[provider]

    return found if Path(found).exists() else Path(found).name


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
    print("ok")

from __future__ import annotations

import json
import os
import signal
import subprocess
import tempfile
import urllib.error
import urllib.request

from usecase.common import store

URL = os.environ.get("AGENT_URL", "").rstrip("/")
HIDDEN = {"ENCRYPTION_KEY"}
WORK = store.API / "data" / "work"
RUNNING: dict[str, subprocess.Popen] = {}


class Timeout(RuntimeError):
    pass


# #
# command

def run(*, id: str, command: list, cwd: str, env: dict, stdin: str, timeout: int) -> tuple[int, str, str]:
    if URL:
        return remote(id=id, command=command, cwd=cwd, env=env, stdin=stdin, timeout=timeout)

    return local(id=id, command=command, cwd=cwd, env=env, stdin=stdin, timeout=timeout)


def workspace(*, prefix: str) -> tempfile.TemporaryDirectory:
    WORK.mkdir(parents=True, exist_ok=True)

    return tempfile.TemporaryDirectory(prefix=prefix, dir=WORK)


def stop(*, id: str) -> None:
    if URL:
        post(path="/stop", payload={"id": id}, timeout=10)
        return
    process = RUNNING.get(id)
    if process:
        halt(process=process)


# #
# remote

def remote(*, id: str, command: list, cwd: str, env: dict, stdin: str, timeout: int) -> tuple[int, str, str]:
    credentials = {
        k: v for k, v in env.items() if os.environ.get(k) != v and k not in HIDDEN
    }
    done = post(
        path="/run",
        payload={"id": id, "command": command, "cwd": cwd, "env": credentials, "stdin": stdin, "timeout": timeout},
        timeout=timeout + 60,
    )
    if done.get("error"):
        raise RuntimeError(f"agent: {done['error']}")
    if done.get("timeout"):
        raise Timeout()

    return done["code"], done["stdout"], done["stderr"]


def post(*, path: str, payload: dict, timeout: int) -> dict:
    request = urllib.request.Request(
        URL + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as error:
        return json.loads(error.read() or b"{}") or {"error": f"HTTP {error.code}"}
    except (urllib.error.URLError, TimeoutError) as error:
        raise RuntimeError(f"agent 컨테이너에 연결하지 못했습니다. {error}") from error


# #
# local

def local(*, id: str, command: list, cwd: str, env: dict, stdin: str, timeout: int) -> tuple[int, str, str]:
    process = subprocess.Popen(
        command,
        cwd=cwd,
        env={k: v for k, v in env.items() if k not in HIDDEN},
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )
    RUNNING[id] = process
    try:
        stdout, stderr = process.communicate(input=stdin, timeout=timeout)
    except subprocess.TimeoutExpired:
        halt(process=process)
        process.communicate()
        raise Timeout()
    finally:
        RUNNING.pop(id, None)

    return process.returncode, stdout, stderr


def halt(*, process: subprocess.Popen) -> None:
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass

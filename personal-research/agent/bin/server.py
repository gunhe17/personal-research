#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import signal
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = os.environ.get("HOST") or "127.0.0.1"
PORT = int(os.environ.get("PORT") or 8770)
COMMANDS = {"codex", "claude", "grok"}
DATA = Path(__file__).resolve().parents[2] / "api" / "data"
RUNNING: dict[str, subprocess.Popen] = {}


# #
# run

def main() -> None:
    print(f"agent on http://{HOST}:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path == "/health":
            return self.reply(code=200, payload={"ok": True})
        self.reply(code=404, payload={"error": "not found"})

    def do_POST(self) -> None:
        try:
            job = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
        except json.JSONDecodeError:
            return self.reply(code=400, payload={"error": "invalid json"})
        if self.path == "/run":
            done = run(job=job)
            return self.reply(code=400 if done.get("error") else 200, payload=done)
        if self.path == "/stop":
            return self.reply(code=200, payload={"stopped": stop(id=str(job.get("id") or ""))})
        self.reply(code=404, payload={"error": "not found"})

    def reply(self, *, code: int, payload: dict) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args) -> None:
        pass


# #
# command

def run(*, job: dict) -> dict:
    command = job.get("command")
    cwd = Path(str(job.get("cwd") or "/")).resolve()
    env = job.get("env") or {}
    # check
    if not isinstance(command, list) or not command or not all(isinstance(c, str) for c in command):
        return {"error": "command must be a list of strings"}
    if Path(command[0]).name not in COMMANDS:
        return {"error": f"{Path(command[0]).name} is not allowed"}
    if DATA.resolve() not in [cwd, *cwd.parents] or not cwd.is_dir():
        return {"error": f"cwd must be under {DATA}"}
    if not isinstance(env, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in env.items()):
        return {"error": "env must map strings to strings"}
    # spawn
    process = subprocess.Popen(
        command,
        cwd=cwd,
        env={**os.environ, **env},
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )
    RUNNING[str(job.get("id") or process.pid)] = process
    try:
        stdout, stderr = process.communicate(input=str(job.get("stdin") or ""), timeout=int(job.get("timeout") or 600))
    except subprocess.TimeoutExpired:
        halt(process=process)
        process.communicate()
        return {"timeout": True}
    finally:
        RUNNING.pop(str(job.get("id") or process.pid), None)

    return {"code": process.returncode, "stdout": stdout, "stderr": stderr}


def stop(*, id: str) -> bool:
    process = RUNNING.get(id)
    if process is None:
        return False
    halt(process=process)

    return True


def halt(*, process: subprocess.Popen) -> None:
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass


# #
# cli

if __name__ == "__main__":
    main()

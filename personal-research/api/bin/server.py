#!/usr/bin/env python3
from __future__ import annotations

import json
import mimetypes
import os
import re
import shutil
import sqlite3
import subprocess
import threading
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip().removeprefix("export ")
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


load_dotenv(ROOT / ".env")

DOCUMENT = ROOT / (os.environ.get("DOCUMENT_DIR") or "data/collected")
CONVERSATIONS = ROOT / "data" / "conversations"
DB_PATH = ROOT / (os.environ.get("DB_PATH") or "data/database/conversations.db")
VIEWER = ROOT.parent / "wui" / "bin"
HOST = os.environ.get("HOST") or "127.0.0.1"
PORT = int(os.environ.get("PORT") or 8765)

GROK_BIN = (
    os.environ.get("GROK_BIN")
    or shutil.which("grok")
    or str(Path.home() / ".grok" / "bin" / "grok")
)
GROK_MODEL = os.environ.get("GROK_MODEL") or ""

DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with db() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS conversations (
                   id        TEXT PRIMARY KEY,
                   title     TEXT NOT NULL,
                   createdAt TEXT NOT NULL,
                   updatedAt TEXT NOT NULL,
                   messages  TEXT NOT NULL DEFAULT '[]'
               )"""
        )
        if conn.execute("SELECT COUNT(*) FROM conversations").fetchone()[0]:
            return
        for f in sorted(CONVERSATIONS.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            now = utc_now()
            conn.execute(
                "INSERT OR REPLACE INTO conversations VALUES (?,?,?,?,?)",
                (
                    data.get("id") or f.stem,
                    data.get("title") or "Untitled",
                    data.get("createdAt") or now,
                    data.get("updatedAt") or now,
                    json.dumps(data.get("messages") or [], ensure_ascii=False),
                ),
            )
            print(f"imported {f.name}")


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def safe_doc_path(rel: str) -> Path | None:
    rel = unquote(rel or "").lstrip("/").replace("\\", "/")
    if not rel or ".." in rel.split("/"):
        return None
    path = (DOCUMENT / rel).resolve()
    try:
        path.relative_to(DOCUMENT.resolve())
    except ValueError:
        return None
    return path


def build_tree() -> list[dict]:
    root: dict = {}
    meta = DOCUMENT / "meta"
    for sidecar in meta.rglob("*.json"):
        rel = sidecar.relative_to(meta).as_posix().removesuffix(".json")
        if not (DOCUMENT / "eng" / rel).is_file():
            continue
        try:
            info = json.loads(sidecar.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            info = {}
        stamped = "kor" in info
        node = {
            "type": "file",
            "name": rel.rsplit("/", 1)[-1],
            "path": f"eng/{rel}",
            "ext": Path(rel).suffix.lower(),
            "published": info.get("published"),
        }
        if stamped and (DOCUMENT / "kor" / rel).is_file():
            node["trans"] = f"kor/{rel}"
        parent = root
        for part in rel.split("/")[:-1]:
            parent = parent.setdefault(part, {})
        parent[node["name"]] = node

    def to_nodes(level: dict, prefix: str) -> list[dict]:
        nodes = []
        for name, value in level.items():
            if value.get("type") == "file":
                nodes.append(value)
            else:
                path = f"{prefix}/{name}"
                nodes.append({"type": "dir", "name": name, "path": path, "children": to_nodes(value, path)})
        return sorted(nodes, key=lambda n: (n["type"] != "dir", n.get("published") or "~", n["name"].lower()))

    return to_nodes(root, "eng")


def list_conversations() -> list[dict]:
    with db() as conn:
        rows = conn.execute(
            """SELECT id, title, createdAt, updatedAt,
                      json_array_length(messages) AS messageCount
               FROM conversations ORDER BY updatedAt DESC"""
        ).fetchall()
    return [dict(r) for r in rows]


def load_conversation(cid: str) -> dict | None:
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", cid or ""):
        return None
    with db() as conn:
        row = conn.execute("SELECT * FROM conversations WHERE id = ?", (cid,)).fetchone()
    if not row:
        return None
    return {**dict(row), "messages": json.loads(row["messages"])}


def save_conversation(data: dict) -> dict:
    cid = data.get("id") or str(uuid.uuid4())
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", cid):
        cid = str(uuid.uuid4())
    now = utc_now()
    payload = {
        "id": cid,
        "title": (data.get("title") or "새 대화").strip() or "새 대화",
        "createdAt": data.get("createdAt") or now,
        "updatedAt": now,
        "messages": data.get("messages") or [],
    }
    with db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO conversations VALUES (?,?,?,?,?)",
            (
                payload["id"],
                payload["title"],
                payload["createdAt"],
                payload["updatedAt"],
                json.dumps(payload["messages"], ensure_ascii=False),
            ),
        )
    return payload


def delete_conversation(cid: str) -> bool:
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", cid or ""):
        return False
    with db() as conn:
        return conn.execute("DELETE FROM conversations WHERE id = ?", (cid,)).rowcount > 0


def build_prompt(body: dict) -> str:
    system = (body.get("system") or "").strip()
    doc_path = (body.get("path") or "").strip()
    doc = body.get("document") or ""
    if isinstance(doc, str) and len(doc) > 120_000:
        doc = doc[:120_000] + "\n\n…(truncated)…"

    parts: list[str] = []
    if system:
        parts.append(system)
    else:
        parts.append(
            "당신은 document/ 문서를 근거로 답하는 학습 에이전트입니다. "
            "문서와 인용에 없는 내용은 추측하지 마세요. 쉬운 한국어, 핵심 용어는 영문 병기."
        )

    if doc_path or doc:
        parts.append(f"\n현재 문서 경로: {doc_path or '(없음)'}")
        parts.append("\n----- 문서 본문 -----\n")
        parts.append(doc or "(비어 있음)")
        parts.append("\n----- 문서 끝 -----\n")

    messages = body.get("messages") or []
    if not isinstance(messages, list):
        messages = []

    for m in messages:
        if not isinstance(m, dict):
            continue
        role = m.get("role")
        content = (m.get("content") or "").strip()
        if not content:
            continue
        if role == "user":
            cites = m.get("citations") or []
            if cites:
                cite_blocks = []
                for i, c in enumerate(cites, 1):
                    if not isinstance(c, dict):
                        continue
                    cite_blocks.append(
                        f"[인용 {i} | {c.get('path') or ''}]\n\"\"\"\n{c.get('text') or ''}\n\"\"\""
                    )
                content = "\n\n".join(cite_blocks) + "\n\n질문:\n" + content
            parts.append(f"\n### User\n{content}\n")
        elif role == "assistant":
            parts.append(f"\n### Assistant\n{content}\n")

    parts.append(
        "\n### Instruction\n"
        "위 대화의 마지막 User 질문에 Assistant로서 답하세요. "
        "도구/파일 탐색 없이, 제공된 문서·인용만으로 답하는 것을 우선하세요. "
        "답변 본문만 출력하세요.\n"
    )
    return "".join(parts)


def extract_text_delta(line: str) -> str | None:
    line = line.strip()
    if not line:
        return None
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        return None

    if obj.get("type") == "stream_event":
        ev = obj.get("event") or {}
        if ev.get("type") == "content_block_delta":
            delta = ev.get("delta") or {}
            if delta.get("type") == "text_delta":
                return delta.get("text") or ""
        return None

    if obj.get("type") == "assistant":
        msg = obj.get("message") or {}
        chunks = []
        for block in msg.get("content") or []:
            if isinstance(block, dict) and block.get("type") == "text":
                chunks.append(block.get("text") or "")
        text = "".join(chunks)
        return None if not text else None

    if obj.get("type") == "result" and obj.get("subtype") == "success":
        return None

    return None


def extract_result_text(line: str) -> str | None:
    line = line.strip()
    if not line:
        return None
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        return None
    if obj.get("type") == "result" and not obj.get("is_error"):
        return obj.get("result") or ""
    if obj.get("type") == "assistant":
        msg = obj.get("message") or {}
        chunks = []
        for block in msg.get("content") or []:
            if isinstance(block, dict) and block.get("type") == "text":
                chunks.append(block.get("text") or "")
        return "".join(chunks) or None
    return None


class Handler(BaseHTTPRequestHandler):
    server_version = "OntologyViewer/1.1"

    def log_message(self, fmt: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code: int, obj) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _text(self, code: int, text: str, content_type: str = "text/plain; charset=utf-8") -> None:
        body = text.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _bytes(self, code: int, data: bytes, content_type: str, no_store: bool = False) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        if no_store:
            self.send_header("Cache-Control", "no-store, must-revalidate")
        self._cors()
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        if path in ("/", "/viewer", "/viewer/"):
            return self._serve_file(VIEWER / "index.html")

        if path.startswith("/viewer/"):
            rel = path[len("/viewer/") :]
            return self._serve_file(VIEWER / rel)

        if path == "/api/health":
            grok_ok = Path(GROK_BIN).is_file() or bool(shutil.which("grok"))
            return self._json(
                200,
                {
                    "ok": True,
                    "grok_bin": GROK_BIN,
                    "grok_available": grok_ok,
                    "document": str(DOCUMENT),
                    "conversations": str(CONVERSATIONS),
                },
            )

        if path == "/api/tree":
            return self._json(200, {"root": DOCUMENT.name, "tree": build_tree()})

        if path == "/api/raw":
            rel = (qs.get("path") or [""])[0]
            target = safe_doc_path(rel)
            if not target or not target.is_file():
                return self._text(404, "not found")
            ctype = "text/html; charset=utf-8" if target.suffix == ".html" else "text/plain; charset=utf-8"
            return self._bytes(200, target.read_bytes(), ctype)

        if path == "/api/file":
            rel = (qs.get("path") or [""])[0]
            target = safe_doc_path(rel)
            if not target or not target.is_file():
                return self._json(404, {"error": "file not found", "path": rel})
            try:
                text = target.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                return self._json(415, {"error": "not a utf-8 text file", "path": rel})
            return self._json(200, {"path": rel, "name": target.name, "content": text})

        if path == "/api/conversations":
            return self._json(200, {"items": list_conversations()})

        m = re.fullmatch(r"/api/conversations/([a-zA-Z0-9_-]+)", path)
        if m:
            data = load_conversation(m.group(1))
            if not data:
                return self._json(404, {"error": "not found"})
            return self._json(200, data)

        if path.startswith("/document/"):
            rel = path[len("/document/") :]
            target = safe_doc_path(rel)
            if not target or not target.is_file():
                return self._json(404, {"error": "not found"})
            ctype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
            return self._bytes(200, target.read_bytes(), ctype)

        self._json(404, {"error": "not found", "path": path})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return self._json(400, {"error": "invalid json"})

        if parsed.path == "/api/conversations":
            saved = save_conversation(body if isinstance(body, dict) else {})
            return self._json(200, saved)

        if parsed.path == "/api/chat":
            return self._chat_sse(body if isinstance(body, dict) else {})

        self._json(404, {"error": "not found"})

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        m = re.fullmatch(r"/api/conversations/([a-zA-Z0-9_-]+)", parsed.path)
        if not m:
            return self._json(404, {"error": "not found"})
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return self._json(400, {"error": "invalid json"})
        if not isinstance(body, dict):
            return self._json(400, {"error": "invalid body"})
        body["id"] = m.group(1)
        existing = load_conversation(m.group(1))
        if existing and existing.get("createdAt"):
            body["createdAt"] = existing["createdAt"]
        saved = save_conversation(body)
        return self._json(200, saved)

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        m = re.fullmatch(r"/api/conversations/([a-zA-Z0-9_-]+)", parsed.path)
        if not m:
            return self._json(404, {"error": "not found"})
        ok = delete_conversation(m.group(1))
        return self._json(200 if ok else 404, {"ok": ok})

    def _chat_sse(self, body: dict) -> None:
        if not Path(GROK_BIN).exists() and not shutil.which("grok"):
            return self._json(
                500,
                {
                    "error": "grok CLI not found",
                    "hint": "Install Grok Build CLI and ensure `grok` is on PATH or ~/.grok/bin/grok",
                    "grok_bin": GROK_BIN,
                },
            )

        prompt = build_prompt(body)
        model = (body.get("model") or GROK_MODEL).strip()
        max_turns = body.get("max_turns") or 1
        try:
            max_turns = max(1, min(int(max_turns), 8))
        except (TypeError, ValueError):
            max_turns = 1

        grok = GROK_BIN if Path(GROK_BIN).exists() else "grok"
        cmd = [
            grok,
            "-p",
            prompt,
            "--output-format",
            "streaming-messages-json",
            "--include-partial-messages",
            "--no-subagents",
            "--disallowed-tools",
            "run_terminal_cmd,read_file,grep,list_dir,search_replace,write_file,web_search,web_fetch,Agent",
            "--max-turns",
            str(max_turns),
            "--cwd",
            str(ROOT),
            "--verbatim",
        ]
        if model:
            cmd.extend(["-m", model])

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self._cors()
        self.end_headers()

        def send_event(obj: dict) -> None:
            data = json.dumps(obj, ensure_ascii=False)
            self.wfile.write(f"data: {data}\n\n".encode("utf-8"))
            self.wfile.flush()

        send_event({"type": "start", "backend": "grok-cli", "bin": grok})

        full_parts: list[str] = []
        final_text: str | None = None
        got_terminal = False
        proc = None
        try:
            env = {
                **os.environ,
                "PATH": str(Path.home() / ".grok" / "bin") + ":" + os.environ.get("PATH", ""),
            }
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=0,
                env=env,
            )
            assert proc.stdout is not None
            buf = b""
            stderr_chunks: list[bytes] = []

            def _drain_stderr() -> None:
                try:
                    if proc.stderr is not None:
                        while True:
                            b = proc.stderr.read(4096)
                            if not b:
                                break
                            stderr_chunks.append(b)
                except Exception:
                    pass

            t_err = threading.Thread(target=_drain_stderr, daemon=True)
            t_err.start()

            while True:
                chunk = proc.stdout.read(4096)
                if not chunk:
                    break
                buf += chunk
                while b"\n" in buf:
                    raw_line, buf = buf.split(b"\n", 1)
                    line = raw_line.decode("utf-8", errors="replace")
                    delta = extract_text_delta(line)
                    if delta:
                        full_parts.append(delta)
                        send_event({"type": "delta", "text": delta})
                    try:
                        obj = json.loads(line.strip()) if line.strip() else None
                    except json.JSONDecodeError:
                        obj = None
                    if isinstance(obj, dict):
                        if obj.get("type") == "result":
                            got_terminal = True
                            if not obj.get("is_error"):
                                final_text = obj.get("result") or final_text or "".join(full_parts)
                            else:
                                final_text = final_text or "".join(full_parts)
                        elif obj.get("type") == "assistant":
                            res_text = extract_result_text(line)
                            if res_text:
                                final_text = res_text
                    else:
                        res_text = extract_result_text(line)
                        if res_text is not None and res_text != "":
                            final_text = res_text

                    if got_terminal:
                        break
                if got_terminal:
                    break

            if proc.poll() is None:
                try:
                    proc.terminate()
                    proc.wait(timeout=3)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass

            t_err.join(timeout=1)
            stderr = b"".join(stderr_chunks).decode("utf-8", errors="replace")
            code = proc.poll()
            if code is None:
                code = -1
            text = final_text if final_text is not None else "".join(full_parts)
            if code not in (0, None, -1) and not text and not got_terminal:
                send_event(
                    {
                        "type": "error",
                        "error": f"grok exited {code}",
                        "stderr": stderr[-2000:],
                    }
                )
            else:
                send_event({"type": "done", "text": text or "", "exit_code": code})
        except Exception as e:
            if proc is not None and proc.poll() is None:
                try:
                    proc.kill()
                except Exception:
                    pass
            send_event({"type": "error", "error": str(e)})

        try:
            self.wfile.write(b"data: [DONE]\n\n")
            self.wfile.flush()
        except BrokenPipeError:
            pass

    def _serve_file(self, path: Path) -> None:
        path = path.resolve()
        try:
            path.relative_to(VIEWER.resolve())
        except ValueError:
            return self._text(403, "forbidden")
        if path.is_dir():
            path = path / "index.html"
        if not path.is_file():
            return self._text(404, "not found")
        ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        if path.suffix == ".html":
            ctype = "text/html; charset=utf-8"
        elif path.suffix == ".js":
            ctype = "application/javascript; charset=utf-8"
        elif path.suffix == ".css":
            ctype = "text/css; charset=utf-8"
        return self._bytes(200, path.read_bytes(), ctype, no_store=True)


def main() -> None:
    if not DOCUMENT.is_dir():
        raise SystemExit(f"문서 루트 없음: {DOCUMENT}")
    init_db()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Root: {ROOT}")
    print(f"Document: {DOCUMENT}")
    print(f"Conversations: {DB_PATH}")
    print(f"Grok: {GROK_BIN}")
    print(f"Open http://{HOST}:{PORT}/viewer/")
    httpd.serve_forever()


if __name__ == "__main__":
    main()

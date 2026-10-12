#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request

API_URL = (sys.argv[1:2] or ["http://127.0.0.1:8765"])[0].rstrip("/")
TOKEN = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "check" else ""


# #
# run

def main() -> None:
    for line in sys.stdin:
        if not line.strip():
            continue
        answered = respond(message=json.loads(line))
        if answered is not None:
            sys.stdout.write(json.dumps(answered, ensure_ascii=False) + "\n")
            sys.stdout.flush()


def respond(*, message: dict) -> dict | None:
    method = message.get("method")
    if "id" not in message:
        return None
    if method == "initialize":
        result = {
            "protocolVersion": message.get("params", {}).get("protocolVersion") or "2025-06-18",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "research", "version": "1"},
        }
    elif method == "ping":
        result = {}
    elif method == "tools/list":
        result = {"tools": [{"name": name, **tool["spec"]} for name, tool in TOOLS.items()]}
    elif method == "tools/call":
        result = called(params=message.get("params") or {})
    else:
        return {"jsonrpc": "2.0", "id": message["id"], "error": {"code": -32601, "message": f"unknown method {method}"}}

    return {"jsonrpc": "2.0", "id": message["id"], "result": result}


def called(*, params: dict) -> dict:
    tool = TOOLS.get(params.get("name"))
    if tool is None:
        return {"isError": True, "content": [{"type": "text", "text": f"unknown tool {params.get('name')}"}]}
    try:
        output = tool["run"](**(params.get("arguments") or {}))
    except (TypeError, ValueError, OSError) as error:
        return {"isError": True, "content": [{"type": "text", "text": str(error)}]}

    return {"content": [{"type": "text", "text": json.dumps(output, ensure_ascii=False)}]}


# #
# tools

def request(url: str) -> urllib.request.Request:
    return urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"} if TOKEN else {})


def search_collected(*, terms: list, limit: int = 8) -> list[dict]:
    if not isinstance(terms, list) or not all(isinstance(t, str) for t in terms):
        raise ValueError("terms must be a list of strings")
    query = urllib.parse.urlencode({"q": " ".join(terms)})
    with urllib.request.urlopen(request(f"{API_URL}/api/search?{query}"), timeout=30) as response:
        found = json.loads(response.read())["items"]

    return [
        {"path": f["path"], "language": f["language"], "hits": f["hits"], "excerpt": f["excerpt"]} for f in found[:max(1, min(int(limit), 8))]
    ]


def read_document(*, path: str, language: str = "eng", start: int = 1, lines: int = 300) -> dict:
    if language not in ("eng", "kor"):
        raise ValueError("language must be eng or kor")
    query = urllib.parse.urlencode({"id": path, "language": language})
    try:
        with urllib.request.urlopen(request(f"{API_URL}/api/file?{query}"), timeout=30) as response:
            found = json.loads(response.read())
    except urllib.error.HTTPError as error:
        if error.code == 404:
            raise ValueError(f"no {language} document at {path}") from error
        raise
    body = found["content"].splitlines()
    first = max(1, int(start))
    last = min(len(body), first + max(1, min(int(lines), 600)) - 1)

    return {
        "path": found["path"],
        "language": language,
        "total_lines": len(body),
        "start": first,
        "end": last,
        "text": "\n".join(body[first - 1:last]),
    }


def list_collected(*, folder: str = "", limit: int = 100) -> dict:
    with urllib.request.urlopen(request(f"{API_URL}/api/tree"), timeout=30) as response:
        nodes = json.loads(response.read())["tree"]
    wanted = folder.strip("/")
    for part in [p for p in wanted.split("/") if p]:
        found = next((n for n in nodes if n["type"] == "dir" and n["name"] == part), None)
        if found is None:
            raise ValueError(f"no folder {wanted}")
        nodes = found["children"]
    documents = [n for n in nodes if n["type"] == "file"]

    return {
        "folder": wanted,
        "total_documents": sum(counted(node=n) for n in nodes),
        "folders": [{"path": n["path"], "documents": counted(node=n)} for n in nodes if n["type"] == "dir"],
        "documents": [
            {"path": n["path"], "languages": n["languages"], "published": n["published"]} for n in documents[:max(1, min(int(limit), 500))]
        ],
    }


def counted(*, node: dict) -> int:
    if node["type"] == "file":
        return 1

    return sum(counted(node=c) for c in node["children"])


TOOLS = {
    "search_collected": {
        "run": search_collected,
        "spec": {
            "description": "수집물 본문에서 모든 단어를 포함하는 문서를 찾는다. 많이 나온 순으로 path 와 발췌를 돌려준다. 원문(eng)과 한국어판(kor)을 함께 찾는다.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "terms": {"type": "array", "items": {"type": "string"}, "minItems": 1},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 8},
                },
                "required": ["terms"],
            },
            "annotations": {"readOnlyHint": True, "openWorldHint": False},
        },
    },
    "list_collected": {
        "run": list_collected,
        "spec": {
            "description": "수집물 목록을 폴더 하나씩 본다. folder 를 비우면 맨 위(docs, papers, repos, videos). 하위 폴더와 그 문서 수, 그 폴더에 바로 있는 문서의 path 와 언어(eng, kor)를 돌려준다.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "folder": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 500},
                },
            },
            "annotations": {"readOnlyHint": True, "openWorldHint": False},
        },
    },
    "read_document": {
        "run": read_document,
        "spec": {
            "description": "수집물 문서 하나를 path 로 읽는다. 원문은 eng, 한국어판은 kor. 긴 문서는 start 줄부터 lines 줄씩 나눠 읽고, total_lines 로 남은 양을 안다.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "language": {"type": "string", "enum": ["eng", "kor"]},
                    "start": {"type": "integer", "minimum": 1},
                    "lines": {"type": "integer", "minimum": 1, "maximum": 600},
                },
                "required": ["path"],
            },
            "annotations": {"readOnlyHint": True, "openWorldHint": False},
        },
    },
}


# #
# check

def check() -> None:
    assert respond(message={"jsonrpc": "2.0", "method": "notifications/initialized"}) is None
    assert respond(message={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})["result"]["serverInfo"]["name"] == "research"
    assert respond(message={"jsonrpc": "2.0", "id": 2, "method": "tools/list"})["result"]["tools"][0]["name"] == "search_collected"
    assert respond(message={"jsonrpc": "2.0", "id": 3, "method": "nope"})["error"]["code"] == -32601
    assert respond(message={"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "search_collected", "arguments": {"terms": "x"}}})["result"]["isError"]
    found = respond(message={"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "search_collected", "arguments": {"terms": ["codex"], "limit": 2}}})
    assert "isError" not in found["result"]
    print(found["result"]["content"][0]["text"][:300])
    path = json.loads(found["result"]["content"][0]["text"])[0]["path"]
    read = respond(message={"jsonrpc": "2.0", "id": 6, "method": "tools/call", "params": {"name": "read_document", "arguments": {"path": path, "start": 2, "lines": 3}}})
    page = json.loads(read["result"]["content"][0]["text"])
    assert page["start"] == 2 and page["end"] == 4 and page["total_lines"] > 4
    missing = respond(message={"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {"name": "read_document", "arguments": {"path": "nope/none.md"}}})
    assert missing["result"]["isError"]
    print(page["text"][:200])
    top = json.loads(respond(message={"jsonrpc": "2.0", "id": 8, "method": "tools/call", "params": {"name": "list_collected", "arguments": {}}})["result"]["content"][0]["text"])
    assert top["total_documents"] >= 1 and top["folders"]
    inner = "/".join(path.split("/")[:-1])
    leaf = json.loads(respond(message={"jsonrpc": "2.0", "id": 9, "method": "tools/call", "params": {"name": "list_collected", "arguments": {"folder": inner}}})["result"]["content"][0]["text"])
    assert path in [d["path"] for d in leaf["documents"]]
    assert respond(message={"jsonrpc": "2.0", "id": 10, "method": "tools/call", "params": {"name": "list_collected", "arguments": {"folder": "nope"}}})["result"]["isError"]
    print(top)


# #
# cli

if __name__ == "__main__":
    check() if sys.argv[-1] == "check" else main()

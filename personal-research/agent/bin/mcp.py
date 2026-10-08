#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request

API_URL = (sys.argv[1:2] or ["http://127.0.0.1:8765"])[0].rstrip("/")


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

def search_collected(*, terms: list, limit: int = 8) -> list[dict]:
    if not isinstance(terms, list) or not all(isinstance(t, str) for t in terms):
        raise ValueError("terms must be a list of strings")
    query = urllib.parse.urlencode({"q": " ".join(terms)})
    with urllib.request.urlopen(f"{API_URL}/api/search?{query}", timeout=30) as response:
        found = json.loads(response.read())["items"]

    return [
        {"path": f["path"], "language": f["language"], "hits": f["hits"], "excerpt": f["excerpt"]} for f in found[:max(1, min(int(limit), 8))]
    ]


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


# #
# cli

if __name__ == "__main__":
    check() if sys.argv[2:] == ["check"] else main()

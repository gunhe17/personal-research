from __future__ import annotations

import json
import os

from usecase.common import store

FILE = store.API / "database" / "setting.json"
PROVIDERS = {
    "openai": {"label": "OpenAI", "cli": "Codex CLI", "variable": "CODEX_API_KEY"},
    "anthropic": {"label": "Anthropic", "cli": "Claude Code CLI", "variable": "ANTHROPIC_API_KEY"},
}
AUTHS = ("subscription", "api_key")


# #
# query

def get() -> dict:
    saved = load()

    return {
        "providers": [
            {
                "id": id,
                **provider,
                "auth": saved.get(id, {}).get("auth", "subscription"),
                "key": masked(key=saved.get(id, {}).get("key", "")),
            }
            for id, provider in PROVIDERS.items()
        ],
    }


def environment(*, provider: str) -> dict:
    variable = PROVIDERS[provider]["variable"]
    saved = load().get(provider, {})
    found = {k: v for k, v in os.environ.items() if k != variable}
    if saved.get("auth") == "api_key" and saved.get("key"):
        found[variable] = saved["key"]

    return found


def masked(*, key: str) -> str:
    return f"…{key[-4:]}" if key else ""


def load() -> dict:
    try:
        return json.loads(FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


# #
# command

def edit(*, data: dict) -> dict:
    saved = load()
    for id, given in (data.get("providers") or {}).items():
        if id not in PROVIDERS or not isinstance(given, dict):
            raise ValueError("알 수 없는 제공사입니다.")
        current = saved.setdefault(id, {"auth": "subscription", "key": ""})
        if given.get("auth") is not None:
            if given["auth"] not in AUTHS:
                raise ValueError("인증 방식이 올바르지 않습니다.")
            current["auth"] = given["auth"]
        if isinstance(given.get("key"), str) and given["key"].strip():
            current["key"] = given["key"].strip()
        if given.get("key") is None and "key" in given:
            current["key"] = ""
        if current["auth"] == "api_key" and not current["key"]:
            raise ValueError(f"{PROVIDERS[id]['label']} API 키를 입력해 주세요.")
    write(saved=saved)

    return get()


def write(*, saved: dict) -> None:
    FILE.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as file:
        json.dump(saved, file, ensure_ascii=False)


# #
# check

if __name__ == "__main__":
    import tempfile
    from pathlib import Path

    FILE = Path(tempfile.mkdtemp()) / "setting.json"
    assert get()["providers"][0]["auth"] == "subscription"
    edit(data={"providers": {"anthropic": {"auth": "api_key", "key": "sk-test-1234"}}})
    assert get()["providers"][1]["key"] == "…1234"
    assert environment(provider="anthropic")["ANTHROPIC_API_KEY"] == "sk-test-1234"
    edit(data={"providers": {"anthropic": {"auth": "subscription"}}})
    assert "ANTHROPIC_API_KEY" not in environment(provider="anthropic")
    assert oct(FILE.stat().st_mode & 0o777) == "0o600"
    for broken in ({"openai": {"auth": "api_key"}}, {"x": {}}, {"openai": {"auth": "bad"}}):
        try:
            edit(data={"providers": broken})
        except ValueError:
            continue
        raise AssertionError(broken)
    print("ok")

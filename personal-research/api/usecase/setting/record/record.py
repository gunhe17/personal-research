from __future__ import annotations

import json
import os

from cryptography.fernet import Fernet
from cryptography.fernet import InvalidToken

from usecase.common import store

KEY_FILE = store.API / "database" / "encryption.key"
KIND = "credential"
PROVIDERS = {
    "openai": {
        "label": "OpenAI",
        "cli": "Codex CLI",
        "variable": "CODEX_API_KEY",
        "models": [
            {"id": "gpt-6-astra", "label": "GPT-6-Astra"},
            {"id": "gpt-6-sol", "label": "GPT-6-Sol"},
            {"id": "gpt-6-luna", "label": "GPT-6-Luna"},
            {"id": "gpt-6.1-sol", "label": "GPT-6.1-Sol"},
        ],
    },
    "anthropic": {
        "label": "Anthropic",
        "cli": "Claude Code CLI",
        "variable": "ANTHROPIC_API_KEY",
        "models": [
            {"id": "claude-opus-5-5", "label": "Claude Opus 5.5"},
            {"id": "claude-sonnet-5-5", "label": "Claude Sonnet 5.5"},
            {"id": "claude-fable-5-1", "label": "Claude Fable 5.1"},
            {"id": "claude-haiku-4-5-20251001", "label": "Claude Haiku 4.5"},
        ],
    },
    "xai": {
        "label": "xAI",
        "cli": "Grok CLI",
        "variable": "XAI_API_KEY",
        "models": [
            {"id": "grok-4.7", "label": "Grok 4.7"},
            {"id": "grok-4.7-build-fast", "label": "Grok 4.7 Build Fast"},
            {"id": "grok-4.6", "label": "Grok 4.6"},
            {"id": "grok-4.5", "label": "Grok 4.5"},
        ],
    },
}
AUTHS = ("subscription", "api_key")


# #
# query

def get() -> dict:
    auths, secrets = load()

    return {
        "providers": [
            {
                "id": id,
                **{k: v for k, v in provider.items() if k != "variable"},
                "auth": auths[id],
                "key": masked(key=secrets[id]["api_key"]),
                "token": masked(key=secrets[id]["token"]),
            }
            for id, provider in PROVIDERS.items()
        ],
    }


def environment(*, provider: str) -> dict:
    variable = PROVIDERS[provider]["variable"]
    auths, secrets = load()
    found = {k: v for k, v in os.environ.items() if k != variable}
    if auths[provider] == "api_key":
        if not secrets[provider]["api_key"]:
            raise RuntimeError(f"{PROVIDERS[provider]['label']} API 키를 풀 수 없습니다. 설정에서 다시 입력해 주세요.")
        found[variable] = secrets[provider]["api_key"]
    elif provider == "anthropic" and secrets[provider]["token"]:
        found["CLAUDE_CODE_OAUTH_TOKEN"] = secrets[provider]["token"]

    return found


def masked(*, key: str) -> str:
    return f"…{key[-4:]}" if key else ""


def load() -> tuple[dict, dict]:
    with store.session() as connection:
        row = connection.execute(
            f"SELECT value, {', '.join(PROVIDERS)} FROM user_meta WHERE user_id = ? AND kind = ? AND collected_id = ''",
            (store.USER, KIND),
        ).fetchone()
    saved = json.loads(row[0]) if row else {}
    tokens = row[1:] if row else [""] * len(PROVIDERS)
    auths = {id: auth(given=saved.get(id)) for id in PROVIDERS}

    return auths, {id: unpacked(text=decrypt(token=token)) for id, token in zip(PROVIDERS, tokens)}


def auth(*, given) -> str:
    found = given.get("auth") if isinstance(given, dict) else given

    return found if found in AUTHS else "subscription"


def unpacked(*, text: str) -> dict:
    try:
        found = json.loads(text) if text else {}
    except json.JSONDecodeError:
        found = {"api_key": text}
    found = found if isinstance(found, dict) else {"api_key": text}

    return {"api_key": found.get("api_key") or "", "token": found.get("token") or ""}


# #
# command

def edit(*, data: dict) -> dict:
    auths, secrets = load()
    for id, given in (data.get("providers") or {}).items():
        if id not in PROVIDERS or not isinstance(given, dict):
            raise ValueError("알 수 없는 제공사입니다.")
        if given.get("auth") is not None:
            if given["auth"] not in AUTHS:
                raise ValueError("인증 방식이 올바르지 않습니다.")
            auths[id] = given["auth"]
        if isinstance(given.get("key"), str) and given["key"].strip():
            secrets[id]["api_key"] = given["key"].strip()
        if given.get("key") is None and "key" in given:
            secrets[id]["api_key"] = ""
        if auths[id] == "api_key" and not secrets[id]["api_key"]:
            raise ValueError(f"{PROVIDERS[id]['label']} API 키를 입력해 주세요.")
    save(auths=auths, secrets=secrets)

    return get()


def remember(*, provider: str, token: str) -> None:
    auths, secrets = load()
    secrets[provider]["token"] = token
    auths[provider] = "subscription"
    save(auths=auths, secrets=secrets)


def save(*, auths: dict, secrets: dict) -> None:
    with store.session() as connection:
        connection.execute(
            f"""INSERT OR REPLACE INTO user_meta (user_id, kind, collected_id, value, {', '.join(PROVIDERS)}, updated_at)
               VALUES (?, ?, '', ?, {', '.join('?' * len(PROVIDERS))}, ?)""",
            (
                store.USER,
                KIND,
                json.dumps({id: {"auth": auths[id]} for id in PROVIDERS}),
                *[encrypt(key=json.dumps(secrets[id]) if any(secrets[id].values()) else "") for id in PROVIDERS],
                store.now(),
            ),
        )


# #
# cipher

def encrypt(*, key: str) -> str:
    return cipher().encrypt(key.encode("utf-8")).decode("ascii") if key else ""


def decrypt(*, token: str) -> str:
    if not token:
        return ""
    try:
        return cipher().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken:
        return ""


def cipher() -> Fernet:
    secret = os.environ.get("ENCRYPTION_KEY")
    if not secret:
        if not KEY_FILE.is_file():
            KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
            descriptor = os.open(KEY_FILE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "wb") as file:
                file.write(Fernet.generate_key())
        secret = KEY_FILE.read_text(encoding="ascii").strip()

    return Fernet(secret.encode("ascii"))


# #
# check

if __name__ == "__main__":
    import tempfile
    from pathlib import Path

    folder = Path(tempfile.mkdtemp())
    store.DATABASE = folder / "check.db"
    KEY_FILE = folder / "encryption.key"
    first = get()["providers"]
    assert [p["id"] for p in first] == ["openai", "anthropic", "xai"]
    assert first[0]["auth"] == "subscription" and "variable" not in first[0]
    edit(data={"providers": {"anthropic": {"auth": "api_key", "key": "sk-test-1234"}}})
    assert get()["providers"][1]["key"] == "…1234"
    assert environment(provider="anthropic")["ANTHROPIC_API_KEY"] == "sk-test-1234"
    with store.session() as connection:
        stored = connection.execute("SELECT anthropic FROM user_meta WHERE kind = ?", (KIND,)).fetchone()[0]
    assert stored and "sk-test" not in stored
    assert oct(KEY_FILE.stat().st_mode & 0o777) == "0o600"
    remember(provider="anthropic", token="sk-ant-oat01-test-5678")
    found = environment(provider="anthropic")
    assert found["CLAUDE_CODE_OAUTH_TOKEN"] == "sk-ant-oat01-test-5678" and "ANTHROPIC_API_KEY" not in found
    assert get()["providers"][1]["token"] == "…5678" and get()["providers"][1]["key"] == "…1234"
    assert unpacked(text="sk-legacy") == {"api_key": "sk-legacy", "token": ""}
    assert auth(given="api_key") == "api_key" and auth(given={"auth": "api_key", "enabled": True}) == "api_key"
    edit(data={"providers": {"anthropic": {"auth": "api_key"}}})
    KEY_FILE.unlink()
    KEY_FILE = folder / "other.key"
    try:
        environment(provider="anthropic")
    except RuntimeError:
        pass
    else:
        raise AssertionError("undecryptable key")
    edit(data={"providers": {"anthropic": {"auth": "subscription"}}})
    for broken in ({"openai": {"auth": "api_key"}}, {"x": {}}, {"openai": {"auth": "bad"}}):
        try:
            edit(data={"providers": broken})
        except ValueError:
            continue
        raise AssertionError(broken)
    print("ok")

from __future__ import annotations

import json
import os

from cryptography.fernet import Fernet
from cryptography.fernet import InvalidToken

from usecase.common import store

KEY_FILE = store.API / "database" / "encryption.key"
KIND = "credential"
PROVIDERS = {
    "openai": {"label": "OpenAI", "cli": "Codex CLI", "variable": "CODEX_API_KEY"},
    "anthropic": {"label": "Anthropic", "cli": "Claude Code CLI", "variable": "ANTHROPIC_API_KEY"},
}
AUTHS = ("subscription", "api_key")


# #
# query

def get() -> dict:
    auths, keys = load()

    return {
        "providers": [
            {
                "id": id,
                **provider,
                "auth": auths.get(id, "subscription"),
                "key": masked(key=keys[id]),
            }
            for id, provider in PROVIDERS.items()
        ],
    }


def environment(*, provider: str) -> dict:
    variable = PROVIDERS[provider]["variable"]
    auths, keys = load()
    found = {k: v for k, v in os.environ.items() if k != variable}
    if auths.get(provider) == "api_key":
        if not keys[provider]:
            raise RuntimeError(f"{PROVIDERS[provider]['label']} API 키를 풀 수 없습니다. 설정에서 다시 입력해 주세요.")
        found[variable] = keys[provider]

    return found


def masked(*, key: str) -> str:
    return f"…{key[-4:]}" if key else ""


def load() -> tuple[dict, dict]:
    with store.session() as connection:
        row = connection.execute(
            f"SELECT value, {', '.join(PROVIDERS)} FROM user_meta WHERE user_id = ? AND kind = ? AND collected_id = ''",
            (store.USER, KIND),
        ).fetchone()
    if not row:
        return {}, {id: "" for id in PROVIDERS}

    return json.loads(row[0]), {id: decrypt(token=token) for id, token in zip(PROVIDERS, row[1:])}


# #
# command

def edit(*, data: dict) -> dict:
    auths, keys = load()
    for id, given in (data.get("providers") or {}).items():
        if id not in PROVIDERS or not isinstance(given, dict):
            raise ValueError("알 수 없는 제공사입니다.")
        if given.get("auth") is not None:
            if given["auth"] not in AUTHS:
                raise ValueError("인증 방식이 올바르지 않습니다.")
            auths[id] = given["auth"]
        if isinstance(given.get("key"), str) and given["key"].strip():
            keys[id] = given["key"].strip()
        if given.get("key") is None and "key" in given:
            keys[id] = ""
        if auths.get(id) == "api_key" and not keys[id]:
            raise ValueError(f"{PROVIDERS[id]['label']} API 키를 입력해 주세요.")
    with store.session() as connection:
        connection.execute(
            f"""INSERT OR REPLACE INTO user_meta (user_id, kind, collected_id, value, {', '.join(PROVIDERS)}, updated_at)
               VALUES (?, ?, '', ?, {', '.join('?' * len(PROVIDERS))}, ?)""",
            (store.USER, KIND, json.dumps(auths), *[encrypt(key=keys[id]) for id in PROVIDERS], store.now()),
        )

    return get()


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
    assert get()["providers"][0]["auth"] == "subscription"
    edit(data={"providers": {"anthropic": {"auth": "api_key", "key": "sk-test-1234"}}})
    assert get()["providers"][1]["key"] == "…1234"
    assert environment(provider="anthropic")["ANTHROPIC_API_KEY"] == "sk-test-1234"
    with store.session() as connection:
        stored = connection.execute("SELECT anthropic FROM user_meta WHERE kind = ?", (KIND,)).fetchone()[0]
    assert stored and "sk-test" not in stored
    assert oct(KEY_FILE.stat().st_mode & 0o777) == "0o600"
    edit(data={"providers": {"anthropic": {"auth": "subscription"}}})
    assert "ANTHROPIC_API_KEY" not in environment(provider="anthropic")
    assert get()["providers"][1]["key"] == "…1234"
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

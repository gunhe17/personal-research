from __future__ import annotations

import json
import os

from cryptography.fernet import Fernet
from cryptography.fernet import InvalidToken

from usecase.common import store

KEY_FILE = store.API / "database" / "encryption.key"
SECRETS = {"api_key": "api_key", "token": "plan_key"}
MIGRATED = False
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
METHODS = ("subscription", "api_key")
RUNNERS = {"openai": "codex", "anthropic": "claude", "xai": "grok"}


# #
# query

def get() -> dict:
    options, secrets, _, saved = load()
    used = usage()

    return {
        "providers": [
            {
                "id": id,
                **{k: v for k, v in provider.items() if k != "variable"},
                **options[id],
                "saved": saved[id],
                "key": masked(key=secrets[id]["api_key"]),
                "token": masked(key=secrets[id]["token"]),
                "usage": {method: used.get((RUNNERS[id], method), {"month": 0, "last": ""}) for method in METHODS},
            }
            for id, provider in PROVIDERS.items()
        ],
    }


def methods(*, provider: str) -> list[str]:
    options, secrets, broken, _ = load()
    if broken[provider] and options[provider]["enabled"]["api_key"]:
        raise RuntimeError(f"{PROVIDERS[provider]['label']} API 키를 풀 수 없습니다. 설정에서 다시 입력해 주세요.")

    return [
        m for m in options[provider]["order"]
        if options[provider]["enabled"][m] and (m == "subscription" or secrets[provider]["api_key"])
    ]


def environment(*, provider: str, method: str) -> dict:
    variable = PROVIDERS[provider]["variable"]
    _, secrets, _, _ = load()
    found = {k: v for k, v in os.environ.items() if k != variable}
    if method == "api_key":
        found[variable] = secrets[provider]["api_key"]
    elif provider == "anthropic" and secrets[provider]["token"]:
        found["CLAUDE_CODE_OAUTH_TOKEN"] = secrets[provider]["token"]

    return found


def usage() -> dict:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT provider, auth, SUM(started_at >= ?), MAX(started_at) FROM llm
               WHERE auth != '' AND exit_code = 0 GROUP BY provider, auth""",
            (store.now()[:7],),
        ).fetchall()

    return {
        (r[0], r[1]): {"month": r[2] or 0, "last": r[3] or ""} for r in rows
    }


def masked(*, key: str) -> str:
    return f"…{key[-4:]}" if key else ""


def load() -> tuple[dict, dict, dict, dict]:
    migrate()
    kinds = [id for id in PROVIDERS] + [f"{id}_{suffix}" for id in PROVIDERS for suffix in SECRETS.values()]
    with store.session() as connection:
        rows = connection.execute(
            f"SELECT kind, value, secret, updated_at FROM user_meta WHERE user_id = ? AND collected_id = '' AND kind IN ({', '.join('?' * len(kinds))})",
            (store.USER, *kinds),
        ).fetchall()
    found = {r[0]: r[1:] for r in rows}
    options = {id: normalized(given=json.loads(found[id][0]) if id in found else None) for id in PROVIDERS}
    secrets, saved, broken = {}, {}, {}
    for id in PROVIDERS:
        stored = {name: found.get(f"{id}_{suffix}") for name, suffix in SECRETS.items()}
        secrets[id] = {name: decrypt(token=row[1]) if row else "" for name, row in stored.items()}
        saved[id] = {name: row[2] for name, row in stored.items() if row}
        broken[id] = any(row and not secrets[id][name] for name, row in stored.items())

    return options, secrets, broken, saved


def normalized(*, given) -> dict:
    given = {"auth": given} if isinstance(given, str) else given or {}
    order = given.get("order")
    if sorted(order or []) != sorted(METHODS):
        first = given.get("auth") if given.get("auth") in METHODS else "subscription"
        order = [first, *[m for m in METHODS if m != first]]
    enabled = given.get("enabled") if isinstance(given.get("enabled"), dict) else {}
    enabled = {m: enabled.get(m, True) is not False for m in METHODS}

    return {
        "order": ranked(order=order, enabled=enabled),
        "enabled": enabled,
    }


def ranked(*, order: list, enabled: dict) -> list:
    return [m for m in order if enabled[m]] + [m for m in order if not enabled[m]]


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
    options, _, _, _ = load()
    keys = {}
    for id, given in (data.get("providers") or {}).items():
        if id not in PROVIDERS or not isinstance(given, dict):
            raise ValueError("알 수 없는 제공사입니다.")
        if given.get("order") is not None:
            if not isinstance(given["order"], list) or sorted(given["order"]) != sorted(METHODS):
                raise ValueError("순서가 올바르지 않습니다.")
            options[id]["order"] = list(given["order"])
        if given.get("enabled") is not None:
            if not isinstance(given["enabled"], dict) or not all(k in METHODS and isinstance(v, bool) for k, v in given["enabled"].items()):
                raise ValueError("사용 설정이 올바르지 않습니다.")
            options[id]["enabled"].update(given["enabled"])
            if not any(options[id]["enabled"].values()):
                raise ValueError("인증 수단을 하나 이상 켜 주세요.")
        options[id]["order"] = ranked(order=options[id]["order"], enabled=options[id]["enabled"])
        if isinstance(given.get("key"), str) and given["key"].strip():
            keys[id] = given["key"].strip()
        if given.get("key") is None and "key" in given:
            keys[id] = ""
    with store.session() as connection:
        for id in data.get("providers") or {}:
            write(connection=connection, kind=id, value=json.dumps(options[id]), secret="")
        for id, key in keys.items():
            write(connection=connection, kind=f"{id}_api_key", value="{}", secret=encrypt(key=key))

    return get()


def remember(*, provider: str, token: str) -> None:
    with store.session() as connection:
        write(connection=connection, kind=f"{provider}_plan_key", value="{}", secret=encrypt(key=token))


def write(*, connection, kind: str, value: str, secret: str) -> None:
    if kind.endswith(tuple(SECRETS.values())) and not secret:
        connection.execute("DELETE FROM user_meta WHERE user_id = ? AND kind = ? AND collected_id = ''", (store.USER, kind))
        return
    connection.execute(
        "INSERT OR REPLACE INTO user_meta (user_id, kind, collected_id, value, secret, updated_at) VALUES (?, ?, '', ?, ?, ?)",
        (store.USER, kind, value, secret, store.now()),
    )


def migrate() -> None:
    global MIGRATED
    if MIGRATED:
        return
    with store.session() as connection:
        legacy = [c for c in PROVIDERS if c in store.columns(connection=connection, table="user_meta")]
        row = connection.execute(
            f"SELECT value, {', '.join(legacy)} FROM user_meta WHERE user_id = ? AND kind = 'credential' AND collected_id = ''",
            (store.USER,),
        ).fetchone() if legacy else None
        if row:
            saved = json.loads(row[0])
            for id, token in zip(legacy, row[1:]):
                write(connection=connection, kind=id, value=json.dumps(normalized(given=saved.get(id))), secret="")
                for name, value in unpacked(text=decrypt(token=token)).items():
                    write(connection=connection, kind=f"{id}_{SECRETS[name]}", value="{}", secret=encrypt(key=value))
            connection.execute("DELETE FROM user_meta WHERE kind = 'credential'")
        for column in legacy:
            connection.execute(f"ALTER TABLE user_meta DROP COLUMN {column}")
    MIGRATED = True


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
    with store.session() as connection:
        for column in PROVIDERS:
            connection.execute(f"ALTER TABLE user_meta ADD COLUMN {column} TEXT NOT NULL DEFAULT ''")
        connection.execute(
            "INSERT INTO user_meta (user_id, kind, collected_id, value, anthropic, updated_at) VALUES (?, 'credential', '', ?, ?, ?)",
            (store.USER, json.dumps({"anthropic": {"auth": "api_key"}}), encrypt(key=json.dumps({"api_key": "sk-old-1111", "token": "sk-ant-oat01-old-2222"})), store.now()),
        )
    first = {p["id"]: p for p in get()["providers"]}
    assert first["anthropic"]["order"] == ["api_key", "subscription"]
    assert first["anthropic"]["key"] == "…1111" and first["anthropic"]["token"] == "…2222"
    with store.session() as connection:
        assert not {"openai", "anthropic", "xai"} & store.columns(connection=connection, table="user_meta")
        kinds = {r[0] for r in connection.execute("SELECT kind FROM user_meta")}
        stored = connection.execute("SELECT secret FROM user_meta WHERE kind = 'anthropic_api_key'").fetchone()[0]
    assert kinds == {"openai", "anthropic", "xai", "anthropic_api_key", "anthropic_plan_key"}, kinds
    assert stored and "sk-old" not in stored
    assert methods(provider="openai") == ["subscription"] and first["openai"]["key"] == ""
    edit(data={"providers": {"openai": {"key": "sk-test-1234"}}})
    openai = get()["providers"][0]
    assert openai["key"] == "…1234" and openai["saved"]["api_key"]
    assert methods(provider="openai") == ["subscription", "api_key"]
    edit(data={"providers": {"openai": {"order": ["api_key", "subscription"], "enabled": {"subscription": False}}}})
    assert methods(provider="openai") == ["api_key"]
    assert get()["providers"][0]["order"] == ["api_key", "subscription"]
    edit(data={"providers": {"openai": {"enabled": {"subscription": True, "api_key": False}}}})
    assert get()["providers"][0]["order"] == ["subscription", "api_key"]
    assert environment(provider="openai", method="api_key")["CODEX_API_KEY"] == "sk-test-1234"
    remember(provider="anthropic", token="sk-ant-oat01-test-5678")
    found = environment(provider="anthropic", method="subscription")
    assert found["CLAUDE_CODE_OAUTH_TOKEN"] == "sk-ant-oat01-test-5678" and "ANTHROPIC_API_KEY" not in found
    remember(provider="anthropic", token="")
    assert get()["providers"][1]["token"] == ""
    edit(data={"providers": {"openai": {"key": None}}})
    with store.session() as connection:
        assert not connection.execute("SELECT 1 FROM user_meta WHERE kind = 'openai_api_key'").fetchone()
    assert normalized(given="api_key")["order"] == ["api_key", "subscription"]
    assert unpacked(text="sk-legacy") == {"api_key": "sk-legacy", "token": ""}
    with store.session() as connection:
        connection.execute(
            "INSERT INTO llm (id, provider, model, purpose, command, request, response, exit_code, started_at, finished_at, auth) VALUES ('1', 'claude', 'm', 'p', '[]', '', '', 0, ?, ?, 'api_key')",
            (store.now(), store.now()),
        )
    assert get()["providers"][1]["usage"]["api_key"]["month"] == 1
    KEY_FILE.unlink()
    KEY_FILE = folder / "other.key"
    try:
        methods(provider="anthropic")
    except RuntimeError:
        pass
    else:
        raise AssertionError("undecryptable key")
    for broken in (
        {"x": {}},
        {"openai": {"order": ["api_key"]}},
        {"openai": {"enabled": {"subscription": False, "api_key": False}}},
        {"openai": {"enabled": {"plan": True}}},
    ):
        try:
            edit(data={"providers": broken})
        except ValueError:
            continue
        raise AssertionError(broken)
    print("ok")

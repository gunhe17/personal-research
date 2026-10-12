from __future__ import annotations

import json
import os
import re
import shutil
from datetime import datetime
from datetime import timezone
from pathlib import Path

from cryptography.fernet import Fernet
from cryptography.fernet import InvalidToken

from usecase.common import store

KEY_FILE = store.API / "database" / "encryption.key"
HOMES = {
    "openai": ("CODEX_HOME", store.API / "data" / "cli" / "codex"),
    "xai": ("GROK_HOME", store.API / "data" / "cli" / "grok"),
}
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
TYPES = {"plan_key": "Plan login", "api_key": "API key"}
METHOD = re.compile(r"(plan_key|api_key)(_[2-9]|_[1-9][0-9]+)?")
LEGACY = {"subscription": "plan_key", "api_key": "api_key"}
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
                "methods": [
                    {
                        **m,
                        "type": kind(method=m["id"]),
                        "label": label(method=m["id"]),
                        "secret": masked(key=secrets[id].get(m["id"], "")),
                        "saved": saved[id].get(m["id"], ""),
                        "usage": used.get((RUNNERS[id], m["id"]), {"month": 0, "last": ""}),
                    }
                    for m in options[id]
                ],
            }
            for id, provider in PROVIDERS.items()
        ],
    }


def methods(*, provider: str) -> list[str]:
    options, secrets, broken, _ = load()
    usable = []
    for m in options[provider]:
        if not m["enabled"]:
            continue
        if broken[provider].get(m["id"]):
            raise RuntimeError(f"{PROVIDERS[provider]['label']} {label(method=m['id'])} 를 풀 수 없습니다. 설정에서 다시 입력해 주세요.")
        if secrets[provider].get(m["id"]):
            usable.append(m["id"])

    return usable


def environment(*, provider: str, method: str) -> dict:
    variable = PROVIDERS[provider]["variable"]
    found = {k: v for k, v in os.environ.items() if k != variable}
    if provider in HOMES and kind(method=method) == "plan_key":
        found[HOMES[provider][0]] = str(home(provider=provider, method=method))
        sync(provider=provider, method=method)
    _, secrets, _, _ = load()
    value = secrets[provider].get(method, "")
    if kind(method=method) == "api_key":
        found[variable] = value
    elif provider == "anthropic" and value:
        found["CLAUDE_CODE_OAUTH_TOKEN"] = value

    return found


def kind(*, method: str) -> str:
    return "plan_key" if method.startswith("plan_key") else "api_key"


def label(*, method: str) -> str:
    number = method.removeprefix(kind(method=method)).lstrip("_")

    return f"{TYPES[kind(method=method)]} {number}".strip()


def home(*, provider: str, method: str) -> Path:
    return HOMES[provider][1] / store.user() / method


def usage() -> dict:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT provider, auth, SUM(started_at >= ?), MAX(started_at) FROM llm
               WHERE auth != '' AND exit_code = 0 AND user_id = ? GROUP BY provider, auth""",
            (store.now()[:7], store.user()),
        ).fetchall()
    found = {}
    for runner, auth, month, last in rows:
        key = (runner, LEGACY.get(auth, auth))
        before = found.get(key, {"month": 0, "last": ""})
        found[key] = {"month": before["month"] + (month or 0), "last": max(before["last"], last or "")}

    return found


def masked(*, key: str) -> str:
    return f"…{key[-4:]}" if key else ""


def load() -> tuple[dict, dict, dict, dict]:
    migrate()
    with store.session() as connection:
        rows = connection.execute(
            "SELECT kind, value, secret, updated_at FROM user_meta WHERE user_id = ? AND collected_id = ''",
            (store.user(),),
        ).fetchall()
    found = {r[0]: r[1:] for r in rows}
    options, secrets, saved, broken = {}, {}, {}, {}
    for id in PROVIDERS:
        options[id] = normalized(given=json.loads(found[id][0]) if id in found else None)
        secrets[id], saved[id], broken[id] = {}, {}, {}
        for m in options[id]:
            row = found.get(f"{id}_{m['id']}")
            if not row:
                continue
            secrets[id][m["id"]] = decrypt(token=row[1])
            saved[id][m["id"]] = row[2]
            broken[id][m["id"]] = not secrets[id][m["id"]]

    return options, secrets, broken, saved


def normalized(*, given) -> list[dict]:
    given = {"auth": given} if isinstance(given, str) else given or {}
    if isinstance(given.get("methods"), list):
        listed = [
            {"id": m["id"], "enabled": m.get("enabled", True) is not False}
            for m in given["methods"]
            if isinstance(m, dict) and isinstance(m.get("id"), str) and METHOD.fullmatch(m["id"])
        ]
    else:
        order = given.get("order") if sorted(given.get("order") or []) == sorted(LEGACY) else None
        if not order:
            first = given.get("auth") if given.get("auth") in LEGACY else "subscription"
            order = [first, *[m for m in LEGACY if m != first]]
        enabled = given.get("enabled") if isinstance(given.get("enabled"), dict) else {}
        listed = [{"id": LEGACY[m], "enabled": enabled.get(m, True) is not False} for m in order]
    unique = list({m["id"]: m for m in listed}.values()) or [{"id": "plan_key", "enabled": True}, {"id": "api_key", "enabled": True}]

    return ranked(methods=unique)


def ranked(*, methods: list) -> list:
    return [m for m in methods if m["enabled"]] + [m for m in methods if not m["enabled"]]


def unpacked(*, text: str) -> dict:
    try:
        found = json.loads(text) if text else {}
    except json.JSONDecodeError:
        found = {"api_key": text}
    found = found if isinstance(found, dict) else {"api_key": text}

    return {"api_key": found.get("api_key") or "", "plan_key": found.get("token") or ""}


# #
# command

def edit(*, data: dict) -> dict:
    options, _, _, _ = load()
    keys, removed = {}, []
    for id, given in (data.get("providers") or {}).items():
        if id not in PROVIDERS or not isinstance(given, dict):
            raise ValueError("알 수 없는 제공사입니다.")
        current = {m["id"]: m for m in options[id]}
        if given.get("add") is not None:
            if given["add"] not in TYPES:
                raise ValueError("추가할 수 없는 인증 수단입니다.")
            number = 1
            while (f"{given['add']}_{number}" if number > 1 else given["add"]) in current:
                number += 1
            added = f"{given['add']}_{number}" if number > 1 else given["add"]
            current[added] = {"id": added, "enabled": True}
            options[id] = [*options[id], current[added]]
        if given.get("remove") is not None:
            if given["remove"] not in current or len(current) == 1:
                raise ValueError("지울 수 없는 인증 수단입니다.")
            options[id] = [m for m in options[id] if m["id"] != given["remove"]]
            removed.append((id, given["remove"]))
            current.pop(given["remove"])
        if given.get("order") is not None:
            if not isinstance(given["order"], list) or sorted(given["order"]) != sorted(current):
                raise ValueError("순서가 올바르지 않습니다.")
            options[id] = [current[m] for m in given["order"]]
        if given.get("enabled") is not None:
            if not isinstance(given["enabled"], dict) or not all(k in current and isinstance(v, bool) for k, v in given["enabled"].items()):
                raise ValueError("사용 설정이 올바르지 않습니다.")
            for k, v in given["enabled"].items():
                current[k]["enabled"] = v
        if not any(m["enabled"] for m in options[id]):
            raise ValueError("인증 수단을 하나 이상 켜 주세요.")
        options[id] = ranked(methods=options[id])
        for method, value in (given.get("keys") or {}).items():
            if method not in current or kind(method=method) != "api_key" or not (value is None or isinstance(value, str)):
                raise ValueError("API 키를 넣을 수 없는 수단입니다.")
            keys[(id, method)] = (value or "").strip()
    with store.session() as connection:
        for id in data.get("providers") or {}:
            write(connection=connection, kind=id, value=json.dumps({"methods": options[id]}), secret="")
        for (id, method), key in keys.items():
            write(connection=connection, kind=f"{id}_{method}", value="{}", secret=encrypt(key=key))
        for id, method in removed:
            write(connection=connection, kind=f"{id}_{method}", value="{}", secret="")
    for id, method in removed:
        if id in HOMES:
            shutil.rmtree(home(provider=id, method=method), ignore_errors=True)

    return get()


def remember(*, provider: str, method: str, token: str) -> None:
    with store.session() as connection:
        write(connection=connection, kind=f"{provider}_{method}", value="{}", secret=encrypt(key=token))


def sync(*, provider: str, method: str) -> None:
    if provider not in HOMES:
        return
    folder = home(provider=provider, method=method)
    folder.mkdir(parents=True, exist_ok=True)
    folder.chmod(0o700)
    path = folder / "auth.json"
    _, secrets, _, saved = load()
    token = secrets[provider].get(method, "")
    content = path.read_text(encoding="utf-8") if path.is_file() else ""
    if content == token:
        return
    changed = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(timespec="seconds") if content else ""
    if content and (not token or changed > saved[provider].get(method, "")):
        return remember(provider=provider, method=method, token=content)
    if token:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as file:
            file.write(token)


def write(*, connection, kind: str, value: str, secret: str) -> None:
    if kind not in PROVIDERS and not secret:
        connection.execute("DELETE FROM user_meta WHERE user_id = ? AND kind = ? AND collected_id = ''", (store.user(), kind))
        return
    connection.execute(
        "INSERT OR REPLACE INTO user_meta (user_id, kind, collected_id, value, secret, updated_at) VALUES (?, ?, '', ?, ?, ?)",
        (store.user(), kind, value, secret, store.now()),
    )


def migrate() -> None:
    global MIGRATED
    if MIGRATED:
        return
    with store.session() as connection:
        legacy = [c for c in PROVIDERS if c in store.columns(connection=connection, table="user_meta")]
        row = connection.execute(
            f"SELECT value, {', '.join(legacy)} FROM user_meta WHERE user_id = ? AND kind = 'credential' AND collected_id = ''",
            (store.user(),),
        ).fetchone() if legacy else None
        if row:
            saved = json.loads(row[0])
            for id, token in zip(legacy, row[1:]):
                write(connection=connection, kind=id, value=json.dumps({"methods": normalized(given=saved.get(id))}), secret="")
                for method, value in unpacked(text=decrypt(token=token)).items():
                    write(connection=connection, kind=f"{id}_{method}", value="{}", secret=encrypt(key=value))
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

    folder = Path(tempfile.mkdtemp())
    store.DATABASE = folder / "check.db"
    KEY_FILE = folder / "encryption.key"
    HOMES = {"openai": ("CODEX_HOME", folder / "codex")}
    with store.session() as connection:
        for column in PROVIDERS:
            connection.execute(f"ALTER TABLE user_meta ADD COLUMN {column} TEXT NOT NULL DEFAULT ''")
        connection.execute(
            "INSERT INTO user_meta (user_id, kind, collected_id, value, anthropic, updated_at) VALUES (?, 'credential', '', ?, ?, ?)",
            (store.user(), json.dumps({"anthropic": {"auth": "api_key"}}), encrypt(key=json.dumps({"api_key": "sk-old-1111", "token": "sk-ant-oat01-old-2222"})), store.now()),
        )
    by = lambda: {p["id"]: p for p in get()["providers"]}
    ids = lambda provider: [m["id"] for m in by()[provider]["methods"]]
    first = by()
    assert [m["id"] for m in first["anthropic"]["methods"]] == ["api_key", "plan_key"]
    assert {m["id"]: m["secret"] for m in first["anthropic"]["methods"]} == {"api_key": "…1111", "plan_key": "…2222"}
    with store.session() as connection:
        assert not set(PROVIDERS) & store.columns(connection=connection, table="user_meta")
        stored = connection.execute("SELECT secret FROM user_meta WHERE kind = 'anthropic_api_key'").fetchone()[0]
    assert stored and "sk-old" not in stored
    assert normalized(given={"order": ["subscription", "api_key"], "enabled": {"api_key": False}}) == [{"id": "plan_key", "enabled": True}, {"id": "api_key", "enabled": False}]
    assert normalized(given={"methods": [{"id": "plan_key"}, {"id": "../x"}, {"id": "api_key_2", "enabled": False}]}) == [{"id": "plan_key", "enabled": True}, {"id": "api_key_2", "enabled": False}]
    assert label(method="plan_key") == "Plan login" and label(method="plan_key_2") == "Plan login 2"
    assert methods(provider="openai") == []
    edit(data={"providers": {"openai": {"add": "plan_key"}}})
    edit(data={"providers": {"openai": {"add": "api_key"}}})
    assert ids("openai") == ["plan_key", "api_key", "plan_key_2", "api_key_2"], ids("openai")
    edit(data={"providers": {"openai": {"keys": {"api_key_2": "sk-two-2222"}}}})
    assert methods(provider="openai") == ["api_key_2"]
    assert environment(provider="openai", method="api_key_2")["CODEX_API_KEY"] == "sk-two-2222"
    assert environment(provider="openai", method="plan_key_2")["CODEX_HOME"] == str(folder / "codex" / store.USER / "plan_key_2")
    edit(data={"providers": {"openai": {"order": ["api_key_2", "plan_key", "api_key", "plan_key_2"], "enabled": {"plan_key": False}}}})
    assert ids("openai") == ["api_key_2", "api_key", "plan_key_2", "plan_key"]
    (folder / "codex" / store.USER / "plan_key_2" / "auth.json").write_text('{"tokens": "login-2"}')
    environment(provider="openai", method="plan_key_2")
    assert {m["id"]: m["secret"] for m in by()["openai"]["methods"]}["plan_key_2"] == "…-2\"}"
    (folder / "codex" / store.USER / "plan_key_2" / "auth.json").unlink()
    environment(provider="openai", method="plan_key_2")
    assert (folder / "codex" / store.USER / "plan_key_2" / "auth.json").read_text() == '{"tokens": "login-2"}'
    assert oct((folder / "codex" / store.USER / "plan_key_2" / "auth.json").stat().st_mode & 0o777) == "0o600"
    edit(data={"providers": {"openai": {"remove": "plan_key_2"}}})
    assert "plan_key_2" not in ids("openai") and not (folder / "codex" / store.USER / "plan_key_2").exists()
    with store.session() as connection:
        assert not connection.execute("SELECT 1 FROM user_meta WHERE kind = 'openai_plan_key_2'").fetchone()
    remember(provider="anthropic", method="plan_key", token="sk-ant-oat01-test-5678")
    found = environment(provider="anthropic", method="plan_key")
    assert found["CLAUDE_CODE_OAUTH_TOKEN"] == "sk-ant-oat01-test-5678" and "ANTHROPIC_API_KEY" not in found
    with store.session() as connection:
        connection.execute(
            "INSERT INTO llm (id, provider, model, purpose, command, request, response, exit_code, started_at, finished_at, auth) VALUES ('1', 'claude', 'm', 'p', '[]', '', '', 0, ?, ?, 'subscription')",
            (store.now(), store.now()),
        )
    assert {m["id"]: m["usage"]["month"] for m in by()["anthropic"]["methods"]}["plan_key"] == 1
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
        {"xai": {"order": ["api_key"]}},
        {"xai": {"enabled": {"plan_key": False, "api_key": False}}},
        {"xai": {"add": "token"}},
        {"xai": {"keys": {"plan_key": "x"}}},
        {"xai": {"remove": "nope"}},
    ):
        try:
            edit(data={"providers": broken})
        except ValueError:
            continue
        raise AssertionError(broken)
    print("ok")

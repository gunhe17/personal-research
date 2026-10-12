from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import shutil
import uuid
from datetime import datetime, timedelta, timezone

from usecase.common import store

DAYS = 30
ROLES = ("admin", "user")
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# #
# account

def create(*, email: str, name: str = "", password: str = "", role: str = "user") -> dict:
    email = email.strip().lower()
    issued = "" if password else secrets.token_urlsafe(12)
    password = password or issued
    if not EMAIL.match(email) or len(password) < 8 or role not in ROLES:
        raise ValueError("이메일과 8자 이상의 비밀번호가 필요합니다.")
    name = name.strip() or email.split("@")[0]
    with store.session() as connection:
        if connection.execute("SELECT 1 FROM user WHERE email = ? AND password != ''", (email,)).fetchone():
            raise ValueError(f"이미 있는 이메일입니다: {email}")
        unclaimed = connection.execute("SELECT id FROM user WHERE id = ? AND password = ''", (store.USER,)).fetchone()
        id = store.USER if unclaimed else str(uuid.uuid4())
        connection.execute(
            "INSERT OR REPLACE INTO user (id, name, created_at, password, email, role) VALUES (?, ?, ?, ?, ?, ?)",
            (id, name, store.now(), hashed(password=password), email, role),
        )

    return {"id": id, "name": name, "email": email, "role": role, "password": issued}


def listed() -> list[dict]:
    with store.session() as connection:
        rows = connection.execute("SELECT id, name, email, role, created_at FROM user WHERE password != '' ORDER BY created_at").fetchall()

    return [
        {"id": id, "name": name, "email": email, "role": role, "created_at": created_at} for id, name, email, role, created_at in rows
    ]


def remove(*, user_id: str, by: str) -> None:
    if user_id == by:
        raise ValueError("자기 계정은 지울 수 없습니다.")
    with store.session() as connection:
        removed = connection.execute("DELETE FROM user WHERE id = ? AND password != ''", (user_id,)).rowcount
        if not removed:
            raise ValueError("없는 사용자입니다.")
        connection.execute("DELETE FROM user_session WHERE user_id = ?", (user_id,))
        connection.execute("DELETE FROM user_meta WHERE user_id = ?", (user_id,))
    for home in store.CLI.glob("*"):
        shutil.rmtree(home / user_id, ignore_errors=True)


def change_password(*, user_id: str, password: str) -> None:
    if len(password) < 8:
        raise ValueError("새 비밀번호는 8자 이상이어야 합니다.")
    with store.session() as connection:
        connection.execute("UPDATE user SET password = ? WHERE id = ? AND password != ''", (hashed(password=password), user_id))


def reset(*, email: str, password: str) -> None:
    email = email.strip().lower()
    if len(password) < 8:
        raise ValueError("8자 이상의 비밀번호가 필요합니다.")
    with store.session() as connection:
        changed = connection.execute("UPDATE user SET password = ? WHERE email = ? AND password != ''", (hashed(password=password), email)).rowcount
        connection.execute("DELETE FROM user_session WHERE user_id IN (SELECT id FROM user WHERE email = ?)", (email,))
    if not changed:
        raise ValueError(f"없는 사용자입니다: {email}")


def verify(*, email: str, password: str) -> dict | None:
    with store.session() as connection:
        row = connection.execute("SELECT id, name, email, role, password FROM user WHERE email = ? AND password != ''", (email.strip().lower(),)).fetchone()
    if row is None or not matches(password=password, stored=row[4]):
        return None

    return {"id": row[0], "name": row[1], "email": row[2], "role": row[3]}


# #
# session

def open_session(*, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(days=DAYS)).isoformat(timespec="seconds")
    with store.session() as connection:
        connection.execute(
            "INSERT INTO user_session (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (digest(token=token), user_id, store.now(), expires),
        )

    return token


def resolve(*, token: str) -> dict | None:
    if not token:
        return None
    with store.session() as connection:
        row = connection.execute(
            """SELECT user.id, user.name, user.email, user.role FROM user_session JOIN user ON user.id = user_session.user_id
               WHERE user_session.token = ? AND user_session.expires_at > ? AND user.password != ''""",
            (digest(token=token), store.now()),
        ).fetchone()

    return {"id": row[0], "name": row[1], "email": row[2], "role": row[3]} if row else None


def close_session(*, token: str) -> None:
    with store.session() as connection:
        connection.execute("DELETE FROM user_session WHERE token = ?", (digest(token=token),))


# #
# hash

def hashed(*, password: str) -> str:
    salt = secrets.token_bytes(16)
    key = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)

    return f"scrypt${salt.hex()}${key.hex()}"


def matches(*, password: str, stored: str) -> bool:
    try:
        _, salt, key = stored.split("$")
    except ValueError:
        return False
    found = hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt), n=2**14, r=8, p=1)

    return hmac.compare_digest(found.hex(), key)


def digest(*, token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# #
# check

if __name__ == "__main__":
    import tempfile
    from pathlib import Path

    store.DATABASE = Path(tempfile.mkdtemp()) / "check.db"
    store.CURRENT.set(store.USER)
    first = create(email="Gunhee@Example.com", password="correct horse", role="admin")
    assert first["id"] == store.USER and first["email"] == "gunhee@example.com" and first["password"] == ""
    second = create(email="friend@example.com", name="Friend", password="another pass")
    assert second["id"] != store.USER and second["role"] == "user"
    issued = create(email="new@example.com", name="New")
    assert len(issued["password"]) >= 16 and verify(email="new@example.com", password=issued["password"])["name"] == "New"
    change_password(user_id=issued["id"], password="my own pass")
    assert verify(email="new@example.com", password="my own pass")
    try:
        change_password(user_id=issued["id"], password="short")
    except ValueError:
        pass
    else:
        raise AssertionError("short password")
    for email, password in (("friend@example.com", "whatever123"), ("not-an-email", "whatever123"), ("short@example.com", "short")):
        try:
            create(email=email, password=password)
        except ValueError:
            pass
        else:
            raise AssertionError(email)
    assert verify(email=" GUNHEE@example.com", password="correct horse")["role"] == "admin"
    assert verify(email="gunhee@example.com", password="wrong password") is None
    token = open_session(user_id=second["id"])
    assert resolve(token=token)["email"] == "friend@example.com"
    reset(email="friend@example.com", password="new password!")
    assert resolve(token=token) is None
    token = open_session(user_id=second["id"])
    close_session(token=token)
    assert resolve(token=token) is None
    assert [u["email"] for u in listed()] == ["gunhee@example.com", "friend@example.com", "new@example.com"]
    for user_id in (store.USER, "missing"):
        try:
            remove(user_id=user_id, by=store.USER)
        except ValueError:
            pass
        else:
            raise AssertionError(user_id)
    remove(user_id=issued["id"], by=store.USER)
    assert verify(email="new@example.com", password="my own pass") is None
    print("ok")

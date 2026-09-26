from __future__ import annotations

import sys

from usecase.common import store


# #
# write

def write(*, level: str, message: str) -> None:
    print(f"[{store.now()}] {level} {message}", file=sys.stderr)
    try:
        with store.session() as connection:
            connection.execute(
                "INSERT INTO log (created_at, level, message) VALUES (?, ?, ?)",
                (store.now(), level, message),
            )
    except Exception as error:
        print(f"[{store.now()}] error 로그를 남기지 못했다: {error}", file=sys.stderr)


# #
# read

def recent(*, limit: int = 50, level: str | None = None) -> list[str]:
    with store.session() as connection:
        rows = connection.execute(
            """SELECT created_at, level, message FROM log
               WHERE (? IS NULL OR level = ?)
               ORDER BY id DESC LIMIT ?""",
            (level, level, limit),
        ).fetchall()

    return [
        f"{created_at}  {found:5}  {message}" for created_at, found, message in reversed(rows)
    ]

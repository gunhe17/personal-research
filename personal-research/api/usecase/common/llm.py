from __future__ import annotations

import json
import uuid

from usecase.common import store


# #
# record

def record(
    *,
    provider: str,
    model: str,
    purpose: str,
    owner_id: str,
    command: list[str],
    request: str,
    response: str,
    stderr: str,
    exit_code: int | None,
    started_at: str,
    auth: str = "",
) -> str:
    id = str(uuid.uuid4())
    with store.session() as connection:
        connection.execute(
            """INSERT INTO llm (id, provider, model, purpose, owner_id, command, request, response, stderr, exit_code, started_at, finished_at, auth, user_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                id,
                provider,
                model,
                purpose,
                owner_id,
                json.dumps(command, ensure_ascii=False),
                request,
                response,
                stderr,
                exit_code,
                started_at,
                store.now(),
                auth,
                store.user(),
            ),
        )

    return id

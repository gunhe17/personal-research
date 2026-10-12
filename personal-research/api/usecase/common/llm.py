from __future__ import annotations

import json
import uuid

from usecase.common import agent
from usecase.common import store
from usecase.setting.record import record as settings


# #
# call

def call(
    *,
    provider: str,
    model: str,
    purpose: str,
    owner_id: str,
    method: str,
    command: list[str],
    request: str,
    cwd: str,
    stdin: str,
    timeout: int,
) -> tuple[int, str, str]:
    started_at = store.now()
    exit_code, stdout, stderr = -1, "", ""
    try:
        exit_code, stdout, stderr = agent.run(
            id=owner_id,
            command=command,
            cwd=cwd,
            env=settings.environment(provider=provider, method=method),
            stdin=stdin,
            timeout=timeout,
        )
    finally:
        if settings.kind(method=method) == "plan_key":
            settings.sync(provider=provider, method=method)
        record(
            provider=settings.RUNNERS[provider],
            model=model,
            purpose=purpose,
            owner_id=owner_id,
            command=command,
            request=request,
            response=stdout or "",
            stderr=stderr or "",
            exit_code=exit_code,
            started_at=started_at,
            auth=method,
        )

    return exit_code, stdout or "", stderr or ""


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

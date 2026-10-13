from __future__ import annotations

import contextvars
import threading
import time
import uuid

from usecase.collected.collect import pipeline
from usecase.collected.record import record as documents
from usecase.common import log
from usecase.common import store
from usecase.conversation.record import record as conversations

JOBS: dict[str, dict] = {}
TURN = threading.Lock()
KEPT = 30


# #
# command

def start(*, input: str) -> dict:
    given = input.strip()
    if not given:
        raise ValueError("input 이 비어 있습니다.")
    job = {
        "id": str(uuid.uuid4()),
        "user_id": store.user(),
        "input": given,
        "state": "queued",
        "events": [],
        "path": "",
        "collected_id": "",
        "conversation_id": "",
        "created_at": store.now(),
        "finished_at": "",
    }
    JOBS[job["id"]] = job
    for old in [j["id"] for j in listed() if j["state"] in ("done", "failed")][KEPT:]:
        JOBS.pop(old, None)
    threading.Thread(target=contextvars.copy_context().run, args=(run,), kwargs={"job": job}, daemon=True).start()

    return job


def listed() -> list[dict]:
    return sorted((j for j in JOBS.values() if j["user_id"] == store.user()), key=lambda j: j["created_at"], reverse=True)


def get(*, id: str) -> dict | None:
    job = JOBS.get(id)

    return job if job and job["user_id"] == store.user() else None


# #
# run

def run(*, job: dict) -> None:
    with TURN:
        job["state"] = "running"
        try:
            collecting(job=job)
        except Exception as error:
            log.write(level="error", message=f"collect {job['input']} {error}")
            note(job=job, event={"type": "error", "error": str(error)})
        job["state"] = "done" if job["collected_id"] else "failed"
        job["finished_at"] = store.now()


def collecting(*, job: dict) -> None:
    started = conversations.create(domain="agent", data={})
    question = conversations.ask(domain="agent", id=started["id"], data={"content": job["input"], "kind": "collect", "status": "completed"})
    job["conversation_id"] = started["id"]
    outcome = {}

    def forward(event: dict) -> None:
        if event.get("type") in ("done", "error"):
            outcome.update(event)
        if event.get("type") == "collected":
            job["collected_id"], job["path"] = event["id"], event["path"]
        note(job=job, event=event)

    try:
        pipeline.run(input=job["input"], send=forward)
    finally:
        if conversations.get(domain="agent", id=started["id"]) is not None:
            if outcome.get("id"):
                conversations.edit(domain="agent", id=started["id"], data={"collected_id": outcome["id"]})
            conversations.add(domain="agent", id=started["id"], message={
                "id": str(uuid.uuid4()),
                "role": "assistant",
                "kind": "collect",
                "context": {"steps": job["events"]},
                "question_id": question["id"],
                "content": outcome.get("text") or outcome.get("error") or "수집을 마치지 못했습니다.",
                "sources": [{"id": outcome["id"], "path": documents.path_of(id=outcome["id"])}] if outcome.get("id") else None,
                "created_at": store.now(),
            })


def note(*, job: dict, event: dict) -> None:
    job["events"].append({**event, "at": int(time.time() * 1000)})

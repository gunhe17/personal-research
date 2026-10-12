from __future__ import annotations

from typing import Callable

from usecase.collected.check import check
from usecase.collected.collect import collect
from usecase.collected.translate import translate
from usecase.common import store

KIND_LABEL = {
    "paper": "arXiv paper",
    "x": "X article",
    "repo": "GitHub repository card",
    "repo-doc": "GitHub document",
    "video": "YouTube transcript",
    "web": "Web document",
    "existing": "Already collected",
}


# #
# run

def run(*, input: str, send: Callable[[dict], None], model: dict | None = None) -> None:
    report = stepper(send=send)

    report(key="detect", text="Reading the input", state="running")
    try:
        kind = collect.detect(input=input)
    except ValueError as error:
        report(key="detect", text=str(error), state="error")
        send({"type": "done", "text": "Nothing was collected."})
        return
    report(key="detect", text=f"Detected {KIND_LABEL.get(kind, kind)}", state="done")

    report(key="fetch", text="Fetching the original", state="running")
    try:
        id = collect.dispatch(kind=kind, input=input)
    except Exception as error:
        report(key="fetch", text=f"Fetch failed: {error}", state="error")
        send({"type": "done", "text": "Nothing was collected."})
        return

    path = store.path_of(id=id)
    edition = store.version(id=id, language="eng")
    size = len(store.read(id=id, language="eng")) if kind != "repo" else 0
    report(
        key="fetch",
        text=fetched(kind=kind, edition=edition, size=size),
        state="done",
        path=path,
        id=id,
    )
    send({"type": "collected", "id": id, "path": path, "kind": kind})

    if not translatable(kind=kind, path=path, report=report):
        finish(send=send, path=path, id=id, report=report)
        return
    if store.version(id=id, language="kor") == edition:
        report(key="translate", text="Korean translation is already up to date", state="skip")
        finish(send=send, path=path, id=id, report=report)
        return
    if not translate.available(model=model):
        report(key="translate", text="Skipped, the model CLI was not found", state="skip")
        finish(send=send, path=path, id=id, report=report)
        return

    report(key="translate", text=f"Translating to Korean with {(model or {}).get('model') or 'Claude'}", state="running")
    try:
        translate.korean(id=id, model=model)
    except Exception as error:
        report(key="translate", text=f"Translation failed: {error}", state="error")
        finish(send=send, path=path, id=id, report=report)
        return
    report(
        key="translate",
        text=f"Korean {len(store.read(id=id, language='kor')):,} chars",
        state="done",
    )
    finish(send=send, path=path, id=id, report=report)


def translatable(*, kind: str, path: str, report) -> bool:
    if kind == "repo":
        report(key="translate", text="Repository cards are not translated", state="skip")
        return False
    if path.endswith(".html"):
        report(
            key="translate",
            text="Paper HTML needs segmented translation, continue with /collect",
            state="skip",
        )
        return False

    return True


def finish(*, send, path: str, id: str, report) -> None:
    report(key="check", text="Checking consistency", state="running")
    problems, english, korean = check.run()
    report(
        key="check",
        text=f"{english:,} originals, {korean:,} translations, {len(problems)} problems",
        state="done" if not problems else "error",
    )
    send({"type": "done", "text": f"`{path}`", "id": id})


def fetched(*, kind: str, edition: int, size: int) -> str:
    if kind == "repo":
        return "Saved the repository card"
    if edition == 1:
        return f"New document, {size:,} chars"

    return f"Upstream changed, now v{edition}. {size:,} chars"


def stepper(*, send: Callable[[dict], None]):
    def report(*, key: str, text: str, state: str, **extra) -> None:
        send({"type": "step", "key": key, "text": text, "state": state, **extra})

    return report

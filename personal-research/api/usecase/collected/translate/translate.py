from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from usecase.collected.collect.type import paper
from usecase.collected.collect.type import x
from usecase.common import llm
from usecase.common import store
from usecase.setting.record import record as setting


# #
# handoff

def dump(*, reference: str, file: str, language: str) -> str:
    id = store.resolve(text=reference)
    store.write_file(path=Path(file), text=store.read(id=id, language=language))

    return file


def load(*, reference: str, file: str, language: str) -> str:
    id = store.resolve(text=reference)
    body = Path(file).read_text(encoding="utf-8")
    if language == "kor" and store.path_of(id=id).startswith("docs/x/"):
        x.verify(source=store.read(id=id, language="eng"), translated=body)

    return store.save(id=id, language=language, body=body)


# #
# segment

def extract(*, reference: str, segments: str) -> str:
    id = store.resolve(text=reference)
    paper.extract(body=store.read(id=id, language="eng"), segments=Path(segments))

    return segments


def inject(*, reference: str, segments: str, language: str) -> str:
    id = store.resolve(text=reference)
    body = paper.inject(body=store.read(id=id, language="eng"), segments=Path(segments))

    return store.save(id=id, language=language, body=body)


# #
# agent

CLAUDE = os.environ.get("CLAUDE_BIN") or shutil.which("claude") or str(Path.home() / ".local" / "bin" / "claude")
RULES = store.API.parent.parent / ".claude" / "agents" / "translator.md"


def available() -> bool:
    return Path(CLAUDE).is_file() or bool(shutil.which("claude"))


def rules() -> str:
    if not RULES.is_file():
        return "영어 문서를 한국어로 옮긴다. 블록 구조를 원문과 그대로 맞춘다."
    text = RULES.read_text(encoding="utf-8")

    return text.split("---", 2)[-1].strip()


def korean(*, id: str) -> str:
    if not available():
        raise RuntimeError("claude CLI not found")
    body = store.read(id=id, language="eng")
    with tempfile.TemporaryDirectory() as folder:
        work = Path(folder)
        (work / "doc.md").write_text(body, encoding="utf-8")
        request = f"{rules()}\n\n번역: {work / 'doc.md'} → {work / 'doc.ko.md'}"
        command = [
            CLAUDE if Path(CLAUDE).exists() else "claude",
            "-p", request,
            "--allowed-tools", "Read,Write",
            "--permission-mode", "acceptEdits",
        ]
        started_at = store.now()
        done = subprocess.run(command, cwd=folder, capture_output=True, text=True, timeout=1800, env=setting.environment(provider="anthropic"))
        llm.record(
            provider="claude",
            model="",
            purpose="translate",
            owner_id=id,
            command=command,
            request=request,
            response=done.stdout,
            stderr=done.stderr,
            exit_code=done.returncode,
            started_at=started_at,
        )
        target = work / "doc.ko.md"
        if not target.is_file():
            raise RuntimeError(f"No translation produced: {done.stderr.strip()[-300:] or done.stdout.strip()[-300:]}")
        translated = target.read_text(encoding="utf-8")
    if store.path_of(id=id).startswith("docs/x/"):
        x.verify(source=body, translated=translated)

    return store.save(id=id, language="kor", body=translated)

from __future__ import annotations

import shutil
from pathlib import Path

from usecase.collected.collect.type import paper
from usecase.collected.collect.type import x
from usecase.collected.record import record as documents
from usecase.common import agent
from usecase.common import llm
from usecase.common import store
from usecase.setting.record import record as settings


# #
# handoff

def dump(*, reference: str, file: str, language: str) -> str:
    id = documents.resolve(text=reference)
    documents.write_file(path=Path(file), text=documents.read(id=id, language=language))

    return file


def load(*, reference: str, file: str, language: str) -> str:
    id = documents.resolve(text=reference)
    body = Path(file).read_text(encoding="utf-8")
    if language == "kor" and documents.path_of(id=id).startswith("document/x/"):
        x.verify(source=documents.read(id=id, language="eng"), translated=body)

    return documents.save(id=id, language=language, content=body)


# #
# segment

def extract(*, reference: str, segments: str) -> str:
    id = documents.resolve(text=reference)
    paper.extract(body=documents.read(id=id, language="eng"), segments=Path(segments))

    return segments


def inject(*, reference: str, segments: str, language: str) -> str:
    id = documents.resolve(text=reference)
    body = paper.inject(body=documents.read(id=id, language="eng"), segments=Path(segments))

    return documents.save(id=id, language=language, content=body)


# #
# agent

CLAUDE = agent.BINARIES["claude"]
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
    body = documents.read(id=id, language="eng")
    with agent.workspace(prefix="translate-") as folder:
        work = Path(folder)
        (work / "doc.md").write_text(body, encoding="utf-8")
        request = f"{rules()}\n\n번역: {work / 'doc.md'} → {work / 'doc.ko.md'}"
        command = [
            agent.binary(runner="claude"),
            "-p", request,
            "--allowed-tools", "Read,Write",
            "--permission-mode", "acceptEdits",
            "--disallowedTools", "Bash", "WebFetch", "WebSearch",
        ]
        usable = settings.methods(provider="anthropic")
        if not usable:
            raise RuntimeError("Anthropic 에 쓸 수 있는 인증이 없습니다. 설정에서 Claude 로 로그인하거나 API 키를 넣어 주세요.")
        exit_code, stdout, stderr = llm.call(
            provider="anthropic",
            model="",
            purpose="translate",
            owner_id=id,
            method=usable[0],
            command=command,
            request=request,
            cwd=folder,
            stdin="",
            timeout=1800,
        )
        target = work / "doc.ko.md"
        if not target.is_file():
            raise RuntimeError(f"No translation produced: {stderr.strip()[-300:] or stdout.strip()[-300:]}")
        translated = target.read_text(encoding="utf-8")
    if documents.path_of(id=id).startswith("document/x/"):
        x.verify(source=body, translated=translated)

    return documents.save(id=id, language="kor", content=translated)

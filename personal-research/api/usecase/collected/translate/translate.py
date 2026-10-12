from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

from usecase.collected.collect.type import paper
from usecase.collected.collect.type import x
from usecase.common import agent
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

BINARIES = {
    "anthropic": os.environ.get("CLAUDE_BIN") or shutil.which("claude") or str(Path.home() / ".local" / "bin" / "claude"),
    "openai": os.environ.get("CODEX_BIN") or shutil.which("codex") or "codex",
    "xai": os.environ.get("GROK_BIN") or shutil.which("grok") or str(Path.home() / ".grok" / "bin" / "grok"),
}
RULES = store.API.parent.parent / ".claude" / "agents" / "translator.md"


def available(*, model: dict | None = None) -> bool:
    binary = BINARIES[chosen(model=model)[0]]

    return Path(binary).is_file() or bool(shutil.which(Path(binary).name))


def rules() -> str:
    if not RULES.is_file():
        return "영어 문서를 한국어로 옮긴다. 블록 구조를 원문과 그대로 맞춘다."
    text = RULES.read_text(encoding="utf-8")

    return text.split("---", 2)[-1].strip()


def korean(*, id: str, model: dict | None = None) -> str:
    provider, name = chosen(model=model)
    body = store.read(id=id, language="eng")
    failures = []
    for method in setting.methods(provider=provider):
        try:
            translated = RUNNERS[provider](id=id, body=body, model=name, method=method)
            break
        except RuntimeError as error:
            failures.append(f"{setting.label(method=method)}: {error}")
    else:
        raise RuntimeError(" / ".join(failures) or f"{setting.PROVIDERS[provider]['label']} 에 쓸 수 있는 인증이 없습니다.")
    if store.path_of(id=id).startswith("docs/x/"):
        x.verify(source=body, translated=translated)

    return store.save(id=id, language="kor", body=translated)


def chosen(*, model: dict | None) -> tuple[str, str]:
    provider = (model or {}).get("provider") or ""
    known = setting.PROVIDERS.get(provider, {}).get("models", [])
    if any(m["id"] == (model or {}).get("model") for m in known):
        return provider, model["model"]

    return "anthropic", ""


# #
# runners

def claude(*, id: str, body: str, model: str, method: str) -> str:
    with agent.workspace(prefix="translate-") as folder:
        work = Path(folder)
        (work / "doc.md").write_text(body, encoding="utf-8")
        request = f"{rules()}\n\n번역: {work / 'doc.md'} → {work / 'doc.ko.md'}"
        command = [
            BINARIES["anthropic"],
            "-p", request,
            *(["--model", model] if model else []),
            "--allowed-tools", "Read,Write",
            "--permission-mode", "acceptEdits",
            "--disallowedTools", "Bash", "WebFetch", "WebSearch",
        ]
        stdout, stderr = call(id=id, provider="claude", model=model, method=method, command=command, cwd=folder, request=request, stdin="")
        target = work / "doc.ko.md"
        if not target.is_file():
            raise RuntimeError(f"No translation produced: {stderr.strip()[-300:] or stdout.strip()[-300:]}")

        return target.read_text(encoding="utf-8")


def codex(*, id: str, body: str, model: str, method: str) -> str:
    with agent.workspace(prefix="translate-") as folder:
        output = Path(folder) / "doc.ko.md"
        request = printed(body=body)
        command = [
            BINARIES["openai"], "-a", "never", "exec", "-s", "read-only",
            "--skip-git-repo-check",
            "-c", "features.shell_tool=false",
            "-c", "features.unified_exec=false",
            "-m", model,
            "-o", str(output),
            "-",
        ]
        stdout, stderr = call(id=id, provider="codex", model=model, method=method, command=command, cwd=folder, request=request, stdin=request)
        if not output.is_file() or not output.read_text(encoding="utf-8").strip():
            raise RuntimeError(f"No translation produced: {stderr.strip()[-300:] or stdout.strip()[-300:]}")

        return output.read_text(encoding="utf-8").strip() + "\n"


def grok(*, id: str, body: str, model: str, method: str) -> str:
    with agent.workspace(prefix="translate-") as folder:
        prompt = Path(folder) / "prompt.txt"
        request = printed(body=body)
        prompt.write_text(request, encoding="utf-8")
        command = [
            BINARIES["xai"],
            "--output-format", "json",
            "-m", model,
            "--prompt-file", str(prompt),
            "--tools", "read_file",
            "--disallowed-tools", "Agent",
            "--disable-web-search",
        ]
        stdout, stderr = call(id=id, provider="grok", model=model, method=method, command=command, cwd=folder, request=request, stdin="")
        try:
            text = str(json.loads(stdout).get("text") or "")
        except json.JSONDecodeError:
            text = ""
        if not text.strip():
            raise RuntimeError(f"No translation produced: {stderr.strip()[-300:] or stdout.strip()[-300:]}")

        return text.strip() + "\n"


def printed(*, body: str) -> str:
    return (
        f"{rules()}\n\n이번에는 파일 도구가 없다. 위의 입력 형식과 응답 규칙 대신, 아래 원문 전체를 번역한 본문만 출력한다. "
        f"앞뒤 설명을 붙이거나 코드 펜스로 감싸지 않는다.\n\n원문:\n{body}"
    )


def call(*, id: str, provider: str, model: str, method: str, command: list, cwd: str, request: str, stdin: str) -> tuple[str, str]:
    started_at = store.now()
    exit_code, stdout, stderr = agent.run(
        id=f"translate-{id}",
        command=command,
        cwd=cwd,
        env=setting.environment(provider=next(k for k, v in setting.RUNNERS.items() if v == provider), method=method),
        stdin=stdin,
        timeout=1800,
    )
    llm.record(
        provider=provider,
        model=model,
        purpose="translate",
        owner_id=id,
        command=command,
        request=request,
        response=stdout,
        stderr=stderr,
        exit_code=exit_code,
        started_at=started_at,
        auth=method,
    )
    if exit_code != 0:
        raise RuntimeError(f"exit {exit_code}. {(stderr or stdout).strip()[-300:]}")

    return stdout, stderr


RUNNERS = {"anthropic": claude, "openai": codex, "xai": grok}

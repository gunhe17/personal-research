from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path

API = Path(__file__).resolve().parent.parent
COLLECTED = API / (os.environ.get("DOCUMENT_DIR") or "data/collected")
ENG = COLLECTED / "eng"
KOR = COLLECTED / "kor"
META = COLLECTED / "meta"
DECORATION = re.compile(r"\A(?:> ## Documentation Index\n(?:>.*\n)*|---\n(?s:.*?)\n---\n)\n*")


@dataclass
class Document:
    rel: str
    body: str
    fields: dict


def today() -> str:
    return date.today().isoformat()


# #
# path

def locate(*, text: str) -> Path:
    given = Path(text)
    if given.exists():
        return given.resolve()

    return (COLLECTED / text).resolve()


def relative(*, path: Path) -> str:
    path = path.resolve()
    for base in (ENG, KOR):
        if path.is_relative_to(base):
            return path.relative_to(base).as_posix()
    raise ValueError(f"eng/ 나 kor/ 아래 파일이 아니다: {path}")


def display(*, path: Path) -> str:
    return path.resolve().relative_to(COLLECTED).as_posix()


def slugify(*, title: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", title.lower())

    return re.sub(r"[\s_]+", "-", slug).strip("-")[:90]


# #
# sidecar

def sidecar(*, rel: str) -> Path:
    return META / f"{rel}.json"


def load(*, rel: str) -> dict:
    path = sidecar(rel=rel)

    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}


def dump(*, path: Path, data: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return path


def record(*, rel: str, fields: dict) -> Path:
    data = {k: v for k, v in fields.items() if v not in (None, "")}
    old = load(rel=rel)
    if "kor" in old:
        data["kor"] = old["kor"]

    return dump(path=sidecar(rel=rel), data=data)


def find(*, source: str) -> Path | None:
    wanted = {source.rstrip("/"), source.rstrip("/") + ".md"}
    for path in META.rglob("*.json"):
        rel = path.relative_to(META).as_posix().removesuffix(".json")
        if (ENG / rel).is_file() and load(rel=rel).get("source", "").rstrip("/") in wanted:
            return ENG / rel

    return None


# #
# write

def write(*, document: Document) -> Path:
    target = ENG / document.rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(document.body, encoding="utf-8")
    record(rel=document.rel, fields=document.fields)

    return target


def card(*, rel: str, data: dict) -> Path:
    return dump(path=META / rel, data=data)


def split(*, text: str) -> tuple[str, str]:
    matched = DECORATION.match(text)

    return (matched.group(0), text[matched.end():]) if matched else ("", text)


def mirror(*, source: str, path: Path) -> Path:
    head, body = split(text=path.read_text(encoding="utf-8"))
    path.write_text(body, encoding="utf-8")
    record(rel=relative(path=path), fields={"source": source, "head": head})

    return path


# #
# stamp

def sha(*, rel: str) -> str:
    return hashlib.sha256((ENG / rel).read_bytes()).hexdigest()[:12]


def stamp(*, path: Path) -> Path:
    rel = relative(path=path)
    if not (ENG / rel).is_file():
        raise ValueError(f"원문이 없다: eng/{rel}")
    data = load(rel=rel)
    data["kor"] = {"sha256": sha(rel=rel), "date": today()}

    return dump(path=sidecar(rel=rel), data=data)


# #
# check

def check() -> tuple[list[str], int, int]:
    problems = []
    kor = sorted(p for p in KOR.rglob("*") if p.is_file())
    for path in kor:
        rel = relative(path=path)
        stamped = load(rel=rel).get("kor")
        if not (ENG / rel).is_file():
            problems.append(f"원문 없음: kor/{rel}")
        elif not stamped:
            problems.append(f"스탬프 없음: kor/{rel}")
        elif stamped["sha256"] != sha(rel=rel):
            problems.append(f"번역 낡음: kor/{rel} (스탬프 {stamped['sha256']}, 현재 {sha(rel=rel)})")

    eng = {relative(path=p) for p in ENG.rglob("*") if p.is_file()}
    sidecars = {
        p.relative_to(META).as_posix().removesuffix(".json")
        for p in META.rglob("*.json")
        if p.name.endswith((".md.json", ".html.json"))
    }
    problems += [f"사이드카 없음: eng/{rel}" for rel in sorted(eng - sidecars)]
    problems += [f"원문 없는 사이드카: meta/{rel}.json" for rel in sorted(sidecars - eng)]

    return problems, len(eng), len(kor)


# #
# catalog

def title(*, path: Path) -> str:
    text = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix == ".html":
        matched = re.search(r"<title>([^<]*)</title>", text)
        return matched.group(1).strip() if matched else ""
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()

    return ""


def catalog() -> Path:
    lines = ["# 카탈로그", "", "자동 생성물이다. 파일마다 경로와 제목을 한 줄로 담는다."]
    for lang in (ENG, KOR):
        for kind in sorted(p for p in lang.iterdir() if p.is_dir()):
            for provider in sorted(p for p in kind.iterdir() if p.is_dir()):
                files = sorted(f for f in provider.rglob("*") if f.suffix in (".md", ".html"))
                lines += ["", f"## {lang.name}/{kind.name}/{provider.name} ({len(files)})", ""]
                lines += [f"- `collected/{display(path=f)}` {title(path=f)}" for f in files]
    target = COLLECTED / "CATALOG.md"
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")

    return target

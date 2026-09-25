#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import urllib.error
from pathlib import Path

import source.paper
import source.repo
import source.video
import source.web
import source.x
import store


# #
# usecase

def paper(*, id: str) -> Path:
    return store.write(document=source.paper.get(id=id))


def x(*, url: str, tweet_id: str | None = None) -> Path:
    return store.write(document=source.x.get(url=url, tweet_id=tweet_id))


def repo(*, url: str) -> Path:
    rel, data = source.repo.card(url=url)

    return store.card(rel=rel, data=data)


def repo_doc(*, url: str, path: str | None = None) -> Path:
    return store.write(document=source.repo.get(url=url, path=path))


def video(*, url: str) -> Path:
    return store.write(document=source.video.get(url=url))


def web(*, url: str, rel: str | None = None) -> Path:
    if rel is None:
        found = store.find(source=url)
        if found:
            return found
        if source.web.synced(url=url):
            raise ValueError(f"sync 가 관리하는 사이트인데 아직 받지 않았다: bash sync.sh 로 갱신한다 ({url})")

    return store.write(document=source.web.get(url=url, rel=rel))


def existing(*, path: str) -> Path:
    target = store.locate(text=path)
    if not target.is_file() or not target.is_relative_to(store.ENG):
        raise ValueError(f"eng/ 아래 파일이 아니다: {path}")

    return target


def detect(*, input: str) -> str:
    text = input.strip()
    if source.paper.ID.fullmatch(text) or "arxiv.org/" in text:
        return "paper"
    if source.x.URL.match(text):
        return "x"
    matched = source.repo.URL.match(text)
    if matched:
        return "repo-doc" if matched.group(4) else "repo"
    if re.match(r"^https?://(?:www\.|m\.)?(?:youtube\.com|youtu\.be)/", text):
        return "video"
    if re.match(r"^https?://", text):
        return "web"
    if store.locate(text=text).is_file():
        return "existing"
    raise ValueError(f"입력 유형을 알 수 없다: {input}")


def auto(*, input: str) -> Path:
    kind = detect(input=input)
    run = {
        "paper": lambda: paper(id=input),
        "x": lambda: x(url=input),
        "repo": lambda: repo(url=input),
        "repo-doc": lambda: repo_doc(url=input),
        "video": lambda: video(url=input),
        "web": lambda: web(url=input),
        "existing": lambda: existing(path=input),
    }

    return run[kind]()


def stamp(*, path: str) -> Path:
    target = store.locate(text=path)
    rel = store.relative(path=target)
    if rel.startswith("docs/x/"):
        source.x.verify(
            source=(store.ENG / rel).read_text(encoding="utf-8"),
            translated=target.read_text(encoding="utf-8"),
        )

    return store.stamp(path=target)


# #
# selftest

def selftest() -> None:
    head, body = store.split(text="> ## Documentation Index\n> Fetch x\n\n# T\n\nbody\n")
    assert body == "# T\n\nbody\n" and head.startswith("> ## Doc"), (head, body)
    assert store.split(text="# plain\n") == ("", "# plain\n")
    block = {"text": "😀 bold link", "inlineStyleRanges": [{"offset": 3, "length": 4, "style": "Bold"}],
             "entityRanges": [{"key": 0, "offset": 8, "length": 4}]}
    got = source.x.inline(block=block, entities={"0": {"type": "LINK", "data": {"url": "https://a"}}})
    assert got == "😀 **bold** [link](https://a)", got
    assert source.x.mismatch(source="a\n\n![x](u)", translated="가\n\n![엑스](u)") is None
    assert source.x.mismatch(source="a\n\nb", translated="가 나") is not None
    cases = {
        "2305.10601": "paper",
        "https://arxiv.org/abs/2305.10601v2": "paper",
        "https://x.com/rishigb/article/123": "x",
        "https://github.com/microsoft/Orchard": "repo",
        "https://github.com/o/r/blob/main/docs/a.md": "repo-doc",
        "https://www.youtube.com/watch?v=Uzoe1RYVjiA": "video",
        "https://youtu.be/Uzoe1RYVjiA": "video",
        "https://earendil.com/posts/compaction-in-pi/": "web",
    }
    for given, want in cases.items():
        assert detect(input=given) == want, (given, detect(input=given))
    assert source.web.provider(url="https://openai.com/index/an-alien-mind/") == "docs/openai"
    assert source.web.provider(url="https://blog.example.com/p") == "docs/blog-example"
    assert source.web.synced(url="https://code.claude.com/docs/en/overview")
    assert source.repo.parse(url="https://github.com/o/r/blob/dev/a/b.md") == ("o", "r", "dev", "a/b.md")
    assert source.repo.parse(url="https://github.com/o/r.git") == ("o", "r", None, None)
    print("ok")


# #
# cli

def main(*, argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="collect.py", description="외부 문서를 collected/ 에 수집하고 번역을 관리한다.")
    commands = parser.add_subparsers(dest="command", required=True)

    command = commands.add_parser("auto", help="입력 유형을 판별해 수집한다")
    command.add_argument("input")
    command = commands.add_parser("detect", help="입력 유형만 출력한다")
    command.add_argument("input")
    command = commands.add_parser("paper", help="arXiv 논문을 자족적 html 로 받는다")
    command.add_argument("id")
    command = commands.add_parser("x", help="X 아티클을 받는다")
    command.add_argument("url")
    command.add_argument("--tweet-id")
    command = commands.add_parser("repo", help="GitHub 저장소 URL 카드를 meta/ 에 남긴다")
    command.add_argument("url")
    command = commands.add_parser("repo-doc", help="GitHub 저장소의 문서 파일을 받는다")
    command.add_argument("url")
    command.add_argument("--path")
    command = commands.add_parser("video", help="YouTube 영상을 전사한다")
    command.add_argument("url")
    command = commands.add_parser("web", help="웹 문서를 받는다")
    command.add_argument("url")
    command.add_argument("--rel", help="eng/ 아래 저장 경로. 주면 sync 소유 여부를 따지지 않는다")
    command = commands.add_parser("split", help="받아 둔 markdown 원문에서 상류 장식을 떼어 meta 로 옮긴다")
    command.add_argument("url")
    command.add_argument("path")
    command = commands.add_parser("extract", help="논문 html 에서 번역할 세그먼트를 뽑는다")
    command.add_argument("path")
    command.add_argument("segments")
    command = commands.add_parser("inject", help="번역한 세그먼트를 논문 html 에 되꽂는다")
    command.add_argument("path")
    command.add_argument("segments")
    command.add_argument("out")
    command = commands.add_parser("stamp", help="번역본의 원문 해시를 사이드카에 찍는다")
    command.add_argument("path")
    commands.add_parser("check", help="eng, kor, meta 세 층의 정합을 검사한다")
    commands.add_parser("catalog", help="CATALOG.md 를 다시 만든다")
    commands.add_parser("selftest", help="자체 검사를 돌린다")
    args = parser.parse_args(argv)

    try:
        if args.command == "detect":
            print(detect(input=args.input))
            return 0
        if args.command == "check":
            problems, eng, kor = store.check()
            for line in problems:
                print(line)
            print(f"원문 {eng}건, 번역 {kor}건, 문제 {len(problems)}건", file=sys.stderr)
            return 1 if problems else 0
        if args.command == "selftest":
            selftest()
            return 0
        run = {
            "auto": lambda: auto(input=args.input),
            "paper": lambda: paper(id=args.id),
            "x": lambda: x(url=args.url, tweet_id=args.tweet_id),
            "repo": lambda: repo(url=args.url),
            "repo-doc": lambda: repo_doc(url=args.url, path=args.path),
            "video": lambda: video(url=args.url),
            "web": lambda: web(url=args.url, rel=args.rel),
            "split": lambda: store.mirror(source=args.url, path=store.locate(text=args.path)),
            "extract": lambda: source.paper.extract(path=store.locate(text=args.path), segments=Path(args.segments)),
            "inject": lambda: source.paper.inject(path=store.locate(text=args.path), segments=Path(args.segments), out=store.locate(text=args.out)),
            "stamp": lambda: stamp(path=args.path),
            "catalog": lambda: store.catalog(),
        }
        path = run[args.command]()
    except (ValueError, KeyError, OSError, urllib.error.URLError, subprocess.CalledProcessError, RuntimeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(store.display(path=path) if path.resolve().is_relative_to(store.COLLECTED) else path)

    return 0


if __name__ == "__main__":
    sys.exit(main(argv=sys.argv[1:]))

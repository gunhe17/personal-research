#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from usecase.common import store

from usecase.collected.list import list as listing
from usecase.collected.check import check
from usecase.collected.collect import collect
from usecase.collected.translate import translate
from usecase.common import log
from usecase.common import migrate


# #
# cli

def main(*, argv: list[str]) -> int:
    args = parse(argv=argv)
    try:
        if args.command == "detect":
            print(collect.detect(input=args.input))
            return 0
        if args.command == "check":
            return report(result=check.run())
        if args.command == "log":
            for line in log.recent(limit=args.limit, level=args.level):
                print(line)
            return 0
        if args.command == "list":
            for line in listing.lines():
                print(line)
            return 0
        if args.command == "selftest":
            selftest()
            return 0
        result = route(args=args)
    except (ValueError, KeyError, OSError, urllib.error.URLError, subprocess.CalledProcessError, RuntimeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(result)

    return 0


def route(*, args) -> str:
    run = {
        "auto": lambda: collect.auto(input=args.input),
        "paper": lambda: collect.dispatch(kind="paper", input=args.id),
        "x": lambda: collect.article(url=args.url, tweet_id=args.tweet_id),
        "repo": lambda: collect.card(url=args.url),
        "repo-doc": lambda: collect.repo_file(url=args.url, path=args.path),
        "video": lambda: collect.dispatch(kind="video", input=args.url),
        "web": lambda: collect.page(url=args.url, rel=args.rel),
        "ingest": lambda: collect.ingest(url=args.url, path=args.path, file=args.file),
        "dump": lambda: translate.dump(reference=args.reference, file=args.file, language=args.language),
        "load": lambda: translate.load(reference=args.reference, file=args.file, language=args.language),
        "extract": lambda: translate.extract(reference=args.reference, segments=args.segments),
        "inject": lambda: translate.inject(reference=args.reference, segments=args.segments, language=args.language),
        "migrate": lambda: migrate.run(
            collected=Path(args.collected),
            conversations=Path(args.conversations),
        ),
        "export": lambda: store.export(folder=Path(args.folder)),
    }

    return run[args.command]()


def report(*, result: tuple[list[str], int, int]) -> int:
    problems, eng, kor = result
    for line in problems:
        print(line)
    print(f"원문 {eng}건, 번역 {kor}건, 문제 {len(problems)}건", file=sys.stderr)

    return 1 if problems else 0


def parse(*, argv: list[str]):
    parser = argparse.ArgumentParser(prog="collect.py", description="외부 문서를 수집해 DB 에 넣고 번역을 관리한다.")
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
    command = commands.add_parser("repo", help="GitHub 저장소 URL 카드를 사이드카에 남긴다")
    command.add_argument("url")
    command = commands.add_parser("repo-doc", help="GitHub 저장소의 문서 파일을 받는다")
    command.add_argument("url")
    command.add_argument("--path")
    command = commands.add_parser("video", help="YouTube 영상을 전사한다")
    command.add_argument("url")
    command = commands.add_parser("web", help="웹 문서를 받는다")
    command.add_argument("url")
    command.add_argument("--rel", help="eng 아래 저장 경로. 주면 sync 소유 여부를 따지지 않는다")
    command = commands.add_parser("ingest", help="내려받은 markdown 파일에서 상류 장식을 떼어 적재한다")
    command.add_argument("url")
    command.add_argument("path")
    command.add_argument("file")
    command = commands.add_parser("dump", help="문서 본문을 파일로 꺼낸다")
    command.add_argument("reference", help="id, 보관 경로, 원문 주소 중 아무것이나")
    command.add_argument("file")
    command.add_argument("--language", default="eng", choices=("eng", "kor"))
    command = commands.add_parser("load", help="파일을 문서 본문으로 넣는다")
    command.add_argument("reference", help="id, 보관 경로, 원문 주소 중 아무것이나")
    command.add_argument("file")
    command.add_argument("--language", default="kor", choices=("eng", "kor"))
    command = commands.add_parser("extract", help="논문 html 에서 번역할 세그먼트를 뽑는다")
    command.add_argument("reference")
    command.add_argument("segments")
    command = commands.add_parser("inject", help="번역한 세그먼트를 논문 html 에 되꽂는다")
    command.add_argument("reference")
    command.add_argument("segments")
    command.add_argument("--language", default="kor", choices=("eng", "kor"))
    command = commands.add_parser("migrate", help="옛 두 DB 를 새 스키마로 옮긴다")
    command.add_argument("collected", nargs="?", default=str(store.API / "database" / "collected.db"))
    command.add_argument("conversations", nargs="?", default=str(store.API / "database" / "conversations.db"))
    command = commands.add_parser("export", help="DB 를 collected 파일 트리로 내보낸다")
    command.add_argument("folder", nargs="?", default=str(store.API / "data" / "collected"))
    commands.add_parser("check", help="원문, 번역, 사이드카의 정합을 검사한다")
    commands.add_parser("list", help="수집된 문서를 표준 출력에 나열한다")
    command = commands.add_parser("log", help="서버 로그를 최근 것부터 보여 준다")
    command.add_argument("--limit", type=int, default=50)
    command.add_argument("--level", choices=("info", "error"))
    commands.add_parser("selftest", help="자체 검사를 돌린다")

    return parser.parse_args(argv)


# #
# selftest

def selftest() -> None:
    from usecase.collected.collect.type import paper
    from usecase.collected.collect.type import repo
    from usecase.collected.collect.type import web
    from usecase.collected.collect.type import x

    decoration, body = store.split(text="> ## Documentation Index\n> Fetch x\n\n# T\n\nbody\n")
    assert body == "# T\n\nbody\n" and decoration.startswith("> ## Doc"), (decoration, body)
    assert store.split(text="# plain\n") == ("", "# plain\n")
    block = {"text": "😀 bold link", "inlineStyleRanges": [{"offset": 3, "length": 4, "style": "Bold"}],
             "entityRanges": [{"key": 0, "offset": 8, "length": 4}]}
    got = x.inline(block=block, entities={"0": {"type": "LINK", "data": {"url": "https://a"}}})
    assert got == "😀 **bold** [link](https://a)", got
    assert x.mismatch(source="a\n\n![x](u)", translated="가\n\n![엑스](u)") is None
    assert x.mismatch(source="a\n\nb", translated="가 나") is not None
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
        assert collect.detect(input=given) == want, (given, collect.detect(input=given))
    assert web.provider(url="https://openai.com/index/an-alien-mind/") == "docs/openai"
    assert web.synced(url="https://code.claude.com/docs/en/overview")
    assert repo.parse(url="https://github.com/o/r/blob/dev/a/b.md") == ("o", "r", "dev", "a/b.md")
    roundtrip()
    print("ok")


def roundtrip() -> None:
    import tempfile

    original = store.DATABASE
    with tempfile.TemporaryDirectory() as folder:
        store.DATABASE = Path(folder) / "t.db"
        try:
            id = store.write(document=store.Document(
                path="docs/t/a.md", body="# T\n\nbody\n", url="https://t/a",
            ))
            assert store.find(url="https://t/a") == id
            assert store.locate(text="docs/t/a.md") == id
            assert store.locate(text="https://t/a") == id
            assert store.locate(text=id) == id
            assert store.locate(text="eng/docs/t/a.md") == id
            assert store.version(id=id, language="eng") == 1

            # 같은 본문을 다시 넣어도 판이 늘지 않는다
            store.save(id=id, language="eng", body="# T\n\nbody\n")
            assert store.version(id=id, language="eng") == 1

            store.save(id=id, language="kor", body="# T\n\n본문\n")
            assert check.run()[0] == [], check.run()[0]

            # 같은 경로를 다시 수집해도 id 가 유지된다
            again = store.write(document=store.Document(
                path="docs/t/a.md", body="# T\n\nchanged\n", url="https://t/a",
            ))
            assert again == id, (again, id)
            assert store.version(id=id, language="eng") == 2
            assert check.run()[0][0].startswith("번역 낡음"), check.run()[0]

            with store.session() as connection:
                kept = connection.execute(
                    "SELECT COUNT(*) FROM collected_content WHERE language = 'eng'"
                ).fetchone()[0]
            assert kept == 2, kept

            store.save(id=id, language="kor", body="# T\n\n바뀜\n")
            assert check.run()[0] == [], check.run()[0]

            # 주소가 같아도 경로가 다르면 다른 문서다
            other = store.write(document=store.Document(
                path="docs/t/b.md", body="# B\n", url="https://t/a",
            ))
            assert other != id
        finally:
            store.DATABASE = original


if __name__ == "__main__":
    sys.exit(main(argv=sys.argv[1:]))

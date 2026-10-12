#!/usr/bin/env python3
from __future__ import annotations

import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from usecase.user.account import account


# #
# cli

def main() -> None:
    parser = argparse.ArgumentParser(prog="user.py")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("list", help="계정 목록")
    for name, text in (("add", "관리자 계정을 만든다. 처음 만든 계정이 기존 설정과 대화를 넘겨받는다. 일반 사용자는 화면에서 관리자가 추가한다"), ("reset", "비밀번호를 바꾸고 로그인을 모두 끊는다")):
        command = commands.add_parser(name, help=text)
        command.add_argument("email")
        if name == "add":
            command.add_argument("--name", default="")
    given = parser.parse_args()
    try:
        if given.command == "list":
            for found in account.listed():
                print(f"{found['email']}\t{found['name']}\t{found['role']}\t{found['created_at']}")
            return
        password = getpass.getpass("비밀번호: ")
        if getpass.getpass("한 번 더: ") != password:
            sys.exit("비밀번호가 서로 다릅니다.")
        if given.command == "add":
            created = account.create(email=given.email, name=given.name, password=password, role="admin")
            print(f"만들었습니다: {created['email']}")
        else:
            account.reset(email=given.email, password=password)
            print(f"바꿨습니다: {given.email}")
    except ValueError as error:
        sys.exit(str(error))


if __name__ == "__main__":
    main()

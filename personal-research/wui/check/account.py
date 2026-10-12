import os
import sys


def sign_in(page, base):
    email, password = os.environ.get("WUI_EMAIL", ""), os.environ.get("WUI_PASSWORD", "")
    if not email or not password:
        sys.exit("usage: WUI_EMAIL=<이메일> WUI_PASSWORD=<비밀번호> uv run --with playwright python check/<이름>.py <폴더>")
    response = page.request.post(f"{base}/api/auth/login", data={"email": email, "password": password})
    if response.status != 200:
        sys.exit(f"{email} 으로 로그인하지 못했습니다 ({response.status})")

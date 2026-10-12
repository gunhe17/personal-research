import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
EMAIL, PASSWORD = os.environ.get("WUI_EMAIL", ""), os.environ.get("WUI_PASSWORD", "")
if not EMAIL or not PASSWORD:
    sys.exit("usage: WUI_EMAIL=<이메일> WUI_PASSWORD=<비밀번호> uv run --with playwright python check/auth.py <폴더>")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    page = browser.new_page(viewport={"width": 1200, "height": 800})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_default_timeout(15000)
    page.goto(BASE + "/")
    page.wait_for_selector("input[aria-label=Email]")
    print("1 signed out → login screen")
    page.get_by_label("Email").fill(EMAIL)
    page.get_by_label("Password", exact=True).fill(PASSWORD + "-wrong")
    page.get_by_role("button", name="Log in").click()
    page.wait_for_selector("text=이메일이나 비밀번호가 맞지 않습니다.")
    print("2 wrong password rejected")
    page.get_by_label("Password", exact=True).fill(PASSWORD)
    page.get_by_label("Password", exact=True).press("Enter")
    page.wait_for_selector("text=오늘의 research는 무엇인가요?")
    print("3 signed in")
    page.get_by_label("Settings").click()
    dialog = page.get_by_role("dialog")
    dialog.get_by_role("button", name="Profile", exact=True).click()
    page.wait_for_selector(f"text={EMAIL}")
    dialog.get_by_label("New password").fill("short")
    print("4 profile shows email, short password cannot be saved:", dialog.get_by_role("button", name="Change", exact=True).is_disabled())
    role = page.evaluate("fetch('/api/auth/me').then(r => r.json())")["role"]
    print("5 users menu matches role:", dialog.get_by_role("button", name="Users", exact=True).count() == (1 if role == "admin" else 0))
    page.screenshot(path=f"{OUT}/auth.png")
    print("errors:", errors)
    browser.close()

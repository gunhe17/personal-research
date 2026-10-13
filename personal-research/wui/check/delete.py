import os
import sys
import time

from playwright.sync_api import sync_playwright

from account import sign_in

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
TITLE = f"delete check {int(time.time())}"

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_default_timeout(15000)
    sign_in(page, BASE)
    created = page.request.post(f"{BASE}/api/agent/conversations", data={"question": ""}, headers={"Origin": BASE}).json()["id"]
    page.request.put(f"{BASE}/api/agent/conversations/{created}", data={"title": TITLE}, headers={"Origin": BASE})
    page.goto(f"{BASE}/collected?agent={created}")
    page.wait_for_timeout(1200)
    if page.locator("aside[inert]").count():
        page.get_by_label("Toggle sidebar").click()
        page.wait_for_timeout(500)
    nav = page.locator("nav").first
    row = nav.get_by_role("button", name=TITLE)
    before = page.evaluate("JSON.parse(localStorage.getItem('workbench')).groups.length")
    row.hover()
    page.wait_for_timeout(300)
    trash = row.locator("xpath=..").get_by_label("Delete conversation")
    print("1 trash on hover:", trash.evaluate("e => getComputedStyle(e).opacity") == "1")
    trash.click()
    dialog = page.get_by_role("dialog", name="Delete conversation")
    print("2 confirm names it:", TITLE in dialog.inner_text())
    page.keyboard.press("Escape")
    print("3 escape keeps it:", dialog.count() == 0 and nav.get_by_role("button", name=TITLE).count() == 1)
    row.hover()
    trash.click()
    dialog.get_by_role("button", name="Delete").click()
    page.wait_for_timeout(1200)
    after = page.evaluate("JSON.parse(localStorage.getItem('workbench')).groups.length")
    print("4 removed:", nav.get_by_role("button", name=TITLE).count() == 0, "| pane closed:", after == before - 1)
    print("5 api 404:", page.request.get(f"{BASE}/api/agent/conversations/{created}").status == 404)
    print("errors:", errors[:5])
    browser.close()

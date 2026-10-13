import os
import sys
import time

from playwright.sync_api import sync_playwright

from account import sign_in

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
STAMP = int(time.time())
TITLE = f"trash check {STAMP}"
SPACE = f"trash space {STAMP}"


def restore_button(dialog, name):
    return dialog.locator("section div.flex", has=dialog.page.get_by_text(name, exact=True)).get_by_role("button", name="Restore")


with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_default_timeout(15000)
    sign_in(page, BASE)
    origin = {"Origin": BASE}
    created = page.request.post(f"{BASE}/api/agent/conversations", data={"question": ""}, headers=origin).json()["id"]
    page.request.put(f"{BASE}/api/agent/conversations/{created}", data={"title": TITLE}, headers=origin)
    space = page.request.post(f"{BASE}/api/spaces", data={"title": SPACE}, headers=origin).json()["id"]
    inside = page.request.post(f"{BASE}/api/space/conversations", data={"space_id": space}, headers=origin).json()["id"]
    page.goto(f"{BASE}/collected?agent={created}")
    page.wait_for_timeout(1200)
    if page.locator("aside[inert]").count():
        page.get_by_label("Toggle sidebar").click()
        page.wait_for_timeout(500)
    nav = page.locator("nav").first
    row = nav.get_by_role("button", name=TITLE)
    row.hover()
    page.wait_for_timeout(300)
    row.locator("xpath=..").get_by_label("Delete conversation").click()
    page.get_by_role("dialog", name="Delete conversation").get_by_role("button", name="Delete").click()
    page.wait_for_timeout(1000)
    print("1 deleted from sidebar:", nav.get_by_role("button", name=TITLE).count() == 0)
    print("2 space delete api:", page.request.delete(f"{BASE}/api/spaces/{space}", headers=origin).status == 200)
    page.wait_for_timeout(300)

    page.get_by_label("Settings").click()
    dialog = page.get_by_role("dialog", name="Settings")
    dialog.get_by_role("button", name="Trash", exact=True).click()
    page.wait_for_timeout(800)
    print("3 listed:", dialog.get_by_text(TITLE, exact=True).count() == 1, "| space:", dialog.get_by_text(SPACE, exact=True).count() == 1)
    print("3b admin users section:", dialog.get_by_role("heading", name="Users").count() == (len(page.request.get(f"{BASE}/api/users/deleted").json()["items"]) > 0))
    page.screenshot(path=f"{OUT}/trash.png")
    restore_button(dialog, TITLE).click()
    page.wait_for_timeout(1000)
    print("4 conversation row gone:", dialog.get_by_text(TITLE, exact=True).count() == 0, "| api 200:", page.request.get(f"{BASE}/api/agent/conversations/{created}").status == 200)
    restore_button(dialog, SPACE).click()
    page.wait_for_timeout(1000)
    detail = page.request.get(f"{BASE}/api/spaces/{space}")
    print("5 space row gone:", dialog.get_by_text(SPACE, exact=True).count() == 0, "| space back:", detail.status == 200 and [c["id"] for c in detail.json()["conversations"]] == [inside])
    print("6 no inline error:", dialog.locator("p.text-red-600").count() == 0)
    page.get_by_label("Close").first.click()
    page.wait_for_timeout(500)
    print("7 sidebar has both:", nav.get_by_role("button", name=TITLE).count() == 1, nav.get_by_role("button", name=SPACE, exact=True).count() == 1)

    phone = browser.new_page(viewport={"width": 390, "height": 844})
    phone.on("pageerror", lambda e: errors.append(str(e)))
    sign_in(phone, BASE)
    phone.request.delete(f"{BASE}/api/agent/conversations/{created}", headers=origin)
    phone.goto(BASE + "/")
    phone.evaluate("sessionStorage.clear()")
    phone.reload()
    phone.get_by_label("Settings").click()
    small = phone.get_by_role("dialog", name="Settings")
    small.get_by_role("button", name="Trash", exact=True).click()
    phone.wait_for_timeout(800)
    fits = phone.evaluate("() => [...document.querySelectorAll('[role=dialog] *')].every(e => e.getBoundingClientRect().right <= window.innerWidth + 1)")
    print("8 phone pane:", small.get_by_text(TITLE, exact=True).is_visible(), "| no overflow:", fits)
    phone.screenshot(path=f"{OUT}/trash-phone.png")
    small.get_by_label("Back").click()
    phone.wait_for_timeout(300)
    print("9 back to list:", small.get_by_role("button", name="Trash", exact=True).is_visible())
    print("errors:", errors[:5])
    browser.close()

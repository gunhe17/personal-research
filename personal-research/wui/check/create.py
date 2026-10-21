import os
import sys

from playwright.sync_api import sync_playwright

from account import sign_in

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_default_timeout(15000)
    sign_in(page, BASE)
    page.goto(BASE + "/")
    page.evaluate("localStorage.clear(); localStorage.setItem('spaceExpanded', JSON.stringify({spaces: true, library: true}))")
    page.goto(f"{BASE}/collected")
    page.wait_for_timeout(1200)
    if page.locator("aside[inert]").count():
        page.get_by_label("Toggle sidebar").click()
        page.wait_for_timeout(500)
    nav = page.locator("nav").first
    before = {s["id"] for s in page.request.get(f"{BASE}/api/spaces").json()["items"]}
    created = None
    try:
        nav.locator("button[title='새 space']:not([aria-expanded])").click()
        page.wait_for_timeout(1500)
        after = page.request.get(f"{BASE}/api/spaces").json()["items"]
        created = next((s for s in after if s["id"] not in before), None)
        print("1 space created:", created is not None and created["title"] == "새 space")
        groups = page.evaluate("JSON.parse(localStorage.getItem('workbench')).groups")
        print("2 new chat pane opened:", any(g["item"].get("space") == (created or {}).get("id") and g["item"].get("conversation") == "" for g in groups))
        print("3 space revealed:", nav.get_by_role("button", name="Conversations").count() >= 1)
        page.screenshot(path=f"{OUT}/create-space.png")

        nav.get_by_role("button", name="새 수집").click()
        page.wait_for_url(BASE + "/")
        page.wait_for_timeout(800)
        print("4 home in collect mode:", page.locator("textarea[placeholder='Paste a URL…']").count() == 1)
        page.evaluate("localStorage.setItem('homeMode', 'ask')")
        page.reload()
        page.wait_for_timeout(800)
        if page.locator("aside[inert]").count():
            page.get_by_label("Toggle sidebar").click()
            page.wait_for_timeout(500)
        nav = page.locator("nav").first
        nav.get_by_role("button", name="새 수집").click()
        page.wait_for_timeout(600)
        print("5 already home switches to collect:", page.locator("textarea[placeholder='Paste a URL…']").count() == 1)
        page.screenshot(path=f"{OUT}/create-collect.png")
    finally:
        if created:
            page.request.delete(f"{BASE}/api/spaces/{created['id']}", headers={"Origin": BASE})
    print("errors:", errors[:5])
    browser.close()

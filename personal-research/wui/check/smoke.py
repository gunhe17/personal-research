import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.set_default_timeout(15000)

    page.goto(BASE + "/")
    page.wait_for_selector("text=오늘의 research는 무엇인가요?")
    page.screenshot(path=f"{OUT}/home.png")
    page.get_by_label("Toggle sidebar").click()
    page.wait_for_selector("nav >> text=Home")
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{OUT}/sidebar.png")

    space = page.evaluate("fetch('/api/spaces').then(r => r.json()).then(d => (d.items.find(s => s.collected_count > 0) || d.items[0]).id)")
    page.goto(f"{BASE}/collected?space={space}")
    page.wait_for_selector("text=conversation")
    page.wait_for_timeout(2500)
    page.screenshot(path=f"{OUT}/workbench.png")

    page.get_by_label("Settings").click()
    page.wait_for_selector("text=Text size")
    page.get_by_role("dialog").get_by_role("button", name="OpenAI", exact=True).click()
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{OUT}/settings.png")

    print("errors:", errors)
    browser.close()

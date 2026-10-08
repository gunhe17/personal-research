import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
URLS = ["https://collect-check-one.invalid/a.md", "https://collect-check-two.invalid/b.md"]

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    page = browser.new_page(viewport={"width": 1200, "height": 800})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.set_default_timeout(15000)
    page.goto(BASE + "/")
    page.evaluate("localStorage.setItem('homeMode', JSON.stringify('collect'))")
    page.reload()
    before = {j["id"] for j in page.evaluate("fetch('/api/collect').then(r => r.json())")["items"]}
    box = page.locator("textarea")
    for url in URLS:
        box.fill(url)
        box.press("Enter")
        page.wait_for_timeout(300)
        print("1 input cleared right away:", box.input_value() == "")
    page.wait_for_selector("text=Nothing was collected.", state="attached")
    page.wait_for_function("document.querySelectorAll('.md-chat').length >= 2 && [...document.querySelectorAll('.md-chat')].every(n => n.textContent.includes('Nothing was collected'))")
    jobs = [j for j in page.evaluate("fetch('/api/collect').then(r => r.json())")["items"] if j["id"] not in before]
    print("2 jobs finished:", sorted(j["state"] for j in jobs))
    page.get_by_label("Settings").click()
    dialog = page.get_by_role("dialog")
    dialog.get_by_role("button", name="Collect", exact=True).click()
    page.wait_for_timeout(500)
    print("3 settings cards:", dialog.locator("li", has_text="collect-check").count() >= len(jobs))
    page.screenshot(path=f"{OUT}/collect.png")
    for job in jobs:
        page.evaluate("id => fetch(`/api/agent/conversations/${id}`, { method: 'DELETE' })", job["conversation_id"])
    print("errors:", errors[:5])
    browser.close()

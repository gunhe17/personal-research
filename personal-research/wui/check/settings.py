import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
FAKE = "sk-ant-check-0000000000000000"

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("dialog", lambda d: d.accept())
    page.set_default_timeout(15000)
    page.goto(BASE + "/")
    page.evaluate("localStorage.clear()")
    page.reload()

    space = next(s for s in page.evaluate("fetch('/api/spaces').then(r => r.json())")["items"] if s["collected_count"] > 0)
    nav = page.locator("nav").first
    print("0 closed sidebar inert:", page.locator("aside[inert]").count() == 1)
    page.get_by_label("Toggle sidebar").click()
    def expand(row):
        if row.get_attribute("aria-expanded") != "true":
            row.click()
            page.wait_for_timeout(300)

    expand(nav.get_by_role("button", name=space["title"]).first)
    folder = nav.get_by_role("button", name="Conversations")
    expand(folder)
    print("1 conversations folder:", folder.inner_text().replace("\n", " "), "| api count", space["conversation_count"])
    nav.get_by_text("새 대화").click()
    page.wait_for_url("**/collected**")
    page.wait_for_selector("textarea")
    print("2 new chat pane:", page.locator("text=이 space 에서 무엇을 배울까요?").count())
    page.get_by_label("닫기").last.click()
    page.wait_for_timeout(300)
    expand(nav.get_by_role("button", name="Collected"))
    detail = page.evaluate("id => fetch(`/api/spaces/${id}`).then(r => r.json())", space["id"])
    root = detail["collected"][0]
    path = (root["documents"] or [root])[0]["path"]
    leaf = nav.get_by_role("button", name="/".join(path.split("/")[2:]) or path, exact=True).first
    leaf.drag_to(page.locator("div.justify-center.bg-slate-50").last)
    page.wait_for_timeout(800)
    print("3 drag to empty workbench, doc panes:", page.locator(".prose-doc").count())
    page.screenshot(path=f"{OUT}/sidebar.png")

    page.get_by_label("Settings").click()
    dialog = page.get_by_role("dialog")
    dialog.get_by_role("button", name="Anthropic", exact=True).click()
    before = [m["id"] for m in page.evaluate("fetch('/api/settings').then(r => r.json())")["providers"][1]["methods"]]
    dialog.get_by_role("button", name="+ API key").click()
    page.wait_for_timeout(600)
    methods = page.evaluate("fetch('/api/settings').then(r => r.json())")["providers"][1]["methods"]
    added = next(m for m in methods if m["id"] not in before)
    print("4 added:", added["id"], added["enabled"], "count", len(before), "->", len(methods))
    row = dialog.locator("div.pl-5.border-l").first
    box = row.get_by_placeholder("Anthropic API key")
    box.fill(FAKE)
    box.press("Enter")
    page.wait_for_timeout(600)
    print("5 saved shows:", dialog.locator(f"text=saved").count() > 0, "| secret masked:", FAKE not in dialog.inner_text())
    print("5b stored on added only:", [m["id"] for m in page.evaluate("fetch('/api/settings').then(r => r.json())")["providers"][1]["methods"] if m["secret"]])
    row.get_by_role("button", name="Replace").click()
    row.get_by_role("button", name="Cancel").click()
    row.get_by_role("button", name="Remove", exact=True).click()
    page.wait_for_timeout(600)
    print("6 key removed, input back:", row.get_by_placeholder("Anthropic API key").count())
    row.get_by_role("button", name=f"Remove {added['label']}", exact=True).click()
    page.wait_for_timeout(600)
    after = page.evaluate("fetch('/api/settings').then(r => r.json())")["providers"][1]["methods"]
    print("7 method removed:", [m["id"] for m in after])
    dialog.get_by_role("button", name="OpenAI", exact=True).click()
    page.wait_for_timeout(300)
    dialog.get_by_role("button", name="Anthropic", exact=True).click()
    page.wait_for_timeout(300)
    dialog.get_by_role("button", name="Function", exact=True).click()
    page.wait_for_selector("text=search_collected")
    print("8 agent functions:", dialog.locator("li").count())
    page.screenshot(path=f"{OUT}/settings.png")
    print("errors:", errors[:6])
    browser.close()

import os

from playwright.sync_api import sync_playwright

from account import sign_in

BASE = os.environ.get("WUI_URL", "http://localhost:3000")

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    page = b.new_page(viewport={"width": 1200, "height": 420})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    sign_in(page, BASE)
    page.goto(BASE + "/")
    page.evaluate("localStorage.clear(); sessionStorage.clear()")
    agent = page.evaluate("fetch('/api/agent/conversations').then(r => r.json()).then(async d => { for (const c of d.items) { const full = await fetch('/api/agent/conversations/' + c.id).then(r => r.json()); if (full.messages[0]?.kind === 'question' && full.messages.some(m => m.role === 'assistant')) return c; } return null; })")["id"]
    page.goto(f"{BASE}/collected?agent={agent}")
    page.wait_for_selector("[data-answer-id]")
    page.get_by_label("Toggle sidebar").click()
    page.wait_for_timeout(1200)
    page.get_by_label("Settings").click()
    page.get_by_role("dialog").get_by_role("button", name="Function", exact=True).click()
    page.wait_for_selector("text=search_collected")
    page.reload()
    page.wait_for_selector("text=search_collected", timeout=10000)
    print("1 modal + tab kept:", page.get_by_role("dialog").count() == 1, "| sidebar open:", page.locator("aside[inert]").count() == 0)
    page.keyboard.press("Escape")
    page.wait_for_timeout(500)
    title = page.evaluate("fetch('/api/spaces').then(r => r.json())")["items"][0]["title"]
    row = page.locator("nav").first.get_by_role("button", name=title, exact=True).first
    if row.get_attribute("aria-expanded") != "true":
        row.click()
    page.wait_for_timeout(1200)
    side = page.locator("aside > div").first
    side.evaluate("n => { n.scrollTop = 120; n.dispatchEvent(new Event('scroll')) }")
    chat = page.locator("[data-answer-id]").first.locator("xpath=ancestor::div[contains(@class,'overflow-y-auto')][1]")
    chat.evaluate("n => { n.scrollTop = 150; n.dispatchEvent(new Event('scroll')) }")
    before = (side.evaluate("n => n.scrollTop"), chat.evaluate("n => n.scrollTop"))
    page.reload()
    page.wait_for_selector("[data-answer-id]")
    page.wait_for_timeout(2000)
    after = (page.locator("aside > div").first.evaluate("n => n.scrollTop"), page.locator("[data-answer-id]").first.locator("xpath=ancestor::div[contains(@class,'overflow-y-auto')][1]").evaluate("n => n.scrollTop"))
    print("2 modal closed stays closed:", page.get_by_role("dialog").count() == 0)
    print("3 scroll before/after (sidebar, chat):", before, after)
    print("errors:", errors)
    b.close()

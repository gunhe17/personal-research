import os
import sys

from playwright.sync_api import sync_playwright

from account import sign_in

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"


def leaves(page, selector, close):
    close()
    page.wait_for_timeout(40)
    during = page.locator(selector).count() > 0 and page.locator(f"{selector}.exit-fade, {selector}.exit-veil, {selector}.exit-pop, {selector}.exit-rise, {selector} .exit-rise, {selector} .exit-pop").count() > 0
    page.wait_for_timeout(400)
    gone = page.locator(selector).count() == 0
    return during, gone


with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    page = browser.new_page(viewport={"width": 1280, "height": 820})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_default_timeout(15000)
    sign_in(page, BASE)
    page.goto(BASE + "/")
    page.evaluate("localStorage.clear(); localStorage.setItem('spaceExpanded', JSON.stringify({agents: true}))")
    page.goto(BASE + "/collected")
    page.wait_for_timeout(1200)
    if page.locator("aside[inert]").count():
        page.get_by_label("Toggle sidebar").click()
        page.wait_for_timeout(500)

    page.get_by_label("Settings").first.click()
    page.wait_for_selector("[role=dialog][aria-label=Settings]")
    print("1 modal enters:", page.locator("[role=dialog][aria-label=Settings].enter-fade").count() == 1)
    print("2 modal exits (during, gone):", leaves(page, "[role=dialog][aria-label=Settings]", lambda: page.keyboard.press("Escape")))

    row = page.locator("nav .group").first
    row.hover()
    row.get_by_role("button").last.click()
    page.wait_for_selector("[role=dialog][aria-label^=Delete]")
    print("3 popup exits (during, gone):", leaves(page, "[role=dialog][aria-label^=Delete]", lambda: page.get_by_role("button", name="Cancel").click()))

    page.goto(BASE + "/")
    page.wait_for_timeout(800)
    page.get_by_role("button", name="Mode").click()
    page.wait_for_selector("[role=menu]")
    print("4 menu exits (during, gone):", leaves(page, "[role=menu]", lambda: page.keyboard.press("Escape")))

    page.evaluate("window.dispatchEvent(new CustomEvent('research:toast', { detail: 'motion check' }))")
    page.wait_for_timeout(100)
    print("5 toast enters:", page.locator("[role=status].enter-rise", has_text="motion check").count() == 1)
    page.wait_for_timeout(2000)
    print("6 toast exits:", page.locator("[role=status].exit-fade").count() == 1)
    page.wait_for_timeout(400)
    print("7 toast gone:", page.locator("[role=status]", has_text="motion check").count() == 0)

    created = page.request.post(f"{BASE}/api/agent/conversations", data={"question": ""}, headers={"Origin": BASE}).json()["id"]
    page.request.put(f"{BASE}/api/agent/conversations/{created}", data={"title": "motion row"}, headers={"Origin": BASE})
    page.goto(BASE + "/collected")
    page.wait_for_timeout(1200)
    docs = [g for g in page.request.get(f"{BASE}/api/agent/conversations").json()["items"] if g["id"] != created][:1]
    page.evaluate("([a, b]) => { localStorage.setItem('workbench', JSON.stringify({ groups: [{ id: 'g1', item: { kind: 'agent', agent: a, title: 'A' } }, { id: 'g2', item: { kind: 'agent', agent: b, title: 'B' } }], focus: 0 })) }", [created, docs[0]["id"] if docs else created])
    page.reload()
    page.wait_for_timeout(1500)
    if page.locator("aside[inert]").count():
        page.get_by_label("Toggle sidebar").click()
        page.wait_for_timeout(500)
    sections = page.locator("main section, section.bg-white")
    if sections.count() >= 2:
        first = sections.nth(0)
        start = first.bounding_box()["width"]
        sections.nth(1).get_by_role("button", name="닫기").first.click()
        widths = []
        for _ in range(8):
            page.wait_for_timeout(35)
            box = first.bounding_box()
            widths.append(round(box["width"]) if box else 0)
        end = widths[-1]
        print("9 pane close widens smoothly:", any(start + 20 < w < end - 20 for w in widths), widths)
    else:
        print("9 pane close widens smoothly: skipped (one pane)")

    nav = page.locator("nav").first
    row = nav.get_by_role("button", name="motion row")
    holder = row.locator("xpath=ancestor::div[contains(@class,'flow-root')][1]")
    tall = holder.bounding_box()["height"] if holder.count() else 0
    row.hover()
    row.locator("xpath=..").get_by_role("button", name="Delete conversation").click()
    page.get_by_role("dialog", name="Delete conversation").get_by_role("button", name="Delete").click()
    heights = []
    for _ in range(12):
        page.wait_for_timeout(30)
        heights.append(round(holder.bounding_box()["height"]) if holder.count() and holder.bounding_box() else 0)
    print("10 deleted row collapses:", any(2 < h < tall - 2 for h in heights), tall, heights)

    page.emulate_media(reduced_motion="reduce")
    page.goto(BASE + "/collected")
    page.wait_for_timeout(800)
    page.get_by_label("Settings").first.click()
    page.wait_for_selector("[role=dialog][aria-label=Settings]")
    page.keyboard.press("Escape")
    page.wait_for_timeout(30)
    print("8 reduced motion closes at once:", page.locator("[role=dialog][aria-label=Settings]").count() == 0)
    print("errors:", errors[:5])
    browser.close()

import os
import sys

from playwright.sync_api import sync_playwright

from account import sign_in

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.set_default_timeout(15000)

    sign_in(page, BASE)
    page.goto(BASE + "/")
    page.evaluate("localStorage.removeItem('workbench')")
    space = page.evaluate("fetch('/api/spaces').then(r => r.json()).then(d => (d.items.find(s => s.collected_count > 0) || d.items[0]).id)")
    page.goto(f"{BASE}/collected?space={space}")
    page.get_by_label("Toggle sidebar").click()
    page.wait_for_timeout(800)
    nav = page.locator("nav").first
    if nav.get_by_role("button", name="Collected").count() < 2:
        nav.get_by_role("button", name="openai/codex").click()
    nav.get_by_role("button", name="Collected").last.wait_for()
    leaf = nav.get_by_role("button", name="openai/codex/README.md")
    target = page.locator("section").first.bounding_box()
    leaf.drag_to(page.locator("section").first, target_position={"x": target["width"] - 20, "y": target["height"] / 2})
    page.wait_for_selector("text=collected")
    page.wait_for_selector(".prose-doc")
    print("groups:", page.locator("section").count())
    page.get_by_role("button", name="Korean").first.click()
    page.wait_for_timeout(800)
    page.get_by_label("Download").click()
    page.wait_for_selector("text=Format")
    page.screenshot(path=f"{OUT}/wb-doc.png")
    page.keyboard.press("Escape")
    paragraph = page.locator(".prose-doc p").first
    box = paragraph.bounding_box()
    page.mouse.move(box["x"] + 2, box["y"] + 8)
    page.mouse.down()
    page.mouse.move(box["x"] + 200, box["y"] + 8, steps=8)
    page.mouse.up()
    page.get_by_label("Quote in chat").click()
    page.wait_for_selector("text=인용 ·")
    page.screenshot(path=f"{OUT}/wb-quote.png")
    page.locator("textarea").fill("/")
    page.wait_for_selector("text=/retrieval")
    page.screenshot(path=f"{OUT}/wb-command.png")
    page.keyboard.press("Escape")
    saved = page.evaluate("JSON.parse(localStorage.getItem('workbench')).groups")
    four = [{**saved[i % len(saved)], "id": f"reorder{i}"} for i in range(4)]
    page.evaluate("groups => localStorage.setItem('workbench', JSON.stringify({ groups, focus: 0 }))", four)
    page.goto(f"{BASE}/collected")
    page.wait_for_timeout(1500)
    bars = page.locator("div.cursor-grab[draggable=true]")
    target = page.locator("section.bg-white").nth(2)
    box = target.bounding_box()
    bars.first.drag_to(target, target_position={"x": box["width"] - 10, "y": box["height"] / 2})
    page.wait_for_timeout(500)
    order = page.evaluate("JSON.parse(localStorage.getItem('workbench')).groups.map(g => g.id)")
    print("reorder at limit:", order)
    if order != ["reorder1", "reorder2", "reorder0", "reorder3"]:
        errors.append(f"4-group reorder gave {order}")
    print("errors:", errors)
    browser.close()

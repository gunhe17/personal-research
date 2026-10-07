import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"

def groups(page):
    return page.evaluate("JSON.parse(localStorage.getItem('workbench') || '{}')")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.set_default_timeout(15000)
    page.goto(BASE + "/")
    page.evaluate("localStorage.clear()")
    space = page.evaluate("fetch('/api/spaces').then(r => r.json()).then(d => d.items.find(s => s.collected_count > 0).id)")
    doc = page.evaluate(f"fetch('/api/spaces/{space}').then(r => r.json()).then(d => d.collected[0].id)")
    page.goto(f"{BASE}/collected?space={space}&doc={doc}")
    page.wait_for_selector(".prose-doc")
    page.wait_for_timeout(1500)
    g = groups(page)
    print("1 groups after open:", [x["item"]["kind"] for x in g["groups"]], "focus", g["focus"])
    page.reload()
    page.wait_for_selector(".prose-doc")
    page.wait_for_timeout(1500)
    print("2 after reload panes:", page.locator("[draggable=true].cursor-grab").count(), "url", page.url)

    page.get_by_role("button", name="Line by line").first.click()
    page.wait_for_timeout(1000)
    print("3 both pairs:", page.locator(".prose-doc .pair, .prose-doc .original-block").count())

    page.get_by_label("Download").click()
    page.get_by_role("group", name="Language", exact=True).get_by_role("button", name="Eng").click()
    with page.expect_download() as d:
        page.get_by_role("menu", name="Download").get_by_role("button", name="Download").click()
    print("4 download:", d.value.suggested_filename)

    bars = page.locator("[draggable=true].cursor-grab")
    right = page.locator("section").nth(0).bounding_box()
    bars.nth(1).drag_to(page.locator("section").nth(0), target_position={"x": 20, "y": right["height"] / 2})
    page.wait_for_timeout(800)
    print("5 order after move:", [x["item"]["kind"] for x in groups(page)["groups"]])

    page.locator("[draggable=true].cursor-grab").nth(0).get_by_label("닫기").click()
    page.wait_for_timeout(500)
    g = groups(page)
    print("6 after close:", [x["item"]["kind"] for x in g["groups"]], "focus", g["focus"])

    page.keyboard.press("Meta+Equal")
    page.wait_for_timeout(200)
    print("7 doc zoom:", page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--doc-zoom')"))
    page.keyboard.press("Meta+0")

    page.get_by_label("Settings").click()
    page.get_by_role("dialog").get_by_role("button", name="xAI", exact=True).click()
    page.wait_for_timeout(1500)
    sw = page.get_by_role("dialog").get_by_role("switch").last
    before = sw.get_attribute("aria-checked")
    sw.click()
    page.wait_for_timeout(1200)
    after = page.get_by_role("dialog").get_by_role("switch").last.get_attribute("aria-checked")
    print("8 switch:", before, "->", after, page.get_by_role("dialog").locator("p.text-red-600").all_text_contents())
    page.get_by_role("dialog").get_by_role("switch").last.click()
    page.wait_for_timeout(800)
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    print("9 modal closed:", page.get_by_role("dialog").count() == 0)

    mobile = ctx.new_page()
    mobile.set_viewport_size({"width": 390, "height": 800})
    mobile.goto(BASE + "/collected")
    mobile.wait_for_timeout(2500)
    print("10 mobile visible panes:", mobile.locator("section.bg-white:visible").count())
    mobile.screenshot(path=f"{OUT}/mobile.png")
    print("errors:", errors[:5])
    browser.close()

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

    page.goto(BASE + "/space")
    page.wait_for_selector("text=research")
    page.evaluate("localStorage.removeItem('workbench')")
    page.locator("text=research").first.click()
    page.wait_for_url("**/collected")
    page.get_by_label("Toggle sidebar").click()
    page.wait_for_timeout(800)
    nav = page.locator("nav").first
    if nav.get_by_role("button", name="Collected").count() == 0:
        nav.get_by_role("button", name="openai/codex").click()
    nav.get_by_role("button", name="Collected").wait_for()
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
    print("errors:", errors)
    browser.close()

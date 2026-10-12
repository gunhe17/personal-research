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
    page.evaluate("localStorage.clear()")
    page.reload()
    page.get_by_label("Toggle sidebar").click()
    nav = page.locator("nav").first
    tree = page.evaluate("fetch('/api/tree').then(r => r.json())")["tree"]
    trail, node = [], tree[0]
    while node["type"] == "dir":
        trail.append(node["name"])
        node = node["children"][0]

    nav.get_by_role("button", name="Collected", exact=True).click()
    for name in trail:
        nav.get_by_role("button", name=name, exact=True).first.click()
    leaf = nav.get_by_role("button", name=node["name"], exact=True).first
    leaf.click()
    page.wait_for_selector(".prose-doc")
    print("1 doc opens from tree:", leaf.get_attribute("aria-selected"))
    page.screenshot(path=f"{OUT}/library.png")

    box = page.get_by_label("Search collected")
    box.fill(node["name"].lower())
    print("2 search finds:", nav.get_by_role("button", name=node["name"], exact=True).count() > 0)
    box.fill("zzzz-no-such")
    print("3 empty:", nav.get_by_text("No matches").count())
    box.press("Escape")
    print("4 escape clears:", box.input_value() == "")
    print("errors:", errors[:5])
    browser.close()

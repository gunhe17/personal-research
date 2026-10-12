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
    box = page.get_by_label("Search spaces")
    space = next(s for s in page.evaluate("fetch('/api/spaces').then(r => r.json())")["items"] if s["collected_count"] > 0)
    detail = page.evaluate("id => fetch(`/api/spaces/${id}`).then(r => r.json())", space["id"])
    path = (detail["collected"][0]["documents"] or [detail["collected"][0]])[0]["path"]
    name = path.split("/")[-1]

    box.fill(name.lower())
    leaf = nav.get_by_role("button", name="/".join(path.split("/")[2:]), exact=True)
    leaf.wait_for()
    print("1 doc found by name:", leaf.count(), "| home stays:", nav.get_by_role("button", name="Home").count() == 1)
    page.screenshot(path=f"{OUT}/search.png")
    leaf.click()
    page.wait_for_selector(".prose-doc")
    print("2 opened doc:", page.locator(".prose-doc").count())

    box.fill("zzzz-no-such")
    print("3 empty:", nav.get_by_text("No matches").count())
    box.press("Escape")
    print("4 escape clears:", box.input_value() == "", "| tree back:", nav.get_by_role("button", name=space["title"], exact=True).count())

    box.fill(space["title"][:4])
    nav.get_by_role("button", name=space["title"], exact=True).first.click()
    print("5 reveal clears and expands:", box.input_value() == "", nav.get_by_role("button", name=space["title"], exact=True).first.get_attribute("aria-expanded"))
    nav.get_by_role("button", name="Space", exact=True).hover()
    nav.get_by_label("Collapse all").click()
    page.wait_for_timeout(500)
    print("6 collapse all:", nav.locator("button[aria-expanded=true]").count() == 0)
    agents = page.evaluate("fetch('/api/agent/conversations').then(r => r.json())")["items"]
    if agents:
        row = nav.get_by_role("button", name=agents[0]["title"]).first
        row.click()
        page.wait_for_selector("[data-answer-id]")
        print("7 agent row opens chat:", row.get_attribute("aria-selected"))
        agent_box = page.get_by_label("Search agents")
        agent_box.fill(agents[0]["title"][:6])
        print("8 agent search finds:", nav.get_by_role("button", name=agents[0]["title"]).count() > 0)
        agent_box.fill("zzzz-no-such")
        print("9 agent empty:", nav.get_by_text("No matches").count())
        agent_box.press("Escape")
    nav.get_by_role("button", name="새 대화", exact=True).first.click()
    page.wait_for_timeout(1500)
    print("10 new agent opens empty chat:", nav.get_by_role("button", name="새 대화", exact=True).first.get_attribute("aria-selected"), page.locator("textarea").count())
    print("errors:", errors[:5])
    browser.close()

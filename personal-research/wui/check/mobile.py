import os
import sys

from playwright.sync_api import sync_playwright

from account import sign_in

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
WIDTH = 390

def rect(locator):
    return locator.evaluate("e => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width } }")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    page = browser.new_page(viewport={"width": WIDTH, "height": 844})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.set_default_timeout(15000)
    sign_in(page, BASE)
    page.goto(BASE + "/")
    page.evaluate("localStorage.clear()")
    page.reload()

    agents = page.evaluate("fetch('/api/agent/conversations').then(r => r.json())")["items"]
    agent = agents[0]
    page.get_by_label("Toggle sidebar").click()
    page.wait_for_timeout(400)
    nav = page.locator("nav").first
    folder = nav.get_by_role("button", name="Agent", exact=True)
    if not nav.get_by_role("button", name=agent["title"], exact=True).first.is_visible():
        folder.click()
        page.wait_for_timeout(300)
    nav.get_by_role("button", name=agent["title"], exact=True).first.click()
    page.wait_for_timeout(800)
    print("1 sidebar closed:", page.locator("aside[inert]").count() == 1, "| visible panes:", page.locator("section.bg-white:visible").count())

    composer = page.locator("section.bg-white:visible textarea[aria-label='메시지']").first
    model = page.get_by_role("button", name="model", exact=True)
    picker = page.get_by_role("button", name="provider", exact=True)
    two_rows = picker.bounding_box()["y"] + picker.bounding_box()["height"] <= composer.bounding_box()["y"]
    print("13 composer width:", rect(composer)["width"], rect(composer)["width"] >= 250, "| menus visible:", picker.is_visible() and model.is_visible(), "| two rows:", two_rows)
    composer.locator("xpath=..").screenshot(path=f"{OUT}/composer-390.png")
    model.click()
    page.wait_for_timeout(300)
    menu = rect(page.get_by_role("menu", name="model"))
    print("14 model menu inside:", menu["left"] >= 0 and menu["right"] <= WIDTH)
    model.click()
    page.wait_for_timeout(200)
    picker.click()
    page.wait_for_timeout(300)
    menu = rect(page.get_by_role("menu", name="provider"))
    print("3 provider menu inside:", menu["left"] >= 0 and menu["right"] <= WIDTH, menu)
    picker.click()
    page.wait_for_timeout(200)

    url = next((a for a in agents if (a["title"] or "").startswith("https://")), None)
    if url:
        page.goto(f"{BASE}/collected?agent={url['id']}")
        page.wait_for_timeout(1500)
        bubble = page.locator("section.bg-white:visible div.whitespace-pre-wrap", has_text="https://").first
        fits = bubble.evaluate("e => e.scrollWidth <= e.clientWidth")
        print("5 url bubble fits:", fits, "| page overflow:", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
    else:
        print("5 url bubble: no https:// conversation")

    space = page.evaluate("fetch('/api/spaces').then(r => r.json()).then(d => d.items.find(s => s.collected_count > 0).id)")
    doc = page.evaluate(f"fetch('/api/spaces/{space}').then(r => r.json()).then(d => d.collected[0].id)")
    page.goto(f"{BASE}/collected?space={space}&doc={doc}")
    page.wait_for_selector(".prose-doc")
    page.wait_for_timeout(1500)
    groups = page.evaluate("JSON.parse(localStorage.getItem('workbench') || '{}').groups.length")
    pane = rect(page.locator("section.bg-white:visible").first)
    print("2 groups:", groups, "| pane width:", pane["width"], pane["width"] >= 300, "| page fits:", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
    page.screenshot(path=f"{OUT}/mobile-panes.png")

    tabs = page.get_by_role("tab")
    other = tabs.nth(0 if tabs.nth(1).get_attribute("aria-selected") == "true" else 1)
    other.click()
    page.wait_for_timeout(400)
    print("6 tabs:", tabs.count(), tabs.count() == groups, "| switched:", other.get_attribute("aria-selected") == "true", "| doc hidden:", not page.locator(".prose-doc").first.is_visible())
    page.screenshot(path=f"{OUT}/mobile-tabs.png")

    source = page.locator("section.bg-white:visible button", has_text="repos/").first
    page.locator("[role=tablist] [aria-label='닫기']").last.click()
    page.wait_for_timeout(400)
    print("7 closed:", tabs.count() == groups - 1)
    if source.count():
        source.click()
        page.wait_for_timeout(800)
        print("8 source beside:", tabs.count() == groups, "| doc tab focused:", page.locator("[role=tab][aria-selected=true]").inner_text().startswith("collected"))
    else:
        print("8 source beside: no source link")

    chat = '{"kind":"chat","space":"%s","conversation":""}' % space
    page.goto(f"{BASE}/collected?open={chat}&agent={agent['id']}&space={space}&doc={doc}")
    page.wait_for_timeout(1500)
    strip = page.get_by_role("tablist")
    scrolls = strip.evaluate("e => e.scrollWidth > e.clientWidth")
    strip.evaluate("e => e.scrollLeft = e.scrollWidth")
    print("9 four tabs:", tabs.count() == 4, "| strip scrolls:", scrolls, "| last tab in view:", rect(tabs.last)["right"] <= WIDTH, "| page fits:", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))

    page.get_by_label("Settings").click()
    dialog = page.get_by_role("dialog")
    page.wait_for_timeout(600)
    full = rect(dialog.locator("> div"))
    print("10 settings list:", dialog.get_by_role("button", name="OpenAI", exact=True).is_visible(), "| full width:", full["width"] == WIDTH)
    page.screenshot(path=f"{OUT}/mobile-settings-list.png")
    dialog.get_by_role("button", name="OpenAI", exact=True).click()
    page.wait_for_timeout(600)
    add = dialog.get_by_role("button", name="+ API key")
    box = rect(add)
    print("4 + API key inside:", box["right"] <= WIDTH, box, "| visible:", add.is_visible())
    page.screenshot(path=f"{OUT}/mobile-settings.png")
    hidden = not dialog.get_by_role("button", name="Anthropic", exact=True).is_visible()
    dialog.get_by_label("Back").click()
    page.wait_for_timeout(300)
    print("11 back:", hidden, dialog.get_by_role("button", name="Anthropic", exact=True).is_visible(), "| pane hidden:", not add.is_visible())
    dialog.get_by_label("Close").click()
    print("12 closed:", page.get_by_role("dialog").count() == 0)
    desk = browser.new_page(viewport={"width": 1280, "height": 800})
    sign_in(desk, BASE)
    desk.goto(f"{BASE}/collected?agent={agent['id']}")
    desk.wait_for_timeout(1500)
    composer = desk.locator("section.bg-white:visible textarea[aria-label='메시지']").first
    box, pick = composer.bounding_box(), desk.get_by_role("button", name="provider", exact=True).bounding_box()
    print("15 desktop one row:", abs((box["y"] + box["height"] / 2) - (pick["y"] + pick["height"] / 2)) < 8)
    composer.locator("xpath=..").screenshot(path=f"{OUT}/composer-1280.png")
    print("errors:", errors[:5])
    browser.close()

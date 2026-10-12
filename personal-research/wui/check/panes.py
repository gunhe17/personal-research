import json
import os
import sys

from playwright.sync_api import sync_playwright

from account import sign_in

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
LESSON = {
    "title": "점검 수업",
    "blocks": [
        {"kind": "paragraph", "text": "**굵게** 와 `코드` 가 섞인 문단.", "playground": None},
        {"kind": "playground", "text": "w 를 움직여 보세요.", "playground": {"mode": "derivative", "x": 2, "y": 6, "w": 2, "h": 0.1, "learning_rate": 0.05}},
        {"kind": "playground", "text": "", "playground": {"mode": "descent", "x": 2, "y": 6, "w": 1, "h": 0.1, "learning_rate": 0.05}},
    ],
    "follow_up": "다음 질문",
}

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("response", lambda r: r.status == 404 and errors.append("404 " + r.url))
    page.on("response", lambda r: r.status == 404 and errors.append("404 " + r.url))
    page.set_default_timeout(15000)
    sign_in(page, BASE)
    page.goto(BASE + "/")
    page.evaluate("localStorage.clear()")
    spaces = page.evaluate("fetch('/api/spaces').then(r => r.json())")["items"]
    host = next(s for s in spaces if s["collected_count"] == 0)
    material = page.evaluate(
        "([space, body]) => fetch(`/api/spaces/${space}/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())",
        [host["id"], {"kind": "lesson", "title": "점검 수업", "content": LESSON}],
    )
    try:
        page.goto(f"{BASE}/collected?material={material['id']}")
        page.wait_for_selector("text=PLAYGROUND")
        print("1 lesson title:", page.locator(".article h2").first.inner_text(), "| bold:", page.locator(".article strong").count())
        slider = page.get_by_label("파라미터 w").first
        slider.fill("3")
        page.wait_for_timeout(300)
        print("2 metric after w=3:", page.locator(".playground strong").first.inner_text())
        page.get_by_role("button", name="0.01").first.click()
        print("3 preset active:", "bg-apple" in page.get_by_role("button", name="0.01").first.get_attribute("class"))
        page.get_by_role("button", name="한 번 학습하기 →").click()
        page.wait_for_timeout(300)
        print("4 descent w input:", page.get_by_label("파라미터 w 직접 입력").nth(1).input_value())
        page.screenshot(path=f"{OUT}/lesson.png")
    finally:
        page.evaluate("id => fetch(`/api/materials/${id}`, { method: 'DELETE' })", material["id"])
        page.evaluate("localStorage.removeItem('workbench')")

    page.goto(BASE + "/")
    page.locator("textarea").fill("not a url")
    page.get_by_role("button", name="Mode").click()
    page.get_by_role("menuitem").filter(has_text="Fetch a URL").click()
    page.get_by_label("Send").click()
    page.wait_for_selector("text=Give a URL or an arXiv id")
    print("5 collect validation toast: ok")

    codex = next(s for s in spaces if s["collected_count"] > 0)
    page.goto(f"{BASE}/collected?space={codex['id']}")
    page.wait_for_selector("[data-answer-id]")
    page.wait_for_timeout(1000)
    article = page.locator("[data-answer-id] [data-article] p").last
    article.scroll_into_view_if_needed()
    page.wait_for_timeout(300)
    box = article.bounding_box()
    page.mouse.move(box["x"] + 2, box["y"] + 6)
    page.mouse.down()
    page.mouse.move(box["x"] + 120, box["y"] + 6, steps=6)
    page.mouse.up()
    page.wait_for_timeout(400)
    editor = page.get_by_label("주석 코멘트")
    print("6 annotation editor:", editor.count())
    if editor.count():
        editor.fill("점검 코멘트")
        editor.press("Enter")
        page.wait_for_timeout(300)
        print("7 chip:", page.locator("text=1 annotation").count(), "marker:", page.get_by_label("주석 1 수정").count())
        page.locator("text=1 annotation").click()
        page.get_by_role("button", name="×").first.click()
        page.wait_for_timeout(300)
        print("8 after remove chip:", page.locator("text=1 annotation").count())
    page.screenshot(path=f"{OUT}/annotation.png")

    source = page.locator("text=repos/github/openai/codex/README.md").first
    if source.count():
        source.click()
        page.wait_for_selector(".prose-doc")
        print("9 source opened beside, panes:", len(json.loads(page.evaluate("localStorage.getItem('workbench')"))["groups"]))
        page.get_by_label("Download").click()
        page.get_by_role("group", name="Format", exact=True).get_by_role("button", name="PDF").click()
        with ctx.expect_page() as popup:
            page.get_by_role("menu", name="Download").get_by_role("button", name="Download").click()
        printed = popup.value
        printed.wait_for_selector(".doc-print", state="attached")
        print("10 print window has doc:", printed.locator(".prose-doc, .doc-print").count() > 0, "text len", len(printed.inner_text("body")))
        printed.close()

    page.get_by_label("Settings").click()
    page.get_by_role("dialog").get_by_role("button", name="xAI", exact=True).click()
    page.wait_for_timeout(1500)
    login = page.get_by_role("dialog").get_by_role("button", name="Log in", exact=True).first
    if login.count():
        login.click()
        page.wait_for_selector("text=Open the login page")
        page.wait_for_timeout(8000)
        print("11 sheet code:", page.locator(".select-all").first.inner_text() if page.locator(".select-all").count() else None)
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        print("12 sheet closed, modal open:", page.locator("text=Open the login page").count() == 0, page.get_by_role("dialog").count() == 1)
    page.keyboard.press("Escape")
    print("errors:", errors[:6])
    browser.close()

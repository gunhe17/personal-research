import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    page = browser.new_page(viewport={"width": 1280, "height": 860})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_default_timeout(20000)

    page.goto(BASE + "/")
    page.evaluate("localStorage.removeItem('workbench'); localStorage.removeItem('space-draft')")
    space = page.evaluate("fetch('/api/spaces').then(r => r.json()).then(d => (d.items.find(s => s.collected_count > 0) || d.items[0]).id)")
    page.goto(f"{BASE}/collected?space={space}&new=1")
    page.wait_for_selector("text=이 space 에서 무엇을 배울까요?")
    page.locator("textarea").fill("점검용 질문입니다. 한 문장으로 답해 주세요.")
    page.keyboard.press("Enter")
    page.wait_for_selector("text=점검용 질문입니다")
    page.wait_for_selector("text=중지")
    page.screenshot(path=f"{OUT}/chat-sent.png")
    page.get_by_role("button", name="중지").click()
    page.wait_for_selector("text=답변 생성을 중지했습니다.")
    print("title:", page.locator("[title]").filter(has_text="점검용").count() > 0)
    page.evaluate("fetch(`/api/space/conversations/${JSON.parse(localStorage.getItem('workbench')).groups[0].item.conversation}`, { method: 'DELETE' })")
    print("errors:", errors)
    browser.close()

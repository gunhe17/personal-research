import os
import sys

from playwright.sync_api import sync_playwright

from account import sign_in

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
HELD = []


def slow(page, pattern):
    page.route(pattern, lambda route: HELD.append(route))


def release():
    while HELD:
        HELD.pop(0).continue_()


def seen(page, name, scope="body"):
    page.wait_for_timeout(700)
    count = page.locator(f"{scope} .skeleton").count()
    page.screenshot(path=f"{OUT}/loading-{name}.png")
    return count


def settled(page, scope="body"):
    release()
    page.wait_for_timeout(1500)
    release()
    page.wait_for_timeout(500)
    return page.locator(f"{scope} .skeleton").count() == 0 and page.get_by_text("Loading…").count() == 0


with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=os.environ.get("HEADED") is None)
    context = browser.new_context(viewport={"width": 1280, "height": 860})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_default_timeout(20000)
    sign_in(page, BASE)
    page.goto(BASE + "/")
    page.evaluate("localStorage.clear(); localStorage.setItem('spaceExpanded', JSON.stringify({agents: true, spaces: true, library: true})); localStorage.setItem('sidebarOpen', 'true')")
    spaces = page.request.get(f"{BASE}/api/spaces").json()["items"]
    space = page.request.get(f"{BASE}/api/spaces/{spaces[0]['id']}").json() if spaces else None
    conversation = (space or {}).get("conversations", [{}])[0].get("id") if space and space.get("conversations") else None
    material = (space or {}).get("materials", [{}])[0].get("id") if space and space.get("materials") else None
    document = None
    tree = page.request.get(f"{BASE}/api/tree").json()["tree"]
    stack = list(tree)
    while stack and not document:
        node = stack.pop(0)
        if node["type"] == "file":
            document = node["id"]
        stack[:0] = node.get("children", [])

    slow(page, "**/api/auth/me")
    page.goto(BASE + "/collected")
    print("1 shell skeleton:", seen(page, "shell") > 0, "| settled:", settled(page))
    page.unroute("**/api/auth/me")

    for pattern in ("**/api/agent/conversations", "**/api/tree", "**/api/spaces"):
        slow(page, pattern)
    page.goto(BASE + "/collected")
    page.wait_for_selector("nav")
    print("2 sidebar skeleton:", seen(page, "sidebar", "nav") >= 3, "| settled:", settled(page, "nav"))
    for pattern in ("**/api/agent/conversations", "**/api/tree", "**/api/spaces"):
        page.unroute(pattern)

    if document:
        slow(page, "**/api/file**")
        page.goto(f"{BASE}/collected?doc={document}")
        print("3 doc skeleton:", seen(page, "doc", "main") > 0, "| settled:", settled(page, "main"))
        page.unroute("**/api/file**")
    if material:
        slow(page, "**/api/materials/**")
        page.goto(f"{BASE}/collected?material={material}")
        print("4 material skeleton:", seen(page, "material", "main") > 0, "| settled:", settled(page, "main"))
        page.unroute("**/api/materials/**")
    if conversation:
        slow(page, "**/api/space/conversations/**")
        page.goto(f"{BASE}/collected?space={space['id']}&conversation={conversation}")
        page.wait_for_timeout(300)
        empty = page.get_by_text("이 space 에서 무엇을 배울까요?").count()
        print("5 chat skeleton:", seen(page, "chat") > 0, "| no empty flash:", empty == 0, "| settled:", settled(page))
        page.unroute("**/api/space/conversations/**")

    for pattern in ("**/api/settings", "**/api/skills", "**/api/trash", "**/api/users**"):
        slow(page, pattern)
    page.goto(BASE + "/collected")
    page.get_by_label("Settings").first.click()
    shots = {}
    for name in ("Models", "Function", "Trash", "Users"):
        target = page.get_by_role("dialog").get_by_role("button", name=name)
        if not target.count():
            continue
        target.first.click()
        shots[name] = (seen(page, f"settings-{name.lower()}", "[role=dialog]") > 0, settled(page, "[role=dialog]"))
    print("6 settings skeleton/settled:", shots)
    print("7 no Loading text anywhere:", page.get_by_text("Loading…").count() == 0)
    print("errors:", errors[:5])
    browser.close()

import os
import sys

from playwright.sync_api import sync_playwright

from account import sign_in

BASE = os.environ.get("WUI_URL", "http://localhost:3000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
WORDS = ["나는", "배를", "먹었다"]
LESSON = {
    "title": "그림 점검",
    "blocks": [
        {"kind": "paragraph", "text": "어텐션은 행마다 합이 1이다. 확률은 $p_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}$ 로 구한다.", "playground": None, "visual": None},
        {"kind": "math", "text": "\\mathrm{Attention}(Q,K,V) = \\mathrm{softmax}\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V", "playground": None, "visual": None},
        {"kind": "math", "text": "W = \\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}", "playground": None, "visual": None},
        {"kind": "visual", "text": "행: 질의 · 열: 참조", "playground": None, "visual": {"type": "heatmap", "rows": WORDS, "columns": WORDS, "values": [[0.67, 0.24, 0.09], [0.07, 0.89, 0.05], [0.24, 0.13, 0.63]]}},
        {"kind": "visual", "text": "설명용 좌표입니다.", "playground": None, "visual": {"type": "scatter", "x_label": "차원 1", "y_label": "차원 2", "points": [
            {"x": 1, "y": 4, "label": "사과", "group": "과일"}, {"x": 1.6, "y": 4.4, "label": "배", "group": "과일"}, {"x": 0.6, "y": 3.6, "label": "바나나", "group": "과일"},
            {"x": 4.4, "y": 1.2, "label": "버스", "group": "탈것"}, {"x": 5, "y": 1.8, "label": "기차", "group": "탈것"}, {"x": 4.2, "y": 2.2, "label": "배(선박)", "group": "탈것"},
            {"x": 3.6, "y": 4.4, "label": "고양이", "group": "동물"}, {"x": 4.2, "y": 4.8, "label": "강아지", "group": "동물"},
        ]}},
        {"kind": "visual", "text": "활성화 함수", "playground": None, "visual": {"type": "plot", "x_label": "x", "y_label": "", "x_range": {"min": -4, "max": 4}, "y_range": None,
            "functions": [{"expression": "sigmoid(x)", "label": "sigmoid"}, {"expression": "tanh(x)", "label": "tanh"}, {"expression": "relu(x)", "label": "ReLU"}, {"expression": "nope(x)", "label": "broken"}],
            "series": [], "points": [{"x": 0, "y": 0.5, "label": "σ(0)=0.5"}], "marks": [{"x": 0, "label": "x=0"}]}},
        {"kind": "visual", "text": "다음 토큰 확률", "playground": None, "visual": {"type": "bar", "x_label": "", "y_label": "확률", "bars": [
            {"label": "사과", "value": 0.62, "highlight": True}, {"label": "배", "value": 0.21, "highlight": False}, {"label": "밥", "value": 0.12, "highlight": False}, {"label": "물", "value": 0.05, "highlight": False}]}},
        {"kind": "visual", "text": "벡터 합", "playground": None, "visual": {"type": "vectors", "vectors": [
            {"x": 3, "y": 1, "from_x": 0, "from_y": 0, "label": "a"}, {"x": 1, "y": 2, "from_x": 3, "from_y": 1, "label": "b"}, {"x": 4, "y": 3, "from_x": 0, "from_y": 0, "label": "a+b"}]}},
        {"kind": "visual", "text": "", "playground": None, "visual": {"type": "table", "columns": ["단계", "식", "값"], "rows": [["점수", "$z = QK^\\top$", "2.0"], ["확률", "$\\mathrm{softmax}(z)$", "0.62"]]}},
        {"kind": "visual", "text": "트랜스포머 블록", "playground": None, "visual": {"type": "graph", "direction": "down", "nodes": [
            {"id": "x", "label": "입력 임베딩", "group": "입력"}, {"id": "attn", "label": "셀프 어텐션", "group": "연산"}, {"id": "add1", "label": "더하기·정규화", "group": "연산"},
            {"id": "ffn", "label": "피드포워드", "group": "연산"}, {"id": "add2", "label": "더하기·정규화", "group": "연산"}, {"id": "y", "label": "출력", "group": "입력"}],
            "edges": [{"from": "x", "to": "attn", "label": ""}, {"from": "attn", "to": "add1", "label": ""}, {"from": "x", "to": "add1", "label": "잔차"}, {"from": "add1", "to": "ffn", "label": ""},
                      {"from": "ffn", "to": "add2", "label": ""}, {"from": "add1", "to": "add2", "label": "잔차"}, {"from": "add2", "to": "y", "label": ""}]}},
        {"kind": "visual", "text": "", "playground": None, "visual": {"type": "tokens", "items": [
            {"text": "나는", "id": 41325, "highlight": False}, {"text": " 배", "id": 9012, "highlight": True}, {"text": "를", "id": None, "highlight": False},
        ]}},
    ],
    "follow_up": "",
}

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
    space = page.request.post(f"{BASE}/api/spaces", data={"title": "visual check", "purpose": "goal"}, headers={"Origin": BASE}).json()["id"]
    material = page.request.post(f"{BASE}/api/spaces/{space}/materials", data={"kind": "lesson", "title": "그림 점검", "content": LESSON}, headers={"Origin": BASE}).json()
    try:
        page.goto(f"{BASE}/collected?material={material['id']}")
        page.wait_for_selector("figure.visual")
        figures = page.locator("figure.visual")
        print("1 figures:", figures.count() == 8, "| katex:", page.locator(".article .katex").count() >= 5, "| katex errors:", page.locator(".katex-error").count() == 0)
        print("2 heatmap cells:", figures.nth(0).locator("rect").count() == 9, "| caption:", figures.nth(0).locator("figcaption").inner_text() == "행: 질의 · 열: 참조")
        plot = figures.nth(2)
        print("7 plot lines:", plot.locator("path[fill='none']").count() == 3, "| broken shown:", "nope(x)" in plot.inner_text())
        print("8 bar:", figures.nth(3).locator("rect").count() == 4, "| vectors:", figures.nth(4).locator("line[marker-end]").count() == 3)
        print("9 table math:", figures.nth(5).locator(".katex").count() == 2, "| graph nodes:", figures.nth(6).locator("g > text").count() >= 6)
        page.locator(".article").first.locator("p, .math-block").first.screenshot(path=f"{OUT}/visual-inline.png")
        page.locator(".math-block").nth(0).screenshot(path=f"{OUT}/visual-math.png")
        page.locator(".math-block").nth(1).screenshot(path=f"{OUT}/visual-matrix.png")
        for index, name in enumerate(["heatmap", "scatter", "plot", "bar", "vectors", "table", "graph", "tokens"]):
            figures.nth(index).screenshot(path=f"{OUT}/visual-{name}.png")
        scatter = figures.nth(1)
        print("3 scatter points:", scatter.locator("circle").count() == 8, "| legend:", scatter.get_by_role("button").count() == 3, "| clusters:", scatter.locator("ellipse").count() == 3)
        scatter.get_by_role("button", name="탈것").hover()
        page.wait_for_timeout(300)
        print("4 legend dims others:", scatter.locator("g[style*='opacity: 0.25']").count() == 5)
        print("5 tokens:", figures.nth(7).locator("span", has_text="␣배").count() == 1)
        page.screenshot(path=f"{OUT}/visual.png", full_page=True)
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(800)
        width = page.evaluate("document.querySelectorAll('figure.visual')[1].querySelector('svg').getBoundingClientRect().width")
        print("6 phone scatter fits:", width <= 390, "| no page scroll:", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        page.screenshot(path=f"{OUT}/visual-phone.png", full_page=True)
    finally:
        page.request.delete(f"{BASE}/api/spaces/{space}", headers={"Origin": BASE})
    print("errors:", errors[:5])
    browser.close()

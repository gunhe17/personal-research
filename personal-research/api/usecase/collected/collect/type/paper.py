from __future__ import annotations

import base64
import json
import mimetypes
import re
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

from usecase.collected.record import record as documents
from usecase.common import store

ID = re.compile(r"(\d{4}\.\d{4,5})(v\d+)?")
BLOCK = {
    "p", "div", "section", "article", "li", "ul", "ol", "table", "tr", "td", "th",
    "h1", "h2", "h3", "h4", "h5", "h6", "figure", "figcaption", "blockquote", "dt", "dd",
    "header", "footer", "nav", "br",
}
OPAQUE = {"cite", "math", "code", "pre", "a", "script", "style"}
SKIP_CLASS = re.compile(r"ltx_bibliography|ltx_bibitem|ltx_tag|ltx_creator|ltx_personname")
BODY_CLASS = "ltx_document"
PLACEHOLDER = re.compile(r"⟦(\d+)⟧")
HAS_LETTER = re.compile(r"[A-Za-z]")


# #
# get

def get(*, id: str) -> documents.Document:
    matched = ID.search(id)
    if not matched:
        raise ValueError(f"arXiv id 를 찾지 못했다: {id}")
    arxiv = matched.group(1)
    page, title = build(page_url=f"https://arxiv.org/html/{arxiv}")
    document = documents.Document(
        path=f"paper/arxiv/{documents.slugify(title=title)}.html",
        body=page,
        url=f"https://arxiv.org/abs/{arxiv}",
        meta={"fetched": store.today(), "via": "arXiv html"},
    )

    return document


# #
# build

def fetch(*, url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (personal-research document mirror)"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def inline_css(*, url: str, depth: int = 0) -> str:
    if depth > 3:
        return ""
    try:
        text = fetch(url=url).decode("utf-8", "replace")
    except Exception as exc:
        print(f"  css 실패 {url}: {exc}", file=sys.stderr)
        return ""

    def pull(match):
        target = urllib.parse.urljoin(url, match.group(1))
        return inline_css(url=target, depth=depth + 1)

    return re.sub(r'@import\s+"([^"]+)"[^;]*;', pull, text)


def data_uri(*, url: str) -> str:
    blob = fetch(url=url)
    mime = mimetypes.guess_type(url)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(blob).decode()


def build(*, page_url: str) -> tuple[str, str]:
    html = fetch(url=page_url).decode("utf-8", "replace")

    sheets = []
    for tag in re.findall(r"<link\b[^>]*>", html):
        if 'rel="stylesheet"' not in tag:
            continue
        href = re.search(r'href="([^"]+)"', tag)
        if not href:
            continue
        target = urllib.parse.urljoin(page_url, href.group(1))
        if "typekit" in target or "fonts.googleapis" in target:
            html = html.replace(tag, "")
            continue
        sheets.append(inline_css(url=target))
        html = html.replace(tag, "")
    if sheets:
        html = html.replace("</head>", "<style>\n" + "\n".join(sheets) + "\n</style>\n</head>", 1)

    html = re.sub(r"<script\b[^>]*\bsrc=[^>]*>\s*</script>", "", html)

    embedded = failed = 0
    for src in dict.fromkeys(re.findall(r'<img[^>]+src="([^"]+)"', html)):
        if src.startswith("data:"):
            continue
        try:
            html = html.replace(f'src="{src}"', f'src="{data_uri(url=urllib.parse.urljoin(page_url, src))}"')
            embedded += 1
        except Exception as exc:
            failed += 1
            print(f"  이미지 실패 {src}: {exc}", file=sys.stderr)

    title = re.search(r"<title>([^<]*)</title>", html)
    print(f"  이미지 {embedded}개 embed, 실패 {failed}개, {len(html) // 1024}KB", file=sys.stderr)
    return html, (title.group(1).strip() if title else "untitled")


# #
# segment

class BlockCollector(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.cursor = 0
        self.stack = []
        self.classes = []
        self.in_body = False
        self.opaque_depth = 0
        self.segments = []
        self.reset_block()

    def reset_block(self):
        self.template = ""
        self.parts = []
        self.start = None
        self.end = None

    def consume(self, raw):
        where = self.source.find(raw, self.cursor)
        if where < 0:
            return None
        self.cursor = where + len(raw)
        return where, self.cursor

    def closing_raw(self, tag):
        where = self.source.find("</", self.cursor)
        if where < 0:
            return f"</{tag}>"
        return self.source[where : self.source.index(">", where) + 1]

    def add_text(self, raw):
        span = self.consume(raw)
        if not span:
            return
        if self.opaque_depth and self.parts:
            self.parts[-1] += raw
        else:
            if self.start is None:
                self.start = span[0]
            self.template += raw
        self.end = span[1]

    def add_part(self, raw):
        span = self.consume(raw)
        if not span:
            return
        if self.opaque_depth > 1 and self.parts:
            self.parts[-1] += raw
        elif self.start is None:
            return
        else:
            self.template += f"⟦{len(self.parts)}⟧"
            self.parts.append(raw)
        self.end = span[1]

    def absorb(self, raw):
        span = self.consume(raw)
        if span and self.parts:
            self.parts[-1] += raw
            self.end = span[1]

    def flush(self):
        text = PLACEHOLDER.sub("", self.template).strip()
        skip = any(SKIP_CLASS.search(c) for c in self.classes)
        if (
            self.in_body
            and not skip
            and self.start is not None
            and len(HAS_LETTER.findall(text)) >= 2
            and not re.fullmatch(r"[A-Za-z]?[\d.\s]+", text)
        ):
            self.segments.append(
                {
                    "id": len(self.segments),
                    "start": self.start,
                    "end": self.end,
                    "en": self.template.strip(),
                    "parts": self.parts,
                    "ko": "",
                }
            )
        self.reset_block()

    def handle_starttag(self, tag, attrs):
        raw = self.get_starttag_text()
        klass = dict(attrs).get("class", "")
        if BODY_CLASS in klass:
            self.in_body = True
        if tag in OPAQUE:
            self.opaque_depth += 1
            self.add_part(raw) if self.opaque_depth == 1 else self.absorb(raw)
        elif tag in BLOCK and not self.opaque_depth:
            self.flush()
            self.consume(raw)
        else:
            self.add_part(raw)
        self.stack.append(tag)
        self.classes.append(klass)

    def handle_endtag(self, tag):
        raw = self.closing_raw(tag)
        if tag in OPAQUE and self.opaque_depth:
            self.opaque_depth -= 1
            self.absorb(raw)
        elif tag in BLOCK and not self.opaque_depth:
            self.flush()
            self.consume(raw)
        else:
            self.add_part(raw)
        if tag in self.stack:
            while self.stack and self.stack.pop() != tag:
                self.classes.pop()
            if self.classes:
                self.classes.pop()

    def handle_startendtag(self, tag, attrs):
        self.add_part(self.get_starttag_text())

    def handle_data(self, data):
        self.add_text(data)

    def handle_entityref(self, name):
        self.add_text(f"&{name};")

    def handle_charref(self, name):
        self.add_text(f"&#{name};")


def collect(*, body: str) -> list[dict]:
    parser = BlockCollector(body)
    parser.feed(body)
    parser.flush()

    return parser.segments


def extract(*, body: str, segments: Path) -> Path:
    found = collect(body=body)
    segments.parent.mkdir(parents=True, exist_ok=True)
    segments.write_text(
        json.dumps([{"en": s["en"], "ko": ""} for s in found], ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    words = sum(len(PLACEHOLDER.sub("", s["en"]).split()) for s in found)
    print(f"  세그먼트 {len(found)}개, 약 {words} 단어", file=sys.stderr)

    return segments


def inject(*, body: str, segments: Path) -> str:
    found = collect(body=body)
    given = json.loads(segments.read_text(encoding="utf-8"))
    if len(given) != len(found):
        raise ValueError(f"세그먼트 수가 원문과 다르다: 번역 {len(given)}개, 원문 {len(found)}개")
    source = body
    done = skipped = 0
    for index in reversed(range(len(found))):
        segment, translated = found[index], given[index]
        korean = (translated.get("ko") or "").strip()
        if not korean:
            skipped += 1
            continue
        if translated.get("en", segment["en"]) != segment["en"]:
            print(f"  건너뜀 #{index}: 번역본의 en 이 원문과 다름", file=sys.stderr)
            skipped += 1
            continue
        want, got = set(PLACEHOLDER.findall(segment["en"])), set(PLACEHOLDER.findall(korean))
        if want != got:
            print(f"  건너뜀 #{index}: 자리표시자 {sorted(want)} vs {sorted(got)}", file=sys.stderr)
            skipped += 1
            continue
        original = source[segment["start"] : segment["end"]]
        restore = lambda text: PLACEHOLDER.sub(lambda m: segment["parts"][int(m.group(1))], text)
        if original.strip() != restore(segment["en"]):
            print(f"  건너뜀 #{index}: 원문이 어긋남", file=sys.stderr)
            skipped += 1
            continue
        lead = original[: len(original) - len(original.lstrip())]
        trail = original[len(original.rstrip()) :]
        source = source[: segment["start"]] + lead + restore(korean) + trail + source[segment["end"] :]
        done += 1
    print(f"  번역 반영 {done}개, 미반영 {skipped}개, {len(source) // 1024}KB", file=sys.stderr)

    return source

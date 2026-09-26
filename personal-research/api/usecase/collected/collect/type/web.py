from __future__ import annotations

import html
import re
import urllib.error
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

from usecase.common import store

SYNCED = (
    "platform.claude.com/",
    "code.claude.com/",
    "ai.google.dev/",
    "docs.poolside.ai/",
    "llama.developer.meta.com/",
    "www.anthropic.com/engineering/",
)
PROVIDER = {
    "www.anthropic.com/engineering/": "docs/anthropic-engineering",
    "earendil.com/posts/": "docs/earendil",
    "openai.com/index/": "docs/openai",
    "research.google/blog/": "docs/research-google",
}
ARCHIVED = ("openai.com",)


# #
# get

def get(*, url: str, rel: str | None = None) -> store.Document:
    markdown = fetch(url=url if url.endswith(".md") else url.rstrip("/") + ".md")
    if markdown and not markdown.lstrip().startswith("<"):
        head, body = store.split(text=markdown)
        name = urlparse(url).path.rstrip("/").rsplit("/", 1)[-1].removesuffix(".md")
        document = store.Document(
            path=rel or f"{provider(url=url)}/{name}.md",
            body=body,
            url=url,
            decoration=head,
            extra={"fetched": store.today(), "via": "markdown 원문"},
        )
        return document

    archived = urlparse(url).netloc.removeprefix("www.") in ARCHIVED
    page = fetch(url=f"https://web.archive.org/web/2/{url}" if archived else url)
    if not page:
        raise ValueError(f"페이지를 받지 못했다: {url}")
    if archived:
        page = re.sub(r"(?:https?://web\.archive\.org)?/web/\d+[a-z_]*/", "", page)
    converted = convert(page=page, url=url)
    if not converted:
        raise ValueError(f"본문(<article> 이나 <main>)을 찾지 못했다: {url}")
    body, published = converted
    heading = body.splitlines()[0]
    name = store.slugify(title=heading[2:]) if heading.startswith("# ") else "untitled"
    document = store.Document(
        path=rel or f"{provider(url=url)}/{name}.md",
        body=body,
        url=url,
        extra={
            "published": published,
            "fetched": store.today(),
            "via": "web.archive.org 스냅샷 html 변환" if archived else "html 변환",
        },
    )

    return document


def fetch(*, url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (personal-research document mirror)"})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.read().decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError):
        return ""


def synced(*, url: str) -> bool:
    address = url.split("://", 1)[-1]

    return address.startswith(SYNCED)


def provider(*, url: str) -> str:
    address = url.split("://", 1)[-1]
    for prefix, name in PROVIDER.items():
        if address.startswith(prefix):
            return name
    host = urlparse(url).netloc.removeprefix("www.")

    return "docs/" + host.rsplit(".", 1)[0].replace(".", "-")


# #
# convert

SKIP = {
    "button", "svg", "path", "template", "script", "style", "noscript",
    "nav", "header", "footer", "aside", "form", "audio", "video",
}
HIDDEN_CLASS = re.compile(r"\b(sr-only|visually-hidden|screen-reader-text)\b")
HEADING = {"h1": "#", "h2": "##", "h3": "###", "h4": "####", "h5": "#####", "h6": "######"}


class ArticleToMarkdown(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.skip_depth = 0
        self.code_lines = None
        self.code_lang = ""
        self.lists = []
        self.emphasis = []
        self.tables = []
        self.cell_start = None

    def w(self, text):
        self.out.append(text)

    def gap(self, n):
        while self.out:
            trimmed = self.out[-1].rstrip("\n\t ")
            if trimmed:
                self.out[-1] = trimmed
                break
            self.out.pop()
        if self.out:
            self.w("\n" * n)

    def close_emphasis(self):
        if not self.emphasis:
            return
        start, marker = self.emphasis.pop()
        inner = self.take(start)
        core = inner.strip()
        if not core:
            self.w(inner)
            return
        lead = inner[: len(inner) - len(inner.lstrip())]
        trail = inner[len(inner.rstrip()) :]
        self.w(f"{lead}{marker}{core}{marker}{trail}")

    def take(self, start):
        text = "".join(self.out[start:])
        del self.out[start:]
        return text

    def close_table(self):
        rows = self.tables.pop()
        rows = [r for r in rows if r[1]]
        if not rows:
            return
        width = max(len(cells) for _, cells in rows)
        if rows[0][0]:
            header, body = rows[0][1], [cells for _, cells in rows[1:]]
        else:
            header, body = [""] * width, [cells for _, cells in rows]
        pad = lambda cells: cells + [""] * (width - len(cells))
        lines = ["| " + " | ".join(pad(header)) + " |", "|" + "---|" * width]
        lines += ["| " + " | ".join(pad(cells)) + " |" for cells in body]
        self.gap(2)
        self.w("\n".join(lines))
        self.gap(2)

    def handle_starttag(self, tag, attrs):
        if self.skip_depth:
            self.skip_depth += 1
            return
        if tag in SKIP:
            self.skip_depth = 1
            return
        attr = dict(attrs)
        if HIDDEN_CLASS.search(attr.get("class", "")):
            self.skip_depth = 1
            return

        if tag == "pre":
            self.code_lines = []
            self.code_lang = ""
        elif tag == "code":
            if self.code_lines is not None:
                lang = attr.get("class", "").strip()
                self.code_lang = "" if lang == "plaintext" else lang
            else:
                self.w("`")
        elif tag in HEADING:
            self.gap(2)
            self.w(HEADING[tag] + " ")
        elif tag == "p":
            self.gap(2)
        elif tag in ("ul", "ol"):
            self.gap(2)
            self.lists.append([0] if tag == "ol" else "ul")
        elif tag == "li":
            self.gap(1)
            depth = max(0, len(self.lists) - 1)
            marker = "- "
            if self.lists and self.lists[-1] != "ul":
                self.lists[-1][0] += 1
                marker = f"{self.lists[-1][0]}. "
            self.w("  " * depth + marker)
        elif tag in ("strong", "b", "em", "i"):
            self.emphasis.append((len(self.out), "**" if tag in ("strong", "b") else "*"))
        elif tag == "a":
            self.w("[")
        elif tag == "blockquote":
            self.gap(2)
            self.w("> ")
        elif tag == "hr":
            self.gap(2)
            self.w("---")
            self.gap(2)
        elif tag == "br":
            self.w("\n")
        elif tag == "img":
            alt = attr.get("alt", "").strip()
            src = attr.get("src", "")
            if alt or src:
                self.gap(2)
                self.w(f"![{alt}]({src})")
        elif tag == "math":
            fence = "$$" if attr.get("display") == "block" else "$"
            latex = attr.get("alttext", "").strip()
            if latex:
                self.w(f"{fence}{latex}{fence}")
            self.skip_depth = 1
        elif tag == "figcaption":
            self.gap(2)
        elif tag == "table":
            self.tables.append([])
        elif tag == "tr":
            if self.tables:
                self.tables[-1].append((False, []))
        elif tag in ("th", "td"):
            if self.tables:
                if not self.tables[-1]:
                    self.tables[-1].append((False, []))
                if tag == "th":
                    _, cells = self.tables[-1][-1]
                    self.tables[-1][-1] = (True, cells)
                self.cell_start = len(self.out)

    def handle_endtag(self, tag):
        if self.skip_depth:
            self.skip_depth -= 1
            return

        if tag == "pre":
            body = "".join(self.code_lines or []).strip("\n")
            self.code_lines = None
            self.gap(2)
            self.w(f"```{self.code_lang}\n{body}\n```")
            self.gap(2)
        elif tag == "code":
            if self.code_lines is None:
                self.w("`")
        elif tag in HEADING or tag == "p":
            self.gap(2)
        elif tag in ("ul", "ol"):
            if self.lists:
                self.lists.pop()
            self.gap(2)
        elif tag in ("strong", "b", "em", "i"):
            self.close_emphasis()
        elif tag == "a":
            self.w("]")
        elif tag == "blockquote":
            self.gap(2)
        elif tag == "figcaption":
            self.gap(2)
        elif tag in ("th", "td"):
            if self.tables and self.cell_start is not None:
                cell = re.sub(r"\s+", " ", self.take(self.cell_start)).strip()
                self.tables[-1][-1][1].append(cell.replace("|", r"\|"))
                self.cell_start = None
        elif tag == "table":
            if self.tables:
                self.close_table()

    def handle_data(self, data):
        if self.skip_depth:
            return
        if self.code_lines is not None:
            self.code_lines.append(data)
            return
        text = re.sub(r"[ \t]*\n[ \t]*", " ", data.replace("\xa0", " "))
        if text.strip() in ("Loading…", "Loading..."):
            return
        if not text.strip():
            if self.out and not "".join(self.out[-1:]).endswith((" ", "\n", "[", "`")):
                self.w(" ")
            return
        self.w(text)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in ("br", "hr", "img"):
            self.handle_endtag(tag)

    def result(self):
        text = "".join(self.out)
        text = re.sub(r"\[\s+", "[", text)
        text = re.sub(r"\s+\]", "]", text)
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip() + "\n"


def convert(*, page: str, url: str) -> tuple[str, dict] | None:
    match = re.search(r"<article\b.*?</article>", page, re.S) or re.search(
        r"<main\b.*</main>", page, re.S
    )
    if not match:
        return None
    body = match.group(0)
    body = re.sub(
        r'\b(href|src)="([^"]*)"',
        lambda m: f'{m.group(1)}="{m.group(2) if m.group(2).startswith("#") else urljoin(url, m.group(2))}"',
        body,
    )
    body = re.sub(
        r'<a\b[^>]*?href="([^"]*)"[^>]*>(.*?)</a>',
        lambda m: f"<a>{m.group(2)}</a>__HREF__{html.escape(m.group(1))}__ENDHREF__",
        body,
        flags=re.S,
    )
    parser = ArticleToMarkdown()
    parser.feed(body)
    text = parser.result()
    text = re.sub(r"\]\s*__HREF__(.*?)__ENDHREF__", lambda m: f"]({m.group(1)})", text)
    text = text.replace("__HREF__", "(").replace("__ENDHREF__", ")")
    text = re.sub(r"(?<!!)\[\]\([^)]*\)", "", text)

    title = re.search(r'<meta property="og:title" content="([^"]*)"', page) or re.search(
        r"<title>([^<]*)</title>", page
    )
    date = re.search(r'"datePublished":"([^"T"]*)', page)
    header = ""
    if title:
        name = html.unescape(title.group(1))
        header = f"# {name}\n\n"
        text = re.sub(r"(?m)^#\s+" + re.escape(name) + r"[ \t]*$\n+", "", text, count=1)
    return header + text, (date.group(1) if date else None)

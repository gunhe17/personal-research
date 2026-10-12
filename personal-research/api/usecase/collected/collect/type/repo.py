from __future__ import annotations

import json
import re
import urllib.error
import urllib.request

from usecase.common import store

URL = re.compile(r"^https?://github\.com/([^/]+)/([^/#?]+?)(?:\.git)?(?:/(?:blob|tree)/([^/]+)/(.+?))?/?$")
HEADERS = {"User-Agent": "personal-research document mirror", "Accept": "application/vnd.github+json"}


# #
# get

def card(*, url: str) -> tuple[str, dict]:
    owner, repo, _, _ = parse(url=url)
    info = api(owner=owner, repo=repo)
    fields = {
        "description": (info.get("description") or "").strip(),
        "default_branch": info.get("default_branch"),
        "language": info.get("language"),
        "stars": info.get("stargazers_count"),
        "status": "archived" if info.get("archived") else None,
        "updated_upstream": info.get("updated_at"),
        "fetched": store.today(),
        "api_error": info.get("_api_error"),
    }
    data = {k: v for k, v in fields.items() if v not in (None, "")}

    return f"repository/github/{owner}/{repo}", f"https://github.com/{owner}/{repo}", data


def get(*, url: str, path: str | None = None) -> store.Document:
    owner, repo, branch, given = parse(url=url)
    path = path or given or "README.md"
    branch = branch or api(owner=owner, repo=repo).get("default_branch") or "main"
    try:
        with urllib.request.urlopen(f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}", timeout=30) as response:
            text = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        raise ValueError(f"문서를 찾지 못했다: {owner}/{repo}@{branch}/{path} ({error.code})") from None
    document = store.Document(
        path=f"repository/github/{owner}/{repo}/{path}",
        body=rewrite(text=text, owner=owner, repo=repo, branch=branch, path=path),
        url=f"https://github.com/{owner}/{repo}/blob/{branch}/{path}",
        extra={
            "branch": branch,
            "fetched": store.today(),
            "via": "raw.githubusercontent.com",
        },
    )

    return document


# #
# fetch

def parse(*, url: str) -> tuple[str, str, str | None, str | None]:
    matched = URL.match(url.strip())
    if not matched:
        raise ValueError(f"GitHub 저장소 URL 이 아니다: {url}")

    return matched.group(1), matched.group(2), matched.group(3), matched.group(4)


def api(*, owner: str, repo: str) -> dict:
    request = urllib.request.Request(f"https://api.github.com/repos/{owner}/{repo}", headers=HEADERS)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        if error.code == 404:
            raise ValueError(f"저장소를 찾지 못했다: {owner}/{repo}") from None
        return {"_api_error": f"HTTP {error.code}"}
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        return {"_api_error": str(error)}


# #
# rewrite

def rewrite(*, text: str, owner: str, repo: str, branch: str, path: str) -> str:
    raw_base = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/"
    blob_base = f"https://github.com/{owner}/{repo}/blob/{branch}/"
    tree_base = f"https://github.com/{owner}/{repo}/tree/{branch}/"
    folder = "/".join(path.split("/")[:-1])

    def is_relative(path: str) -> bool:
        return not (path.startswith(("http://", "https://", "#", "mailto:")))

    def resolve(target: str) -> str:
        target = target[2:] if target.startswith("./") else target
        return f"{folder}/{target}" if folder and not target.startswith("/") else target.lstrip("/")

    def img_sub(m: re.Match) -> str:
        alt, path = m.group(1), m.group(2)
        if is_relative(path):
            path = raw_base + resolve(path)
        return f"![{alt}]({path})"

    text = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", img_sub, text)

    def htmlimg_sub(m: re.Match) -> str:
        pre, path, post = m.group(1), m.group(2), m.group(3)
        if is_relative(path):
            path = raw_base + resolve(path)
        return f"{pre}{path}{post}"

    text = re.sub(r'(<img\b[^>]*\bsrc=")([^"]+)("[^>]*>)', htmlimg_sub, text)

    def link_sub(m: re.Match) -> str:
        bang, label, path = m.group(1), m.group(2), m.group(3)
        if bang == "!" or not is_relative(path):
            return m.group(0)
        resolved = resolve(path)
        path = tree_base + resolved if path.rstrip().endswith("/") else blob_base + resolved
        return f"{bang}[{label}]({path})"

    text = re.sub(r"(!?)\[([^\]]*)\]\(([^)]+)\)", link_sub, text)
    return text

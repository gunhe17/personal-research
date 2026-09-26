#!/bin/bash
set -u
cd "$(dirname "$0")"
COLLECT="$PWD/collect.py"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

tmpfile() {
  echo "$WORK/$(echo "$1" | tr '/' '_')"
}

dl() {
  local url="$1" rel="$2" tmp
  tmp=$(tmpfile "$rel")
  code=$(curl -sL --retry 2 -o "$tmp" -w "%{http_code}" "$url")
  if [ "$code" = "200" ] && ! head -c 1 "$tmp" | grep -q '<'; then
    python3 "$COLLECT" ingest "$url" "$rel" "$tmp" > /dev/null
  else
    echo "SKIP $code $url"
    rm -f "$tmp"
    return 1
  fi
}

run_list() {
  local n=0
  while IFS='|' read -r u f; do
    dl "$u" "$f" &
    n=$((n + 1))
    [ $((n % 8)) -eq 0 ] && wait
  done
  wait
}

echo "== anthropic =="
curl -s https://platform.claude.com/llms.txt \
  | grep -oE 'https://platform\.claude\.com/[^) ]+\.md' | sort -u \
  | while read -r u; do echo "$u|docs/anthropic/${u#https://platform.claude.com/}"; done \
  | run_list

echo "== claude-code =="
curl -s https://code.claude.com/llms.txt \
  | grep -oE 'https://code\.claude\.com/[^) ]+\.md' | sort -u \
  | while read -r u; do echo "$u|docs/claude-code/${u#https://code.claude.com/}"; done \
  | run_list

echo "== poolside =="
curl -s https://docs.poolside.ai/llms.txt \
  | grep -oE 'https://docs\.poolside\.ai/[^) ]+\.md' | sort -u \
  | while read -r u; do echo "$u|docs/poolside/${u#https://docs.poolside.ai/}"; done \
  | run_list

echo "== gemini =="
curl -sL https://ai.google.dev/gemini-api/docs/llms.txt \
  | grep -oE 'https://ai\.google\.dev/gemini-api/[^) ]+\.md\.txt' | sort -u \
  | while read -r u; do p="${u#https://ai.google.dev/gemini-api/}"; echo "$u|docs/gemini/${p%.txt}"; done \
  | run_list

echo "== anthropic-engineering blog =="
curl -s https://www.anthropic.com/sitemap.xml \
  | grep -oE '<loc>https://www\.anthropic\.com/engineering/[^<]+</loc>' \
  | sed -e 's|<loc>||' -e 's|</loc>||' | sort -u \
  | grep -v '/engineering/claude-code-best-practices$' \
  | while read -r u; do
      rel="docs/anthropic-engineering/${u#https://www.anthropic.com/engineering/}.md"
      python3 "$COLLECT" web "$u" --rel "$rel" > /dev/null 2>&1 || echo "SKIP convert $u"
    done

echo "== research.google index =="
curl -s https://research.google/sitemap_main.xml | python3 -c '
import re, sys
xml = sys.stdin.read()
posts = re.findall(
    r"<loc>(https://research\.google/blog/[^<]+)</loc>\s*<lastmod>([^<]*)</lastmod>", xml
)
posts = sorted(set(posts), key=lambda p: p[1], reverse=True)
print("# research.google/blog 목록")
print()
print(f"글 {len(posts)}편. 본문은 담지 않고 주소만 둔다. 필요한 글은 이렇게 받는다.")
print()
print("```sh")
print("python3 personal-research/api/bin/collect.py web <url>")
print("```")
print()
for url, date in posts:
    title = url.rstrip("/").rsplit("/", 1)[-1].replace("-", " ").capitalize()
    print(f"- {date} [{title}]({url})")
' > "$WORK/research-google-index.md"
python3 "$COLLECT" ingest "https://research.google/blog/" "docs/research-google/index.md" "$WORK/research-google-index.md" > /dev/null

echo "== llama =="
BASE="https://llama.developer.meta.com"
queue=$(mktemp) seen=$(mktemp)
printf '%s\n' /docs/overview /docs/quickstart /docs/models /docs/cookbook /docs/protocols /docs/pricing-rate-limits > "$queue"
while [ -s "$queue" ] && [ "$(wc -l < "$seen")" -lt 300 ]; do
  p=$(head -1 "$queue")
  sed -i '' '1d' "$queue"
  grep -qxF "$p" "$seen" && continue
  echo "$p" >> "$seen"
  rel="docs/llama${p}.md"
  dl "$BASE${p}.md" "$rel" || continue
  grep -oE '\((/docs/[A-Za-z0-9/_.-]+|'"$BASE"'/docs/[A-Za-z0-9/_.-]+)' "$(tmpfile "$rel")" \
    | tr -d '(' | sed -e "s|^$BASE||" -e 's|[#?].*$||' -e 's|/$||' -e 's|\.md$||' | sort -u \
    | while read -r l; do
        grep -qxF "$l" "$seen" || grep -qxF "$l" "$queue" || echo "$l" >> "$queue"
      done
done
rm -f "$queue" "$seen"

echo "== done =="
python3 "$COLLECT" check

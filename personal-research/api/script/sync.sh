#!/bin/bash
set -u
cd "$(dirname "$0")/../data"

dl() {
  mkdir -p "$(dirname "$2")"
  code=$(curl -sL --retry 2 -o "$2.tmp" -w "%{http_code}" "$1")
  if [ "$code" = "200" ] && ! head -c 1 "$2.tmp" | grep -q '<'; then
    mv "$2.tmp" "$2"
    python3 ../script/collect.py split "$1" "$2" > /dev/null
  else
    echo "SKIP $code $1"
    rm -f "$2.tmp"
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
  | while read -r u; do echo "$u|collected/eng/docs/anthropic/${u#https://platform.claude.com/}"; done \
  | run_list

echo "== claude-code =="
curl -s https://code.claude.com/llms.txt \
  | grep -oE 'https://code\.claude\.com/[^) ]+\.md' | sort -u \
  | while read -r u; do echo "$u|collected/eng/docs/claude-code/${u#https://code.claude.com/}"; done \
  | run_list

echo "== poolside =="
curl -s https://docs.poolside.ai/llms.txt \
  | grep -oE 'https://docs\.poolside\.ai/[^) ]+\.md' | sort -u \
  | while read -r u; do echo "$u|collected/eng/docs/poolside/${u#https://docs.poolside.ai/}"; done \
  | run_list

echo "== gemini =="
curl -sL https://ai.google.dev/gemini-api/docs/llms.txt \
  | grep -oE 'https://ai\.google\.dev/gemini-api/[^) ]+\.md\.txt' | sort -u \
  | while read -r u; do p="${u#https://ai.google.dev/gemini-api/}"; echo "$u|collected/eng/docs/gemini/${p%.txt}"; done \
  | run_list

echo "== anthropic-engineering blog =="
curl -s https://www.anthropic.com/sitemap.xml \
  | grep -oE '<loc>https://www\.anthropic\.com/engineering/[^<]+</loc>' \
  | sed -e 's|<loc>||' -e 's|</loc>||' | sort -u \
  | grep -v '/engineering/claude-code-best-practices$' \
  | while read -r u; do
      rel="docs/anthropic-engineering/${u#https://www.anthropic.com/engineering/}.md"
      python3 ../script/collect.py web "$u" --rel "$rel" > /dev/null 2>&1 || echo "SKIP convert $u"
    done

echo "== research.google index =="
mkdir -p collected/meta/docs/research-google
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
print("python3 personal-research/api/script/collect.py web <url>")
print("```")
print()
for url, date in posts:
    title = url.rstrip("/").rsplit("/", 1)[-1].replace("-", " ").capitalize()
    print(f"- {date} [{title}]({url})")
' > collected/meta/docs/research-google/index.md

echo "== llama =="
BASE="https://llama.developer.meta.com"
queue=$(mktemp) seen=$(mktemp)
printf '%s\n' /docs/overview /docs/quickstart /docs/models /docs/cookbook /docs/protocols /docs/pricing-rate-limits > "$queue"
while [ -s "$queue" ] && [ "$(wc -l < "$seen")" -lt 300 ]; do
  p=$(head -1 "$queue")
  sed -i '' '1d' "$queue"
  grep -qxF "$p" "$seen" && continue
  echo "$p" >> "$seen"
  f="collected/eng/docs/llama${p}.md"
  dl "$BASE${p}.md" "$f" || continue
  grep -oE '\((/docs/[A-Za-z0-9/_.-]+|'"$BASE"'/docs/[A-Za-z0-9/_.-]+)' "$f" \
    | tr -d '(' | sed -e "s|^$BASE||" -e 's|[#?].*$||' -e 's|/$||' -e 's|\.md$||' | sort -u \
    | while read -r l; do
        grep -qxF "$l" "$seen" || grep -qxF "$l" "$queue" || echo "$l" >> "$queue"
      done
done
rm -f "$queue" "$seen"

echo "== catalog =="
python3 ../script/collect.py catalog > /dev/null

echo "== done =="
for d in collected/eng/*/*/ collected/kor/*/*/; do
  printf '%s: %s\n' "${d%/}" "$(find "$d" -name '*.md' -o -name '*.html' | wc -l | tr -d ' ')"
done

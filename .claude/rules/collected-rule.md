---
paths:
  - "personal-research/api/data/collected/**"
---

# collected 규칙

이 문서에서 `collected/` 는 `personal-research/api/data/collected/`, `script/` 는 `personal-research/api/script/` 를 줄여 쓴 것이다.

## 층

| 층 | 무엇 | 손으로 고치나 |
|---|---|---|
| `collected/eng/` | 밖에서 받아온 원문 미러. 공급자 디렉터리 하나가 출처 하나 | 안 된다 |
| `collected/kor/` | `eng/` 에서 파생된 번역본. 상대 경로와 파일명이 원본과 같다 | 품질 수정은 된다 |
| `collected/meta/` | 문서마다 출처와 수집 정보와 번역 스탬프를 담은 사이드카 | 안 된다 |
| `collected/CATALOG.md` | 수집물 목록. 자동 생성물 | 안 된다 |

언어 단에는 아티클 본문만 두고, 출처를 가리키는 줄은 전부 meta 에 둔다. 새 파일을 둘 때는 층부터 고른다.

## 편집 금지

`eng/` 와 `meta/` 와 `CATALOG.md` 는 어떤 이유로도 손으로 고치지 않는다. Write 와 Edit 은 `.claude/settings.json` 의 deny 로 막혀 있고, `sed -i` 나 셸 리다이렉트로 우회하지도 않는다. 내용을 바꾸는 방법은 `bash script/sync.sh` 와 `/collect` 뿐이다. 스크립트로 새 파일을 만드는 것은 수집이지 편집이 아니다.

## 요약을 두지 않는다

미러 옆에 주제별 요약이나 해설 문서를 만들지 않는다. 원본이 이미 저장소 안에 있으므로 요약은 같은 내용을 두 번 두는 일이고, 상류가 갱신되면 요약만 옛 값을 자신 있게 말하게 된다. 그 어긋남은 기계가 잡지 못한다.

## 공급자

경로는 `collected/{언어}/{종류}/{공급자}/...` 다. 종류는 `docs/` `papers/` `repos/` `videos/` 넷이다.

| 디렉터리 | 출처 | 페이지 | 수집 방법 | 갱신 |
|---|---|---|---|---|
| `docs/anthropic/` | https://platform.claude.com/docs | 549 | `llms.txt` 목록의 각 URL 을 `.md` 로 | sync 전량 |
| `docs/claude-code/` | https://code.claude.com/docs | 174 | `llms.txt` 목록의 각 URL 을 `.md` 로 | sync 전량 |
| `docs/gemini/` | https://ai.google.dev/gemini-api/docs | 171 | `llms.txt` 목록의 각 URL 을 `.md.txt` 로 | sync 전량 |
| `docs/poolside/` | https://docs.poolside.ai | 92 | `llms.txt` 목록의 각 URL 을 `.md` 로 | sync 전량 |
| `docs/llama/` | https://llama.developer.meta.com/docs | 50 | `llms.txt` 가 없어 `overview.md` 부터 링크를 크롤 | sync 전량 |
| `docs/anthropic-engineering/` | https://www.anthropic.com/engineering | 24 | sitemap 목록의 HTML 을 변환 | sync 전량 |
| `docs/research-google/` | https://research.google/blog | 색인 1598 + 받아둔 본문 | sitemap 에서 주소와 날짜만 | sync 는 색인만 |
| `docs/earendil/` | https://earendil.com/posts | 필요한 것만 | HTML 을 변환 | 하나씩 |
| `docs/openai/` | https://openai.com/index | 필요한 것만 | Wayback 스냅샷의 HTML 을 변환 | 하나씩 |
| `docs/palantir/` | https://www.palantir.com/docs/foundry | 16 | 외부 추출본을 옮겨 옴 | 하나씩 |
| `docs/protege-stanford/` | https://protege.stanford.edu/publications | 1편(8절) | 외부 추출본을 옮겨 옴 | 하나씩 |
| `docs/x/` | https://x.com | 필요한 것만 | fxTwitter API 의 블록을 변환 | 하나씩 |
| `papers/arxiv/` | https://arxiv.org | 필요한 것만 | 자족적 HTML 한 장 | 하나씩 |
| `repos/github/` | https://github.com | 필요한 것만 | URL 카드는 `meta/` 에, 문서 파일은 발췌 | 하나씩 |
| `videos/youtube/` | https://www.youtube.com | 필요한 것만 | yt-dlp 오디오와 whisperx 전사, 화자 분리 | 하나씩 |

sync 전량인 디렉터리는 매 실행마다 목록을 새로 읽어 다시 받으므로 손으로 넣은 것이 사라진다. 나머지는 sync 가 지우지 않는다. 상류에서 삭제된 페이지는 남으므로 필요하면 지운다.

## 원문과 변환본

미러는 원문과 문자 단위로 일치해야 한다. 상류가 본문 앞에 붙인 장식(llms.txt 안내, CMS frontmatter)은 떼어 사이드카의 `head` 에 두므로, `head` 와 본문을 이으면 상류 바이트가 된다. 장식의 형태는 `store.py` 의 `DECORATION` 한 곳이 정한다.

마크다운 엔드포인트가 있으면 그것을 쓰고, 없을 때만 HTML 을 변환한다. 같은 문서를 원문과 변환본 양쪽으로 받을 수 있으면 원문만 남긴다. 상류가 리다이렉트를 걸어 두 경로가 같은 문서를 가리키게 되는 일이 실제로 있다.

아래는 원문과 문자 단위로 일치하지 않는다. 인용이 중요하면 사이드카의 `source` 를 확인한다.

- `anthropic-engineering/`, `research-google/`, `earendil/`, `openai/` 는 HTML 변환본이다(`source/web.py`). 사이트 마크업이 바뀌면 변환 품질이 조용히 나빠질 수 있다.
- `openai/` 는 openai.com 이 봇 차단으로 403 을 주어 Wayback 스냅샷을 변환했다. 미러는 스냅샷 시점에 머문다.
- `palantir/` 와 `protege-stanford/` 는 우리 변환기가 본문을 찾지 못해 `research-ontology` 저장소가 2026-08-12 에 추출한 본문을 옮겨 왔다. 추출 방법은 사이드카의 `extraction` 에 있다.
- `x/` 는 X 가 로그인한 브라우저에만 본문을 주므로 프록시 fxTwitter 에서 받는다. 바이트의 출처는 사이드카의 `via` 다. 프록시는 트윗 id 로 찾으므로, 받은 아티클 id 가 URL 과 다르면 쓰지 않는다.
- `videos/youtube/` 는 모델이 만든 전사다. 인용할 때는 타임스탬프로 원본 영상을 확인한다. 화자 분리에는 약관에 동의한 HuggingFace 토큰(`HF_TOKEN` 이나 `~/.cache/huggingface/token`)이 필요하다.

## 파일 이름

경로는 종류 접두사 뒤에서부터 원본 URL 경로를 그대로 따른다. `platform.claude.com/docs/en/intro.md` 는 `collected/eng/docs/anthropic/docs/en/intro.md` 가 된다. 그래서 미러를 주제별로 재배치하지 않는다. 경로가 URL 에 묶여 있어야 갱신이 멱등하다. 글 목록이 한 단 아래 모인 블로그는 공급자 디렉터리가 그 단을 흡수한다(`anthropic.com/engineering/` 을 `anthropic-engineering/` 이 받는 식).

예외는 둘이며, 모두 sync 가 소유하지 않는 디렉터리라서 허용된다. 원래 URL 은 사이드카의 `source` 에 남는다.

- `papers/arxiv/` 와 `videos/youtube/` 는 URL 이 식별자뿐이라 제목 슬러그를 파일명으로 쓴다. 스크립트가 만든 슬러그는 사이트 이름이 섞여 들어와도 고치지 않는다.
- `docs/palantir/` 는 상류 사이드바의 순서가 정보라서 페이지를 평평하게 펴고 사이드바 순서대로 두 자리 번호를 붙인다. 사이드바는 페이지 HTML 의 `__NEXT_DATA__` 안 `sidebarNavProps` 에 있다.

## 논문은 HTML 로 둔다

논문은 그림과 조판과 수식이 본문의 일부라서 `source/paper.py` 가 스타일시트를 인라인하고 그림을 data URI 로 심어 자족적 HTML 한 장을 만든다. 같은 논문을 마크다운으로도 두지 않는다. 형태가 둘이면 어느 쪽이 정본인지를 인용할 때마다 판단해야 한다. 인용은 언제나 원문에서 한다.

## 사이드카

`collected/meta/{eng 이하 상대경로}.json` 이 문서 하나의 사이드카다. 경로가 곧 대응이므로 본문 안에는 출처를 가리키는 줄이 없다.

| 키 | 무엇 |
|---|---|
| `source` | 원본 주소. 모든 사이드카에 있다 |
| `head` | 상류가 본문 앞에 붙인 장식을 떼어낸 바이트 그대로 |
| `kor` | 번역 스탬프. 번역 시점 원문의 sha256 앞 12자리와 날짜 |
| 그 밖 | `published` `fetched` `via` `author` `channel` `pipeline` `branch` `extraction` 처럼 수집 경로마다 아는 것 |

본문이 없는 기록도 여기 둔다. 저장소 URL 카드는 `meta/repos/github/{owner}/{repo}.json`, research.google 색인은 `meta/docs/research-google/index.md` 다.

## 번역본 규약

번역본은 `eng/` 이하의 상대 경로와 파일명을 그대로 `kor/` 아래에 둔다. 다른 이름이나 폴더를 쓰면 어디에도 연결되지 않는다. 번역을 마치면 `collect.py stamp` 로 원문 해시를 사이드카의 `kor` 에 찍는다. `collect.py check` 가 사이드카 없는 원문, 원문 없는 사이드카, 원문만 갱신돼 낡은 번역을 잡는다.

뷰어는 사이드카 목록으로 문서를 나열하므로 사이드카가 없는 원문은 보이지 않는다. 번역본도 `kor` 스탬프가 찍혀야 원문, 한국어, 대조 보기가 붙는다. 대조는 블록 순서로 짝을 맞춘다. 그래서 번역은 원문의 블록 구조를 그대로 따라야 한다. X 의 스탬프는 제목 줄이 원문과 다르거나 블록 수, 블록 종류, URL 순서가 하나라도 다르면 거부된다. HTML 논문은 뷰어가 조판해 보여 주지 않으므로 언어 선택 대상이 아니다.

## 새 소스 추가

`script/sync.sh` 에 블록을 더하고 위 공급자 표에 한 줄을 더한다. sync 가 관리하는 사이트면 `script/source/web.py` 의 `SYNCED` 에, 블로그처럼 한 단을 흡수하는 공급자면 `PROVIDER` 에도 더한다. 분량이 크고 대부분이 관심 밖이면 `research-google/` 처럼 색인만 두고 필요한 것을 그때 받는다.

## 수집하지 않는 것

같은 조사를 반복하지 않도록 남긴다.

- Poolside 의 legal 문서 4페이지와 support portal 은 마크다운을 제공하지 않거나 로그인이 필요하다.
- `platform.claude.com/cookbook` 은 `.md` 를 붙이면 200 이 오지만 HTML 껍데기다.
- www.llama.com/docs 는 마크다운 내보내기가 없는 JS 앱이다. Llama 는 공식 개발자 문서 사이트를 받는다.
- engineering 의 `claude-code-best-practices` 는 `code.claude.com/docs/en/best-practices` 로 리다이렉트되며, 원문이 `docs/claude-code/` 에 있다.
- `platform.claude.com/docs/en/agent-sdk/` 는 `code.claude.com` 으로 보내는 HTML 껍데기다. Agent SDK 문서는 `docs/claude-code/` 에 있다.

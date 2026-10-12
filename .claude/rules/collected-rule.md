---
paths:
  - "personal-research/api/common/**"
  - "personal-research/api/usecase/**"
  - "personal-research/api/data/**"
---

# collected 규칙

수집물과 대화와 모델 호출 기록과 서버 로그가 SQLite 한 파일에 있다. 기본 위치는 `personal-research/api/database/research.db` 이고 `DATABASE_PATH` 로 옮긴다. git 은 이 폴더를 무시한다. 아래에서 `bin/` `usecase/` 는 `personal-research/api/` 아래를 줄여 쓴 것이다.

## 표

| 표 | 무엇 | 키 |
|---|---|---|
| `collected` | 문서 하나의 신원과 원문 주소와 보관 경로 | `id` (uuid) |
| `collected_content` | 원문과 번역본의 본문. 판마다 한 행 | `(collected_id, language, version)` |
| `space` | 학습 목적 하나 | `id` |
| `space_material` | space 의 자료(목적, 수업, 노트, 기록) | `id` |
| `space_conversation` `space_message` | space 의 대화와 그 메시지 | `id` |
| `agent_conversation` `agent_message` | 홈의 대화와 그 메시지 | `id` |
| `user` `user_meta` | 사용자와 사용자 부가 정보(문서를 연 기록, 제공사 설정, 암호화한 API 키와 토큰) | `id`, `(user_id, kind, collected_id)` |
| `llm` | 모델 CLI 호출 원본 | `id` |
| `log` | 서버가 남긴 기록. `collect.py log` 로 본다 | `id` |

신원은 uuid 다. 원문 주소는 유일하지 않기 때문이다. Protégé 논문 한 편이 8절로 쪼개져 같은 주소를 공유하고, 저장소 카드와 그 README 도 주소가 같다. 주소로 묶으면 이것들이 한 문서가 되어 버린다.

`collected.path` 는 수집할 때 정한 보관 경로다. `document/anthropic/docs/en/intro.md` 처럼 `{종류}/{공급자}/...` 로 시작한다. 신원이 아니라 사람이 읽는 이름이자 뷰어가 트리를 그리는 근거이며, 그래서 유일해야 한다. 경로를 정하는 논리는 유형 모듈과 `usecase/collected/collect/type/web.py` 의 `provider()` 에 있다.

| 무엇을 찾을 때 | 무엇으로 |
|---|---|
| 뷰어와 API | `id` |
| 사람과 스킬 | `path` |
| 중복 수집 방지 | `url` |

`collect.py` 는 셋 중 아무것이나 받아 `id` 로 바꾼다.

## 손으로 고치지 않는다

DB 를 직접 열어 `UPDATE` 하지 않는다. `sqlite3` 셸로 고치는 것도 같다. 내용을 바꾸는 방법은 `bash bin/sync.sh` 와 `/collect` 뿐이다. 스크립트로 새 행을 넣는 것은 수집이지 편집이 아니다.

번역본의 품질 수정은 허용되지만 경로는 정해져 있다. `collect.py dump` 로 파일로 꺼내고, 고치고, `collect.py load` 로 되넣고, `collect.py stamp` 를 찍는다.

## 파일로 내보내기

DB 는 git 이 읽지 못하고 grep 도 되지 않는다. 그래서 `collect.py export` 가 `data/collected/` 아래에 `eng/` `kor/` `meta/` 파일 트리를 풀어 준다. 그 폴더는 git 이 무시하는 일회용이다. 고쳐도 DB 로 돌아가지 않으므로 고치지 않고, 다 보고 나면 지운다.

반대 방향은 `collect.py migrate` 다. 파일 트리를 DB 로 적재하며, 전환할 때 한 번 쓴 명령이다.

## 요약을 두지 않는다

미러 옆에 주제별 요약이나 해설 문서를 만들지 않는다. 원본이 이미 DB 안에 있으므로 요약은 같은 내용을 두 번 두는 일이고, 상류가 갱신되면 요약만 옛 값을 자신 있게 말하게 된다. 그 어긋남은 기계가 잡지 못한다.

## 공급자

`path` 는 `{종류}/{공급자}/...` 로 시작한다. 종류는 `document/` `paper/` `repository/` `video/` 넷이다. 예전 이름 `docs/` `papers/` `repos/` `videos/` 는 DB 를 열 때 새 이름으로 옮기고, `store.locate` 가 옛 경로도 받는다. 네 폴더는 문서가 없어도 트리(`/api/tree`)에 늘 있다.

| 접두 | 출처 | 문서 | 수집 방법 | 갱신 |
|---|---|---|---|---|
| `document/anthropic/` | https://platform.claude.com/docs | 549 | `llms.txt` 목록의 각 URL 을 `.md` 로 | sync 전량 |
| `document/claude-code/` | https://code.claude.com/docs | 174 | `llms.txt` 목록의 각 URL 을 `.md` 로 | sync 전량 |
| `document/gemini/` | https://ai.google.dev/gemini-api/docs | 171 | `llms.txt` 목록의 각 URL 을 `.md.txt` 로 | sync 전량 |
| `document/poolside/` | https://docs.poolside.ai | 92 | `llms.txt` 목록의 각 URL 을 `.md` 로 | sync 전량 |
| `document/llama/` | https://llama.developer.meta.com/docs | 50 | `llms.txt` 가 없어 `overview.md` 부터 링크를 크롤 | sync 전량 |
| `document/anthropic-engineering/` | https://www.anthropic.com/engineering | 24 | sitemap 목록의 HTML 을 변환 | sync 전량 |
| `document/research-google/` | https://research.google/blog | 색인 1598 + 받아둔 본문 | sitemap 에서 주소와 날짜만 | sync 는 색인만 |
| `document/earendil/` | https://earendil.com/posts | 필요한 것만 | HTML 을 변환 | 하나씩 |
| `document/openai/` | https://openai.com/index | 필요한 것만 | Wayback 스냅샷의 HTML 을 변환 | 하나씩 |
| `document/palantir/` | https://www.palantir.com/docs/foundry | 16 | 외부 추출본을 옮겨 옴 | 하나씩 |
| `document/protege-stanford/` | https://protege.stanford.edu/publications | 1편(8절) | 외부 추출본을 옮겨 옴 | 하나씩 |
| `document/x/` | https://x.com | 필요한 것만 | fxTwitter API 의 블록을 변환 | 하나씩 |
| `paper/arxiv/` | https://arxiv.org | 필요한 것만 | 자족적 HTML 한 장 | 하나씩 |
| `repository/github/` | https://github.com | 필요한 것만 | URL 카드는 본문 없이 `collected` 행으로, 문서 파일은 발췌 | 하나씩 |
| `video/youtube/` | https://www.youtube.com | 필요한 것만 | yt-dlp 오디오와 whisperx 전사, 화자 분리 | 하나씩 |

sync 전량인 접두는 매 실행마다 목록을 새로 읽어 다시 받으므로 손으로 넣은 것이 덮인다. 나머지는 sync 가 지우지 않는다. 상류에서 삭제된 페이지는 남으므로 필요하면 지운다.

## 원문과 변환본

미러는 원문과 문자 단위로 일치해야 한다. 상류가 본문 앞에 붙인 장식(llms.txt 안내, CMS frontmatter)은 떼어 `collected_content.decoration` 에 두므로, `decoration` 과 본문을 이으면 상류 바이트가 된다. 장식의 형태는 `common/store.py` 의 `DECORATION` 한 곳이 정한다.

마크다운 엔드포인트가 있으면 그것을 쓰고, 없을 때만 HTML 을 변환한다. 같은 문서를 원문과 변환본 양쪽으로 받을 수 있으면 원문만 남긴다. 상류가 리다이렉트를 걸어 두 경로가 같은 문서를 가리키게 되는 일이 실제로 있다.

아래는 원문과 문자 단위로 일치하지 않는다. 인용이 중요하면 `collected.url` 을 확인한다.

- `anthropic-engineering/`, `research-google/`, `earendil/`, `openai/` 는 HTML 변환본이다(`usecase/collected/collect/type/web.py`). 사이트 마크업이 바뀌면 변환 품질이 조용히 나빠질 수 있다.
- `openai/` 는 openai.com 이 봇 차단으로 403 을 주어 Wayback 스냅샷을 변환했다. 미러는 스냅샷 시점에 머문다.
- `palantir/` 와 `protege-stanford/` 는 우리 변환기가 본문을 찾지 못해 `research-ontology` 저장소가 2026-08-12 에 추출한 본문을 옮겨 왔다. 추출 방법은 `meta.extraction` 에 있다.
- `x/` 는 X 가 로그인한 브라우저에만 본문을 주므로 프록시 fxTwitter 에서 받는다. 바이트의 출처는 `meta.via` 다. 프록시는 트윗 id 로 찾으므로, 받은 아티클 id 가 URL 과 다르면 쓰지 않는다.
- `video/youtube/` 는 모델이 만든 전사다. 인용할 때는 타임스탬프로 원본 영상을 확인한다. 화자 분리에는 약관에 동의한 HuggingFace 토큰(`HF_TOKEN` 이나 `~/.cache/huggingface/token`)이 필요하다.

## path 짓기

`path` 는 종류 접두 뒤에서부터 원본 URL 경로를 그대로 따른다. `platform.claude.com/docs/en/intro.md` 는 `document/anthropic/docs/en/intro.md` 가 된다. 그래서 미러를 주제별로 재배치하지 않는다. `path` 가 URL 에 묶여 있어야 갱신이 멱등하다. 같은 `path` 로 다시 수집하면 같은 `id` 에 새 판이 쌓인다. 글 목록이 한 단 아래 모인 블로그는 공급자 접두가 그 단을 흡수한다(`anthropic.com/engineering/` 을 `anthropic-engineering/` 이 받는 식).

예외는 둘이며, 모두 sync 가 소유하지 않는 접두라서 허용된다. 원래 URL 은 `collected.url` 에 남는다.

- `paper/arxiv/` 와 `video/youtube/` 는 URL 이 식별자뿐이라 제목 슬러그를 이름으로 쓴다. 스크립트가 만든 슬러그는 사이트 이름이 섞여 들어와도 고치지 않는다.
- `document/palantir/` 는 상류 사이드바의 순서가 정보라서 페이지를 평평하게 펴고 사이드바 순서대로 두 자리 번호를 붙인다. 사이드바는 페이지 HTML 의 `__NEXT_DATA__` 안 `sidebarNavProps` 에 있다.

## 논문은 HTML 로 둔다

논문은 그림과 조판과 수식이 본문의 일부라서 `usecase/collected/collect/type/paper.py` 가 스타일시트를 인라인하고 그림을 data URI 로 심어 자족적 HTML 한 장을 만든다. 같은 논문을 마크다운으로도 두지 않는다. 형태가 둘이면 어느 쪽이 정본인지를 인용할 때마다 판단해야 한다. 인용은 언제나 원문에서 한다.

## 수집 정보

| 자리 | 무엇 |
|---|---|
| `collected.url` | 원본 주소. 모든 행에 있다 |
| `collected.meta` | `published` `fetched` `via` `author` `channel` `branch` `extraction` 처럼 수집 경로마다 아는 것 |
| `collected_content.decoration` | 상류가 본문 앞에 붙인 장식을 떼어낸 바이트 그대로 |
| `collected_content.created_at` | 그 판을 받은 시각 |

본문이 없는 기록도 `collected` 행으로 둔다. 저장소 URL 카드가 그렇고, `path` 는 `repository/github/{owner}/{repo}` 다. 카드는 `meta` 에 `stars` `description` `language` `default_branch` `updated_upstream` 을 담는다.

## 번역본 규약

번역본은 원문과 같은 `collected_id` 를 쓰고 `language` 만 `kor` 이다. `collect.py load` 가 번역을 넣을 때 그 시점 원문의 판 번호를 함께 박으므로, 따로 찍을 것이 없다. `collect.py check` 가 메타 없는 원문, 원문 없는 메타, 원문만 갱신돼 낡은 번역을 잡는다.

뷰어는 `collected` 목록으로 문서를 나열하므로 그 행이 없는 원문은 보이지 않는다. 번역본이 있으면 원문, 한국어, 대조 보기가 붙는다. 대조는 블록 순서로 짝을 맞춘다. 그래서 번역은 원문의 블록 구조를 그대로 따라야 한다. X 번역본은 제목 줄이 원문과 다르거나 블록 수, 블록 종류, URL 순서가 하나라도 다르면 `load` 가 거부한다. HTML 논문은 뷰어가 조판해 보여 주지 않으므로 언어 선택 대상이 아니다.

## 새 소스 추가

`bin/sync.sh` 에 블록을 더하고 위 공급자 표에 한 줄을 더한다. sync 가 관리하는 사이트면 `usecase/collected/collect/type/web.py` 의 `SYNCED` 에, 블로그처럼 한 단을 흡수하는 공급자면 `PROVIDER` 에도 더한다. 분량이 크고 대부분이 관심 밖이면 `research-google/` 처럼 색인만 두고 필요한 것을 그때 받는다.

## 수집하지 않는 것

같은 조사를 반복하지 않도록 남긴다.

- Poolside 의 legal 문서 4페이지와 support portal 은 마크다운을 제공하지 않거나 로그인이 필요하다.
- `platform.claude.com/cookbook` 은 `.md` 를 붙이면 200 이 오지만 HTML 껍데기다.
- www.llama.com/docs 는 마크다운 내보내기가 없는 JS 앱이다. Llama 는 공식 개발자 문서 사이트를 받는다.
- engineering 의 `claude-code-best-practices` 는 `code.claude.com/docs/en/best-practices` 로 리다이렉트되며, 원문이 `document/claude-code/` 에 있다.
- `platform.claude.com/docs/en/agent-sdk/` 는 `code.claude.com` 으로 보내는 HTML 껍데기다. Agent SDK 문서는 `document/claude-code/` 에 있다.

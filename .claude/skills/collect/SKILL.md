---
name: collect
description: 사용자가 준 URL 이나 식별자를 수집하고 한국어 번역본까지 만든다. 수집은 collect.py 가, 번역은 전용 에이전트가 한다. Use when the user gives an arXiv id, a paper/blog/X/GitHub/YouTube URL, or a collected file path and says "수집", "받아줘", "번역", "번역까지", "collect", "/collect".
---

# 수집과 번역

입력 하나를 받아 원문을 `eng/` 에, 한국어판을 `kor/` 의 같은 상대 경로에 남긴다. 수집, 스탬프, 검사, 카탈로그는 `collect.py` 가 하고, 사람의 판단이 필요한 번역만 `translator` 에이전트가 한다. 이 스킬 본체는 문서 본문을 컨텍스트로 읽어 들이지 않는다.

명령은 모두 프로젝트 루트에서 `python3 personal-research/api/script/collect.py <명령>` 으로 실행한다. 아래에서는 `collect.py <명령>` 으로 줄여 쓴다. 경로 인자와 출력은 모두 `personal-research/api/data/collected/` 기준(`eng/...`, `kor/...`, `meta/...`)이다. 실패하면 `error: ...` 를 표준 오류에 쓰고 1 로 끝난다.

## 1. 수집

```sh
collect.py auto <입력>
```

입력 유형은 `collect.py detect <입력>` 과 같은 규칙으로 가린다.

| 유형 | 입력 | 출력 | 번역 |
|------|------|------|------|
| `paper` | arXiv URL 이나 `2305.10601` 같은 id | `eng/papers/arxiv/<제목>.html` | 세그먼트 |
| `x` | `x.com/<user>/article/<id>` | `eng/docs/x/<user>/article/<제목>.md` | 마크다운 |
| `repo` | 경로 없는 `github.com/<owner>/<repo>` | `meta/repos/github/<owner>/<repo>.json` | 없음 |
| `repo-doc` | `github.com/<owner>/<repo>/blob/<branch>/<path>` | `eng/repos/github/<owner>/<repo>/<path>` | 마크다운 |
| `video` | `youtube.com` 이나 `youtu.be` | `eng/videos/youtube/<제목>.md` | 마크다운 |
| `web` | 그 밖의 URL | `eng/docs/<공급자>/<이름>.md` | 마크다운 |
| `existing` | 이미 있는 `eng/` 파일 | 그 경로 | 형식에 따른다 |

`web` 은 같은 출처를 이미 받았으면 새로 받지 않고 그 경로를 돌려주고, sync 가 관리하는 사이트는 받지 않고 오류를 낸다. 저장소 URL 에 카드와 README 중 무엇을 원하는지 모호하면 사용자에게 묻고, README 면 `collect.py repo-doc <url>` 을 쓴다. X 아티클에서 트윗을 찾지 못했다는 오류가 나면 `collect.py x <url> --tweet-id <id>` 로 다시 받는다.

`repo` 는 여기서 끝나므로 카드 경로를 보고한다.

## 2. 번역

`translator` 에이전트에게는 문서와 번역 명령 외에 아무것도 넣지 않는다. 이 대화의 맥락, 유형, 사용자의 요청 문장, 프로젝트 규칙 모두 넘기지 않는다. 번역 규칙은 에이전트 정의(`.claude/agents/translator.md`)에 있다. 프롬프트는 정확히 다음 한 줄이고, 경로는 절대 경로로 준다.

```
번역: <원문 경로> → <출력 경로>
```

### 마크다운

출력 경로는 원문 경로의 `eng/` 를 `kor/` 로 바꾼 것이다. 에이전트를 한 번 부른다.

### 세그먼트

HTML 을 에이전트에게 통째로 주지 않는다. 번역할 텍스트만 뽑아 200개씩 나눈다.

```sh
collect.py extract eng/papers/arxiv/<이름>.html <scratchpad>/seg.json
python3 - <scratchpad> <<'EOF'
import json, sys
d = sys.argv[1]
seg = json.load(open(f"{d}/seg.json", encoding="utf-8"))
for n, i in enumerate(range(0, len(seg), 200)):
    json.dump(seg[i:i + 200], open(f"{d}/seg-{n:02d}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{d}/seg-{n:02d}.json")
EOF
```

조각마다 `번역: <scratchpad>/seg-NN.json → <scratchpad>/seg-NN.ko.json` 으로 에이전트를 하나씩, 한 메시지에서 병렬로 부른다. 모두 끝나면 합쳐서 되꽂는다.

```sh
python3 - <scratchpad> <<'EOF'
import json, sys, glob
d = sys.argv[1]
seg = [s for f in sorted(glob.glob(f"{d}/seg-[0-9][0-9].ko.json")) for s in json.load(open(f, encoding="utf-8"))]
json.dump(seg, open(f"{d}/seg.json", "w", encoding="utf-8"), ensure_ascii=False)
EOF
collect.py inject eng/papers/arxiv/<이름>.html <scratchpad>/seg.json kor/papers/arxiv/<이름>.html
```

`extract` 와 `inject` 는 세그먼트 수와 반영 수를 표준 오류에 쓴다.

## 3. 스탬프와 검사

```sh
collect.py stamp kor/<경로>
collect.py check
```

`stamp` 는 X 번역본이면 제목 줄과 블록 구조가 원문과 같은지 먼저 확인하고, 다르면 거부한다. 거부되면 같은 번역 명령으로 에이전트를 한 번 더 부르고, 그래도 거부되면 그 사실을 보고한다. `check` 는 문제가 없으면 0 으로 끝난다.

## 4. 카탈로그

```sh
collect.py catalog
```

## 보고

원문과 번역본 경로, 스탬프와 검사 결과를 적는다. 논문이면 세그먼트 수와 반영 수도 적는다. `web` 이 `docs/` 아래에 새 공급자 폴더를 만들었으면 `collected-rule.md` 의 공급자 표에 줄을 더해야 한다고 알린다.

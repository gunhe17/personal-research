# research

AI 모델과 에이전트에 관한 외부 문서를 원문 그대로 모아 두고, 한국어 번역본을 나란히 두는 저장소다. 공식 문서와 블로그, 논문, X 아티클, GitHub 문서, YouTube 전사를 한곳에서 원문과 번역으로 대조해 읽는 것이 목적이다.

## 구조

```
personal-research/
├── api/
│   ├── bin/              진입점. server.py, collect.py, sync.sh
│   ├── usecase/          도메인 아래 동작 하나에 폴더 하나
│   │   ├── collected/
│   │   │   ├── collect/    수집. 유형별 type/
│   │   │   ├── translate/  번역 반출입
│   │   │   ├── read/       뷰어에 트리와 본문을 준다
│   │   │   ├── check/      원문·번역·메타 정합 검사
│   │   │   ├── list/       수집 목록을 표준 출력에
│   │   │   └── search/     수집물 전문 검색
│   │   ├── conversation/
│   │   │   ├── converse/   문서를 근거로 묻고 답한다
│   │   │   └── record/     문서 옆 대화와 홈 대화를 남긴다
│   │   ├── agent/
│   │   │   └── ask/        수집물을 검색해 근거로 답한다
│   │   └── asked/
│   │       ├── converse/   Codex 튜터가 블록 답변을 만든다
│   │       └── record/     학습 계획과 대화를 남긴다
│   ├── common/           store.py 와 log.py
│   └── database/         research.db 한 파일. git 밖
└── wui/
    ├── bin/              뷰어 화면
    └── design/           우리가 쓴 설계 문서
```

수집물과 대화와 서버 로그가 `personal-research/api/database/research.db` 한 파일에 있다. `collected` 가 문서의 신원(uuid)과 원문 주소와 보관 경로를, `collected_content` 가 원문과 번역본의 본문을 판(version)별로 담는다. 같은 문서의 번역본은 그 문서의 `language = 'kor'` 행이고, 판 번호가 원문보다 낮으면 낡은 번역이다. git 은 바이너리를 diff 하지 못하고 grep 도 되지 않는다. 내용을 파일로 봐야 하면 `collect.py export` 가 `data/collected/` 에 트리를 풀어 준다. 그 폴더는 git 이 무시하는 일회용이다.

대화는 어디서 시작했는지에 따라 셋으로 나뉜다.

| 도메인 | 시작 | 중심 화면 | 모델 | 표 |
|------|------|------|------|------|
| collected | 수집한 문서 하나 | 문서 본문. 채팅은 옆 패널 | `CHAT_BACKEND` | `conversations` |
| agent | 홈의 ask 와 collect | 홈 | `CHAT_BACKEND` | `agent` |
| asked | 배우려는 주제 | 채팅. 블록 답변과 그래프가 이어진다 (`/viewer/asked`) | Codex (`ASKED_CODEX_MODEL`) | `asked` |

`asked` 한 행이 학습 하나다. `plan` 에 학습 계획을, `log` 에 웹 이전의 학습 기록을, `messages` 에 질문과 블록 답변과 생성 상태를 담는다. `thread_id` 는 이어 가는 Codex 대화다. 답변마다 남는 `learning_note` 가 이후의 학습 기록이다.

뷰어 서버는 Docker 로 띄운다. 환경은 둘이고, 포트와 경로는 `.env/.env.{환경}` 에서 정한다.

| 환경 | 코드 | 호스트 포트 | 재시작 |
|------|------|------|------|
| develop | 저장소 전체를 연결해 고치면 바로 반영된다 | 8765 | 수동 |
| production | 이미지에 넣는다. `data/` 만 호스트 폴더를 연결한다 | 8766 | 자동 |

```sh
docker compose --env-file .env/.env.develop -f .docker/docker-compose.develop.yml up -d --build
docker compose --env-file .env/.env.production -f .docker/docker-compose.production.yml up -d --build
```

컨테이너 안의 grok 과 codex 와 claude 는 개인 요금제로 로그인해 쓴다. 로그인은 환경마다 따로 볼륨에 남으므로 환경별로 처음 한 번만 하면 된다.

1. grok 은 `docker exec -it personal-research-{환경}-api grok login --device-auth` 를 실행하고, 화면의 코드를 브라우저에서 승인한다.
2. codex 는 `docker exec -it personal-research-{환경}-api codex login --device-auth` 를 실행하고, 화면의 코드를 브라우저에서 승인한다. ChatGPT 계정은 Codex 기본 모델을 쓰지 못할 수 있으므로 `ASKED_CODEX_MODEL` 을 비우지 않는다.
3. claude 는 자기 컴퓨터에서 `claude setup-token` 으로 받은 토큰을 `.env/.env.{환경}` 의 `CLAUDE_CODE_OAUTH_TOKEN` 에 넣고 컨테이너를 다시 띄운다.

`ANTHROPIC_API_KEY` 나 `XAI_API_KEY` 를 넣으면 요금제가 아니라 API 과금으로 바뀐다. 서버의 채팅 API 에는 인증이 없으므로, 외부 서버에 둘 때도 포트는 `127.0.0.1` 에만 열고 Tailscale 이나 SSH 터널로 접속한다.

뷰어를 열면 홈이 먼저 나온다. 입력창 왼쪽 배지로 `ask` 와 `collect` 를 고른다. `ask` 는 수집물 전체에서 근거 문서를 찾아 답하고, `collect` 는 주소를 받아 원문을 받고 한국어판까지 만든다. 답할 모델은 `CHAT_BACKEND` 로 고른다(`grok` 또는 `claude`).

무엇이 수집돼 있는지는 뷰어의 트리가 답한다. 터미널에서는 `python3 personal-research/api/bin/collect.py list` 를 쓴다.

## 수집 요청

URL 이나 식별자를 주고 `/collect` 를 부른다. `collect.py` 가 유형을 가려 원문을 받고, 번역 에이전트가 한국어판을 만든다. 스킬 없이 받을 때는 `python3 personal-research/api/bin/collect.py auto <입력>` 을 쓰고, 명령 목록은 `--help` 로 본다.

| 입력 | 결과 |
|------|------|
| arXiv URL 이나 id | 자족적 HTML 원문과 같은 조판의 한국어판 |
| `x.com/<user>/article/<id>` | 마크다운 원문과 한국어판 |
| `github.com/<owner>/<repo>` | 본문 없는 저장소 URL 카드 하나. 번역 없음 |
| GitHub 문서 파일 URL | 마크다운 원문과 한국어판 |
| YouTube URL | 화자 분리 전사와 한국어판 |
| 그 밖의 URL | 마크다운 원문(없으면 HTML 변환본)과 한국어판 |
| 이미 받은 `eng/` 문서 경로 | 한국어판만 |

공식 문서 사이트 전체를 다시 받을 때는 `bash personal-research/api/bin/sync.sh` 를 실행한다.

수집물을 다루는 규칙과 공급자별 사정은 [collected-rule.md](.claude/rules/collected-rule.md) 에, 절차는 [collect 스킬](.claude/skills/collect/SKILL.md) 에 있다.

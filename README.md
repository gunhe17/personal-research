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
│   │   ├── space/
│   │   │   └── record/     space 의 목적을 남긴다
│   │   └── conversation/
│   │       ├── converse/   Codex 튜터가 수집물을 조사하고 블록 답변을 만든다
│   │       └── record/     space 와 agent 의 대화와 메시지를 남긴다
│   ├── common/           store.py, log.py, llm.py
│   └── database/         research.db 한 파일. git 밖
└── wui/
    ├── bin/              뷰어 화면
    └── design/           우리가 쓴 설계 문서
```

수집물과 대화와 서버 로그가 `personal-research/api/database/research.db` 한 파일에 있다. `collected` 가 문서의 신원(uuid)과 원문 주소와 보관 경로를, `collected_content` 가 원문과 번역본의 본문을 판(version)별로 담는다. 같은 문서의 번역본은 그 문서의 `language = 'kor'` 행이고, 판 번호가 원문보다 낮으면 낡은 번역이다. git 은 바이너리를 diff 하지 못하고 grep 도 되지 않는다. 내용을 파일로 봐야 하면 `collect.py export` 가 `data/collected/` 에 트리를 풀어 준다. 그 폴더는 git 이 무시하는 일회용이다.

표는 열한 개다. JSON 이라고 적은 열은 JSON 텍스트다.

| 표 | 무엇 |
|------|------|
| `collected` | 문서의 신원, 원본 주소, 보관 경로, 수집 정보(`meta`, JSON) |
| `collected_content` | 원문과 번역의 본문(`content`). 판마다 한 행. `decoration` 은 상류가 본문 앞에 붙인 장식을 떼어 둔 것이다 |
| `space` | 무엇을 배울지라는 목적 하나. 이름만 갖는다 |
| `space_material` | space 의 자료. `plan`(목적, space 당 하나), `lesson`(수업, 답변과 같은 블록 JSON), `note`(노트), `log`(웹 이전 학습 기록) |
| `space_conversation` | space 안의 대화. space 하나에 여럿. 출발 자료(`collected_id`)와 모델별 정보(`meta`, JSON) |
| `space_message` | space 대화의 메시지 한 건. 질문과 답변이 각각 한 행 |
| `agent_conversation` | 홈에서 시작한 대화. ask 와 collect 가 쌓인다 |
| `agent_message` | 홈 대화의 메시지 한 건 |
| `user` | 사용자. 로그인이 없어 기본 사용자 한 명이다 |
| `user_meta` | 사용자 부가 정보. 지금은 문서를 연 기록(`kind = 'opened'`) |
| `llm` | 모델 CLI 호출 원본. 명령, 프롬프트, 출력 전체, 종료 코드, 시각 |
| `log` | 서버 기록 |

- 메시지의 `context` 는 질문할 때의 인용과 주석과 그래프 상태, `rich` 는 답변 블록, `sources` 는 답변이 근거로 쓴 수집물이다. 모두 JSON 이다.
- 대화의 `collected_id` 가 저장소 카드(`repos/github/{owner}/{repo}`)면 그 path 아래 파일이 모두 자료가 된다. 나중에 수집한 파일도 포함된다.
- 대화의 `meta` 는 모델 이름을 키로 한다. 예: `{"codex": {"thread_id": ..., "model": ...}}`. `thread_id` 는 Codex 가 `~/.codex` 에 저장한 대화의 번호로, 다음 질문에서 그 대화를 이어 가는 데 쓴다.
- 문서를 열면 그 문서를 자료로 가진 space 대화가 열리고, 없으면 첫 질문 때 그 문서를 자료로 새 대화를 만든다.
- 답할 때마다 Codex 가 `data/corpus/` 의 수집물 사본(`collect.py export` 와 같은 트리)을 읽기 전용으로 조사하고, 근거로 쓴 path 를 `sources` 에 남긴다. 근거가 없으면 그렇다고 밝히고 답한다. 사본은 수집물이 바뀌면 다음 질문 때 다시 만든다.
- 모델을 부를 때마다(답변은 Codex, 수집할 때의 번역은 claude) `llm` 에 한 행이 남는다. `owner_id` 는 질문 메시지 id 나 번역한 문서 id 다.
- DB 를 처음 열 때 `common/store.py` 의 `upgrade` 가 예전 구조(`extra` `body` 열, `opened` `conversations` `agent` `asked` 표, 대화를 JSON 으로 담던 `space`, `space` 의 `purpose` `log` 열, 대화 첫머리에 끼워 둔 수업)를 지금 구조로 옮긴다.

왼쪽 사이드바는 Home 과 Space 다. Space, space 이름, 그 아래 Conversations·Collected·Materials 폴더는 모두 펼치고 접는 폴더이고, 실제로 여는 것은 대화, 수집물, 자료 항목뿐이다. space 목록과 상세 페이지(`/viewer/space`, `/viewer/space?id=…`)는 대화 화면의 space 메뉴에서 간다.

본문(`/viewer/collected`)은 VS Code 같은 편집기 그룹이다. 그룹 하나에 항목 하나만 뜬다. 사이드바 항목을 누르면 지금 그룹의 항목을 바꾸고, 끌어서 그룹 왼쪽이나 오른쪽 가장자리에 놓으면 그 쪽으로 화면이 나뉜다(최대 4개, 모두 나란히). 그룹 위의 `유형 / 이름` 줄을 끌면 그룹을 옮기고, 그 줄 오른쪽의 ×로 닫는다. 수집물은 × 왼쪽에 내려받기가 있다. 항목마다 유형에 맞는 화면이 iframe 으로 뜬다: 대화는 `pane-chat`, 수집물은 `pane-doc`, 자료는 `pane-material`. 답변의 근거를 누르면 옆 그룹에 문서가 열리고, 문서에서 인용하면 열린 대화로 들어간다. 배치는 브라우저에 남아 다시 열어도 그대로다.

뷰어 서버는 Docker 로 띄운다. 환경은 둘이고, 포트와 경로는 `.env/.env.{환경}` 에서 정한다.

| 환경 | 코드 | 호스트 포트 | 재시작 |
|------|------|------|------|
| develop | 저장소 전체를 연결해 고치면 바로 반영된다 | 8765 | 수동 |
| production | 이미지에 넣는다. `data/` 만 호스트 폴더를 연결한다 | 8766 | 자동 |

```sh
docker compose --env-file .env/.env.develop -f .docker/docker-compose.develop.yml up -d --build
docker compose --env-file .env/.env.production -f .docker/docker-compose.production.yml up -d --build
```

컨테이너 안의 codex 와 claude 는 개인 요금제로 로그인해 쓴다. 로그인은 환경마다 따로 볼륨에 남으므로 환경별로 처음 한 번만 하면 된다.

1. codex 는 `docker exec -it personal-research-{환경}-api codex login --device-auth` 를 실행하고, 화면의 코드를 브라우저에서 승인한다. 대화의 답변을 만든다. ChatGPT 계정은 Codex 기본 모델을 쓰지 못할 수 있으므로 `CODEX_MODEL` 을 비우지 않는다.
2. claude 는 자기 컴퓨터에서 `claude setup-token` 으로 받은 토큰을 `.env/.env.{환경}` 의 `CLAUDE_CODE_OAUTH_TOKEN` 에 넣고 컨테이너를 다시 띄운다. 수집할 때 번역을 맡는다.

`ANTHROPIC_API_KEY` 를 넣으면 요금제가 아니라 API 과금으로 바뀐다. 서버의 채팅 API 에는 인증이 없으므로, 외부 서버에 둘 때도 포트는 `127.0.0.1` 에만 열고 Tailscale 이나 SSH 터널로 접속한다.

뷰어를 열면 홈이 먼저 나온다. 입력창 왼쪽 배지로 `ask` 와 `collect` 를 고른다. `ask` 는 질문으로 새 agent 대화를 열고, `collect` 는 주소를 받아 원문을 받고 한국어판까지 만든다.

무엇이 수집돼 있는지는 `python3 personal-research/api/bin/collect.py list` 로 본다.

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

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
│   │   └── space/
│   │       ├── converse/   Codex 튜터가 수집물을 조사하고 블록 답변을 만든다
│   │       └── record/     space 의 목적과 대화와 연결한 수집물을 남긴다
│   ├── common/           store.py 와 log.py
│   └── database/         research.db 한 파일. git 밖
└── wui/
    ├── bin/              뷰어 화면
    └── design/           우리가 쓴 설계 문서
```

수집물과 대화와 서버 로그가 `personal-research/api/database/research.db` 한 파일에 있다. `collected` 가 문서의 신원(uuid)과 원문 주소와 보관 경로를, `collected_content` 가 원문과 번역본의 본문을 판(version)별로 담는다. 같은 문서의 번역본은 그 문서의 `language = 'kor'` 행이고, 판 번호가 원문보다 낮으면 낡은 번역이다. git 은 바이너리를 diff 하지 못하고 grep 도 되지 않는다. 내용을 파일로 봐야 하면 `collect.py export` 가 `data/collected/` 에 트리를 풀어 준다. 그 폴더는 git 이 무시하는 일회용이다.

대화는 research space 에 산다. space 는 무엇을 배우려는지라는 목적 하나로 나뉜다.

| 표 | 무엇 |
|------|------|
| `space` | 제목, 목적(`purpose`), 웹 이전 학습 기록(`log`), 이어 가는 Codex 대화(`thread_id`), 대화 하나(`messages`) |
| `space_collected` | space 가 참조하는 수집물. 없어도 되고 여럿이어도 된다 |

- space 하나에 대화는 하나다. `messages` 에 질문, 블록 답변, 생성 상태, 답변이 근거로 쓴 수집물(`sources`)이 함께 있다.
- 저장소 카드(`repos/github/{owner}/{repo}`)를 연결하면 그 path 아래 파일이 모두 따라온다. 나중에 수집한 파일도 포함된다.
- 문서를 보다 질문하면 그 문서를 연결한 space 가 열리고, 없으면 첫 질문 때 새로 만든다. 저장소 파일이면 저장소 카드를 연결한다.
- 답할 때마다 Codex 가 `data/corpus/` 의 수집물 사본(`collect.py export` 와 같은 트리)을 읽기 전용으로 조사하고, 근거로 쓴 path 를 `sources` 에 남긴다. 근거가 없으면 그렇다고 밝히고 답한다. 사본은 수집물이 바뀌면 다음 질문 때 다시 만든다.
- 서버가 시작할 때 예전 `conversations` `agent` `asked` 표가 있으면 space 로 옮기고 지운다.

화면은 왼쪽 사이드바(space 목록과 수집물 트리) 오른쪽에 문서와 채팅을 둔다. 채팅 패널 머리의 `문서` `나란히` `채팅` 으로 배치를 고른다.

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

1. codex 는 `docker exec -it personal-research-{환경}-api codex login --device-auth` 를 실행하고, 화면의 코드를 브라우저에서 승인한다. space 의 답변을 만든다. ChatGPT 계정은 Codex 기본 모델을 쓰지 못할 수 있으므로 `SPACE_CODEX_MODEL` 을 비우지 않는다.
2. claude 는 자기 컴퓨터에서 `claude setup-token` 으로 받은 토큰을 `.env/.env.{환경}` 의 `CLAUDE_CODE_OAUTH_TOKEN` 에 넣고 컨테이너를 다시 띄운다. 수집할 때 번역을 맡는다.

`ANTHROPIC_API_KEY` 를 넣으면 요금제가 아니라 API 과금으로 바뀐다. 서버의 채팅 API 에는 인증이 없으므로, 외부 서버에 둘 때도 포트는 `127.0.0.1` 에만 열고 Tailscale 이나 SSH 터널로 접속한다.

뷰어를 열면 홈이 먼저 나온다. 입력창 왼쪽 배지로 `ask` 와 `collect` 를 고른다. `ask` 는 질문으로 새 space 를 열고, `collect` 는 주소를 받아 원문을 받고 한국어판까지 만든다.

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

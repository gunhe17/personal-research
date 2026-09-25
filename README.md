# research

AI 모델과 에이전트에 관한 외부 문서를 원문 그대로 모아 두고, 한국어 번역본을 나란히 두는 저장소다. 공식 문서와 블로그, 논문, X 아티클, GitHub 문서, YouTube 전사를 한곳에서 원문과 번역으로 대조해 읽는 것이 목적이다.

## 구조

```
personal-research/
├── api/
│   ├── bin/              뷰어 서버와 대화 API
│   ├── script/           collect.py 와 유형별 source/, sync.sh
│   └── data/
│       ├── collected/    eng/ 원문, kor/ 번역, meta/ 출처, CATALOG.md
│       └── database/     대화 DB
└── wui/
    ├── bin/              뷰어 화면
    └── design/           우리가 쓴 설계 문서
```

뷰어 서버는 Docker 로 띄운다. 환경은 둘이고, 포트와 경로는 `.env/.env.{환경}` 에서 정한다.

| 환경 | 코드 | 호스트 포트 | 재시작 |
|------|------|------|------|
| develop | 저장소 전체를 연결해 고치면 바로 반영된다 | 8765 | 수동 |
| production | 이미지에 넣는다. `data/` 만 호스트 폴더를 연결한다 | 8766 | 자동 |

```sh
docker compose --env-file .env/.env.develop -f .docker/docker-compose.develop.yml up -d --build
docker compose --env-file .env/.env.production -f .docker/docker-compose.production.yml up -d --build
```

컨테이너 안의 grok 과 claude 는 개인 요금제로 로그인해 쓴다. 로그인은 환경마다 따로 볼륨에 남으므로 환경별로 처음 한 번만 하면 된다.

1. grok 은 `docker exec -it personal-research-{환경}-api grok login --device-auth` 를 실행하고, 화면의 코드를 브라우저에서 승인한다.
2. claude 는 자기 컴퓨터에서 `claude setup-token` 으로 받은 토큰을 `.env/.env.{환경}` 의 `CLAUDE_CODE_OAUTH_TOKEN` 에 넣고 컨테이너를 다시 띄운다.

`ANTHROPIC_API_KEY` 나 `XAI_API_KEY` 를 넣으면 요금제가 아니라 API 과금으로 바뀐다. 서버의 채팅 API 에는 인증이 없으므로, 외부 서버에 둘 때도 포트는 `127.0.0.1` 에만 열고 Tailscale 이나 SSH 터널로 접속한다.

무엇이 수집돼 있는지는 [CATALOG.md](personal-research/api/data/collected/CATALOG.md) 가 답한다.

## 수집 요청

URL 이나 식별자를 주고 `/collect` 를 부른다. `collect.py` 가 유형을 가려 원문을 받고, 번역 에이전트가 한국어판을 만든다. 스킬 없이 받을 때는 `python3 personal-research/api/script/collect.py auto <입력>` 을 쓰고, 명령 목록은 `--help` 로 본다.

| 입력 | 결과 |
|------|------|
| arXiv URL 이나 id | 자족적 HTML 원문과 같은 조판의 한국어판 |
| `x.com/<user>/article/<id>` | 마크다운 원문과 한국어판 |
| `github.com/<owner>/<repo>` | 저장소 URL 카드 하나. 번역 없음 |
| GitHub 문서 파일 URL | 마크다운 원문과 한국어판 |
| YouTube URL | 화자 분리 전사와 한국어판 |
| 그 밖의 URL | 마크다운 원문(없으면 HTML 변환본)과 한국어판 |
| 이미 받은 `collected/eng/` 파일 | 한국어판만 |

공식 문서 사이트 전체를 다시 받을 때는 `bash personal-research/api/script/sync.sh` 를 실행한다.

`collected/` 를 다루는 규칙과 공급자별 사정은 [collected-rule.md](.claude/rules/collected-rule.md) 에, 절차는 [collect 스킬](.claude/skills/collect/SKILL.md) 에 있다.

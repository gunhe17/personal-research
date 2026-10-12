# Personal Research

AI 모델과 에이전트에 관한 외부 문서를 원문 그대로 모으고 한국어 번역본을 나란히 두는 저장소다. 화면(`wui`), 서버(`api`), 모델 실행기(`agent`) 셋을 Docker 로 띄운다.

## 준비

- Docker Desktop
- 아래 중 하나 이상의 요금제 계정: ChatGPT(Codex), Claude, SuperGrok

## 설치

```sh
cp .env/.env.develop.example .env/.env.develop
openssl rand -base64 32 | tr '+/' '-_'
```

두 번째 줄의 출력을 `.env/.env.develop` 의 `ENCRYPTION_KEY=` 뒤에 붙인다. 저장한 로그인 정보와 API 키를 이 값으로 암호화하므로 잃지 않게 둔다.

처음 한 번은 빈 DB 를 만든다.

```sh
python3 personal-research/api/bin/collect.py list
```

## 실행

```sh
docker compose --env-file .env/.env.develop -f .docker/docker-compose.develop.yml up -d --build
```

브라우저에서 http://localhost:3000 을 연다. 포트는 `.env/.env.develop` 의 `DEVELOP_WUI_PORT` 다.

멈출 때는 `up -d --build` 를 `down` 으로 바꿔 실행한다.

## 로그인

오른쪽 위 톱니바퀴 → Models → 제공사(OpenAI, Anthropic, xAI) → `Log in`. 화면의 안내대로 브라우저에서 승인하면 끝난다. ChatGPT 계정은 `gpt-6-luna` 모델만 쓸 수 있다.

## 쓰기

- 홈 입력창에서 `ask` 로 질문하거나, `collect` 로 URL 이나 arXiv id 를 넣어 수집한다.
- 왼쪽 사이드바에서 대화, 수집 문서, space 를 연다.

구조와 동작의 자세한 설명은 [docs/architecture.md](docs/architecture.md) 에 있다.

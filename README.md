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

처음 한 번 관리자 계정을 만든다. 비밀번호를 두 번 묻고, DB 가 없으면 함께 만든다.

```sh
python3 personal-research/api/bin/user.py add <이메일> --name <이름>
```

함께 쓸 사람은 관리자가 화면에서 추가한다. 톱니바퀴 → Account → Users 에서 이름과 이메일을 넣으면 무작위 비밀번호가 한 번만 나오므로 복사해 전한다. 받은 사람은 Account → Profile 에서 자기 비밀번호로 바꾼다. 수집한 문서는 모두가 함께 보고, 대화와 모델 로그인·API 키는 사람마다 따로다. 각자 자기 계정에 저장한 요금제나 API 키로만 답변과 번역을 받는다. 관리자 비밀번호를 잊으면 `user.py reset <이메일>` 으로 바꾼다.

## 실행

```sh
docker compose --env-file .env/.env.develop -f .docker/docker-compose.develop.yml up -d --build
```

브라우저에서 http://localhost:3000 을 연다. 포트는 `.env/.env.develop` 의 `DEVELOP_WUI_PORT` 다.

같은 네트워크의 다른 기기(폰, 태블릿)에서는 이 컴퓨터의 주소로 연다. 주소는 macOS 에서 `ipconfig getifaddr en0` 으로 본다(예: http://192.168.1.3:3000). 화면(wui)만 바깥에 열리고 api 는 이 컴퓨터 안에서만 듣는다. 이 컴퓨터에서만 쓰려면 `DEVELOP_WUI_HOST=127.0.0.1` 로 바꾼다. macOS 방화벽이 켜져 있으면 처음 한 번 Docker 의 수신을 허용한다.

멈출 때는 `up -d --build` 를 `down` 으로 바꿔 실행한다.

## 로그인

화면의 로그인 창에 만든 이메일과 비밀번호로 들어간다. 그다음 모델 요금제를 연결한다. 오른쪽 위 톱니바퀴 → Models → 제공사(OpenAI, Anthropic, xAI) → `Log in`. 화면의 안내대로 브라우저에서 승인하면 끝난다. ChatGPT 계정은 `gpt-6-luna` 모델만 쓸 수 있다.

## 쓰기

- 홈 입력창에서 `ask` 로 질문하거나, `collect` 로 URL 이나 arXiv id 를 넣어 수집한다.
- 왼쪽 사이드바에서 대화, 수집 문서, space 를 연다.

구조와 동작의 자세한 설명은 [docs/architecture.md](docs/architecture.md) 에 있다.

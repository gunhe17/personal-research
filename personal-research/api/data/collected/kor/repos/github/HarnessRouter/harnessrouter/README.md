# HarnessRouter

<div align="center">
  <a href="https://harnessrouter.ai">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/images/logo-dark.png">
      <source media="(prefers-color-scheme: light)" srcset=".github/images/logo-light.png">
      <img alt="HarnessRouter" src="https://raw.githubusercontent.com/HarnessRouter/harnessrouter/main/.github/images/logo-light.png" width="55%">
    </picture>
  </a>
</div>

<div align="center">
  <h3>내 컴퓨터에서 에이전트 하니스를 실행한다.</h3>
</div>

<div align="center">

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![Docker Pulls](https://img.shields.io/docker/pulls/harnessrouter/harnessrouter?logo=docker&logoColor=white)](https://hub.docker.com/r/harnessrouter/harnessrouter)
[![Discord](https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white)](https://discord.gg/nPcbwqVPb2)
[![X](https://img.shields.io/badge/Follow-%40HARNESSROUTER-000000?logo=x&logoColor=white)](https://x.com/HARNESSROUTER)
[![UHP conformance](https://img.shields.io/badge/UHP-class%20Full-brightgreen)](protocol/conformance/)

</div>

<br>

**내 컴퓨터에서 에이전트 하니스를 실행한다.** 컨테이너 하나, 내 API 키, 내 데이터. 하니스를 설정하고 작업을 맡기고 실행을 지켜본다. 계정도, 클라우드도, 텔레메트리도 없다. Community Edition 은 호스팅 서비스가 구현하는 것과 같은 개방 표준인 [Unified Harness Protocol (UHP)](https://unifiedharnessprotocol.org) 를 구현한다.

> [!TIP]
> 처음이라면 [무엇인가](#what-it-is) 부터 읽거나, [unifiedharnessprotocol.org](https://unifiedharnessprotocol.org) 에서 프로토콜을 읽는다.

![로그인 직후 콘솔: 바로 실행 가능한 내장 하니스 다섯 개](https://raw.githubusercontent.com/HarnessRouter/harnessrouter/main/docs/images/02-first-screen-v2.png)

---

## 설치

여섯 단계이며, 끝나면 실행 중인 인스턴스와 로그인된 콘솔, 그리고 답변을 마친 에이전트를 갖게 된다.

Docker 와 약 4GB 의 디스크, 모델 제공자의 API 키가 필요하다. 만들어야 할 계정도 가입할 것도 없다. 이 이야기에서 유일한 자격 증명은 제공자 키뿐이며, 그것이 속한 제공자를 호출할 때를 빼면 박스 밖으로 나가지 않는다.

### 1. 이미지 받기

```bash
docker pull harnessrouter/harnessrouter
```

약 700MB 를 받는다.

<details>
<summary><code>latest</code> 대신 버전 고정하기</summary>

`latest` 는 현재 릴리스이며, 다시 받는 것이 업그레이드하는 방법이다. 버전을 고정하는 것은 팀과 공유하는 compose 파일에서 버전을 명시해 두 대의 머신이 같은 바이트를 실행해야 할 때만 한다. 릴리스 목록은 [Docker Hub](https://hub.docker.com/r/harnessrouter/harnessrouter/tags) 에 있다.

</details>

### 2. 실행하기

이대로 복사한다. 그 안에는 자리표시자가 없다 — 제공자 키도, 비밀번호도.

```bash
docker run -d --name harnessrouter \
  -p 127.0.0.1:3000:3000 \
  -v harnessrouter:/data \
  harnessrouter/harnessrouter
```

3000 포트가 이미 사용 중이면 왼쪽 숫자만 바꾼다 (`-p 127.0.0.1:3100:3000`). 컨테이너 내부는 항상 3000 번을 듣기 때문이다.

<details>
<summary>이 줄의 각 부분이 하는 일</summary>

`-p 127.0.0.1:3000:3000` 은 콘솔을 이 머신에서만 접근 가능하게 유지한다. 그래서 기본 로그인으로 시작한 뒤 나중에 바꾸는 것이 안전하다.

`-v harnessrouter:/data` 는 지속되는 모든 것이 사는 곳이다: 데이터베이스, 파일, 그리고 첫 시작에 설치된 에이전트 CLI들. 이 볼륨을 유지하는 것이 이후의 모든 시작을 빠르게 만든다.

제공자 키가 없는 이유는 5단계에서 콘솔로 제공자를 연결하기 때문이다. 그게 더 짧은 길이다: 폼에 붙여넣은 키는 셸 기록에 잘못 남을 수 없고, 나중에 바꿔도 컨테이너를 다시 만들 필요가 없다.

비밀번호가 없는 이유는 인스턴스가 4단계에서 알려주고 바꾸라고 요구하는 기본 로그인으로 시작하기 때문이다.

</details>

<details>
<summary><code>--user</code> 를 추가하지 않는다: 컨테이너는 root 로 시작해 스스로 권한을 낮춘다</summary>

컨테이너는 반드시 root 로 시작해야 하며, 0.8.2 부터는 그렇게 하지 않으면 그 이유를 한 줄로 알리며 시작을 거부한다. 이것은 흔한 "root 로 실행" 편법이 아니라 그 반대다. root 는 딱 한 가지를 위해 필요하다: 모든 에이전트 CLI 는 각자의 세션 전용 사용자로 실행되며, 그 사용자는 그 세션의 작업공간만 소유한다. 그 사용자로 전환하는 것이 root 의 목적이며, 제품 자체는 첫 순간부터 권한 없는 사용자로 실행된다.

하나의 컨테이너가 여러 세션을 서비스하는 상황에서 이것이 주는 것:

- 한 에이전트는 다른 세션의 파일, 데이터베이스, 블롭 저장소, 비밀 저장소를 읽거나 쓸 수 없다. "하지 말라고 되어 있다"가 아니라 "할 수 없다"다. 그 경로들이 다른 사용자 소유이기 때문이다.
- 에이전트가 잘못된 위치에 파일을 저장하면 쓰기 시점에 실패하며, 이때 모델은 아직 그 자리에 있어 스스로 고칠 수 있다. 수집된 작업공간 밖으로 조용히 사라지는 대신이다.
- 에이전트 프로세스는 제품의 비밀 값을 환경변수로 전혀 갖지 않는다.

이를 위해 추가로 부여되는 권한은 없다: `--privileged` 도, `--cap-add` 도, 커스텀 seccomp 프로필도 없다. Docker 의 기본 capability 집합에 이미 root 프로세스가 다른 사용자로 전환하는 데 필요한 것이 들어 있고, 쓰이는 것은 그것뿐이다.

지금 `--user` 로 실행 중이라면(또는 compose 파일의 `user:`), 업그레이드 전에 제거한다. 위의 문서화된 명령은 애초에 그것을 설정한 적이 없고, 이전 버전의 볼륨은 첫 시작에서 그대로 받아들여진다.

</details>

<details>
<summary><code>docker run</code> 에서 사용자명과 비밀번호를 직접 고르기</summary>

선택적 변수 두 개다. 설정하면 기본값을 대체하며, 콘솔은 이후 기본 로그인을 다시 보여주지 않는다.

```bash
docker run -d --name harnessrouter \
  -p 127.0.0.1:3000:3000 \
  -v harnessrouter:/data \
  -e HR_AUTH_USER=you \
  -e HR_AUTH_PASSWORD=the-password-you-chose \
  harnessrouter/harnessrouter
```

`HR_AUTH_PASSWORD=` 뒤에 넣는 값이 곧 비밀번호다 — 4단계에서 정확히 그 값으로 로그인한다. 시작할 때 이것이 꼭 필요한 것은 아니며, 나중에 프로필 페이지에서 비밀번호를 바꾸는 것도 똑같이 동작한다. 이 옵션은 스크립트가 만든 박스처럼 아무도 브라우저를 열지 않을 경우를 위해 존재한다.

</details>

<details>
<summary>Docker Compose 사용하기</summary>

`cp .env.example .env` 다음 `docker compose up -d`. `docker-compose.yml` 을 먼저 읽는다: 이것은 loopback 이 아니라 모든 인터페이스에 `3000:3000` 을 공개한다. 그 한 줄만 바꾸면 위의 명령과 같이 동작한다.

</details>

### 3. 준비됐다는 메시지를 기다리기

**아직 브라우저를 열지 않는다.** `docker run` 은 약 1초 만에 프롬프트를 돌려주지만, 콘솔은 대략 30초를 더 필요로 하고, 그때까지 <http://localhost:3000> 은 연결을 거부한다. 이것은 첫 시작이 아직 진행 중인 것이지 컨테이너가 고장 난 것이 아니다.

```bash
docker logs -f harnessrouter
```

`ready on :3000` 을 기다린 다음 브라우저를 연다:

```
[harnessrouter] installing Claude Code (Anthropic's terms apply)…
[harnessrouter] installing Codex (Apache-2.0)…
[harnessrouter] installing Pi (MIT) and its MCP adapter (MIT)…
[harnessrouter] installing DeepSeek Harness (MIT, developer preview — version-pinned)…
[harnessrouter] installing Hermes (check its upstream license before use)…
[harnessrouter] data=/data  backends available: claude codex hermes pi dsh
[harnessrouter] ready on :3000
```

이 대기는 볼륨당 한 번만 일어난다. 그 이후의 모든 시작은 몇 초 만에 끝나며 설치 관련 줄을 전혀 출력하지 않는다.

<details>
<summary>다른 줄들, 그리고 첫 시작이 느린 이유</summary>

`backends available:` 은 실제로 설치된 것을 나열한다. 그래서 실패한 백엔드는 조용히 빠지는 대신 이름이 드러나며, 나머지는 그대로 동작한다.

다음 줄도 보게 되는데, 4단계에서 비밀번호를 바꾸기 전까지는 시작할 때마다 나타난다. loopback 전용 인스턴스에서는 문제라기보다 알림이다:

```
[harnessrouter] WARNING: using the DEFAULT password. Set HR_AUTH_PASSWORD, or change it from the profile page, before exposing this instance.
```

에이전트 CLI 들은 이미지에 담겨 오는 대신 첫 시작 시점에 받아진다. 이것은 패키징상의 취향이 아니라 라이선스 상의 사실이다. Claude Code 는 Anthropic 자체 약관 아래 배포되고 hermes-agent 는 라이선스를 아예 명시하지 않으므로, 둘 다 공개 이미지 안에 재배포할 수 없다. 첫 실행에서 설치한다는 것은 그것들을 업스트림에서 그 약관 아래 스스로 설치한다는 뜻이며, 그래서 이 두 백엔드를 쓰기 전에 약관을 먼저 읽어야 한다. Codex(Apache-2.0), Pi(MIT, MIT 라이선스의 MCP 어댑터 포함), DeepSeek Harness(MIT, 정확한 버전에 고정된 개발자 프리뷰) 도 같은 방식으로 도착하며, 그래서 다섯 개가 한 자리에 모인다.

</details>

### 4. 로그인하기

<http://localhost:3000> 을 열고 다음으로 로그인한다:

| | |
|---|---|
| 사용자명 | `harnessrouter` |
| 비밀번호 | `harnessrouter` |

![로그인 화면](https://raw.githubusercontent.com/HarnessRouter/harnessrouter/main/docs/images/01-login.png)

오른쪽 위 계정 메뉴의 **Profile** 에서 **지금 비밀번호를 바꾼다.** 저장하면 콘솔이 재시작되며, 약 1초 걸린다.

`docker run` 에서 `HR_AUTH_USER` 나 `HR_AUTH_PASSWORD` 를 설정했다면 그 값으로 로그인한다 — 그러면 기본값은 거부된다.

<details>
<summary>비밀번호는 어디에 있고, 잊어버렸을 때는 어떻게 하나</summary>

여기서 기본값을 공개하는 것 자체가 그것을 비밀이 아니라 자리표시자로 만드는 이유이며, 그래서 비밀번호를 바꾸기 전까지 컨테이너는 시작할 때마다 경고한다.

프로필 페이지는 새 비밀번호뿐 아니라 현재 비밀번호도 요구하므로, 방치된 탭 하나로 인스턴스를 탈취할 수 없다. 새 자격 증명은 데이터 볼륨(`/data/selfhost-auth.json`: 사용자명, 솔트, 해시이며 비밀번호 자체는 저장되지 않는다)에 저장되고 그 이후로는 환경변수보다 우선한다 — 몇 달 전 `docker run` 에서 설정한 `HR_AUTH_PASSWORD` 가 이후의 비밀번호 변경을 조용히 무효화할 수 없다. 변경 후에는 시작 줄이 실제 비밀번호가 어디서 왔는지를 알리도록 바뀐다:

```
[harnessrouter] sign in as 'harnessrouter' (credentials set from the profile page)
```

저장하면 다른 모든 브라우저도 로그아웃된다. 자신의 브라우저는 로그인 상태를 유지한다.

잊어버렸다면? 보낼 재설정 이메일이 없으므로 `/data/selfhost-auth.json` 을 지우고 재시작한다. 인스턴스는 `HR_AUTH_USER` / `HR_AUTH_PASSWORD` 로 되돌아간다.

</details>

### 5. 모델 제공자 연결하기

**이 단계를 하기 전까지는 아무것도 실행되지 않는다.** 번들된 모델도, 체험 키도, 이미지에 숨겨진 무료 등급도 없다.

**Integrations** 를 열고 **Add Integration** 을 누른다. 이름, 제공자, API 키 세 가지를 묻는다.

![Integrations 페이지에서 제공자 추가하기](https://raw.githubusercontent.com/HarnessRouter/harnessrouter/main/docs/images/05-add-integration.png)

그 제공자가 어떤 모델을 서비스하는지는 직접 설정할 문제가 아니다. 제품이 그 목록을 관리하며 제공자가 모델을 출시할 때마다 추가한다. 제공자를 고르고 키를 붙여넣으면 그 제공자가 다루는 모델들이 그 행에 나타난다.

<details>
<summary>제공자를 둘 이상 운영하기</summary>

integrations 아래의 매핑이 특정 모델을 어느 것이 서비스할지 결정한다. integration 이 하나뿐이면 설정할 것이 없다.

</details>

<details>
<summary>스크립트 배포를 위해 환경변수로 대신 설정하기</summary>

connection 은 제공자와 그 자격 증명의 이름을 정하고, policy 는 어느 backend 가 어느 connection 을 쓸지 정한다. 박스를 스크립트가 만들고 아무도 브라우저를 열지 않을 때 유용하다:

```bash
-e HR_SECRET_GLOBAL_HARNESS_CONN_ANTHROPIC='{"name":"anthropic","provider":"anthropic","api_key":"sk-ant-…"}'
-e HR_SECRET_GLOBAL_HARNESS_POLICY_CLAUDE='{"chain":["anthropic"]}'
```

backend 마다 policy 변수가 하나씩 있다: `…POLICY_CLAUDE`, `…POLICY_CODEX`, `…POLICY_HERMES`. 자체 운영하는 OpenAI 호환 엔드포인트는 같은 쌍에 `base_url` 을 더한 것이며, `.env.example` 이 아직 보여주는 `"openai-api"` 가 아니라 `"provider":"openai"` 를 쓴다:

```bash
-e HR_SECRET_GLOBAL_HARNESS_CONN_LOCAL='{"name":"local","provider":"openai","api_key":"…","base_url":"https://api.example.com/v1"}'
-e HR_SECRET_GLOBAL_HARNESS_POLICY_CODEX='{"chain":["local"]}'
```

모든 제공자가 모든 backend 와 맞는 것은 아니며, 맞지 않는 조합은 조용히 실패한다: 오류가 나는 대신 긴 대기 후 빈 응답이 돌아온다. Integrations 페이지에는 이 문제가 없는데, 동작하는 제공자만 골라서 보여주기 때문이다.

| Connection `provider` | 사용 가능한 Backend |
|---|---|
| `anthropic` | Claude Code, Hermes, Pi |
| `openai` | Codex, Hermes, Pi |
| `openrouter` | Codex, Hermes, Pi, DeepSeek Harness |
| `azure-foundry` | Codex, Hermes, Pi |
| `bedrock` | Claude Code, Hermes |
| `tokenrouter` | Claude Code, Codex, Hermes, Pi, DeepSeek Harness |
| `vercel` | Claude Code, Codex, Hermes, Pi, DeepSeek Harness |
| `llmtr` | Claude Code, Codex, Hermes, Pi, DeepSeek Harness |

</details>

<details>
<summary>아무것도 연결되지 않은 backend 가 하는 말</summary>

이 단계를 아예 건너뛰면 이렇게 솔직하게 알려준다:

```json
{"error":{"type":"invalid_request_error","code":"invalid_input","message":"no provider configured for backend 'codex'. Add an integration for a provider that serves 'gpt-5.4-mini', or configure a connection policy"}}
```

</details>

### 6. 할 일을 준다

**Tasks → New Task.** 왼쪽 스위처에서 하니스를 고르고, 메시지 상자 옆에서 모델을 선택하고, 입력한다. 턴이 일어나는 대로 스트리밍된다: 에이전트가 실행하는 모든 명령, 건드리는 모든 파일, 그리고 마지막의 답변까지.

![태스크 화면: 요청, 명령들, 작성한 파일, 테스트 결과](https://raw.githubusercontent.com/HarnessRouter/harnessrouter/main/docs/images/task-run.png)

설치는 이것으로 끝이다. 상태는 하나의 Docker 볼륨 위의 SQLite 와 파일들뿐이다. 볼륨을 지우면 인스턴스는 사라지고, 복사하면 인스턴스와 하니스와 트랜스크립트 전부를 그대로 옮긴 것이 된다.

<details>
<summary>저 스크린샷에서 무슨 일이 일어났나</summary>

저 요청은 테스트가 딸린 작은 유틸리티를 요구했다. 에이전트는 코드를 작성하고, 중복이 심어진 픽스처 트리를 만들고, 스위트를 돌려 `2 tests ran, OK` 라는 결과를 가져왔다. 이것은 믿어야 하는 답이 아니라 확인할 수 있는 답이다. 만들어낸 모든 것은 트랜스크립트에서 파일 하나씩, 또는 zip 하나로 통째로 가져갈 수 있다.

</details>

---

## 스타터 킷

스타터 킷은 완성된 예제이며, 이것을 무엇에 쓸 수 있는지 보여주기 위해 있다.

각각은 코드 조각이 아니라 온전한 에이전트 제품이다: 앱 하나, 그 앱을 다루도록 설정된 에이전트, 그리고 그 에이전트에게 자신이 쓰는 포맷을 가르치는 스킬. 하나를 써 보고 나서 읽어 본다. 모든 킷은 오픈소스다. 시간이 지나며 더 늘어나고, 내 인스턴스는 자신이 가진 것을 보여준다.

![Starter Kits 페이지: 아직 아무 킷도 실행하기 전](https://raw.githubusercontent.com/HarnessRouter/harnessrouter/main/docs/images/dashboard-1-starter-kits.png)

실행하려면 질문 하나가 온다: 무엇을 대상으로 실행할 것인가.

<details>
<summary>실행 대화상자가 알려주는 것</summary>

각 카드는 실행하기 전에 어떤 base 와 모델로 돌아갈지 이름으로 보여주므로, 돈을 쓰기 전에 무엇에 쓸지 알 수 있다. 무엇을 보여줄지는 5단계에서 준 키에 달려 있다: 위 스크린샷은 제공자 셋이 연결된 인스턴스이고, 하나만 연결된 인스턴스는 모든 카드에서 그 하나를 추천한다.

키가 없는 런타임도 목록에는 뜨지만 비활성 상태이며 이유가 함께 붙는다:

> Hermes · `deepseek-v4-pro` · Not connected. Add a provider that serves this model to use it.

대화상자가 추천하는 것은 반드시 따라야 하는 기본값이 아니라 뒤집어도 되는 제안이다.

</details>

### Slides

발표자료 하나가 대화 하나다. 발표를 요청하면 에이전트는 구조부터 정하고, 스타일 시스템을 만들고, 슬라이드를 하나씩 채운다. 작업 중에 슬라이드가 나타나므로, 방향이 틀렸을 때 스무 장이 아니라 두 장일 때 말할 수 있다.

아래 발표자료는 한 문장에서 나왔다: *"컨테이너 이미지가 무엇인지 신입 엔지니어에게 설명하는 5장짜리 슬라이드."*

![Slides 편집기: 대화 맨 위의 문장, 그 아래의 실행 과정, 그리고 완성된 발표자료](https://raw.githubusercontent.com/HarnessRouter/harnessrouter/main/docs/images/kit-slides.png)

<details>
<summary>오른쪽 패널에서 보고 있는 것</summary>

저것은 진행 표시줄이 아니라 실행 과정 그 자체다. 구조를 확정하고, 스타일 시스템을 만들고, 캔버스가 받아들일지 확인하고, 발표자료를 작성한 다음 검증했으며, 그 과정을 그대로 보여준다.

여기서 보는 슬라이드는 이미지가 아니다. 모든 요소는 캔버스 위의 실제 객체이므로 끌어서 옮기거나, 크기를 바꾸거나, 다시 입력하거나, 같은 대화에서 다시 손봐 달라고 요청할 수 있다.

</details>

### Sheets

행은 내 데이터다. 에이전트 열은 모든 행에 대해 하니스 중 하나를 실행하며, 왼쪽의 열들을 입력으로 삼아 시트를 셀 단위로 채운다. Run 을 누르면 실시간 카운트와 Stop 버튼과 함께 행 순서대로 채워진다. 천 행짜리 열은 언제든 마음을 바꿀 수 있어야 하는 것이기 때문이다.

이 시트는 이렇게 시작했다: *"help me build a sheet, i wanna use this to map investors in silicon valley. the goal is to provide this one to investors outside of SV the startups invested by investors based SV."*

![Sheets 편집기: 대화 맨 위의 요청, 실제 투자자 행들, 그리고 각 행에 대한 에이전트 열의 출력](https://raw.githubusercontent.com/HarnessRouter/harnessrouter/main/docs/images/kit-sheets.png)

<details>
<summary>그 시트가 만들어진 과정</summary>

그 한 문장으로부터 에이전트는 열을 정하고, 그중 어느 것을 사람이 채우고 어느 것을 에이전트가 채울지 결정한 뒤, 행마다 쓸 프롬프트를 직접 작성했다. 행들은 후속 요청 *"search some real data and from internet"* 에서 나왔으며, 그럴듯한 값을 지어내는 대신 실제 투자자 넷을 각 회사의 소개 페이지와 함께 찾아냈다.

</details>

<details>
<summary>에이전트 열 메뉴가 다른 에이전트가 없다고 할 때</summary>

에이전트 열은 내 *다른* 에이전트 중 하나를 실행하며, 시트가 자기 자신을 실행하지는 않는다. 그래서 Sheets 만 실행해 본 인스턴스에서는 열 메뉴에 보여줄 것이 없어 이렇게 말한다:

> Choose an agent… · You have no other agents yet. Create one, then choose it here.

**Harnesses → Add Harness** 가 해결책이다: base, 모델, 이름을 정하면 몇 초 안에 준비된다. 그러면 피커에 그 하니스가 실행할 모델과 함께 나타난다. 시트를 연 채로 하니스를 추가했다면 시트를 먼저 새로고침한다. 목록은 페이지가 로드될 때 읽히기 때문이다.

</details>

### Dashboards

무엇을 알고 싶은지 말하고 데이터베이스를 알려준다. 에이전트는 스키마를 읽고, 질문마다 쿼리를 작성하고, 그 답에 맞는 차트를 고르고, 패널을 배치한다. 대시보드를 열 때마다 모든 쿼리가 다시 실행되므로, 보이는 것은 만들어졌던 순간의 스냅샷이 아니라 지금의 데이터베이스다.

![Dashboards 킷 실행하기: 무엇을 대상으로 할지, 어느 데이터베이스를 읽을지](https://raw.githubusercontent.com/HarnessRouter/harnessrouter/main/docs/images/dashboard-2-launch.png)

설정이 있는 유일한 킷이며, 그마저도 필드 두 개뿐이다: connection 과 샘플 행 스위치.

![Dashboards 킷: 오른쪽의 두 대화 턴과, 그것이 만들어낸 실시간 패널들](https://raw.githubusercontent.com/HarnessRouter/harnessrouter/main/docs/images/kit-dashboard.png)

<details>
<summary>그 대시보드가 어떻게 만들어졌고, 왜 그 수치를 믿을 만한가</summary>

*"Revenue by month and the top 5 countries by revenue, plus total paid revenue."* 로 시작했다. 그 대화의 두 턴 모두 오른쪽 패널에 있다: 첫 턴이 그것을 만들었고, 레이아웃 사진을 첨부한 두 번째 턴 *"Enrich the dashboard like this"* 에서 지금 보이는 패널들이 나왔다.

대시보드에는 숫자를 직접 입력할 곳이 없다. 그 페이지의 모든 수치는 페이지가 열릴 때 실행된 쿼리의 결과이며, 그것이 이 수치를 믿을 만하게 만드는 성질이다. 변경을 요청하면 패널에 연결하기 전에 각 쿼리를 먼저 실행하므로, 렌더링된 패널은 곧 쿼리가 동작한다는 뜻이다.

</details>

<details>
<summary>데이터베이스 연결하기</summary>

연결하기 전에 알아야 할 세 가지다.

**컨테이너가 그것에 접근할 수 있어야 한다.** 데이터베이스가 다른 컨테이너라면 둘을 같은 사용자 정의 네트워크에 둬서 데이터베이스의 *이름* 이 해석되게 한다. Docker 의 기본 브리지에는 DNS 가 없어서 그 위에서는 컨테이너의 IP 만 동작하는데, 그 IP 는 바뀐다:

```bash
docker network create hr-net
docker network connect hr-net my-postgres
docker run -d --name harnessrouter --network hr-net \
  -p 127.0.0.1:3000:3000 -v harnessrouter:/data … harnessrouter/harnessrouter
```

그러면 connection 문자열에서 `my-postgres:5432` 가 호스트로 동작한다. 컨테이너가 아니라 호스트 머신에 있는 데이터베이스는 Docker Desktop 에서는 `host.docker.internal` 로, Linux 에서는 `--add-host=host.docker.internal:host-gateway` 를 통해 접근할 수 있다.

**`HR_SECRET_KEY` 를 설정한다.** connection 문자열은 이 값에서 유도된 키로 저장 시 암호화되며, 이것이 없으면 서버는 프로덕션 자격 증명을 평문으로 디스크에 쓰는 대신 저장 자체를 거부한다:

```bash
-e HR_SECRET_KEY=a-long-random-passphrase
```

이 값을 보관한다. 바꾸면 저장된 connection 들을 더 이상 복호화할 수 없어 다시 연결해야 한다.

**읽기 전용 데이터베이스 계정을 쓴다.** 모든 구문이 검사되어 `SELECT` 만 허용되고, `SELECT` 가 아닌 것과 여러 구문, 데이터를 변경하는 CTE 는 거부되며, PostgreSQL 에서는 쿼리가 추가로 `READ ONLY` 트랜잭션 안에서 실행된다. 이 검사는 파서이고, 파서는 틀릴 수 있는 것이다. `SELECT` 만 부여받은 계정은 우리 쪽이 옳다는 것에 의존하지 않는 두 번째 방어선이다:

```sql
CREATE USER dashboards WITH PASSWORD '…';
GRANT CONNECT ON DATABASE shop TO dashboards;
GRANT USAGE ON SCHEMA public TO dashboards;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dashboards;
```

connection 문자열은 쿼리가 실행되는 순간에 해석된다. 에이전트의 샌드박스는 그것을 전혀 받지 못한다. 받는 것은 `SELECT` 를 실행하는 도구뿐이며, 브라우저도 마찬가지다.

**샘플 행**은 connection 별 스위치이며 기본으로 켜져 있다: 에이전트는 테이블마다 실제 행 몇 개를 보고 상태 열과 카테고리 열을 구분할 수 있다. 끄면 테이블명과 열 이름·타입만 보고 값은 전혀 보지 못한다.
</details>

### Videos

영상을 설명하면 그대로 돌려받는다: 샷을 기획하고, 각각을 렌더링하고, 재배치 가능한 캔버스 위에 배치한 다음, 다운로드할 수 있는 영상 하나로 합친다. 클립은 백그라운드에서 렌더링되므로 도착을 기다리는 동안에도 작업을 계속할 수 있다.

> [!WARNING]
> 턴당이 아니라 출력 초당 실제 비용이 드는 유일한 킷이다. 모든 샷이 하나의 생성이기 때문이다. 콘솔이 무엇을 하는지 이미 파악한 뒤에 써 본다.

---

## 무엇인가

*에이전트 하니스* 는 모델을 감싸는 실행 계층이다. Codex, Claude Code, Hermes 가 하니스다. 이 저장소의 API 에서는 *harness* 객체도 만드는데, 이것은 저장된 설정으로서 `base` 가 그 런타임 중 하나이고 모델, 지시문, 제한을 더한 것이다. *task* 는 그 설정 하나를 한 번 실행한 것으로, bash 와 git 이 있는 실제 POSIX 작업공간을 상대로 한 실제 대화이며, 일어나는 대로 스트리밍된다.

HarnessRouter Community Edition 은 이 둘 모두에 대해 UHP 를 구현한다: 턴 실행, 하니스 CRUD, 세션, 스트리밍, 취소, 멱등성을 위한 OpenAI **Responses 호환** API 다. 콘솔은 그 API 위의 얇은 클라이언트이며, UI 가 하는 모든 일은 `curl` 로도 할 수 있다.

**이 콘솔은 호스팅 제품의 그 콘솔이다.** 축소 재구현이 아니라 같은 페이지, 같은 컴포넌트, 같은 API 클라이언트다. 계정, 결제, 마켓플레이스처럼 단일 박스에는 없는 서비스가 필요한 화면만 보이지 않을 뿐이다.

**지원하는 하니스:** Codex, Claude Code, Hermes. 3단계에서 설명한 라이선스 이유로 이미지에 담겨 오지 않고 첫 실행에서 설치된다. 사용하기 전에 각 도구의 약관을 검토한다.

**내 키를 쓴다.** 제공자 자격 증명은 시작 시점에 환경변수에서 읽혀 에이전트에게 직접 건네진다. 이미지에 쓰이지도, 커밋되지도, 내 제공자 이외의 어디로도 전송되지 않는다.

## 왜 셀프호스팅인가

- **내 키, 내 비용, 내 데이터.** 모델 제공자 호출을 빼면 박스 밖으로 나가는 것이 없다.
- **실제 작업공간.** 에이전트는 샌드박스 흉내가 아니라 자신의 고유 환경인 bash, git, 파일시스템을 받는다.
- **호스팅 제품과 같은 API.** 축소판 포크가 아니라 같은 `/v1` 표면이므로, 이것을 대상으로 만든 무엇이든 나중에 호스팅 서비스로 옮겨도 계속 동작한다.
- **정말로 자족적이다.** 접속해야 할 control plane 도, 관리형 데이터베이스도 없다.

## Unified Harness Protocol

이 저장소는 구현체이자 표준이다. 게이트웨이가 말하는 프로토콜은 [`protocol/`](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/) 안에 명세되고 버전이 매겨지고 테스트 가능하며, [unifiedharnessprotocol.org](https://unifiedharnessprotocol.org) 에도 문서화되어 있다:

| | |
|---|---|
| [명세](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/versions/2026-08-11/) | 10개 규범 챕터, 버전 `2026-08-11` |
| [기계 판독용](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/schema/) | OpenAPI 3.1 + JSON Schema 2020-12, 하나의 소스에서 생성 |
| [준수 스위트](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/conformance/) | 이것을 통과하는 것이 "conformant" 의 의미이며, UHP 이름을 쓸 자격을 얻는 방법이다 |
| [거버넌스](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/GOVERNANCE.md) | 표준이 어떻게 바뀌는지, 이름과 준수 정책 |

이 에디션은 레퍼런스 구현이다. 가장 최근에 발행된 실행은 0.3.0 을 대상으로 [class Full 을 통과했다](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/conformance/reports/harnessrouter-ce-0.3.0.json). **이 표준은 HarnessRouter Cloud 없이도 구현할 수 있다**: HTTP 계약일 뿐이며 그 안에 호스팅 서비스를 요구하는 것은 없다. 자신의 서버에 대고 스위트를 돌려본다:

```bash
pip install -e protocol/conformance
uhp-conformance --base-url https://your-server --api-key "$KEY" --class full
```

## 설정

<details>
<summary>백엔드 고르기, 그리고 브라우저와 함께 빌드하기</summary>

백엔드는 이미지에 박혀 있지 않고 데이터 볼륨에 설치되므로, 무엇을 쓸지는 실행 시점 설정이다:

```bash
docker run -e HR_BACKENDS=claude,codex,hermes ...   # 기본값
```

**알려진 문제: `hermes` 를 뺀 값은 무엇이든 컨테이너를 즉시 종료시킨다** 상태 코드 1, 오류 메시지 없이다. `claude`, `codex`, `claude,codex` 모두 그렇게 되며, 로그의 마지막 줄은 마침 작업 중이던 백엔드의 설치 줄이라 마치 그 설치가 원인인 것처럼 보이지만 아니다. 고쳐지기 전까지는 `HR_BACKENDS` 를 설정하지 않은 채로 둔다.

Chromium 은 실제로 이미지 레이어이므로 빌드 플래그로 남아 있다:

```bash
docker build -t harnessrouter --build-arg WITH_BROWSER=1 .
```
</details>

<details>
<summary>엔트리포인트가 대신 설정해 주는 것</summary>

| 변수 | 기본값 | 이유 |
|---|---|---|
| `HR_BACKING` | `local` | `/data` 위의 SQLite + 파일. 외부 저장소 없음. |
| `HR_IDENTITY_MODE` | `off` | 박스 하나, 소유자 하나. 계정 시스템은 뒷받침할 것 없는 의례일 뿐이다. |
| `HR_CREDIT_GATE` | `off` | 사용량 계측은 호스팅 쪽의 관심사다. |
| `POOL_MGMT_ENDPOINT` | `http://127.0.0.1:8081` | 러너가 이 컨테이너 안에 있다. |
| `HR_POOL_AUTH` | `none` | loopback 러너에게 제시할 클라우드 신원이 없다. |
| `HR_SANDBOX_TRUST` | `owner` | 박스와 에이전트와 키를 모두 내가 소유하므로, 중개하는 대신 키를 직접 건넨다. |
| `HARNESS_WORKSPACE` | `/data/workspaces` | 세션당 디렉터리 하나, 볼륨 위에 있어 재시작이 진행 중이던 작업을 버리지 않는다. |
| `HR_WORKSPACE_TTL_HOURS` | `72` | 유휴 세션 작업공간은 이 시간 뒤 제거된다. 체크포인트에서 다시 살아나므로 이것은 작업이 아니라 시간의 비용이다. `0` 으로 두면 영구히 유지한다. |
| `HARNESS_INTERNAL_KEY` | 자동 생성 | 컨테이너별로 생성되며 프로세스 트리 밖으로 나가지 않는다. |

</details>

## API 사용하기

콘솔은 선택 사항이다. 같은 API 위의 얇은 클라이언트일 뿐이다. 기본 설치에서는 그 API 가 콘솔과 같은 포트로 접근되고 **로그인 게이트가 그것도 함께 막으므로**, 호출에는 세션 쿠키가 필요하다. 한 번 로그인해 쿠키를 유지한다:

```bash
curl -s -c hr.cookies http://localhost:3000/api/selfhost/login \
  -H 'content-type: application/json' \
  -d '{"username":"harnessrouter","password":"harnessrouter"}'   # 기본값이 아니라 내가 설정한 비밀번호
# {"ok":true}
```

그런 다음 턴을 실행한다. 게이트웨이는 Responses API 를 구사한다:

```bash
curl -s -b hr.cookies http://localhost:3000/api/harness/v1/responses \
  -H 'content-type: application/json' \
  -d '{"input":"Reply with exactly this and nothing else: it works.",
       "metadata":{"harness_id":"codex"},
       "model":"gpt-5.4-mini",
       "stream":false}'
```

```json
{"id":"resp_284e450bc2be4de8bea94c4af6030292","object":"response","created_at":1786822334,
 "status":"completed","error":null,"incomplete_details":null,"previous_response_id":null,
 "model":"gpt-5.4-mini",
 "output":[{"id":"msg_3d71e018c6584abbb063ee16d9a36e75","type":"message","status":"completed",
            "role":"assistant",
            "content":[{"type":"output_text","text":"it works.","annotations":[]}]}],
 "store":true,
 "usage":{"input_tokens":10878,"output_tokens":34,"total_tokens":10912},
 "metadata":{"session_id":"hsessa79756fab07a4bf58fa072be24d5ce59"}}
```

그 턴은 별도 경로가 아니다: 같은 하니스 아래 전체 트랜스크립트와 함께 콘솔의 **Tasks** 에도 나타난다. 콘솔과 API 는 같은 인스턴스를 두 방식으로 본 것이다.

<details>
<summary>나머지 표면</summary>

`harness_id` 는 콘솔의 Harnesses 페이지가 보여주는 내장 id 중 하나(`codex`, `claude-code`, `hermes`) 또는 내가 만든 하니스의 id 를 받는다. 하니스 CRUD(`/v1/harnesses`), 모델 카탈로그(`/v1/models`), 세션(`/v1/sessions/{id}/turns`, `/cancel`), 태스크 목록(`/v1/traces`) 모두 같은 prefix 위에 있다. 마지막에 응답 하나를 받는 대신 서버 전송 이벤트를 받으려면 `"stream":true` 로 설정한다.

아무도 접근할 수 없는 박스라면 `HR_AUTH_DISABLED=1` 로 게이트를 아예 없앨 수 있고, 같은 호출들이 쿠키 없이 동작한다.

</details>

## 공개 URL 에 올리기

콘솔은 하니스를 만들고, 모든 태스크 트랜스크립트를 읽고, 내 제공자 키로 에이전트를 실행할 수 있다.

> [!WARNING]
> **다른 누군가가 인스턴스에 접근할 수 있게 되기 전에 비밀번호를 바꾼다.** 기본값이 바로 여기 적혀 있다는 것 자체가 그것을 비밀이 아니라 자리표시자로 만들며, 기본값이 유지되는 동안 컨테이너는 시작할 때마다 경고한다. `HR_AUTH_DISABLED=1` 은 게이트를 아예 없애며, 이는 아무도 접근할 수 없는 머신에서만 합리적이다.

TLS 를 쓰려면 콘솔을 loopback 에 두고 앞단에 종단 프록시를 둔다. Caddy 라면 파일 하나로 실제 인증서까지 자동으로 처리된다:

```caddyfile
console.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000 {
        flush_interval -1      # 에이전트 턴은 몇 분간 스트리밍되므로 절대 버퍼링하지 않는다
    }
}
```

`flush_interval -1` 이 중요하다: 이것이 없으면 프록시가 이벤트 스트림을 버퍼링해 턴이 끝날 때까지 콘솔이 멈춘 것처럼 보인다.

태그를 고정하고, `0.1.x` 나 `0.2.0` 은 쓰지 않는다: 이들은 로그인 게이트가 아예 없어서, 이 버전으로 실행 중인 인스턴스는 포트에 접근할 수 있는 누구에게나 열려 있다. `0.3.0` 이 게이트를 갖춘 첫 릴리스다.

<details>
<summary>비밀번호를 바꾸면 콘솔이 재시작되는 이유</summary>

**Profile** 에서 바꾸면 다른 모든 브라우저가 로그아웃되고 콘솔이 재시작된다. 그 재시작이 "모든 곳에서 로그아웃됨"을 단순히 표시하는 것이 아니라 실제로 그렇게 만드는 이유다: 게이트는 서명 키를 시작 시점에 한 번 읽으며 그 자리에서 바뀐 것을 알 방법이 없다. 진행 중인 턴은 그대로 끝까지 이어진다.

</details>

## 호스팅 서비스로 옮기기

하니스가 원하는 대로 동작하면 **Harnesses → Push to cloud** 가 내 호스팅 API 키로 그것을 호스팅 HarnessRouter 계정에 복사한다.

이것은 의도적으로 단방향이다. 로컬은 반복하는 곳이고, 일단 승격되면 호스팅 사본이 진실의 원천이 된다. "클라우드에서 끌어오기" 는 없으므로, 하나의 하니스가 서로 자신이 최신이라 주장하는 두 곳에 동시에 살아 있을 수 없다. 호스팅 키는 그 한 번의 요청에만 쓰이고 저장되지 않는다.

## 아키텍처

```
┌─ container ─────────────────────────────────────────────┐
│  UI (Next.js)  :3000  ← 공개되는 유일한 포트              │
│      │ same-origin proxy                                │
│  Gateway       :8080  Responses API, harness CRUD       │
│      │ loopback                                         │
│  Runner        :8081  세션당 에이전트 CLI 하나            │
└─────────────────────────┬───────────────────────────────┘
       /data (volume): SQLite, files, secrets, workspaces
```

게이트웨이와 러너는 컨테이너 내부의 loopback 을 듣고 외부에 공개되지 않는다. 콘솔의 포트가 유일한 입구이며, 그래서 로그인 게이트는 앞단의 프록시가 아니라 이미지 안에 담겨 있다.

세션은 동시에 실행되며 서로 격리된다: 각각 자신의 작업공간 디렉터리, 자신의 대화 상태, 자신의 체크포인트를 갖는다. 턴 동시성 기본값은 머신의 코어 수다. 이 박스는 호스팅 배포처럼 필요에 따라 샌드박스를 늘릴 수 없으므로, 그 한계가 곧 실제로 실행할 수 있는 양이다.

저장소는 레코드, 파일, 비밀 값을 위한 작은 어댑터 인터페이스 뒤에 있다. 이 저장소는 로컬 구현을 담고 있고, 호스팅 배포는 같은 인터페이스에 대해 자신의 구현을 제공한다. 이 이음매가 이것이 갈라져 나온 포크가 아니라 진짜로 같은 코드베이스인 이유다.

## 자료

- **[문서와 Cloud](https://harnessrouter.ai)**: 호스팅 서비스, 가이드, 가격.
- **[Unified Harness Protocol](https://unifiedharnessprotocol.org)**: 이 저장소가 구현하는 개방 표준.
- **[Starter Kit](https://github.com/HarnessRouter/starter-kit)**: Community Edition 위에 만든 실행 가능한 예제 애플리케이션.
- **[Discord](https://discord.gg/nPcbwqVPb2)**: 질문, 통합, 제안을 위한 커뮤니티.
- **[Contributing](https://github.com/HarnessRouter/harnessrouter/blob/main/CONTRIBUTING.md)** 와 **[Security](https://github.com/HarnessRouter/harnessrouter/blob/main/SECURITY.md)**: 변경을 제안하고 취약점을 보고하는 방법.

## 라이선스

Apache-2.0, [LICENSE](https://github.com/HarnessRouter/harnessrouter/blob/main/LICENSE) 를 본다. 서드파티 고지는 [NOTICE](https://github.com/HarnessRouter/harnessrouter/blob/main/NOTICE) 에 있다.

에이전트 CLI 들은 이 저장소에 재배포되지 **않는다.** 첫 실행 시 각자의 라이선스 아래 설치된다. 백엔드를 활성화하기 전에 검토한다.

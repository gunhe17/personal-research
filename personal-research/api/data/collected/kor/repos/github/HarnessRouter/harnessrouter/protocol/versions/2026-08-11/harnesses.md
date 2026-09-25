# 하네스

**Unified Harness Protocol, version `2026-08-11`**

클라이언트가 작업을 보내기 전에 무엇이 그 작업을 실행할 수 있는지, 그리고 어떤 모델로 실행할 수 있는지를 알아야 한다. 이 장은 발견 방법과 하네스 객체, 그리고 — 준수 등급 Full 에서 — 하네스를 생성하고 변경하는 방법을 정의한다.

## 1. 하네스 발견하기

```http
GET /v1/harnesses
```

```json
{
  "harnesses": [
    {
      "id": "chrn_08dae611630d467ab3e67ed792570ae5",
      "object": "harness",
      "name": "Research agent",
      "base": "claude-code",
      "baseLabel": "Claude Code",
      "defaultModel": "claude-sonnet-4.6",
      "systemPrompt": "",
      "mcpServers": [],
      "skills": [],
      "disabledTools": [],
      "maxStep": null,
      "timeoutSeconds": null,
      "createdAt": 1786403298205
    }
  ]
}
```

서버는 호출자의 범위 안에 있는 하네스만 반환해야 한다(MUST). 목록은 비어 있을 수 있다(MAY) — 구성된 하네스가 하나도 없는 서버도 유효하며, 클라이언트는 인덱스 `0` 이 존재한다고 가정하지 말고 이 경우를 처리해야 한다(MUST).

```http
GET /v1/harnesses/{harness_id}
```

하네스 객체 하나를 반환하거나, `404` 와 `code: "harness_not_found"` 를 반환한다.

## 2. 하네스 객체

| 필드 | 타입 | 필수 | 의미 |
|---|---|---|---|
| `id` | string | yes | `chrn_` 접두사 |
| `object` | string | yes | 항상 `harness` |
| `name` | string | yes | 사람이 읽는 레이블; 식별자가 아님 |
| `base` | string | yes | 어떤 하네스 런타임인지: `codex`, `claude-code`, `hermes`, … |
| `baseLabel` | string | no | `base` 의 표시용 이름 |
| `defaultModel` | string | no | 작업이 `model` 을 생략했을 때 쓰이는 모델 |
| `systemPrompt` | string | no | 추가되는 상시 지시문 |
| `mcpServers` | array | no | 이 하네스에 연결된 MCP 서버들 |
| `skills` | array | no | 이 하네스에서 쓸 수 있는 스킬들 |
| `disabledTools` | string[] | no | 에이전트에게서 보류된 도구들 |
| `maxStep` | integer \| null | no | 기본 스텝 예산 |
| `timeoutSeconds` | integer \| null | no | 기본 벽시계 예산 |
| `createdAt` | integer | yes | 유닉스 밀리초 |

`base` 값은 이 명세에서 열거되지 않는다. 서버는 이 문서가 전혀 알지 못하는 base 를 지원할 수 있으며(MAY), 클라이언트는 `base` 를 불투명한 문자열로 취급해야 한다(MUST) — 그렇지 않으면 새 하네스가 출시될 때마다 프로토콜을 개정해야 하는데, 이는 정확히 UHP 가 없애려는 결합이다.

## 3. 모델

```http
GET /v1/models
```

```json
{
  "backends": {
    "claude": {
      "default": "claude-sonnet-4.6",
      "models": [
        { "id": "claude-sonnet-4.6", "label": "claude-sonnet-4.6", "backend": "claude",
          "available": true, "default": true }
      ]
    }
  }
}
```

```http
GET /v1/harnesses/{harness_id}/models
```

```json
{
  "harness_id": "chrn_…",
  "backend": "claude",
  "default": "claude-sonnet-4.6",
  "fallback": "claude-sonnet-4.6",
  "models": [ { "id": "claude-opus-5", "available": true, "default": false } ]
}
```

### 3.1 `available` 은 약속이다

`available: true` 는 서버가 그 하네스에 대해 그 모델을 지금 바로 서빙할 수 있다는 뜻이다 — 자격 증명이 존재하고 제공자에게 도달할 수 있다는 뜻이다. `available: false` 는 그 모델을 요청해도 요청한 대로 실행되지 않는다는 뜻이다.

서버는 `available` 을 주장이 아니라 계산으로 산출해야 한다(MUST). 모델을 사용 가능하다고 나열해 놓고 작업을 실패시키는 것은 클라이언트에게 최악의 결과다. 선택지가 사용자에게 제시되고, 사용자가 그것을 고르고, 그 작업에 이미 커밋한 뒤에야 실패하기 때문이다.

클라이언트는 사용 불가능한 모델을 숨기기보다 비활성으로 표시해야 한다(SHOULD). 그래야 사용자가 그 모델이 존재하지만 구성되어 있지 않다는 것을 볼 수 있고, 왜 사라졌는지 궁금해하지 않게 된다.

## 4. 도구와 스킬

구성된 하네스는 그 에이전트가 무엇을 할 수 있는지를 결정하는 세 가지를 가진다. 셋 모두 하네스 객체의 일부이며 하네스 자체와 같은 방식으로 설정된다.

### 4.1 MCP 서버

```json
{ "mcpServers": [
    { "name": "vault", "url": "https://mcp.example.com/mcp", "transport": "http", "enabled": true }
] }
```

| 필드 | 필수 | 의미 |
|---|---|---|
| `name` | yes | 에이전트에게 서버를 식별시킴; CLI 에 안전한 식별자로 정제됨 |
| `url` | yes | 엔드포인트 |
| `transport` | no | `http`(Streamable HTTP, 기본값) 또는 `sse` |
| `enabled` | no | 없거나 `true` 면 활성화된 것 |
| `headers` | no | 추가 요청 헤더 |
| `auth` | no | Bearer 토큰, 또는 서버가 해석하는 서버 측 참조 |

서버는 한 턴에 대해 enabled 항목만 연결해야 한다(MUST). 비활성화된 항목은 아예 접촉되지 말아야 한다(MUST NOT) — 연결했다가 숨기는 방식은, 그 엔드포인트를 운영하는 쪽에게 여전히 그 턴의 존재를 누설하는 것과 같기 때문이다.

도달할 수 없는 MCP 서버는 작업을 실패시키지 말아야 한다(MUST NOT). 서드파티 엔드포인트가 다운된 것이 사용자의 작업을 잃어버릴 이유가 되지 않으므로, 그 턴은 해당 도구들 없이 진행되어야 한다(MUST). 서버는 이 저하 상태를 조용히 감추지 말고 실행 기록에서 보이게 해야 한다(SHOULD).

> 서버는 제공할 수 없는 MCP 지원을 광고하지 말아야 한다(MUST NOT). 그 뒤에 있는 하네스 런타임이 구성된 전송 방식을 구사할 수 없다면 그것은 설치가 잘못된 것이며, 이를 워크스페이스 내부의 로그 파일에만 보고하는 것은 사용자 입장에서 모델이 도구 사용을 거부한 것과 구분되지 않는다.

### 4.2 스킬

스킬은 파일이 아니라 폴더다.

```json
{ "skills": [
    { "name": "vault-manual", "enabled": true, "files": [
        { "path": "SKILL.md",            "content": "---\nname: vault-manual\n---\n…" },
        { "path": "references/codes.md", "content": "…" },
        { "path": "scripts/helper.sh",   "content": "#!/bin/sh\n…" },
        { "path": "assets/logo.png",     "content_b64": "iVBORw0KGgo…" }
    ]}
] }
```

- `files[].path` 는 그 스킬 자신의 폴더를 기준으로 상대적이며 중첩된 디렉터리를 지원해야 한다(MUST). 서버는 그 폴더를 벗어나는 경로를 거부해야 한다(MUST).
- 텍스트는 `content` 에, 바이너리는 `content_b64` 에 담긴다. 서버는 둘 다 바이트 단위로 보존해야 한다(MUST).
- 번들은 `SKILL.md` 를 반드시 포함해야 하며, 서버는 그것이 없는 번들을 실행 시점이 아니라 구성 시점에 거부해야 한다(MUST).
- 서버는 에이전트가 읽을 수 있는 위치에 폴더 전체를 구체화해야 한다(MUST). `SKILL.md` 만 구체화하면 참조 자료, 스크립트, 데이터를 담은 모든 스킬이 깨지는데, 이는 사소하지 않은 스킬 대부분에 해당한다.
- `enabled: false` 는 base 에서 물려받은 것을 포함해 스킬을 억제한다.

서버는 큰 번들을 별도로 저장할 수 있으며(MAY), 다음 엔드포인트에서 완전한 파일 목록을 반환해야 한다(MUST).

```http
GET /v1/harnesses/{harness_id}/skills/{skill_id}/files
```

하네스를 `GET` 하고 다시 `PUT` 하는 왕복 과정에서 스킬 내용을 잃어버리지 말아야 한다(MUST NOT). 이것은 설계로 막아야 할 실패 사례다. 하네스 이름을 바꾸는 것 같은 무관한 편집이 스킬 폴더를 조용히 비워버려서, 몇 주 뒤 에이전트가 이상하게 행동할 때까지 사용자가 그것이 사라진 것을 알 수 없는 경우다.

### 4.3 비활성화된 도구

```json
{ "disabledTools": ["WebSearch"] }
```

이름은 하네스 base 자신의 도구 카탈로그에서 나온다. 강제 방식은 런타임마다 다르며 서버는 이를 과장하지 말아야 한다(MUST NOT).

- 런타임이 도구 단위 제한을 지원하는 경우, 서버는 이를 확실한 차단으로 강제해야 한다(MUST).
- 지원하지 않는 경우에도, 서버는 그 제한을 상시 지시문의 형태로 에이전트에게 전달해야 하며(MUST), 조용히 누락시키지 말아야 한다(MUST NOT). 누락시키는 것이 최악의 결과다. 운영자는 도구가 꺼져 있다고 믿는데 실제로는 그렇지 않기 때문이다.

확실한 차단이 필요한 클라이언트는 `disabledTools` 가 항상 확실한 것이라고 가정하기보다, 하네스 base 가 그것을 지원하는지 먼저 확인해야 한다(SHOULD).

## 5. 하네스 관리

준수 등급 Full 에서만. 클라이언트는 먼저 `harness_management` 기능(capability)을 확인해야 한다(MUST).

### 5.1 생성

```http
POST /v1/harnesses
```

```json
{ "name": "Research agent", "base": "claude-code", "default_model": "claude-sonnet-4.6" }
```

생성된 하네스 객체를 반환한다. `base` 는 필수이며(REQUIRED) 서버가 지원하는 값이어야 한다(MUST). 그렇지 않으면 `422` 와 `code: "unsupported_base"` 를 반환한다.

### 5.2 갱신

```http
PUT /v1/harnesses/{harness_id}
```

변경 가능한 구성을 교체한다. 서버는 `id`, `base`, `createdAt` 을 변경하지 말아야 한다(MUST NOT). 기존 하네스의 base 를 바꾸면 이미 그 하네스에 연결된 모든 세션의 동작이 조용히 바뀌게 된다. 다른 base 를 원하는 클라이언트는 다른 하네스를 새로 만들어야 한다(MUST).

### 5.3 삭제

```http
DELETE /v1/harnesses/{harness_id}
```

서버는 그 하네스를 사용했던 세션이나 응답을 삭제하지 말아야 한다(MUST NOT). 구성이 바뀌면 사라져 버리는 이력은 감사할 수 없다.

## 6. 하네스 선택하기

규범적이지는 않지만(non-normative), 모든 클라이언트가 마주치는 질문이다.

| 작업이 다음과 같다면… | 고려할 것 |
|---|---|
| 저장소 안에서 코드 편집 | 코딩에 특화된 base (`codex`, `claude-code`) |
| 장기간에 걸친 다중 도구 작업 | 명시적 스텝 예산과 강력한 도구 사용 능력을 가진 base |
| 저렴하고 대량인 분류 작업 | 어떤 base 든 그중 가장 작은 모델 |

UHP 의 요점은 이 선택이 되돌릴 수 있는 상태로 남는다는 것이다. UHP 를 구사하는 제품은 구성 편집만으로 base 나 모델을 바꿀 수 있고, 두 번째 통합 없이도 같은 입력에 대해 두 하네스를 A/B 테스트할 수 있다.

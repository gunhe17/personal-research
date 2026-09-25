# 생명주기

**Unified Harness Protocol, version `2026-08-11`**

이 장은 클라이언트와 서버가 프로토콜 버전에 합의하는 방법, 클라이언트가 서버가 무엇을 할 수 있는지 알아내는 방법, 그리고 제출부터 결과까지 작업이 거치는 상태들을 정의한다.

## 1. 버전 협상

UHP 버전은 날짜다: `YYYY-MM-DD`, 그 버전이 발표된 날. 날짜는 정렬이 되고, 시맨틱 버저닝이 암시하지만 지키지 못할 호환성 약속을 암시하지 않으며, 구현체의 오래됨을 명백히 드러낸다. 호환성 규칙은 [VERSIONING.md](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/../../VERSIONING.md) 를 참고하라.

클라이언트는 자신이 작성될 때 기준으로 삼은 버전을 선언할 수 있다(MAY).

```http
UHP-Version: 2026-08-11
```

- 헤더가 없으면 서버는 자신의 기본 버전을 가정해야 하며(MUST) 응답 헤더에 그 버전을 명시해야 한다(MUST). 헤더를 생략한 클라이언트는 서버의 선택을 요청하는 것이고, 그것을 받게 된다.
- 헤더가 서버가 지원하는 버전을 명시하면, 서버는 그 요청에 대해 그것을 존중해야 한다(MUST).
- 헤더가 서버가 지원하지 않는 버전을 명시하면, 서버는 `400` 과 `code: "unsupported_protocol_version"` 으로 요청을 실패시켜야 하며(MUST), 오류 `detail` 은 서버가 지원하는 버전들을 나열해야 한다(MUST). 서버는 조용히 다른 버전을 제공해서는 안 된다(MUST NOT) — 자신이 파싱할 수 있는 버전을 요청한 클라이언트가 파싱할 수 없는 버전을 받아서는 안 되기 때문이다.

오류를 포함한 모든 응답은 실제로 사용된 버전을 실어야 한다(MUST).

```http
UHP-Version: 2026-08-11
```

## 2. 기능 발견

```http
GET /v1/uhp
```

인증이 있든 없든 — 서버는 베어러 토큰 없이도 이 엔드포인트를 서빙해야 한다(MUST). 클라이언트는 자격 증명을 제시하기 전에 자신이 UHP 서버와 이야기하고 있는지를 알아야 하기 때문이다. 이 문서는 주체(principal)에 특정한 어떤 내용도 담지 말아야 한다(MUST NOT).

```json
{
  "object": "uhp.discovery",
  "protocol": "uhp",
  "versions": ["2026-08-11"],
  "default_version": "2026-08-11",
  "conformance_class": "full",
  "capabilities": {
    "streaming": true,
    "sessions": true,
    "cancellation": true,
    "files_input": true,
    "files_output": true,
    "session_listing": true,
    "harness_management": true,
    "session_sharing": true,
    "idempotency": true
  },
  "implementation": { "name": "HarnessRouter Community Edition", "version": "0.3.0" }
}
```

| 필드 | 타입 | 필수 | 의미 |
|---|---|---|---|
| `object` | string | yes | 항상 `uhp.discovery` |
| `protocol` | string | yes | 항상 `uhp` — 클라이언트가 UHP 를 흉내만 낸 것과 구분할 수 있게 함 |
| `versions` | string[] | yes | 이 서버가 서빙할 수 있는 모든 버전; 비어 있으면 안 됨(MUST) |
| `default_version` | string | yes | 클라이언트가 `UHP-Version` 을 보내지 않았을 때 쓰임; `versions` 안에 있어야 함(MUST) |
| `conformance_class` | string | yes | `core`, `extended` 또는 `full` |
| `capabilities` | object | yes | 이름 붙은 불리언들; 아래 참고 |
| `implementation` | object | no | 자유 형식의 식별 정보, 디버깅과 버그 리포트용 |

서버는 구현하지 않은 기능을 생략하지 말고 `false` 로 보고해야 한다(MUST). 그래야 클라이언트가 "지원되지 않음"과 "서버가 이 필드보다 오래됨"을 구별할 수 있다. 클라이언트는 없는 기능 키를 `false` 로 취급해야 한다(MUST).

`conformance_class` 는 `capabilities` 와 일관되어야 한다(MUST). `extended` 를 주장하는 서버는 `files_input`, `files_output`, `session_listing` 을 `true` 로 보고해야 한다(MUST). 준수 테스트 스위트가 이를 검사하는데, 등급 주장이 기능 목록과 모순되면 클라이언트에게 서로 다른 두 가지를 말해주는 셈이 되기 때문이다.

## 3. 작업 생명주기

작업은 다음 상태들을 거친다. 응답 객체의 `status` 가 현재 상태를 담는다.

```
                    ┌──────────────┐
   POST /responses  │              │
   ────────────────▶│ in_progress  │
                    │              │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┬───────────────────┐
        ▼                  ▼                  ▼                   ▼
   ┌──────────┐      ┌──────────┐      ┌────────────┐      ┌───────────┐
   │completed │      │  failed  │      │ incomplete │      │ cancelled │
   └──────────┘      └──────────┘      └────────────┘      └───────────┘
```

| 상태 | 의미 | 종결 상태 여부 |
|---|---|---|
| `in_progress` | 수락되어 실행 중 | no |
| `completed` | 하네스가 작업을 끝내고 결과를 산출함 | yes |
| `failed` | 작업을 완료할 수 없었음; `error` 가 이유를 설명함 | yes |
| `incomplete` | 하네스가 예산(스텝 한도 또는 시간 한도)에 걸려 멈췄고 부분 출력이 있음 | yes |
| `cancelled` | 클라이언트가 취소함; 부분 출력이 있을 수 있음(MAY) | yes |

규칙:

- 서버는 종결 상태에서 벗어나는 전이를 하지 말아야 한다(MUST NOT). 클라이언트가 한 번 `completed` 를 본 뒤에는 그 응답을 다시 읽어도 `completed` 를 반환해야 한다(MUST).
- `incomplete` 은 예산 때문에 작업이 멈췄을 때 써야 하며(MUST), 오류에는 쓰지 말아야 한다(MUST NOT). 이 구분은 클라이언트에게 중요하다. `incomplete` 은 대개 이어갈 가치가 있고, `failed` 는 대개 그렇지 않다.
- `cancelled` 작업은 `failed` 가 아니라 `cancelled` 로 보고해야 한다(MUST). 중단을 요청한 클라이언트는 오류를 겪은 것이 아니다.
- 종결 응답은 종결 상태가 되기 전에 산출된 출력을 그대로 보존해야 한다(MUST). 작업이 나중에 실패했다고 해서 부분 작업물을 버리는 것은 무엇이 잘못됐는지에 대한 유일한 증거를 파괴하는 일이다.

## 4. 세션 생명주기

```
first task ──▶ session created implicitly ──▶ session active ──▶ deleted (client) or expired (server policy)
                                                    ▲    │
                                                    └────┘
                                          each continued task extends it
```

- 세션은 체인의 첫 작업이 실행될 때 서버가 생성한다. 그 id 는 응답의 `metadata.session_id` 에 보고되어야 한다(MUST).
- 세션은 체인 안의 작업들에 걸쳐 대화 맥락, 작업 디렉터리와 그 안의 파일들, 구성된 하네스를 보존해야 한다(MUST).
- 세션은 다른 구성된 하네스를 지정하는 작업으로 확장되지 말아야 한다(MUST NOT). 서버는 그런 요청을 조용히 새 세션을 시작하는 대신 `409` 와 `code: "harness_mismatch"` 로 실패시켜야 한다(MUST) — 다른 에이전트로 대화를 이어가는 것은 다른 대화이며, 그것을 조용히 하는 것은 클라이언트가 가지고 있다고 믿었던 작업을 잃게 만든다.
- 세션 만료는 서버 정책이다. 세션을 만료시키는 서버는 이어가기 요청에 대해 `session_not_found` 와 구별되는 `404` 와 `code: "session_expired"` 를 보고해야 한다(MUST).

## 5. 동시성

- 서버는 서로 다른 세션에서 오는 동시 작업을 받아들여야 한다(MUST).
- 서버는 같은 세션에서 두 작업을 동시에 실행하지 말아야 한다(MUST NOT). 세션은 하나의 작업 디렉터리와 하나의 대화를 가지며, 두 에이전트가 둘 다에 쓰는 것은 정의된 상태가 아니다. 사용 중인 세션에 대한 두 번째 작업은 `409` 와 `code: "session_busy"` 로 실패해야 한다(MUST).
- `session_busy` 를 받은 클라이언트는 진행 중인 작업이 종결 상태에 도달할 때까지 기다렸다가 재시도해야 한다(SHOULD). 서버는 추정할 수 있을 때 오류 `detail` 에 `retry_after_ms` 를 포함해야 하며(SHOULD), 추정할 수 없을 때는 짐작하지 말고 생략해야 한다(MUST).

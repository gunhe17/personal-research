# 오류

**Unified Harness Protocol, 버전 `2026-08-11`**

클라이언트의 오류 처리는 서버의 오류 보고만큼만 좋을 수 있다. 이 장은 하나의 봉투, 닫힌 코드
집합, 그리고 어떤 실패가 재시도할 가치가 있는지를 정의한다.

## 1. 오류 봉투

2xx 가 아닌 모든 응답은 다음 본문을 가져야 한다(MUST):

```json
{
  "error": {
    "type": "invalid_request_error",
    "code": "harness_not_found",
    "message": "No harness with id 'chrn_deadbeef'.",
    "param": "metadata.harness_id",
    "detail": null
  }
}
```

| 필드 | 타입 | 필수 | 의미 |
|---|---|---|---|
| `type` | string | 예 | 넓은 범주; §2 참고 |
| `code` | string | 예 | 구체적이고 기계가 읽을 수 있는 이유; §3 참고 |
| `message` | string | 예 | 사람이 읽을 수 있는, 한 문장, 스택 트레이스 없음 |
| `param` | string \| null | 예 | 문제가 된 필드로 가는 점 표기 경로, 있는 경우 |
| `detail` | object \| null | 예 | 구조화된 추가 맥락, 또는 `null` |

규칙:

- `message` 는 사용자에게 보여줘도 안전해야 한다(MUST). 자격 증명, 내부 호스트 이름, 파일 경로,
  스택 트레이스를 포함해서는 안 된다(MUST NOT).
- `code` 는 적용 가능한 경우 §3 에서 와야 한다(MUST). 서버는 이 명세가 다루지 않는 조건에 대해
  추가 코드를 정의해도 되며(MAY), 이 명세의 미래 버전과 충돌하지 않도록 벤더 접두사(`acme_…`)로
  네임스페이스를 두어야 한다(MUST).
- 서버는 오류를 담은 채 `200` 을 반환해서는 안 된다(MUST NOT). *태스크*의 실패는 `status:
  "failed"` 를 가진 response 와 HTTP `200` 으로 보고된다. 요청 자체는 성공했기 때문이다.
  *요청*의 실패는 이 봉투를 가진 2xx 가 아닌 응답이다. 이 둘은 서로 다른 사건이며 뒤섞여서는
  안 된다(MUST NOT).

> 호환성 참고. 서버는 이 봉투 이전의 구현을 대상으로 작성된 클라이언트를 위해, `error` 와
> 나란히 최상위 `detail` 문자열을 추가로 포함해도 된다(MAY). 이 필드는 폐기 예정이며,
> `error.message` 에 없는 정보를 담지 않고, 미래 버전에서 제거될 것이다.

## 2. 오류 타입

| `type` | HTTP | 의미 |
|---|---|---|
| `invalid_request_error` | 400, 404, 409, 413, 422 | 요청이 잘못됐다. 변경 없이 재시도하면 다시 실패한다. |
| `authentication_error` | 401 | 자격 증명이 없거나, 형식이 잘못됐거나, 알 수 없다. |
| `permission_error` | 403 | 인증됐지만 이 작업이 허용되지 않는다. |
| `rate_limit_error` | 429 | 요청이 너무 많거나, 쿼터가 소진됐다. |
| `harness_error` | 200 (failed 된 response 안에서) | 하네스가 실행됐고 실패했다. |
| `server_error` | 500, 502, 503, 504 | 서버가 실패했다. 재시도하면 성공할 수도 있다(MAY). |

## 3. 오류 코드

### 3.1 요청과 라우팅

| 코드 | HTTP | 의미 |
|---|---|---|
| `unsupported_protocol_version` | 400 | `UHP-Version` 이 이 서버가 서빙할 수 없는 버전을 이름 짓는다. `detail.supported` 가 서빙 가능한 것을 나열한다. |
| `invalid_input` | 400 | 본문을 파싱할 수 없거나, 필드의 타입이 잘못됐다. |
| `harness_not_found` | 404 | 호출자의 범위 안에 그런 하네스가 없다. |
| `response_not_found` | 404 | 호출자의 범위 안에 그런 response 가 없다. |
| `session_not_found` | 404 | 호출자의 범위 안에 그런 session 이 없다. |
| `file_not_found` | 404 | 호출자의 범위 안에 그런 file 이 없다. |
| `session_expired` | 404 | session 이 존재했지만 보존 기간이 지났다. |
| `harness_mismatch` | 409 | 태스크가 자신이 이어가는 session 과 다른 하네스를 지정했다. |
| `session_busy` | 409 | 이 session 에서 이미 태스크가 실행 중이다. |
| `file_too_large` | 413 | 업로드가 서버의 한도를 넘는다. `detail.max_bytes` 가 그것을 명시한다. |
| `model_unavailable` | 422 | 요청된 모델을 이 하네스에서 서빙할 수 없다. |
| `unsupported_base` | 422 | 요청된 하네스 base 가 이 서버에서 지원되지 않는다. |

### 3.2 인증과 한도

| 코드 | HTTP | 의미 |
|---|---|---|
| `missing_credential` | 401 | 베어러 토큰이 없다. |
| `invalid_credential` | 401 | 토큰의 형식이 잘못됐거나, 알 수 없거나, 폐기됐다. |
| `insufficient_scope` | 403 | 자격 증명이 이 작업을 수행할 수 없다. |
| `rate_limited` | 429 | 속도를 늦춰라. `Retry-After` 가 설정돼야 한다(SHOULD). |
| `quota_exhausted` | 429 | 예산이 소진됐다. 지금 재시도해도 도움이 안 된다. |

### 3.3 실행

| 코드 | 위치 | 의미 |
|---|---|---|
| `harness_error` | failed 된 response | 하네스가 실행됐지만 작업을 완료할 수 없었다. |
| `harness_unavailable` | 503 | 지금 이 하네스를 실행할 용량이 없다. |
| `provider_error` | failed 된 response | 상류 모델 제공자가 거부했거나 실패했다. |
| `timeout` | failed 된 response | 태스크가 자신의 실시간 예산을 초과했다. |
| `cancelled` | cancelled 된 response | 클라이언트가 취소했다. |
| `preview_unavailable` | 501 | 이 서버는 미리보기를 렌더링하지 않는다. |
| `preview_failed` | 502 | 이 파일의 변환이 실패했다. |

## 4. 재시도

| 상황 | 재시도? |
|---|---|
| `server_error` (500, 502, 503, 504) | 예, 지수 백오프와 지터와 함께 |
| `rate_limited` | 예, `Retry-After` 이후에 |
| `quota_exhausted` | 아니오 — 쿼터가 바뀌기 전까지는 아무것도 달라지지 않는다 |
| `session_busy` | 예, 진행 중인 태스크가 종료 상태가 되면 |
| 어떤 `invalid_request_error` 든 | 아니오 — 요청을 고쳐라 |
| `authentication_error` | 아니오 — 자격 증명을 고쳐라 |
| `failed` 에 도달한 태스크 | 오직 클라이언트 자신의 판단으로만; 실제 자원을 소모했다 |

`POST /v1/responses` 의 재시도는 `Idempotency-Key` 를 반드시 담아야 한다(MUST). 이것이
없으면 타임아웃 뒤의 재시도가 태스크를 두 번째로 실행하게 된다 — 그리고 첫 번째가 아직 실행
중이며 같은 파일을 편집하고 있을 수도 있다. 이것은 UHP 클라이언트가 저지를 수 있는 단연 가장
파괴적인 실수다. [Tasks §6](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md) 를 참고한다.

## 5. 타임아웃

클라이언트는 넉넉한 타임아웃을 설정해야 한다(SHOULD). 에이전트 태스크는 예사로 몇 분씩 실행된다.
30 초짜리 HTTP 타임아웃은 정상적으로 진행 중인 작업을 취소해버릴 것이다.

- 스트리밍: 전체 타임아웃 없음. 대신 비활성 타임아웃을 사용한다 — 서버는 최소 30 초마다
  주석 라인(`: keep-alive`)을 내보내야 한다(SHOULD). 그래야 클라이언트가 작동 중인 에이전트와
  죽은 연결을 구분할 수 있다.
- 비스트리밍: 최소한 태스크의 `timeout_seconds` 에 여유를 더한 만큼.
- 포기하는 클라이언트는 태스크가 멈췄다고 가정해서는 안 된다(MUST NOT). 태스크는 멈추지 않았다.
  명시적으로 취소해야 한다.

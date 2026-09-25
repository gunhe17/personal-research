# 작업

**Unified Harness Protocol, version `2026-08-11`**

작업은 하나의 작업 단위다. 입력이 들어가고 결과가 나온다. 대부분의 클라이언트가 시간을 가장 많이 보내는 엔드포인트다.

## 1. 작업 실행

```http
POST /v1/responses
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "input": "Summarise README.md in three bullets.",
  "model": "claude-sonnet-4.6",
  "metadata": { "harness_id": "chrn_08dae611630d467ab3e67ed792570ae5" },
  "stream": true
}
```

### 1.1 요청 필드

| 필드 | 타입 | 필수 | 의미 |
|---|---|---|---|
| `input` | string \| item[] | 예 | 작업 내용. 순수 문자열은 사용자 메시지 하나의 축약형이다. §2 참고. |
| `model` | string | 아니오 | 표준 모델 id. 생략하면 하니스의 기본값을 뜻한다. |
| `metadata` | object | 아니오 | 클라이언트 메타데이터. `harness_id` 가 구성된 하니스를 선택한다. §1.2 참고. |
| `stream` | boolean | 아니오 | `true` 는 Server-Sent Events 를 스트리밍한다. 기본값 `false` 는 JSON 객체 하나를 반환한다. |
| `previous_response_id` | string | 아니오 | 그 응답을 만든 세션을 이어간다. [Sessions](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) 참고. |
| `instructions` | string | 아니오 | 이 작업에만 적용되는 추가 시스템 지침. |
| `store` | boolean | 아니오 | 서버가 이후 읽기를 위해 응답을 보존할지 여부. 기본값 `true`. |
| `max_output_tokens` | integer | 아니오 | 생성 토큰 수의 상한. |
| `max_step` | integer | 아니오 | 이 작업의 에이전트 스텝(도구 호출 라운드) 수 상한. |
| `timeout_seconds` | integer | 아니오 | 이 작업의 실시간 예산. |
| `tools` | array | 아니오 | 이 작업에 추가로 제공되는 도구들. |
| `include` | string[] | 아니오 | 결과에 포함할 선택적 추가 콘텐츠. |
| `background` | boolean | 아니오 | 작업이 수락되는 즉시 반환하고, events 엔드포인트로 뒤따라간다. |

서버는 이해하지 못하는 요청 필드를 거부하는 대신 무시해야 한다(MUST). 클라이언트는 알려지지 않은 필드가 어떤 효과를 낼 것이라고 의존해서는 안 된다(MUST NOT).

`max_step` 과 `timeout_seconds` 는 정밀도를 보장하는 값이 아니라 예산이다. 서버는 예산 시점 또는 그 이후에 작업을 중단해야 하며(MUST), `incomplete` 를 보고해야 하고(MUST), 잘라낸 작업에 대해 `completed` 를 보고해서는 안 된다(MUST NOT).

### 1.2 하니스 선택

구성된 하니스는 `metadata.harness_id` 로 선택된다.

```json
{ "metadata": { "harness_id": "chrn_…" } }
```

- `harness_id` 가 없으면 서버는 기본 하니스를 사용해야 하며(MUST), 응답 `metadata` 에 어떤 것을 사용했는지 보고해야 한다(MUST).
- `harness_id` 가 알 수 없는 하니스를 가리키거나 호출자의 범위 밖의 것을 가리키면, 서버는 `404` 와 `code: "harness_not_found"` 로 실패해야 한다(MUST).
- `previous_response_id` 와 `harness_id` 가 둘 다 있으면서 서로 맞지 않으면, 서버는 `409` 와 `code: "harness_mismatch"` 로 실패해야 한다(MUST) ([Lifecycle §4](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/lifecycle.md) 참고).

> 왜 하니스가 최상위 필드가 아니라 `metadata` 안에 있는가?
> 작업 표면이 의도적으로 Responses 호환이기 때문이다([README](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/../../README.md) 참고). `metadata` 는 그 표면이 이미 정의해 둔, 호출자가 제공하는 맥락을 위한 확장 지점이다. 최상위 `harness` 필드는 같은 개념에 대한 두 번째의, 충돌하는 관례가 될 것이고, 기존의 모든 Responses SDK가 그것을 보내도록 패치되어야 할 것이다.

### 1.3 모델 선택과 대체

`model` 은 표준 모델 id를 가리키지, 제공자 고유의 id를 가리키지 않는다. 표준 id는 제공자 사이에서 안정적이므로, 서버가 모델에 직접 접근하든 애그리게이터를 통해 접근하든 같은 요청이 동작한다.

요청된 모델이 선택된 하니스에서 서빙될 수 없으면, 서버는 조용히 실패해서는 안 되며(MUST NOT) 요청받은 대로 실행한 척해서도 안 된다(MUST NOT). 다음 중 정확히 하나를 해야 한다(MUST).

1. 실패: `422` 와 `code: "model_unavailable"` 로. 또는
2. 대체: 하니스에 인가된 기본값으로 대체하고, 그 대체 사실을 응답에 기록한다.

```json
{
  "model": "gpt-5.4",
  "metadata": {
    "requested_model": "gpt-5.6-sol",
    "model_fallback": true,
    "model_fallback_reason": "model 'gpt-5.6-sol' is not available for this harness's backend"
  }
}
```

따라서 클라이언트는 `model` 을 `metadata.requested_model` 과 비교하는 것만으로 "내가 요청한 모델이 실제로 실행됐는가?" 라는 질문에 언제나 답할 수 있다.

> 이 규칙이 존재하는 이유는 그것이 없을 때 비용이 크기 때문이다. 조용히 대체하는 서버는 하류의 모든 측정, 즉 벤치마크, 비용 귀속, 품질 비교를 전부 틀리게 만들며, 클라이언트는 그것을 감지할 방법이 없다. 대체 사실을 보고하는 데는 필드 두 개면 충분하다.

## 2. 입력

`input` 은 문자열이거나 항목들의 배열이다.

```json
{ "input": "Summarise README.md" }
```

```json
{
  "input": [
    { "role": "user", "content": [
        { "type": "input_text", "text": "Summarise this report." },
        { "type": "input_file", "filename": "q3.pdf", "file_data": "data:application/pdf;base64,…" }
    ]}
  ]
}
```

| 항목 유형 | 목적 |
|---|---|
| `input_text` | 텍스트 |
| `input_file` | 파일. `file_data` 안에 데이터 URL 로 인라인 되거나, 이전 업로드의 `file_id` 로 참조 |
| `input_image` | 이미지. 인라인 또는 `file_id` 로 참조 |

적합성 등급 Core 의 서버는 `input_text` 를 받아들여야 한다(MUST). Extended 등급의 서버는 `input_file` 과 `input_image` 도 받아들여야 한다(MUST). [Files](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) 참고.

## 3. 응답 객체

```json
{
  "id": "resp_a1b2c3",
  "object": "response",
  "created_at": 1786400000,
  "status": "completed",
  "error": null,
  "incomplete_details": null,
  "previous_response_id": null,
  "model": "claude-sonnet-4.6",
  "output": [
    { "id": "rs_1", "type": "reasoning", "summary": [ { "type": "summary_text", "text": "…" } ], "status": "completed" },
    { "id": "fc_1", "type": "function_call", "call_id": "call_1", "name": "read_file",
      "arguments": "{\"path\":\"README.md\"}", "status": "completed" },
    { "id": "fco_1", "type": "function_call_output", "call_id": "call_1", "output": "…", "status": "completed" },
    { "id": "msg_1", "type": "message", "role": "assistant", "status": "completed",
      "content": [ { "type": "output_text", "text": "- …\n- …\n- …", "annotations": [] } ] }
  ],
  "store": true,
  "usage": { "input_tokens": 5120, "output_tokens": 240, "total_tokens": 5360 },
  "metadata": { "session_id": "hsess7e78…" }
}
```

| 필드 | 타입 | 필수 | 비고 |
|---|---|---|---|
| `id` | string | 예 | `resp_` 접두사 |
| `object` | string | 예 | 항상 `response` |
| `created_at` | integer | 예 | Unix 초 |
| `status` | string | 예 | [Lifecycle §3](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/lifecycle.md) 참고 |
| `error` | object \| null | 예 | `status` 가 `failed` 일 때만 존재하며 null이 아니다 |
| `output` | item[] | 예 | 순서가 있음. 아무것도 만들지 않은 작업이면 비어 있을 수 있다(MAY) |
| `model` | string | 예 | 실제로 실행된 모델 |
| `usage` | object \| null | 예 | 서버가 사용량을 집계할 수 없으면 `null` — 조작된 0이어서는 절대 안 된다 |
| `metadata` | object | 예 | `session_id` 를 포함해야 한다(MUST). 대체 필드는 §1.3 참고 |
| `previous_response_id` | string \| null | 예 | 이 응답이 이어가는 응답, 있는 경우 |
| `store` | boolean | 예 | 이 응답이 보존되었는지 여부 |

### 3.1 출력 항목

| `type` | 의미 |
|---|---|
| `message` | 어시스턴트 텍스트. `content[].text` 안에 있으며, 산출물에 대한 `annotations` 를 포함 |
| `reasoning` | 에이전트의 요약된 사고. `summary[].text` 안에 있음 |
| `function_call` | 에이전트가 호출한 도구. `arguments` 는 JSON 문자열 |
| `function_call_output` | 그 도구 호출의 결과. `call_id` 로 매칭됨 |

클라이언트는 인식하지 못하는 출력 항목 유형을 허용해야 하며(MUST), 주어진 배열 순서 이상의 어떤 순서도 가정해서는 안 된다(MUST NOT). `message` 항목만 렌더링하고 나머지는 무시하는 클라이언트도 유효한 클라이언트다.

## 4. 작업 다시 읽기

```http
GET /v1/responses/{response_id}
```

같은 응답 객체를 반환한다. 응답을 보존한(`store: true`) 서버는 완료 후 그것을 반환해야 한다(MUST). `store: false` 로 생성된 응답에 대해서는 `404` 와 `code: "response_not_found"` 를 반환할 수 있다(MAY).

```http
GET /v1/responses/{response_id}/input_items
```

작업이 생성될 때의 입력을 반환한다. 스스로 저장하지 않은 트랜스크립트를 재구성해야 하는 클라이언트를 위한 것이다.

## 5. 취소

```http
POST /v1/responses/{response_id}/cancel
```

[Sessions §4](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) 참고.

## 6. 멱등성

클라이언트는 멱등성 키를 보낼 수 있다(MAY).

```http
Idempotency-Key: <client-generated-unique-string>
```

`idempotency` 를 지원한다고 알리는 서버는, 반복된 키에 대해 다음을 해야 한다(MUST).

- 첫 번째 요청의 결과를 반환한다.
- 두 번째 실행을 시작하지 않는다.

첫 번째 요청이 아직 실행 중이면, 서버는 그것을 기다렸다가 그 결과를 반환해야 하며(MUST), 부분 결과나 충돌을 반환해서는 안 된다. 에이전트 작업은 비용이 크고 부작용이 있다. 작업을 두 번 실행하는 재시도는 느린 답보다 나쁘다.

멱등성 키는 최소 24시간 보존되어야 한다(SHOULD).

## 7. 삭제

```http
DELETE /v1/responses/{response_id}
```

저장된 응답을 삭제한다. 서버는 이것이 실행 중인 작업을 취소하게 해서는 안 된다(MUST NOT). 취소와 삭제는 서로 다른 의도이며, 둘을 뒤섞으면 클라이언트는 작업을 멈추지 않고서는 이력을 정리할 수 없게 된다.

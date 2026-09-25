# 스트리밍

**Unified Harness Protocol, version `2026-08-11`**

에이전트 작업은 몇 분씩 걸린다. 스트림이 없으면 제품은 스피너를 보여주며 기다리는 것 말고는 할 수 있는 게 없다. 이 장은 작업이 진행되는 동안 서버가 진행 상황을 어떻게 보고하는지를 정의한다.

## 1. 스트림 열기

`POST /v1/responses` 에 `"stream": true` 를 설정한다. 서버는 다음으로 응답해야 한다(MUST).

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
```

각 이벤트는 `data` 가 하나의 JSON 객체인 Server-Sent Events 메시지다.

```
data: {"type":"response.created","sequence_number":0,"response":{…}}

data: {"type":"response.output_text.delta","sequence_number":7,"item_id":"msg_1","output_index":0,"content_index":0,"delta":"Sum"}

data: {"type":"response.completed","sequence_number":42,"response":{…}}

```

규칙:

- 모든 이벤트는 `type` 과 `sequence_number` 를 가져야 한다(MUST).
- `sequence_number` 는 `0` 에서 시작해 한 스트림 안에서 이벤트당 정확히 1씩 증가해야 한다(MUST). 따라서 클라이언트는 빠진 이벤트를 조용히 렌더링하는 대신 감지할 수 있다.
- 스트림은 정확히 하나의 종결 이벤트로 끝나야 한다(MUST)(§4).
- 서버는 스트림을 완료할 때까지 버퍼링했다가 보내서는 안 된다(MUST NOT). 끝에 한꺼번에 전달되는 스트림은 스트림이 아니며, 클라이언트는 그것과 멈춤을 구분할 수 없다.
- 프록시 뒤의 서버는 응답 버퍼링을 비활성화해야 한다(MUST). 이것이 UHP 서버 배포에서 가장 흔한 단일 오류이며, 하니스가 느린 것처럼 정확히 보인다.

## 2. 이벤트 어휘

이벤트는 무슨 일이 일어났는지를 설명한다. 그것을 어떻게 표시할지는 결코 설명하지 않는다.

### 2.1 응답 생명 주기

| 이벤트 | 시점 |
|---|---|
| `response.created` | 작업이 수락됨. `status: in_progress` 인 초기 `response` 를 담는다. |
| `response.in_progress` | 작업이 시작됨. |
| `response.completed` | 종결 — 성공. 최종 `response` 를 담는다. |
| `response.incomplete` | 종결 — 예산이 작업을 중단시킴. 최종 `response` 를 담는다. |
| `response.failed` | 종결 — 실패. 최종 `response` 를 담으며, 그 `error` 는 null이 아니다. |

### 2.2 출력 항목

| 이벤트 | 시점 |
|---|---|
| `response.output_item.added` | 새 항목이 시작됨. `output_index` 와 껍데기뿐인 `item` 을 담는다. |
| `response.output_item.done` | 그 항목이 최종 확정됨. 완전한 `item` 을 담는다. |

### 2.3 어시스턴트 텍스트

| 이벤트 | 페이로드 |
|---|---|
| `response.content_part.added` | 빈 `output_text` 부분이 열림 |
| `response.output_text.delta` | `delta`: 텍스트의 다음 조각 |
| `response.output_text.done` | `text`: 그 부분의 완전한 텍스트 |
| `response.content_part.done` | `part`: 완성된 부분 |
| `response.output_text.annotation.added` | `annotation`: 산출물 인용 (참고: [Files](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md)) |

텍스트 델타는 줄이나 토큰이 아니라 조각이다. 클라이언트는 `sequence_number` 순서로 이들을 이어붙여야 하며(MUST), 특정한 청킹 방식을 가정해서는 안 된다(MUST NOT).

### 2.4 추론

| 이벤트 | 페이로드 |
|---|---|
| `response.reasoning_summary_part.added` | 빈 요약 부분이 열림 |
| `response.reasoning_summary_text.delta` | `delta`: 요약의 다음 조각 |
| `response.reasoning_summary_part.done` | `part`: 완성된 요약 부분 |

추론은 요약이지 사고 과정을 있는 그대로 옮긴 것이 아니다. 서버는 원본 모델 추론을 노출하도록 요구받지 않는다(MUST NOT). 클라이언트는 추론을 선택적인 것으로 취급해야 한다(MUST). 많은 하니스와 모델 조합이 추론을 전혀 생성하지 않으며, 그것을 요구하는 클라이언트는 그런 조합에서 깨진다.

### 2.5 도구 사용

| 이벤트 | 페이로드 |
|---|---|
| `response.function_call_arguments.delta` | `delta`: JSON 인자의 조각 |
| `response.function_call_arguments.done` | `arguments`: 완전한 JSON 문자열 |

도구 호출 자체는 `function_call` 타입의 `output_item` 으로 도착하며, 그 결과는 `call_id` 로 매칭되는 `function_call_output` 으로 도착한다.

### 2.6 오류

| 이벤트 | 페이로드 |
|---|---|
| `error` | `code`, `message`, `param` — 작업을 끝내지 않은 오류 |

`error` 이벤트 뒤에는 종결 이벤트가 따라야 한다(MUST). `error` 를 발생시키고 종결 이벤트 없이 멈추는 스트림은 형식이 잘못된 것이다. 클라이언트는 작업이 죽은 것인지 연결이 죽은 것인지 구분할 수 없다.

## 3. 순서 보장

서버는 다음을 보장해야 한다(MUST).

1. `response.created` 가 첫 번째 이벤트다.
2. 정확히 하나의 종결 이벤트가 마지막이다.
3. 어떤 항목에 대해서도 `output_item.added` 가 그것을 참조하는 모든 이벤트보다 앞서며, `output_item.done` 이 그 모두의 뒤에 온다.
4. `sequence_number` 는 빈틈없이 엄격하게 단조 증가한다.

서버는 다음을 보장해서는 안 되며(MUST NOT), 클라이언트는 다음을 가정해서는 안 된다(MUST NOT).

- 항목들이 추가된 순서대로 완료된다는 것 (긴 도구 호출이 나중의 텍스트보다 늦게 끝날 수 있다).
- 텍스트가 특정한 청크 크기로 도착한다는 것.
- 어떤 선택적 이벤트 유형이든 반드시 나타난다는 것.

## 4. 종결 이벤트

`response.completed`, `response.incomplete`, `response.failed` 중 정확히 하나다. 각각은 완전한 최종 `response` 객체를 담는다. 중간 이벤트를 놓친 클라이언트도 이 하나만으로 결과를 렌더링할 수 있다. 이 중복은 의도된 것이다. 스트림 도중 연결이 끊겨도 그것이 정확성이 아니라 지연을 대가로 치러야 한다.

취소된 작업은 응답 객체 안에 `status: "cancelled"` 를 담은 `response.failed` 로 종결된다. 권위를 갖는 것은 이벤트 이름이 아니라 status 필드다.

## 5. 재연결

연결이 끊겨도 작업이 중단되어서는 안 된다(MUST NOT). 작업은 서버 쪽에서 계속된다.

연결이 끊긴 뒤 작업을 다시 따라가려면 클라이언트는 그것을 다시 읽는다.

```http
GET /v1/responses/{response_id}
```

또는, 하니스의 세션들에 대한 실시간 이벤트 피드를 원한다면 다음을 쓴다.

```http
GET /v1/harnesses/{harness_id}/events
```

서버는 SSE `Last-Event-ID` 재개를 추가로 지원할 수 있다(MAY). 지원한다면, 주어진 `sequence_number` 다음 이벤트부터 재개해야 하며(MUST), 클라이언트가 이미 본 이벤트를 다시 보내서는 안 된다(MUST NOT).

> 클라이언트는 스트림을 최적화로, 저장된 응답을 진실의 원천으로 취급해야 한다(SHOULD). 반대로 만들어진 제품들, 즉 스트림이 결과가 존재하는 유일한 곳인 제품들은 로드 밸런서가 연결을 재활용할 때마다 작업을 잃는다.

## 6. 비스트리밍

`"stream": false` (기본값)에서는, 서버가 작업이 종결 상태에 도달했을 때 스트림이 조립했을 것과 같은 `output` 배열을 가진 단일 응답 객체를 반환한다. 두 경로는 동일한 입력에 대해 동일한 결과를 만들어야 한다(MUST). 스트리밍용과 비스트리밍용으로 서로 다른 `output` 을 조립하는 서버는 자기 프로토콜의 구현을 두 개 가진 것이며, 그중 하나는 틀린 것이다.

# 세션

**Unified Harness Protocol, version `2026-08-11`**

세션은 두 번째 작업을 첫 번째보다 저렴하게 만드는 요소다. 대화는 여전히 남아 있고, 작업 디렉터리도 그대로다. 이 장은 세션을 이어가는 것, 세션을 들여다보는 것, 세션에서 작업을 멈추는 것을 정의한다.

## 1. 세션 이어가기

`previous_response_id` 와 함께 다음 작업을 보낸다.

```json
{
  "input": "Now add tests for the function you just wrote.",
  "previous_response_id": "resp_a1b2c3"
}
```

서버는 다음을 해야 한다(MUST).

- 같은 세션에서, 같은 작업 디렉터리와 그 파일들로 새 작업을 실행한다.
- 이전 작업들의 대화 맥락을 하니스에 제공한다.
- 같은 구성된 하니스를 사용한다.
- 같은 `metadata.session_id` 를 보고한다.

`model` 은 한 세션 안의 작업들 사이에서 달라질 수 있다(MAY). 서버는 작업 단위의 모델 변경을 존중해야 한다(MUST). 후속 작업을 위해 더 저렴한 모델로 바꾸는 것은 흔하고 정당한 패턴이기 때문이다.

`previous_response_id` 가 알 수 없는 응답을 가리키면 서버는 `404` 와 `code: "response_not_found"` 로 실패해야 한다(MUST). 그것이 가리킨 세션이 만료되었으면 `404` 와 `code: "session_expired"` 로 실패해야 한다(MUST). 클라이언트는 첫 번째 경우 처음부터 재시도할 수 있지만, 두 번째 경우는 재시도해서는 안 된다.

> 왜 세션 id가 아니라 응답 id로 체인을 연결하는가?
> 응답 id는 클라이언트가 이미 가지고 있는 것이기 때문이다. 그것은 방금 실행한 작업에서 돌아온 것이다. 응답 id로 체인을 연결하는 것은 또한 대화 안의 정확한 지점을 지목하며, 이는 서버가 나중에 요청 형태를 바꾸지 않고도 이전 응답에서 분기할 여지를 남겨 둔다.

## 2. 세션 목록 조회

적합성 등급 Extended.

```http
GET /v1/sessions?limit=20&cursor=&harness=chrn_…
```

```json
{
  "sessions": [
    {
      "id": "hsess7e78…",
      "object": "session",
      "harness_id": "chrn_…",
      "title": "Summarise README.md",
      "status": "completed",
      "created_at": 1786400000,
      "updated_at": 1786400240
    }
  ],
  "next_cursor": null
}
```

페이지네이션은 커서 기반이다. 서버는 마지막 페이지에서 `next_cursor: null` 을 반환해야 하며(MUST), 클라이언트가 요청한 것보다 적은 항목을 받는 것으로 끝을 감지하도록 요구해서는 안 된다(MUST NOT). 그 휴리스틱은 페이지가 정확히 가득 찼을 때 틀리기 때문이다.

## 3. 세션 들여다보기

```http
GET /v1/sessions/{session_id}
GET /v1/sessions/{session_id}/turns
```

`/turns` 는 세션의 순서가 있는 작업 이력을 반환하므로, 클라이언트는 자신이 저장하지 않은 트랜스크립트도 재구성할 수 있다. 각 턴은 자신의 응답 id를 식별하므로, 클라이언트는 그중 어느 것에 대해서도 전체 응답을 가져올 수 있다.

## 4. 취소

의도적으로 구분된 두 범위다.

```http
POST /v1/responses/{response_id}/cancel     # stop this task
POST /v1/sessions/{session_id}/cancel       # stop whatever is running in this session
```

의미론:

- 취소는 즉시성의 보장이 아니라 요청이다. 서버는 가능한 한 빨리 작업을 중단해야 하며(MUST) 종결 상태에 도달해야 한다(MUST).
- 취소된 작업은 `failed` 가 아니라 반드시 `status: "cancelled"` 로 끝나야 한다(MUST).
- 취소 전에 생성된 출력은 보존되어야 한다(MUST).
- 이미 종결 상태인 작업을 취소하는 것은 성공해야 하며 아무것도 바꾸지 않아야 한다(MUST). 연결이 끊긴 뒤 취소를 재시도하는 클라이언트는 이미 성공한 것에 대해 오류를 받아서는 안 된다.
- 취소는 세션을 삭제해서는 안 된다(MUST NOT). 대화는 계속 이어갈 수 있는 상태로 남는다.

서버는 하니스가 정리하는 데 더 오래 걸리더라도 취소 요청에 1초 이내로 응답해야 한다(SHOULD). 클라이언트는 대체로 사용자 인터페이스이며, 30초 동안 눈에 보이는 아무 반응도 없는 정지 버튼은 고장 난 것처럼 보인다.

## 5. 세션 공유

적합성 등급 Full. 서버는 클라이언트가 세션의 읽기 전용 뷰를 게시하도록 허용할 수 있다(MAY).

```http
POST /v1/sessions/{session_id}/share
GET  /v1/sessions/{session_id}/share
```

구현된 경우:

- 공유된 뷰는 읽기 전용이어야 한다(MUST). 이어가기, 취소, 업로드를 허용해서는 안 된다(MUST NOT).
- 서버는 폐기를 허용해야 한다(MUST).
- 서버는 이를 통해 제공자 자격 증명이나 토큰, 다른 주체의 데이터를 노출해서는 안 된다(MUST NOT).

## 6. 삭제

```http
DELETE /v1/traces/{session_id}
```

세션과 그 저장된 이력을 삭제한다. 서버는 먼저 세션 안의 진행 중인 작업을 취소해야 하며(MUST), 이후 세션을 읽을 수 없게 만들어야 한다(MUST). 삭제는 취소와 삭제가 정당하게 결합되는 유일한 지점이다. 그 대안은 더 이상 소유자가 없는 저장소에 실행 중인 작업이 계속 쓰는 것이기 때문이다.

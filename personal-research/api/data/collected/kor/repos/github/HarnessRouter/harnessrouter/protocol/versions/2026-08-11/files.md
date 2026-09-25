# 파일

**Unified Harness Protocol, 버전 `2026-08-11`**

텍스트만 반환할 수 있는 에이전트는 챗봇이다. 하네스는 파일을 편집하고, 보고서를 쓰고, 다이어그램을
만든다. 이 장은 파일을 들여보내고 아티팩트를 꺼내는 것을 정의한다.

적합성 클래스 Extended.

## 1. 파일 들여보내기

### 1.1 인라인

작은 파일의 경우, 바이트를 데이터 URL 로 인라인한다.

```json
{
  "input": [
    { "role": "user", "content": [
        { "type": "input_text", "text": "Summarise this." },
        { "type": "input_file", "filename": "q3.pdf",
          "file_data": "data:application/pdf;base64,JVBERi0xLjQK…" }
    ]}
  ]
}
```

### 1.2 업로드로

더 큰 것은, 한 번 업로드하고 id 로 참조한다.

```http
POST /v1/files
Content-Type: multipart/form-data
```

```json
{ "id": "file_abc123", "object": "file", "filename": "q3.pdf", "bytes": 184320, "created_at": 1786400000 }
```

```json
{ "type": "input_file", "file_id": "file_abc123" }
```

서버는 두 형태 모두를 받아들여야 한다(MUST). 인라인은 4 KB 짜리 파일에 왕복 한 번을 아껴주고,
업로드는 40 MB 짜리 파일이 재시도마다 base64 로 부풀려지는 것을 막아준다. 서버는 자신의 크기
제한을 문서화해야 하며(MUST), 잘라내는 대신 초과된 업로드를 `413` 과 `code: "file_too_large"`
로 거부해야 한다(MUST) — 조용히 잘려나간 입력은 확신에 찬 오답을 만들어낸다.

## 2. 아티팩트 꺼내기

에이전트가 만든 파일은 세션의 컨테이너의 아티팩트가 된다. 이것들은 두 곳에서 보고된다.

### 2.1 response 위에서

아티팩트는 어시스턴트 메시지 위의 주석(annotation)으로 나타난다.

```json
{
  "type": "message",
  "content": [
    { "type": "output_text", "text": "I've written the report.",
      "annotations": [
        { "type": "container_file_citation",
          "container_id": "cntr_…",
          "file_id": "file_…",
          "filename": "report.md",
          "download_url": "https://server/v1/containers/cntr_…/files/file_…/content",
          "start_index": 0, "end_index": 24 }
      ]
    }
  ]
}
```

텍스트만 렌더링하는 클라이언트도 여전히 올바른 답을 보여주고, 주석을 읽는 클라이언트는 파일을
제공할 수 있다. 그것이 의도된 계층화다 — 아티팩트는 메시지에 추가되는 것이지, 절대 메시지를
대체하지 않는다.

### 2.2 세션을 나열해서

```http
GET /v1/sessions/{session_id}/files
```

```json
{ "files": [ { "id": "file_…", "container_id": "cntr_…", "filename": "report.md",
               "bytes": 2048, "created_at": 1786400240 } ] }
```

서버는 세션의 모든 아티팩트를 나열해야 하며(MUST), 이전 태스크의 파일도 포함해야 한다. 목록을
가장 최근 태스크로 한정하면 여러 단계로 이뤄진 세션의 이전 출력물에 접근할 수 없게 될 것이다.

## 3. 다운로드하기

```http
GET /v1/containers/{container_id}/files/{file_id}/content
```

파일 자신의 `Content-Type` 과 함께 원본 바이트를 반환한다. 서버는 바이트를 JSON 으로 감싸서는
안 된다(MUST NOT).

서버는 원본 파일 이름과 함께 `Content-Disposition` 을 보내야 하며(SHOULD), `X-Content-Type-
Options: nosniff` 를 설정해야 한다(MUST). 아티팩트는 공격자가 영향을 준 콘텐츠다 — 에이전트는
파일을 쓰도록 설득당할 수 있다 — 그래서 이 헤더 없이 그것을 제공하는 것은 아티팩트를 클라이언트
자신의 출처에 대한 저장형 XSS 로 바꿔버린다.

### 3.1 미리보기 렌더링

서버는 문서 포맷의 렌더링된 미리보기를 제공해도 된다(MAY).

```http
GET /v1/containers/{container_id}/files/{file_id}/pdf
```

서버가 변환을 구현하지 않았다면 깨지거나 빈 PDF 가 아니라 `code: "preview_unavailable"` 과 함께
`501` 을 반환해야 한다(MUST). 변환이 실패하면 `code: "preview_failed"` 와 함께 `502` 를 반환해야
한다(MUST). 그러면 클라이언트는 "이 서버는 미리보기를 절대 하지 않는다" 와 "이 파일이 변환되지
않았다" 를 구분할 수 있고, 재시도할 가치가 있는 것은 오직 후자뿐이다.

## 4. 일괄 다운로드

```http
GET /v1/sessions/{session_id}/files/archive
```

세션의 모든 아티팩트를 하나의 아카이브로 반환한다. 서버는 이것을 구현해야 한다(SHOULD). 마흔 개의
파일을 만든 세션이 마흔 번의 요청을 요구해서는 안 된다.

## 5. 보존과 범위

- 아티팩트는 자신의 세션과 함께 산다. 세션을 삭제하면 그 아티팩트에 접근할 수 없게 만들어야
  한다(MUST).
- 서버는 파일 접근을 소유 주체로 범위를 한정해야 한다(MUST). 다른 주체의 `file_id` 는 바이트가
  아니라 반드시 `404` 를 반환해야 한다(MUST).
- 서버는 `container_id` / `file_id` 쌍이 자신의 컨테이너 밖으로 순회하도록 허용해서는 안
  된다(MUST NOT). 아티팩트 id 를 통한 경로 순회는 UHP 구현에서 가장 있을 법한 심각한 취약점이며,
  적합성 스위트가 이를 탐침한다.

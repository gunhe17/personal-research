# Unified Harness Protocol — 명세 `2026-08-11`

완전한 에이전트 하네스를 공유 인프라로 실행하기 위한 개방형 표준.

이 문서는 규범적 명세다. UHP 가 무엇이고 왜 존재하는지에 대한 소개는 [프로토콜 README](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/../../README.md) 에서 시작하라.

## 장

| # | 장 | 정의하는 내용 |
|---|---|---|
| 1 | [아키텍처](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/architecture.md) | 역할, 준수 등급, 객체 모델, 전송, 인증, 설계 원칙 |
| 2 | [생명주기](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/lifecycle.md) | 버전 협상, 기능 발견, 작업과 세션 상태, 동시성 |
| 3 | [하네스](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) | 하네스 발견, 선택, 구성, 관리; 모델과 가용성 |
| 4 | [작업](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md) | 작업 실행, 응답 객체, 모델 대체, 멱등성 |
| 5 | [스트리밍](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/streaming.md) | 이벤트 어휘, 순서 보장, 재연결 |
| 6 | [세션](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) | 이어가기, 조회, 취소, 공유, 삭제 |
| 7 | [파일](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) | 파일 입력, 산출물, 다운로드, 보존 및 범위 |
| 8 | [오류](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/errors.md) | 오류 봉투, 코드, 재시도 규칙, 타임아웃 |
| 9 | [보안](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/security.md) | 자격 증명, 객체 범위, 산출물, 인젝션, 소진, 오류 위생 |
| 10 | [스키마](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/schema.md) | 기계 판독 가능한 정의와 그로부터 생성하는 방법 |

## 엔드포인트 요약

| 메서드 | 경로 | 등급 | 장 |
|---|---|---|---|
| `GET` | `/v1/uhp` | Core | [생명주기](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/lifecycle.md) |
| `GET` | `/v1/harnesses` | Core | [하네스](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `GET` | `/v1/harnesses/{id}` | Core | [하네스](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `GET` | `/v1/models` | Core | [하네스](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `GET` | `/v1/harnesses/{id}/models` | Core | [하네스](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `POST` | `/v1/responses` | Core | [작업](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md) |
| `GET` | `/v1/responses/{id}` | Core | [작업](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md) |
| `GET` | `/v1/responses/{id}/input_items` | Core | [작업](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md) |
| `POST` | `/v1/responses/{id}/cancel` | Core | [세션](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `DELETE` | `/v1/responses/{id}` | Core | [작업](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md) |
| `POST` | `/v1/sessions/{id}/cancel` | Core | [세션](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `GET` | `/v1/sessions` | Extended | [세션](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `GET` | `/v1/sessions/{id}` | Extended | [세션](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `GET` | `/v1/sessions/{id}/turns` | Extended | [세션](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `POST` | `/v1/files` | Extended | [파일](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) |
| `GET` | `/v1/sessions/{id}/files` | Extended | [파일](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) |
| `GET` | `/v1/sessions/{id}/files/archive` | Extended | [파일](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) |
| `GET` | `/v1/containers/{cid}/files/{fid}/content` | Extended | [파일](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) |
| `GET` | `/v1/containers/{cid}/files/{fid}/pdf` | Extended | [파일](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) |
| `POST` | `/v1/harnesses` | Full | [하네스](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `PUT` | `/v1/harnesses/{id}` | Full | [하네스](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `DELETE` | `/v1/harnesses/{id}` | Full | [하네스](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `POST` | `/v1/sessions/{id}/share` | Full | [세션](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `GET` | `/v1/sessions/{id}/share` | Full | [세션](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `DELETE` | `/v1/traces/{id}` | Full | [세션](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |

## 준수

서버는 해당 등급의 [준수 테스트 스위트](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/versions/2026-08-11/../../conformance/) 를 통과할 때 그 등급에서 준수한다고 본다. 그 외의 어떤 것도 준수 주장이 아니다 — 자체 평가도, 엔드포인트 구현 그 자체도, "대부분의" 테스트를 통과하는 것도 아니다.

```bash
pip install -e protocol/conformance
uhp-conformance --base-url https://your-server --api-key "$KEY" --class extended
```

이 스위트는 이 명세의 일부다. 스위트와 이 산문이 서로 어긋난다면 그것은 둘 중 하나의 버그이며, 어느 쪽이 잘못됐는지를 판단해 고쳐서 해결해야 한다(MUST) — 절대 불일치 상태로 방치해서는 안 된다.

## 관례

- MUST / SHOULD / MAY 는 [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) 와 [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) 에서 정의된 대로 쓰인다.
- JSON 예시는 예시일 뿐이며, 구조에 대해서는 [스키마](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/versions/2026-08-11/../../schema/) 가 규범적이다.
- 필드 이름은 작업 표면(task surface)에서는 `snake_case` 이고(Responses 호환 형태에서 물려받음) 하네스 객체에서는 `camelCase` 다. 이 불일치는 실재하며, 여기서 감추지 않고 명시적으로 밝히고 있고, 둘 중 하나를 바꾸면 미관상의 이득을 위해 기존 클라이언트를 깨뜨리게 되므로 그대로 유지된다. 향후 메이저 버전에서는 이를 통일해야 한다(SHOULD).

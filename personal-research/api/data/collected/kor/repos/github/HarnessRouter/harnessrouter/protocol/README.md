# Unified Harness Protocol (UHP)

**완전한 에이전트 하네스를 공유 인프라로 실행하기 위한 개방 표준.**

*하네스*란 계획하고, 도구를 호출하고, 파일을 편집하고, 결과를 보고하는 루프를 갖춘 완전한 에이전트 런타임이다.
Codex, Claude Code, Hermes가 하네스다. 각각은 이미 작업을 수행하는 방법을 알고 있다. 다만 어느 것도 합의하지
못하는 것은 제품이 하나의 하네스를 어떻게 *구동*해야 하는가다. 작업을 어떻게 시작하고, 진행 상황을 어떻게
따라가고, 대화를 어떻게 이어가고, 어떻게 취소하고, 생성된 파일을 어떻게 받고, 실패한 이유를 어떻게 이해하는가.

오늘날 모든 제품은 하네스마다 그 질문들에 다시 답한다. UHP는 그것을 한 번만 답한다.

```
   your product ──▶ UHP ──▶ ┌── Codex
                            ├── Claude Code
                            ├── Hermes
                            └── the harness that ships next year
```

UHP는 모델 API가 아니며 그것을 대체하지도 않는다. 모델 API는 *턴*을 준다. 메시지가 들어가면 토큰이 나오고,
도구는 직접 실행해야 한다. UHP는 *작업*을 준다. 일감이 들어가면, 자신의 도구를 사용하고 자신의 세션을 유지하며
결과와 파일을 돌려주는 실행 중인 에이전트가 있다. 교환의 단위는 완성이 아니라 작업이다.

## 이 문서의 상태

| | |
|---|---|
| 현재 버전 | `2026-08-11` |
| 상태 | 초안 표준 — 그 위에 구축할 만큼 안정적이며, 안전하게 변경될 수 있도록 버전이 매겨져 있다 |
| 명세서 | [`versions/2026-08-11/`](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/versions/2026-08-11/) |
| 기계가 읽는 형식 | [`schema/`](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/schema/) — OpenAPI 3.1 + JSON Schema 2020-12 |
| 적합성 스위트 | [`conformance/`](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/conformance/) — 실행 가능하며, "적합"의 정의 자체다 |
| 변경 절차 | [`GOVERNANCE.md`](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/GOVERNANCE.md) |
| 버전 관리 규칙 | [`VERSIONING.md`](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/VERSIONING.md) |
| 라이선스 | Apache-2.0, 저장소와 동일 |

## 이 표준은 HarnessRouter Cloud를 요구하지 않는다

그것이 이 문서를 작성한 이유이므로, 안심시키는 말보다는 구체적으로 밝히는 편이 낫다.

UHP는 HTTP 계약이다. 적합한 서버란 이 명세서의 요청에 이 명세서의 응답으로 답하는 어떤 서버든 해당한다.
그것은 컨테이너에서, 서브프로세스에서, 큐 위에서, 혹은 다른 누군가의 인프라에서 에이전트를 실행할 수 있다.
와이어 포맷 안 그 어디에도 호스팅된 서비스, 계정, 라이선스 키, 콜 홈을 요구하는 부분은 없다.

이를 지키기 위해 두 개의 독립적인 구현체가 존재한다.

- HarnessRouter Community Edition — 참조 구현으로, 이 저장소 안에 있으며 전적으로 사용자 자신의 머신에서
  실행된다(`docker run harnessrouter/harnessrouter:0.3.0`). 사용자 자신의 공급자 키를 사용하고 사용자가 소유한
  볼륨에 모든 것을 저장한다. 적합성 스위트가 그것을 대상으로 개발되는 구현체다.
- HarnessRouter Cloud — 같은 프로토콜의 상용 호스팅 구현체.

이 명세서를 대상으로 작성된 클라이언트는 둘 중 어느 쪽과도, 그리고 적합성 스위트를 통과하는 어떤 세 번째
구현체와도 동작한다. 명세서가 기술하지 않는데 클라이언트가 의존하는 동작을 발견했다면 그것은 명세서의 버그이니
[이슈를 열어](https://github.com/HarnessRouter/harnessrouter/issues) 달라.

## 프로토콜이 다루는 것

| 챕터 | 정의하는 것 |
|---|---|
| [Architecture](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/architecture.md) | 역할, 적합성 클래스, 객체 모델 |
| [Lifecycle](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/lifecycle.md) | 버전 협상, 기능 탐색, 작업 생명주기 |
| [Harnesses](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) | 하네스 탐색, 선택, 구성 |
| [Tasks](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md) | 작업을 보내고 결과를 받기 |
| [Streaming](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/streaming.md) | 진행 상황을 실시간으로 따라가기 |
| [Sessions](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) | 대화를 이어가기, 그리고 취소하기 |
| [Files](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) | 파일을 보내고 산출물을 받기 |
| [Errors](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/errors.md) | 실패 분류 체계, 재시도, 멱등성 |
| [Security](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/security.md) | 구현자가 반드시 올바르게 해야 하는 것들을 한곳에 모은 것 |
| [Schema](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/schema.md) | 기계가 읽는 정의와 그 사용법 |

## 대략적인 모습

서버가 실행할 수 있는 것을 탐색하고, 무언가를 실행하고, 그것을 따라간다.

```bash
curl -s https://your-uhp-server/v1/harnesses -H "Authorization: Bearer $KEY"

curl -s -N https://your-uhp-server/v1/responses \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{
        "input": "Summarise README.md in three bullets.",
        "model": "claude-sonnet-4.6",
        "metadata": { "harness_id": "chrn_…" },
        "stream": true
      }'
```

스트림은 Server-Sent Events다. 마지막 이벤트는 완성된 `response` 객체를 담으며, 에이전트가 생성한 파일이
있다면 그것도 포함한다. 같은 대화를 이어가려면, 방금 받은 id를 `previous_response_id`에 담아 다음 요청을
보낸다.

전체 안내: [Tasks](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md).

## OpenAI Responses API와의 관계

UHP의 작업 표면은 의도적으로 OpenAI Responses API를 닮은 형태로 만들어졌으며, 적합한 서버는
[Tasks](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md)에 기술된
요청 본문의 부분집합을 반드시(MUST) 받아들여야 하고
[Streaming](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/streaming.md)에
기술된 이벤트 어휘를 발행해야 한다.

이것은 우연이 아니라 호환성을 위한 결정이다. 제품들은 이미 Responses를 다루는 코드를 갖고 있다. 기존 SDK,
스트리밍 파서, UI 컴포넌트가 UHP 서버를 상대로 아무 변경 없이 동작한다. UHP가 더하는 것은 모델 엔드포인트가
전혀 알지 못하는, *하네스*에 필요한 모든 것이다. 어느 하네스가 그 작업을 실행하는지, 그 도구와 스킬은
무엇인지, 작업 사이에서 살아남는 세션은 무엇인지, 돌아오는 파일은 무엇인지, 이미 실행 중인 작업의 취소는
어떻게 이루어지는지.

UHP가 Responses 표면을 확장하는 곳에서는 언제나 문서화된, 추가적인 지점에서만 그렇게 한다. `metadata`, 소수의
추가 요청 필드, 그리고 추가적인 객체 타입들이다. 기존 필드의 의미를 바꾸는 방식으로는 결코 확장하지 않는다.
UHP의 확장을 전부 무시하는 클라이언트도 여전히 동작하는 작업을 얻는다.

## UHP 구현하기

1. [Architecture](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/architecture.md)를 읽고 적합성 클래스를 고른다.
2. [`schema/uhp-2026-08-11.openapi.yaml`](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/schema/uhp-2026-08-11.openapi.yaml)에서 타입을 생성한다.
3. 구축하는 동안 서버를 대상으로 [적합성 스위트](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/conformance/)를 실행한다.
   ```bash
   pip install -e protocol/conformance
   uhp-conformance --base-url https://your-server --api-key "$KEY"
   ```
4. 보고서를 공개한다. 어떤 클래스에서 통과한 서버는 "UHP 2026-08-11 conformant (<class>)"라고 자신을 설명할
   수 있다(MAY).

## 기여하기

이 명세서에 대한 변경은 [`GOVERNANCE.md`](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/GOVERNANCE.md)를
따른다. 짧게 요약하면, 먼저 산문으로 제안하고, 명세서와 참조 구현과 적합성 스위트가 함께 움직이지 않으면 어떤
변경도 반영되지 않는다.

## 배경

이름 뒤에 있는 이야기, 검토했던 대안들, 그리고 왜 *Unified*가 UHP라는 글자를 얻게 되었는지에 관해서는
[배경: UHP의 명명](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/naming)을 참고한다.

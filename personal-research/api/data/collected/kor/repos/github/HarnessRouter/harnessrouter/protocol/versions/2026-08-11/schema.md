# 스키마

**Unified Harness Protocol, version `2026-08-11`**

기계 판독 가능한 정의는 구조에 대해 규범적이다. 이 산문과 스키마가 객체의 형태에 대해 어긋날 때는 스키마가 우선하고, 동작에 대해 어긋날 때는 산문이 우선한다. 동작은 JSON Schema 로 표현할 수 없기 때문이다.

## 파일

| 파일 | 형식 | 용도 |
|---|---|---|
| [`uhp-2026-08-11.openapi.yaml`](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/../../schema/uhp-2026-08-11.openapi.yaml) | OpenAPI 3.1 | 클라이언트와 서버 생성; API 탐색 |
| [`uhp-2026-08-11.schema.json`](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/../../schema/uhp-2026-08-11.schema.json) | JSON Schema 2020-12 | 객체와 스트리밍 이벤트 검증 |

둘 다 파일명으로 버전이 매겨진다. 발표된 버전은 불변이다. 스키마를 고치는 것은 새 버전을 발표하는 것을 의미하며, 클라이언트가 이미 그로부터 코드를 생성했을 수 있는 버전을 편집하는 것은 절대 아니다.

## 클라이언트 생성하기

```bash
# TypeScript
npx openapi-typescript protocol/schema/uhp-2026-08-11.openapi.yaml -o uhp.d.ts

# Python
openapi-python-client generate --path protocol/schema/uhp-2026-08-11.openapi.yaml

# Go
oapi-codegen -package uhp protocol/schema/uhp-2026-08-11.openapi.yaml > uhp.gen.go
```

## 이벤트 검증하기

모든 스트리밍 이벤트는 `type` 에 대한 판별 유니온(discriminated union)인 `Event` 정의에 대해 검증된다.

```python
import json, jsonschema

schema = json.load(open("protocol/schema/uhp-2026-08-11.schema.json"))
validator = jsonschema.Draft202012Validator(
    {"$ref": "#/$defs/Event", **schema})

for line in stream:
    if line.startswith("data: "):
        validator.validate(json.loads(line[6:]))
```

준수 테스트 스위트는 라이브 서버에 대해 정확히 이것을 수행하므로, 참조 구현이 만족시키지 못하는 스키마 변경은 배포되지 않고 CI 에서 실패한다.

## 확장 지점

서버는 스키마가 추가 속성을 허용하는 어디에든 필드를 추가할 수 있다(MAY).

- 요청이나 응답의 `metadata` — 클라이언트와 서버의 맥락을 담기 위해 의도된 자리.
- 오류의 `detail` — 특정 실패에 대한 구조화된 맥락.
- 추가적인 출력 항목 타입, 추가적인 이벤트 타입.

서버는 명시된 필드의 의미를 재정의하지 말아야 하며(MUST NOT), 필수 필드를 추가하지 말아야 한다(MUST NOT). 이 버전을 기준으로 작성된 클라이언트가 계속 동작해야 하기 때문이다. 벤더 고유 필드는 벤더 접두사를 붙여야 한다(SHOULD). 그래야 이후 버전의 이 명세와 충돌하지 않는다.

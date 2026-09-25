# Ontology design: Structural guidance (번역)

# Ontology design: Structural guidance

Ontology 안에서 properties, relationships, 접근 통제를 구조화하는 가이드입니다.

## Normalization and derived properties

**각 사실을 한 번만 저장하고, 편의는 derived properties로.**

비정규화(링크된 객체의 값을 부모에 복사)는 위험할 수 있습니다. 소스가 바뀌면 모든 복사본을 갱신해야 합니다. 정규화는 일관성을 유지하고, derived properties는 유지 비용 없이 비정규화의 편의를 줍니다.

모든 계산 값이 같지는 않습니다. 안정 입력에서 안전하게 사전 계산 가능한지, 동적 Ontology 변화와 동기화되어야 하는지에 따라 접근이 달라집니다.

### Pre-computed vs. dynamically derived values

| 유형 | 특성 | 권장 도구 | 예 |
| --- | --- | --- | --- |
| Pre-computed | 같은 객체의 properties; 입력이 거의 안 바뀌거나 파이프라인 적재로만 변경 | Pipeline transform | `fullName` = first + last |
| Dynamically derived | 링크된 객체 또는 actions/automations 등으로 바뀌는 값 | Derived property | `directReportCount` — 링크된 Employee 수 |

값이 actions를 통해 바뀌면, 영향을 줄 수 있는 **모든** action이 그 값도 갱신해야 합니다. 하나라도 실패하면 불일치가 남을 수 있습니다.

### Anti-patterns

- 같은 값이 여러 object types에 property로 저장
- 다른 곳에서 유지되는 값의 복사본이 stale
- 하나의 실세계 사실 갱신에 여러 objects write 필요
- 링크에서 계산하지 않고 수동 유지하는 정수/카운트 properties

### Example

`Manager.directReportCount`를 수동 정수로 유지(✗) vs 링크된 Employee를 런타임 카운트하는 derived(✓).  
`Employee.managerName` 복사(✗) vs Manager 링크 순회(✓).

### Performance considerations

Derived properties는 런타임 평가.

| 규모 | 권고 |
| --- | --- |
| 낮음~중간 (질의당 ~10k objects 미만) | derived를 자유롭게. 대부분 워크플로에 충분 |
| 높음 (질의당 ~10k 초과) | 지연 가능. 의식적·문서화된 비정규화가 트레이드오프일 수 있음 |

### Best practices

1. 사실은 의미상 속하는 객체에 **한 곳**에만 저장.
2. 링크된 객체에서 집계·계산은 **derived properties**.
3. 규모 증가 시 성능 모니터링. 필요 시 선택적 비정규화.
4. 비정규화 시 근거·정본·동기화 전략 문서화.

## Structs

**의미상 관련된 필드를 struct로 묶을 것.**

주소(street, city, state, postal)처럼 본질적으로 다중 필드인 property는 평탄한 별도 properties보다 struct가 낫습니다. 시맨틱 그룹핑을 보존하고 더 풍부한 메타데이터를 담을 수 있습니다.

### When to use structs

| 시나리오 | 예 |
| --- | --- |
| 다중 필드 값 | Address, coordinates |
| 메타데이터 동반 값 | 신뢰도·출처·추론을 가진 AI 출력 |
| 선택 로직이 있는 다중 값 | primary를 reducer로 고르는 여러 전화번호 |

### Example

Facility 주소: 10개 평탄 properties(✗) vs address struct(+ main fields, reducer 정렬용 필드, LLM confidence 등)(✓).

### Key benefits

| 이점 | 상세 |
| --- | --- |
| Semantic grouping | 주소는 하나의 개념 |
| Metadata capture | 출처·신뢰도·타임스탬프 동반 |
| Reducer support | 다중 값에서 가장 관련 있는 값 표면화 |
| Main field behavior | 단순 property처럼 동작하도록 main fields 지정 |

AI-first 워크플로에서 LLM 출력(결과+추론+출처+신뢰도)을 흩뿌리지 말고 struct에 함께 담는 것이 특히 유용합니다.

### Best practices

1. 항상 함께 쓰이는 다중 필드 properties 식별.
2. 명확한 필드 이름·타입으로 struct 정의.
3. Main field 지정.
4. 다중 값 struct에 reducers.
5. 특히 AI 출력에 메타데이터 동반.

## Interfaces

**재사용 가능하고 미래 대비된 추상에 interfaces 사용.**

Interfaces는 [DRY](https://www.palantir.com/docs/foundry/ontology/ontology-best-practices/#2-dont-repeat-yourself-rule-of-three)와 [open/closed](https://www.palantir.com/docs/foundry/ontology/ontology-best-practices/#3-open-for-extension-closed-for-modification)의 주요 도구입니다. 여러 object types가 implement하는 공유 shape(properties, links, actions)를 정의해, 워크플로가 개별 타입이 아니라 interface를 타겟하게 합니다.

### When to use interfaces

| 시나리오 | 예 |
| --- | --- |
| 타입 간 공통 properties | `Inspectable` — Vehicle/Equipment/Facility |
| 공유 워크플로 | `SchedulableResource` 스케줄링 |
| 분류 그룹 | `MilitaryAsset` ← Aircraft/Vessel/GroundVehicle |
| 다층 추상 | `SchedulableResource` extends `Trackable` |

### Example

Vehicle/Equipment/Facility에 각각 중복 inspection properties·actions(✗) vs 하나의 `Inspectable` interface + 공유 Schedule Inspection action(✓).

### Platform considerations

도구 지원이 아직 불완전한 워크플로에서도 interface를 지금 정의하면, 지원이 확장될 때 통합 경로가 명확합니다. 지원 전엔 타입별 워크플로 복제가 임시 조치일 수 있으나 interface 없이 하는 것과 비용이 같고 이후 통합이 쉽습니다.

[interface 문서](https://www.palantir.com/docs/foundry/interfaces/interface-overview/)에서 현재 지원 확인.

### Best practices

1. 공통 shape 식별 → interface 정의.
2. 능력(`Inspectable`) 또는 분류(`MedicalDevice`) 중심 설계.
3. 가능하면 워크플로를 interface 타겟.
4. 다층 추상을 위해 interface 확장.
5. 지금 스캐폴딩, 나중에 통합.

## Links and object-backed link types

**Links는 의미 있는 관계를 나타내야 한다.**

모든 link type은 명확한 도메인 질문에 답해야 합니다. 예: 이 환자가 방문한 시설은? 이 직원이 속한 팀은? 이 work order에 쓰인 장비는?

### When to use link types

| Link type | 사용 시기 | 예 |
| --- | --- | --- |
| Direct link | 관계에 자체 메타데이터 없음 | Employee → Department |
| Object-backed link | 관계에 날짜·역할·상태·할당 등 메타데이터 | Employee → VentureStaffing → Venture |

모든 워크플로가 조인 메타데이터를 필요로 하지는 않습니다. Object-backed links는 맥락에 따라 직접 연결 또는 상세 뷰를 노출할 수 있습니다.

### Example

Employee–Venture에 role/startDate가 있으면 direct-only(✗) 또는 Employee에 ventureRole 평탄 필드(다중 배정 시 모호)(✗) vs Venture Staffing 중간 객체(✓).

### Impact of incorrect link design

| 문제 | 영향 |
| --- | --- |
| 메타데이터 손실 | 언제/왜/어떤 자격으로 관계인지 표현 불가 |
| 모호한 multi-links | 소스 객체 위 역할 필드가 다중 참여 시 모호 |
| 무의미한 links | FK 공유만으로 만든 링크는 탐색 혼란 |

### Best practices

1. 도메인 의미 검증 — FK만이 이유인 링크 지양.
2. 관계 메타데이터 있으면 object-backed link.
3. 워크플로에 맞는 상세 수준 노출.
4. 양방향 의미 있게 이름 짓기 — [naming conventions](#naming-conventions).

## Naming conventions

**인간 가독성과 에이전트 탐색성을 최적화.**

일관되고 설명적인 네이밍은 Ontology 품질에 가장 영향력 큰 투자 중 하나입니다. 사용 시작 후에는 고치기 훨씬 어렵습니다.

### Naming rules

| 요소 | 컨벤션 | 좋은 예 | 나쁜 예 |
| --- | --- | --- | --- |
| Object types | 단수, 도메인 전문가가 알아보는 구체 명사 | Patient, WorkOrder | Data, Item, Record |
| Properties | 간결·자명; 타입 인코딩·구현 디테일 없음 | age, lastInspectionDate | dtLastInspMod, nVAL01 |
| Links | 각 방향에서 자연스럽게 읽힘 | department / employees | relatedItems, link1 |
| Dates | 전 Ontology에서 단일 컨벤션 | createdDate, effectiveDate | createdDate와 dateOfCreation 혼용 |
| 모호한 용어 | 구체 의미로 한정 | monetaryValue, riskScore | value, score |

### Best practices

1. 구축 전 네이밍 컨벤션 합의.
2. 기존 Ontology 컨벤션 따르기.
3. 모호한 properties 한정.
4. 관계로 links 이름.
5. 최종 사용자와 이름 검증.

## Security design

**최소 권한 원칙으로, 시맨틱하게 보안 설계.**

보안은 데이터 인프라 용어가 아니라 도메인 의미로 표현되어야 합니다. 사용자가 설정을 보고 무엇이 왜 보호되는지 이해할 수 있어야 합니다.

### Security model

행·열 보안을 결합해 셀 수준 접근 통제:

| 층 | 통제 | 예 |
| --- | --- | --- |
| Row-level | 볼 수 있는 objects | VIP 환자는 시니어 스태프만 |
| Column-level | 보이는 objects 위 볼 수 있는 properties | 임상 노트는 care team만 |
| Cell-level (결합) | 행·열 교집합 | VIP 환자의 임상 노트는 시니어 care team만 |

### Example

보안을 위해 PublicPatient/RestrictedPatient로 타입 복제(✗) vs 단일 Patient + 컬럼/행 정책(✓).

### Impact of incorrect security design

| 문제 | 영향 |
| --- | --- |
| 보안용 타입 복제 | 스키마 드리프트; DRY 위반 |
| 과도하게 관대한 기본값 | 나중에 제한하기 전 민감 데이터 노출 위험 |
| 정책 대신 앱 단 ad-hoc 필터 | 취약하고 감사 어려움 |
| 도메인과 어긋난 경계 | 추론 어렵고 갭 발생 쉬움 |

### Best practices

1. 제한적으로 시작, 의도적으로 개방.
2. 행·열 보안 결합.
3. 도메인 자연 경계(지역 매니저·care team)에 보안 정렬.
4. 보안을 위한 object type 복제 지양.
5. 새 링크·타입·properties 추가 시 접근 통제 일관성 검토.

보안 경계가 도메인 경계와 맞는지 이 가이드로 확인한 뒤, 구성 상세는 [security and governance](https://www.palantir.com/docs/foundry/security/overview/) 참고.

**이전:** [Best practices](https://www.palantir.com/docs/foundry/ontology/ontology-best-practices/)  
**다음:** [Anti-patterns](https://www.palantir.com/docs/foundry/ontology/ontology-anti-patterns/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

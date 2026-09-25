# Ontology design: Best practices (번역)

# Ontology design: Best practices

잘 설계된 Ontology는 조직의 통합되고 직관적인 표현을 만들어 매끄러운 데이터 통합, 교차 기능 협업, 강력한 분석을 가능하게 합니다. 이 섹션은 빠른 설계 가이드라인 체크리스트와, 그 기반이 되는 핵심 설계 원칙을 다룹니다.

## Design guidelines

Ontology 설계를 위한 실무 체크리스트입니다. 해당되는 경우 각각 [핵심 설계 원칙](#core-design-principles), [anti-pattern](https://www.palantir.com/docs/foundry/ontology/ontology-anti-patterns/), [structural recommendation](https://www.palantir.com/docs/foundry/ontology/ontology-structural-guidance/)에 근거합니다.

1. **현실을 모델링하고 시스템을 모델링하지 말 것:** Object types는 실세계 엔티티를 나타내야 하며, 개별 소스 시스템이나 부서 표현이 아닙니다.  
   - 원칙: [Domain-driven design](#1-domain-driven-design)

2. **의도적으로 큐레이션:** 모든 property는 명확한 비즈니스 또는 기술 가치가 있어야 합니다.  
   - 구조 권고: [Normalization and derived properties](https://www.palantir.com/docs/foundry/ontology/ontology-structural-guidance/#normalization-and-derived-properties)

3. **팀을 넘어 협업:** Ontology 설계에는 여러 부서·팀 이해관계자가 참여해야 합니다. 사일로 팀은 중복의 주된 원인입니다.  
   - 원칙: [Don't repeat yourself](#2-dont-repeat-yourself-rule-of-three)

4. **Object types를 집중적으로:** 각 object type은 하나의 뚜렷한 엔티티를 나타내야 합니다.  
   - 원칙: Domain-driven design

5. **올바른 도구 선택:** 인간·에이전트 결정에는 action types, 자동 변환에는 pipelines.  
   - Anti-pattern: [The Golden Hammer](https://www.palantir.com/docs/foundry/ontology/ontology-anti-patterns/#anti-pattern-the-golden-hammer)

6. **추상에 interfaces 사용:** 엔티티가 공통 특성을 공유하면 넓고 성긴 object types 대신 interfaces로 추상화.  
   - 원칙: [Composition over deep hierarchies](#4-composition-over-deep-hierarchies)

7. **결정을 문서화:** Ontology Manager에 object types, properties, links를 문서화.

## Core design principles

정부·상업 구현 현장 경험에서 도출된 네 원칙입니다. **우선순위 순**이며, 충돌 시 상위 원칙이 우선합니다.

| 우선순위 | 원칙 | 핵심 아이디어 |
| --- | --- | --- |
| 1 | Domain-driven design | 실세계를 모델링하고, 소스 데이터를 모델링하지 말 것 |
| 2 | Don't repeat yourself | 같은 것을 세 번 만들었으면 리팩터 |
| 3 | Open for extension, closed for modification | 코어 모델 보호. 빌더가 확장하게 할 것 |
| 4 | Composition over deep hierarchies | interfaces로 다중 상속. 플러그 가능하게 |

실무 제약은 항상 고려. [pragmatism and tradeoffs](#pragmatism-and-tradeoffs) 참고.

### 1. Domain-driven design

![1-Domain Design](https://www.palantir.com/docs/resources/foundry/ontology/domain-design.png?width=1280)

**Ontology는 소스 데이터가 아니라 실세계를 모델링한다.**

Objects는 `Patient`, `WorkOrder`, `Vessel` 같은 의미 있는 실세계 개념이어야 하며 DB 테이블·API 응답·스프레드시트 탭이 아닙니다. Links는 “이 환자가 이 시설을 방문했다” 같은 실제 관계이며 join key/FK 아티팩트가 아닙니다.

“데이터셋을 온톨로지화하라”는 요청에 컬럼을 property에 1:1 매핑하고 끝내고 싶은 유혹을 거절하세요. [Kitchen Sink](https://www.palantir.com/docs/foundry/ontology/ontology-anti-patterns/#anti-pattern-the-kitchen-sink) anti-pattern은 소스 스키마 기벽을 반영한 Ontology를 만듭니다. 잘 설계된 Ontology는 직관적이어야 하며, 사용자나 AI 에이전트가 이미 도메인을 생각하는 방식과 구조가 맞아 마찰 없이 탐색할 수 있어야 합니다.

#### Anti-patterns

- Object types가 도메인 엔티티가 아니라 소스 시스템 테이블을 미러
- Properties가 큐레이션 없이 소스 컬럼 1:1 매핑
- 이름이 비즈니스 언어(`lastInspectionDate`)가 아니라 소스 컨벤션(`dtLastInspMod`)
- 도메인을 이해하지 않고 데이터만 보고 객체 모델 설계
- 여러 엔티티를 담은 단일 소스 행을 하나의 object type으로 모델링

#### Example

`order_id`, `customer_name`, `customer_email`, `product_sku`, `quantity` CSV는 최소 **세** 실세계 엔티티를 기술합니다.

```
✗ Avoid                                    ✓ Prefer
OrderData (CSV 미러 한 타입)               Order + Customer + Product
                                           (Links로 연결)
```

#### Impact of anti-patterns

| 문제 | 영향 |
| --- | --- |
| 비직관적 모델 | 사용자·AI가 자연스럽게 탐색 불가 |
| 소스에 취약한 결합 | 소스 스키마 변경이 소비자 파괴 |
| 놓친 관계 | 컬럼에 묻힌 엔티티를 독립 링크·검색·추론 불가 |
| 재사용 불량 | 한 시스템 스키마에 묶인 타입이 다른 팀·유스케이스에 쓰기 어려움 |

#### Best practices

1. 소스 스키마를 보기 **전에** 실세계 엔티티 식별 — 도메인 이해관계자와. 한 데이터셋이 여러 엔티티를 기술하는 경우가 많음.
2. **정체성과 관찰 분리** — 행이 엔티티에 대한 측정/이벤트면 엔티티와 관찰은 다른 object types일 가능성.
3. **사람을 위한 이름** — `person.children`, `equipment.lastInspectionDate` 선호.
4. **도메인 먼저, 데이터 매핑 나중** — 데이터 shape 복제 금지.
5. 비시맨틱 기술 타입은 필요 시 **hidden** 표시.

### 2. Don't repeat yourself (rule of three)

![3-Don't Repeat](https://www.palantir.com/docs/resources/foundry/ontology/do-not-repeat.png?width=1280)

**같은 것을 세 번 만들었으면 리팩터.**

중복 object types, 잉여 properties, 복붙 워크플로는 유지 부담이자 맥락 관리 문제입니다(인간·AI 모두). 목표는 개념당 **단일 canonical 표현**, 연산당 **단일 canonical 워크플로**입니다. 하나=우연, 둘=패턴, 셋=리팩터 시점.

#### Anti-patterns

- 여러 object types가 같은 properties·유사 links 공유
- 동일 derived property/action 로직이 여러 타입에 반복
- 팀이 거의 동일한 object types를 각자 생성
- 약간의 변형만 있는 복붙 워크플로

#### Example

Sales/Support/Billing Customer 세 타입 → 단일 `Customer` 또는 `CustomerBase` interface + implementers.

#### Impact

유지 부담, 모호한 정본, 행동 불일치, 중복 개발 노력.

#### Best practices

1. 중복 감사 — 공통 shape면 단일 타입 또는 shared interface.
2. 공유 로직을 interface/shared function으로 통합.
3. 팀별 복사본을 단일 canonical로 통합(+보안/필터).
4. rule of three 적용.

### 3. Open for extension, closed for modification

![2-Open Closed](https://www.palantir.com/docs/resources/foundry/ontology/open-closed.png?width=1280)

**코어 모델을 보호하고, 빌더가 확장하게 하라.**

프로덕션에서 검증된 object type·interface·워크플로의 코어 구조는 안정적이어야 합니다. 다른 팀은 코어를 수정하지 않고 interface implement나 기존 objects 소비 워크플로로 확장할 수 있어야 합니다.

#### Anti-patterns

- 의존 앱에 연쇄되는 확립 타입의 잦은 브레이킹 변경
- 새 유스케이스가 확장 대신 코어 타입 수정 요구
- 팀 특수 필요를 위해 공유 interface/action 편집
- 한 팀 확장의 보안 변경이 다른 소비자에 영향

#### Example

코어 `Equipment`에 인증 필드 4개를 직접 넣기(✗) vs `Equipment Certification` linked type + `Certifiable` interface(✓).

#### Impact

브레이킹 변경, God Object로 향하는 스코프 크립, 얽힌 소유권, 보안 누수.

#### Best practices

1. 본질적인 properties/links만 식별하고 고정.
2. 확장 가능한 설계(linked types, interface implementations).
3. 수정 대신 확장.
4. 보안 경계 강제.

### 4. Composition over deep hierarchies

![4-Composition](https://www.palantir.com/docs/resources/foundry/ontology/composition.png?width=1280)

**깊은 단일 상속 대신 interfaces로 능력 조합.**

Foundry Ontology는 interfaces로 다중 상속을 지원해, 엔티티가 여러 집중 추상에서 행동을 조합할 수 있습니다.

#### Anti-patterns

- 부모 능력 조합만을 위한 깊은 단일 상속 체인
- `SchedulableBuilding` 같은 무관한 개념 합병 타입
- 공유 interface로 동작할 워크플로가 특정 object type에 강하게 결합
- 새 능력 추가가 상속 체인 재구조화 요구

#### Example

`Arena`가 building이자 schedulable resource: 깊은 Asset→…→SchedulableBuilding 체인(✗) vs `Building` + `SchedulableResource` interfaces implement(✓).

#### Impact

조합 폭발, 취약한 계층, 제한된 재사용, 실세계가 아닌 인위 parent(DDD 위반).

#### Best practices

1. 능력/역할 중심 interfaces: `Inspectable`, `Schedulable`, `Billable`…
2. 분류 집계용 taxonomic interfaces (예: `MilitaryAsset`).
3. 워크플로·actions·functions·apps는 가능하면 interface 타겟.
4. 상속 대신 조합.

## Pragmatism and tradeoffs

**원칙은 가이드이지 법률이 아니다.**

마감, 레거시, 부분 플랫폼 지원, 스킬 수준 때문에 이상 설계가 항상 즉시 가능하지는 않습니다.

| 가이드 | 상세 |
| --- | --- |
| 좋은 설계로 이끌되 막지 말 것 | 타이트한 마감이면 합리적 지금 + 개선 경로 |
| 트레이드오프를 명시 | 무엇을 희생하는지, 언제 문제가 되는지 |
| 빅뱅 리팩터보다 점진 개선 | 쓰이며 가치 나는 약간 불완전한 Ontology > 미완성 완벽 설계 |
| 결정적 불변량 방어 | 네이밍·시맨틱 명확성·보안은 나중에 고치기 어렵다 |

Ontology는 조직을 구동하는 소프트웨어입니다. 프로덕션 코드베이스처럼 다루되, 완벽보다 **비즈니스 가치**를 우선하세요.

**이전:** [Interfaces / Metadata](https://www.palantir.com/docs/foundry/interfaces/interface-metadata/)  
**다음:** [Structural guidance](https://www.palantir.com/docs/foundry/ontology/ontology-structural-guidance/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

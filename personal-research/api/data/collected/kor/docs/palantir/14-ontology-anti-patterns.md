# Ontology design: Anti-patterns (번역)

# Ontology design: Anti-patterns

경험 많은 Ontology 설계자도 처음엔 합리적으로 보이지만 Ontology가 커지며 큰 문제를 만드는 설계 함정에 빠질 수 있습니다. 이 섹션은 반복되는 anti-patterns를 식별하고, 왜 발생하는지, 어떻게 피하거나 해결하는지 구체적인 가이드를 제공합니다.

이 anti-patterns를 피하면 비즈니스 도메인을 정확히 반영하고, 유지 부담을 줄이며, 강력한 교차 기능 워크플로를 가능하게 하는 Ontology를 구축하는 데 도움이 됩니다.

| Anti-pattern | 설명 | 해결 |
| --- | --- | --- |
| System Silos | 소스 시스템마다 별도 object types | 파이프라인에서 병합; 통합 object types |
| The Kitchen Sink | 불필요한 기술 컬럼을 properties로 | 의도적 큐레이션; ETL 메타데이터 제외 |
| Department Silos | 부서마다 공유 엔티티의 자체 버전 | 공유 object types; 부서 데이터는 properties/links |
| The God Object | 한 object type이 여러 뚜렷한 엔티티 | 별도 object types; 공유 특성은 interfaces |
| The Golden Hammer | 모든 문제에 한 도구만 과도 의존 | 작업에 맞는 도구 선택 |
| Action Sprawl | 단일 property actions를 과도 생성 | 의미 있는 비즈니스 연산으로 묶기 |
| The Time Machine | 이력을 별도 objects/types로 | 엔티티당 단일 현재 객체 + 이력/시계열 |
| The Misnomer | 모호·오해 소지 이름 | 구체·설명적 이름; 관계로 링크 명명 |

## Anti-pattern: System Silos

같은 실세계 엔티티를 **엔티티 자체**가 아니라 **데이터가 나온 소스 시스템** 기준으로 별도 object types로 만드는 경우입니다.

### Common causes

- 다른 팀이 다른 소스 시스템을 소유하고 독립 구축
- 다중 소스 병합 방법에 대한 불확실성
- 본질 결정 없이 시스템 특수 필드 보존 욕구

### Example

직원 데이터가 HR·배지·프로젝트 관리 세 시스템에 있을 때 `HR System Employee`, `Badge System Employee`, `Project Management Employee`를 각각 만드는 경우.

### Problems

| 문제 | 영향 |
| --- | --- |
| 파편화된 현실 뷰 | 직원 전체를 보려면 여러 타입 탐색 |
| 중복 노력 | actions·links·앱을 개념상 같은 엔티티에 여러 번 |
| 불일치 데이터 | 같은 직원 정보가 타입마다 충돌, 정본 없음 |
| 복잡한 유지 | 비즈니스 로직 변경을 모든 시스템별 타입에 복제 |

### Solution

실세계 엔티티를 나타내는 **단일 object type**을 만들고, 파이프라인으로 다중 소스를 **통합 backing dataset**으로 병합.

구현: (1) 시스템 간 유일 식별 기본 키 (2) 소스 조인 transform (3) 충돌 시 우선순위 (예: 직함은 HR) (4) 병합 데이터셋 백킹 단일 타입.

## Anti-pattern: The Kitchen Sink

외부 시스템의 불필요한 컬럼을 Ontology 맥락에서 비즈니스 관련 없이 모두 넣어, 기술 아티팩트로 모델을 어지럽히는 경우입니다(“만약을 위해 전부”).

### Common causes

- “나중에 쓸지도” 마인드
- 의미 있는 필드 불명확
- 큐레이션 없는 소스 직접 매핑
- 컬럼 제외 시 데이터 손실 두려움

### Example

CRM 연동 Customer에 customer_id·name·email(✓)과 함께 `_crm_extracted_at`, batch IDs, internal record id, last_etl_update 등(✗).

### Problems

| 문제 | 영향 |
| --- | --- |
| 혼란 | 기술 필드와 비즈니스 데이터 혼재 |
| 성능 저하 | 불필요 properties가 규모·인덱스·검색 비용 증가 |
| 인사이트 가림 | 중요 비즈니스 properties가 시스템 메타에 묻힘 |

### Solution

의도적 큐레이션. 워크플로에 명확한 비즈니스 의미·유용성이 있는 컬럼만.

| 포함 | 제외 |
| --- | --- |
| 비즈니스 식별자 | 파이프라인 메타데이터 |
| 사람이 읽는 속성 | 비즈니스 의미 없는 내부 시스템 ID |
| 비즈니스 프로세스 관련 날짜 | 데이터 엔지니어링 전용 타임스탬프 |
| 필터·actions용 상태 | 파이프라인 디버그 감사 컬럼 |

구현: “누가 이 값을 보거나 검색·필터할까?” 질문 → 기술 메타는 backing dataset에 두고 property 비노출 → 경계 properties는 visibility 숨김 → 존재 이유·사용자 문서화.

## Anti-pattern: Department Silos

부서가 같은 object type의 자체 버전을 만들어, 비즈니스 현실이 아니라 **조직 구조**를 미러하는 파편 Ontology.

### Common causes

- 교차 기능 조율 없이 고립 작업
- 각 팀이 자신의 고객 뷰가 고유하다고 믿음
- 거버넌스·중앙 설계 권한 부재
- “우리 데이터” 자율성 욕구

### Example

Sales Customer / Support Customer / Billing Customer / Marketing Contact — 모두 같은 실세계 고객.

### Problems

| 문제 | 영향 |
| --- | --- |
| 단일 정본 없음 | 부서 간 고객 정보 충돌 |
| 교차 기능 워크플로 불가 | “이 고객의 sales·support·billing 상호작용 전부” 같은 질문 어려움 |
| 중복 개발 | actions·links·앱 중복 |
| 거버넌스 악몽 | 품질 이슈 증폭; 한 타입 수정이 전파 안 됨 |

### Solution

여러 부서를 섬기는 **공유 object types**. 부서 특수 정보는 properties·links로.

구현: (1) 부서 경계를 넘는 엔티티 식별 (2) 교차 기능 워킹 그룹으로 공유 타입 정의 (3) 부서 속성은 shared objects 위 properties (4) 부서 특화 객체로 links (Customer→Support Ticket) (5) 다른 뷰 필요 시 object views / Workshop / OSDK (6) 팀 한정 properties는 restricted views.

## Anti-pattern: The God Object

하나의 object type이 여러 뚜렷한 실세계 엔티티를 과적해 bloated·혼란·유지 불가 타입이 되는 경우.

### Common causes

- 피상적 유사에 기댄 과추상화(“다 자산”)
- 타입 수 최소화 욕구
- 구축 전 엔티티 정의 부재
- 기존 타입에 유스케이스 스코프 크립

### Indicators

- 자주 null인 properties가 매우 많음
- property 의미가 type/category 값에 따라 변함
- “이 [Object]는 어떤 종류?”를 자주 물음
- 검증·비즈니스 규칙에 타입별 조건부 로직 과다

### Example

“가치 있는 모든 것”을 담은 `Asset` — 장비, 소프트웨어 라이선스, 부동산, 금융 상품, 직원(“human assets”)… 150+ properties, 대부분 null, value/location/status 의미가 종류마다 다름.

### Problems

시맨틱 혼란, sparse 데이터, 검증 불가, 검색 품질 저하, action 복잡도.

### Solution

뚜렷한 엔티티마다 별도 object types. 진짜 공유 특성·행동은 interfaces.

예: Equipment / Vehicle / Software License / Property / Financial Instrument + `Depreciable Asset` interface.

구현: (1) 현재 타입이 나타내는 뚜렷 엔티티 목록 (2) 각각 별도 타입 (3) 진짜 공유 식별 (4) interfaces (5) 기존 objects 마이그레이션.

## Anti-pattern: The Golden Hammer

모든 문제에 한 도구만 과도 의존. (“망치만 있으면 모든 게 못으로 보인다.”)

action types를 파이프라인 작업에, 파이프라인을 이벤트 반응에, functions를 단순 사전 계산에 쓰는 형태로 나타납니다.

### Common causes

- 익숙함·가시성으로 한 도구 과신
- 최종 사용자에게 계산 시점 “통제권” 주고 싶은 욕구
- 플랫폼 전체(파이프라인·automations·functions·스케줄) 미숙
- Ontology-first / pipeline-first / code-first 한 층만 생각

### Examples

- 대시보드 지역 매출 합계를 수동 `Calculate Regional Sales Totals` action으로 (→ 일일 집계 파이프라인)
- 알림 객체를 파이프라인으로 on-call 배정 쓰기를 섞음 (→ automation + Assign action)
- `fullName`을 function-backed로 (→ 파이프라인 concat)

### Problems

스케일 한계, 불필요 복잡성, 사용자 부담, 성능 문제, 디버깅 어려움.

### Solution — 도구 매칭

| 도구 | 적합한 경우 | 비적합 |
| --- | --- | --- |
| Action types | 인간 판단, 소수 objects 즉시 편집 | 배치 계산, 스케줄 갱신, 무인 이벤트 반응 |
| Pipelines (batch) | 배치 처리, 집계, 정화, 사전 계산 | 개별 object 실시간 반응, 인간 입력 로직 |
| Pipelines (streaming) | 지속 저지연 처리 | 드문 갱신, 인간 입력, Ontology 이벤트 반응(automations) |
| Automations | Ontology 변경 이벤트 반응, 무인 오케스트레이션 | 무거운 데이터 처리, 복잡한 다중 데이터셋 조인, 인간 판단 |
| Functions | 다중 objects 실시간 복잡 계산, 라이브 상태 의존 | 파이프라인 사전 계산 가능 단순 파생, 대용량 배치 |
| Schedules | 반복 빌드, 시간·이벤트 기반 데이터 갱신 | 개별 object 실시간 반응 |

구현 질문:

1. Action 전: 인간 판단/입력이 필요한가? 아니면 pipeline/automation.
2. Pipeline 전: 데이터 변환인가 운영 워크플로인가?
3. Function 전: 백킹 파이프라인에서 사전 계산 가능한가?
4. 폴링 파이프라인 전: automation이 이벤트를 직접 반응할 수 있는가? 지속 처리면 streaming.
5. 배치 기본 전: 지속적 신선도가 필요한가?

## Anti-pattern: Action Sprawl

의미 있는 비즈니스 연산이 아니라, 단일 property를 바꾸는 좁은 action types를 과도 생성.

### Common causes

- actions를 DB 컬럼 업데이트로 생각
- UX 전체 없이 점진 구축
- 여러 property 변경 번들 가능을 모름
- 전통 CRUD 모방

### Indicators

- object type당 action types 10개 초과
- 항상 순차 실행되는 여러 actions
- `Set [Property]` / `Update [Property]` 이름
- 사용자가 단계 과다를 불만

### Example

Employee에 Update First Name, Last Name, Email, Phone, Department, Manager… 20+ 단일 property actions.

### Problems

압도적 UX, 파편 워크플로, 비즈니스 비직관, 감사 추적 파편.

### Solution

비즈니스 연산 중심. 관련 변경을 의미 있는 워크플로로 묶기.

- Update Employee Contact Information (이름·이메일·전화)
- Transfer Employee to New Department (부서·매니저·위치·effectiveDate)
- Onboard New Employee (필수 필드 + 하류 워크플로)

구현: (1) 실제 비즈니스 프로세스 매핑 (2) 관련 property 변경 그룹화 (3) optional fields는 parameters (4) 비즈니스 연산 이름 (5) rules·validation으로 제약.

## Anti-pattern: The Time Machine

엔티티의 이력 버전을 별도 objects/types로 모델링하고, 시계열·스냅샷·버전 전략을 쓰지 않는 경우.

### Common causes

- 모든 변경 완전 보존 욕구
- Ontology 시간 데이터 모델링 오해
- 파일 버전(v1,v2) 멘탈 모델
- time series / linked history 패턴 미인지

### Indicators

- 같은 실세계 엔티티가 시점마다 여러 objects
- version/revision/isCurrent 속성
- object 수가 엔티티 수가 아니라 변경 수에 비례 증가
- 어떤 object를 참조·링크할지 혼란

### Example

Contract v1/v2/v3 별 objects, 또는 Contract 2023/2024/2025 연도별 object types. Vendor/Department 링크가 모든 버전에 복제.

### Problems

object 수 폭발, 현재 상태 모호, 링크 모호, 리포팅 복잡.

### Solution

엔티티당 **단일 현재 object**. 이력은 링크된 이력/개정 타입, edits history, 또는 time series properties.

예: 단일 Contract(currentValue, currentStatus…) → Links to Contract Amendments (amendmentDate, previous/new value, reason).

구현: (1) 현재 상태 properties를 가진 단일 object (2) 이력용 linked type (3) 빈번 변화 값에 time series (4) 감사 필요 시 backing dataset/edits history.

## Anti-pattern: The Misnomer

object types·properties·link types에 모호·일반적·오해 소지 이름을 써서 해석이 갈리는 경우.

### Common causes

- 자신만 아는 약어
- 소스 컬럼명 번역 없이 이식
- 명확성보다 짧은 이름
- 네이밍 컨벤션·거버넌스 부재
- 맥락이 의미를 메워 줄 것이라는 가정

### Indicators

- “이 property가 뭐지?” / “어떤 종류의 [Object]?” 질문 빈번
- 같은 이름이 여러 개념에 타당
- value/type/status/date/name 같은 단일 일반 단어
- “related to” 같은 모호 링크 라벨

### Example

Item, value, type, date, Item→Related Item — 사용자가 추측하거나 문서를 파야 함.

### Problems

오해석, 가파른 학습 곡선, 문서 의존, 팀 간 다른 해석.

### Solution

구체·설명적, 자기 문서화 이름.

- Item → Product / Sales Order Line Item / Warehouse Inventory Record
- value → monetaryValue / quantityOnHand / riskScore
- type → productCategory / serviceTier
- date → orderPlacedDate / contractEffectiveDate
- Related Item → Purchasing Customer / Supervisor / Manufacturing Facility

구현: (1) 구축 전 네이밍 컨벤션 + 거버넌스 (2) 구체 이름 (3) 모호 properties 한정 (4) 관계로 링크 이름 (5) 설명·허용 값 문서화 (6) 최종 사용자와 검토.

## Building a successful Ontology

이 가이드의 anti-patterns는 흔하지만 피할 수 있습니다. 현실을 모델링하고, properties를 의도적으로 큐레이션하며, 팀 간 협업하고, 작업에 맞는 도구를 선택하는 근본 best practices에 집중하면 조직 필요에 맞춰 확장되는 Ontology를 만들 수 있습니다.

효과적 Ontology 설계는 **반복적**입니다. 명확한 엔티티 정의로 시작하고, 이해관계자를 일찍 참여시키며, 작동하는 것을 배우 모델을 다듬으세요. 어려움이 생기면 이 가이드의 원칙으로 anti-pattern 징후를 식별하고, 바꾸기 어려워지기 전에 코스를 수정하세요.

**이전:** [Structural guidance](https://www.palantir.com/docs/foundry/ontology/ontology-structural-guidance/)  
**다음:** [Ontology search / Semantic search](https://www.palantir.com/docs/foundry/ontology/overview-semantic-search/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

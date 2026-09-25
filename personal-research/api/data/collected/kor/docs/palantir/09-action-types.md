# Action types — Overview (번역)

# Action types

Ontology에서 사용자는 **actions**를 적용해 objects, properties, links를 변경할 수 있습니다. Action은 사용자 정의 로직에 따라 하나 이상의 objects의 properties를 바꾸는 **단일 트랜잭션**입니다. Actions는 개별 property 편집이 아니라 **전체 목표** 관점에서 데이터를 다루게 합니다.

**Action type**은 사용자가 한 번에 수행할 수 있는 objects·property values·links 변경/편집 집합의 정의이며, action 제출 시 사이드 이펙트 동작도 포함합니다.

**예시:**

`Assign Employee` action type을 만들어 주어진 `Employee` object의 `role` property 값을 바꾸는 방식을 정의할 수 있습니다. 새 role을 표준 폼으로 입력하는 parameter 정의가 필요할 수 있고, `Employee`와 새 `Manager` 사이 link를 자동 생성하는 rules를 포함할 수 있습니다.

Action은 또한:

- 이전·신규 manager에게 알리는 notification side effect를 포함할 수 있고
- 인사(HR) 등 인가된 직원만 수행할 수 있도록 검증할 수 있습니다

이렇게 설정되면 HR 직원은 예를 들어 “Melissa Chang”을 “Product Manager” `role`로 바꾸는 action을 실행할 수 있습니다.

Foundry Ontology는 추상 모델이 아니라 조직의 실제 데이터에 매핑되어 실세계 애플리케이션을 구동합니다. 사용자 의사결정과 인사이트가 Ontology 편집 형태로 캡처되면서 데이터 자산의 풍부함과 가치가 커집니다.

사용자가 action을 취하면 objects·property values·links에 대한 변경이 Ontology에 커밋되고 **모든 사용자 애플리케이션**에 반영됩니다. 동일한 action 로직과 검증이 모든 사용자 대면 앱에서 공유되어 일관된 편집을 보장합니다. 사용자 편집이 반영된 최신 object 데이터는 object type의 **writeback dataset**에 캡처됩니다.

시작하기: [create an action type](https://www.palantir.com/docs/foundry/action-types/getting-started/), [rules](https://www.palantir.com/docs/foundry/action-types/rules/), [parameters](https://www.palantir.com/docs/foundry/action-types/parameter-overview/), [submission criteria](https://www.palantir.com/docs/foundry/action-types/submission-criteria/).

**이전:** [Object and link types / Marketplace](https://www.palantir.com/docs/foundry/object-link-types/marketplace-ontology-types/)  
**다음:** [Getting started](https://www.palantir.com/docs/foundry/action-types/getting-started/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

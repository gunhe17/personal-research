# Link types — Overview (번역)

# Link types

**Link type**은 두 object type 사이 **관계의 스키마 정의**입니다. **Link**는 같은 Ontology 안에서 두 objects 사이 그 관계의 단일 인스턴스입니다.

예를 들어 Ontology Manager에서 `Employee`와 `Company` 사이에 Employee–Employer 관계를 정의하는 link type을 만들 수 있습니다. Link는 그 관계의 한 인스턴스, 예를 들어 직원 “Melissa Chang”과 고용주 “Acme, Inc.”의 관계입니다.

마찬가지로 `Flight`와 `Aircraft` 사이에 Scheduled Flight–Assigned Aircraft 관계를 정의할 수 있습니다. Link는 “JFK → SFO 24-02-2021”과 배정 항공기 “Boeing 737-123”의 관계입니다.

같은 타입의 두 objects 사이에도 links가 있을 수 있습니다. `Employee` 자신에 대해 `Direct Report ↔ Manager` link type을 정의할 수 있습니다.

**다른 Ontology에 걸친** object type 간 links는 지원되지 않습니다. 이 경우 shared Ontology를 사용하는 편이 낫습니다.

## Directionality

Link type은 **양방향**입니다. 관계를 맺는 두 object type 각각에 대해 하나의 **side**가 있으며, 각 side는 독립적으로 순회할 수 있고 자체 display name과 [API name](https://www.palantir.com/docs/foundry/functions/api-objects-links/)을 가집니다. 예: 단일 `Flight ↔ Aircraft` link type은 `Flight` side와 `Aircraft` side를 포함합니다. 코드에서 `flight.assignedAircraft.get()`는 Aircraft side를 순회해 항공편에 배정된 항공기를 가져오고, `aircraft.flights.all()`는 Flight side를 순회해 해당 항공기에 배정된 항공편을 가져옵니다.

> **Note:** 두 object type 사이에 link type 하나를 만든다고 해서 별도의 “역방향” link type이 암묵적으로 생기지 않습니다. 그 하나의 link type이 이미 두 side를 통해 양방향 순회를 지원하므로, `Aircraft`→`Flight`와 `Flight`→`Aircraft`를 각각 따로 정의할 필요가 없습니다.

같은 두 object type 사이에 **서로 다른** link type을 여러 개 둘 수는 있습니다. 각각은 기존 관계의 역방향이 아니라 **별개의 실세계 관계**를 나타냅니다. 예: 배정 항공기를 나타내는 `Flight ↔ Aircraft` 외에, 예정 정비 기록을 나타내는 또 다른 `Flight ↔ Aircraft` link type. 각 link type의 side에는 애플리케이션이 구분할 수 있도록 고유한 [API names](https://www.palantir.com/docs/foundry/object-link-types/create-link-type/#define-link-type-names)가 필요합니다.

데이터셋 비유: link type ≈ 두 데이터셋의 join, link ≈ 조인된 한 행 쌍. 예: `Employee`와 `Company`를 조인해 “Melissa Chang”–“Acme, Inc.” 행이 하나의 link를 나타냅니다.

Foundry Ontology는 실제 데이터에 매핑됩니다. Links는 link type이 참조하는 object types에 Ontology Manager에서 backing datasources를 추가하여 생성·표시됩니다. many-to-many 관계의 경우 datasources가 link types 자체를 백킹할 수 있습니다. `Employee → Employer` links를 만들려면 `Employee`와 `Company` object types에 backing datasources를 추가하고 직원 디렉터리 등을 Ontology에 연결합니다.

시작하기: [create a new link type](https://www.palantir.com/docs/foundry/object-link-types/create-link-type/).

**이전:** [Shared properties / Metadata reference](https://www.palantir.com/docs/foundry/object-link-types/shared-property-metadata/)  
**다음:** [Create a link type](https://www.palantir.com/docs/foundry/object-link-types/create-link-type/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

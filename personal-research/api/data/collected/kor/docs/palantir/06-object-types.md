# Object types — Overview (번역)

# Object types

**Object type**은 실세계 엔티티 또는 이벤트의 **스키마 정의**입니다.  
**Object**(또는 object instance)는 object type의 단일 인스턴스이며, 하나의 실세계 엔티티/이벤트에 대응합니다.  
**Object set**는 여러 object 인스턴스의 모음, 즉 실세계 엔티티/이벤트 그룹입니다.

예를 들어 Ontology Manager에서 `Employee` object type을 만들면 “모든 직원” 또는 그 타입의 모든 objects에 대한 특성을 정의합니다. Object는 `Employee` object type의 단일 인스턴스, 예를 들어 “Melissa Chang”, “Akriti Patel”, “Diego Rodriguez” 같은 가상의 직원입니다. “모든 정규 근속 직원” 같은 그룹은 object set입니다.

마찬가지로 `Flight` object type은 “모든 항공편”의 특성을 정의합니다. Object는 “JFK → SFO 2021-02-24” 또는 “TLV → LHR 2020-04-16” 같은 단일 항공편입니다. “모든 도착 완료 항공편”은 object set입니다.

Ontology의 기반 개념은 데이터셋 구조와 유사합니다. Ontology에서 object type의 정의는 데이터셋에, object의 정의는 데이터셋의 한 행에 비유됩니다. Object set의 정의는 필터링된 행 집합에 비유됩니다. 예를 들어 `Employee` 데이터셋은 “모든 직원 행”의 스키마를 정의하고, 한 행은 “Melissa Chang” 같은 단일 직원을 가리킵니다. tenure 기준으로 필터하면 “모든 정규 근속 직원”을 나타내는 행 집합을 얻습니다.

Foundry Ontology는 추상 데이터 모델에 그치지 않고, 각 ontology 개념을 조직의 **실제 데이터**에 매핑하여 실세계 애플리케이션을 구동합니다. Objects는 Ontology Manager에서 object type에 **backing datasources**를 추가하여 생성·표시됩니다. `Employee` 타입 objects를 만들려면 `Employee` object type에 backing datasources를 추가하고 직원 디렉터리 등 엔터프라이즈 데이터를 Ontology에 연결합니다.

시작하기: [create an object type](https://www.palantir.com/docs/foundry/object-link-types/create-object-type/).

**이전:** [Types reference](https://www.palantir.com/docs/foundry/object-link-types/type-reference/)  
**다음:** [Create an object type](https://www.palantir.com/docs/foundry/object-link-types/create-object-type/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

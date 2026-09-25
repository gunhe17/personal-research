# Core concepts (번역)

# Core concepts

이 페이지는 Foundry Ontology와 관련된 주요 개념을 설명합니다.

## Ontology

Ontology는 세계를 분류하는 체계입니다. Foundry에서 Ontology는 조직의 **디지털 트윈**으로, 조직의 디지털 자산(datasets와 models)을 하나의 일관된 전체로 통합합니다. Foundry Ontology는 datasets와 models를 object types, properties, link types, action types에 매핑하여 조직 세계의 완전한 그림을 만듭니다.

- [object type](#object-type)은 조직의 엔티티 또는 이벤트를 정의합니다.
- [property](#property)는 object type의 특성을 정의합니다.
- [link type](#link-type)은 두 object type 사이의 관계를 정의합니다.
- [action type](#action-type)은 object type이 어떻게 수정될 수 있는지를 정의합니다.

Ontology를 구성하는 개념은 데이터셋 구조와 대응됩니다. 각 object type을 데이터셋에 비유할 수 있고, object는 object type의 인스턴스이며 데이터셋의 한 행과 같습니다. 데이터셋의 컬럼은 object의 properties에 해당합니다. 필드 값(스프레드시트 셀)은 property value와 유사합니다. 데이터셋이 다양한 방식으로 조인되듯, objects도 property 값을 기준으로 links를 가질 수 있습니다.

| Datasets | Ontology |
| --- | --- |
| Dataset | Object type |
| Row | Object |
| Column | Property |
| Field | Property value |
| Join | Link type |

아래 다이어그램은 이 개념들이 모여 Ontology를 이루는 방식을 보여 줍니다.

![Aviation Ontology](https://www.palantir.com/docs/resources/foundry/ontology/airline-ontology.png)

## Object type

**Object type**은 실세계 엔티티 또는 이벤트의 **스키마 정의**입니다. **Object**는 object type의 단일 인스턴스이며, 하나의 실세계 엔티티/이벤트에 대응합니다. **Object set**는 여러 object 인스턴스의 집합, 즉 실세계 엔티티/이벤트 그룹입니다.

[object types 더 보기](https://www.palantir.com/docs/foundry/object-link-types/object-types-overview/)

## Property

Object type의 **property**는 실세계 엔티티/이벤트 특성의 스키마 정의입니다. **Property value**는 어떤 object 위 그 property의 값입니다.

[properties 더 보기](https://www.palantir.com/docs/foundry/object-link-types/properties-overview/)

## Shared property

**Shared property**는 ontology 안 여러 object type에서 사용할 수 있는 property입니다. object type 간 일관된 데이터 모델링과 property 메타데이터의 중앙 관리를 가능하게 합니다.

[shared properties 더 보기](https://www.palantir.com/docs/foundry/object-link-types/shared-property-overview/)

## Link type

**Link type**은 두 object type 사이 관계의 스키마 정의입니다. **Link**는 그 관계의 단일 인스턴스입니다.

[link types 더 보기](https://www.palantir.com/docs/foundry/object-link-types/link-types-overview/)

## Action type

**Action type**은 사용자가 한 번에 수행할 수 있는 objects·property values·links에 대한 변경/편집 집합의 스키마 정의입니다. action 제출 시 발생하는 사이드 이펙트 동작도 포함합니다. Ontology에 action type이 구성되면 최종 사용자는 actions를 적용해 objects를 변경할 수 있습니다.

[action types 더 보기](https://www.palantir.com/docs/foundry/action-types/overview/)

## Roles

**Roles**는 Ontology의 핵심 권한 모델입니다. Foundry 파일시스템 roles와 유사하게, Ontology roles는 ontology 리소스에 대한 접근을 부여합니다. Roles는 Ontology 수준 또는 개별 리소스 수준에서 부여할 수 있습니다.

[Ontology roles](https://www.palantir.com/docs/foundry/object-permissioning/ontology-permissions/) 및 object types·link types·action types에서의 사용.

## Functions

**Function**은 입력 파라미터를 받아 출력을 반환하는 코드 기반 로직입니다. Functions는 Ontology와 네이티브하게 통합됩니다. objects와 object sets를 입력으로 받고, object property 값을 읽으며, Ontology 위에 구축된 action types와 applications 전반에서 사용될 수 있습니다.

[Functions 일반](https://www.palantir.com/docs/foundry/functions/overview/), [Ontology 기반 Functions](https://www.palantir.com/docs/foundry/functions/functions-on-objects/).

## Interfaces

**Interface**는 object type의 shape와 능력을 기술하는 Ontology 타입입니다. 공통 shape를 공유하는 object type들에 대한 일관된 모델링·상호작용(다형성)을 제공합니다.

[interfaces](https://www.palantir.com/docs/foundry/interfaces/interface-overview/)

## Object Views

**Object Views**는 특정 object와 관련된 모든 정보와 워크플로의 중심 허브입니다. object의 핵심 정보, 연결된 objects, 관련 메트릭, 분석·대시보드·애플리케이션 등을 포함합니다.

[Object Views 더 보기](https://www.palantir.com/docs/foundry/object-views/overview/)

**이전:** [Models in the Ontology](https://www.palantir.com/docs/foundry/ontology/models/)  
**다음:** [Ontology-aware applications](https://www.palantir.com/docs/foundry/ontology/applications/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

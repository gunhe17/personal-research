# Interfaces — Overview (번역)

# Interfaces

**Interface**는 object type의 **형태(shape)** 와 **능력**을 기술하는 Ontology 타입입니다. 공통 shape를 공유하는 object type들에 대해 일관된 모델링과 상호작용을 가능하게 합니다. 예: `Facility` interface가 `Facility Name`, `Location` properties를 포함하고, `Airport`, `Manufacturing Plant`, `Maintenance Hangar` 같은 object type들이 이를 implement하며 각자 타입 고유 properties를 추가로 가질 수 있습니다.

![An example of a `Facility` interface.](https://www.palantir.com/docs/resources/foundry/interfaces/interface-example.png?width=800)

`Facility` interface를 쓰면 워크플로는 `Airport`, `Manufacturing Plant`, `Maintenance Hangar`의 세부 타입을 몰라도 집계적으로 또는 개별적으로 상호작용할 수 있습니다. 또한 `Facility`를 implement하는 새 object type이 추가되어도 워크플로는 추가 리팩터 없이 즉시 호환됩니다.

플랫폼에서 interfaces를 쓸 수 있는 위치: [current levels of support](https://www.palantir.com/docs/foundry/interfaces/interface-overview/#current-levels-of-support).

## Interface features

Interface는 다음으로 구성됩니다.

- interface properties
- [link type constraints](https://www.palantir.com/docs/foundry/interfaces/interface-link-types-overview/)
- [action type constraints](https://www.palantir.com/docs/foundry/interfaces/interface-action-type-constraints/)
- [metadata](https://www.palantir.com/docs/foundry/interfaces/interface-metadata/)

Interface properties는 interface에 로컬로 정의하는 것(권장) 또는 [shared properties](https://www.palantir.com/docs/foundry/object-link-types/shared-property-overview/)를 사용할 수 있습니다. 하나의 interface는 여러 object type이 implement할 수 있습니다.

프로그래밍 언어의 interface처럼, [interface를 extend](https://www.palantir.com/docs/foundry/interfaces/extend-interface/)하여 원본 properties를 상속한 뒤 더 구체적인 properties를 추가한 child interface를 만들 수 있습니다. Object type은 [interface를 implement](https://www.palantir.com/docs/foundry/interfaces/implement-interface/)하여 정의에 부합함을 나타냅니다. Object type은 여러 interfaces를 implement할 수 있고, interfaces도 다른 interfaces를 다중 확장할 수 있어 계층적으로 properties가 상속됩니다.

## Differences between interfaces and object types

| | Object type | Interface |
|--|-------------|-----------|
| 성격 | 구체적(concrete) | 추상적(abstract) |
| 스키마 | shared/local properties | interface properties |
| 데이터 백킹 | datasets로 property values 보유 | datasets로 백킹되지 않음 |
| 인스턴스화 | objects로 가능 | 직접 불가 — 구체 object type으로만 |

시각적으로 interfaces는 아이콘 주변에 **점선**이 있어 object types와 구분됩니다.

![Example interface icon](https://www.palantir.com/docs/resources/foundry/interfaces/interface-icon-example.png?width=100)

## Interface permissions

Interfaces는 [Ontology roles](https://www.palantir.com/docs/foundry/object-permissioning/ontology-permissions-legacy/#ontology-roles)로 권한 관리됩니다.

## Current levels of support

Interface Ontology 타입 지원은 플랫폼 전반에서 확장 중이며, 가용성은 제품마다 다릅니다.

**현재 지원:**

- **[Ontology Manager](https://www.palantir.com/docs/foundry/ontology-manager/overview/):** 정의·편집·implement
- **[Marketplace](https://www.palantir.com/docs/foundry/marketplace/overview/):** 패키징·설치
- **[Functions](https://www.palantir.com/docs/foundry/functions/overview/):** TypeScript v2 functions

**부분 지원:**

- **[Actions](https://www.palantir.com/docs/foundry/action-types/overview/):** interface를 implement한 objects 생성·수정·삭제·링크. interface action type constraints는 beta
- **[Object Set Service](https://www.palantir.com/docs/foundry/object-backend/overview/#object-set-service-oss):** interface로 검색·정렬. 집계·interface link types 지원은 개발 중
- **[Ontology SDK](https://www.palantir.com/docs/foundry/ontology-sdk/overview/):** implement하는 object types와 상호작용하는 API 층. TypeScript 지원, Java/Python 개발 중

**아직 미지원 (활발히 개발 중):**

- **[Workshop](https://www.palantir.com/docs/foundry/workshop/overview/)**
- **[Functions](https://www.palantir.com/docs/foundry/functions/overview/):** TypeScript v1 및 Python functions

## Get started with interfaces

[create](https://www.palantir.com/docs/foundry/interfaces/create-interface/) 또는 [extend](https://www.palantir.com/docs/foundry/interfaces/extend-interface/)로 interfaces를 추가한 뒤, 적절한 shape의 object type으로 [implement](https://www.palantir.com/docs/foundry/interfaces/implement-interface/)하거나 Ontology 진화에 맞게 [edit](https://www.palantir.com/docs/foundry/interfaces/edit-interface-definition/)할 수 있습니다.

**이전:** [Functions / Unit testing / Debug](https://www.palantir.com/docs/foundry/functions/unit-test-debugging/)  
**다음:** [Create an interface](https://www.palantir.com/docs/foundry/interfaces/create-interface/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

# Ontology building — Overview (번역)

# Ontology building

Palantir **Ontology**는 조직을 위한 **운영 레이어(operational layer)** 입니다. Ontology는 Palantir 플랫폼에 통합된 디지털 자산([datasets](https://www.palantir.com/docs/foundry/data-integration/datasets/), [virtual tables](https://www.palantir.com/docs/foundry/data-integration/virtual-tables/), [models](https://www.palantir.com/docs/foundry/integrate-models/integrate-overview/)) **위**에 자리하며, 공장·장비·제품 같은 물리적 자산부터 고객 주문·금융 거래 같은 개념까지 **현실 세계의 대응물**과 연결합니다. 많은 환경에서 Ontology는 조직의 **디지털 트윈** 역할을 하며, 다양한 유스케이스를 가능하게 하는 **시맨틱 요소**(objects, properties, links)와 **키네틱 요소**(actions, functions, dynamic security)를 모두 포함합니다.

## Object and link types

조직의 의미를 정의하는 일은 기존 데이터 소스를 Ontology의 **objects, properties, links**로 매핑하는 과정입니다. 데이터 카탈로깅이나 스키마 설계를 훨씬 넘어, Ontology는 모든 필드에 대한 풍부한 메타데이터와 변경에 대한 세분화된 보안·거버넌스를 갖춘, 최종 사용자 워크플로의 견고한 기반을 정의할 수 있게 합니다.

시맨틱 요소 작성: [object types](https://www.palantir.com/docs/foundry/object-link-types/object-types-overview/), [link types](https://www.palantir.com/docs/foundry/object-link-types/link-types-overview/).

## Action types and functions

조직의 **키네틱스**(변화를 가능하게 하면서 조직 통제와 거버넌스를 준수)는 Ontology에서 **action types**와 **functions**로 정의됩니다. Action types는 운영 담당자로부터 데이터를 수집하거나 기존 시스템과 연결되는 의사결정 프로세스를 오케스트레이션할 수 있게 하고, functions는 임의 복잡도의 비즈니스 로직을 작성·진화시키는 수단을 제공합니다.

키네틱 요소 작성: [action types](https://www.palantir.com/docs/foundry/action-types/overview/), [functions](https://www.palantir.com/docs/foundry/functions/overview/).

## Interfaces

**Interface**는 object type의 형태(shape)와 능력을 기술하는 Ontology 타입입니다. Interfaces는 공통 shape를 공유하는 object type들에 대해 일관된 모델링과 상호작용을 가능하게 하는 **다형성(polymorphism)** 을 제공합니다.

더 보기: [interfaces](https://www.palantir.com/docs/foundry/interfaces/interface-overview/).

## Powering decision-making

Ontology에 투자하는 목표는 조직 규모에서 **더 나은 의사결정**을 가능하게 하는 것입니다. 이를 위해 Ontology는 Palantir의 사용자 대면 분석·운영 도구에 깊이 통합되어 있습니다. 사용자는 재사용 가능한 Object Views를 만들고, Object Explorer에서 관심 객체를 검색하며, Quiver에서 복잡한 분석을 수행하고, Workshop에서 고품질 애플리케이션을 구축하는 등 다양한 작업을 할 수 있습니다.

[사용자 대면 애플리케이션에서 Ontology를 활용하는 방법](https://www.palantir.com/docs/foundry/ontology/applications/)

Palantir Learning portal: 이론을 익힌 뒤, [learn.palantir.com](http://learn.palantir.com/deep-dive-creating-your-first-ontology) 코스에서 첫 Ontology 구축을 시작할 수 있습니다.

**다음:** [Why create an Ontology?](https://www.palantir.com/docs/foundry/ontology/why-ontology/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

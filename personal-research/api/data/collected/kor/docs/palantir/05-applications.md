# Ontology-aware applications (번역)

# Ontology-aware applications

Foundry에는 Ontology 위에서 네이티브로 동작하도록 개발된 여러 애플리케이션이 있습니다. 이 object-aware 애플리케이션들은 다양한 유스케이스와 사용자 프로필을 지원하는 강력한 분석·운영 플랫폼을 함께 제공합니다.

Ontology 설정과 object-aware 애플리케이션 사용의 가치: [Why create an Ontology?](https://www.palantir.com/docs/foundry/ontology/why-ontology/).

이 페이지는 사용 가능한 애플리케이션 레퍼런스와 사용 시점을 설명합니다.

- [Application reference](#application-reference)
- [Application comparison](#application-comparison)

## Application reference

### Object Views

[**Object Views**](https://www.palantir.com/docs/foundry/object-views/overview/)는 특정 object와 관련된 모든 정보·워크플로의 **중심 허브**입니다. object의 핵심 “전기 데이터”, 연결된 objects, 주요 메트릭, 관련 분석·대시보드·앱으로의 링크(또는 임베드)를 포함합니다.

예: `Airport` object type의 object view는 각 `Airport` object에 대해 다음을 제공할 수 있습니다.

- `country`, `city`, `longitude`, `latitude` 등 전기 데이터
- 해당 `Airport`에 연결된 모든 `Aircraft`·`Flight` objects의 360도 뷰
- 임베드된 `Airport Covid Response` 워크플로
- 관련 `Flight delay` 이벤트의 `Root-Cause Analysis` 링크

![Object View Hub Example](https://www.palantir.com/docs/resources/foundry/ontology/object-apps-object-view-hub.png)

### Object Explorer

[**Object Explorer**](https://www.palantir.com/docs/foundry/object-explorer/overview/)는 Ontology 레이어의 무엇이든 질문하는 **검색·분석 도구**입니다. 사용자는 단순 필터부터 Search Arounds까지 시각적으로 검색 질의를 구성해 관심 objects를 찾습니다. 결과 object sets를 exploration view로 탐색하거나 테이블로 보고, object sets를 비교·대조하며 bulk Actions(예: writeback)를 취할 수 있습니다. 이후 object sets를 내보내거나 Workshop 등 호환 앱에서 열 수 있습니다.

Exploration view는 차트·맵 등 사전 설정·구성 가능한 시각화 집합으로, 특정 부분 집합으로 drill-down할 수 있습니다. Object Explorer는 사전 구성이 필요 없고 덜 기술적인 사용자에게 맞춰져 있습니다.

![Object Explorer](https://www.palantir.com/docs/resources/foundry/ontology/object-apps-oe.png)

### Quiver

[**Quiver**](https://www.palantir.com/docs/foundry/quiver/overview/)는 시각적 point-and-click 인터페이스와 강력한 차트 라이브러리로 Ontology 레이어의 **고급 분석 워크플로**를 가능하게 합니다. 단순 선형 drill-down부터 집계·통계 함수를 쓰는 고분지 복합 분석까지 지원하며, 네이티브 시계열 분석도 지원합니다. Quiver 분석은 더 넓은 소비를 위해 읽기 전용 대시보드로 템플릿화할 수 있습니다.

![Quiver](https://www.palantir.com/docs/resources/foundry/ontology/object-apps-quiver.png)

### Workshop

[**Workshop**](https://www.palantir.com/docs/foundry/workshop/overview/)는 Ontology 레이어 위에서 **코드 없는 point-and-click 앱 구축**을 가능하게 합니다. Workshop 앱은 다른 point-and-click 도구의 일반 대시보드보다 더 동적·상호작용적입니다.

고품질 [Layouts](https://www.palantir.com/docs/foundry/workshop/concepts-layouts/)와 쓰기 쉽지만 정교한 [Events system](https://www.palantir.com/docs/foundry/workshop/concepts-events/)을 활용해, Workshop 앱은 커스텀 React 앱만큼 사용하기 쉽고 높은 품질을 목표로 합니다.

![Workshop Editor View](https://www.palantir.com/docs/resources/foundry/ontology/object-apps-workshop-editor-view.png)

![Final Workshop Module](https://www.palantir.com/docs/resources/foundry/ontology/object-apps-workshop-module.png)

### Slate

[**Slate**](https://www.palantir.com/docs/foundry/slate/overview/)는 Workshop보다 **더 많은 기술 구성과 코드**가 필요한 유연한 앱 빌더입니다. Slate 앱은 Ontology 레이어와 상호작용하며 Foundry datasets에 직접 상호작용할 수도 있습니다. 웹 개발 패러다임 기반의 상당한 시각 커스터마이징과 넓은 기능을 제공하지만, 구축·유지에 Workshop보다 더 많은 기술 지식이 필요합니다.

![Slate Editor View](https://www.palantir.com/docs/resources/foundry/ontology/object-apps-slate-editor-view.png)

![Slate Application View](https://www.palantir.com/docs/resources/foundry/ontology/object-apps-slate-app-view.png)

### Carbon

[**Carbon**](https://www.palantir.com/docs/foundry/carbon/overview/)은 Foundry의 여러 리소스·앱을 결합해 운영 사용자를 위한 **고도로 큐레이션된 workspaces**를 만듭니다. 대시보드 같은 분석 결과, Workshop/Slate 앱, Object Views·Object Explorer 같은 기본 기능을 결합해 워크플로 빌더가 “last mile” 커스터마이징으로 최종 사용자에 맞춘 경험을 만들 수 있습니다.

![Carbon workspace](https://www.palantir.com/docs/resources/foundry/ontology/carbon-workspace.png)

### Map

[**Map**](https://www.palantir.com/docs/foundry/map/overview/) 애플리케이션은 objects와 기타 데이터를 **지리공간 맥락**에서 모아 분석하게 합니다.

![Map Application](https://www.palantir.com/docs/resources/foundry/ontology/map-overview.png)

## Application comparison

Object-aware 애플리케이션은 여러 차원에서 다릅니다. 특히 중요한 세 차원:

- [주요 유스케이스](#use-cases)
- [워크플로 스타일](#workflow-style)
- [구성 모델](#configuration-model)

| Foundry Application | 주요 유스케이스 | Workflow Style | Configuration Model | Objects 또는 Datasets |
| --- | --- | --- | --- | --- |
| Object Views | Discovery | Workflow-specific | Walk-up usable | Objects |
| Object Explorer | Discovery & Analysis | Exploratory | Walk-up usable | Objects |
| Quiver | Analysis & Dashboards | Exploratory (Analytical); workflow-specific (Dashboard) | Walk-up (Analytical); customizable (Dashboard) | Objects |
| Workshop | Applications & Dashboards | Workflow-specific | Customizable | Objects |
| Slate | Applications & Dashboards (complex) | Workflow-specific | Customizable | Objects (권장) 및 Datasets |
| Map | Geospatial | Exploratory 또는 Workflow-specific | Walk-up usable | Objects |

### Use cases

주요 유스케이스: **Discovery**, **Analysis**, **Dashboards**, **Applications**.

- **Discovery** — 올바른 정보·워크플로 찾기. 큐레이션된 콘텐츠 허브(랜딩/360 뷰)와 검색(자유 텍스트, 링크 순회·drill-down)이 핵심.
- **Analysis** — 단순(*특정 제품 평균 고객 유지율*)부터 매우 복잡(*세 코호트의 유지율·매출 시계열 비교*)까지 넓은 질문에 답. 경로가 탐색적이며 사용자가 정의하고 반복적으로 확장.
- **Dashboards** — 사전 구성된 시각화 집합. 주로 읽기 전용으로 더 넓은 소비자 사용자에게 소비. 의미 있는 *Analysis*를 정기 리포팅·운영 모니터링으로 전환. 차트 중심이며 *Applications*만큼 커스터마이징·상호작용적이지 않음. 종종 파라미터로 부분 집합 필터.
- **Applications** — 특정 사용자 그룹의 특정 문제를 위한 상호작용 커스텀 운영 UI. 대시보드보다 복잡하고 on-rails 워크플로 지향. 결정에 필요한 큐레이션 분석 콘텐츠와 함께 워크플로 요소·사용자 입력(writeback 등)을 포함.

### Workflow style

- **Exploratory applications** — “builder” 사전 구성 없이, 데이터가 Ontology에 모델링되면 최종 사용자가 즉시 사용. 사용자가 분석 경로를 정의하고 사전 정해지지 않은 넓은 질문에 답. 검색·시각화·변환 기능 포함. 대표: Object Explorer, Quiver.
- **Workflow-specific applications** — 최종 사용자 사용 전 builder 사전 구성 필요. (1) 대시보드/앱을 구성하는 builder 그룹, (2) 다운스트림 최종 사용자. Workshop·Slate 모듈은 edit 모드에서 Builder가 사전 구성.

Quiver처럼 둘 다 수용하는 앱도 있음. 기본 모드는 exploratory이지만 출력을 더 넓게 소비되는 workflow-specific 아티팩트(Quiver Dashboards)로 게시 가능.

### Configuration model

- **Walk-up usable** — 거의 구성 없이 즉시 효과적 사용. 예: Object Explorer는 Ontology 정의 후 즉시 사용 가능.
- **Customizable** — 특정 문제를 푸는 UI를 구현하기 위한 선행 투자(종종 별도 builder)와 높은 유지 비용. 대신 fit-for-purpose. 예: Workshop, Slate.

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

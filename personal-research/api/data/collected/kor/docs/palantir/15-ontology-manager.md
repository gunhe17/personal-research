# Ontology Manager — Overview (번역)

# Ontology Manager

**Ontology Manager**(Ontology Management Application, OMA라고도 함)는 조직 Ontology를 **구축·유지**하게 합니다. 새 object type 생성, action type 정의, Ontology에 데이터 연결, 사용자 앱에서 데이터가 갱신되는지 조사 등 Ontology 관련 폭넓은 활동을 지원합니다.

## Accessing the application

접근 방법 세 가지:

- Workspace 사이드바 **Apps** 섹션에서 **Ontology Manager** 아이콘 선택
- Data Lineage에서 object type 우클릭 → **Configure object type**
- Foundry 홈 URL 끝에 `/workspace/ontology` 추가 (예: `https://example.website.com/workspace/ontology`)

## User interface

문서 전반에서 참조되는 UI 요소:

- [Ontology Manager navigation](#ontology-manager-navigation)
- [Discover view](#discover)
- [Object type view](#object-type-view)
- [Property editor view](#property-editor-view)
- [Link type view](#link-type-view)
- [Action type view](#action-type-view)
- [Function type view](#function-type-view)

### Ontology Manager navigation

상단 바와 사이드바가 상주 네비게이션입니다. 상단 바: Ontology 리소스 검색, 새 리소스 생성, 브랜치 이동/생성. 사이드바: Ontology Manager 내 리소스·페이지·앱 탐색.

![Ontology Manager annotated view.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-navigation-annotated.png)

### Discover

Discover view는 선호에 맞춘 고도로 커스터마이즈 가능한 랜딩 페이지입니다. 기본으로 즐겨찾기 object types, 최근 본 object types, 즐겨찾기 groups를 보여 줍니다.

![Ontology Manager Discover view.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-discover-view.png)

Ontology 신규 사용자에게는 최근 수정된 object types, 주요(prominent) object types 섹션이 제시됩니다.

![Ontology Manager Fallback sections.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-fallback-sections.png)

표시 섹션과 항목 수를 구성할 수 있습니다. 사용 가능 섹션: "Recently viewed object types", "Favorite object types", "Favorite groups". 특정 group 전용 섹션을 추가해 그 group의 모든 object types를 탐색할 수도 있습니다.

![Ontology Manager Customize homepage feature.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-customize-homepage.png)

![Ontology Manager Group section.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-type-group-section.png)

### Object type view

Object type을 선택하면 object type view가 열립니다.

- 왼쪽: 페이지 선택 사이드바
- 오른쪽: 선택된 페이지

![Object type view.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-user-interface-object-type-view.png)

**Overview** 페이지 섹션(이미지 번호 기준):

1. Object type metadata  
2. Properties  
3. Action types  
4. Link type graph  
5. Dependents  
6. Data  
7. Usage  

![Object type overview page.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-user-interface-overview-annotated.png)

### Property editor view

Object type Overview의 **Properties** 섹션에서 property를 선택하면 property editor view가 열립니다.

![Property editor interface.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-user-interface-property-editor-v2.png)

### Link type view

Overview 탭의 link type graph에서 link type을 선택하면 link type view(**Overview**, **Datasources** 페이지)가 열립니다.

![Link type view.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-user-interface-link-type.png)

### Action type view

Overview 탭 action type 섹션에서 action type을 선택하면 action type view(**Overview**, **Logic**, **Observability**)가 열립니다.

![Action type view.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-user-interface-action-type.png)

#### View action metrics and monitoring rules

**Observability** 탭은 지난 30일 거의 실시간 [action 사용량](https://www.palantir.com/docs/foundry/action-types/action-metrics/)과 정의된 [monitoring rules](https://www.palantir.com/docs/foundry/monitoring-views/overview/) 상태를 보여 줍니다. 상세: [action rules](https://www.palantir.com/docs/foundry/monitoring-views/rules-reference/#action-rules).

![Action observability tab view.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-user-interface-action-type-observability-tab.png)

### Function type view

Overview 탭 function type 섹션에서 function type을 선택하면 function type view(**Overview**, **Configuration**, **Observability**)가 열립니다.

#### Usage history of a function

Usage History 패널은 어떤 버전의 function을 사용한 애플리케이션과 버전 정보를 기록합니다. 이 패널에서 해당 앱으로 이동해 function 버전을 업그레이드할 수 있습니다.

#### View previous versions of a function

기본은 최신 버전. 왼쪽 패널의 버전 드롭다운으로 다른 버전을 볼 수 있습니다.

#### Navigate to the Functions Code Repository

Function 수정은 Functions Code Repository에서만 가능합니다. 엔티티 뷰 우측 상단 **Open in Code Repository** 버튼으로 이동합니다.

![Function type view.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-user-interface-function-type.png)

#### View function metrics and monitoring rules

**Observability** 탭은 지난 30일 거의 실시간 [function 사용량](https://www.palantir.com/docs/foundry/functions/function-metrics/)과 [monitoring rules](https://www.palantir.com/docs/foundry/monitoring-views/overview/) 상태를 보여 줍니다. 상세: [function rules](https://www.palantir.com/docs/foundry/monitoring-views/rules-reference/#function-rules).

![Function observability tab view.](https://www.palantir.com/docs/resources/foundry/ontology-manager/oma-user-interface-function-type-observability-tab.png)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

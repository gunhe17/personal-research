# Functions — Overview (번역)

# Functions

**Functions**는 코드 작성자가 의사결정 대시보드·애플리케이션 같은 **운영 컨텍스트**에서 빠르게 실행되는 로직을 작성할 수 있게 합니다. 이 로직은 **서버 측 격리 환경**에서 실행됩니다.

특히 functions는 Ontology 기반 로직 작성에 대한 **1급 지원**을 포함합니다. 다양한 object type의 properties 읽기, links 순회, Ontology 편집을 유연하게 수행할 수 있습니다.

Functions의 일반적인 유스케이스:

- [Workshop](https://www.palantir.com/docs/foundry/workshop/functions-use/)에서 사용할 object sets 또는 변수 값 반환
- [Workshop function-backed columns](https://www.palantir.com/docs/foundry/workshop/widgets-object-table/#function-backed-columns)로 파생 테이블 컬럼에 변환된 값 표시
- [Workshop charts](https://www.palantir.com/docs/foundry/workshop/widgets-chart/#function-aggregations-function-backed-layers)용 object type 값 집계
- [function backed action](https://www.palantir.com/docs/foundry/action-types/function-actions-overview/)을 통해 많은 objects를 갱신하는 복잡한 Ontology 편집 표현
- [Slate](https://www.palantir.com/docs/foundry/slate/overview/) 프론트엔드에 표시할 정보를 백엔드에서 계산
- [Quiver](https://www.palantir.com/docs/foundry/quiver/overview/) 표시용 커스텀 메트릭·집계 계산
- [external functions](https://www.palantir.com/docs/foundry/functions/webhooks/)로 외부 시스템을 조회해 Ontology objects 보강
- [Pipeline Builder](https://www.palantir.com/docs/foundry/functions/python-functions-builder/)에서 Python functions를 sidecar 컨테이너로 사용

지원 언어: [TypeScript](https://www.typescriptlang.org/docs/handbook/basic-types.html), [Python](https://www.python.org/).

언어별 기능 지원·선택: [language feature support](https://www.palantir.com/docs/foundry/functions/language-feature-support/).

시작 튜토리얼:

- [TypeScript v1](https://www.palantir.com/docs/foundry/functions/typescript-v1-getting-started/)
- [TypeScript v2](https://www.palantir.com/docs/foundry/functions/typescript-v2-getting-started/)
- [Python](https://www.palantir.com/docs/foundry/functions/python-getting-started/)

Learning: ["Speedrun: Your first Ontology function"](https://learn.palantir.com/speedrun-your-first-ontology-function)

**이전:** [Action types / Marketplace](https://www.palantir.com/docs/foundry/action-types/marketplace-action-types/)  
**다음:** [Feature support by language](https://www.palantir.com/docs/foundry/functions/language-feature-support/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

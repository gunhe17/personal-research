# Ontology SDK (OSDK) — Overview (번역)

# Ontology SDK (OSDK)

Ontology Software Development Kit(OSDK)는 개발 환경에서 Ontology의 전체 역량에 직접 접근할 수 있게 합니다. OSDK는 TypeScript용 NPM, Python용 Pip/Conda, Java용 Maven, 기타 언어용 OpenAPI spec을 지원합니다.

Foundry를 백엔드로 취급함으로써, Ontology의 고규모 질의·Foundry writeback 능력과 세분 거버넌스 통제를 활용해 조직을 구동하는 애플리케이션을 더 안전하게·빠르게 개발할 수 있습니다.

OSDK 애플리케이션 생성·관리는 [Developer Console](https://www.palantir.com/docs/foundry/developer-console/overview/)을 사용합니다. 이 섹션은 SDK 전용 레퍼런스 문서입니다.

UI가 아니라 **코드로 Ontology를 정의**한다면 [SuperRepo](https://www.palantir.com/docs/foundry/superrepo/overview/)를 고려하세요. SuperRepo는 함께 진화하는 Ontology와 애플리케이션을 하나의 아티팩트로 버전·릴리스하기에 적합합니다. SuperRepo에서는 object types·links·actions를 [Ontology-as-code](https://www.palantir.com/docs/foundry/superrepo/core-concepts/#ontology-as-code)로 선언하고, 같은 저장소에 [functions](https://www.palantir.com/docs/foundry/functions/overview/)와 프론트엔드를 둡니다. OSDK는 로컬에서 생성되며 정의가 바뀔 때마다 재생성됩니다. 따라서 SDK 버전을 매번 다시 게시하지 않고도, 단일 편집·프리뷰 루프 안에서 Ontology를 확장하고 새 타입을 소비할 수 있습니다.

![The demo app setup page shows example code and documentation.](https://www.palantir.com/docs/resources/foundry/ontology-sdk/osdk-demo-app.png)

## OSDK benefits

- **개발 가속:** Foundry Ontology 백킹 앱을 빠르게 시작. Ontology API에 대한 인체공학적 접근으로 최소 코드로 읽기·writeback.
- **강한 타입 안전성:** 생성되는 functions·types는 관련 Ontology 서브셋 기반. 에디터에서 Ontology를 직접 질의·탐색.
- **중앙 유지보수:** Ontology가 Foundry에서 중앙 관리되므로 앱 구축에 집중하고 데이터 기반 유지 부담을 줄임.
- **설계상 보안:** 앱이 접근할 ontology 엔티티에만 스코프된 토큰 + 사용자 본인 권한.

또한 TypeScript 바인딩으로 Foundry 위 React 앱을 빠르게 만들 수 있습니다.

![The Developer Console interface displays the Application SDK overview panel.](https://www.palantir.com/docs/resources/foundry/ontology-sdk/osdk-overview.png)

생성 코드는 property 이름·설명 등 Ontology 메타데이터를 사용하며, 에디터에서 바로 볼 수 있습니다.

## Getting started

1. Developer Console에서 [새 애플리케이션 생성](https://www.palantir.com/docs/foundry/developer-console/create-application/)
2. 언어별 가이드로 bootstrap: [TypeScript](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-typescript/) / [Python](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-python/) / [Java](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-java/)
3. 선택: [Foundry에 호스팅](https://www.palantir.com/docs/foundry/developer-console/deploy-custom-application-on-foundry/)

## SDK references

- [Java OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/java-osdk/)
- [Python OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/python-osdk/)
- [TypeScript OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk/)
- [TypeScript OSDK migration](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-migration/)
- [Python OSDK migration](https://www.palantir.com/docs/foundry/ontology-sdk/python-osdk-migration/)
- [다른 언어용 OSDK 생성](https://www.palantir.com/docs/foundry/ontology-sdk/generate-osdk-for-other-languages/)

## Related documentation

- [Developer Console overview](https://www.palantir.com/docs/foundry/developer-console/overview/)
- [OSDK React applications](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/overview/)
- [Development environment](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/development/)
- [SuperRepo](https://www.palantir.com/docs/foundry/superrepo/overview/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

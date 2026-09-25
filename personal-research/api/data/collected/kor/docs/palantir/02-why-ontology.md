# Why create an Ontology? (번역)

# Why create an Ontology?

Palantir 플랫폼은 세계에서 가장 중요한 상업·정부 맥락에서 실시간 human-agent 의사결정을 지원합니다. Ontology는 고객이 엔터프라이즈에서 AI를 안전하고 효과적으로 활용하고 운영 전환을 추진하도록 하는 **중심 시스템**입니다.

Ontology는 단순히 데이터가 아니라 엔터프라이즈의 ***의사결정(decisions)*** 을 나타냅니다. Ontology를 통해 조직은 끊임없이 변하는 내외부 조건 위에서, 종종 실시간으로 최선의 결정을 내릴 수 있습니다. 전통 데이터 아키텍처는 의사결정에 들어간 추론이나 뒤따르는 행동을 캡처하지 못해 학습과 AI 도입을 제한합니다. 관례적 분석 아키텍처는 계산을 살아 있는 현실에 맥락화하지 못하고 운영과 단절됩니다. 반면 **의사결정 중심 Ontology**는 인간과 에이전트를 운영에 직접 연결해 조직의 가장 어려운 과제에 맞서게 합니다.

## Understanding the value of the Ontology

Palantir는 각 운영 의사결정을 네 구성 요소로 모델링합니다.

- **[Data](#data):** 결정에 활용되는 정보
- **[Logic](#logic):** 결정을 평가하는 휴리스틱·계산 프로세스
- **[Action](#action):** 선택한 결정의 오케스트레이션과 실행
- **[Security](#security):** 결정이 운영 정책을 준수함을 보장

![decision overview](https://www.palantir.com/docs/resources/foundry/ontology/why-ontology-overview.png)

Ontology는 이 네 요소를 확장 가능하고 동적이며 협업 가능한 자원으로 통합해, 조직의 변화하는 조건과 필요에 기반한 의사결정을 가능하게 합니다.

### Data

Ontology는 구조화 데이터, 스트리밍·엣지, 비구조 저장소, 이미지 등 다양한 엔터프라이즈 데이터 소스뿐 아니라, 의사결정 과정에서 최종 사용자와 에이전트가 생성하는 데이터도 포함합니다. 이 **“decision data”** 에는 결정 맥락, 평가된 옵션, 확정된 선택의 하류 영향이 담깁니다. 엔터프라이즈 데이터 전체와 decision data를 함께 통합하려면 리포팅·분석에 최적화된 고전적 DBMS와 다른 아키텍처가 필요합니다.

Ontology는 이 데이터를 엔터프라이즈의 **풀스케일·풀피델리티 시맨틱 표현**으로 통합합니다. ERP, MES, WMS 같은 운영 데이터 소스, IoT·엣지 스트림, 비구조 저장소의 관련 부분, 지리공간 저장소 등이 동기화·맥락화됩니다. Ontology는 이 소스들을 실시간으로 진화하는 **objects, properties, links** 형태로 묶고, 의사결정 워크플로에 직접 임베드되도록 설계합니다.

Ontology는 공급망, 병원, 고객 서비스 등 일상 업무에서 운영 사용자가 만든 decision data를 안전하게 캡처합니다. 엣지에서의 결정은 경량 [Embedded Ontology](https://blog.palantir.com/osdk-and-mobile-applications-building-with-the-embedded-ontology-668432da6572)를 통해서도 캡처됩니다. 언제, 어떤 버전의 엔터프라이즈 데이터 위에서, 어떤 애플리케이션으로 결정이 이루어졌는지에 대한 end-to-end **decision lineage**가 자동 캡처되며 인간 개발자와 에이전트 모두 안전하게 접근할 수 있습니다. 이 데이터 자원은 규모 있는 AI 학습을 지원하고 단기·장기 agentic memory를 지속적으로 다듬습니다.

![why-ontology-data](https://www.palantir.com/docs/resources/foundry/ontology/why-ontology-data.png)

### Logic

Ontology에 저장된 데이터는 언제·어떻게 결정할지를 정하는 **추론(logic)** 으로 보완됩니다. 예: 핵심 비즈니스 시스템의 간단한 비즈니스 로직, 클라우드 데이터 사이언스 워크벤치의 예측 모델, 여러 소스를 쓰는 최적화 모델.

Agentic orchestration 시대에는 AI 추론이 인간이 역사적으로 활용해 온 것과 같은 논리 자산을 활용하는 것이 중요합니다. 결정적 functions·알고리즘·통계 프로세스는 LLM·멀티모달 모델의 비결정적 추론을 **보완하는 운영 도구**가 될 수 있습니다.

Ontology는 결정 *방법*을 규정하는 계산·프로세스 전체—CRM/ERP의 고객 상호작용 로직, 데이터 사이언스 환경의 ML 모델링 로직, 도메인 특화 계획·최적화·시뮬레이션 알고리즘—를 인간과 에이전트 모두를 위해 연결·맥락화합니다.

Ontology의 유연한 **“logic binding”** 패러다임은 온프레미스, 엔터프라이즈 클라우드, SaaS, Palantir 플랫폼 등 이질적 환경의 논리 자산을 결합하는 일관된 인터페이스를 제공합니다. 덕분에 이전에는 인간만의 영역이던 다양한 로직 집합 위에 에이전트 추론을 도입할 수 있습니다.

![why-ontology-logic](https://www.palantir.com/docs/resources/foundry/ontology/why-ontology-logic.png)

### Action

정보(data)와 추론(logic)이 공유 표현에 들어가면, 다음 조각은 결정 자체의 **실행·오케스트레이션(action)** 입니다. 실시간으로 action loop를 닫는 것이 운영 시스템을 분석 시스템과 구분합니다.

Ontology는 엔터프라이즈의 응집된 의사결정 중심 모델 안에서 actions를 네이티브로 모델링합니다. Ontology의 데이터 요소가 엔터프라이즈의 **“명사”**(시맨틱 실세계 objects·links)라면, actions는 **“동사”**(키네틱 실세계 실행)입니다. Ontology 구동 워크플로마다 명사와 동사는 다양한 logic을 포함하는 인간/AI 추론을 통해 완전한 문장으로 결합됩니다.

시맨틱 모델로 데이터를 묶고 결정 평가에 필요한 logic을 결합하는 것은 가치 있지만, 실행된 결정이 운영 시스템과 *누적적으로(compounds)* 동기화되지 않으면 한계가 있습니다. Ontology는 인간·에이전트 actions를 **scenarios**로 안전하게 스테이징하고, data·logic primitives와 동일한 세분 접근 통제로 거버넌스하며, 트랜잭션 시스템·엣지 장치·커스텀 앱 등 모든 엔터프라이즈 기반에 안전하게 writeback할 수 있게 합니다.

![why-ontology-action](https://www.palantir.com/docs/resources/foundry/ontology/why-ontology-action.png)

### Security

운영 환경의 human-agent 상호작용에는 데이터 버킷 위 단순 role 정책을 넘는 엄격한 보안·거버넌스가 필요합니다. Palantir 보안 아키텍처는 다음을 결합합니다.

- Marking·purpose·role 기반 정책
- data·logic·action·application 아티팩트를 가로지르는 dynamic lineage
- 인간·에이전트 워크플로 모두에 적용되는 통합 변경·릴리스 관리 도구

세분 정책은 Ontology 전역에서 민감하거나 맥락 의존적인 정보에 대한 에이전트·인간 접근을 제약할 수 있습니다. 정책은 모든 상호작용에 대해 런타임에 동적으로 계산되며, 하위 데이터셋의 행·열 제한, SSO로 흐르는 사용자 그룹 속성, 파이프라인 security markings 등을 결합합니다.

도구 사용은 데이터 접근 및 모든 형태의 memory를 규율하는 동일 보안 아키텍처로 동적으로 강제됩니다. 최소한 모든 tool invocation은 Ontology의 하위 objects·properties·links 접근에 의존합니다. Tools는 세분 submission criteria에 의존하는 런타임 검증을 포함할 수도 있습니다.

모든 에이전트·인간 action은 허용 연산 집합을 명시하는 정확한 인가 부여에 의존해, 조직 경계를 넘는 데이터 질의나 미지정 외부 시스템 연결 도구 같은 예상 밖 호출과 권한 상승을 방지합니다.

에이전트가 상세 텔레메트리를 생성할 때 로그의 보안·전송은 중요한 last-mile 이슈입니다. 관리자는 특정 프로젝트·워크플로·에이전트에 대한 로깅 접근을 통제할 수 있으며, data markings 등 active security primitives가 하위 data·logic·action primitives와 동일한 방식으로 로그 접근을 규율합니다.

Ontology는 data·logic·action·security를 의사결정 중심 엔터프라이즈 모델로 묶어 인간과 에이전트가 공동 활용하게 합니다. 데이터 통합부터 앱 구축, 최종 사용자 워크플로까지 모듈형 아키텍처는 인간과 에이전트가 공유 운영 기반 위에서 질의·추론·행동할 수 있게 합니다.

![why-ontology-security](https://www.palantir.com/docs/resources/foundry/ontology/why-ontology-security.png)

## Example of an operational workflow

Ontology가 조직에서 human-agent 워크플로를 가능하게 하는 **가상의 예시**입니다.

### Background

가상 의료 장비 제조사 **Onyx Incorporated**는 주사기부터 수술용 마스크까지 완제품을 생산하며, 각 제품은 연관 제조 공정을 통해 정확한 원자재 세트를 이동시켜야 합니다. 공급·창고·생산·유통 팀이 상호 의존적으로 결정을 내립니다.

주요 공급업체 중 하나가 수술용 마스크 핵심 원자재 공급에 예상치 못한 장애를 일으킨다고 가정합니다. 타이트한 생산 일정과 고객 수요 속에서 미충족 주문 리스크가 커집니다. Onyx 운영팀은 Palantir [AI FDE](https://www.palantir.com/docs/foundry/ai-fde/overview/)로 데이터 소스·logic 자산·action 시스템을 엔터프라이즈 ontology에 연결하기로 합니다.

![onyx-decision](https://www.palantir.com/docs/resources/foundry/ontology/why-ontology-onyx-decision.png)

### Gaining visibility into the problem

Onyx는 공급 부족의 즉각 영향을 평가하고, AI로 생산 라인 재배분 전략을 검토한 뒤, 창고·생산 일정·이행 경로를 동시에 갱신하는 연결된 actions로 결정을 옮깁니다.

Ontology는 상호 의존하는 업무 전반에 실시간 end-to-end 가시성을 제공합니다. 공급·창고·공장 생산·유통 센터·고객 이행 시스템이 비즈니스 언어를 반영하는 semantic objects·links로 합성됩니다. 운영 리더는 원자재 부족으로 위험에 처한 마스크 생산을 빠르게 특정하고, ontology 연결을 통해 위험해진 미충족 고객 주문까지 탐색할 수 있습니다. 세분 보안 모델은 대응이 더 많은 팀으로 확대될 때 재무 지표 등 민감 요소를 기본 숨깁니다.

운영 사용자는 [Workshop](https://www.palantir.com/docs/foundry/workshop/overview/)·[SDK](https://www.palantir.com/docs/foundry/ontology-sdk/overview/) 앱으로 Ontology를 탐색하고, agentic 역량은 배수 효과를 냅니다. 오픈소스·독점 LLM 에이전트는 조직 ontology 안의 공급·재고·실시간 생산·선적·고객 피드백을 탐색할 수 있으며, 모든 agentic 활동은 인간과 동일한 보안 정책으로 통제됩니다. 각 에이전트는 신뢰가 쌓일수록 시야가 넓어지는 새 팀원처럼 취급될 수 있습니다.

![onyx-data](https://www.palantir.com/docs/resources/foundry/ontology/why-ontology-onyx-data.png)

### Building simulations and designing solutions

상황 인식은 시작일 뿐입니다. Onyx는 공급 장애에 대한 *해법*을 빠르게 찾고 트레이드오프를 탐색해야 합니다.

예측·배분·생산 최적화 등 다양한 logic 자산이 데이터 소스와 함께 ontology에 연결되었으므로, 공급망 분석가는 원자재 대체안의 결과를 시뮬레이션할 수 있습니다. 실시간 연결성이 핵심입니다. 대체는 동일 원자재를 쓰는 다른 제품(주사기·장갑 등)에 하류 영향을 줄 수 있기 때문입니다. 시뮬레이션 출력은 **ontology scenarios**로 스테이징되어, 커밋 전 샌드박스 부분에서 안전하게 탐색·분석됩니다.

더 가치 있는 점은 에이전트 함대가 동일 logic 자산과 scenarios 프레임워크를 안전하게 활용할 수 있다는 것입니다. Ontology는 에이전트가 RAG의 데이터 중심 한계를 넘어, 상호 연결된 data·logic·action primitives에 확장 가능한 tools 패러다임으로 접근하게 합니다. 클라우드 워크벤치의 새 ML 모델, 엔터프라이즈 시스템의 최적화 튜닝, Palantir 오픈 모델 빌딩으로 미세조정한 LLM 등이 Ontology를 통해 AI-ready tools로 안전하게 노출될 수 있습니다.

이 예에서 Onyx는 튜닝된 에이전트 “Disruption Bot”을 만들어 Ontology 구동 도구로 엔터프라이즈 소스, 유사 상황 after-action 보고서, 적용 가능한 재배분 모델을 스캔합니다. 풍부한 맥락 덕분에 분석가가 아직 고려하지 못한 신규 모델을 쓰는 재배분 계획을 제시하고, 결과는 scenario에 스테이징된 뒤 인간 분석가의 최종 검토로 넘어갑니다.

![onyx-logic](https://www.palantir.com/docs/resources/foundry/ontology/why-ontology-onyx-logic.png)

### Executing decisions and taking action

실행 가능한 계획이 정해지면 Onyx는 결정을 운영 시스템에 빠르고 안전하게 반영해야 합니다. 인수합병으로 성장한 조직은 민감한 운영 시스템 혼합을 가지므로 IT는 writeback 조건에 엄격합니다. Ontology는 actions에도 data·logic과 동일한 통제·검증을 적용합니다—누가 action을 호출할 수 있는지, 변경 게시용 테스트 프레임워크, 배치 스테이징·검토, 상세 로깅. 재배분 계획 실행은 수신 시스템별 writeback을 오케스트레이션합니다. 예: WMS는 API 갱신, 세 ERP는 각 시스템 보호 장치를 따르는하는 Ontology 커넥터, 생산 계획은 비동기 수집용 flat file. 실행 중 응답을 모니터링하고 과거 활동을 감사할 수 있습니다.

Ontology는 AI가 허용 경계 안에서 안전하게 행동하도록 가드레일을 제공합니다. Actions는 모든 유형의 에이전트에 tools로 자동 노출될 수 있습니다. Action 범위는 Ontology 자체 반영(객체 편집·생성)에 한정되거나 하나·여러 시스템에 writeback할 수 있습니다. Onyx는 Disruption Bot 등 소수의 프로덕션 에이전트에 작은 action 집합을 부여합니다. 기본값으로는 work order 상태 변경·재배분 계획 푸시 등이 AI에 의해 *스테이징*만 되고 인간이 최종 검토합니다. 다만 세분 로깅·운영 계측을 바탕으로, 신뢰된 AI 프로세스가 인간 검토 없이 action loop를 닫도록 허용 범위를 신중히 넓히거나 좁힐 수 있으며, 변경은 모든 Ontology 워크플로에 즉시 반영됩니다.

![onyx-actions](https://www.palantir.com/docs/resources/foundry/ontology/why-ontology-onyx-actions.png)

### Learning from decisions

위기 이후, data·logic·action·security가 연결된 ontology 위에서 조직은 강력한 **의사결정 중심 학습**을 수행할 수 있습니다. 특정 원자재 해법을 낳은 human-agent 협업은 일반화 가능한 워크플로를 드러내며, 이는 기념·재노출 대상이 됩니다. 평가된 모든 데이터 요소·logic 자산·action은 end-to-end decision lineage에 캡처되어 AI 성능 최적화의 풍부한 연료가 됩니다. 수천 사용자·에이전트의 집계 결정은 모델 미세조정 학습 데이터로 안전하게 활용되거나, 에이전트 프롬프트 시 호출되는 원칙으로 증류될 수 있습니다. 워크플로 틈새에 갇혀 있던 암묵지(tribal knowledge)가 AI로 밝혀져 전사 운영을 개선할 수 있습니다.

![onyx-learning](https://www.palantir.com/docs/resources/foundry/ontology/why-ontology-onyx-learning.png)

## Onward with the Ontology

Ontology는 human-agent 운영을 구현·확장하고, 최전선에서 에이전트 추천·증강·자동화를 언제·어떻게 쓸지 정밀 통제할 수 있게 합니다. 이는 Ontology가 데이터 중심이 아니라 **의사결정 중심**이며 data·logic·action·security를 단일 소프트웨어 시스템에 묶기 때문입니다.

Ontology로 새 데이터를 풀피델리티 시맨틱 표현에 빠르게 통합하고, 새 알고리즘·비즈니스 로직을 인간·AI 사용자에게 매끄럽게 노출하며, 광범위한 운영 시스템과 실시간 action 통합을 이룰 수 있습니다. 각 조직의 ontology는 팀 전반의 변화하는 조건·목표·결정을 실시간으로 반영해, AI 사용이 엔터프라이즈 현실에 닻을 내리게 합니다.

더 보기: 의사결정 중심 [architecture](https://www.palantir.com/docs/foundry/architecture-center/ontology-system/), [Ontology SDK](https://www.palantir.com/docs/foundry/ontology-sdk/overview/), [Global Branching](https://www.palantir.com/docs/foundry/global-branching/overview/).

**이전:** [Overview](https://www.palantir.com/docs/foundry/ontology/overview/)  
**다음:** [Models in the Ontology](https://www.palantir.com/docs/foundry/ontology/models/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

# Models in the Ontology (번역)

# Models in the Ontology

조직들은 의사결정을 가속하고 개선하기 위해 인공지능(AI)과 머신러닝(ML)을 활용하려 합니다. 하지만 AI/ML을 운영에 올리는 현실은 복잡하고, 전형적인 투자 대비 효과는 기대에 못 미치는 경우가 많습니다.

Foundry는 이 간극을 메우는 핵심 역량을 제공합니다. 신뢰할 수 있는 데이터 기반, 조직 목표에 맞춰 모델을 평가·비교하는 도구, 그리고 평가된 모델을 사용자 대면 운영 워크플로에 배포하는 기능입니다. 이 페이지는 그중 **마지막 단계**—평가된 모델을 프로덕션에 배포하는 것—에 초점을 둡니다.

## End-to-end workflow

Ontology와 함께 Foundry에서 AI/ML을 실시간 추론(live inference)용으로 운영화하는 전체 단계는 대략 다음과 같습니다.

1. Foundry에서 [모델을 생성](https://www.palantir.com/docs/foundry/integrate-models/integrate-overview/)합니다.

2. [direct model deployment](https://www.palantir.com/docs/foundry/manage-models/create-a-model-deployment/)를 구성합니다.

3. [모델용 간단한 래퍼 function을 게시](https://www.palantir.com/docs/foundry/model-integration/model-functions-guide/)하고, [선택적으로 다른 function에서 호출](https://www.palantir.com/docs/foundry/functions/functions-on-models/)하여 모델 주변의 복잡한 로직을 오케스트레이션합니다.

4. 그 function을 [Workshop](https://www.palantir.com/docs/foundry/workshop/functions-use/), [Vertex](https://www.palantir.com/docs/foundry/vertex/overview/) 및 기타 최종 사용자 애플리케이션에서 실시간 추론에 사용합니다.

Ontology Objects는 배치 추론에 모델을 활용하는 데이터셋으로 백킹될 수도 있습니다. [Code Repositories에서 모델 사용 방법](https://www.palantir.com/docs/foundry/model-integration/tutorial-train-code-repositories/).

## Benefits

데이터셋을 Ontology 개념에 매핑하는 것이 워크플로 개발과 의사결정에 [이점](https://www.palantir.com/docs/foundry/ontology/why-ontology/)을 주듯, 모델을 Ontology에 매핑하면 다음과 같은 이점이 있습니다.

- **해석 가능성(Interpretability).** 모든 모델링 결과가 실세계 개념(object type의 properties)으로 정의되므로, 최종 사용자는 머신러닝을 이해하지 않아도 됩니다. 대신 *forecast*, *estimate*, *classification* 같은 단순한 개념과 상호작용하면 됩니다.

- **규모의 경제(Economies of scale).** 각 모델링 프로젝트가 특정 유스케이스만을 위한 일회성 작업이 아니라, 시간이 지나며 서로 쌓일 수 있습니다. 예를 들어 한 유스케이스용으로 만든 forecast를 이후 유스케이스에도 즉시 재사용해 중복을 줄이고 더 빨리 가치를 낼 수 있습니다.

- **규모 있는 연결성(Connectivity at scale).** ML 모델을 포함함으로써 Ontology는 데이터뿐 아니라 *logic* 측면에서도 조직의 단일 진실 공급원(single source of truth)이 됩니다. 모델은 “앞으로 무엇이 어떻게 변할지”에 대한 조직의 기대를 인코딩합니다. 이렇게 Ontology는 전사 **디지털 트윈**이 되어, 파편화된 모델링 작업으로는 불가능한 방식으로 조직 전반의 변화를 시뮬레이션할 수 있게 합니다.

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

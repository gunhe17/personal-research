# A Simple Knowledge-Engineering Methodology (번역)

앞서 말했듯 온톨로지를 개발하는 **유일한 “올바른” 방법**은 없습니다. 여기서는 고려할 일반 이슈를 논의하고, 가능한 한 가지 프로세스를 제안합니다. 접근은 **반복적(iterative)** 입니다. 거친 1차 온톨로지로 시작 → 진화하는 온톨로지를 수정· refinement → 세부 채우기. 그 과정에서 설계자가 내려야 할 모델링 결정과 대안별 장단·함의를 다룹니다.

먼저 여러 번 참조할 **근본 규칙**을 강조합니다. 다소 독단적으로 보일 수 있으나, 많은 경우 설계 결정에 도움이 됩니다.

1. 도메인을 모델링하는 **유일한 정답은 없다** — 항상 실행 가능한 대안이 있다. 최선은 거의 항상 **염두에 둔 애플리케이션**과 **예상하는 확장**에 달렸다.
2. 온톨로지 개발은 **반드시 반복 과정**이다.
3. 온톨로지의 개념은 관심 도메인의 **객체(물리·논리)와 관계**에 가깝게 두어야 한다. 도메인을 설명하는 문장의 **명사(객체)** 또는 **동사(관계)** 일 가능성이 높다.

즉, 온톨로지를 무엇에 쓸지, 얼마나 상세·일반적일지가 이후 많은 모델링 결정을 이끕니다. 여러 대안 중 과제에 더 잘 맞고, 더 직관적이며, 더 확장·유지보수하기 쉬운 쪽을 골라야 합니다. 온톨로지는 세상 현실의 모델이며 개념은 그 현실을 반영해야 합니다. 초기 버전을 정의한 뒤 애플리케이션·문제해결 방법에 쓰거나 분야 전문가와 논의하며 평가·디버깅합니다. 그 결과 초기 온톨로지를 거의 반드시 수정하게 됩니다. 이 반복 설계는 온톨로지 수명주기 내내 이어질 가능성이 큽니다.

### Step 1. 온톨로지의 도메인과 범위 결정

온톨로지 개발은 **도메인과 범위**를 정의하며 시작하는 것을 권합니다. 기본 질문에 답하세요.

- 온톨로지가 다룰 **도메인**은 무엇인가?
- 온톨로지를 **무엇에** 쓸 것인가?
- 온톨로지 정보가 답해야 할 **질문 유형**은 무엇인가?
- **누가** 사용하고 유지보수할 것인가?

답은 설계 과정에서 바뀔 수 있지만, 어느 시점에서든 모델 범위를 제한하는 데 도움이 됩니다.

앞서 소개한 와인·음식 온톨로지를 생각해 봅시다. 음식과 와인의 표현이 도메인입니다. 와인과 음식의 **좋은 조합**을 제안하는 애플리케이션에 쓸 계획입니다.

자연히 와인 유형, 주요 음식 유형, 좋은/나쁜 조합 개념이 온톨로지에 들어갑니다. 반면 와이너리 재고 관리나 레스토랑 직원 개념은 와인·음식과 관련은 있어도 범위에 넣을 가능성은 낮습니다.

와인 잡지 기사 NLP를 돕는 용도라면 동의어·품사 정보가 중요할 수 있습니다. 레스토랑 고객의 주문 결정을 돕는다면 소매 가격이 필요할 수 있습니다. 와인 셀러 재고 확보용 구매자라면 도매 가격·가용성이 필요할 수 있습니다. 유지보수자와 사용자의 언어가 다르면 언어 간 매핑이 필요할 수 있습니다.

#### Competency questions (역량 질문)

범위 결정 방법 중 하나는, 온톨로지에 기반한 지식베이스가 답할 수 있어야 하는 질문 목록—**competency questions**(Gruninger and Fox 1995)—을 스케치하는 것입니다. 이후 리트머스 테스트가 됩니다. 이런 유형의 질문에 답할 정보가 충분한가? 특정 상세도·특정 영역 표현이 필요한가? 이 질문들은 스케치일 뿐이며 완전할 필요는 없습니다.

와인·음식 도메인의 가능한 competency questions:

- 와인을 고를 때 어떤 특성을 고려해야 하나?
- Bordeaux는 레드인가 화이트인가?
- Cabernet Sauvignon은 해산물과 잘 어울리나?
- 구운 고기에 가장 좋은 와인 선택은?
- 요리에 대한 적합성에 영향을 주는 와인 특성은?
- 특정 와인의 bouquet나 body가 빈티지 연도에 따라 변하나?
- Napa Zinfandel의 좋은 빈티지는 무엇이었나?

이 목록으로 보면, 온톨로지는 다양한 와인 특성·유형, 좋은/나쁜 빈티지, 와인 선택에 중요한 음식 분류, 추천 조합 정보를 포함하게 됩니다.

### Step 2. 기존 온톨로지 재사용 검토

거의 항상 **남이 한 일**을 검토하고, 우리 도메인·과제에 맞게 정제·확장할 수 있는지 확인하는 것이 가치 있습니다. 이미 특정 온톨로지·통제 어휘에 커밋한 다른 애플리케이션과 상호작용해야 한다면 재사용이 **요구사항**이 될 수 있습니다. 많은 온톨로지가 전자 형태로 공개되어 개발 환경으로 import 가능합니다. 표현 형식은 종종 중요하지 않습니다. 많은 지식표현 시스템이 import/export를 지원하고, 직접 못 해도 형식 간 번역이 보통 어렵지 않습니다.

웹과 문헌에 재사용 가능한 온톨로지 라이브러리가 있습니다. 예: Ontolingua ontology library ([http://www.ksl.stanford.edu/software/ontolingua/](http://www.ksl.stanford.edu/software/ontolingua/)), DAML ontology library ([http://www.daml.org/ontologies/](http://www.daml.org/ontologies/)). 공개 상용 온톨로지도 있습니다(예: UNSPSC, RosettaNet, DMOZ).

예를 들어 프랑스 와인 지식베이스가 이미 있을 수 있습니다. 그것과 기반 온톨로지를 import하면 프랑스 와인 분류뿐 아니라 와인을 구분·기술하는 특성 분류의 1차안도 얻습니다. [www.wines.com](http://www.wines.com/) 같은 상용 사이트에서 와인 속성 목록을 구할 수도 있습니다.

다만 이 가이드에서는 관련 온톨로지가 없다고 가정하고 **처음부터** 개발합니다.

### Step 3. 중요한 용어 나열

진술하거나 사용자에게 설명하고 싶은 **모든 용어** 목록을 적는 것이 유용합니다. 무엇에 대해 말하고 싶은가? 그 용어들은 어떤 속성을 갖는가? 그 용어들에 대해 무엇을 말하고 싶은가? 예를 들어 와인 관련 중요 용어: wine, grape, winery, location, 와인의 color, body, flavor, sugar content; fish와 red meat 같은 음식 유형; white wine 같은 서브타입 등. 처음에는 개념 겹침, 관계, 속성, 클래스인지 슬롯인지 걱정하지 말고 **포괄적 목록**을 얻는 것이 중요합니다.

다음 두 단계—클래스 계층 개발과 개념 속성(슬롯) 정의—는 **서로 밀접하게 얽혀** 있습니다. 하나를 먼저 끝내고 다른 것을 하기 어렵습니다. 보통 계층의 개념 정의를 조금 만들고, 그 속성을 기술하고, 다시 이어 갑니다. 이 두 단계가 온톨로지 설계에서 가장 중요하기도 합니다. 여기서는 간략히 기술하고, 더 복잡한 이슈·함정·결정은 다음 절들에서 다룹니다.

### Step 4. 클래스와 클래스 계층 정의

클래스 계층을 개발하는 접근은 여러 가지입니다(Uschold and Gruninger 1996):

- **Top-down:** 가장 일반적 개념부터 정의하고 이후 특수화. 예: Wine, Food 일반 클래스 → White wine, Red wine, Rosé wine → Red wine을 Syrah, Red Burgundy, Cabernet Sauvignon 등으로 세분.
- **Bottom-up:** 가장 구체적 클래스(계층의 잎)부터 정의하고 이후 더 일반 개념으로 묶음. 예: Pauillac, Margaux → 공통 슈퍼클래스 Medoc → Bordeaux의 서브클래스.
- **Combination:** top-down과 bottom-up 혼합. 두드러진 개념을 먼저 정의한 뒤 일반화·특수화. 예: 상위 Wine과 구체 Margaux → 중간 Medoc으로 연결 → 프랑스 지역 와인 클래스를 생성하며 중간 수준을 채움.

[Figure 2](#Figure2)는 일반성 수준 구분의 한 예입니다.

![image004.jpg](https://protege.stanford.edu/publications/ontology_development/image004.jpg)

Figure 2. Wine 택소노미의 여러 수준: Wine, Red/White/Rosé wine은 더 일반(상위). Pauillac, Margaux는 가장 구체(하위).

세 방법 중 본질적으로 더 나은 것은 없습니다. 도메인에 대한 개인적 관점에 크게 좌우됩니다. 체계적 top-down 관점이면 top-down이 쉽고, 많은 개발자에게는 **combination**이 가장 쉬운 경우가 많습니다. “중간” 개념이 도메인에서 더 서술적(descriptive)인 경향이 있기 때문입니다(Rosch 1978).

와인을 가장 일반 분류부터 구분한다면 top-down이, 구체 예시부터 땅에 붙이고 싶다면 bottom-up이 맞을 수 있습니다.

어느 쪽이든 보통 클래스 정의부터 시작합니다. [Step 3](#Step3) 목록에서 **독립적 존재를 갖는 객체를 기술하는 용어**를 고릅니다(그 객체를 *기술하는* 용어가 아니라). 이 용어들이 온톨로지의 클래스가 되고 계층의 앵커가 됩니다.[[2]](#_footnote2) 한 클래스의 인스턴스가 되면 **반드시(정의상)** 다른 클래스의 인스턴스이기도 한지를 물으며 계층 택소노미로 조직합니다.

> 클래스 A가 클래스 B의 슈퍼클래스이면, B의 모든 인스턴스는 A의 인스턴스이기도 하다.

즉 클래스 B는 A의 **“kind of”** 개념을 나타냅니다.

예: 모든 Pinot Noir 와인은 반드시 레드 와인이므로 Pinot Noir 클래스는 Red Wine의 서브클래스입니다.

[Figure 2](#Figure2)는 Wine 온톨로지 클래스 계층의 일부입니다. [Section 4](04-defining-classes-hierarchy.md)에서 계층 정의 시 주의점을 상세히 논의합니다.

![image006.gif](https://protege.stanford.edu/publications/ontology_development/image006.gif)

Figure 3. Wine 클래스의 슬롯과 그 facet. maker 옆 “I” 아이콘은 역슬롯이 있음을 나타냄([Section 5.1](05-defining-properties.md)).

### Step 5. 클래스의 속성—슬롯 정의

클래스만으로는 [Step 1](#Step1)의 competency questions에 답하기에 부족합니다. 클래스 일부를 정의한 뒤 개념의 **내부 구조**를 기술해야 합니다.

[Step 3](#Step3)에서 만든 용어 목록 중 클래스로 고른 나머지의 상당수는 이 클래스들의 **속성**일 가능성이 큽니다. 예: 와인의 color, body, flavor, sugar content, 와이너리 location.

각 속성에 대해 **어느 클래스를 기술하는지** 정합니다. 그 속성들이 클래스에 붙는 슬롯이 됩니다. 따라서 Wine 클래스는 color, body, flavor, sugar 슬롯을, Winery 클래스는 location 슬롯을 가집니다.

온톨로지 슬롯이 될 수 있는 객체 속성 유형:

- **고유(intrinsic)** 속성 — 예: 와인의 flavor
- **외재(extrinsic)** 속성 — 예: 와인 이름, 산지
- **부분(parts)** — 객체가 구조화되어 있을 때; 물리적·추상적 부분(예: 식사의 courses)
- **다른 개체와의 관계** — 클래스 구성원과 다른 항목의 관계(예: 와인의 maker = 와인–와이너리 관계, 와인을 만든 grape)

앞서 식별한 속성 외에 Wine에 name, area, maker, grape 슬롯을 추가합니다. [Figure 3](#Figure3)은 Wine 클래스 슬롯을 보여 줍니다.

클래스의 모든 서브클래스는 그 클래스의 슬롯을 **상속**합니다. Wine의 모든 슬롯은 Red Wine, White Wine 등에도 상속됩니다. Red Wine에는 tannin level(low, moderate, high) 슬롯을 추가하고, 이는 레드 와인을 나타내는 모든 클래스(Bordeaux, Beaujolais 등)에 상속됩니다.

슬롯은 그 속성을 가질 수 있는 **가장 일반적 클래스**에 붙여야 합니다. 예: body와 color는 Wine에 붙입니다. body·color를 가질 인스턴스의 가장 일반 클래스이기 때문입니다.

### Step 6. 슬롯의 facet 정의

슬롯은 값 타입, 허용 값, 값 개수(cardinality) 등 값이 가질 수 있는 특징을 기술하는 여러 **facet**을 가질 수 있습니다. 예: name 슬롯 값은 문자열 하나 → value type String. produces 슬롯(와이너리가 생산하는 와인들)은 여러 값을 가질 수 있고 값은 Wine 클래스 인스턴스 → value type Instance, 허용 클래스 Wine.

#### Slot cardinality

슬롯이 가질 수 있는 **값의 개수**를 정의합니다. 일부 시스템은 single(최대 1개)과 multiple(임의 개수)만 구분합니다. 와인의 body는 single cardinality(와인은 body를 하나만). 특정 와이너리가 생산한 와인들은 Winery의 produces 슬롯에 multiple로 채워집니다.

일부 시스템은 최소·최대 cardinality로 더 정밀히 지정합니다. 최소 N: 슬롯이 적어도 N개 값을 가져야 함. 예: Wine의 grape 최소 1 — 각 와인은 적어도 한 품종으로 만들어짐. 최대 M: 최대 M개. 단일 품종 와인의 grape 최대 1. 때로는 최대 0이 유용합니다 — 특정 서브클래스에서 그 슬롯이 값을 가질 수 없음을 뜻합니다.

#### Slot-value type

슬롯을 채울 수 있는 **값의 타입**을 기술합니다. 흔한 타입:

- **String** — name 등 단순 문자열
- **Number** (Float, Integer 등) — 예: 와인 가격 Float
- **Boolean** — yes/no 플래그. 스파클링을 별도 클래스로 두지 않을 때 sparkling 여부를 Boolean으로
- **Enumerated** — 허용 값 목록. 예: flavor = strong | moderate | delicate. Protégé-2000에서는 Symbol 타입
- **Instance** — 개체 간 관계. 허용 클래스 목록도 정의. 예: Winery의 produces 값은 Wine 인스턴스[[3]](#_footnote3)

[Figure 4](#Figure4)는 Winery의 produces 슬롯 정의입니다.

![image008.jpg](https://protege.stanford.edu/publications/ontology_development/image008.jpg)

Figure 4. produces 슬롯 정의: cardinality multiple, value type Instance, 허용 클래스 Wine.

#### Domain and range of a slot

Instance 타입 슬롯의 허용 클래스를 흔히 슬롯의 **range**라고 합니다. Figure 4에서 Wine은 produces의 range입니다. 일부 시스템은 특정 클래스에 붙일 때 range를 더 제한할 수 있습니다.

슬롯이 붙는 클래스(또는 슬롯이 기술하는 속성의 주체 클래스)는 슬롯의 **domain**입니다. Winery는 produces의 domain입니다. 슬롯을 클래스에 *붙이는* 시스템에서는 보통 붙인 클래스가 domain이므로 domain을 따로 지정할 필요가 없습니다.

domain·range 결정의 기본 규칙:

> domain 또는 range를 정의할 때, 각각 domain 또는 range가 될 수 있는 **가장 일반적** 클래스(들)를 찾으라.

동시에 **지나치게 일반적**이면 안 됩니다. domain의 모든 클래스가 그 슬롯으로 기술되어야 하고, range의 모든 클래스 인스턴스가 잠재적 filler여야 합니다. range를 THING으로 두지 말고, 모든 filler를 덮는 적절한 클래스를 고르세요.

produces의 range에 Wine의 모든 서브클래스를 나열하는 대신 Wine만 나열하세요. 동시에 range를 THING(온톨로지 최상위)으로 두지는 마세요.

더 구체적으로:

- range/domain 목록에 클래스와 그 서브클래스가 함께 있으면 **서브클래스를 제거**.  
  range에 Wine과 Red Wine이 있으면 Red Wine 제거 — 이미 Wine의 서브클래스로 암시 포함.
- 클래스 A의 **모든** 서브클래스는 있으나 A 자체는 없으면, range는 **A만** 두고 서브클래스는 빼기.  
  Red/White/Rose Wine을 나열하는 대신 Wine으로 한정.
- A의 서브클래스 대부분만 있고 일부만 빠지면, A를 range로 두는 것이 더 적절한지 검토.

슬롯을 클래스에 붙이는 것이 domain에 클래스를 추가하는 것과 같은 시스템에서는 같은 규칙이 적용됩니다. 가능한 한 일반화하되, 붙인 각 클래스가 실제로 그 속성을 가질 수 있어야 합니다. tannin level을 Bordeaux, Merlot, Beaujolais 각각에 붙일 수 있지만, 모든 레드 와인이 그 속성을 가지므로 **Red Wines**에 붙이는 편이 낫습니다. 더 일반화해 Wine에 붙이면 화이트 와인에는 tannin level을 쓰지 않으므로 **부적절**합니다.

### Step 7. 인스턴스 생성

마지막 단계는 계층 속 클래스의 **개별 인스턴스** 생성입니다. 인스턴스 정의에는 (1) 클래스 선택, (2) 그 클래스의 개별 인스턴스 생성, (3) 슬롯 값 채우기가 필요합니다. 예: Chateau-Morgon-Beaujolais를 Beaujolais 와인 유형의 인스턴스로 생성. 슬롯 값([Figure 5](#Figure5)):

- Body: Light
- Color: Red
- Flavor: Delicate
- Tannin level: Low
- Grape: Gamay (Wine grape 클래스 인스턴스)
- Maker: Chateau-Morgon (Winery 클래스 인스턴스)
- Region: Beaujolais (Wine-Region 클래스 인스턴스)
- Sugar: Dry

![image010.jpg](https://protege.stanford.edu/publications/ontology_development/image010.jpg)

Figure 5. Beaujolais 클래스 인스턴스 정의. Chateau Morgon Beaujolais — Beaujolais 지역, Gamay 포도, Chateau Morgon 생산. light body, delicate flavor, red, low tannin, dry.

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

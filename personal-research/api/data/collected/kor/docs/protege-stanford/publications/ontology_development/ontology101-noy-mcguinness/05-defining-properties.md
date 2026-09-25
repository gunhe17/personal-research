# Defining properties — more details (번역)

이 절에서는 온톨로지에 슬롯을 정의할 때 기억할 세부 사항(§3의 Step 5·6)을 더 다룹니다. 주로 **역슬롯(inverse slots)** 과 슬롯의 **기본값(default values)** 입니다.

## 5.1 Inverse slots (역슬롯)

한 슬롯의 값은 다른 슬롯의 값에 의존할 수 있습니다. 예를 들어 와인이 어떤 와이너리에 의해 생산되었다면, 그 와이너리는 그 와인을 생산합니다. `maker`와 `produces` 두 관계는 **역관계(inverse relations)** 라고 합니다. 정보를 “양방향”으로 저장하는 것은 중복입니다. 와인이 어떤 와이너리에서 생산되었다는 것을 알면, 지식베이스를 쓰는 애플리케이션은 와이너리가 그 와인을 생산한다는 역관계 값을 항상 추론할 수 있습니다. 그러나 **지식 획득(knowledge-acquisition)** 관점에서는 양쪽 정보를 명시적으로 두는 것이 편리합니다. 어떤 경우에는 와인 쪽을, 어떤 경우에는 와이너리 쪽을 채울 수 있고, 시스템이 역관계 값을 자동으로 채워 지식베이스 일관성을 유지할 수 있습니다.

우리 예시에는 역슬롯 쌍이 있습니다. Wine 클래스의 `maker` 슬롯과 Winery 클래스의 `produces` 슬롯입니다. 사용자가 Wine 인스턴스를 만들고 `maker` 값을 채우면, 시스템은 해당 Winery 인스턴스의 `produces` 슬롯에 새로 만든 인스턴스를 자동으로 추가합니다. 예를 들어 Sterling Merlot이 Sterling Vineyard 와이너리에서 생산된다고 하면, 시스템은 Sterling Merlot을 Sterling Vineyard가 생산하는 와인 목록에 자동 추가합니다([Figure 9](#Figure9)).

![image018.gif](https://protege.stanford.edu/publications/ontology_development/image018.gif)

Figure 9. 역슬롯이 있는 인스턴스. Winery의 `produces`는 Wine의 `maker`의 역. 한쪽을 채우면 다른 쪽이 자동 갱신된다.

## 5.2 Default values (기본값)

많은 프레임 기반 시스템은 슬롯에 **기본값**을 지정할 수 있게 합니다. 어떤 슬롯 값이 클래스의 대부분 인스턴스에서 같다면, 그 값을 슬롯의 **default value**로 정의할 수 있습니다. 그러면 해당 슬롯을 가진 클래스의 새 인스턴스가 만들어질 때마다 시스템이 기본값을 자동으로 채웁니다. 이후 facet이 허용하는 다른 값으로 바꿀 수 있습니다. 즉 기본값은 **편의**를 위한 것이며, 모델에 새로운 제약을 강제하거나 모델을 바꾸지 **않습니다**.

예를 들어 다룰 와인의 대부분이 full-bodied라면, body의 기본값을 “full”로 둘 수 있습니다. 따로 말하지 않는 한 정의하는 모든 와인은 full-bodied가 됩니다.

이것은 **슬롯 값(slot values)** 과는 다릅니다. 슬롯 값은 바꿀 수 없습니다. 예를 들어 Dessert wine 클래스에 대해 `sugar` 슬롯 값을 SWEET라고 하면, Dessert wine의 모든 서브클래스와 인스턴스는 `sugar`가 SWEET이며, 그 값은 서브클래스·인스턴스에서 변경할 수 없습니다.

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

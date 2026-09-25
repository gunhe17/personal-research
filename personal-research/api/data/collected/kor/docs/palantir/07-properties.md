# Properties — Overview (번역)

# Properties

[Object type](https://www.palantir.com/docs/foundry/object-link-types/object-types-overview/)의 **property**는 실세계 엔티티/이벤트 특성의 스키마 정의입니다. **Property value**는 어떤 object 위 그 property의 값입니다.

예를 들어 Ontology Manager에서 `Employee` object type은 `employee number`, `start date`, `role` properties를 가질 수 있습니다. 가상 직원 “Melissa Chang”은 `employee number` = “11502”, `start date` = “October 9, 2016”, `role` = “software engineer” 같은 property values를 가질 수 있습니다.

마찬가지로 `Flight` object type은 `departure date`, `arrival date`, `passenger count`를 가질 수 있습니다. 객체 “JFK → SFO 24-02-2021”은 각각 “24-02-2021”, “25-02-2021”, “150” 같은 값을 가질 수 있습니다.

Ontology 개념은 데이터셋 구조와 유사합니다. Property의 정의는 데이터셋 컬럼에, property value는 필드의 값에 비유됩니다. (원문 예시의 컬럼 나열은 Employee 예시와 혼재된 부분이 있으나, 대응 관계는 column ≈ property, field ≈ property value입니다.)

Foundry Ontology는 추상 모델이 아니라 조직의 실제 데이터에 매핑됩니다. Property values는 Ontology Manager에서 object type에 backing datasources를 추가하여 생성·표시됩니다. `Employee`의 `employee number`, `start date`, `role` property values를 만들려면 `Employee` object type에 backing datasources를 추가하고 직원 디렉터리 등 데이터를 Ontology에 넣습니다.

## Supported property types

| Property base type | title key 가능? | primary key 가능? | Notes |
| --- | --- | --- | --- |
| 자주 사용: String, Integer, Short | Yes | Yes |  |
| 시간: Date, Timestamp | Yes | 비권장 | 저장 형식과 표시 형식 차이로 예기치 않은 충돌/유일성 이슈 가능. 대부분 String PK 권장. |
| 숫자 유사: Boolean, Byte, Long | Yes | 비권장 | Boolean은 인스턴스가 사실상 2개로 제한. Byte는 Actions에서 Integer 파라미터로만 할당되는 경우가 많아 Integer 권장. Long은 JS 표현 이슈(1e15 초과)로 프론트엔드 호환이 약할 수 있어 String 권장. |
| 실수: Float, Double, Decimal | Yes | No |  |
| Vector | No | No |  |
| Array | Yes | No | null 요소 불가. 내부 타입이 title property로 유효하지 않으면 Array도 title 불가. Object Storage v2에서 중첩 배열 미지원. |
| Struct | No | No | 중첩 불가, 필드가 배열일 수 없음. 상세는 struct 문서. |
| Media Reference, Time Series, Geotemporal Series, Attachment | No | No |  |
| Geopoint | Yes | No | `latitude,longitude` 콤마 구분 문자열 (예: `57.64911,10.40744`). geospatial 관련 문서 참고. |
| Geoshape | No | No |  |
| Marking | No | No |  |
| Cipher | Yes | No |  |

Base types 더 보기: [base types](https://www.palantir.com/docs/foundry/object-link-types/base-types/).

**이전:** [Object types / Metadata reference](https://www.palantir.com/docs/foundry/object-link-types/object-type-metadata/)  
**다음:** [Edit object type properties](https://www.palantir.com/docs/foundry/object-link-types/edit-properties/)

---

*연구용 한국어 번역. 내용이 다를 경우 공식 영문 원문이 우선합니다.*

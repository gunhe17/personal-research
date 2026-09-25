# 기여하기

기여를 환영하며, 질문도 환영합니다.

이 프로젝트는 서로 연결된 두 개의 오픈소스 계층입니다. 하나는 하네스와 제품이 함께 동작하는 방식에 대한 개방형 표준인 Unified Harness Protocol(UHP)이고, 다른 하나는 그것을 구현한 실제 저장소입니다. 명세, 준수(conformance) 테스트 스위트, 하네스 지원, 구현체, 문서 모두 기여를 받습니다.

## 무엇을 어디에

- 제안과 버그 리포트: GitHub Issues.
- 논의: HarnessRouter Discord 커뮤니티, https://discord.gg/nPcbwqVPb2
- 보안 취약점: [SECURITY.md](https://github.com/HarnessRouter/harnessrouter/blob/main/SECURITY.md) 에 따라 비공개로. 공개 이슈에는 올리지 않습니다.

## 큰 변경: 만들기 전에 설명한다

작은 수정을 넘어서는 것이라면 먼저 이슈를 엽니다. 구현을 작성하기 전에 해결하려는 문제, 제안하는 변경, 그리고 예상되는 영향을 설명합니다. 메인테이너가 방향에 동의하면 여러분이든 메인테이너든 구현을 진행합니다.

오타나 명확한 버그처럼 수정도 명확한, 작고 자명한 수정은 곧바로 풀 리퀘스트로 보내도 됩니다.

## 프로토콜 변경

Unified Harness Protocol은 더 엄격한 절차를 따릅니다. 명세, 참조 구현, 준수 테스트 스위트가 서로 맞물려 있어야 하기 때문입니다. 변경이 프로토콜에 영향을 준다면 [protocol/GOVERNANCE.md](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/GOVERNANCE.md) 를 따르세요. `uep` 라벨을 붙인 이슈로 UHP Enhancement Proposal(UEP)을 열고 Problem, Proposal, Compatibility, Alternatives를 적습니다. 메인테이너는 10 영업일 안에 응답합니다. 승인된 UEP는 명세, 스키마, 참조 구현, 준수 테스트, 체인지로그를 함께 갱신하는 하나의 풀 리퀘스트로 반영됩니다.

## 풀 리퀘스트

풀 리퀘스트 하나에는 문제 하나만 담습니다. 리뷰를 요청하기 전에 다음을 합니다. 해당 이슈가 있으면 링크하고, 동작 변경에는 테스트를 추가하거나 갱신하고, 공개 API, 프로토콜, 설정, 사용자 워크플로가 바뀌면 문서를 갱신하고, 호환성, 보안, 라이선스에 미치는 영향을 명시하고, 자격 증명이나 생성된 의존성이나 관련 없는 파일이 함께 끼어들지 않았는지 확인합니다.

## 개발 검사

변경한 영역에 맞는 검사를 실행하세요.

콘솔의 경우:

```bash
cd ui
npm ci
npm run type-check
npm test
npm run build
```

게이트웨이의 경우:

```bash
python -m pytest gateway/tests
```

컨테이너 수준의 변경은 이미지를 빌드하고 리뷰를 요청하기 전에 문서화된 셀프 호스팅 플로를 직접 따라가 보세요.

## 라이선스

기여함으로써 여러분은 자신의 기여가 이 저장소와 같은 라이선스인 Apache License 2.0 하에 라이선스된다는 데 동의합니다.

## main에 변경이 반영되는 방식

`main`은 풀 리퀘스트만 받습니다. 승인 1건, 모든 체크 통과, 누구에게도 예외 없음(관리자 포함)입니다. 풀 리퀘스트는 그 작성자 본인이 승인할 수 없으므로, 메인테이너 계정으로 작업하는 에이전트는 대신 `open-pr` 워크플로로 풀 리퀘스트를 열며, 이는 `github-actions[bot]` 명의로 생성됩니다. 이후 메인테이너가 다른 변경과 마찬가지로 리뷰하고 승인합니다.

```bash
gh workflow run open-pr.yml -f branch=<branch> -f title="<title>" -f body="<body>"
git commit --allow-empty -m "ci: start checks" && git push   # a bot-opened PR needs one push to run CI
```

# How Compaction Works in Pi | EARENDIL

# Pi 에서 압축(compaction)은 어떻게 동작하는가

Date:Thu, 13 Aug 2026

From:Earendil Engineering <[rfc@earendil.com](mailto:rfc@earendil.com)>

To:You

Subject:How Compaction Works in Pi

[Pi](https://pi.dev) 나 Claude Code, Codex 같은 코딩 에이전트로 긴 세션을 해 본 적이 있다면 압축(compaction)을 유발해 봤을 것이다. 이 글에서는 압축이 어떻게 동작하는지, 그리고 Pi 가 언제 압축해야 하는지를 설명한다.

## LLM 대화

대규모 언어 모델(LLM)은 [컨텍스트 윈도우](https://en.wikipedia.org/wiki/Context_window)가 제한돼 있다. 컨텍스트 윈도우란 모델이 응답을 만들 때 "볼" 수 있는 범위다. LLM 이 쓰는 [트랜스포머 구조](https://en.wikipedia.org/wiki/Transformer_(deep_learning))는 처리할 수 있는 입력의 양을 제한한다. 코딩 에이전트 세션의 입력에는 이전 메시지와 도구 호출이 전부 들어가며, 작업을 이어갈수록 계속 커진다. 이것이 컨텍스트 윈도우를 넘어서면 LLM 은 요청을 거부한다.

Pi 같은 코딩 에이전트와 대화형으로 작업할 때, 에이전트는 LLM 에 요청을 보내고 응답을 받는다. 각 요청에는 시스템 프롬프트, [`AGENTS.md`](https://agents.md/) 같은 적재된 파일, 도구 정의, 그리고 대화 이력이 담긴다.

코딩 에이전트의 첫 LLM 요청은 이 초기 컨텍스트에 첫 사용자 메시지가 더해진 것이다.

```language-text
request 1:
[system][tools][user]
```

여기서 한 턴이 시작된다. LLM 은 먼저 도구 호출이 담긴 어시스턴트 메시지를 돌려줄 수 있다. 에이전트 프로그램이 그것을 실행하고, 도구 결과까지 포함한 전체 대화를 담아 LLM 에 새 요청을 보낸다. 그러면 또 하나의 어시스턴트 메시지가 돌아온다. 어시스턴트가 출력 생성을 마치면 그 턴이 끝난다.

```language-text
after request 1:
[system][tools][user][assistant: tool call][tool result][assistant]
                     <------------------->     ^        <--------->
                     returned by LLM           |        returned by LLM
                                               |
                                     produced by the agent
```

작업을 계속하며 메시지를 또 보낸다.

```language-text
request 2:
[system][tools][user][assistant: tool call][tool result][assistant][user]
                                                                     ^
                                                               new user message
```

턴마다 대화가 불어난다. 결국 이력이 컨텍스트 한도를 넘어선다. 그러면 다음 요청은 `Request exceeds the maximum size` 같은 오류를 돌려준다.

```language-text
[system][tools][user][assistant][....][tool result][user]
                                                      ^
                                             exceeds context window
```

## 컨텍스트 초과를 다루는 법

기존 대화를 그대로 이어갈 수 없을 때 선택지는 둘이다.

1. 누적된 컨텍스트 없이 비어 있는 새 대화를 시작할 수 있다. 이렇게 하면 이전 결정과 미결 작업을 포함한 이력이 버려진다. 그래도 괜찮은 선택일 수 있는데, [컨텍스트가 커질수록 LLM 출력의 성능이 떨어지기](https://www.trychroma.com/research/context-rot) 때문이다.
2. 이 대화를 계속 이어가고 싶다면, 대화 컨텍스트를 더 작게 표현한 것을 만들 수 있다. 압축이 하는 일이 바로 그것이다.

## 압축

이론적으로 압축을 구현하는 방법은 여러 가지다. 예를 들어 대화에서 일부만 남기고 나머지를 버리는 결정론적 함수를 쓸 수도 있다. 하지만 실제 구현들은 대화 이력을 요약하는 데 LLM 요청을 쓴다.

압축은 이력의 일부를 압축된 표현으로 갈아 끼워, 메시지와 도구 호출이 더 들어갈 자리를 만든다.

```language-text
[system][tools][compaction result][user]
                                    ^
                               new message
```

## Pi 의 구현

Pi 가 구체적으로 [압축을 어떻게 구현하는지](https://pi.dev/docs/latest/compaction#summary-format) 좀 더 자세히 보자.

대화가 너무 길어지면 Pi 는 압축을 써서 최근 작업은 보존하면서 오래된 내용을 요약한다. 압축은 컨텍스트 한도가 컨텍스트 윈도우 전체 크기에 가까워질 때 발동한다. `/compact` 명령으로 직접 발동시킬 수도 있다.

Pi 는 턴이 끝난 뒤에 자동 압축 여부를 확인한다. 그 전까지는 각 요청이 기존 프롬프트를 늘려가는 형태라 캐시된 접두부를 재사용할 수 있다. 컨텍스트 초과 오류를 만나면 Pi 는 턴 도중에도 압축할 수 있다.

압축할 때 Pi 는 최근 메시지 일부를 손대지 않고 남긴다.

```language-text
before compaction:
[system + tools][older turns][recent retained messages]
```

남기는 메시지 수는 그때그때 다른데, Pi 가 [설정 가능한 토큰 예산](https://pi.dev/docs/latest/compaction#when-it-triggers)을 쓰기 때문이다. Pi 의 현재 기본값인 2만 토큰은 대략 5턴에서 20턴에 해당한다. 이 절단점 앞의 메시지는 전부 뽑혀 직렬화되고, 요약 대상이 된다.

## Pi 의 압축 프롬프트

코딩 에이전트에서 좋은 요약의 이상적인 결과물은 한 근무조가 다음 근무조에게 넘기는 인수인계 브리핑 같은 것이다. Pi 의 압축 프롬프트는 기존 컨텍스트에 더 이상 관련 없는 것이 많다는 사실에 초점을 둔다. 다음 LLM 요청에 여전히 중요한 컨텍스트만 남겨야 한다.

그래서 Pi 는 압축에 일반 대화와는 다른 요청을 보낸다.

1. 독립적인 압축 요청에 쓰는 시스템 프롬프트가 다르다. LLM 에게 "너는 전문 코딩 어시스턴트다" 라고 말하는 대신 ["너는 컨텍스트 요약 어시스턴트다"](https://github.com/earendil-works/pi/blob/47610217098d9ba8f22d223fa7c1413f9f5fd759/packages/coding-agent/src/core/compaction/utils.ts#L152-L158) 라고 말한다.
2. 압축 요청의 사용자 메시지도 다르다. ["나중에 돌아왔을 때의 컨텍스트를 위해 이 대화 분기의 구조화된 요약"](https://github.com/earendil-works/pi/blob/47610217098d9ba8f22d223fa7c1413f9f5fd759/packages/coding-agent/src/core/compaction/compaction.ts#L463-L498)을 요청한다. 프롬프트는 목표와 진행 상황과 핵심 결정에 해당하는 섹션을 지정한다.
3. 기존 대화 이력을 전혀 쓰지 않는 독립 요청이므로, 불필요한 비용 없이 다른 LLM 모델을 쓸 수 있다.

압축 결과는 Pi 세션에 압축 항목으로 덧붙고, 세션은 이어질 수 있다. 압축 요청 뒤에는 컨텍스트가 압축된 상태가 된다.

```language-text
after compaction:
[system][tools][summary][recent turns][new user message]
```

이제 대화 컨텍스트에 메시지가 훨씬 많이 들어갈 자리가 생겼다.

Pi 는 압축 요약을 세션에 평문으로 저장한다. 그래서 압축된 컨텍스트는 읽을 수 있고 [이식 가능](../session-portability)하다. Pi 에서 모델을 바꿔도 그 요약을 계속 쓸 수 있기 때문이다.

## 압축과 프롬프트 캐싱

[프롬프트 캐싱](../prompt-caching)은 LLM 공급자가 같은 대화의 반복 요청을 더 싸게 만들려고 쓰는 방법이다. 활발한 코딩 세션에서는 이미 모델이 생성한 컨텍스트에 대해 값을 덜 낸다. 이 캐싱은 접두부가 정확히 일치해야 하므로, 세션을 압축하면 프롬프트 캐시가 깨진다.

```language-text
cached before compaction:
[system][tools][older history][recent retained turns]
<-------------------- cached prefix -------------------->

first request after compaction:
[system][tools][summary][recent retained turns][new user message]
<-- reusable -->^
                |
        first changed token
                |
                +-- everything after this point must be recomputed
```

남겨 둔 턴은 토큰이 같지만 이제 다른 접두부 뒤에 온다. 그래서 이전의 캐시 상태를 재사용할 수 없다.

압축 이후의 새 요청은 다시 프롬프트 캐싱의 이득을 본다.

## 실험

Pi 는 확장 가능하고 변형 가능하므로, 압축을 직접 만든 것으로 바꿔 끼울 수 있다. 다른 압축 메커니즘을 시험해 보려면 Pi 에게 커스텀 압축 프롬프트를 담은 확장을 만들어 달라고 하면 된다.

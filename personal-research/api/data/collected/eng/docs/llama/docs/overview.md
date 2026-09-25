# Get started with Meta Model API

Meta Model API lets you build with Muse Spark using the tools you already run. It's drop-in compatible with the OpenAI SDK, the Anthropic SDK, and OpenAI-compatible agent CLIs. Point your client at the base URL, set your key, and keep the rest of your code.

You get agent-ready primitives out of the box: parallel tool calls, streamed tool-call arguments, reasoning that carries across turns, and a 1M-token context window.

## At a glance {#at-a-glance}

Everything you need to make your first call.

|  |  |
| --- | --- |
| **Base URL** | `https://api.meta.ai/v1` |
| **Model** | `muse-spark-1.1` |
| **Context window** | 1,048,576 tokens |
| **Auth** | Bearer token (`MODEL_API_KEY`) |
| **Pricing** | Pay-as-you-go; see [Pricing and rate limits](/docs/pricing-rate-limits) |

## Explore the platform {#explore-the-platform}

Jump to the surface you need.

<tile-group col="3">
<tile color="elevated" icon="chain" href="/docs/quickstart" title="Quickstart"> Set your key, call the API, and read your first response.</tile>
<tile color="elevated" icon="chain" href="/docs/models" title="Models"> Muse Spark specs: modalities, context window, and status.</tile>
<tile color="elevated" icon="chain" href="/docs/cookbook" title="Cookbook"> Copy-paste recipes for primitives, agent loops, and use cases.</tile>
<tile color="elevated" icon="chain" href="/docs/pricing-rate-limits" title="Pricing and rate limits"> Per-token pricing and the free and paid rate-limit tiers.</tile>
<tile color="elevated" icon="chain" href="/docs/sdks" title="SDKs and libraries"> Wire up the OpenAI SDK, the Anthropic SDK, and compatible frameworks.</tile>
<tile color="elevated" icon="chain" href="/docs/api-reference" title="API reference"> Full request and response schemas for every endpoint.</tile>
</tile-group>

## Capabilities {#capabilities}

Muse Spark ships agent-ready primitives. Each page explains the concept, shows code, and covers constraints.

<tile-group col="3">
<tile color="elevated" icon="chain" href="/docs/tool-calling" title="Tool calling"> Connect the model to your APIs with parallel, streamed tool calls.</tile>
<tile color="elevated" icon="chain" href="/docs/tool-search" title="Tool search"> Discover and load deferred tools on demand to save tokens.</tile>
<tile color="elevated" icon="chain" href="/docs/search-grounding" title="Search grounding"> Real-time answers with inline citations, no retrieval stack to build.</tile>
<tile color="elevated" icon="chain" href="/docs/image-understanding" title="Image understanding"> Read photos, charts, documents, and screenshots.</tile>
<tile color="elevated" icon="chain" href="/docs/video-understanding" title="Video understanding"> Summarize clips, ask questions about footage, and transcribe speech.</tile>
<tile color="elevated" icon="chain" href="/docs/file-handling" title="File handling"> Upload once and reference files by ID across requests.</tile>
<tile color="elevated" icon="chain" href="/docs/reasoning" title="Reasoning"> Dial reasoning effort up or down per request.</tile>
<tile color="elevated" icon="chain" href="/docs/structured-output" title="Structured output"> Return valid JSON that matches your schema every time.</tile>
<tile color="elevated" icon="chain" href="/docs/prompt-caching" title="Prompt caching"> Cache repeated prefixes to cut latency and cost.</tile>
<tile color="elevated" icon="chain" href="/docs/token-counting" title="Token counting"> Count input tokens before you send to estimate cost and fit context.</tile>
</tile-group>

## Protocols {#protocols}

Pick the request format your code already speaks — same models, same auth, same cost per token. See [Choosing an API](/docs/protocols) to compare them.

<tile-group col="3">
<tile color="elevated" icon="chain" href="/docs/protocols/responses" title="Responses API"> Agentic, multi-step workloads with reasoning replay and server-managed state.</tile>
<tile color="elevated" icon="chain" href="/docs/protocols/chat-completions" title="Chat Completions API"> The OpenAI-compatible messages-array endpoint.</tile>
<tile color="elevated" icon="chain" href="/docs/protocols/messages" title="Messages API"> The Anthropic Messages-compatible endpoint.</tile>
</tile-group>

## Agent guides {#agent-guides}

Go deeper on building agents and integrations.

<tile-group col="3">
<tile color="elevated" icon="chain" href="/docs/coding-agents" title="Coding agents"> Wire Muse Spark into OpenCode, Codex, and other coding harnesses.</tile>
<tile color="elevated" icon="chain" href="/docs/agent-frameworks" title="Agent frameworks"> Build with LangChain, LlamaIndex, and the Vercel AI SDK.</tile>
<tile color="elevated" icon="chain" href="/docs/computer-use" title="Computer use"> Drive a desktop from screenshots with a computer-use agent.</tile>
</tile-group>

## Model API Cookbook: Featured recipes {#featured-recipes}

Start from working code. Explore the full set in the [Cookbook](/docs/cookbook).

<tile-group col="3">
<tile color="elevated" icon="chain" href="/docs/cookbook/computer-use" title="Computer use"> Control a desktop from screenshots with a computer-use agent.</tile>
<tile color="elevated" icon="chain" href="/docs/cookbook/iterative-game-dev" title="Iterative game dev"> Build a browser game end-to-end with a coding agent, verified in a real browser.</tile>
<tile color="elevated" icon="chain" href="/docs/cookbook/quickstart-chat-completions" title="Quickstart: chat completions"> Point the OpenAI SDK at a new base URL and make your first Muse Spark call.</tile>
<tile color="elevated" icon="chain" href="/docs/cookbook/tool-function-calling" title="Tool and function calling"> Detect a tool call, execute it, and feed the result back into the loop.</tile>
<tile color="elevated" icon="chain" href="/docs/cookbook/search-grounding" title="Search grounding"> Ground answers in live web search with inline citations.</tile>
<tile color="elevated" icon="chain" href="/docs/cookbook/multi-agent-orchestration" title="Multi-agent orchestration"> Orchestrate a team of specialists that coordinate through a shared Kanban board.</tile>
</tile-group>

## Get unblocked {#get-unblocked}

Browse the [Help Center](/help) for accounts, API keys, billing, and rate-limit questions. For anything it doesn't cover, contact support through the Help Center.
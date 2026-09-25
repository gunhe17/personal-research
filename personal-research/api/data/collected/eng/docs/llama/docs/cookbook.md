# Meta Model API cookbook

Ship on Muse Spark with recipes that run the first time you copy them. Each recipe solves one focused problem, shows working code, and points to what's next. Start with API fundamentals to nail the primitives, then layer on agent loops and full use cases.

## API fundamentals {#api-fundamentals}

Validate one building block at a time and walk away with a starter you can extend.

<tile-group col="3">
<tile color="blue" icon="cube" href="/docs/cookbook/quickstart-chat-completions" title="Quickstart: chat completions"> Point the OpenAI SDK at a new base URL and make your first Muse Spark call.</tile>
<tile color="blue" icon="cube" href="/docs/cookbook/streaming-responses" title="Streaming responses"> Stream tokens as they generate and read usage in the final chunk.</tile>
<tile color="blue" icon="cube" href="/docs/cookbook/tool-function-calling" title="Tool and function calling"> Detect a tool call, execute it, and feed the result back into the loop.</tile>
<tile color="blue" icon="cube" href="/docs/cookbook/structured-output" title="Structured output"> Return JSON that matches your schema and parses on the first try.</tile>
<tile color="blue" icon="cube" href="/docs/cookbook/prompt-caching" title="Prompt caching"> Reuse a stable prompt prefix and measure cached tokens.</tile>
<tile color="blue" icon="cube" href="/docs/cookbook/reasoning-thinking-tokens" title="Reasoning and thinking tokens"> Set reasoning effort and replay reasoning across turns.</tile>
<tile color="blue" icon="cube" href="/docs/cookbook/vision-input" title="Vision input"> Send images by URL or base64 and get structured analysis back.</tile>
<tile color="blue" icon="cube" href="/docs/cookbook/long-context" title="Long context"> Pack repo-scale context into a single context window.</tile>
<tile color="blue" icon="cube" href="/docs/cookbook/error-handling-retry" title="Error handling and retry"> Back off with jitter and skip retries on client errors.</tile>
<tile color="blue" icon="cube" href="/docs/cookbook/search-grounding" title="Search grounding"> Ground answers in live web search with inline citations.</tile>
</tile-group>

## Agent patterns

Turn a model into an agent. These loops handle planning, self-correction, and staying coherent across long runs.

<tile-group col="3">
<tile color="purple" icon="robot-head" href="/docs/cookbook/basic-agent-loop" title="Basic agent loop"> Wire up the core perceive-decide-act loop.</tile>
<tile color="purple" icon="robot-head" href="/docs/cookbook/interleaved-reasoning-tool-use" title="Interleaved reasoning and tool use"> Interleave reasoning with tool calls in a single turn.</tile>
<tile color="purple" icon="robot-head" href="/docs/cookbook/multi-turn-context-management" title="Multi-turn context management"> Keep context under control across a long agent run.</tile>
<tile color="purple" icon="robot-head" href="/docs/cookbook/search-and-replace-edits" title="Search-and-replace edits"> Make exact-match file edits that stay reviewable.</tile>
<tile color="purple" icon="robot-head" href="/docs/cookbook/alert-fatigue-copilot" title="Alert fatigue copilot"> Pull grounded patterns from noisy alerts, then probe, chat, and self-assess with strict JSON.</tile>
</tile-group>

## Use cases {#use-cases}

Build end-to-end: multimodal perception, orchestration, and complete apps you can adapt.

<tile-group col="3">
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/perception-chart-analysis" title="Chart analysis"> Read charts and extract structured data from images.</tile>
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/perception-error-screenshot-fix" title="Error screenshot fix"> Diagnose a bug from a screenshot and ship the fix.</tile>
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/rayban-openclaw" title="Smart glasses with OpenClaw"> Look, ask out loud, and hear the answer — hands-free on Ray-Ban Meta glasses.</tile>
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/generating-slides" title="Generating slides"> Generate a slide deck from a prompt or source content.</tile>
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/browser-verified-web-design" title="Browser-verified web design"> Build a website with a coding agent that checks its own work in a real browser.</tile>
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/iterative-game-dev" title="Iterative game dev"> Build a browser game end-to-end with a coding agent, verified in a real browser.</tile>
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/sandboxed-execution" title="Sandboxed execution"> Execute model-generated code in a sandbox.</tile>
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/multi-agent-orchestration" title="Multi-agent orchestration"> Orchestrate a team of specialists that coordinate through a shared Kanban board.</tile>
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/one-shot-game-dev" title="One-shot game dev"> Build a complete 3D browser game in one pass — one structured prompt, no iteration loop.</tile>
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/perception-grounding" title="Perception grounding"> Pin interactive dots at object pixel locations and generate a self-contained HTML overlay.</tile>
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/github-agent" title="GitHub agent"> Run an autonomous GitHub Actions bot for triage, PR review, and bug-fix PRs on OpenCode and Muse Spark.</tile>
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/computer-use" title="Computer use"> Control a desktop from screenshots with a computer-use agent.</tile>
<tile color="orange" icon="sparkle-diamond" href="/docs/cookbook/computer-use-macos" title="Computer use on macOS"> Drive a real Mac from screenshots with native mouse and keyboard events.</tile>
</tile-group>
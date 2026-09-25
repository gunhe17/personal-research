# Use Poolside where you work

> Use Poolside models in your development workflow.

Poolside models can help you write, debug, refactor, and automate code in the tools where you already work. Choose a surface, then follow the guide to get started.

<Tip>
  Want to try a model before choosing a development workflow? Use [chat.poolside.ai](https://chat.poolside.ai/) to send prompts from your browser. No sign-up required.
</Tip>

<CardGroup cols={2}>
  <Card title="Terminal" icon="terminal" href="/cli/interactive-mode">
    Run interactive, multi-turn sessions in your project directory.
  </Card>

  <Card title="Automation" icon="bolt" href="/cli/automated-mode">
    Run one-shot tasks in scripts, CI jobs, and other automated workflows.
  </Card>

  <Card title="Editors" icon="code" href="/tools#editors">
    Work with Poolside where you write code.
  </Card>

  <Card title="Desktop apps" icon="desktop" href="/tools#desktop-apps">
    Use a dedicated app experience outside your editor.
  </Card>

  <Card title="Coding agents" icon="robot" href="/tools#coding-agents">
    Use Poolside models in third-party coding agents.
  </Card>

  <Card title="Local models" icon="server" href="/tools#local-model-runtimes">
    Run Poolside models locally with Ollama or SGLang.
  </Card>

  <Card title="Applications" icon="brackets-curly" href="/api/overview">
    Send model requests from your own tools and services.
  </Card>
</CardGroup>

Some paths run Poolside's agent directly, such as Poolside Agent CLI and ACP-compatible editors. Other paths use a third-party tool that calls Poolside models through the providers each tool supports.

<Note>
  Third-party tools control their own configuration flows, supported providers, and permission settings. Review the tool's documentation and security model before you let it read files, edit code, run commands, or use external services.
</Note>

## Work from the terminal

Use `pool` from [Poolside Agent CLI](/cli/pool) for interactive, multi-turn sessions in your project directory. To get started, see [Work from the terminal](/cli/interactive-mode).

## Automate tasks

Use `pool exec` from [Poolside Agent CLI](/cli/pool) to run one-shot tasks in scripts, CI jobs, and other automated workflows. To get started, see [Automate tasks](/cli/automated-mode). To run tasks in GitHub Actions, see [Run Poolside in GitHub Actions](/tools/github-actions).

## Work in an editor

Use Poolside in an editor when you want agent help where you already write code. There are two paths:

* **ACP editors** use `pool acp` to run Poolside Agent CLI from the editor. The editor acts as the ACP client, and `pool acp` runs the agent session.
* **Editor extensions** run their own agent experience and call Poolside models directly or through the providers each tool supports.

Through ACP, editors can expose Poolside Agent CLI features such as [plan mode](/cli/interactive-mode#use-plan-mode), [skills](/cli/interactive-mode#use-a-skill), [AGENTS.md instructions](/agent-instructions), [session history](/cli/interactive-mode#sessions), [model selection](/cli/interactive-mode#change-the-agent), and [slash commands](/cli/interactive-mode#slash-commands). Editor support varies by ACP client. If your editor does not expose an ACP capability, Poolside may still support the feature, but it may not appear in that editor's UI.

For setup guides, see [Editors](/tools#editors).

## Build applications

Use the [Poolside API](/api/overview) when you want to call Poolside models from your own application, internal tool, script, or service. Poolside provides an OpenAI-compatible API, so you can call it directly or use the OpenAI SDK with the Poolside base URL and API key. For endpoint reference and tool use, see [OpenAI-compatible API examples](/api/openai-api-examples).

## Next steps

After you choose where to work, see [Configure](/configure) to shape agent behavior and control what it can do.

For an example of running a coding agent on your own hardware, see [How to run a Poolside model locally](/resources/run-model-locally). For Ollama-specific setup, see [Use Poolside with Ollama](/tools/ollama).

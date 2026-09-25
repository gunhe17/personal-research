# Poolside Agent CLI

> Use the `pool` command for interactive sessions, automated tasks, ACP editors, and other agent servers.

Poolside Agent CLI is the command-line application for Poolside's coding agent. Use the `pool` command to work directly from your terminal, automate one-shot tasks, or connect Poolside to an ACP-compatible editor. You can also use `pool` as an ACP client for another compatible agent server.

The agent can read your code, answer questions about a project, propose changes, edit files, run commands, and use configured resources such as MCP servers and skills. You control what it can do with approval prompts, permissions, and sandboxes.

<Info>
  This documentation describes Poolside Agent CLI v1.0.13. Check your version with `pool --version`. To update, exit any active session and run `pool update` from your terminal. See [Poolside Agent CLI releases on GitHub](https://github.com/poolsideai/pool/releases) for release history.
</Info>

## Key features

* [Plan mode](/cli/interactive-mode#use-plan-mode) to review an approach before the agent changes your code
* [Skills](/cli/interactive-mode#use-a-skill) and [slash commands](/cli/interactive-mode#slash-commands) to extend and speed up common workflows
* [Sessions](/cli/interactive-mode#sessions) and [rewind](/cli/interactive-mode#rewind-a-turn) to resume work and undo turns
* [Modes](/cli/interactive-mode#modes) to control how much the agent can do without asking
* [AGENTS.md instructions](/agent-instructions) to give the agent project-specific guidance
* [MCP servers](/mcp-servers) to connect external tools and resources

## Choose a workflow

<CardGroup cols={2}>
  <Card title="Work in the terminal" icon="terminal" href="/cli/interactive-mode">
    Use `pool` for interactive, multi-turn sessions in your project directory.
  </Card>

  <Card title="Automate a task" icon="bolt" href="/cli/automated-mode">
    Use `pool exec` for one-shot prompts in scripts and CI jobs.
  </Card>

  <Card title="Use Poolside in an editor" icon="code" href="/tools#editors">
    Connect Poolside to an ACP-compatible editor with `pool acp`.
  </Card>

  <Card title="Connect another agent server" icon="server" href="/cli/other-agent-servers">
    Use `pool` as an ACP client for another compatible agent server.
  </Card>
</CardGroup>

## Install and authenticate

[Install Poolside Agent CLI](/cli/install) to install `pool` and sign in. To compare access methods, such as Poolside Platform, a Poolside deployment, or OpenRouter, see [Log in to Poolside](/get-started/log-in).

<Tip>
  Looking for a Poolside API key? Run `pool login` and choose **Use Poolside Platform for free (recommended)** for the fastest way to get free developer access to models hosted by Poolside.
</Tip>

## Configure the agent

[Configure Poolside](/configure) to customize agent behavior and the resources it can use across terminal, automated, and ACP sessions, including [permissions and sandboxes](/permissions) that control what the agent can access and run.

## Related resources

* [CLI reference](/cli/cli-reference) for commands, flags, slash commands, and exit codes. To see commands and flags for your installed version, run `pool --help`.
* [Troubleshoot Poolside Agent CLI](/cli/troubleshooting) for authentication, connection, session, and ACP issues.
* [Uninstall Poolside Agent CLI](/cli/install#uninstall-poolside-agent-cli) to remove `pool` and saved local data.

<Note>
  For `pool` CLI bugs and feature requests, open an issue on [GitHub](https://github.com/poolsideai/pool).
</Note>

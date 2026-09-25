# Use Poolside Assistant for desktop

> Work with Poolside and other ACP-compatible coding agents from a dedicated desktop app.

Poolside Assistant for desktop is an Agent Client Protocol (ACP) client for coding agents. Use it outside your editor to work across projects, run tasks in Git worktrees, use built-in terminals, and review changes.

<Note>
  Poolside Assistant is separate from [Poolside Enterprise Assistant](https://docs.poolside.ai/platform/ide/poolside-assistant), the enterprise extension.
</Note>

## Key features

* **ACP agents**: Use Poolside Agent or connect another ACP-compatible agent.
* **Consistent experience**: Use the same assistant experience available in the Poolside Assistant extensions for VS Code and Visual Studio.
* **Parallel work**: Run multiple agent sessions at once in separate Git worktrees and branches.
* **Agent handoff**: Hand off to another supported agent and keep the conversation history visible.
* **Multiple projects**: Work across multiple projects in one window with per-project settings.
* **GitHub integration**: Connect GitHub in **Settings > GitHub** for pull request awareness and status colors.
* **MCP servers**: Add integrations for services such as GitHub, Linear, Notion, Sentry, Hugging Face, and PostgreSQL from **Connectors**.
* **On-device models**: Download and run supported models on your Mac.
* **Remote access**: Access the desktop app from your phone (experimental).
* **Voice input**: Dictate prompts instead of typing them.

## Install

**Prerequisites**

* You have a Mac with Apple Silicon.

**Steps**

1. [Download the Poolside Assistant for desktop `.dmg` file](https://poolside.ai/downloads/desktop).
2. Open the `.dmg` file and drag **Poolside** to **Applications**.
3. Launch **Poolside** from **Applications**.
4. Open a project.

<Note>
  Poolside Assistant installs and updates its own copy of Poolside Agent, separate from any Poolside Agent CLI installation. Both use the same Poolside configuration.
</Note>

## Start your first task

Poolside Agent is available by default. Sign in to connect it to Poolside models, then start your first task.

**Prerequisites**

* You installed Poolside Assistant for desktop and opened a project.

**Steps**

1. Click **New conversation**.
2. In the conversation tab, click **Log in to Poolside**.
3. Complete the login flow in the terminal that opens. For help choosing an access method, see [Log in to Poolside](/get-started/log-in).
4. Return to the conversation tab and click **I'm logged in**.
5. Confirm the agent, model, and effort, then describe your task in the prompt input box.

The agent may ask for approval before it reads files, runs commands, or edits code. Review proposed actions and changes before you approve or keep them.

## Work with your agent

* Type `/` in the prompt input box to open commands and session controls. Available commands depend on the selected agent.
* Type `$` in the prompt input box to open skills when the selected agent or workspace provides them. For more information, see [Skills](/skills).
* Mention relevant files, folders, and other project details in your prompt to give the agent context.
* Use the prompt controls to change the mode, model, effort, or voice input before you send a prompt. Available controls depend on the selected agent.
* Use the prompt controls or the `/agent` menu to hand off to another agent. The new agent takes over on your next message, with the conversation history still visible.
* Review changes before you keep them. Approve commands and tool use only when you understand what the agent is about to do.

## Use another ACP-compatible agent

Poolside Assistant includes third-party agent harnesses tested by Poolside and other ACP agents from the public registry.

**Prerequisites**

* You installed Poolside Assistant for desktop.

**Steps**

1. Navigate to **Settings > Agents**.
2. Choose an agent under **Tested by Poolside** or **Other Third-Party Agents**.
3. Click **Install** if the agent is not already enabled.
4. Start a new conversation and select the agent from the prompt controls.

Third-party agents run local code from their publisher. Install only agents you trust and review the command or binary before installation.

## Configure a custom ACP agent

Use `assistant.json` when you need Poolside Assistant to run a custom ACP executable that is not available in the public registry.

**Configuration file locations**

* **macOS and Linux**: `~/.config/poolside/assistant.json`
* **Windows**: `%USERPROFILE%\.config\poolside\assistant.json`
* **Custom XDG directory**: `$XDG_CONFIG_HOME/poolside/assistant.json`

The file uses strict JSON and does not support comments.

### Add a custom agent

Add the agent to `agent_servers`. The entry's key is the name that appears in Poolside Assistant.

```json theme={null}
{
  "agent_servers": {
    "my-agent": {
      "type": "custom",
      "command": "my-agent",
      "args": ["acp"]
    }
  }
}
```

The `command` value can be an executable on your `PATH` or an absolute path. Poolside Assistant starts the executable directly and passes each `args` item without interpreting shell syntax. If the command requires shell syntax, invoke the shell explicitly.

### Configuration fields

| Field                    | Type                             | What it's for                                                                         |
| ------------------------ | -------------------------------- | ------------------------------------------------------------------------------------- |
| `agent_servers`          | object                           | Maps the names shown in Poolside Assistant to agent configurations.                   |
| `default_agent_server`   | string                           | Selects the agent for new conversations. Defaults to `poolside`.                      |
| `type`                   | `custom`, `registry`, or `local` | Defines how Poolside Assistant manages the agent. A custom entry can omit this field. |
| `command`                | string                           | Sets the executable name or path for a custom agent. Required for custom agents.      |
| `args`                   | string array                     | Passes arguments to the custom agent.                                                 |
| `env`                    | string map                       | Adds environment variables to the agent process.                                      |
| `default_config_options` | string map                       | Sets agent-defined defaults for new sessions.                                         |

Values in `default_config_options` must match the option IDs and values advertised by the agent.

<Warning>
  Values in `env` are stored as plain text in `assistant.json`. Do not store API keys, tokens, or other secrets there. Use the agent's login flow, inherited environment, or Poolside connectors instead.
</Warning>

### Apply changes

Restart Poolside Assistant after you edit `assistant.json` manually. Changes made through **Settings > Agents** stop the affected agent process automatically.

Malformed JSON does not prevent Poolside Assistant from starting. It continues with the last loaded agent configuration and shows an error above the prompt input box. Fix the file, then select **Retry** in the error message.

## Run a model on your device

Poolside Local runs supported models on your Mac with the MLX framework instead of connecting to a hosted model.

**Prerequisites**

* You installed Poolside Assistant for desktop.
* Your Mac has enough disk space and memory for the model you want to download.

**Steps**

1. Navigate to **Settings > On-Device Models**.
2. Download a model:
   * Under **Recommended Models**, review **Fit**, estimated memory, and download size, then click **Download**.
   * Under **Hugging Face models**, search for an MLX model, select it, and click **Download**.
3. Start a new conversation.
4. In the prompt controls, select **Poolside Local** as the agent, then select the model you downloaded.

Poolside Assistant stores downloaded models in `~/.config/poolside/models`.

Some gated and private Hugging Face models require you to add the **Hugging Face** connector and sign in before downloading them.

## Related resources

* [Desktop apps](/tools#desktop-apps)
* [Poolside Agent CLI](/cli/pool)
* [ACP documentation](https://agentclientprotocol.com/)
* [Send Poolside Assistant feedback](mailto:feedback@poolside.ai)

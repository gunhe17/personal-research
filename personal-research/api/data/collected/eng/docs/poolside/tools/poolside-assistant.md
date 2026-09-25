# Use Poolside Assistant in VS Code or Visual Studio

> Use Poolside and other ACP-compatible coding agents in VS Code or Visual Studio.

Poolside Assistant is an Agent Client Protocol (ACP) client that lets you work with coding agents in VS Code and Visual Studio. It includes the Poolside agent and can also run other ACP-compatible agents.

<Note>
  Poolside Assistant is separate from [Poolside Enterprise Assistant](https://docs.poolside.ai/platform/ide/poolside-assistant), the enterprise extension.
</Note>

## Key features

* **ACP agents**: Use Poolside Agent or connect another ACP-compatible agent.
* **Consistent experience**: Use the same assistant experience available in Poolside Assistant for desktop.
* **Agent registry**: Install agent harnesses tested by Poolside or agents from the public registry.
* **Agent handoff**: Hand off to another supported agent and keep the conversation history visible.
* **MCP servers**: Add integrations for services such as GitHub, Linear, Notion, Sentry, Hugging Face, and PostgreSQL from **Settings > Connectors** in the bottom-right corner of the panel.
* **Review controls**: Review proposed actions and code changes before you approve or keep them.
* **Voice input**: Dictate prompts instead of typing them.

## Install

<Tabs>
  <Tab title="VS Code">
    **Prerequisites**

    * You have VS Code 1.85.0 or later.

    **Steps**

    1. Install [Poolside Assistant from the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=poolside-ai.acp-assistant), or search for **Poolside Assistant** in the Extensions view.
    2. Open the Command Palette and run **Poolside: Show Sidebar**.
  </Tab>

  <Tab title="Visual Studio">
    **Prerequisites**

    * You have Visual Studio 2022 version 17.9 or later on Windows amd64.

    **Steps**

    1. In Visual Studio, go to **Extensions > Manage Extensions**, search for **Poolside Assistant**, and click **Install**. You can also install it from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=poolside-ai.vs-acp-assistant).
    2. Restart Visual Studio to finish installing the extension.
    3. Navigate to **Tools > Poolside Assistant > Focus Input**.
  </Tab>
</Tabs>

## Start your first task

**Prerequisites**

* You installed and opened Poolside Assistant.

**Steps**

1. Start a new conversation:
   * In VS Code, run **Poolside: New Conversation** from the Command Palette or select the new conversation icon in the Poolside Assistant panel.
   * In Visual Studio, navigate to **Tools > Poolside Assistant > New Conversation** or select the new conversation icon in the Poolside Assistant panel.
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

Poolside Assistant can install tested third-party agents and agents from the public ACP registry.

**Prerequisites**

* You installed and opened Poolside Assistant.

**Steps**

1. In the Poolside Assistant panel, click **Settings > Agents** in the bottom-right corner.
2. Click **Install** next to the agent you want to use.
3. Start a new conversation and select the agent from the prompt controls.

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

## Related resources

* [Editors](/tools#editors)
* [Poolside Agent CLI](/cli/pool)
* [ACP documentation](https://agentclientprotocol.com/)
* [Send Poolside Assistant feedback](mailto:feedback@poolside.ai)

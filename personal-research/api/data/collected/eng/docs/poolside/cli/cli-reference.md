# CLI reference

> Reference for current `pool` commands, flags, slash commands, and exit codes.

Reference for current `pool` commands, user-facing flags, slash commands, and exit codes. For an overview and usage guidance, start with [Poolside Agent CLI](/cli/pool).

<Info>
  This documentation describes Poolside Agent CLI v1.0.13. Check your version with `pool --version`. To update, exit any active session and run `pool update` from your terminal. See [Poolside Agent CLI releases on GitHub](https://github.com/poolsideai/pool/releases) for release history.
</Info>

## pool

`pool` starts an interactive session by default. Arguments after `--` are forwarded to the configured agent server.

By default, `pool` uses the credentials saved by `pool login`. To authenticate one invocation with an API key, set `POOLSIDE_API_KEY` before the command. To override the saved API URL for one invocation, set `POOLSIDE_API_URL` before `pool`.

```bash theme={null}
POOLSIDE_API_KEY=<api-key> pool
```

If your MCP servers expect environment variables, start `pool` with those variables set.

```bash theme={null}
KEY=VALUE pool
```

| Flag                              | Short flag | Description                                                                                                                                                                               |
| --------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--directory`                     | `-C`       | Working directory for the interactive session                                                                                                                                             |
| `--worktree [<branch-name>]`      | `-w`       | Run the session in a Git worktree for the named branch, creating the worktree and branch if needed. Use the flag without a branch name to generate a worktree name.                       |
| `--resume`                        | `-r`       | Resume a previous session by ID, or use `-r` alone to open the session picker. In the picker, press `Tab` to switch between current-directory sessions and sessions from all directories. |
| `--model`                         | `-m`       | Override the saved model preference for the interactive session                                                                                                                           |
| `--mode`                          |            | Override the saved mode preference for the interactive session                                                                                                                            |
| `--agent-server [<agent-server>]` | `-s`       | Agent server entry, command, or remote ACP URL to use. Use `pool -s` to open the agent server picker.                                                                                     |
| `--sandbox <mode>`                |            | Override sandbox usage for the Poolside agent server. Supported values: `required` and `disabled`.                                                                                        |
| `--prompt-queue <prompt>`         | `-q`       | Queue a prompt to send after the interactive session and agent connection finish initializing. Repeat to queue multiple prompts.                                                          |
| `--help`                          | `-h`       | Show help for `pool` and exit                                                                                                                                                             |
| `--version`                       | `-v`       | Show the current `pool` version and exit                                                                                                                                                  |

Use `pool <command> --help` to show help for a subcommand.

For keyboard shortcuts, see [Work from the terminal](/cli/interactive-mode#keyboard-shortcuts).

## pool exec

`pool exec` runs a single prompt non-interactively and then exits. Provide the prompt with `--prompt`, `--prompt-file`, or standard input.

Files passed after `--` are added as context for the run.

To authenticate `pool exec` in a non-interactive environment, set `POOLSIDE_API_KEY` before the command. For complete setup examples, see [Automate tasks](/cli/automated-mode#basic-usage).

```bash theme={null}
POOLSIDE_API_KEY=<api-key> pool exec -p "test"
```

If your MCP servers expect environment variables, start `pool exec` with those variables set.

```bash theme={null}
KEY=VALUE pool exec -p "test"
```

| Flag                  | Short flag | Description                                                                                         |
| --------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| `--prompt`            | `-p`       | Prompt text. Use `-` to read the prompt from standard input.                                        |
| `--prompt-file`       | `-f`       | File containing the prompt                                                                          |
| `--directory`         | `-d`       | Working directory to operate in. Defaults to the current directory.                                 |
| `--agent-name`        | `-a`       | Agent to use in tenant mode                                                                         |
| `--api-url`           |            | OpenAI-compatible API URL to use for provider connections                                           |
| `--output`            | `-o`       | Output format: `markdown` or `json`. JSON output is newline-delimited JSON.                         |
| `--unsafe-auto-allow` |            | Automatically approve tool actions without confirmation                                             |
| `--verbose`           |            | Print verbose tool result output                                                                    |
| `--sandbox <mode>`    |            | Override sandbox usage. Supported values: `required` and `disabled`.                                |
| `--continue`          |            | Continue a previous conversation. Provide a run ID, or use the flag alone to continue the last run. |

### Exit codes

| Code  | Meaning                                                        |
| ----- | -------------------------------------------------------------- |
| `0`   | Task completed successfully                                    |
| `4`   | The agent ran but reported that it could not complete the task |
| Other | Unexpected CLI or request error                                |

## pool acp

`pool acp` starts Poolside's Agent Client Protocol (ACP) server over standard input and standard output.

If your MCP servers expect environment variables, start `pool acp` with those variables set.

| Flag                    | Short flag | Description                                                                                                                  |
| ----------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `--sandbox <mode>`      |            | Override sandbox usage. Supported values: `required` and `disabled`.                                                         |
| `--settings <settings>` |            | Apply extra settings on top of workspace and global settings. Provide a path to a YAML settings file or inline YAML content. |
| `--version`             | `-v`       | Show the current `pool acp` version and exit                                                                                 |

```bash theme={null}
KEY=VALUE pool acp
```

Configure thought level through ACP session config options when your editor exposes them.

<Note>
  Available thought levels depend on your provider, agent server, and model.

  * Your ACP client might display generic effort values: `default`, `max`, `xhigh` (**Extra high**), `high`, `medium`, `low`, `minimal`, and `none`.
  * `default` clears your override and lets the backend choose an effort level.
  * When you configure thought level through an ACP client connected to Poolside Platform or an enterprise deployment with `pool login`, the backend determines how to apply the requested effort.
  * In those ACP sessions, use `max` to request thinking on and `none` to request thinking off. Other generic values do not select distinct reasoning levels.
  * With OpenRouter, available choices can come from provider model metadata.
</Note>

### pool acp serve

<Note>
  `pool acp serve` is experimental. Its flags and behavior can change in any release.
</Note>

`pool acp serve` serves the Poolside ACP agent over a Streamable HTTP network transport on the configured listen address instead of standard input and output. One agent instance starts for each inbound connection.

`pool acp serve` inherits the agent-configuration flags from `pool acp`, such as `--sandbox` and `--settings`.

```bash theme={null}
pool acp serve --host 127.0.0.1 --port 3284
```

When you connect with `pool --agent-server`, use the `/acp` endpoint over Streamable HTTP. With the default host and port, the remote ACP URL is `http://localhost:3284/acp`.

| Flag                         | Description                                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `--host <host>`              | Host interface to bind. Defaults to `127.0.0.1`. Use `0.0.0.0` to accept connections from any interface.                |
| `--port <port>`              | TCP port to bind. Defaults to `3284`.                                                                                   |
| `--access-log <destination>` | HTTP access log destination. Supported values are `stderr`, `stdout`, `-`, `off`, or a file path. Defaults to `stderr`. |

### pool acp setup

Use `pool acp setup` to configure Zed or JetBrains to use Poolside.

| Flag                | Description                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| `--editor <editor>` | Editor to configure. Required. Supported values: `zed` and `jetbrains` |

### pool acp logs

`pool acp logs` reads ACP debug logs from the Poolside log directory for the current working directory.

| Flag        | Short flag | Description                         |
| ----------- | ---------- | ----------------------------------- |
| `--follow`  | `-f`       | Follow log output                   |
| `--pretty`  | `-p`       | Pretty-print log output             |
| `--session` |            | Show logs for a specific session ID |

## Setup and authentication

### pool login

`pool login` runs the interactive login flow. Without flags, it asks whether you want to use Poolside Platform, your organization's Poolside deployment, OpenRouter, or an OpenAI-compatible provider.

| Flag              | Description                                      |
| ----------------- | ------------------------------------------------ |
| `--api-key <key>` | Configure provider access with the given API key |
| `--api-url <url>` | Configure tenant mode with the given API URL     |

### pool logout

`pool logout` removes stored credentials for the selected API URL. For Poolside deployment logins, it revokes the credential on the deployment and removes the local credential. If `pool` cannot reach the deployment, it removes the local credential anyway. For provider connections, it removes the stored API key from your machine.

| Flag              | Description    |
| ----------------- | -------------- |
| `--api-url <url>` | API URL to use |

## Configuration and updates

### pool config

Prints the log, trajectory, and config directories, plus the credentials path.

### pool config settings

Opens `settings.yaml` in `VISUAL`, `EDITOR`, or `vi`, validates it after you exit the editor, and then saves it.

For approval rules, path rules, and sandbox configuration, see [Permissions](/permissions).

### pool update

`pool update [version]` updates the CLI to the latest version, or to a specific version when you provide one.

| Flag      | Description                                                |
| --------- | ---------------------------------------------------------- |
| `--force` | Reinstall even if the CLI is already on the target version |

## Slash commands

Slash command availability depends on where you use `pool`.

### Interactive slash commands

Use these commands in an interactive `pool` session.

| Command                           | What it does                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/model`                          | Open the agent selector for the current session                                                                                                                    |
| `/mode`                           | Open the mode selector                                                                                                                                             |
| `/thought-level [<level>]`        | Open the thought-level selector, or set a thought level. Use `/effort` as an alias. Available only when the connected agent server provides thought-level choices. |
| `/new` or `/clear`                | Clear conversation history and start a new session. The new session keeps the current model and mode unless you change them.                                       |
| `/copy`                           | Copy the last agent response to the clipboard                                                                                                                      |
| `/rewind`                         | Roll back to a previous turn                                                                                                                                       |
| `/resume`                         | Open the session picker and switch to a previous session                                                                                                           |
| `/rename`                         | Rename the current session                                                                                                                                         |
| `/move`                           | Move the session to another Git worktree, or create one. If the current worktree has uncommitted changes, choose whether to move those files too.                  |
| `/set-option <config-id> <value>` | Set a session configuration option by ID on the connected ACP agent                                                                                                |
| `/system`                         | Show the system prompt for the current session when available                                                                                                      |
| `/feedback`                       | Open a feedback draft and optionally attach logs                                                                                                                   |
| `/logs`                           | Archive debug logs for the current session                                                                                                                         |
| `/quit` or `/exit`                | Exit the session                                                                                                                                                   |
| `/debug:dump`                     | Write the raw agent-server message log to a local JSON file                                                                                                        |

When you use the Poolside agent server, these additional commands are available in interactive mode:

| Command                  | What it does                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/plan`                  | Switch to plan mode                                                                                                                            |
| `/compact [<guidance>]`  | Compact conversation context. Add guidance after the command to tell the agent what to preserve, such as `/compact preserve tool call errors`. |
| `/share`                 | Get a link to the trajectory viewer for the current session                                                                                    |
| `/mcp`                   | Show MCP servers, connection status, and tools for the current session                                                                         |
| `/sandbox`               | Show local sandbox configuration                                                                                                               |
| `/sandbox-apply-to-host` | Review pending sandbox filesystem changes and apply them to the host workspace when available                                                  |
| `/skills`                | Refresh and list available skills, including any skill load errors                                                                             |
| `/usage`                 | Show token usage, context window state, and session cost when available                                                                        |

In interactive `pool`, skills use the `$` skill picker instead of the slash-command menu. Type `$` at the start of the prompt or after a space to open the skill picker and add a skill reference to your prompt.

### ACP slash commands

When your editor passes slash commands to `pool acp`, these commands are available:

| Command                  | What it does                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/plan`                  | Switch to plan mode when plan mode is available                                                                                                |
| `/clear`                 | Clear conversation history and free up context                                                                                                 |
| `/compact [<guidance>]`  | Compact conversation context. Add guidance after the command to tell the agent what to preserve, such as `/compact preserve tool call errors`. |
| `/share`                 | Get the trajectory viewer URL for the current session when trajectory sharing is available                                                     |
| `/rename`                | Rename the current session                                                                                                                     |
| `/mcp`                   | Show MCP servers, connection status, and tools for the current session                                                                         |
| `/sandbox`               | Show local sandbox configuration                                                                                                               |
| `/sandbox-apply-to-host` | Review pending sandbox filesystem changes and apply them to the host workspace when available                                                  |
| `/usage`                 | Show token usage, context window state, and session cost for the current session when available                                                |
| `/skills`                | Refresh and list available skills, including any skill load errors                                                                             |

Compatible ACP clients can expose available skills from `pool acp` as slash commands. The available skill commands depend on the skills configured for the agent and workspace.

## History

### pool history logs

Use `pool history logs [<log-file-name-fragment>]` to list recent log files or show one matching file.

| Flag       | Short flag | Description                                                            |
| ---------- | ---------- | ---------------------------------------------------------------------- |
| `--all`    | `-a`       | Show all log files instead of the most recent 20                       |
| `--latest` | `-l`       | Show the most recent log file and write its filename to standard error |
| `--pretty` | `-p`       | Pretty-print log contents with colors and formatting                   |
| `--follow` | `-f`       | Follow log output like `tail -f`                                       |

### pool history trajectories

Use `pool history trajectories [<trajectory-file-name-fragment>]` to list recent trajectory files or show one matching file.

Use `--atif` when you need to convert a local trajectory to Agent Trajectory Interchange Format (ATIF) JSON for external tooling.

| Flag       | Short flag | Description                                                                                           |
| ---------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `--all`    | `-a`       | Show all trajectory files instead of the most recent 20                                               |
| `--latest` | `-l`       | Show the most recent trajectory file                                                                  |
| `--atif`   |            | Render a single trajectory in ATIF JSON format. Use with `--latest` or part of a trajectory filename. |
| `--pretty` | `-p`       | Pretty-print ATIF JSON. Only applies with `--atif`.                                                   |

### pool history sessions

`pool history sessions` lists recent sessions.

| Flag    | Short flag | Description                                     |
| ------- | ---------- | ----------------------------------------------- |
| `--all` | `-a`       | Show all sessions instead of the most recent 20 |

```bash theme={null}
pool history sessions
pool history logs --latest --pretty
pool history trajectories --latest
```

## MCP servers and secrets

### pool mcp list

Lists configured MCP servers. Sensitive header values and environment values are masked in the output.

### pool mcp get

Use `pool mcp get <name>` to inspect one MCP server configuration. Sensitive header values and environment values are masked in the output.

### pool mcp remove

Use `pool mcp remove <name>` to remove an MCP server from `settings.yaml`.

### pool mcp add

Use `pool mcp add <name> [command] [args...]` to add an MCP server.

Use `--transport` to add a remote server. Without `--transport`, `pool` expects a command-based server and requires a command after `--`.

| Flag                 | Short flag | Description                                                      |
| -------------------- | ---------- | ---------------------------------------------------------------- |
| `--transport <type>` | `-t`       | Transport type for remote servers: `http` or `sse`               |
| `--env <key=value>`  | `-e`       | Environment variable to store with the server. Repeat as needed. |
| `--header <header>`  | `-H`       | HTTP header for HTTP or SSE transport. Repeat as needed.         |

Examples:

```bash theme={null}
# Command-based server over stdio
pool mcp add filesystem -- node filesystem-server.js

# Remote HTTP server
pool mcp add --transport http notion https://mcp.notion.com/mcp

# Remote SSE server
pool mcp add --transport sse linear https://mcp.linear.app/sse

# Pass environment variables or HTTP headers
pool mcp add --env API_KEY=<api-key> myserver -- npx -y myserver-mcp
pool mcp add --transport http --header "Authorization: Bearer $TOKEN" svc https://example.com/mcp

# Inspect and remove
pool mcp list
pool mcp get <name>
pool mcp remove <name>
```

`pool` stores MCP server configuration under `mcp_servers` in `settings.yaml`. To share servers with a project, add them to `.poolside/settings.yaml`. To keep them personal across projects, add them to `~/.config/poolside/settings.yaml`.

### pool secrets list

Lists stored secrets and their source.

### pool secrets add

Use `pool secrets add <name>` to store a secret in the system keychain.

| Flag                   | Short flag | Description                |
| ---------------------- | ---------- | -------------------------- |
| `--description <text>` | `-d`       | Description for the secret |

### pool secrets edit

Use `pool secrets edit <name>` to update a stored secret.

| Flag                   | Short flag | Description            |
| ---------------------- | ---------- | ---------------------- |
| `--name <name>`        |            | Rename the secret      |
| `--description <text>` | `-d`       | Update the description |

### pool secrets get

Use `pool secrets get <name>` to inspect a stored secret.

| Flag           | Description                  |
| -------------- | ---------------------------- |
| `--show-value` | Show the stored secret value |

### pool secrets delete

Use `pool secrets delete <name>` to remove a secret from the keychain.

## Related resources

* [Poolside Agent CLI](/cli/pool)
* [Work from the terminal](/cli/interactive-mode)
* [Automate tasks](/cli/automated-mode)

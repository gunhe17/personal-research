# MCP servers

> Configure personal MCP servers that Poolside agents can invoke from the CLI.

Use Model Context Protocol (MCP) servers to connect Poolside agents to external tools and services. For more information, see the [Model Context Protocol documentation](https://modelcontextprotocol.io/docs/getting-started/intro).

An MCP server acts as a tool endpoint that an agent can call. MCP servers let agents invoke tools, interact with APIs, and run operations in external systems.

For a complete reference of supported `settings.yaml` keys, including `mcp_servers`, see [Settings file reference](/settings-file-reference).

## When to use an MCP server

Use an MCP server when you want agents to:

* Invoke external tools or services
* Call APIs or interact with third-party systems
* Integrate with internal or custom tooling
* Perform specialized or domain-specific operations

Do not use an MCP server for:

* Static instructions or repeatable workflows. Use [skills](/skills) instead.
* Broad agent behavior that should apply to every task. Use [AGENTS.md instructions](/agent-instructions) instead.
* Operations that cannot be safely constrained by permissions and approvals.

## Connection types

Each MCP server uses a single connection type, which determines how tools run and how Poolside communicates with them.

* Use **Stdio (Local Process)** to run an MCP server as a local process. This connection type is useful for local tools, scripts, or filesystem access.
* Use **Streamable HTTP** or **Server-Sent Events (SSE)** to connect to MCP servers over a URL. These connection types are typically used for hosted or remote services.

| Feature               | Stdio (Local Process)                       | Streamable HTTP                                     | Server-Sent Events (SSE)                  |
| --------------------- | ------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| Execution environment | Runs inside the sandbox                     | Runs outside the sandbox                            | Runs outside the sandbox                  |
| Network policy        | Uses sandbox network settings               | Ignores sandbox network settings                    | Ignores sandbox network settings          |
| Location              | Local agent host                            | Local or remote                                     | Local or remote                           |
| Transport             | Standard input/output                       | Chunked HTTP responses                              | Persistent HTTP stream                    |
| Communication style   | Bidirectional, process-based                | Incremental request/response                        | One-way push from server to client        |
| Best for              | Local CLI tools, scripts, filesystem access | AI streaming, long-running APIs, or data-heavy APIs | Status feeds, live updates, event streams |
| Authentication        | Local OS or shell permissions               | OAuth or API keys                                   | OAuth or API keys                         |
| Deployment            | Launched in the sandbox                     | User-managed server URL                             | User-managed server URL                   |

## Add a personal MCP server

Personal MCP servers are defined in your Poolside settings file. Add them by editing `settings.yaml` directly or by using `pool mcp add`.

**Prerequisites**

* You have the server details:
  * For a **Stdio (Local Process)** server, the command that starts the server.
  * For a **Streamable HTTP** or **Server-Sent Events (SSE)** server, the server URL and any required credentials.
* The `pool` command is installed, if you plan to use `pool mcp add`. See [Install Poolside Agent CLI](/cli/install).

**Steps**

1. Add the server definition.

   <Tabs>
     <Tab title="Edit the settings file">
       Add an `mcp_servers` block to `~/.config/poolside/settings.yaml`. This file stores personal MCP servers available across all your projects.

       <Tip>
         To scope a server to the current project only, add it to `.poolside/settings.local.yaml` instead.
       </Tip>

       <Tip>
         If the file does not exist, create it first:

         ```bash theme={null}
         mkdir -p ~/.config/poolside
         touch ~/.config/poolside/settings.yaml
         ```
       </Tip>

       For a **Stdio (Local Process)** server, specify the command that starts the server:

       ```yaml theme={null}
       mcp_servers:
         <server-name>:
           command: <command>
           args:
             - <arg-1>
       ```

       For example:

       ```yaml theme={null}
       mcp_servers:
         filesystem:
           command: node
           args:
             - /path/to/filesystem-server.js
       ```

       For a **Streamable HTTP** or **Server-Sent Events (SSE)** server, specify the server URL:

       ```yaml theme={null}
       mcp_servers:
         <server-name>:
           transport:
             type: http
             url: https://<server-url>
             headers:
               - "Authorization: Bearer <api-token>"
       ```

       For example:

       ```yaml theme={null}
       mcp_servers:
         notion:
           transport:
             type: http
             url: https://mcp.notion.com/mcp
             headers:
               - "Authorization: Bearer <api-token>"
       ```

       For all available options, see [MCP server configuration options](#mcp-server-configuration-options).
     </Tab>

     <Tab title="Use the CLI">
       Use `pool mcp add` to add a server to `~/.config/poolside/settings.yaml`.

       For a **Stdio (Local Process)** server:

       ```bash theme={null}
       pool mcp add filesystem -- node /path/to/filesystem-server.js
       ```

       For a **Streamable HTTP** server:

       ```bash theme={null}
       pool mcp add --transport http notion https://mcp.notion.com/mcp
       ```

       `pool mcp add` also supports `--transport sse`, `--env`, and `--header`. For all available options in the settings file, see [MCP server configuration options](#mcp-server-configuration-options).
     </Tab>
   </Tabs>

2. Use the server from `pool` or `pool exec`.

   Personal MCP servers from your settings file are available to `pool` and `pool exec`.

   Example interactive session:

   ```bash theme={null}
   pool --directory /path/to/project
   ```

   Example one-shot prompt:

   ```bash theme={null}
   pool exec --prompt "Use the filesystem server to list files in this repository"
   ```

   For available `pool mcp` commands, see [CLI reference](/cli/cli-reference#pool-mcp-add).

## MCP server configuration options

You can use the following configuration options in the settings file. Some options apply only to **Stdio (Local Process)** servers or only to **Streamable HTTP** or **Server-Sent Events (SSE)** servers.

| Option          | Connection type        | Description                                                                                                                                                   |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `command`       | Stdio (Local Process)  | The executable to run. For example, `node`, `python`, or `npx`.                                                                                               |
| `args`          | Stdio (Local Process)  | Arguments passed to the command as a YAML list.                                                                                                               |
| `cwd`           | Stdio (Local Process)  | Working directory for the server process. Defaults to the project directory.                                                                                  |
| `transport`     | Streamable HTTP or SSE | Connection details, including `type`, `url`, and optional `headers`.                                                                                          |
| `env`           | All                    | Environment variables available to the server process as `KEY: value` pairs.                                                                                  |
| `enabled_tools` | All                    | Tool names to enable as a list. If omitted, all tools are enabled.                                                                                            |
| `allow`         | All                    | Glob patterns for tools agents can use. For example, `"read-*"` allows tools that start with `read-`.                                                         |
| `deny`          | All                    | Glob patterns for tools agents cannot use. For example, `"write-*"` blocks tools that start with `write-`. Deny patterns take precedence over allow patterns. |
| `disabled`      | All                    | If set to `true`, the server is disabled and agents cannot use it.                                                                                            |

## Authentication

Some MCP servers require authentication in addition to the connection settings above. Depending on the server, authentication might involve API keys, tokens, environment variables, or OAuth-based sign-in.

For HTTP and SSE servers, configure authentication values in the server definition, such as with `headers` or `env`. For local stdio servers, the server process runs with the permissions and environment available to the local agent host or sandbox.

## Access and security

MCP servers run with the permissions of their execution environment, so only connect servers that you trust. Permissions and approvals limit what agents can use, but they do not isolate or sandbox MCP server execution by themselves.

Approval behavior depends on the MCP server connection type and on whether the agent runs in a sandbox:

* **Stdio MCP servers** run inside the sandbox when the agent runs in a sandbox. In interactive `pool` and ACP sessions, stdio MCP tool calls are auto-approved when the session uses a sandbox.
* **HTTP and SSE servers** run outside the sandbox and require explicit approval even when the agent runs in a sandbox.

<Note>
  With [unsafe auto-allow mode](/permissions#command-line-approvals) on, approvals for HTTP and SSE MCP servers may be granted automatically.
</Note>

## Related resources

* [Settings file reference](/settings-file-reference)
* [Permissions](/permissions)
* [Poolside Agent CLI](/cli/pool)

# Use other agent servers

> Use `pool` as an Agent Client Protocol (ACP) client for another compatible agent server.

Unless you configure a different default, `pool` connects to the Poolside agent server. You can also use `pool` as an Agent Client Protocol (ACP) client for another compatible agent server, such as Claude Agent, Codex, or Gemini.

## Prerequisites

* You have another ACP-compatible agent server installed and runnable on your machine, or the URL of a remote ACP server.
* You know the command or URL that starts that agent server.

## Steps

1. Start `pool` with `--agent-server` and the command or URL for the agent you want to use:

   ```bash theme={null}
   # Claude Agent
   pool --agent-server claude-agent-acp

   # Codex
   pool --agent-server codex-acp

   # Gemini
   pool --agent-server "gemini --acp"

   # Remote ACP server
   pool --agent-server http://localhost:3284/acp
   ```

2. To choose from configured agent servers interactively instead of passing a command each time, run:

   ```bash theme={null}
   pool -s
   ```

3. To reuse a server without retyping its command or URL, add an `agent_servers` entry to `~/.config/poolside/settings.yaml`. Set `pool.default_agent_server` to use it automatically, or select it later with `pool -s`.

   ```yaml title="Agent server example for ~/.config/poolside/settings.yaml" theme={null}
   pool:
     default_agent_server: claude
   agent_servers:
     claude:
       command: claude-agent-acp
     remote:
       url: http://localhost:3284/acp
   ```

   For remote ACP servers, you can also configure `headers` on the `agent_servers` entry. For full configuration details, see [Agent servers](/settings-file-reference#agent-servers).

## Related resources

* [Poolside Agent CLI](/cli/pool)
* [Work from the terminal](/cli/interactive-mode)
* [Settings file reference](/settings-file-reference)

# Use Poolside in another ACP-compatible editor

> Configure any ACP-compatible editor to use Poolside through Agent Client Protocol.

## Prerequisites

* You have Poolside Agent CLI installed and authenticated. See [Install Poolside Agent CLI](/cli/install).

## Steps

For editors without automated configuration, point the editor's ACP configuration at `pool acp`:

```json theme={null}
{
  "command": "pool",
  "args": ["acp"]
}
```

To require a configured sandbox for the ACP server, pass `--sandbox required`:

```json theme={null}
{
  "command": "pool",
  "args": ["acp", "--sandbox", "required"]
}
```

Use `--sandbox disabled` only when you want the ACP server to run without a configured sandbox.

To apply extra settings for an ACP server process, pass `--settings` with a path to a YAML settings file or inline YAML content:

```json theme={null}
{
  "command": "pool",
  "args": ["acp", "--settings", "~/.config/poolside/acp-settings.yaml"]
}
```

Thought level is an ACP session config option, not a `pool acp` command-line flag. When your editor exposes ACP session config options, configure thought level from the editor's agent or session settings.

<Note>
  Available thought levels depend on your provider, agent server, and model.

  * Your ACP client might display generic effort values: `default`, `max`, `xhigh` (**Extra high**), `high`, `medium`, `low`, `minimal`, and `none`.
  * `default` clears your override and lets the backend choose an effort level.
  * When you configure thought level through an ACP client connected to Poolside Platform or an enterprise deployment with `pool login`, the backend determines how to apply the requested effort.
  * In those ACP sessions, use `max` to request thinking on and `none` to request thinking off. Other generic values do not select distinct reasoning levels.
  * With OpenRouter, available choices can come from provider model metadata.
</Note>

If an MCP server expects environment variables, make sure your editor starts `pool acp` with those variables set.

## Related resources

* [Editors](/tools#editors)
* [Poolside Agent CLI](/cli/pool)
* [Agent Client Protocol documentation](https://agentclientprotocol.com/)

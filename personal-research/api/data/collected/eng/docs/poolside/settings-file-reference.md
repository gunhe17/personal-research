# Settings file reference

> Reference for settings you can define in Poolside `settings.yaml` files.

Use `settings.yaml` to configure how Poolside behaves in the `pool` CLI.

This page is a reference for the top-level settings you can define in Poolside settings files. For task-based guidance, see the related feature pages linked from each section.

## File locations and precedence

Poolside reads `settings.yaml` from three locations.

| File location                      | Use this for                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `.poolside/settings.local.yaml`    | Personal, project-specific. <br />Do not commit. Takes precedence over all other files.     |
| `.poolside/settings.yaml`          | Shared, project-specific. <br />Commit and share with your team.                            |
| `~/.config/poolside/settings.yaml` | Personal defaults (all projects). <br />Applies when no project-level settings override it. |

When the same setting appears in multiple files, the most specific file takes precedence:

1. `.poolside/settings.local.yaml`
2. `.poolside/settings.yaml`
3. `~/.config/poolside/settings.yaml`

## Top-level settings

Poolside settings files support the following top-level keys.

| Key             | Purpose                                                                                      | See also                        |
| --------------- | -------------------------------------------------------------------------------------------- | ------------------------------- |
| `pool`          | Configure Poolside API connection and CLI launch settings                                    | [pool settings](#pool-settings) |
| `tools`         | Configure tool rules and approval behavior                                                   | [Tools](#tools)                 |
| `paths`         | Configure file access rules for explicit file tools                                          | [Paths](#paths)                 |
| `secrets`       | Configure secret approvals, fallback default redaction patterns, and user redaction patterns | [Secrets](#secrets)             |
| `mcp_servers`   | Configure personal MCP servers                                                               | [MCP servers](#mcp-servers)     |
| `sandbox`       | Configure local sandbox behavior                                                             | [Sandbox](#sandbox)             |
| `web_search`    | Configure a search provider for the `web_search` and `web_fetch` tools                       | [Web search](#web-search)       |
| `agent_servers` | Configure user-level ACP-compatible agent servers that `pool` can launch or connect to       | [Agent servers](#agent-servers) |

## `pool` settings

Use `pool` to configure Poolside API connection settings and CLI launch settings.

| Key                         | Type   | Description                                                                                                                                                   |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pool.api_url`              | string | Set the Poolside API URL.                                                                                                                                     |
| `pool.default_agent_server` | string | Set the `agent_servers` entry to use when `--agent-server` is not provided. The CLI reads this setting from `~/.config/poolside/settings.yaml`.               |
| `pool.worktree_prefix`      | string | Prefix generated Git worktree names when you use `pool --worktree` without a branch name. The CLI reads this setting from `~/.config/poolside/settings.yaml`. |

<Note>
  Poolside still accepts a top-level `api_url` key for compatibility, but use `pool.api_url` in new settings files.
</Note>

## Tools

Use `tools` to turn tools off or configure approval rules.

Each tool key can include:

| Key        | Type    | Description                          |
| ---------- | ------- | ------------------------------------ |
| `allow`    | list    | Auto-approve patterns for that tool  |
| `deny`     | list    | Deny patterns for that tool          |
| `disabled` | boolean | Turn the tool off when set to `true` |

```yaml title="Tools example for .poolside/settings.yaml" theme={null}
tools:
  shell:
    allow:
      - "git log *"
      - "rg *"
    deny:
      - "rm *"
    disabled: false
```

### Tool rule syntax

* Tool rules support `*` wildcards. `**` is not supported.
* The rule string must match the tool call shown in the approval prompt.
* Subshells and composite shell commands always require manual approval.
* Shell commands that use control operators such as `|` are not supported by auto-approval.

For more information, see [Tool rules](/permissions#tool-rules).

## Paths

Use `paths` to control which files agents can access through explicit file tools.

`paths` supports:

| Key     | Type | Description                                                  |
| ------- | ---- | ------------------------------------------------------------ |
| `allow` | list | Paths the agent can read, with optional `write: true` access |
| `deny`  | list | Paths the agent cannot access                                |

Each path entry supports:

| Key     | Type    | Description                    |
| ------- | ------- | ------------------------------ |
| `path`  | string  | File or directory pattern      |
| `write` | boolean | Allow edits when set to `true` |

```yaml title="Paths example for .poolside/settings.yaml" theme={null}
paths:
  allow:
    - path: src/**
      write: true
    - path: docs/**
  deny:
    - path: .env
    - path: secrets/**
```

### Path rule behavior

* Poolside treats paths as read-only by default.
* `write: true` allows edits, deletes, moves, and renames.
* `deny` overrides `allow`.
* Path patterns support `*` and `**`.
* Use forward slashes for all paths, including Windows paths.
* Windows-volume paths do not match on Linux, and Linux paths do not match on Windows.
* `*:/Program Files/**` matches any Windows volume.
* In `.poolside/settings.local.yaml` and `~/.config/poolside/settings.yaml`, paths must be absolute or start with `~`.
* In `.poolside/settings.yaml`, paths must be relative to the project.

## Secrets

Use `secrets` to configure secret approvals, fallback default redaction patterns, and user redaction patterns.

| Key                           | Type    | Description                                                                                                                                                                                                       |
| ----------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allow`                       | list    | Secret names that Poolside can use without prompting again                                                                                                                                                        |
| `fallback_redaction_patterns` | boolean | Use fallback default redaction patterns when an agent run cannot load organization patterns from the API, such as when using Poolside Platform, OpenRouter, or an OpenAI-compatible provider. Defaults to `true`. |
| `redact_patterns`             | list    | User redaction patterns for sensitive values                                                                                                                                                                      |

Each `redact_patterns` entry supports:

| Key       | Type   | Description                               |
| --------- | ------ | ----------------------------------------- |
| `name`    | string | Name of the pattern                       |
| `pattern` | string | RE2 regular expression used for redaction |

```yaml title="Secrets example" theme={null}
secrets:
  allow:
    - GITHUB_TOKEN
  fallback_redaction_patterns: true
  redact_patterns:
    - name: internal-api-key
      pattern: sk_internal_[A-Za-z0-9]+
```

For more information, see [Secrets](/secrets).

## MCP servers

Use `mcp_servers` to configure personal MCP servers in your settings file.

Each server entry can include:

| Key             | Type    | Description                              |
| --------------- | ------- | ---------------------------------------- |
| `command`       | string  | Executable to run for a `stdio` server   |
| `args`          | list    | Arguments passed to the command          |
| `cwd`           | string  | Working directory for the server process |
| `transport`     | object  | Remote connection details                |
| `env`           | map     | Environment variables for the server     |
| `enabled_tools` | list    | Tool names to enable                     |
| `allow`         | list    | Tool approval patterns to allow          |
| `deny`          | list    | Tool approval patterns to deny           |
| `disabled`      | boolean | Turn the server off when set to `true`   |

`transport` supports:

| Key       | Type   | Description                                             |
| --------- | ------ | ------------------------------------------------------- |
| `type`    | string | Connection type. Supported values are `http` and `sse`. |
| `url`     | string | MCP server URL                                          |
| `headers` | list   | HTTP headers to send with requests                      |

```yaml title="MCP servers example for .poolside/settings.yaml" theme={null}
mcp_servers:
  filesystem:
    command: node
    args:
      - /path/to/filesystem-server.js
    env:
      NODE_ENV: production
  notion:
    transport:
      type: http
      url: https://mcp.notion.com/mcp
      headers:
        - "Authorization: Bearer <api-token>"
```

For more information, see [MCP servers](/mcp-servers).

## Sandbox

Use `sandbox` to configure local sandbox behavior for user-managed runs.

Sandbox settings include:

| Key                 | Type   | Description                                 |
| ------------------- | ------ | ------------------------------------------- |
| `image`             | string | Container image to use                      |
| `env_vars`          | map    | Environment variables to set in the sandbox |
| `secrets`           | list   | Secret names the sandbox can request        |
| `filesystem`        | object | Workspace access configuration              |
| `filesystem.mounts` | list   | Extra host paths to mount into the sandbox  |
| `network`           | object | Network policy and allowed destinations     |

```yaml title="Sandbox example for ~/.config/poolside/settings.yaml" theme={null}
sandbox:
  image: poolsideengineering/ubuntu-with-tools
  env_vars:
    NODE_ENV: development
  secrets:
    - GITHUB_TOKEN
  filesystem:
    workspaces:
      access: read-only
    mounts:
      - host: <absolute-host-path>
        sandbox: <absolute-sandbox-path>
        access: read-only
  network:
    policy: allow-list
    egress:
      allowed_domains:
        - poolside.ai
      allowed_cidrs:
        - 10.0.0.0/8
```

Supported values:

| Key                            | Supported values                        |
| ------------------------------ | --------------------------------------- |
| `filesystem.workspaces.access` | `read-only`, `read-write`               |
| `filesystem.mounts[].access`   | `read-only`, `read-write`               |
| `network.policy`               | `off`, `allow-list`, `unsafe-allow-all` |

Use `allowed_domains`, `allowed_cidrs`, or both under `network.egress`.

Use `env_vars` to pass string environment variables into the sandbox container.

Use `secrets` to list the names of secrets that the sandbox can request. For more information, see [Secrets](/secrets).

For `filesystem.mounts`:

* `host` must be an absolute path on the host
* `sandbox` must be an absolute path inside the container
* Mount targets must be unique
* Host mount paths cannot overlap with workspace directories already mounted by Poolside

For more information, see [Local sandbox](/permissions#local-sandbox) and [Sandboxes](/sandboxes).

## Web search

Use `web_search` to configure the search provider for `web_search` and enhanced `web_fetch` content extraction. The `web_fetch` tool works by default with no configuration. The `web_search` tool activates after you set a provider and an API key.

| Key                 | Type    | Description                                                         |
| ------------------- | ------- | ------------------------------------------------------------------- |
| `provider`          | string  | Search provider. Supported values are `parallel` and `exa`.         |
| `api_key`           | string  | Provider API key. Without it, the `web_search` tool stays off.      |
| `base_url`          | string  | Optional override for the provider API endpoint.                    |
| `summarize_results` | boolean | Summarize tool results with the session model. Defaults to `false`. |

```yaml title="Web search example for ~/.config/poolside/settings.yaml" theme={null}
web_search:
  provider: parallel
  api_key: <api-key>
  summarize_results: true
```

Keep `api_key` in a personal settings file, not in shared project settings. For more information, see [Web search and fetch](/web-search-and-fetch).

## Agent servers

Use `agent_servers` in `~/.config/poolside/settings.yaml` to configure ACP-compatible agent servers that `pool` can launch or connect to with `--agent-server` or `-s`. Agent server configuration is user-level configuration. `pool` does not read `agent_servers` from project settings files.

When `pool` starts, it migrates legacy `~/.config/poolside/pool.json` agent server configuration into `settings.yaml` and removes `pool.json`.

Each `agent_servers` entry must set either `command` for a local stdio server or `url` for a remote network server. Do not set both. Use `args` and `env` with `command`; use `headers` with `url`.

| Key                      | Type   | Description                                                                                                              |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| `type`                   | string | Agent server type. Defaults to `custom`. The `registry` and `remote` values are reserved for future use.                 |
| `command`                | string | Executable to run for the agent server                                                                                   |
| `url`                    | string | Remote ACP server URL for the Streamable HTTP transport                                                                  |
| `headers`                | map    | HTTP headers to send when connecting to `url`                                                                            |
| `args`                   | list   | Arguments passed to `command`                                                                                            |
| `env`                    | map    | Environment variables for the `command` process                                                                          |
| `default_config_options` | map    | Saved ACP session configuration defaults for the server. Valid keys depend on the agent server's ACP session config IDs. |

Set `pool.default_agent_server` to the `agent_servers` key that `pool` should use when you do not pass `--agent-server`.

```yaml title="Agent server example for ~/.config/poolside/settings.yaml" theme={null}
pool:
  default_agent_server: claude
agent_servers:
  claude:
    command: claude-agent-acp
  gemini:
    command: gemini
    args:
      - --acp
  remote:
    url: http://localhost:3284/acp
    headers:
      Authorization: Bearer <token>
```

For more information, see [Use other agent servers](/cli/other-agent-servers).

## Example settings files

Personal defaults (all projects):

```yaml title="Personal defaults example ~/.config/poolside/settings.yaml" theme={null}
pool:
  worktree_prefix: feat-
tools:
  shell:
    allow:
      - "git log *"
paths:
  deny:
    - path: ~/.ssh/**
mcp_servers:
  filesystem:
    command: node
    args:
      - /path/to/filesystem-server.js
```

Personal, project-specific:

```yaml title="Personal project-specific example .poolside/settings.local.yaml" theme={null}
tools:
  shell:
    allow:
      - "npm run *"
      - "go test *"
    deny:
      - "git push *"
paths:
  allow:
    - path: ~/workspace/<project-name>/notes/**
      write: true
  deny:
    - path: ~/workspace/<project-name>/.env
mcp_servers:
  local-dev:
    command: node
    args:
      - ~/scripts/dev-tools.js
```

Shared, project-specific:

```yaml title="Shared project-specific example .poolside/settings.yaml" theme={null}
tools:
  shell:
    allow:
      - "npm run lint"
      - "npm run test *"
    deny:
      - "rm -rf *"
      - "git push --force *"
paths:
  allow:
    - path: src/**
      write: true
    - path: docs/**
      write: true
  deny:
    - path: .env
    - path: secrets/**
```

## Related resources

* [Permissions](/permissions)
* [MCP servers](/mcp-servers)
* [Secrets](/secrets)
* [Sandboxes](/sandboxes)
* [Web search and fetch](/web-search-and-fetch)
* [Use other agent servers](/cli/other-agent-servers)

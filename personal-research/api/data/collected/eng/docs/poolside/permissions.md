# Permissions

> Control what Poolside agents can read, write, and run by using settings.yaml.

Use `settings.yaml` to control what Poolside agents can do when you run `pool` or `pool exec`.

For a complete reference of supported settings keys, see [Settings file reference](/settings-file-reference).

You can use `settings.yaml` to:

* Allow or block specific tools
* Automatically approve or deny certain tool calls
* Limit which files agents can read or modify
* Run agents inside a local sandbox with stronger runtime boundaries

These controls help you balance productivity with safety when running agents in your development environment.

## Main controls in settings.yaml

Most users interact with three configuration areas.

Other supported settings include personal MCP server configuration, secret rules, prompt defaults, and API connection settings. For the full schema, see [Settings file reference](/settings-file-reference).

| Setting   | Purpose                                           |
| --------- | ------------------------------------------------- |
| `tools`   | Turn tools off or define auto-approval rules      |
| `paths`   | Restrict which files the agent can read or modify |
| `sandbox` | Run agents inside an isolated runtime environment |

These settings serve different purposes:

* **Tools** decide what actions the agent can attempt.
* **Paths** decide which files the agent can access through file tools.
* **Sandbox** defines where the agent runs.

<Note>
  `tools` and `paths` mainly control approvals and explicit file operations. They do not fully sandbox the agent. If you need an enforced runtime boundary, use a sandbox.
</Note>

## The shell tool

Treat the `shell` tool as high risk. Shell commands can:

* Install software
* Modify files
* Run scripts

Programs started through `shell` may read or modify files outside the restrictions defined in `paths`.

If you need strict file access controls, turn off `shell` or run agents inside a sandbox.

## File locations

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

Use `~/.config/poolside/settings.yaml` for personal defaults across all projects. Use `.poolside/settings.local.yaml` for personal, project-specific restrictions. Use `.poolside/settings.yaml` for shared project defaults.

For example settings files for each location, see [Settings file reference](/settings-file-reference#example-settings-files).

## Approvals

Approvals let you automatically allow or deny specific tool calls, which reduces repeated confirmation prompts when you trust certain operations.

Rules:

* If a tool call does not match an `allow` rule, Poolside asks for approval.
* `deny` rules always override `allow`.

Approvals are a convenience feature, not a security boundary. Use a sandbox for stronger isolation.

### Modes

In an interactive `pool` session, modes give you a quick way to adjust approval behavior without editing `settings.yaml`:

| Mode                                        | ID             | What it does                                                                    |
| ------------------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| Always ask                                  | `default`      | Prompts for approval on first use of each tool type                             |
| Accept edits                                | `accept-edits` | Auto-approves workspace file reads and writes, then prompts for everything else |
| Allow all                                   | `always-allow` | Approves tool actions automatically                                             |
| [Plan](/cli/interactive-mode#use-plan-mode) | `plan`         | Plans changes without modifying your codebase                                   |

Press `Shift+Tab` to cycle through modes, or use `/mode` to open the mode selector. `deny` rules in `settings.yaml` still apply regardless of mode.

### Command-line approvals

In `pool`, tool calls require approval unless a matching `allow` rule exists in `settings.yaml`.

To run `pool exec` without approval prompts, use `--unsafe-auto-allow`:

```bash theme={null}
pool exec -p "Review this repository" --unsafe-auto-allow
```

When `--unsafe-auto-allow` is set:

* Tool calls run without prompts.
* Deny rules still apply.

On a Poolside deployment, this flag requires the `Auto Approve Commands` permission. Standalone connections do not perform this permission check.

<Warning>
  Use `--unsafe-auto-allow` only in trusted sandboxed environments.
</Warning>

## Tool rules

Use `tools` to turn tools off or configure approval rules. File access tools such as `read` and `edit` are controlled by `paths`, not `tools`.

<Tip>
  Add tool rules to `.poolside/settings.local.yaml` for personal, project-specific settings, to `.poolside/settings.yaml` for shared, project-specific settings, or to `~/.config/poolside/settings.yaml` for personal defaults across projects.
</Tip>

```yaml title="Tools example" theme={null}
tools:
  shell:
    disabled: false
    allow:
      - "git log *"
      - "rg *"
    deny:
      - "rm *"
      - "git push *"
```

How tool rules work:

* Tool rules support only `*` wildcards. `**` is not supported.
* The rule string must match the tool call shown in the approval prompt.
* Subshells and composite shell commands always require manual approval.
* Shell commands that use control operators such as `|` are not supported by auto-approval.

## Path rules

Use `paths` to control which files agents can access through explicit file tools.

<Tip>
  Add path rules to `.poolside/settings.local.yaml` for personal, project-specific settings, to `.poolside/settings.yaml` for shared, project-specific settings, or to `~/.config/poolside/settings.yaml` for personal defaults across projects.
</Tip>

```yaml title="Paths example for .poolside/settings.local.yaml or ~/.config/poolside/settings.yaml" theme={null}
paths:
  allow:
    - path: ~/Documents/**
    - path: ~/workspace/docs/**
      write: true
  deny:
    - path: ~/.ssh/**
    - path: ~/.env
```

How path rules work:

* Poolside treats paths as read-only by default.
* `write: true` allows edits, deletes, moves, and renames.
* `deny` overrides `allow`.
* Path patterns support `*` and `**`.
* Use forward slashes for all paths, including Windows paths.
* Windows-volume paths do not match on Linux, and Linux paths do not match on Windows.
* `*:/Program Files/**` matches any Windows volume.
* In `.poolside/settings.local.yaml` and `~/.config/poolside/settings.yaml`, paths must be absolute or start with `~`.
* In `.poolside/settings.yaml`, paths must be relative to the project.

### Read-only configuration

```yaml title="Read-only paths example for .poolside/settings.yaml" theme={null}
tools:
  shell:
    disabled: true

paths:
  allow:
    - path: src/**
    - path: docs/**
  deny:
    - path: .env
    - path: secrets/**
```

### Read-write configuration

```yaml title="Read-write paths example for .poolside/settings.yaml" theme={null}
tools:
  shell:
    disabled: true

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

<Warning>
  `paths` rules apply only to explicit file tools. Programs started through `shell` may still modify files outside these rules.
</Warning>

### Protect sensitive files across projects

To block access to sensitive files in every project, add deny rules to your personal defaults file, `~/.config/poolside/settings.yaml`:

```yaml title="Protect sensitive files example for ~/.config/poolside/settings.yaml" theme={null}
paths:
  deny:
    - path: ~/.ssh/**
    - path: ~/.aws/**
    - path: /**/.env
```

`deny` rules always override `allow`.

## Local sandbox

A sandbox creates a stronger runtime boundary.

Sandbox workspace access supports two modes:

* `read-only`: Tools can read files, and you review changes before Poolside applies them.
* `read-write`: Tools can modify workspace files directly.

For user-managed local runs, define sandbox settings in your personal default `~/.config/poolside/settings.yaml` file.

```yaml title="Sandbox example for ~/.config/poolside/settings.yaml" theme={null}
sandbox:
  image: poolsideengineering/ubuntu-with-tools
  filesystem:
    workspaces:
      access: read-only
  network:
    policy: allow-list
    egress:
      allowed_domains:
        - poolside.ai
```

Sandbox configuration controls:

* Container runtime image
* Workspace file access
* Extra host mounts
* Network destinations

### Use volume mounts in local sandboxes

Use volume mounts to mount extra host paths into the sandbox.

If your development workflow depends on host resources outside the workspace, add extra mounts under `sandbox.filesystem.mounts`.

For example, you can mount a persistent host cache directory, the local Docker socket, and a Docker config directory into the sandbox:

```yaml title="Volume mounts example for ~/.config/poolside/settings.yaml" theme={null}
sandbox:
  image: <image-with-docker-cli>
  filesystem:
    workspaces:
      access: read-write
    mounts:
      - host: <absolute-host-path-to-build-cache>
        sandbox: /cache
        access: read-write
      - host: /var/run/docker.sock
        sandbox: /var/run/docker.sock
        access: read-write
      - host: <absolute-host-path-to-docker-config-dir>
        sandbox: /docker-config
        access: read-only
```

Use this pattern when you want to reuse build artifacts and config files across sandbox recreation, talk to your local Docker daemon, or read registry credentials from a mounted config directory.

Mounting `/var/run/docker.sock` gives processes inside the sandbox access to your host Docker daemon. Use that mount only when your workflow requires it.

Best practices:

* Use absolute host paths.
* Put reusable build caches outside the workspace, then mount them into the sandbox.
* Mount config directories as `read-only` unless the tool must write to them.
* Do not mount a workspace directory again through `mounts`.
* Choose a container image that already includes the tools your workflow needs.

Poolside already mounts workspace directories for the sandbox and rejects extra mounts that overlap with those workspace paths.

### Use private or local images

For local sandboxes, Poolside uses your local Docker engine to resolve the sandbox image.

```yaml title="Private image example for ~/.config/poolside/settings.yaml" theme={null}
sandbox:
  image: ghcr.io/<org>/<image>:<tag>
```

Before you use a private image, authenticate Docker on your host for that registry. For example:

```bash theme={null}
docker login ghcr.io
```

* Use a private image only after Docker on your machine is already authenticated to that registry.
* You can also use an image that you built or pulled locally.

## Glob reference

### Tool rule syntax

| Pattern       | Matches                            | Does not match |
| ------------- | ---------------------------------- | -------------- |
| `go vet *`    | `go vet`, `go vet -vettool shadow` | `go run`       |
| `gh * list *` | `gh pr list`, `gh gist list`       | `gh list`      |

Rules:

* `*` matches zero or more characters including `/`.
* `**` is not supported.

### Path rule syntax

| Pattern        | Matches                           | Does not match         |
| -------------- | --------------------------------- | ---------------------- |
| `/src/**/*.go` | `/src/main.go`, `/src/pkg/run.go` | `/other/src/main.go`   |
| `C:/**/bin/*`  | `C:/Tools/bin/app.exe`            | `D:/Tools/bin/app.exe` |

Rules:

* `*` matches characters except `/`.
* `**` matches across directories.
* `*:/Program Files/**` matches any Windows volume.

## Related resources

* [Poolside Agent CLI](/cli/pool)
* [Settings file reference](/settings-file-reference)
* [Sandboxes](/sandboxes)

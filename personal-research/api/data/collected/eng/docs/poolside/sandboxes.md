# Sandboxes

> Run Poolside agents in local sandbox environments with file system and network controls.

Use a local sandbox to control where and how agents run tools, including file system access, network access, and the runtime environment. A sandbox isolates tool execution from resources outside its allowed scope.

For task-based configuration guidance, see [Local sandbox](/permissions#local-sandbox). For a complete reference of supported `settings.yaml` keys, see [Settings file reference](/settings-file-reference#sandbox).

## When to use a sandbox

Use a sandbox when you want to:

* Run agent tools in an isolated environment
* Control network access for tool execution
* Restrict how agents interact with project files
* Use custom runtime environments or container images
* Allow agents to run approved tools with stronger runtime boundaries

Do not use a sandbox when:

* Tool execution does not require isolation
* Network or file system restrictions are unnecessary
* Agents are not running tools that execute code or external commands

## How agents use local sandboxes

When an agent runs in a local sandbox:

* Tool commands run inside a container on your machine.
* Workspace access settings limit file system access.
* The egress allowlist restricts network access.
* Local stdio MCP servers are subject to network restrictions.
* Remote MCP servers that use HTTP or server-sent events are not subject to sandbox network restrictions.

The container uses the configured image and receives workspace mounts according to the sandbox's workspace access setting. The container persists for the sandbox session, and each tool command runs inside that constrained environment.

When workspace access is `read-write`, your workspace is mounted directly into the container so file changes appear on the host. When workspace access is `read-only`, your workspace is mounted read-only and agent changes are staged in writable scratch space.

If you configure `allow-list` network policy, the sandbox runs on an isolated Docker network. HTTP and HTTPS traffic routes through a proxy container that enforces the configured domains.

## Use sandboxes for local development

For local development, treat the sandbox as an isolated runtime for the agent, not as a full development container that replaces your host environment.

For local development:

* Your project files stay on your host, even when the agent runs in a sandbox.
* Depending on workspace access, the agent's file changes appear on your host immediately or after review.
* By default, services running inside the sandbox are not exposed to your host.
* Starting a new session starts a new sandbox session.

To reuse build artifacts and other host-side state across sandbox sessions, use volume mounts with `sandbox.filesystem.mounts` to mount extra host paths into the sandbox. See [Local sandbox](/permissions#local-sandbox).

Recommended development flow:

1. Start the development server on your host machine.
2. Run the agent with sandboxing enabled.
3. Let the agent edit files in the workspace.
4. If workspace access is `read-write`, the changes appear on your host immediately.
5. If workspace access is `read-only`, review and apply the changes back to your host before you test them.

Use this approach when you want the safety and policy controls of sandboxing while still running your app, server, and port-bound processes on the host.

## Configure a local sandbox

Define sandbox settings in your personal default `~/.config/poolside/settings.yaml` file.

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

Supported workspace access values:

* `read-only`: Tools can read files, and you review changes before Poolside applies them.
* `read-write`: Tools can modify workspace files directly.

Supported network policy values:

* `off`: Do not configure a sandbox network policy.
* `allow-list`: Allow only configured egress destinations.
* `unsafe-allow-all`: Allow outbound network access to any destination.

## Use volume mounts

Use volume mounts to mount extra host paths into the sandbox.

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

## Use private or local images

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

## Related resources

* [Permissions](/permissions)
* [Settings file reference](/settings-file-reference)
* [MCP servers](/mcp-servers)

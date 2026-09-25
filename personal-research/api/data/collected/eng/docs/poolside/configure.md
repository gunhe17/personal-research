# Configure Poolside

> Shape agent behavior and control what Poolside agents can access.

These guides configure Poolside's own agent, whether you run it through Poolside Agent CLI, Poolside Assistant, or an ACP-compatible editor. They help you guide the agent, add capabilities, and control access.

If a third-party tool such as Cline, GitHub Copilot, or Kilo Code calls Poolside models directly, or an ACP-compatible editor runs a different agent, use that tool's own setup guide instead. See [Tool integrations](/tools) to choose a guide.

## Guide the agent

<CardGroup cols={2}>
  <Card title="AGENTS.md instructions" icon="file-lines" href="/agent-instructions">
    Give Poolside project and personal instructions to follow.
  </Card>

  <Card title="Skills" icon="brain" href="/skills">
    Add reusable, task-specific instructions and resources.
  </Card>
</CardGroup>

## Add capabilities

<CardGroup cols={2}>
  <Card title="MCP servers" icon="plug" href="/mcp-servers">
    Connect agents to external tools and services.
  </Card>

  <Card title="Web search and fetch" icon="magnifying-glass" href="/web-search-and-fetch">
    Let agents search the web and read pages.
  </Card>

  <Card title="Other agent servers" icon="server" href="/cli/other-agent-servers">
    Configure `pool` to run another ACP-compatible agent.
  </Card>
</CardGroup>

## Control access

<CardGroup cols={2}>
  <Card title="Permissions" icon="shield" href="/permissions">
    Control what agents can read, write, and run.
  </Card>

  <Card title="Sandboxes" icon="cube" href="/sandboxes">
    Run agents in isolated environments with file and network controls.
  </Card>

  <Card title="Secrets" icon="key" href="/secrets">
    Store API keys and tokens without exposing raw values.
  </Card>
</CardGroup>

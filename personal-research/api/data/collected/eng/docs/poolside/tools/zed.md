# Use Poolside in Zed

> Configure Zed to use Poolside through Agent Client Protocol.

Choose one of the following setup methods.

## Install from the ACP Registry (recommended)

1. Open Zed's **Agent Settings**, go to **External Agents**, click **Add Agent**, and choose **Install from Registry**. Find **Poolside** and click **Install**.

2. Start a Poolside thread from the **Agent Panel** or **Threads Sidebar**. If prompted, choose **Log in to Poolside** and complete the login in the terminal that opens. You don't need to install anything separately for this path. Zed installs the Poolside binary for you.

## Configure with Poolside Agent CLI

If you have the Poolside Agent CLI installed, you can configure Zed from the terminal instead. See [Install Poolside Agent CLI](/cli/install).

```bash theme={null}
pool acp setup --editor zed
```

The setup command writes to `~/.config/zed/settings.json`. Use this method only when Zed uses that file as its settings file. On Windows, or if Zed uses a custom config directory, configure manually instead.

You do not need to restart Zed. It detects the settings change automatically. Start a Poolside thread from the **Agent Panel** or **Threads Sidebar**. If prompted, choose **Log in to Poolside** and complete the login in the terminal that opens.

## Configure manually

Before configuring a custom agent, install the [Poolside Agent CLI](/cli/install) and make sure the `pool` command is available on your `PATH`.

Open Zed's **Agent Settings**, go to **External Agents**, click **Add Agent**, and choose **Add Custom Agent**. Zed opens your settings file with an `agent_servers` entry. Add the following configuration:

```json theme={null}
{
  "agent_servers": {
    "Poolside": {
      "command": "pool",
      "args": ["acp"],
      "type": "custom"
    }
  }
}
```

You do not need to restart Zed. It detects the settings change automatically. Start a Poolside thread from the **Agent Panel** or **Threads Sidebar**. If prompted, choose **Log in to Poolside** and complete the login in the terminal that opens.

For more information, see [Zed external agent documentation](https://zed.dev/docs/ai/external-agents#add-more-agents).

## Related resources

* [Editors](/tools#editors)
* [Use Poolside in another ACP-compatible editor](/tools/other-acp)
* [Zed external agent documentation](https://zed.dev/docs/ai/external-agents#add-more-agents)

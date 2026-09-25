# Use Poolside in JetBrains

> Configure JetBrains IDEs to use Poolside through Agent Client Protocol.

## Prerequisites

* You have a JetBrains IDE with ACP support, such as IntelliJ IDEA, PyCharm, or WebStorm.
* You have Poolside Agent CLI installed and authenticated. See [Install Poolside Agent CLI](/cli/install).

## Steps

1. Configure JetBrains.

   ```bash theme={null}
   pool acp setup --editor jetbrains
   ```

   This writes Poolside agent configuration to `~/.jetbrains/acp.json`.

2. Restart your JetBrains IDE.

3. Select **Poolside** from the agent picker.

## Configure JetBrains manually

If you prefer to configure JetBrains manually, add the following configuration to `~/.jetbrains/acp.json`:

```json theme={null}
{
  "agent_servers": {
    "Poolside": {
      "command": "pool",
      "args": ["acp"]
    }
  }
}
```

For more information, see the [JetBrains ACP documentation](https://www.jetbrains.com/help/ai-assistant/acp.html).

## Related resources

* [Editors](/tools#editors)
* [Use Poolside in another ACP-compatible editor](/tools/other-acp)
* [JetBrains ACP documentation](https://www.jetbrains.com/help/ai-assistant/acp.html)

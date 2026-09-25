# Troubleshoot Poolside Agent CLI

> Diagnose common Poolside Agent CLI authentication, configuration, and ACP issues.

Use this page when `pool` starts but a session, prompt, or editor connection fails.

Run shell troubleshooting commands in your terminal, not inside the interactive `pool` prompt or an editor chat panel. Use slash commands such as `/logs` inside an interactive `pool` session. To leave an interactive `pool` session, type `/quit` or press `Ctrl+C` twice.

<Info>
  This documentation describes Poolside Agent CLI v1.0.13. Check your version with `pool --version`. To update, exit any active session and run `pool update` from your terminal. See [Poolside Agent CLI releases on GitHub](https://github.com/poolsideai/pool/releases) for release history.
</Info>

## Check which files Poolside uses

Run:

```bash theme={null}
pool config
```

The output shows the log directory, trajectory directory, config directory, and credentials path that `pool` is using.

By default, Poolside stores configuration files in `~/.config/poolside`. For more information about configuration and credential files, see [Install Poolside Agent CLI](/cli/install#configure-and-inspect-paths).

## Fix API key or token errors

Use this section when you see an error such as:

* `403 Forbidden: please check the api-key you provided`
* `401 Unauthorized`
* `Error during ACP method session/prompt`

These errors usually mean the prompt reached the agent, but the agent or model request could not authenticate.

1. Check whether authentication environment variables are set.

   ```bash theme={null}
   env | grep -E '^POOLSIDE_(API_KEY|API_URL|TOKEN|STANDALONE_BASE_URL|STANDALONE_MODEL)=' | sed 's/=.*/=<set>/'
   ```

   This command shows whether a variable is set without printing the secret value.

2. If you intentionally connect directly to Poolside Platform or another OpenAI-compatible provider, confirm that `pool` is using the base URL, API key, and model you expect. If you used `pool login`, check the saved configuration. If you use environment variables instead, set `POOLSIDE_STANDALONE_BASE_URL` and `POOLSIDE_API_KEY` in the shell that starts `pool`. If your provider does not list models from its API, also set `POOLSIDE_STANDALONE_MODEL`. For setup details, see [Install and authenticate](/cli/install#install-and-authenticate).

3. If any variables do not match your intended connection, test without the environment overrides.

   ```bash theme={null}
   env -u POOLSIDE_API_KEY -u POOLSIDE_API_URL -u POOLSIDE_TOKEN -u POOLSIDE_STANDALONE_BASE_URL -u POOLSIDE_STANDALONE_MODEL pool
   ```

4. Sign in again.

   ```bash theme={null}
   pool logout
   pool login
   ```

5. Choose the sign-in method that matches your setup. For details, see [Install and authenticate](/cli/install#install-and-authenticate).

   If you already know the Poolside deployment URL, you can sign in directly:

   ```bash theme={null}
   pool login --api-url <api-url>
   ```

6. Start a new session and send a short text prompt.

   ```bash theme={null}
   pool
   ```

   If the short prompt works, retry the original workflow. If the short prompt still returns an API key or token error, the saved credentials or selected environment are not valid for the endpoint you are using.

## Fix connection errors in automation

If `pool exec` returns `agent not found` or `user is not authorized to use --unsafe-auto-allow` when you intend to connect directly to Poolside Platform, use the standalone endpoint variable:

```bash theme={null}
POOLSIDE_API_KEY=<api-key> \
  POOLSIDE_STANDALONE_BASE_URL=https://inference.poolside.ai \
  pool exec -p "<prompt>" --unsafe-auto-allow
```

To choose a model instead of using the default, also set `POOLSIDE_STANDALONE_MODEL` to its model ID.

If you intend to use your organization's Poolside deployment, set `POOLSIDE_API_URL` instead. Ask your Poolside administrator to confirm that you can use the requested agent and have the `Auto Approve Commands` permission.

## Check feature behavior and authentication

Some feature tests can reach authentication later during prompt submission. For example, when you paste an image with `Ctrl+V`, the image paste succeeds if the prompt input box shows an image attachment before you submit. If the prompt later returns `403 Forbidden: please check the api-key you provided`, troubleshoot authentication instead of image paste.

## Collect interactive session logs

Use this section when an interactive `pool` session shows an error or asks you to collect logs.

1. In the interactive `pool` prompt, type:

   ```text theme={null}
   /logs
   ```

2. Review the generated `logs.zip` archive before sharing it.

The archive can include session logs, ACP logs, trajectory data, and session metadata. Logs and trajectory data can include prompt and response text from the session.

## Troubleshoot editor ACP connections

If `pool` is running through an Agent Client Protocol (ACP) editor integration, check the ACP logs:

```bash theme={null}
pool acp logs -f
```

For formatted logs, run:

```bash theme={null}
pool acp logs --pretty
```

Common ACP issues:

* **`pool` not found**: Add `pool` to your `PATH`, use the full path to the binary in your editor configuration, or run `pool.exe` on Windows if your shell does not resolve `.exe` commands.
* **Authentication errors with Poolside Platform, OpenRouter, or an OpenAI-compatible provider**: Run `pool login`, choose the matching login option, enter the required credentials, then reconnect.
* **Authentication errors when connected to a Poolside deployment**: Run `pool login --api-url <api-url>`, then reconnect.
* **Missing mode, history, rewind, or slash command support**: ACP capabilities depend on both your editor client and your Poolside account access. The same `pool acp` server can expose a capability that an editor does not show in its UI.

After fixing authentication or configuration, reconnect the editor integration or restart the editor session.

## Related resources

* [Install Poolside Agent CLI](/cli/install)
* [CLI reference](/cli/cli-reference)

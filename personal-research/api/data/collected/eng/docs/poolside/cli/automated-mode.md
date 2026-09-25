# Automate tasks

> Use `pool exec` to run one-shot tasks in scripts, CI, and automated workflows.

Run `pool exec` to send a single prompt and exit when the task is complete. Use this for scripts, CI pipelines, and one-off tasks where you don't need a back-and-forth.

For interactive work, see [Work from the terminal](/cli/interactive-mode) instead.

<Info>
  This documentation describes Poolside Agent CLI v1.0.13. Check your version with `pool --version`. To update, exit any active session and run `pool update` from your terminal. See [Poolside Agent CLI releases on GitHub](https://github.com/poolsideai/pool/releases) for release history.
</Info>

## Basic usage

In a non-interactive environment without credentials saved by `pool login`, choose how you access Poolside and set the variables shown.

<Tabs>
  <Tab title="Poolside Platform">
    ```bash theme={null}
    POOLSIDE_API_KEY=<api-key> \
      POOLSIDE_STANDALONE_BASE_URL=https://inference.poolside.ai \
      pool exec -p "What does this codebase do?"
    ```

    To choose a model instead of using the default, also set `POOLSIDE_STANDALONE_MODEL` to its model ID.
  </Tab>

  <Tab title="Poolside deployment">
    ```bash theme={null}
    POOLSIDE_API_KEY=<api-key> \
      POOLSIDE_API_URL=<api-url> \
      pool exec -p "What does this codebase do?"
    ```

    Use the deployment API URL from your administrator. Do not use the deployment's `/openai/v1` endpoint for `POOLSIDE_API_URL`.
  </Tab>

  <Tab title="OpenAI-compatible provider">
    ```bash theme={null}
    POOLSIDE_API_KEY=<api-key> \
      POOLSIDE_STANDALONE_BASE_URL=<provider-base-url> \
      POOLSIDE_STANDALONE_MODEL=<model-id> \
      pool exec -p "What does this codebase do?"
    ```

    Use your provider's OpenAI-compatible base URL, including any required path such as `/api/v1`.

    This example selects a model explicitly because availability differs by provider. You can omit `POOLSIDE_STANDALONE_MODEL` when the default model is available from your provider.
  </Tab>
</Tabs>

The remaining examples assume that you signed in with `pool login` or set the required environment variables.

Pass a prompt inline:

```bash theme={null}
pool exec -p "What does this codebase do?"
```

Read the prompt from a file:

```bash theme={null}
pool exec -f prompt.txt
```

Pipe the prompt from standard input:

```bash theme={null}
pool exec < prompt.txt
```

Use `-` to read from standard input when combining with other flags:

```bash theme={null}
echo "Summarize this file" | pool exec -p -
```

## Pass MCP server input variables

If an MCP server needs input from environment variables, start `pool exec` with those variables set:

```bash theme={null}
KEY=VALUE pool exec -p "test"
```

## Run in a specific directory

By default, `pool exec` uses your current directory. Use `-d` to point it somewhere else:

```bash theme={null}
pool exec -p "Review this project" -d <project-path>
```

## Continue from a previous run

Resume from the last run:

```bash theme={null}
pool exec --continue -p "Now add tests for what you just wrote"
```

Resume a specific run by ID:

```bash theme={null}
pool exec --continue=<run-id> -p "Now add tests for what you just wrote"
```

To find recent run IDs, use `pool history logs`.

## Output format

By default, `pool exec` prints Markdown. Use `-o json` for newline-delimited JSON:

```bash theme={null}
pool exec -p "List the exported functions in this file" -o json
```

JSON mode prints event-style records. Common types:

* `reasoning`: Raw model reasoning
* `thought`: Agent message text
* `toolCall`: Tool invocations and arguments
* `toolCallResult`: Tool results
* `oauth_url`: Browser authentication required

Use JSON mode when another tool needs to consume the output.

## Run without approval prompts

Use `--unsafe-auto-allow` when you want `pool exec` to run in automated mode without approval prompts:

```bash theme={null}
pool exec -p "Review this repository for security issues" --unsafe-auto-allow
```

Use this only in trusted non-interactive environments. Explicit deny rules still apply.

On a Poolside deployment, `--unsafe-auto-allow` requires the `Auto Approve Commands` permission.

For persistent approval rules, path rules, and `settings.yaml` locations, see [Permissions](/permissions).

## Override sandbox usage

Use `--sandbox required` to require a configured sandbox for the run:

```bash theme={null}
pool exec -p "Review this repository" --sandbox required
```

Use `--sandbox disabled` only when you want to run without a configured sandbox.

## Related resources

* [Work from the terminal](/cli/interactive-mode)
* [CLI reference](/cli/cli-reference)

# Use Poolside with Ollama

> Run Poolside Agent CLI with models served by Ollama.

Use Ollama as a local model runtime for Poolside Agent CLI. Ollama can launch `pool` directly, or you can point `pool` at Ollama's OpenAI-compatible API.

For a guided setup that installs Ollama, pulls an open-weight Poolside model, and starts a local agent session, see [How to run a Poolside model locally](/resources/run-model-locally).

## Prerequisites

* You have [Ollama](https://ollama.com) installed.
* You have Poolside Agent CLI installed. See [Install Poolside Agent CLI](/cli/install).
* You have a model available in Ollama.

## Steps

<Tabs>
  <Tab title="Launch through Ollama">
    1. Open your project directory:

       ```bash theme={null}
       cd <project-path>
       ```

    2. Launch `pool` through Ollama:

       ```bash theme={null}
       ollama launch pool
       ```

       This opens Ollama's model selector.

       To start with a specific model instead:

       ```bash theme={null}
       ollama launch pool --model <model-name>
       ```

       To pass flags to `pool`, add them after `--`:

       ```bash theme={null}
       ollama launch pool -- --help
       ```

    3. Send a prompt. You know the setup works when the agent responds using the model served by Ollama.
  </Tab>

  <Tab title="Connect directly">
    1. Point `pool` at Ollama's local OpenAI-compatible endpoint:

       ```bash theme={null}
       POOLSIDE_STANDALONE_BASE_URL=http://localhost:11434/v1 \
         POOLSIDE_API_KEY=ollama \
         pool --model <model-name>
       ```

       Use any non-empty value for `POOLSIDE_API_KEY` when your local Ollama endpoint does not validate API keys.

    2. Send a prompt. You know the setup works when the agent responds using the model served by Ollama.
  </Tab>
</Tabs>

## Related resources

* [How to run a Poolside model locally](/resources/run-model-locally)
* [Ollama's integration docs for pool](https://docs.ollama.com/integrations/pool)
* [Poolside Agent CLI](/cli/pool)

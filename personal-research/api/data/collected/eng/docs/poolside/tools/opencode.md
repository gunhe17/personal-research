# Use Poolside models in OpenCode

> Configure OpenCode to use Poolside models through Poolside Platform, a Poolside deployment, or OpenRouter.

Poolside provides an OpenAI-compatible Chat API for Poolside models. Thinking is enabled by default.

## Watch the setup video

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/1peTawWzO44" title="OpenCode setup video - embed" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

## Prerequisites

* You have one of the following:
  * A Poolside Platform API key. To create one, go to [platform.poolside.ai](https://platform.poolside.ai/).
  * An API key for your organization's Poolside deployment.
  * An OpenRouter API key with access to Poolside models. To create one, go to [OpenRouter API keys](https://openrouter.ai/keys).

## Steps

<Tabs>
  <Tab title="Poolside Platform">
    1. In Poolside Platform, open **API Keys**.

    2. Click **New key**.

    3. Copy the API key.

    4. In OpenCode, run the `/connect` command.

       ```text theme={null}
       /connect
       ```

    5. Scroll to **Other**.

    6. Enter `poolside` as the provider ID.

       ```text theme={null}
       poolside
       ```

    7. Enter your Poolside Platform API key.

    8. Add an example Poolside provider to your `opencode.json` file.

       The `models` block below is an example. Use a Poolside model available to your API key.

       To find model IDs for your access method, see [List available models](/api/openai-api-examples#list-available-models).

       ```json title="opencode.json" theme={null}
       {
         "$schema": "https://opencode.ai/config.json",
         "provider": {
           "poolside": {
             "npm": "@ai-sdk/openai-compatible",
             "name": "Poolside",
             "options": {
               "baseURL": "https://inference.poolside.ai/v1"
             },
             "models": {
               "<poolside-model-id>": {
                 "name": "Poolside model"
               }
             }
           }
         }
       }
       ```

    9. Run the `/models` command.

       ```text theme={null}
       /models
       ```

    10. Select a Poolside model.

    11. Start a new chat and send a codebase question to confirm OpenCode responds with the selected Poolside model.
  </Tab>

  <Tab title="Poolside deployment">
    <Note>
      If you run Poolside on your own infrastructure, set the base URL to your deployment's OpenAI-compatible endpoint instead. Replace `<api-domain>` with your deployment's host. The path is `/openai/v1`.
    </Note>

    To use OpenCode with your organization's Poolside deployment, configure Poolside as a custom OpenAI-compatible provider and provide your API key through the `POOLSIDE_API_KEY` environment variable.

    ```bash theme={null}
    export POOLSIDE_API_KEY="<api-key>"
    ```

    ```json title="opencode.json" theme={null}
    {
      "$schema": "https://opencode.ai/config.json",
      "provider": {
        "poolside": {
          "npm": "@ai-sdk/openai-compatible",
          "name": "Poolside",
          "env": ["POOLSIDE_API_KEY"],
          "options": {
            "baseURL": "https://poolside.example.com/openai/v1"
          }
        }
      }
    }
    ```

    * `env`: Environment variables OpenCode reads your API key from.
    * `options.baseURL`: Your deployment's OpenAI-compatible endpoint.

    Run the `/models` command, select a Poolside model, then start a new chat and send a codebase question to confirm OpenCode responds with the selected Poolside model.
  </Tab>

  <Tab title="OpenRouter">
    1. In OpenCode, run the `/connect` command.

       ```text theme={null}
       /connect
       ```

    2. Select **OpenRouter**.

    3. Enter your OpenRouter API key. To create one, go to [OpenRouter API keys](https://openrouter.ai/keys).

    4. Select a Poolside model.

       OpenRouter may offer free and paid Poolside models. To see current availability, see [Poolside models on OpenRouter](https://openrouter.ai/poolside).

    5. Start a new chat and send a codebase question to confirm OpenCode responds with the selected Poolside model.
  </Tab>
</Tabs>

## Related resources

* [Coding agents](/tools#coding-agents)
* [Poolside API](/api/overview)
* [Supported models](/get-started/supported-models)
* [OpenRouter API keys](https://openrouter.ai/keys)
* [Poolside models on OpenRouter](https://openrouter.ai/poolside)
* [OpenCode providers](https://opencode.ai/docs/providers/)

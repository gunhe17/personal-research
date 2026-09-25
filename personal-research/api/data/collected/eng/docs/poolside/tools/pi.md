# Use Poolside models in Pi

> Configure Pi to use Poolside models through Poolside Platform, a Poolside deployment, or OpenRouter.

Use the Poolside Platform or Poolside deployment option if you want Pi to call Poolside's inference endpoint directly with your own API key. Use OpenRouter if you already route your models through OpenRouter, or want to compare Poolside models alongside others.

## Watch the setup video

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/vVz4eYQVYZ4" title="Pi setup video - embed" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

## Prerequisites

* You have Pi installed. Run `pi --version` to confirm the installation. For other installation options, including `npm` and Windows, see the [Pi Quickstart](https://pi.dev/docs/latest/quickstart).
* You have one of the following:
  * A Poolside Platform API key. To create one, go to [platform.poolside.ai](https://platform.poolside.ai/).
  * An API key for your organization's Poolside deployment.
  * An OpenRouter API key with access to Poolside models. To create one, go to [OpenRouter API keys](https://openrouter.ai/keys).

## Steps

<Tabs>
  <Tab title="Poolside Platform">
    Pi finds custom providers in `~/.pi/agent/models.json`.

    1. Make your Poolside Platform API key available as an environment variable. Add it to your shell profile.

       ```bash theme={null}
       export POOLSIDE_API_KEY="<api-key>"
       ```

    2. Create or open `~/.pi/agent/models.json` and add Poolside as a provider.

       To find model IDs for your access method, see [List available models](/api/openai-api-examples#list-available-models).

       ```json title="~/.pi/agent/models.json" theme={null}
       {
         "providers": {
           "poolside": {
             "baseUrl": "https://inference.poolside.ai/v1",
             "api": "openai-completions",
             "apiKey": "$POOLSIDE_API_KEY",
             "models": [
               {
                 "id": "<poolside-model-id>",
                 "name": "Poolside model",
                 "reasoning": true,
                 "contextWindow": 256000,
                 "maxTokens": 32768
               }
             ]
           }
         }
       }
       ```

    3. In your terminal, run `pi`.

       ```bash theme={null}
       pi
       ```

    4. Run `/model`.

       ```text theme={null}
       /model
       ```

    5. Select the Poolside model you added.

    6. Send a codebase question to confirm Pi responds with the selected Poolside model.
  </Tab>

  <Tab title="Poolside deployment">
    <Note>
      If you run Poolside on your own infrastructure, set the base URL to your deployment's OpenAI-compatible endpoint instead. Replace `<api-domain>` with your deployment's host. The path is `/openai/v1`.
    </Note>

    Pi finds custom providers in `~/.pi/agent/models.json`.

    1. Make the API key for your Poolside deployment available as an environment variable. Add it to your shell profile.

       ```bash theme={null}
       export POOLSIDE_API_KEY="<api-key>"
       ```

    2. Create or open `~/.pi/agent/models.json` and add Poolside as a provider.

       To find model IDs for your access method, see [List available models](/api/openai-api-examples#list-available-models).

       ```json title="~/.pi/agent/models.json" theme={null}
       {
         "providers": {
           "poolside": {
             "baseUrl": "https://poolside.example.com/openai/v1",
             "api": "openai-completions",
             "apiKey": "$POOLSIDE_API_KEY",
             "models": [
               {
                 "id": "<poolside-model-id>",
                 "name": "Poolside model",
                 "reasoning": true,
                 "contextWindow": 256000,
                 "maxTokens": 32768
               }
             ]
           }
         }
       }
       ```

    3. In your terminal, run `pi`.

       ```bash theme={null}
       pi
       ```

    4. Run `/model`.

       ```text theme={null}
       /model
       ```

    5. Select the Poolside model you added.

    6. Send a codebase question to confirm Pi responds with the selected Poolside model.
  </Tab>

  <Tab title="OpenRouter">
    1. In your terminal, run `pi`.

       ```bash theme={null}
       pi
       ```

    2. Run `/login`.

       ```text theme={null}
       /login
       ```

    3. Select **OpenRouter** and paste your OpenRouter API key.

    4. Run `/model`.

       ```text theme={null}
       /model
       ```

    5. Search for a Poolside model served through OpenRouter.

       OpenRouter may offer free and paid Poolside models. To see current availability, see [Poolside models on OpenRouter](https://openrouter.ai/poolside).

    6. Select the model you want to use.

       Pi ships with a generated model snapshot, so recently released models may not appear in `/model` on older Pi versions. To add a model yourself, see [Custom Models](https://pi.dev/docs/latest/models) in the Pi documentation.

    7. Send a codebase question to confirm Pi responds with the selected Poolside model.
  </Tab>
</Tabs>

## Related resources

* [Coding agents](/tools#coding-agents)
* [Poolside API](/api/overview)
* [Supported models](/get-started/supported-models)
* [OpenRouter API keys](https://openrouter.ai/keys)
* [Poolside models on OpenRouter](https://openrouter.ai/poolside)
* [Pi documentation](https://pi.dev)

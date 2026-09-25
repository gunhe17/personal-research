# Use Poolside models in Goose

> Configure Goose to use Poolside models through Poolside Platform, a Poolside deployment, or OpenRouter.

## Watch the setup video

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/l1DA3c07GTM" title="Goose setup video - embed" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

## Prerequisites

* You have Goose CLI installed. These steps use Goose CLI to configure provider settings. Goose shares core provider settings between Goose CLI and Goose Desktop. For installation options, see the Goose [Quickstart](https://goose-docs.ai/docs/quickstart/).
* You have one of the following:
  * A Poolside Platform API key. To create one, go to [platform.poolside.ai](https://platform.poolside.ai/).
  * An API key for your organization's Poolside deployment.
  * An OpenRouter API key with access to Poolside models. To create one, go to [OpenRouter API keys](https://openrouter.ai/keys).

## Steps

<Tabs>
  <Tab title="Poolside Platform">
    Goose splits the endpoint into a host and a base path, rather than taking a single base URL.

    1. In your terminal, run `goose configure`.

       ```bash theme={null}
       goose configure
       ```

    2. Select **Configure Providers**.

    3. Select **OpenAI**.

    4. When prompted for `OPENAI_API_KEY`, paste your Poolside API key.

    5. For `OPENAI_HOST`, enter `https://inference.poolside.ai`. Do not include `/v1`. The base path covers it.

    6. For `OPENAI_BASE_PATH`, keep the default, `v1/chat/completions`.

    7. Enter the model ID for an available Poolside model.

       To find model IDs for your access method, see [List available models](/api/openai-api-examples#list-available-models).

       Goose checks the configuration and saves it. To rename the provider or connect multiple OpenAI-compatible endpoints, create a custom provider instead. See [Configure LLM Provider](https://goose-docs.ai/docs/getting-started/providers/) in the Goose documentation.

    8. Start an interactive session from your project directory. In Goose CLI, run:

       ```bash theme={null}
       goose session
       ```

    9. Send a codebase question to confirm Goose responds with the selected Poolside model.
  </Tab>

  <Tab title="Poolside deployment">
    Goose splits the endpoint into a host and a base path, rather than taking a single base URL.

    1. In your terminal, run `goose configure`.

       ```bash theme={null}
       goose configure
       ```

    2. Select **Configure Providers**.

    3. Select **OpenAI**.

    4. When prompted for `OPENAI_API_KEY`, paste the API key for your Poolside deployment.

    5. For `OPENAI_HOST`, enter your deployment's API domain, such as `https://poolside.example.com`. Do not include `/openai/v1`. The base path covers it.

    6. For `OPENAI_BASE_PATH`, enter `openai/v1/chat/completions`.

    7. Enter the model ID for an available Poolside model.

       To find model IDs for your access method, see [List available models](/api/openai-api-examples#list-available-models).

       Goose checks the configuration and saves it. To rename the provider or connect multiple OpenAI-compatible endpoints, create a custom provider instead. See [Configure LLM Provider](https://goose-docs.ai/docs/getting-started/providers/) in the Goose documentation.

    8. Start an interactive session from your project directory. In Goose CLI, run:

       ```bash theme={null}
       goose session
       ```

    9. Send a codebase question to confirm Goose responds with the selected Poolside model.
  </Tab>

  <Tab title="OpenRouter">
    Use this option if you already route your models through OpenRouter, or want to compare Poolside models alongside others.

    1. Create an API key in your [OpenRouter](https://openrouter.ai/) account settings.

    2. In your terminal, run `goose configure`.

       ```bash theme={null}
       goose configure
       ```

    3. Select **Configure Providers**.

    4. Select **OpenRouter**.

    5. When prompted, paste your OpenRouter API key.

    6. Enter the model ID for an available Poolside model.

       OpenRouter may offer free and paid Poolside models. To see current availability and model IDs, see [Poolside models on OpenRouter](https://openrouter.ai/poolside).

    7. Start an interactive session from your project directory. In Goose CLI, run:

       ```bash theme={null}
       goose session
       ```

    8. Send a codebase question to confirm Goose responds with the selected Poolside model.
  </Tab>
</Tabs>

## Related resources

* [Desktop apps](/tools#desktop-apps)
* [Poolside API](/api/overview)
* [Supported models](/get-started/supported-models)
* [OpenRouter API keys](https://openrouter.ai/keys)
* [Poolside models on OpenRouter](https://openrouter.ai/poolside)
* [Goose Quickstart](https://goose-docs.ai/docs/quickstart/)
* [Goose Configure LLM Provider](https://goose-docs.ai/docs/getting-started/providers/)
* [Goose shared configuration settings](https://goose-docs.ai/docs/getting-started/installation/#shared-configuration-settings)

# Use Poolside models in Kilo Code

> Configure Kilo Code to use Poolside models through Kilo Gateway, the Poolside Platform OpenAI-compatible endpoint, or OpenRouter.

Use Kilo Gateway to start from the model picker in Kilo Code. Use the Poolside Platform endpoint if you want Kilo Code to use a free Poolside Platform API key directly. Use OpenRouter if you already manage access through OpenRouter or need paid access to Poolside models.

## Watch the setup video

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/hwBEra9Wnmk" title="Kilo Code setup video - embed" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

## Prerequisites

* You have Kilo Code installed in a supported editor. For installation options, see [Installing Kilo Code](https://kilo.ai/docs/getting-started/installing).
* You have one of the following:
  * Access to Poolside models through Kilo Gateway. Free Poolside models may be available without signing in. For paid models, sign up at [Kilo Code](https://kilo.ai/).
  * A Poolside Platform API key. To create one, go to [platform.poolside.ai](https://platform.poolside.ai/).
  * An OpenRouter API key with access to Poolside models. To create one, go to [OpenRouter API keys](https://openrouter.ai/keys).

## Steps

<Tabs>
  <Tab title="Kilo Gateway">
    1. Open Kilo Code.

    2. In the model picker, select a free Poolside model served through Kilo Gateway, or sign in to unlock additional models.

       For current model availability, see [Poolside models on Kilo Code](https://kilo.ai/models/by/poolside).

    3. Open a project and send a codebase question to confirm Kilo Code responds with the selected Poolside model.
  </Tab>

  <Tab title="Poolside Platform">
    1. In Kilo Code, click the settings icon.

    2. Click **Providers**.

    3. Click **Custom Provider**.

    4. Enter an ID and name for the provider, such as `poolside-platform` and `Poolside Platform`.

    5. Set the endpoint URL to `https://inference.poolside.ai/v1`.

       You can also find the endpoint URL in Poolside Platform.

    6. In Poolside Platform, open **API Keys**.

    7. Click **New key**.

    8. Copy the API key and paste it into the Kilo Code dialog.

    9. Select the Poolside models you want to use from the models Kilo Code suggests for the endpoint.

    10. Open a new chat.

    11. Search for `Poolside Platform`.

    12. Select the Poolside model you want to use.

    13. Send a codebase question to confirm Kilo Code responds with the selected Poolside model.
  </Tab>

  <Tab title="OpenRouter">
    1. In Kilo Code, click the settings icon.

    2. Click **Providers**.

    3. In the provider overview, click **OpenRouter**.

    4. Paste your OpenRouter API key into the Kilo Code dialog.

    5. Click **Submit**.

    6. Open a new chat.

    7. Search for a Poolside model served through OpenRouter.

       OpenRouter may offer free and paid Poolside models. To see current availability, see [Poolside models on OpenRouter](https://openrouter.ai/poolside).

    8. Select the model you want to use.

    9. Send a codebase question to confirm Kilo Code responds with the selected Poolside model.
  </Tab>
</Tabs>

## Related resources

* [Editors](/tools#editors)
* [Poolside API](/api/overview)
* [Supported models](/get-started/supported-models)
* [Kilo Code documentation](https://kilo.ai/docs/getting-started/installing)

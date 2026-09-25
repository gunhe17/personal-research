# Use Poolside models in Cline

> Configure Cline to use Poolside models through Poolside Platform or OpenRouter.

## Watch the setup video

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/lcda24_yK7E" title="Cline setup video - embed" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

## Prerequisites

* You have Cline installed in a supported editor. For installation options, see [Installing Cline](https://docs.cline.bot/getting-started/installing-cline).
* You have one of the following:
  * A Poolside Platform API key. To create one, go to [platform.poolside.ai](https://platform.poolside.ai/).
  * An OpenRouter API key with access to Poolside models. To create one, go to [OpenRouter API keys](https://openrouter.ai/keys).

## Steps

<Tabs>
  <Tab title="Poolside Platform">
    1. In Cline, select **Use your own API Key**.

    2. Configure the OpenAI-compatible endpoint.

       | Setting                 | Value                                                                                                          |
       | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
       | **API Provider**        | **OpenAI Compatible**                                                                                          |
       | **Base URL**            | `https://inference.poolside.ai/v1`. You can also copy the endpoint URL from Poolside Platform.                 |
       | **API Key**             | Your Poolside Platform API key. In Poolside Platform, open **API Keys**, create a key, and copy it into Cline. |
       | **Model**               | Select a Poolside model from the models Cline lists for the endpoint.                                          |
       | **Support Images**      | Clear the checkbox.                                                                                            |
       | **Context Window Size** | `256000`. To confirm the context window for a model, see [Supported models](/get-started/supported-models).    |

    3. Start a new chat and send a codebase question to confirm Cline responds with the selected Poolside model.
  </Tab>

  <Tab title="OpenRouter">
    1. In Cline, select **Use your own API Key**.

    2. Configure OpenRouter as the provider.

       | Setting                 | Value                                                                                                       |
       | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
       | **API Provider**        | **OpenRouter**                                                                                              |
       | **OpenRouter API Key**  | Your OpenRouter API key. To create one, go to [OpenRouter API keys](https://openrouter.ai/keys).            |
       | **Model**               | Select a Poolside model.                                                                                    |
       | **Support Images**      | Clear the checkbox.                                                                                         |
       | **Context Window Size** | `256000`. To confirm the context window for a model, see [Supported models](/get-started/supported-models). |

    3. Start a new chat and send a codebase question to confirm Cline responds with the selected Poolside model.
  </Tab>
</Tabs>

## Related resources

* [Editors](/tools#editors)
* [Poolside API](/api/overview)
* [Supported models](/get-started/supported-models)
* [OpenRouter API keys](https://openrouter.ai/keys)
* [Poolside models on OpenRouter](https://openrouter.ai/poolside)
* [Cline documentation](https://docs.cline.bot/getting-started/authorizing-with-cline)
* [Cline OpenRouter provider docs](https://docs.cline.bot/provider-config/openrouter)
* [Cline OpenAI Compatible provider docs](https://docs.cline.bot/provider-config/openai-compatible)

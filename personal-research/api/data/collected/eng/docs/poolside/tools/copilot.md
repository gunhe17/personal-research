# Use Poolside models in GitHub Copilot

> Configure GitHub Copilot in VS Code to use Poolside models through OpenRouter.

## Watch the setup video

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/3_sHw7ZydoA" title="GitHub Copilot setup video - embed" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

## Prerequisites

* You have VS Code installed with the GitHub Copilot extension active.
* You have an OpenRouter API key with access to Poolside models. To create one, go to [OpenRouter API keys](https://openrouter.ai/keys).

## Steps

1. In VS Code, open Copilot Chat.

2. Click the model selector in the prompt input box.

3. Click **Manage Language Models**, or click the settings icon to open model management.

4. Click **Add Models**.

5. Select **OpenRouter** as the provider.

6. Press `Enter` to accept the default group name.

7. Paste your OpenRouter API key into the input field, then press `Enter`.

8. In the language models panel, search for `poolside`.

9. Add or enable the Poolside models you want to use.

   OpenRouter may offer free and paid Poolside models. To see current availability, see [Poolside models on OpenRouter](https://openrouter.ai/poolside).

10. Return to Copilot Chat.

11. Click the model selector, then search for `poolside`.

12. Select the Poolside model you want to use.

13. Send a codebase question to confirm Copilot responds with the selected Poolside model.

## Related resources

* [Editors](/tools#editors)
* [Supported models](/get-started/supported-models)
* [OpenRouter API keys](https://openrouter.ai/keys)
* [Poolside models on OpenRouter](https://openrouter.ai/poolside)
* [GitHub Copilot documentation](https://docs.github.com/en/copilot)

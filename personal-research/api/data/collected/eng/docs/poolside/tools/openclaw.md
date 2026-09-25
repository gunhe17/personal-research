# Use Poolside models in OpenClaw

> Configure OpenClaw to use Poolside models through the Poolside provider plugin.

Connect OpenClaw to Poolside models through the official [Poolside provider plugin](https://clawhub.ai/poolside/plugins/openclaw-provider). The plugin publishes the Poolside model catalog to OpenClaw, so you don't need custom provider entries in `openclaw.json`.

## Watch the setup video

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/GjLFmeewK8A" title="OpenClaw setup video - embed" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

## Prerequisites

* You have OpenClaw installed. For installation options, see the [OpenClaw documentation](https://docs.openclaw.ai/).
* You have one of the following:
  * A Poolside Platform API key. To create one, go to [platform.poolside.ai](https://platform.poolside.ai/).
  * An API key for your organization's Poolside deployment.

## Steps

1. Install the Poolside provider plugin from ClawHub.

   ```bash theme={null}
   openclaw plugins install clawhub:@poolside/openclaw-provider
   ```

2. Authenticate with Poolside.

   <Tabs>
     <Tab title="Poolside Platform">
       ```bash theme={null}
       openclaw onboard --classic
       ```

       Review and accept the security disclaimer, select the default quick-start setup mode, then select **Poolside** when prompted for your primary authentication and model provider. Paste your Poolside API key when prompted.
     </Tab>

     <Tab title="Poolside deployment">
       <Note>
         If you run Poolside on your own infrastructure, set the base URL to your deployment's OpenAI-compatible endpoint instead. Replace `<api-domain>` with your deployment's host. The path is `/openai/v1`.
       </Note>

       * Add your deployment API key to `~/.openclaw/.env` on the Gateway host:

         ```bash theme={null}
         POOLSIDE_API_KEY=<api-key>
         ```

       * Set the provider's base URL to your deployment's OpenAI-compatible endpoint:

         ```bash theme={null}
         openclaw config set models.providers.poolside.baseUrl "https://<api-domain>/openai/v1"
         ```

       * Restart the Gateway to load the API key and base URL:

         ```bash theme={null}
         openclaw gateway restart
         ```
     </Tab>
   </Tabs>

3. Set a default model.

   ```bash theme={null}
   openclaw models set <poolside-model-id>
   ```

   The plugin registers the available Poolside models.

   To find model IDs for your access method, see [List available models](/api/openai-api-examples#list-available-models).

   To switch models for one chat without changing the default, use the `/model` command in the chat.

4. Send your first prompt.

   Start an agent session or send a message on a connected channel. Use a prompt that is specific and has a clear expected result, such as one of these examples:

   ```txt theme={null}
   Every morning at 08:00, check the 10 trending papers on Hugging Face (sorted by upvotes).
   - For each paper, show: title, upvotes, GitHub repo (if any), and a 1-line AI summary.
   - Notify me when you notice a spike in upvotes for a given paper.
   ```

   ```txt theme={null}
   Ask me five questions to get to know how I work, then update your USER file with what you learn.
   ```

   Confirm OpenClaw responds using the selected Poolside model. To check the primary model and provider authentication directly, run `openclaw models status`.

<Note>
  If the OpenClaw Gateway runs as a daemon (launchd/systemd), make sure `POOLSIDE_API_KEY` is available to that process (for example, in `~/.openclaw/.env` or via `env.shellEnv`).
</Note>

## Related resources

* [Coding agents](/tools#coding-agents)
* [Poolside API](/api/overview)
* [Supported models](/get-started/supported-models)
* [OpenClaw documentation](https://docs.openclaw.ai/)

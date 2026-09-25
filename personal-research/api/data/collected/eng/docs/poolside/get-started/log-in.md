# Log in to Poolside

> Choose an authentication option and start using Poolside models.

How you log in depends on how you access Poolside models.

<Tip>
  Looking for the fastest way to get a free Poolside API key? Choose **Use Poolside Platform for free (recommended)**.
</Tip>

## Before you start

The steps on this page use Poolside Agent CLI. See [Install Poolside Agent CLI](/cli/install).

If you need an API key for the Poolside API or a third-party tool, see [Poolside API](/api/overview#authenticate-api-requests).

## Choose a login option

Open a terminal and run `pool login`. Choose how you want to access models with the Poolside agent. To use a different ACP agent, run `pool -s`.

| Option                                                                                                                | Description                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**Use Poolside Platform for free (recommended)**](#use-poolside-platform-for-free-recommended)                       | Choose this option for fast, free developer access. Sign in to Poolside Platform, then copy the API key it creates for you. Recommended for most users. |
| [**Use your organization's Poolside deployment (enterprise)**](#use-your-organization-poolside-deployment-enterprise) | Choose this option if your organization has a Poolside deployment.                                                                                      |
| [**Use your OpenRouter account**](#use-your-openrouter-account)                                                       | Choose this option if you already use OpenRouter or need paid access to Poolside models.                                                                |
| [**Connect an OpenAI-compatible provider**](#connect-an-openai-compatible-provider)                                   | Choose this option if you use another provider, your own server, or an organization gateway that serves Poolside models.                                |

After you log in, the CLI stores the credentials so you do not need to enter them every time you start `pool`.

### Use Poolside Platform for free (recommended)

Choose this option if you want the fastest way to get free developer access. Sign in to Poolside Platform, then copy the API key it creates for you.

1. In the terminal, choose **Use Poolside Platform for free (recommended)**.
2. In the browser window that opens, sign in to [Poolside Platform](https://platform.poolside.ai/) or create an account.
3. Copy the API key that Poolside creates for you.
4. Return to the terminal.
5. Paste the key at the **Enter API key** prompt.

<Note>
  The API key created through Poolside Platform is for Poolside-hosted access. If your organization has a Poolside deployment, use that URL and sign-in method instead.
</Note>

<h3 id="use-your-organization-poolside-deployment-enterprise">
  Use your organization's Poolside deployment (enterprise)
</h3>

Choose this option if your organization has its own Poolside deployment. Your Poolside administrator gives you the API URL.

1. In the terminal, choose **Use your organization's Poolside deployment (enterprise)**.
2. Enter the API URL provided by your organization.
3. Choose how to authenticate:
   * **Log in via browser**: Complete the sign-in in the browser window that opens.
   * **Provide API token**: Paste your token at the **Enter API token** prompt.

### Use your OpenRouter account

Choose this option if you already use OpenRouter or need paid access to Poolside models.

1. In the terminal, choose **Use your OpenRouter account**.
2. Go to [OpenRouter API keys](https://openrouter.ai/keys), sign in, and create an API key.
3. Return to the terminal.
4. Paste the key at the **Enter API key** prompt.

<Tip>
  To see which Poolside models OpenRouter offers, go to [Poolside models on OpenRouter](https://openrouter.ai/poolside). You can chat with a model in [OpenRouter Chat](https://openrouter.ai/chat) before you set up a tool.
</Tip>

### Connect an OpenAI-compatible provider

Choose this option if you have access to an endpoint that serves Poolside models through an OpenAI-compatible API, such as:

* A third-party inference provider, such as [Baseten](https://www.baseten.co/library/publisher/poolside/)
* A model server you run yourself, such as vLLM or Ollama
* Your organization's internal gateway or proxy

1. In the terminal, choose **Connect an OpenAI-compatible provider**.
2. Enter the base URL for your provider's OpenAI-compatible endpoint.
3. Paste your provider's API key at the **Enter API key** prompt.

Your provider, server administrator, or organization supplies both values. Poolside cannot create them for you.

<Note>
  If your server does not validate API keys, enter any non-empty value at the **Enter API key** prompt, such as `local-test`.

  If you run a local model server, or use a provider that does not list models from its API, set the model name before starting `pool`:

  ```bash theme={null}
  POOLSIDE_STANDALONE_MODEL=<model-name> pool
  ```
</Note>

## Verify your login

Run:

```bash theme={null}
pool
```

When your credentials work, `pool` starts an interactive session and shows a `Connected to agent server:` message.

If the CLI cannot connect, see [Troubleshoot Poolside Agent CLI](/cli/troubleshooting).

## Switch accounts or providers

Log out, then log in again with a different option:

```bash theme={null}
pool logout
pool login
```

## Next steps

* [Use Poolside](/use-poolside) to choose where to work next.
* [Poolside API](/api/overview) to send model requests from your own tools and services.

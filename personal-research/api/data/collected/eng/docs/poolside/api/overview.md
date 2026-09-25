# Poolside API

> Get started with the Poolside OpenAI-compatible API: base URLs, keys, and your first request.

Poolside provides an OpenAI-compatible API for model requests. You can call it directly, use the official OpenAI SDK, or reach Poolside models through OpenRouter's API or SDK. You can also use API keys with the Poolside Agent CLI in non-interactive environments, such as scripts and CI jobs.

## Set the OpenAI-compatible API base URL

The OpenAI-compatible API base URL depends on how you access Poolside. The examples on this page use the base URL for Poolside Platform.

| Access method              | OpenAI-compatible API base URL                     |
| -------------------------- | -------------------------------------------------- |
| Poolside Platform          | `https://inference.poolside.ai/v1`                 |
| Poolside deployment        | `https://<api-domain>/openai/v1`                   |
| OpenRouter                 | `https://openrouter.ai/api/v1`                     |
| OpenAI-compatible provider | The base URL your provider or model server exposes |

OpenRouter uses an OpenAI-compatible API, so the same request shape and OpenAI SDK examples work when you switch the base URL and API key to OpenRouter.

For self-managed Poolside model inference, you can use LiteLLM as an OpenAI-compatible provider gateway in front of model-server `/v1` endpoints. See [Use LiteLLM with Poolside model inference](/deployment/inference-gateways/litellm).

<Note>
  The Poolside Platform API is served at `/v1`. A Poolside deployment serves the OpenAI-compatible API at `/openai/v1`. When you switch between them, update the path as well as the host.
</Note>

## Authenticate API requests

Authenticate API requests with an API key sent as a Bearer token.

### Get and set your API key

Where you get your API key depends on how you access Poolside.

* **Poolside Platform**: Use this for the fastest way to get a free developer API key for models hosted by Poolside. Go to [platform.poolside.ai](https://platform.poolside.ai/), sign in, open the **API Keys** tab, and click **New key**.
* **OpenRouter**: Use this if you already use OpenRouter or need paid access to Poolside models. Go to [OpenRouter API keys](https://openrouter.ai/keys), sign in, and create an API key.
* **Poolside deployment**: Use the API key or token from your Poolside administrator.
* **OpenAI-compatible provider**: Use the API key from the provider you configure.

If you use Poolside Agent CLI, see [Log in to Poolside](/get-started/log-in) instead.

Save your key as an environment variable so it is never hard-coded into your scripts. The examples below read from these variables.

```bash theme={null}
export POOLSIDE_API_KEY="<api-key>"
export OPENROUTER_API_KEY="<api-key>"
```

The examples read these values with `os.environ` in Python, `process.env` in TypeScript, and `$POOLSIDE_API_KEY` in shell.

### Send the key with Bearer authentication

Send your API key in the `Authorization` header:

```text theme={null}
Authorization: Bearer <api-key>
```

API keys are secrets. Store them securely and never commit them to source control.

## Make your first request

Choose the approach that fits your setup. Each approach sends the same request, so you only need one.

### Direct HTTP request

Send a Chat Completions request.

To find model IDs for your access method, see [List available models](/api/openai-api-examples#list-available-models).

<CodeGroup>
  ```bash cURL theme={null}
  curl https://inference.poolside.ai/v1/chat/completions \
    -H "Authorization: Bearer $POOLSIDE_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "poolside/laguna-s-2.1",
      "messages": [{ "role": "user", "content": "Hello Laguna" }]
    }'
  ```

  ```python Python theme={null}
  import os
  import requests

  response = requests.post(
      "https://inference.poolside.ai/v1/chat/completions",
      headers={"Authorization": f"Bearer {os.environ['POOLSIDE_API_KEY']}"},
      json={
          "model": "poolside/laguna-s-2.1",
          "messages": [{"role": "user", "content": "Hello Laguna"}],
      },
  )

  print(response.json())
  ```

  ```typescript TypeScript theme={null}
  const response = await fetch("https://inference.poolside.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.POOLSIDE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "poolside/laguna-s-2.1",
      messages: [{ role: "user", content: "Hello Laguna" }],
    }),
  });

  console.log(await response.json());
  ```
</CodeGroup>

<Note>
  To send the same request through OpenRouter, use `https://openrouter.ai/api/v1/chat/completions` as the URL and your `OPENROUTER_API_KEY`.
</Note>

### OpenAI SDK

Install the OpenAI client library.

<CodeGroup>
  ```bash pip theme={null}
  pip install openai
  ```

  ```bash npm theme={null}
  npm install openai
  ```
</CodeGroup>

Point the client at Poolside by setting the base URL and API key.

<CodeGroup>
  ```python Python theme={null}
  import os
  from openai import OpenAI

  client = OpenAI(
      api_key=os.environ["POOLSIDE_API_KEY"],
      base_url="https://inference.poolside.ai/v1",
  )

  completion = client.chat.completions.create(
      model="poolside/laguna-s-2.1",
      messages=[{"role": "user", "content": "Hello Laguna"}],
  )

  print(completion.choices[0].message.content)
  ```

  ```typescript TypeScript theme={null}
  import OpenAI from "openai";

  const client = new OpenAI({
    apiKey: process.env.POOLSIDE_API_KEY,
    baseURL: "https://inference.poolside.ai/v1",
  });

  const completion = await client.chat.completions.create({
    model: "poolside/laguna-s-2.1",
    messages: [{ role: "user", content: "Hello Laguna" }],
  });

  console.log(completion.choices[0].message.content);
  ```
</CodeGroup>

<Note>
  To use OpenRouter instead, set the base URL to `https://openrouter.ai/api/v1` and pass your `OPENROUTER_API_KEY`.
</Note>

### OpenRouter SDK

Install the OpenRouter client library.

<CodeGroup>
  ```bash npm theme={null}
  npm install @openrouter/sdk
  ```

  ```bash pnpm theme={null}
  pnpm add @openrouter/sdk
  ```

  ```bash yarn theme={null}
  yarn add @openrouter/sdk
  ```

  ```bash pip theme={null}
  pip install openrouter
  ```
</CodeGroup>

Create a client with your `OPENROUTER_API_KEY`.

<CodeGroup>
  ```python Python theme={null}
  import os
  from openrouter import OpenRouter

  with OpenRouter(api_key=os.environ["OPENROUTER_API_KEY"]) as client:
      response = client.chat.send(
          model="poolside/laguna-s-2.1",
          messages=[{"role": "user", "content": "Hello Laguna"}],
      )

      print(response.choices[0].message.content)
  ```

  ```typescript TypeScript theme={null}
  import { OpenRouter } from "@openrouter/sdk";

  const client = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const completion = await client.chat.send({
    chatRequest: {
      model: "poolside/laguna-s-2.1",
      messages: [{ role: "user", content: "Hello Laguna" }],
    },
  });

  console.log(completion.choices[0].message.content);
  ```
</CodeGroup>

## Use the API for CLI automation

For CLI automation, set `POOLSIDE_API_KEY` before running `pool exec`. If you also set `POOLSIDE_API_URL`, use the Poolside deployment API URL from your administrator, not the `/openai/v1` OpenAI-compatible API path. See [Automate tasks](/cli/automated-mode#basic-usage).

## Next steps

* [OpenAI-compatible API examples](/api/openai-api-examples) for endpoint reference, extra context, and tool use
* [Supported models](/get-started/supported-models) for model guidance, context windows, and modes
* [Editors](/tools#editors) to use Poolside from editors and editor extensions
* [Desktop apps](/tools#desktop-apps) to use Poolside from desktop apps

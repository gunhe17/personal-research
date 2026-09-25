# Models

Meta Model API runs Meta's latest models for agentic and coding work — multi-step tool loops, software engineering assistants, and long-context reasoning. This page shows what's available today and what each model can do.

## Available models {#available-models}

| Model ID | Input modalities | Output modalities | Context window |
| :---- | :---- | :---- | :---- |
| `muse-spark-1.1` | Text, image, video, PDF | Text | 1,048,576 tokens |

### Muse Spark 1.1 {#muse-spark}

**Model ID:** `muse-spark-1.1`

Muse Spark 1.1 is multimodal: it takes text, image, video, audio, and PDF as input and generates text. Use it for [chat completion](/docs/protocols/chat-completions), [image understanding](/docs/image-understanding), [video and audio understanding](/docs/video-understanding), [tool calling](/docs/tool-calling), [structured output](/docs/structured-output), and [search grounding](/docs/search-grounding).

| Context window | Input modalities | Output modalities |
| :---- | :---- | :---- |
| 1,048,576 tokens | Text, image, video, audio, PDF | Text |

**Best for:** Agentic [tool calling](/docs/tool-calling) and multi-step workflows, coding and technical assistants, [structured output](/docs/structured-output), [image understanding](/docs/image-understanding) and [video and audio understanding](/docs/video-understanding), document processing, real-time chat, and high-frequency sub-agent loops.

## List models via the API {#list-models}

Query the catalog programmatically when you need to check what's enabled for your team:

```python title="Python (OpenAI SDK)"
import os

from openai import OpenAI

client = OpenAI(
    base_url="https://api.meta.ai/v1",
    api_key=os.environ["MODEL_API_KEY"],
)

response = client.models.list()

print(response.model_dump_json(indent=2))
```
```python title="Python (requests)"
import json
import os

import requests

response = requests.get(
    "https://api.meta.ai/v1/models",
    headers={"Authorization": f"Bearer {os.environ['MODEL_API_KEY']}"},
)
response.raise_for_status()
print(json.dumps(response.json(), indent=2))
```
```shell title="curl"
curl -X GET "https://api.meta.ai/v1/models" \
  -H "Authorization: Bearer $MODEL_API_KEY"
```


The response returns models sorted newest-first by creation time, with the model ID as a stable tiebreaker. Each object includes a `created` field — the Unix timestamp in seconds for when the model was added to the registry. `GET /v1/models/{model}` returns the same `created` value for a single model.

## Next steps

- [Get started](/docs/quickstart#first-call): make your first call with Muse Spark
- [Pricing and rate limits](/docs/pricing-rate-limits): see rates and retry guidance
- [Chat completion](/docs/protocols/chat-completions): start generating with the core conversational endpoint
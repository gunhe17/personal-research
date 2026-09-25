# OpenAI-compatible API examples

> Make OpenAI-compatible API requests to Poolside models.

This page shows examples for the OpenAI-compatible API. Request examples show each access method. Most response examples come from a Poolside deployment. Responses from Poolside Platform, OpenRouter, or another provider may differ.

If you use another OpenAI-compatible provider or your own model server, use the base URL, API key, and model IDs your provider exposes. Provider-specific request parameters, including reasoning settings, can differ.

## Prerequisites

Before you get started, you need:

1. An API key for your access method: a Poolside Platform API key, an API key for your organization's Poolside deployment, or an OpenRouter API key. To get a key and send it with Bearer authentication, see [Authenticate API requests](/api/overview#authenticate-api-requests).
2. `curl` or another tool that can make API requests.

## List available models

Most API requests require you to pass a model `id`. To get all available models and their `ids`:

<Tabs>
  <Tab title="Poolside Platform">
    ```bash title="List models" theme={null}
    curl --request GET \
      --url https://inference.poolside.ai/v1/models \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Authorization: Bearer <api-key>'
    ```

    ```json title="Response example" theme={null}
    {
      "data": [
        {
          "id": "poolside/laguna-s-2.1",
          "created": 1751637312,
          "owned_by": "system",
          "object": "model"
        }
      ],
      "object": "list"
    }
    ```

    In this case, the response includes one model with the `id` `poolside/laguna-s-2.1`.
  </Tab>

  <Tab title="Poolside deployment">
    ```bash title="List models" theme={null}
    curl --request GET \
      --url https://<api-domain>/openai/v1/models \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Authorization: Bearer <api-key>'
    ```

    ```json title="Response example" theme={null}
    {
      "$schema": "https://<api-domain>/openai/schemas/PageListModel.json",
      "data": [
        {
          "id": "poolside/laguna-s-2.1",
          "created": 1751637312,
          "owned_by": "system",
          "object": "model"
        }
      ],
      "object": "list"
    }
    ```

    In this case, the response includes one model with the `id` `poolside/laguna-s-2.1`.
  </Tab>

  <Tab title="OpenRouter">
    This request does not require an API key. The response is not limited to Poolside models, so this example pipes the output to `jq` to filter for Poolside model `id` values:

    ```bash title="List models" theme={null}
    curl --silent --request GET \
      --url https://openrouter.ai/api/v1/models |
      jq '[.data[] | select(.id | startswith("poolside/")) | {id, name}]'
    ```

    ```json title="Response example" theme={null}
    [
      {
        "id": "poolside/laguna-s-2.1",
        "name": "Poolside: Laguna S 2.1"
      },
      {
        "id": "poolside/laguna-s-2.1:free",
        "name": "Poolside: Laguna S 2.1 (free)"
      }
    ]
    ```

    OpenRouter may offer free and paid Poolside models. To see current availability in the browser, see [Poolside models on OpenRouter](https://openrouter.ai/poolside).
  </Tab>
</Tabs>

## Send a chat prompt

To generate completions from a model, you need the model `id` and your prompt formatted as `content` inside `messages` with the `user` `role`:

<Tabs>
  <Tab title="Poolside Platform">
    ```bash title="Send chat prompt" theme={null}
    curl --request POST \
      --url https://inference.poolside.ai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "messages": [
        {
          "content": "Explain cURL",
          "role": "user"
        }
      ],
      "model": "poolside/laguna-s-2.1"
    }'
    ```
  </Tab>

  <Tab title="Poolside deployment">
    ```bash title="Send chat prompt" theme={null}
    curl --request POST \
      --url https://<api-domain>/openai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "messages": [
        {
          "content": "Explain cURL",
          "role": "user"
        }
      ],
      "model": "poolside/laguna-s-2.1"
    }'
    ```
  </Tab>

  <Tab title="OpenRouter">
    ```bash title="Send chat prompt" theme={null}
    curl --request POST \
      --url https://openrouter.ai/api/v1/chat/completions \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "messages": [
        {
          "content": "Explain cURL",
          "role": "user"
        }
      ],
      "model": "poolside/laguna-s-2.1"
    }'
    ```
  </Tab>
</Tabs>

```json title="Response example" theme={null}
{
  "model": "poolside/laguna-s-2.1",
  "created": 1751993576,
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": {
        "content": "cURL is a powerful command-line tool used for transferring data to or from a server, supporting various protocols such as HTTP, HTTPS, FTP, and more. It's widely used for testing APIs, downloading files, and automating HTTP requests. cURL allows you to specify headers, methods (GET, POST, PUT, DELETE, etc.), and data payloads, making it versatile for a range of web-related tasks.\n",
        "role": "assistant"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "completion_tokens": 88,
    "prompt_tokens": 447,
    "total_tokens": 535
  }
}
```

The `usage` object reports the tokens used by the request and response.

You can set optional parameters. This is not an exhaustive list.

**Request body:**

* `model` (required): Model `id` to use.
* `messages` (required): An array of messages representing the conversation.
* `max_completion_tokens` (optional): The maximum number of tokens to generate in the completion.
* `chat_template_kwargs` (optional, Poolside API): Model-specific chat template settings for Poolside Platform and Poolside deployments. Set `enable_thinking` to `false` to turn off thinking for models that support this setting.
* `reasoning` (optional, OpenRouter-compatible providers): Reasoning configuration for providers that accept the OpenRouter-style `reasoning` field.
* `stop` (optional): An array of sequences where the API stops generating further tokens.
* `temperature` (optional): What sampling temperature to use, between 0 and 2. Higher values like 0.8 make the output more random, while lower values like 0.2 make it more focused and deterministic.
* `stream` (optional): Response format. A stream of a series of events or a single JSON object.

## Turn off thinking through the Poolside API

Some Poolside models support per-request thinking control through Poolside API chat template settings. To turn off thinking, set `chat_template_kwargs.enable_thinking` to `false`:

```bash title="Turn off thinking" theme={null}
curl --request POST \
  --url https://inference.poolside.ai/v1/chat/completions \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer <api-key>' \
  --data '{
    "model": "poolside/laguna-s-2.1",
    "messages": [
      {
        "role": "user",
        "content": "What are channels in Go?"
      }
    ],
    "chat_template_kwargs": {
      "enable_thinking": false
    }
  }'
```

<Note>
  OpenAI-compatible tool calling behavior can vary by model and serving configuration. If you need to force a specific function call with `tool_choice`, such as `"required"` or a named function, try turning off thinking first by setting `chat_template_kwargs.enable_thinking` to `false`. For request and response formats, see the [OpenAI function calling guide](https://platform.openai.com/docs/guides/function-calling).
</Note>

## Control reasoning through OpenRouter

To control reasoning effort through OpenRouter-compatible models, include a `reasoning` object:

```json theme={null}
{
  "model": "<model-id>",
  "messages": [
    {
      "content": "Explain cURL",
      "role": "user"
    }
  ],
  "reasoning": {
    "effort": "max"
  }
}
```

OpenRouter's generic effort values are `max`, `xhigh`, `high`, `medium`, `low`, `minimal`, and `none`, but provider and model support varies. Replace `<model-id>` and `max` with values that your selected model supports.

<Note>
  The `reasoning` field is OpenRouter-style: a top-level object, which differs from the OpenAI Chat Completions `reasoning_effort` parameter. Use it only with OpenRouter or another provider that accepts this field. A direct connection to the OpenAI Chat Completions API at `https://api.openai.com/v1/chat/completions` rejects the `reasoning` field.

  Effort-level support varies by provider and model. Some providers ignore effort settings or apply thinking automatically. Check your provider's documentation for how it handles the `reasoning` field.
</Note>

## Preserve reasoning in agentic workflows

<Note>
  For agentic workflows with Poolside models, preserve `reasoning_content` from assistant responses when you include those responses in follow-up requests. Dropping previous reasoning content can prevent the model from reasoning in later steps. For examples, see the [Control reasoning](https://huggingface.co/poolside/Laguna-S-2.1#controlling-reasoning) sections on the Laguna model pages.
</Note>

## Stream responses

For example, if you want to receive your response as a series of completion chunks returned as server-sent events, set `stream` to `true`. This is useful for real-time applications.

<Tabs>
  <Tab title="Poolside Platform">
    ```bash title="Stream chat prompt" theme={null}
    curl --request POST \
      --url https://inference.poolside.ai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "messages": [
        {
          "content": "Explain cURL",
          "role": "user"
        }
      ],
      "model": "poolside/laguna-s-2.1",
      "stream": true
    }'
    ```
  </Tab>

  <Tab title="Poolside deployment">
    ```bash title="Stream chat prompt" theme={null}
    curl --request POST \
      --url https://<api-domain>/openai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "messages": [
        {
          "content": "Explain cURL",
          "role": "user"
        }
      ],
      "model": "poolside/laguna-s-2.1",
      "stream": true
    }'
    ```
  </Tab>

  <Tab title="OpenRouter">
    ```bash title="Stream chat prompt" theme={null}
    curl --request POST \
      --url https://openrouter.ai/api/v1/chat/completions \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "messages": [
        {
          "content": "Explain cURL",
          "role": "user"
        }
      ],
      "model": "poolside/laguna-s-2.1",
      "stream": true
    }'
    ```
  </Tab>
</Tabs>

```text title="Response example" theme={null}
data: {"model":"poolside/laguna-s-2.1","created":1754035552,"object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":""}]}

data: {"model":"poolside/laguna-s-2.1","created":1754035552,"object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"cURL","role":"assistant"},"finish_reason":""}]}

data: {"model":"poolside/laguna-s-2.1","created":1754035552,"object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":" ","role":"assistant"},"finish_reason":""}]}

data: {"model":"poolside/laguna-s-2.1","created":1754035552,"object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"is a","role":"assistant"},"finish_reason":""}]}

...
```

## Send a chat prompt with extra context

Optionally, you can add more context to a query. This is useful when you want to give the model information it does not have. Refer to the [Prompting guide](/resources/prompting-best-practices) for further guidance.

Consider the following query:

<Tabs>
  <Tab title="Poolside Platform">
    ```bash title="Ask without context" theme={null}
    curl --request POST \
      --url https://inference.poolside.ai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "messages": [
        {
          "content": "What is my name?",
          "role": "user"
        }
      ],
      "model": "poolside/laguna-s-2.1"
    }'
    ```
  </Tab>

  <Tab title="Poolside deployment">
    ```bash title="Ask without context" theme={null}
    curl --request POST \
      --url https://<api-domain>/openai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "messages": [
        {
          "content": "What is my name?",
          "role": "user"
        }
      ],
      "model": "poolside/laguna-s-2.1"
    }'
    ```
  </Tab>

  <Tab title="OpenRouter">
    ```bash title="Ask without context" theme={null}
    curl --request POST \
      --url https://openrouter.ai/api/v1/chat/completions \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "messages": [
        {
          "content": "What is my name?",
          "role": "user"
        }
      ],
      "model": "poolside/laguna-s-2.1"
    }'
    ```
  </Tab>
</Tabs>

The model has no mechanism to know the user's name, so it provides an incomplete response:

```json title="Response example" theme={null}
{
  "model": "poolside/laguna-s-2.1",
  "created": 1751993576,
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": {
        "content": "I'm sorry, but I do not have that information. Could you please provide your name?\n",
        "role": "assistant"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "completion_tokens": 22,
    "prompt_tokens": 674,
    "total_tokens": 696
  }
}
```

However, if you want the model to answer questions about data you have, you can pass that as context in a message:

<Tabs>
  <Tab title="Poolside Platform">
    ```bash title="Ask with context" theme={null}
    curl --request POST \
      --url https://inference.poolside.ai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "messages": [
        {
          "content": "path:/Users/name/Desktop/userinfo content:My name is Jason. Question: What is my name?",
          "role": "user"
        }
      ],
      "model": "poolside/laguna-s-2.1"
    }'
    ```
  </Tab>

  <Tab title="Poolside deployment">
    ```bash title="Ask with context" theme={null}
    curl --request POST \
      --url https://<api-domain>/openai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "messages": [
        {
          "content": "path:/Users/name/Desktop/userinfo content:My name is Jason. Question: What is my name?",
          "role": "user"
        }
      ],
      "model": "poolside/laguna-s-2.1"
    }'
    ```
  </Tab>

  <Tab title="OpenRouter">
    ```bash title="Ask with context" theme={null}
    curl --request POST \
      --url https://openrouter.ai/api/v1/chat/completions \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "messages": [
        {
          "content": "path:/Users/name/Desktop/userinfo content:My name is Jason. Question: What is my name?",
          "role": "user"
        }
      ],
      "model": "poolside/laguna-s-2.1"
    }'
    ```
  </Tab>
</Tabs>

In the previous snippet, the message provides context about the user's name. If you run this example, the response takes this information into account.

```json title="Response example" theme={null}
{
  "model": "poolside/laguna-s-2.1",
  "created": 1751993576,
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": {
        "content": "Based on the provided context, your name is Jason.",
        "role": "assistant"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "completion_tokens": 15,
    "prompt_tokens": 693,
    "total_tokens": 708
  }
}
```

You can also provide multiple context messages or include file contents as context by describing them in system messages.

## Extend models with tools

You can extend your model's capabilities by providing tools (functions) that the model can call during conversations. This enables the model to perform actions like retrieving real-time data, calculations, or interacting with external systems.

To use tools, include a `tools` array in your request and define the functions the model can call:

<Tabs>
  <Tab title="Poolside Platform">
    ```bash title="Define a tool" theme={null}
    curl --request POST \
      --url https://inference.poolside.ai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "model": "poolside/laguna-s-2.1",
      "messages": [
        {
          "role": "user",
          "content": "what is the weather forecast for San Francisco"
        }
      ],
      "tools": [
        {
          "type": "function",
          "function": {
            "name": "get_forecast",
            "description": "Get weather forecast for a city",
            "parameters": {
              "type": "object",
              "properties": {
                "city": {
                  "type": "string",
                  "description": "City name"
                }
              },
              "required": [
                "city"
              ],
              "additionalProperties": false
            }
          }
        }
      ]
    }'
    ```
  </Tab>

  <Tab title="Poolside deployment">
    ```bash title="Define a tool" theme={null}
    curl --request POST \
      --url https://<api-domain>/openai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "model": "poolside/laguna-s-2.1",
      "messages": [
        {
          "role": "user",
          "content": "what is the weather forecast for San Francisco"
        }
      ],
      "tools": [
        {
          "type": "function",
          "function": {
            "name": "get_forecast",
            "description": "Get weather forecast for a city",
            "parameters": {
              "type": "object",
              "properties": {
                "city": {
                  "type": "string",
                  "description": "City name"
                }
              },
              "required": [
                "city"
              ],
              "additionalProperties": false
            }
          }
        }
      ]
    }'
    ```
  </Tab>

  <Tab title="OpenRouter">
    ```bash title="Define a tool" theme={null}
    curl --request POST \
      --url https://openrouter.ai/api/v1/chat/completions \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "model": "poolside/laguna-s-2.1",
      "messages": [
        {
          "role": "user",
          "content": "what is the weather forecast for San Francisco"
        }
      ],
      "tools": [
        {
          "type": "function",
          "function": {
            "name": "get_forecast",
            "description": "Get weather forecast for a city",
            "parameters": {
              "type": "object",
              "properties": {
                "city": {
                  "type": "string",
                  "description": "City name"
                }
              },
              "required": [
                "city"
              ],
              "additionalProperties": false
            }
          }
        }
      ]
    }'
    ```
  </Tab>
</Tabs>

When the model needs to use a tool, it responds with a `tool_calls` array in the model response message.

```json title="Response example" theme={null}
{
  "model": "poolside/laguna-s-2.1",
  "created": 1753997542,
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "tool_calls": [
          {
            "id": "call_abc123",
            "type": "function",
            "function": {
              "name": "get_forecast",
              "arguments": "{\"city\": \"San Francisco\"}"
            }
          }
        ]
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "completion_tokens": 95,
    "prompt_tokens": 338,
    "total_tokens": 433
  }
}
```

To continue the conversation, run the tool and provide the tool result:

<Tabs>
  <Tab title="Poolside Platform">
    ```bash title="Send a tool result" theme={null}
    curl --request POST \
      --url https://inference.poolside.ai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "model": "poolside/laguna-s-2.1",
      "messages": [
        {
          "role": "user",
          "content": "what is the weather forecast for San Francisco"
        },
        {
          "role": "assistant",
          "content": "",
          "tool_calls": [
            {
              "id": "call_abc123",
              "type": "function",
              "function": {
                "name": "get_forecast",
                "arguments": "{\"city\": \"San Francisco\"}"
              }
            }
          ]
        },
        {
          "role": "tool",
          "tool_call_id": "call_abc123",
          "content": "{\"temperature\": 25}"
        }
      ],
      "tools": [
        {
          "type": "function",
          "function": {
            "name": "get_forecast",
            "description": "Get weather forecast for a city",
            "parameters": {
              "type": "object",
              "properties": {
                "city": {
                  "type": "string",
                  "description": "City name"
                }
              },
              "required": [
                "city"
              ],
              "additionalProperties": false
            }
          }
        }
      ]
    }'
    ```
  </Tab>

  <Tab title="Poolside deployment">
    ```bash title="Send a tool result" theme={null}
    curl --request POST \
      --url https://<api-domain>/openai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "model": "poolside/laguna-s-2.1",
      "messages": [
        {
          "role": "user",
          "content": "what is the weather forecast for San Francisco"
        },
        {
          "role": "assistant",
          "content": "",
          "tool_calls": [
            {
              "id": "call_abc123",
              "type": "function",
              "function": {
                "name": "get_forecast",
                "arguments": "{\"city\": \"San Francisco\"}"
              }
            }
          ]
        },
        {
          "role": "tool",
          "tool_call_id": "call_abc123",
          "content": "{\"temperature\": 25}"
        }
      ],
      "tools": [
        {
          "type": "function",
          "function": {
            "name": "get_forecast",
            "description": "Get weather forecast for a city",
            "parameters": {
              "type": "object",
              "properties": {
                "city": {
                  "type": "string",
                  "description": "City name"
                }
              },
              "required": [
                "city"
              ],
              "additionalProperties": false
            }
          }
        }
      ]
    }'
    ```
  </Tab>

  <Tab title="OpenRouter">
    ```bash title="Send a tool result" theme={null}
    curl --request POST \
      --url https://openrouter.ai/api/v1/chat/completions \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "model": "poolside/laguna-s-2.1",
      "messages": [
        {
          "role": "user",
          "content": "what is the weather forecast for San Francisco"
        },
        {
          "role": "assistant",
          "content": "",
          "tool_calls": [
            {
              "id": "call_abc123",
              "type": "function",
              "function": {
                "name": "get_forecast",
                "arguments": "{\"city\": \"San Francisco\"}"
              }
            }
          ]
        },
        {
          "role": "tool",
          "tool_call_id": "call_abc123",
          "content": "{\"temperature\": 25}"
        }
      ],
      "tools": [
        {
          "type": "function",
          "function": {
            "name": "get_forecast",
            "description": "Get weather forecast for a city",
            "parameters": {
              "type": "object",
              "properties": {
                "city": {
                  "type": "string",
                  "description": "City name"
                }
              },
              "required": [
                "city"
              ],
              "additionalProperties": false
            }
          }
        }
      ]
    }'
    ```
  </Tab>
</Tabs>

## Constrain the response format

To constrain a response to a specific JSON structure, include a `response_format` object with `type` set to `json_schema` and a JSON Schema definition. The model returns a JSON string in `message.content` that follows the schema.

<Tabs>
  <Tab title="Poolside Platform">
    ```bash title="Request structured output" theme={null}
    curl --request POST \
      --url https://inference.poolside.ai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "model": "poolside/laguna-s-2.1",
      "messages": [
        {
          "content": "Extract the city and country from: I live in San Francisco, United States.",
          "role": "user"
        }
      ],
      "response_format": {
        "type": "json_schema",
        "json_schema": {
          "name": "location",
          "strict": true,
          "schema": {
            "type": "object",
            "properties": {
              "city": {
                "type": "string"
              },
              "country": {
                "type": "string"
              }
            },
            "required": [
              "city",
              "country"
            ],
            "additionalProperties": false
          }
        }
      }
    }'
    ```
  </Tab>

  <Tab title="Poolside deployment">
    ```bash title="Request structured output" theme={null}
    curl --request POST \
      --url https://<api-domain>/openai/v1/chat/completions \
      --header 'Accept: application/json, application/problem+json' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "model": "poolside/laguna-s-2.1",
      "messages": [
        {
          "content": "Extract the city and country from: I live in San Francisco, United States.",
          "role": "user"
        }
      ],
      "response_format": {
        "type": "json_schema",
        "json_schema": {
          "name": "location",
          "strict": true,
          "schema": {
            "type": "object",
            "properties": {
              "city": {
                "type": "string"
              },
              "country": {
                "type": "string"
              }
            },
            "required": [
              "city",
              "country"
            ],
            "additionalProperties": false
          }
        }
      }
    }'
    ```
  </Tab>

  <Tab title="OpenRouter">
    ```bash title="Request structured output" theme={null}
    curl --request POST \
      --url https://openrouter.ai/api/v1/chat/completions \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <api-key>' \
      --data '{
      "model": "poolside/laguna-s-2.1",
      "messages": [
        {
          "content": "Extract the city and country from: I live in San Francisco, United States.",
          "role": "user"
        }
      ],
      "response_format": {
        "type": "json_schema",
        "json_schema": {
          "name": "location",
          "strict": true,
          "schema": {
            "type": "object",
            "properties": {
              "city": {
                "type": "string"
              },
              "country": {
                "type": "string"
              }
            },
            "required": [
              "city",
              "country"
            ],
            "additionalProperties": false
          }
        }
      }
    }'
    ```
  </Tab>
</Tabs>

The model returns the structured data as a JSON string in `message.content`:

```json title="Response example" theme={null}
{
  "model": "poolside/laguna-s-2.1",
  "created": 1784314753,
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": {
        "content": "{\n  \"city\": \"San Francisco\",\n  \"country\": \"United States\"\n}",
        "role": "assistant"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "completion_tokens": 314,
    "prompt_tokens": 28,
    "total_tokens": 342
  }
}
```

Parse `message.content` as JSON to get the structured object:

```json theme={null}
{
  "city": "San Francisco",
  "country": "United States"
}
```

To request a valid JSON object without enforcing a schema, set `response_format` to `{"type": "json_object"}` instead.

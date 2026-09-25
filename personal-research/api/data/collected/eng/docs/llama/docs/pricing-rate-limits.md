# Pricing and rate limits

## Pricing {#pricing}

You pay only for what you use. Meta Model API bills per token with no minimums or upfront commitment, priced per 1M tokens in USD.

| Usage | Price per 1M tokens |
| :---- | :---- |
| Input | $1.25 |
| Cached input | $0.15 |
| Output | $4.25 |

Cached input costs less. When part of your prompt matches a [cached prefix](/docs/prompt-caching), you pay the cached-input rate for those tokens. Check `cached_tokens` in the response to see how many were served from cache.

**Web search grounding** costs **$2.50 per 1,000 search queries**, in addition to tokens for the request. See [Search grounding](/docs/search-grounding).

There is **no long-context premium**: you pay the same rate whether your context window is mostly empty or almost full.

## Rate limits {#rate-limits}

Rate limits control per-minute usage for your team. Two tiers apply:

| Tier | Requests per minute (RPM) | Tokens per minute (TPM) |
| :---- | :---- | :---- |
| Free | 60 | 2,000,000 |
| Paid | 3,000 | 4,000,000 |

Limits apply **per team, not per API key**. If you use multiple keys in one team, all requests and tokens count toward one shared quota.

Token usage counts only **your** input and output tokens. Meta injects a small amount of steering context into every prompt (a system prompt and related scaffolding); those injected tokens are not billed and are excluded from the token counts reported in your `usage` and by the [token-counting endpoints](/docs/token-counting#injected-tokens).

## Retry on 429 responses {#rate-limit-behavior}

If you exceed RPM or TPM, the API returns `HTTP 429 Too Many Requests`. Requests succeed again once usage drops below the limit.

**Retry strategy:** Use exponential backoff with jitter. Start with a short delay such as 500 ms, double it after each consecutive `429`, and add random jitter to avoid thundering-herd effects across concurrent clients.

## Read rate-limit headers {#rate-limit-headers}

Every successful response includes headers that report your current limit and remaining quota:

| Header | Description |
| :---- | :---- |
| `x-ratelimit-limit-tokens` | Total token budget for the current window. |
| `x-ratelimit-remaining-tokens` | Tokens remaining before you hit the limit. |
| `x-ratelimit-limit-requests` | Total request budget for the current window. |
| `x-ratelimit-remaining-requests` | Requests remaining before you hit the limit. |

Read these headers and slow down before you hit a `429` instead of reacting after one.

## Submit background responses within limits {#background-rate-limit}

Creating [background responses](/docs/protocols/responses#using-with-other-features) (`background: true`) counts against a separate per-team submission limit in addition to the RPM and TPM limits above. The default is **600 background submissions per minute, per team**.

If you exceed that cap, new background submissions return `HTTP 429 Too Many Requests` with a `Retry-After` header. Responses already running continue unaffected. Apply the same exponential-backoff-with-jitter strategy described above.

The cap applies only to starting new background responses. Standard RPM and TPM limits still apply to every request.

## Next steps

- [Authentication](/docs/authentication): create and manage API keys
- [Get started](/docs/quickstart#first-call): make your first API call
- [Chat completion](/docs/protocols/chat-completions): start generating text with the core conversational endpoint
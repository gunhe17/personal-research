# Inference metrics

> Reference for the Prometheus metrics the Poolside vLLM model server exposes, and how to scrape them.

The Poolside inference stack's vLLM model server exposes Prometheus metrics on its `/metrics` endpoint. These are the primary signals for inference health and performance. Use this page to find the signals you care about and to point your own monitoring stack at the right endpoint.

This page is for operators running a self-hosted deployment. The metrics live in the `poolside-models` namespace.

<Note>
  The deployment does not bundle a metrics stack. No Prometheus, Grafana, or OpenTelemetry collector runs by default, and no `ServiceMonitor` or `PodMonitor` CRDs are installed. The endpoints below are exposed, but nothing scrapes them until you wire up your own monitoring. See [Collect the metrics](#collect-the-metrics).
</Note>

## Model server metrics

The vLLM model server exposes native vLLM metrics on `:8080/metrics`, under the `vllm:*`, `http_*`, and `python_*` prefixes. There is one Kubernetes Deployment per model, with pods named `inference-\<uuid\>`. The examples below resolve the target pod by Helm label at runtime, so they keep working as pods are renamed on redeploy. Core vLLM metrics are present on an idle pod, with counters and histograms starting at `0`.

### What to watch

| To find out                                 | Watch                                                                 | Healthy                                                                         |
| ------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Is the server overloaded?                   | `vllm:num_requests_waiting`, `vllm:kv_cache_usage_perc`               | Queue near 0, usage below \~0.9                                                 |
| Are responses slow to start?                | `vllm:time_to_first_token_seconds`                                    | Stays low and steady; a rising trend means slower first tokens                  |
| Is streaming smooth after streaming starts? | `vllm:inter_token_latency_seconds`                                    | Stays low and steady; a rising trend means choppier streaming                   |
| Are requests rejected or preempted?         | `vllm:num_dropped`, `vllm:num_preemptions`                            | 0                                                                               |
| Is the prefix cache helping?                | `vllm:prefix_cache_hits_total` over `vllm:prefix_cache_queries_total` | Higher is better; no fixed target, but watch for drops                          |
| Is throughput holding up?                   | `vllm:generation_tokens_total` (rate), `vllm:num_requests_running`    | Token rate steady under load; a drop while requests are running signals a stall |

### Latency and throughput

The user-facing performance signals. They are histograms, so alert on high percentiles rather than averages.

| Metric                                       | Type      | Description                                                                              |
| -------------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `vllm:time_to_first_token_seconds`           | histogram | Time to first token (TTFT), the clearest measure of perceived responsiveness             |
| `vllm:inter_token_latency_seconds`           | histogram | Gap between successive output tokens (ITL); sets streaming speed after a response starts |
| `vllm:e2e_request_latency_seconds`           | histogram | End-to-end request latency, from queue to final token                                    |
| `vllm:request_time_per_output_token_seconds` | histogram | Decode cost normalized per output token                                                  |
| `vllm:request_queue_time_seconds`            | histogram | Time spent waiting in the queue                                                          |
| `vllm:request_prefill_time_seconds`          | histogram | Time spent in the prefill phase                                                          |
| `vllm:request_decode_time_seconds`           | histogram | Time spent in the decode phase                                                           |
| `vllm:request_inference_time_seconds`        | histogram | Time spent in the running (inference) phase                                              |

### Load and queue

How saturated the engine is. The first place to look when latency climbs or when deciding whether to scale.

| Metric                        | Type      | Description                                                                    |
| ----------------------------- | --------- | ------------------------------------------------------------------------------ |
| `vllm:num_requests_waiting`   | gauge     | Requests queued for admission; the strongest signal you need more capacity     |
| `vllm:num_requests_running`   | gauge     | Requests in the active execution batch; near batch capacity means fully loaded |
| `vllm:num_preemptions`        | gauge     | Requests preempted by the engine, usually under KV-cache pressure              |
| `vllm:num_dropped`            | gauge     | Requests dropped because the queue exceeded its maximum size                   |
| `vllm:iteration_tokens_total` | histogram | Tokens processed per engine step, a measure of batching efficiency             |

### KV cache and prefix caching

KV-cache pressure and prefix-cache hit rate largely determine throughput and latency under load.

| Metric                                     | Type      | Description                                                                     |
| ------------------------------------------ | --------- | ------------------------------------------------------------------------------- |
| `vllm:kv_cache_usage_perc`                 | gauge     | Fraction of the KV cache in use, where 1.0 is 100%; a key saturation signal     |
| `vllm:prefix_cache_queries_total`          | counter   | Prefix-cache lookups, in tokens                                                 |
| `vllm:prefix_cache_hits_total`             | counter   | Prefix-cache hits, in tokens; hits over queries is the local hit rate           |
| `vllm:external_prefix_cache_queries_total` | counter   | Cross-instance prefix-cache lookups, in tokens                                  |
| `vllm:external_prefix_cache_hits_total`    | counter   | Cross-instance prefix-cache hits, in tokens                                     |
| `vllm:prompt_tokens_cached_total`          | counter   | Prompt tokens served from cache, local plus external                            |
| `vllm:prompt_tokens_recomputed_total`      | counter   | Cached tokens that had to be recomputed; rising values indicate cache thrashing |
| `vllm:request_prefill_kv_computed_tokens`  | histogram | New KV tokens computed during prefill, excluding cached tokens                  |

### Token counts

Use these for cost tracking, capacity planning, and understanding workload shape.

| Metric                                   | Type      | Description                                                         |
| ---------------------------------------- | --------- | ------------------------------------------------------------------- |
| `vllm:prompt_tokens_total`               | counter   | Cumulative prompt (prefill) tokens processed                        |
| `vllm:generation_tokens_total`           | counter   | Cumulative generated tokens; basis for tokens-per-second throughput |
| `vllm:prompt_tokens_by_source_total`     | counter   | Prompt tokens broken down by source                                 |
| `vllm:request_prompt_tokens`             | histogram | Per-request prompt token count                                      |
| `vllm:request_generation_tokens`         | histogram | Per-request generated token count                                   |
| `vllm:request_max_num_generation_tokens` | histogram | Per-request maximum requested generation tokens                     |
| `vllm:request_params_max_tokens`         | histogram | Distribution of the `max_tokens` request parameter                  |
| `vllm:request_params_n`                  | histogram | Distribution of the `n` request parameter                           |

### Speculative decoding

Present only when speculative decoding is enabled. Accepted over draft tokens is the acceptance rate; a low rate means speculation is wasting compute.

| Metric                                               | Type    | Description                             |
| ---------------------------------------------------- | ------- | --------------------------------------- |
| `vllm:spec_decode_num_drafts_total`                  | counter | Speculative-decoding drafts proposed    |
| `vllm:spec_decode_num_draft_tokens_total`            | counter | Draft tokens proposed                   |
| `vllm:spec_decode_num_accepted_tokens_total`         | counter | Accepted draft tokens                   |
| `vllm:spec_decode_num_accepted_tokens_per_pos_total` | counter | Accepted draft tokens by draft position |

### Model FLOPs utilization

Use these to estimate model FLOPs utilization (MFU) and tell whether a workload is compute-bound or memory-bound.

| Metric                                     | Type    | Description                                 |
| ------------------------------------------ | ------- | ------------------------------------------- |
| `vllm:estimated_flops_per_gpu_total`       | counter | Estimated floating-point operations per GPU |
| `vllm:estimated_read_bytes_per_gpu_total`  | counter | Estimated bytes read from memory per GPU    |
| `vllm:estimated_write_bytes_per_gpu_total` | counter | Estimated bytes written to memory per GPU   |

### Runtime and miscellaneous

| Metric                                                    | Type               | Description                                          |
| --------------------------------------------------------- | ------------------ | ---------------------------------------------------- |
| `vllm:request_success_total`                              | counter            | Successfully completed requests                      |
| `vllm:cache_config_info`                                  | gauge              | Static cache configuration                           |
| `vllm:engine_sleep_state`                                 | gauge              | Whether the engine is awake or sleeping              |
| `vllm:mm_cache_queries_total`, `vllm:mm_cache_hits_total` | counter            | Multi-modal input cache, for multi-modal models only |
| `http_requests_total`, `http_request_duration_seconds`    | counter, histogram | FastAPI HTTP layer in front of the engine            |
| `python_*`, `process_*`                                   | various            | Python runtime and process metrics                   |

<Note>
  This list reflects the metrics exposed by the deployed model server. The metric surface can change between releases, so confirm the exact set against a live scrape of your deployment using the commands in [Scrape the endpoint](#scrape-the-endpoint).
</Note>

## Collect the metrics

The deployment does not ship a monitoring stack, so the metrics listed earlier are exposed but unscraped until you set up collection:

* No `prometheus.io/scrape` annotations are present, and no `ServiceMonitor` or `PodMonitor` CRDs are installed.
* The deployment does not bundle Prometheus, Grafana, VictoriaMetrics, Thanos, or an OpenTelemetry collector.

To collect these metrics, point your own Prometheus-compatible scraper at the endpoint listed earlier, or add `ServiceMonitor` or `PodMonitor` resources if you run the Prometheus Operator. For one-off checks, use the port-forward commands in the next section.

## Scrape the endpoint

Run these commands from a host with `kubectl` access to the deployment's cluster. Resolve the target pod by its Helm label, port-forward it, `curl` the local port, then stop the forward. Resolving by label keeps the command working as pods are renamed on redeploy.

In one terminal, resolve the vLLM model server pod by its Helm label and port-forward its metrics port. Leave this running:

```bash theme={null}
model_pod=$(kubectl -n poolside-models get pods -l app.kubernetes.io/component=inference -o jsonpath='{.items[0].metadata.name}')
kubectl -n poolside-models port-forward "pod/$model_pod" 18080:8080
```

In a second terminal, scrape the local port. For example, read the current load and cache values. On a server handling traffic, this returns something like:

```bash theme={null}
curl -s http://localhost:18080/metrics | grep -E '^vllm:(num_requests_(running|waiting)|kv_cache_usage_perc)'

# vllm:num_requests_running{engine="0",model_name="agent-small"} 8
# vllm:num_requests_waiting{engine="0",model_name="agent-small"} 2
# vllm:kv_cache_usage_perc{engine="0",model_name="agent-small"} 0.43
```

To list every metric name instead, scrape the same port with `grep '^# HELP' | sort`. When you are done, stop the port-forward with `Ctrl+C` in the first terminal.

The endpoint details are:

| Endpoint            | Namespace         | Label selector                          | Port | Path       |
| ------------------- | ----------------- | --------------------------------------- | ---- | ---------- |
| Model server (vLLM) | `poolside-models` | `app.kubernetes.io/component=inference` | 8080 | `/metrics` |

When more than one model is deployed, the `component=inference` selector matches every model's pods and `jsonpath` picks the first. To target a specific model, append its model label, for example `app.kubernetes.io/component=inference,app.kubernetes.io/model=<model>`.

<Note>
  Counters that have not been incremented yet report `0` rather than being absent, so an idle pod still exposes the full set of metrics described above. If a scrape returns nothing, check the port-forward terminal for connection errors.
</Note>

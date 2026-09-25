# System checks

> Use dive to validate infrastructure readiness before and after deploying the Poolside inference stack, and to check GPU node configuration.

Use `dive` to validate infrastructure readiness at each stage of deploying the Poolside inference stack. Run **pre-flight** checks before installation to catch configuration issues early, **post-flight** checks after installation to confirm correct operation, and **GPU node checks** to validate host-level configuration on every GPU node in the cluster.

## How it works

### `dive check` (pre- and post-flight)

<img src="https://mintcdn.com/poolside/xTs7jw-MY6PVyTLx/images/resources/mermaid-dive-checks.png?fit=max&auto=format&n=xTs7jw-MY6PVyTLx&q=85&s=757103a701c3ef49fa507b1b3a47932d" alt="Dive pre- and post-flight checks flowchart" width="7322" height="932" data-path="images/resources/mermaid-dive-checks.png" />

`dive check` reads **a single `values.yaml`**, which is the same file you pass to the `inference` Helm chart. It builds the external clients each check needs (Kubernetes API, S3, HTTP) lazily on first use, then runs the selected checks concurrently, up to 8 at a time by default. Results are streamed to `stdout` as each check finishes; the process exits non-zero if any check returns `fail` or `error`.

### `dive node-checks`

<img src="https://mintcdn.com/poolside/xTs7jw-MY6PVyTLx/images/resources/mermaid-dive-node-checks.png?fit=max&auto=format&n=xTs7jw-MY6PVyTLx&q=85&s=09b09419419f29172aa774388e8d838c" alt="Dive node checks flowchart" width="8192" height="858" data-path="images/resources/mermaid-dive-node-checks.png" />

`dive node-checks` is an **orchestrator** that runs from any machine with cluster access (your laptop, a CI runner, a bastion). It discovers GPU nodes and for each one deploys a short-lived **privileged pod** that mounts the host's `/sys` and `/proc` read-only. The pod runs the hidden `node-check-local` subcommand of the same dive binary, performs all 10 host-level checks, and prints a JSON report to its logs. The orchestrator collects those logs, parses the reports, and aggregates them into a single per-node summary.

The pod requires root and privileged mode because reading PCIe Relaxed Ordering capabilities from `/sys/bus/pci/devices/*/config` (raw PCI config space) requires root even inside a privileged container.

## Prerequisites

| Requirement                     | Notes                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `kubectl` + `KUBECONFIG`        | Must point at the target cluster with sufficient permissions                                                                         |
| NVIDIA GPU Operator >= 26.3.0   | Required for GPU Operator health check; nodes must have `nvidia.com/gpu.present=true` label or `nvidia.com/gpu` allocatable resource |
| `inference` chart `values.yaml` | Prepared with `image.tag`, `s3.bucket`, and `s3.region` at minimum                                                                   |
| dive image (for `node-checks`)  | Must be pushed to a registry the cluster nodes can pull from                                                                         |

## Locate the dive binary

When using a Poolside bundle, the dive binary is included as a tarball alongside the other bundle binaries in `./binaries`.

## Distribute the dive image

For `dive node-checks`, the cluster nodes must be able to pull the dive image. When using a Poolside bundle, the dive image is included as a tarball in `./containers` alongside the other bundle images:

```sh theme={null}
# Upload all bundle images (including dive) to your internal registry
./scripts/upload_images.sh <target-registry>

# Then reference it when running node checks
dive node-checks \
  --namespace dive-node-checks \
  --image <target-registry>/poolside/dive:v1
```

**Air-gapped clusters**: In an air-gapped environment, the cluster nodes reach the dive image through the mechanism your environment already relies on, such as an internal registry or an image cached on each node. Make the image available through that mechanism, then pass its reference to `--image`. Because the check pods set `imagePullPolicy: IfNotPresent`, a cached image is used without a registry pull even when the tag is `:latest`.

## Run pre-flight checks

Run these checks **before** installing the Helm chart to catch configuration and environment issues early.

```sh theme={null}
dive check \
  --values values.yaml \
  --namespace poolside-models \
  --pre
```

### Pre-flight check reference

| Check name                        | What it validates                                                                                                                                                       | Fail / Warn / Skip conditions                                                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `values_required`                 | `image.tag`, `s3.bucket`, and `s3.region` are all set in `values.yaml`                                                                                                  | **Fail** if any field is empty                                                                                                                                                                                        |
| `k8s_version`                     | The Kubernetes API server version is >= 1.29.0                                                                                                                          | **Fail** if the Kubernetes version is below the minimum required version                                                                                                                                              |
| `node_resources`                  | At least one schedulable node exists with allocatable CPU and memory resources. Reports the total schedulable node count, CPU, and memory                               | **Fail** if no schedulable nodes are found                                                                                                                                                                            |
| `inference_namespace_exists`      | The namespace where the inference stack is installed exists                                                                                                             | **Fail** if namespace is missing                                                                                                                                                                                      |
| `inference_checkpoint_objects`    | The configured S3 bucket contains at least one object. This confirms model checkpoints have been uploaded                                                               | **Fail** if bucket is unconfigured, unreachable, or empty                                                                                                                                                             |
| `inference_images_pullable`       | The configured inference container image exists in the registry. This probes the OCI manifest endpoint                                                                  | **Fail** on HTTP 404 or transport errors; **Warn** if the image or registry is not configured; **Warn** on 401/403 because auth may be satisfied at runtime by IAM Roles for Service Accounts (IRSA) or a pull secret |
| `public_docs_image_pullable`      | When offline documentation is enabled, the configured `public-docs` container image exists in the registry. This probes the OCI manifest endpoint                       | **Skip** if `docs.enabled=false`; **Fail** if the image is not configured, missing, or unreachable; **Warn** on 401/403 because auth may be satisfied at runtime by IRSA or a pull secret                             |
| `inference_gpu_capacity`          | At least one schedulable node has `nvidia.com/gpu` allocatable resources                                                                                                | **Fail** if no GPU nodes are found                                                                                                                                                                                    |
| `inference_nvidia_driver_version` | Every GPU node labeled `nvidia.com/gpu.present=true` is running NVIDIA driver >= 580.65.06. This is the minimum required by the `atlas` container                       | **Fail** if any node is below minimum; **Warn** if driver version labels are absent because GPU Feature Discovery may not have run yet                                                                                |
| `inference_gpu_operator_healthy`  | The NVIDIA GPU Operator is installed (searched in `gpu-operator`, `nvidia-gpu-operator`, then all namespaces) and GPU resources are available to the scheduler          | **Fail** if operator is absent or no `nvidia.com/gpu` resources are allocatable; **Warn** if GPUs are schedulable but operator was not found (unsupported configuration)                                              |
| `inference_multi_node_capable`    | On multi-node clusters (>= 2 GPU nodes), at least one node has a high-speed interconnect: `rdma/hca` allocatable resource or `nvidia.com/gpu.interconnect=NVLink` label | **Skip** for single-node clusters; **Warn** if multiple GPU nodes exist but no high-speed interconnect is detected. Multi-node parallelism then falls back to PCIe/ethernet                                           |
| `s3_endpoint_reachable`           | TCP connectivity to a custom S3 endpoint (`s3.apiUri`) can be established within 5 seconds                                                                              | **Skip** if `s3.apiUri` is not set because standard AWS S3 is used; **Fail** if the endpoint is unreachable                                                                                                           |
| `s3_credentials_secret`           | The Kubernetes Secret named in `s3.secretName` exists and contains `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`                                                      | **Skip** if `s3.secretName` is empty because IRSA or pod identity provides credentials; **Fail** if the secret is missing or incomplete                                                                               |
| `pull_secrets_exist`              | Every secret listed in `global.imagePullSecrets` exists in the required namespaces                                                                                      | **Skip** if no pull secrets are configured; **Fail** if any secret is missing                                                                                                                                         |
| `ingress_tls_valid`               | Every entry in `ingress.tls[]` has a non-empty `secretName`                                                                                                             | **Skip** if ingress is disabled or no TLS entries are configured; **Fail** if any TLS entry is missing `secretName`                                                                                                   |
| `route_tls_valid`                 | When OpenShift Route TLS is enabled with `edge` or `reencrypt` termination, both `certificate` and `key` are provided                                                   | **Skip** if route or route TLS is disabled; **Fail** if cert/key are missing for termination modes that require them                                                                                                  |

## Run post-flight checks

Run these checks **after** the Helm chart is installed to verify that the inference stack is operating correctly.

```sh theme={null}
dive check \
  --values values.yaml \
  --namespace poolside-models \
  --post
```

### Post-flight check reference

| Check name                         | What it validates                                                                                                                                                                                               | Fail / Warn / Skip conditions                                                                                                                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `inference_pods_healthy`           | All pods in the inference namespace are `Running`/`Ready` or `Completed`, with no `CrashLoopBackOff`, `ImagePullBackOff`, or `Error` states                                                                     | **Fail** if any pod is in a terminal failure state; **Warn** if pods are `Pending` or `NotReady`                                                                                                                                                 |
| `inference_model_pods_running`     | All model server `Deployments` (label `app.kubernetes.io/component=inference`) have at least one available replica, and no checkpoint download init containers are stuck                                        | **Fail** if no model Deployments are found or image pull errors are detected; **Warn** if deployments are not ready yet because checkpoint download can take several minutes                                                                     |
| `inference_vllm_auth_secret`       | The Kubernetes Secret named in `authentication.secretName` exists and contains the `VLLM_API_KEY` data key                                                                                                      | **Skip** if `authentication.secretName` is not configured because API key auth is disabled; **Fail** if secret or key is missing                                                                                                                 |
| `inference_metrics_scrape`         | Fetches `/metrics` from each configured ingress host and parses vLLM, SGLang, or TensorRT-LLM Prometheus metrics. Reports `requests_running`, `requests_waiting`, `kv_cache_usage`, and `prefix_cache_hit_rate` | **Skip** if ingress is disabled; **Fail** if no host returns valid metrics; **Warn** if only some hosts respond                                                                                                                                  |
| `inference_model_chat_completions` | For each model with a configured `ingressHost` or `routeHost`, calls `GET /v1/models` to discover model IDs, then sends a minimal one-token chat completion request to `POST /v1/chat/completions`              | **Skip** if no model ingress hosts are configured; **Fail** if any model endpoint is unreachable or returns an error; **Warn** if a host is reachable but no models are loaded yet                                                               |
| `dns_resolves`                     | All ingress hostnames (from `ingress.tls[].hosts`, `models[].ingressHost`, `models[].routeHost`) resolve via DNS                                                                                                | **Skip** if ingress or route is disabled; **Fail** if any hostname does not resolve                                                                                                                                                              |
| `endpoint_reachable`               | All ingress hosts respond to `GET /health`. This confirms the ingress controller and TLS termination are working                                                                                                | **Skip** if ingress or route is disabled; **Fail** if an endpoint is unreachable with a transport error; **Warn** if an endpoint returns an unexpected HTTP status code or a TLS error because cert-manager may still be issuing the certificate |

## Run GPU node checks

Run these checks to validate that every GPU node's host configuration is optimal for GPU workloads. This is independent of any Helm values file and can be run before or after installing the inference stack.

```sh theme={null}
dive node-checks \
  --namespace dive-node-checks \
  --image <target-registry>/poolside/dive:v1 \
  --create-namespace
```

### Node check reference

Checks are classified as **hard** (returns `fail`) or **soft** (returns `warn`):

| Check name                  | Hard/Soft | What it validates                                                                                     | Why it matters                                                                                                           | Fix                                                                                              |
| --------------------------- | --------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `iommu_passthrough`         | Hard      | Kernel cmdline contains `iommu=pt` or IOMMU is disabled                                               | Translation mode adds DMA overhead that destroys GPU-to-GPU and GPUDirect RDMA bandwidth                                 | Add `iommu=pt` to the kernel cmdline and reboot                                                  |
| `acs_disabled`              | Hard      | No PCI bridge has Access Control Services (ACS) enabled in a way that blocks GPU peer-to-peer traffic | ACS forces P2P traffic through the root complex, destroying NVLink and GPUDirect RDMA performance                        | Disable ACS on affected bridges or add `pci=noacs` to the kernel cmdline                         |
| `numa_gpu_affinity`         | Hard      | Every GPU (`nvidia.com/gpu` device) has a valid NUMA node assignment (NUMA node >= 0)                 | NUMA node `-1` means the kernel cannot determine locality, causing remote-memory-access penalties for GPU DMA buffers    | Check ACPI tables and PCIe topology; this often indicates a firmware or BIOS configuration issue |
| `numa_gpu_distribution`     | Hard      | GPUs are evenly distributed across NUMA nodes (counts differ by at most 1)                            | Uneven distribution suggests incorrect PCIe topology or broken ACPI tables, leading to asymmetric memory access costs    | Review BIOS/UEFI PCIe topology settings                                                          |
| `cpu_governor`              | Hard      | The CPU frequency scaling governor is `performance` on every CPU                                      | `powersave` or `ondemand` cause frequency-scaling jitter affecting data loading, NCCL host code, and CUDA launch latency | `cpupower frequency-set -g performance`                                                          |
| `cpu_cstates`               | Soft      | Deep C-states (C2+) are limited; `max_cstate <= 1` is recommended                                     | Deep C-states add wakeup latency; CPUs must respond quickly to CUDA completion events                                    | Add `intel_idle.max_cstate=1` or `processor.max_cstate=1` to the kernel cmdline                  |
| `transparent_hugepages`     | Hard      | Transparent Huge Pages (THP) is set to `madvise` or `never`, not `always`                             | `always` causes latency spikes from THP compaction during memory allocation, stalling `cudaMalloc` and data loading      | `echo madvise > /sys/kernel/mm/transparent_hugepage/enabled`                                     |
| `gpu_pcie_relaxed_ordering` | Soft      | PCIe Relaxed Ordering is enabled on GPU devices (only when EFA/RDMA devices are present)              | Without Relaxed Ordering, EFA/IB RDMA writes to GPU memory take a slower path, reducing cross-node bandwidth             | Configure via BIOS/UEFI PCIe settings or GPU firmware; see NVIDIA documentation                  |
| `kernel_numa_balancing`     | Hard      | `kernel.numa_balancing` sysctl is `0`                                                                 | NUMA balancing migrates pages between nodes, conflicting with GPU DMA mappings and causing performance jitter            | `sysctl -w kernel.numa_balancing=0`                                                              |
| `zone_reclaim_mode`         | Hard      | `vm.zone_reclaim_mode` sysctl is `0`                                                                  | Non-zero values cause aggressive page reclaim within NUMA zones, leading to memory pressure and GPU DMA buffer eviction  | `sysctl -w vm.zone_reclaim_mode=0`                                                               |

<Note>
  `acs_disabled` and `numa_gpu_*` checks are skipped automatically on nodes with no detected GPUs. `gpu_pcie_relaxed_ordering` is skipped when no EFA/RDMA devices are present.
</Note>

## Output formats

Both `dive check` and `dive node-checks` support `--output text` (default) and `--output json`.

### Text output

Color-coded, human-readable. Each check prints one line with a status symbol followed by the check name, then indented detail lines:

```text theme={null}
✓ [PASS] inference_gpu_operator_healthy
    NVIDIA GPU Operator healthy in "gpu-operator" with 4 node(s) having nvidia.com/gpu resources available
✗ [FAIL] inference_nvidia_driver_version
    NVIDIA driver version < 580.65.06 on GPU node(s): node-1 (driver 535.104.12)
    Fix: Upgrade the NVIDIA driver to >= 580.65.06 (GPU Operator handles this automatically when configured correctly)
! [WARN] inference_multi_node_capable
    4 GPU nodes found but no high-speed interconnect detected (rdma/hca resource or nvidia.com/gpu.interconnect=NVLink label)
    Detail: Multi-node tensor parallelism uses PCIe/ethernet, which may reduce throughput
− [SKIP] s3_credentials_secret
    S3 credentials secret not configured; assuming IRSA or pod identity provides credentials
```

### JSON output

Machine-readable, suitable for CI pipelines. Each result is an object with `name` and a nested `result` object. The `result` object contains `status`, `message`, optional `detail`, and optional `fix`:

```json theme={null}
[
  {
    "name": "inference_gpu_operator_healthy",
    "result": {
      "status": "pass",
      "message": "NVIDIA GPU Operator healthy in \"gpu-operator\" with 4 node(s) having nvidia.com/gpu resources available"
    }
  },
  {
    "name": "inference_nvidia_driver_version",
    "result": {
      "status": "fail",
      "message": "NVIDIA driver version < 580.65.06 on GPU node(s): node-1 (driver 535.104.12)",
      "fix": "Upgrade the NVIDIA driver to >= 580.65.06"
    }
  }
]
```

For `dive node-checks --output json`, the top-level object contains `nodes` (array of per-node results), `summary` (aggregate pass/warn/fail/skip/error counts), and `errors` (nodes that could not be checked).

## Exit codes

| Exit code | Meaning                                                           |
| --------- | ----------------------------------------------------------------- |
| `0`       | All checks passed, warned, or were skipped, with no hard failures |
| `1`       | One or more checks returned `fail` or `error`                     |

## CLI reference

### `dive check`

```sh theme={null}
dive check --values <values-file-path> --namespace <namespace> [--pre] [--post] [flags]
```

| Flag            | Default      | Description                                                                            |
| --------------- | ------------ | -------------------------------------------------------------------------------------- |
| `--values`      | *(required)* | Path to the `inference` chart `values.yaml`                                            |
| `--namespace`   | *(required)* | Target namespace for deployment checks. This is where the inference stack is installed |
| `--pre`         | `false`      | Run pre-install checks                                                                 |
| `--post`        | `false`      | Run post-install checks                                                                |
| `--output`      | `text`       | Output format: `text` or `json`                                                        |
| `--concurrency` | `8`          | Maximum number of checks to run in parallel                                            |

At least one of `--pre` or `--post` must be specified. Both can be combined in a single invocation.

### `dive node-checks`

```sh theme={null}
dive node-checks --namespace <namespace> --image <dive-image> [flags]
```

| Flag                 | Default      | Description                                                                         |
| -------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `--namespace`        | *(required)* | Namespace to run check pods in (must exist unless `--create-namespace` is set)      |
| `--image`            | *(required)* | Dive image the check pods run. It must be pullable by cluster nodes                 |
| `--create-namespace` | `false`      | Create `--namespace` if it does not exist (requires `namespaces` create permission) |
| `--timeout`          | `5m`         | Per-node timeout waiting for the check pod to complete                              |
| `--concurrency`      | `8`          | Maximum number of nodes to check in parallel                                        |
| `--output`           | `text`       | Output format: `text` or `json`                                                     |
| `--keep-pods`        | `false`      | Retain check pods after collecting results (useful for debugging)                   |
| `--sysfs-root`       | `/host/sys`  | In-pod mount path for the host `/sys`                                               |
| `--proc-root`        | `/host/proc` | In-pod mount path for the host `/proc`                                              |

### `dive version`

```sh theme={null}
dive version
```

Prints the build version string.

## Required RBAC for `dive node-checks`

The credentials of the user running `dive node-checks` must allow the following operations:

| Resource     | Verbs                                                       |
| ------------ | ----------------------------------------------------------- |
| `namespaces` | `get` (plus `create` only when `--create-namespace` is set) |
| `nodes`      | `list`                                                      |
| `pods`       | `create`, `get`, `delete`                                   |
| `pods/log`   | `get`                                                       |

Example `ClusterRole`:

```yaml theme={null}
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dive-node-checks
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["list"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "create"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["create", "get", "delete"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
```

## Related resources

* [Supported configurations](/deployment/supported-configurations)
* [Capacity planning](/deployment/capacity-planning)

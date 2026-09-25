# Install on OpenShift

> Deploy Poolside model inference on OpenShift and serve models through an OpenAI-compatible API.

Follow these steps to deploy Poolside model inference on your GPU-backed OpenShift cluster. For an overview of this deployment approach and architecture, see [OpenShift deployment overview](/deployment/cloud/openshift/overview).

## Prerequisites

Poolside distributes the Helm deployment bundle as a `.tar.gz` archive. Extract it before you start:

```bash theme={null}
tar -xzf <bundle-name>.tar.gz
cd <bundle-name>
```

Confirm that you are working from the root of the extracted bundle. The bundle root contains the following directories:

```text theme={null}
./scripts/
./containers/
./charts/
./binaries/
```

**Cluster requirements**

* OpenShift 4.16 or later
* GPU nodes with enough GPUs for the models you deploy
* NVIDIA GPU Operator 26.3.0, with NVIDIA driver 580.126.20 and NVIDIA Container Toolkit 1.19.0
* DNS records that resolve to the cluster router endpoint, or use a router-generated hostname
* An S3-compatible object storage service such as NooBaa (OpenShift Data Foundation), Amazon S3, or MinIO
* A container registry that your cluster can access

**Workstation tools**

Install the following tools on the host you use to run the deployment:

* `helm` `3.12` or later
* `oc` or `kubectl`
* `skopeo`
* `aws` CLI (to upload checkpoints to S3-compatible object storage)
* `jq` (to parse JSON responses from the inference API)
* `tar` (to extract the deployment bundle)
* `curl` (to call the inference API)
* `openssl` (optional, to generate a TLS certificate for the inference endpoint)

**Minimum resource requirements**

Ensure that your cluster has enough GPUs for the models you deploy. If you have questions about the required specs, contact Poolside support.

## Step 1: Create the namespace

The inference stack runs in a single namespace:

```bash theme={null}
oc create namespace poolside-models
```

## Step 2: Upload container images

Copy the bundled images into your registry. Log in to your target registry using `docker login` or `podman login` before running any upload commands.

Authenticate skopeo against your target registry:

```bash theme={null}
skopeo login <registry-host> --username <username> --password <password>
```

Upload the images with the provided script:

```bash theme={null}
chmod +x ./scripts/upload_images.sh
./scripts/upload_images.sh <registry-host>
```

If your registry requires authentication, create an image pull secret in `poolside-models`:

```bash theme={null}
oc create secret docker-registry poolside-registry-secret \
  --docker-server=<registry-host> \
  --docker-username=<registry-user> \
  --docker-password=<registry-password> \
  -n poolside-models
```

<Note>
  If you use the OpenShift internal registry, push the images into the
  `poolside-models` namespace. Pods in that namespace pull same-namespace
  imagestreams with the default service account, so no cross-namespace
  `system:image-puller` rolebinding is required.
</Note>

## Step 3: Upload model checkpoints

The inference stack downloads model weights from your S3 bucket on pod startup, so the checkpoints must be in place before you deploy the chart. Poolside provides the checkpoint files separately from the deployment bundle. Confirm the local path and the destination prefix with your Poolside contact.

Uploading checkpoints is time consuming. Start it now and continue with the remaining steps in parallel.

Poolside provides model checkpoints as `.tar` archives. The inference chart does not extract archives at pod startup. It syncs unpacked checkpoint files (`*.safetensors`, `*.json`, and the tokenizer files) from the S3 prefix you set in `models.<key>.model`, so extract each archive's contents into its own directory before uploading.

```bash theme={null}
tar -xf ./checkpoints/<checkpoint-archive>.tar
rm -v ./checkpoints/<checkpoint-archive>.tar
```

Confirm the files sit at the root of the directory, not under a subfolder:

```bash theme={null}
ls ./checkpoints/<model-key>
# config.yaml  generation_config.json  model.safetensors  tokenizer/
```

Create the bucket if it does not already exist. The example uses the NooBaa endpoint; for AWS S3, omit the `--endpoint-url` flag:

```bash theme={null}
aws s3 mb s3://<bucket-name> --endpoint-url https://<s3-endpoint> --region <aws-region>
```

Note the bucket name; you reference it in the `models.<key>.model` paths in [Step 5](#step-5-configure-the-inference-values-file).

Then upload the checkpoints to the bucket:

```bash theme={null}
aws s3 cp ./checkpoints s3://<bucket-name>/checkpoints --recursive --region <aws-region>
```

For a non-AWS S3 endpoint such as NooBaa or MinIO, add `--endpoint-url`:

```bash theme={null}
aws s3 cp ./checkpoints s3://<bucket-name>/checkpoints \
  --recursive \
  --endpoint-url https://<s3-endpoint> \
  --region <aws-region>
```

<Note>
  Checkpoints are typically tens of GiB per model. For faster throughput, or for
  backends sensitive to upload concurrency such as NooBaa, run the upload from a
  host inside the cluster and tune `aws configure set
      default.s3.max_concurrent_requests` and `default.s3.multipart_chunksize`.
</Note>

## Step 4: Create the S3 credentials secret

The model servers read checkpoints from S3 using credentials in a Kubernetes secret. Create it in `poolside-models`:

```bash theme={null}
oc create secret generic aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID=<access-key-id> \
  --from-literal=AWS_SECRET_ACCESS_KEY=<secret-access-key> \
  -n poolside-models
```

**API key authentication (optional)**

To require an API key on the vLLM inference servers, create a secret containing the key in `poolside-models`:

```bash theme={null}
oc create secret generic vllm-auth \
  --from-literal=VLLM_API_KEY=<vllm-api-key> \
  -n poolside-models
```

Creating the secret does not enable API key authentication by itself. In [Step 5](#step-5-configure-the-inference-values-file), set `authentication.secretName` to `vllm-auth`.

## Step 5: Configure the inference values file

Create an `inference_values.yaml` file in the bundle root:

```bash theme={null}
cp ./charts/inference/values.yaml ./inference_values.yaml
```

Set the fields that apply to your environment. The example below deploys two models and exposes each model through its own OpenShift Route:

```yaml title="Example: inference_values.yaml" theme={null}
image:
  # -- Registry you uploaded the atlas image to (required)
  registry: "<registry-host>"
  # -- Image name and tag come pre-set in the bundle to match the shipped image
  name: "atlas"
  tag: "<atlas-tag>"
# -- Name of the image pull secret for private registries (omit if your registry is public)
imagePullSecret: "poolside-registry-secret"
podSecurityContext:
  # -- Require non-root user. Do not set runAsUser on OpenShift; the SCC injects a UID from the namespace range.
  runAsNonRoot: true
  seccompProfile:
    # -- Seccomp profile type
    type: RuntimeDefault
s3:
  # -- Name of secret containing AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
  secretName: "aws-credentials"
  # -- Custom CA certificate bundle for S3 (required for NooBaa with the OpenShift service CA)
  caBundle: ""
authentication:
  # -- Name of secret containing VLLM_API_KEY for vLLM server authentication (set to "vllm-auth" if you created the optional secret in Step 4; leave empty to disable)
  secretName: ""
route:
  # -- Create a Route for every model
  enabled: true
  tls:
    # -- Terminate TLS at the OpenShift router
    enabled: true
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
models:
  laguna-xs:
    model: s3://<bucket-name>/checkpoints/laguna-xs
    modelName: Lagunaxs
    modelType: agent
    gpus: 1
    # -- Route host for this model (leave empty for a router-generated hostname)
    routeHost: ""
  laguna-m:
    model: s3://<bucket-name>/checkpoints/laguna-m
    modelName: Lagunam
    modelType: agent
    gpus: 4
    # -- Route host for this model (leave empty for a router-generated hostname)
    routeHost: ""
```

The checkpoint paths in `models.<key>.model` and the image registry must exactly match the locations you uploaded from the deployment bundle. The image `name` and `tag` come pre-set to match the shipped `atlas` image.

Set each model's `gpus` to a value that provides enough GPU memory for the model and workload on your GPU type. For planning estimates, see [Supported configurations](/deployment/supported-configurations).

<Note>
  Each model is exposed through a separate `Route` named `inference-<model-key>`. Leave `routeHost` empty to let the OpenShift router generate a hostname per model, or set an explicit host. The Route sends the host's root path directly to that model's vLLM service, so clients reach the OpenAI-compatible API at `https://<route-host>/v1`.
</Note>

**NooBaa and non-AWS S3 endpoints**

If your object storage is NooBaa or another non-AWS S3 service, point the model servers at the endpoint and region:

```yaml theme={null}
extraEnv:
  AWS_REGION: "<aws-region>"
  AWS_ENDPOINT_URL_S3: "https://s3.openshift-storage.svc:443"
```

For NooBaa with the OpenShift service CA, the model servers also need the service CA to trust the S3 endpoint. The inference chart takes it as inline text in `s3.caBundle`, supplied at deployment time in [Step 6](#step-6-install-the-inference-chart).

NooBaa and other S3 backends with limited concurrency need throttled downloads. Without throttling, the init container can fail after downloading 1-2 GiB and restart in an infinite loop because the `emptyDir` volume is wiped on each restart:

```yaml theme={null}
awsCliConfig:
  default.s3.max_concurrent_requests: "2"
  default.s3.max_queue_size: "1000"
  default.s3.multipart_chunksize: "64MB"
```

## Step 6: Install the inference chart

Install the `inference` chart into `poolside-models`. If your S3 backend uses a publicly trusted certificate, install the chart directly:

```bash theme={null}
helm install inference ./charts/inference \
  --namespace poolside-models \
  -f ./inference_values.yaml
```

If you use NooBaa, the model servers must trust its self-signed S3 serving certificate. NooBaa's certificate is signed by the OpenShift service CA and rotates automatically, so extract it fresh from the `noobaa-s3-serving-cert` secret rather than committing it to your values file:

```bash theme={null}
oc get secret noobaa-s3-serving-cert -n openshift-storage \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > service-ca.crt
```

Then install with the certificate passed inline through `--set-file`:

```bash theme={null}
helm install inference ./charts/inference \
  --namespace poolside-models \
  -f ./inference_values.yaml \
  --set-file s3.caBundle=./service-ca.crt
```

## Step 7: Verify the deployment

Check that the model pods are running. The only pods in the namespace are the per-model servers:

```bash theme={null}
oc get pods -n poolside-models
```

Each model server takes time to become ready on first start because it downloads its checkpoint from S3. Watch a model's logs to track progress. The `<model-key>` is the key you set under `models` in the values file, such as `laguna-m` or `laguna-xs` in the [Step 5](#step-5-configure-the-inference-values-file) example:

```bash theme={null}
oc logs -f -n poolside-models deploy/inference-<model-key>
```

Confirm a Route was created for each model and note its host:

```bash theme={null}
oc get route -n poolside-models
```

List the served models on a model's endpoint to confirm routing works, where `<route-host>` is the host of that model's Route:

```bash theme={null}
curl -s https://<route-host>/v1/models
```

## Step 8: Call the inference API

Each model serves the OpenAI-compatible API directly at its own Route host. The base URL has the form:

```text theme={null}
https://<route-host>/v1
```

Append the OpenAI-compatible route to the base URL, such as `/chat/completions` or `/completions`.

The commands below use three placeholders. Fill the model values from the `inference_values.yaml` you wrote in [Step 5](#step-5-configure-the-inference-values-file); OpenShift assigns each model's Route host unless you set `routeHost`:

| Placeholder           | Source                                                                                       | Example                                                       |
| --------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `<route-host>`        | assigned by OpenShift per model (or `models.<model-key>.routeHost` if you set a custom host) | `inference-laguna-m-poolside-models.apps.cluster.example.com` |
| `<model-key>`         | a key under `models`                                                                         | `laguna-m`                                                    |
| `<served-model-name>` | `models.<model-key>.modelName`                                                               | `Laguna`                                                      |

Retrieve each value from the running cluster.

Retrieve the `<model-key>` values. Each model deployment is named `inference-<model-key>`:

```bash theme={null}
oc get deploy -n poolside-models -l app.kubernetes.io/component=inference
```

Retrieve `<route-host>` from the model's Route:

```bash theme={null}
oc get route inference-<model-key> -n poolside-models -o jsonpath='{.spec.host}'
```

Retrieve `<served-model-name>` from the `id` field of that model's models endpoint:

```bash theme={null}
curl -s https://<route-host>/v1/models | jq -r '.data[].id'
```

Send a chat completion request:

```bash theme={null}
curl https://<route-host>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "<served-model-name>",
    "messages": [{"role": "user", "content": "Write a function that reverses a string."}]
  }'
```

For example, to call the `laguna-m` model served as `Laguna`:

```bash theme={null}
curl https://inference-laguna-m-poolside-models.apps.cluster.example.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Laguna",
    "messages": [{"role": "user", "content": "Write a function that reverses a string."}]
  }'
```

If you set `authentication.secretName` in Step 5, include the key as a bearer token:

```bash theme={null}
curl https://<route-host>/v1/chat/completions \
  -H "Authorization: Bearer <vllm-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "<served-model-name>",
    "messages": [{"role": "user", "content": "Write a function that reverses a string."}]
  }'
```

## TLS

The Route example in [Step 5](#step-5-configure-the-inference-values-file) uses `edge` termination, where the OpenShift router terminates TLS with its default certificate. To serve a custom certificate, provide it inline under `route.tls`. This block applies to every model's Route, so the certificate must be valid for all model Route hosts (for example, a wildcard certificate):

```yaml theme={null}
route:
  enabled: true
  tls:
    enabled: true
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
    certificate: ""
    key: ""
    caCertificate: ""
```

## Offline documentation (optional)

The bundle also ships the Poolside documentation site, which the same `inference` chart can deploy in-cluster so operators have local access to the docs. It is off by default. To enable and expose it through a Route, see [Set up offline documentation](/deployment/cloud/set-up-offline-documentation).

## Troubleshooting

* If pods stay in `Init` or restart in a loop, check the init container logs with `oc logs -n poolside-models <pod-name> -c <init-container>`. A stale or misspelled checkpoint path syncs nothing and the pod never starts.
* If model pods never become ready and the init container logs show no checkpoint files synced, the S3 prefix may hold the checkpoint `.tar` instead of its extracted contents. The downloader only fetches unpacked files such as `*.safetensors` and `*.json`. Extract the archive and re-upload its contents, as in [Step 3](#step-3-upload-model-checkpoints).
* If checkpoint downloads fail against NooBaa, confirm the S3 CA bundle is mounted and review the `awsCliConfig` throttle settings in Step 5.
* If model servers fail to pull images, run `oc describe pod <pod-name> -n poolside-models` and verify the image pull secret or internal-registry pull access.
* If a model pod is `Pending`, confirm the cluster has enough GPUs for the `gpus` value you requested and that the NVIDIA GPU Operator is healthy.

## Related resources

* [OpenShift deployment overview](/deployment/cloud/openshift/overview)
* [Set up offline documentation](/deployment/cloud/set-up-offline-documentation)
* [Upgrade on OpenShift](/deployment/cloud/openshift/upgrade)
* [Remove from OpenShift](/deployment/cloud/openshift/remove)

For questions about hardware requirements, infrastructure configuration, or deployment issues, contact Poolside support.

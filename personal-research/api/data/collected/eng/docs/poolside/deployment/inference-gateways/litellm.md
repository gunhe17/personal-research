# Use LiteLLM with Poolside model inference

> Deploy LiteLLM as an OpenAI-compatible gateway in front of Poolside model inference.

Use LiteLLM as an OpenAI-compatible gateway in front of Poolside model inference when you need centralized routing, virtual API keys, budgets, spend tracking, cross-provider fallbacks, or a shared endpoint for internal teams.

LiteLLM receives OpenAI-compatible requests from clients, reads the `model` field in each request, and routes the request to the matching upstream model endpoint. In this setup, each upstream endpoint is a Poolside model server running in your Kubernetes cluster.

<Note>
  LiteLLM is third-party software. You are responsible for LiteLLM configuration, access controls, persistence, upgrades, and security hardening. For production deployment guidance, see the [LiteLLM production deployment documentation](https://docs.litellm.ai/docs/proxy/deploy).
</Note>

## How it works

This setup includes:

* One or more Poolside model inference services running in Kubernetes.
* A LiteLLM proxy deployment running in the same cluster.
* A LiteLLM ingress that exposes a shared OpenAI-compatible endpoint.
* A LiteLLM database that stores state for virtual keys, budgets, spend logs, and models added through the LiteLLM admin UI.

Clients send requests to LiteLLM instead of calling each Poolside model endpoint directly. LiteLLM routes each request to the Poolside model service that matches the public model name configured in LiteLLM.

## Watch the deployment walkthrough

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/fxDJdizZWMY" title="Deploy LiteLLM with Poolside model inference" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

## Prerequisites

* You have deployed Poolside model inference in a Kubernetes cluster. See [Cloud deployment overview](/deployment/cloud/overview).
* You have a valid `kubeconfig` for the cluster.
* You have `helm`, `kubectl`, `curl`, `jq`, and `openssl` installed on the machine where you run the deployment.
* You have a DNS hostname for the LiteLLM endpoint.
* You have an ingress controller that can route traffic to LiteLLM.
* You know the namespace where Poolside model inference is running. The examples on this page use `<inference-namespace>`.

## Step 1: Confirm Poolside model inference is running

Check the model pods and services:

```bash theme={null}
kubectl get pods,svc -n <inference-namespace>
```

Confirm each model pod is ready before you deploy LiteLLM. In the standard Poolside inference chart, each model deployment and service is named `inference-<model-key>`, where `<model-key>` is the suffix shown in the `kubectl get pods,svc` output, such as `lagunas` in `inference-lagunas`.

Retrieve the served model name from the model deployment:

```bash theme={null}
kubectl describe deploy/inference-<model-key> \
  -n <inference-namespace> | grep served-model-name -A1
```

If the model has an ingress, you can query the model endpoint instead:

```bash theme={null}
curl -s http://<model-hostname>/v1/models | jq -r '.data[].id'
```

To find the model hostname, read it from the model ingress:

```bash theme={null}
kubectl get ingress inference-<model-key> \
  -n <inference-namespace> \
  -o jsonpath='{.spec.rules[0].host}'
```

## Step 2: Create the LiteLLM namespace

Create a namespace for LiteLLM:

```bash theme={null}
kubectl create namespace litellm
```

## Step 3: Create LiteLLM secrets

Create a master key for authenticating to LiteLLM:

```bash theme={null}
kubectl create secret generic litellm-masterkey \
  --from-literal=masterkey="sk-$(openssl rand -hex 24)" \
  -n litellm
```

Create the LiteLLM environment secret:

```bash theme={null}
kubectl create secret generic litellm-env \
  --from-literal=LITELLM_SALT_KEY="sk-$(openssl rand -hex 24)" \
  -n litellm
```

<Warning>
  Store `LITELLM_SALT_KEY` securely and do not change it after you add models. LiteLLM uses this key to encrypt provider credentials stored in the database.
</Warning>

If you configured API key authentication for Poolside inference, keep the `VLLM_API_KEY` available for [Step 6](#step-6-add-a-poolside-model-in-litellm). If the model server does not require authentication, LiteLLM still requires a non-empty value for the upstream OpenAI API key field.

## Step 4: Configure LiteLLM Helm values

Create a `values.yaml` file for the LiteLLM Helm chart. This complete example uses the secrets you created in [Step 3](#step-3-create-litellm-secrets):

```yaml title="Example: values.yaml" theme={null}
# Existing Secret that holds the LiteLLM master key.
masterkeySecretName: litellm-masterkey
masterkeySecretKey: masterkey

# Existing Secret that holds LITELLM_SALT_KEY.
environmentSecrets:
  - litellm-env

proxy_config:
  # Leave empty to add and manage models in the LiteLLM admin UI.
  model_list: []
  general_settings:
    master_key: os.environ/PROXY_MASTER_KEY
    # Required to add models from the LiteLLM admin UI.
    store_model_in_db: true

# Bundled PostgreSQL database for keys, budgets, spend logs, and UI-managed models.
postgresql:
  architecture: standalone
  image:
    # The original docker.io/bitnami/postgresql tags were removed.
    # Use the bitnamilegacy namespace, which still hosts this pinned tag.
    registry: docker.io
    repository: bitnamilegacy/postgresql
    tag: 16.2.0-debian-12-r6
  auth:
    username: litellm
    database: litellm
    password: "<postgres-password>"
    postgres-password: "<postgres-password>"

# Redis is not required for a single-replica gateway.
redis:
  enabled: false

# Expose the LiteLLM API and admin UI through an Ingress.
ingress:
  enabled: true
  className: "<ingress-class-name>"
  # NGINX ingress annotations. Adjust these for your ingress controller.
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
  hosts:
    - host: "<litellm-hostname>"
      paths:
        - path: /
          pathType: ImplementationSpecific
```

Replace:

* `<postgres-password>` with a strong database password.
* `<ingress-class-name>` with the ingress class for your cluster, such as `nginx`.
* `<litellm-hostname>` with the DNS hostname that routes to LiteLLM.

This configuration leaves `model_list` empty and sets `store_model_in_db: true` so you can add Poolside models from the LiteLLM admin UI.

<Note>
  This example uses the bundled PostgreSQL chart for a simple single-cluster deployment. For high availability or production hardening, review LiteLLM's guidance for external PostgreSQL, Redis, multiple replicas, image pinning, and secret management.
</Note>

## Step 5: Install LiteLLM

Install the LiteLLM Helm chart:

```bash theme={null}
helm upgrade --install litellm oci://ghcr.io/berriai/litellm-helm \
  --namespace litellm \
  -f values.yaml
```

The install creates the LiteLLM proxy, a PostgreSQL pod, and a database migration job. Confirm the pods are ready:

```bash theme={null}
kubectl get pods -n litellm
```

Retrieve the LiteLLM master key:

```bash theme={null}
kubectl get secret litellm-masterkey \
  -n litellm \
  -o go-template='{{index .data "masterkey"}}' | base64 -d
```

You use this key to sign in to the LiteLLM admin UI and to authenticate test requests to the LiteLLM proxy.

## Step 6: Add a Poolside model in LiteLLM

You can add Poolside models through the LiteLLM admin UI or define them in `values.yaml`.

Each model uses three names:

* `<model-key>`: The key that names the inference Deployment and Service, as `inference-<model-key>`. Used to build the API base.
* `<served-model-name>`: The name the Poolside model server serves, from [Step 1](#step-1-confirm-poolside-model-inference-is-running). Goes after the `openai/` prefix.
* `<public-model-name>`: A name of your choice that clients send in the request `model` field.

### Add a model from the admin UI

1. Gather two values from your Poolside inference deployment:

   * The served model name from [Step 1](#step-1-confirm-poolside-model-inference-is-running), which must match the value used to deploy Poolside.
   * The inference service name, `inference-<model-key>`, used to build the in-cluster API base:

     ```bash theme={null}
     kubectl get svc -n <inference-namespace>
     ```

     The service name includes the model key:

     ```text title="Example output" theme={null}
     NAME                    TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
     inference-lagunas       ClusterIP   172.30.19.135   <none>        80/TCP    167m
     inference-public-docs   ClusterIP   172.30.6.110    <none>        80/TCP    167m
     ```

2. Open the LiteLLM admin UI:

   ```text theme={null}
   http://<litellm-hostname>/ui/
   ```

3. Sign in with:

   * **Username**: `admin`
   * **Password**: The LiteLLM master key from [Step 5](#step-5-install-litellm)

4. In the navigation menu, select **Models + Endpoints**.

5. Select the **Add Model** tab and then select or enter the following values:

   | LiteLLM field                          | Value                                                                                                                                 |
   | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
   | **Provider**                           | `OpenAI`                                                                                                                              |
   | **LiteLLM Model Name(s)**              | Select **Custom Model Name (Enter below)**, then enter `openai/<served-model-name>`.                                                  |
   | **Model Mappings > Public Model Name** | A name of your choice that clients use in requests, such as `LagunaS-demo`.                                                           |
   | **API Base**                           | `http://inference-<model-key>.<inference-namespace>.svc.cluster.local/v1`                                                             |
   | **OpenAI API Key**                     | The `VLLM_API_KEY` configured for Poolside inference. If the model server does not require authentication, enter any non-empty value. |

6. Click **Test Connect**. A successful test confirms that LiteLLM can reach the Poolside model service from inside the cluster.

7. Click **Add Model**. The public model name appears on the **All Models** tab.

### Add a model in Helm values

1. Define the model in `values.yaml` under `proxy_config.model_list`:

   ```yaml title="values.yaml" theme={null}
   proxy_config:
     model_list:
       - model_name: "<public-model-name>"
         litellm_params:
           model: "openai/<served-model-name>"
           api_base: "http://inference-<model-key>.<inference-namespace>.svc.cluster.local/v1"
           api_key: "<vllm-api-key>" # The VLLM_API_KEY value, or any non-empty string
   ```

2. Upgrade the chart:

   ```bash theme={null}
   helm upgrade litellm oci://ghcr.io/berriai/litellm-helm \
     --namespace litellm \
     -f values.yaml
   ```

## Step 7: Test the LiteLLM endpoint

List the models that LiteLLM exposes:

```bash theme={null}
curl -s "http://<litellm-hostname>/v1/models" \
  -H "Authorization: Bearer <litellm-master-key>"
```

The response includes the public model name you configured in LiteLLM:

```json theme={null}
{
  "data": [
    {
      "id": "<public-model-name>",
      "object": "model"
    }
  ],
  "object": "list"
}
```

Send a chat completion request through LiteLLM:

```bash theme={null}
curl -s "http://<litellm-hostname>/v1/chat/completions" \
  -H "Authorization: Bearer <litellm-master-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "<public-model-name>",
    "messages": [
      {
        "role": "user",
        "content": "What is the capital of France? Answer in one short sentence."
      }
    ],
    "max_tokens": 512,
    "temperature": 0
  }'
```

The setup is working when LiteLLM returns a chat completion response from the Poolside model.

## Next steps

### Use LiteLLM with Poolside Agent CLI

Follow [Install Poolside Agent CLI](/cli/install#install-and-authenticate) and choose **Connect an OpenAI-compatible provider**. Enter:

* **API base URL**: `http://<litellm-hostname>/v1`
* **API key**: The LiteLLM master key from [Step 5](#step-5-install-litellm). For shared or production use, create a scoped virtual key instead.

LiteLLM lists the public model names you configured at `/v1/models`. Start `pool`, then press `Ctrl+M` or use `/model` to choose a model. See [Change the agent](/cli/interactive-mode#change-the-agent).

### Use the LiteLLM endpoint from other clients

Point any OpenAI-compatible client, such as the OpenAI SDK, at LiteLLM. Enter:

* **API base URL**: `http://<litellm-hostname>/v1`
* **API key**: The LiteLLM master key from [Step 5](#step-5-install-litellm). For shared or production use, create a scoped virtual key instead.

Set the request's `model` value to a public model name configured in LiteLLM.

## Operational considerations

* **Authentication**: The master key is a full-access administrator credential. For shared or production use, create scoped [LiteLLM virtual keys](https://docs.litellm.ai/docs/proxy/virtual_keys) for users, teams, and applications instead of distributing the master key.
* **Persistence**: LiteLLM stores keys, budgets, spend logs, and UI-managed models in PostgreSQL. Back up the database according to your organization's recovery requirements.
* **High availability**: A multi-replica LiteLLM deployment requires production-grade PostgreSQL and Redis configuration. Review LiteLLM's production deployment guidance before scaling the gateway.
* **Network access**: LiteLLM must be able to reach the Poolside model service URLs from inside the cluster.
* **TLS**: Expose LiteLLM over HTTPS before sharing the endpoint outside a trusted internal network.
* **Model names**: The LiteLLM public model name is the name clients use. The upstream model name must match the served model name returned by the Poolside model endpoint.

## Related resources

* [Cloud deployment overview](/deployment/cloud/overview)
* [Install on Kubernetes](/deployment/cloud/upstream-kubernetes/install)
* [Poolside API](/api/overview)
* [LiteLLM production deployment documentation](https://docs.litellm.ai/docs/proxy/deploy)
* [LiteLLM OpenAI-compatible endpoint documentation](https://docs.litellm.ai/docs/providers/openai_compatible)

# Manage models on Kubernetes

> Add, update, or remove inference models in an existing inference deployment on upstream Kubernetes.

## Overview

Use this guide to change the set of models served by a running `inference` release: adding a new model, replacing a model's checkpoint, or removing a model. You edit your `inference_values.yaml` file and run `helm upgrade`; the chart reconciles the model Deployments, Services, and Ingress objects to match.

You can make these changes on their own against the current chart version, or apply them as part of a chart upgrade to a new Poolside bundle. To upgrade the chart, see [Upgrade on Kubernetes](/deployment/cloud/upstream-kubernetes/upgrade); make the model edits described here in the same `inference_values.yaml` file before you run `helm upgrade`.

## Prerequisites

* A working deployment completed with the [Install on Kubernetes](/deployment/cloud/upstream-kubernetes/install) guide.
* The customized `inference_values.yaml` file you used to install.
* The new model checkpoint, provided by Poolside.
* Workstation tools:
  * `helm` `3.12` or later
  * `kubectl`
  * `aws` CLI (to upload checkpoints to S3-compatible object storage)
  * `jq` (to parse JSON responses from the inference API)

The S3 commands on this page include `--endpoint-url` for non-AWS S3 endpoints such as MinIO or SeaweedFS. Omit `--endpoint-url` if you use AWS S3.

## Downtime

Adding a model does not affect models that are already serving. Updating a checkpoint rolls that model's Deployment, and the model server re-downloads the checkpoint from S3 on restart, so expect a delay before it becomes ready again. Plan a maintenance window for single-replica models.

## Add a model

Extract the new checkpoint archive as described in [Upload model checkpoints](/deployment/cloud/upstream-kubernetes/install#step-3-upload-model-checkpoints) so its files sit at the prefix root, then upload it to your S3 bucket. Use a distinct prefix per model:

```bash theme={null}
aws s3 cp ./checkpoints/<new-model> s3://<bucket-name>/checkpoints/<new-model> \
  --recursive \
  --endpoint-url https://<s3-endpoint> \
  --region <aws-region>
```

For checkpoint upload details such as concurrency throttling, see [Upload model checkpoints](/deployment/cloud/upstream-kubernetes/install#step-3-upload-model-checkpoints).

Add a new key under `models` in your `inference_values.yaml` file. Give the model its own `ingressHost`:

```yaml title="Example: inference_values.yaml" theme={null}
models:
  # ...existing models...
  <new-model>:
    model: s3://<bucket-name>/checkpoints/<new-model>
    modelName: <new-model-name>
    modelType: agent
    gpus: 1
    # -- Hostname that routes to this model's vLLM service
    ingressHost: "<new-model-hostname>"
```

Apply the change with `helm upgrade`. Use the same flags you used to install. If your install command used `--set-file s3.caBundle=...` because your S3 backend uses a private CA, include that flag every time you run `helm upgrade` on this page:

```bash theme={null}
helm upgrade inference ./charts/inference \
  --namespace poolside-models \
  -f ./inference_values.yaml
```

The chart creates a new `Deployment`, `Service`, and `Ingress` named `inference-<model-key>` for the model. Confirm the new pod starts and the ingress is created:

```bash theme={null}
kubectl get pods -n poolside-models
kubectl get ingress inference-<model-key> -n poolside-models
```

## Update a model checkpoint

Upload the new checkpoint to a new, versioned prefix rather than overwriting the existing one. A new path lets `helm upgrade` detect the change and roll the Deployment automatically, and it lets you roll back by pointing at the previous path. Extract the archive first, as in [Upload model checkpoints](/deployment/cloud/upstream-kubernetes/install#step-3-upload-model-checkpoints), so its files sit at the prefix root:

```bash theme={null}
aws s3 cp ./checkpoints/<model-key>-<version> s3://<bucket-name>/checkpoints/<model-key>-<version> \
  --recursive \
  --endpoint-url https://<s3-endpoint> \
  --region <aws-region>
```

Point the model's `model` field at the new path in your `inference_values.yaml` file. Update `modelName` only if the served model name changes:

```yaml title="Example: inference_values.yaml" theme={null}
models:
  laguna:
    model: s3://<bucket-name>/checkpoints/laguna-<version>
    modelName: Laguna
    modelType: agent
    gpus: 4
    ingressHost: "<laguna-hostname>"
```

Apply the change:

```bash theme={null}
helm upgrade inference ./charts/inference \
  --namespace poolside-models \
  -f ./inference_values.yaml
```

The model's Deployment rolls, and the init container downloads the new checkpoint on startup. Watch the rollout:

```bash theme={null}
kubectl rollout status deploy/inference-<model-key> -n poolside-models
```

<Note>
  If you reuse the same S3 path instead of a versioned one, `helm upgrade` detects no change to the values and does not restart the model. Force a restart so the init container re-downloads the checkpoint:

  ```bash theme={null}
  kubectl rollout restart deploy/inference-<model-key> -n poolside-models
  ```
</Note>

## Remove a model

Delete the model's key from `models` in your `inference_values.yaml` file, then apply the change:

```bash theme={null}
helm upgrade inference ./charts/inference \
  --namespace poolside-models \
  -f ./inference_values.yaml
```

The chart removes that model's `Deployment`, `Service`, and `Ingress`. Confirm the resources are gone:

```bash theme={null}
kubectl get deploy,svc,ingress -n poolside-models -l app.kubernetes.io/component=inference
```

If you no longer need the model's checkpoint, delete it from the bucket:

```bash theme={null}
aws s3 rm s3://<bucket-name>/checkpoints/<model-key> \
  --recursive \
  --endpoint-url https://<s3-endpoint> \
  --region <aws-region>
```

## Verification

Confirm a model serves traffic, where `<model-hostname>` is the `ingressHost` of that model:

```bash theme={null}
curl -s http://<model-hostname>/v1/models | jq -r '.data[].id'
```

## Related resources

* [Install on Kubernetes](/deployment/cloud/upstream-kubernetes/install)
* [Upgrade on Kubernetes](/deployment/cloud/upstream-kubernetes/upgrade)
* [Remove from Kubernetes](/deployment/cloud/upstream-kubernetes/remove)

For questions about model checkpoints or hardware requirements, contact Poolside support.

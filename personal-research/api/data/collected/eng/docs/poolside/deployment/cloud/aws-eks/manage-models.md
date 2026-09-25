# Manage models on Amazon EKS

> Add, update, or remove inference models in an existing inference deployment on Amazon EKS.

## Overview

Use this guide to change the set of models served by a running `inference` release: adding a new model, replacing a model's checkpoint, or removing a model. You edit your `inference_values.yaml` file and run `helm upgrade`; the chart reconciles the model Deployments, Services, and Ingress objects to match.

You can make these changes on their own against the current chart version, or apply them as part of a chart upgrade to a new Poolside bundle. To upgrade the chart, see [Upgrade on Amazon EKS](/deployment/cloud/aws-eks/upgrade); make the model edits described here in the same `inference_values.yaml` file before you run `helm upgrade`.

## Prerequisites

* A working deployment completed with the [Install on Amazon EKS](/deployment/cloud/aws-eks/install) guide.
* The customized `inference_values.yaml` file you used to install.
* The new model checkpoint, provided by Poolside.
* Workstation tools:
  * `helm` `3.12` or later
  * `kubectl`, configured for your EKS cluster
  * `aws` CLI, to upload checkpoints to S3
  * `jq`, to parse JSON responses from the inference API

## Downtime

Adding a model does not affect models that are already serving. Updating a checkpoint rolls that model's Deployment, and the model server re-downloads the checkpoint from S3 on restart, so expect a delay before it becomes ready again. Plan a maintenance window for single-replica models.

## Add a model

Extract the new checkpoint archive as described in [Upload model checkpoints to S3](/deployment/cloud/aws-eks/install#step-3-upload-model-checkpoints-to-s3) so its files sit at the prefix root, then upload it to your S3 bucket. Use a distinct prefix per model:

```bash theme={null}
aws s3 cp ./checkpoints/<new-model> s3://<bucket-name>/checkpoints/<new-model> \
  --recursive \
  --region <aws-region>
```

For checkpoint upload details such as concurrency throttling, see [Upload model checkpoints to S3](/deployment/cloud/aws-eks/install#step-3-upload-model-checkpoints-to-s3).

Add a new key under `models` in your `inference_values.yaml` file. Give the model its own `ingressHost`, covered by the ACM certificate referenced in `ingress.annotations`:

```yaml title="Example: inference_values.yaml" theme={null}
models:
  # ...existing models...
  <model-key>:
    model: s3://<bucket-name>/checkpoints/<new-model>
    modelName: <model-name>
    modelType: agent
    gpus: <gpu-count>
    ingressHost: <model-hostname>
```

Apply the change with `helm upgrade`:

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

Create a DNS record for the new `ingressHost`, pointing it at the load balancer address.

## Update a model checkpoint

Upload the new checkpoint to a new, versioned prefix rather than overwriting the existing one. A new path lets `helm upgrade` detect the change and roll the Deployment automatically, and it lets you roll back by pointing at the previous path. Extract the archive first, as in [Step 3](/deployment/cloud/aws-eks/install#step-3-upload-model-checkpoints-to-s3), so the files sit at the prefix root:

```bash theme={null}
aws s3 cp ./checkpoints/<model-key>-<version> s3://<bucket-name>/checkpoints/<model-key>-<version> \
  --recursive \
  --region <aws-region>
```

Point the model's `model` field at the new path in your `inference_values.yaml` file. Update `modelName` only if the served model name changes:

```yaml title="Example: inference_values.yaml" theme={null}
models:
  laguna-m:
    model: s3://<bucket-name>/checkpoints/laguna-m-<version>
    modelName: Laguna
    modelType: agent
    gpus: 4
    ingressHost: <laguna-m-hostname>
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
aws s3 rm s3://<bucket-name>/checkpoints/<model-key> --recursive --region <aws-region>
```

You can also remove the model's DNS record once the ingress is gone.

## Verification

Confirm a model serves traffic, where `<model-hostname>` is the `ingressHost` of that model:

```bash theme={null}
curl -s https://<model-hostname>/v1/models \
  -H "Authorization: Bearer <vllm-api-key>" \
  | jq -r '.data[].id'
```

If API key authentication is off, omit the `Authorization` header.

## Related resources

* [Install on Amazon EKS](/deployment/cloud/aws-eks/install)
* [Upgrade on Amazon EKS](/deployment/cloud/aws-eks/upgrade)
* [Remove from Amazon EKS](/deployment/cloud/aws-eks/remove)

For questions about model checkpoints or hardware requirements, contact Poolside support.

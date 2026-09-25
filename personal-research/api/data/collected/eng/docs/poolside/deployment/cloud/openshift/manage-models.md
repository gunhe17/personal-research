# Manage models on OpenShift

> Add, update, or remove inference models in an existing inference deployment on OpenShift.

## Overview

Use this guide to change the set of models served by a running `inference` release: adding a new model, replacing a model's checkpoint, or removing a model. You edit your `inference_values.yaml` file and run `helm upgrade`; the chart reconciles the model Deployments, Services, and Routes to match.

You can make these changes on their own against the current chart version, or apply them as part of a chart upgrade to a new Poolside bundle. To upgrade the chart, see [Upgrade on OpenShift](/deployment/cloud/openshift/upgrade); make the model edits described here in the same `inference_values.yaml` file before you run `helm upgrade`.

## Prerequisites

* A working deployment completed with the [Install on OpenShift](/deployment/cloud/openshift/install) guide.
* The customized `inference_values.yaml` file you used to install.
* The new model checkpoint, provided by Poolside.
* Workstation tools:
  * `helm` `3.12` or later
  * `oc` or `kubectl`
  * `aws` CLI (to upload checkpoints to S3-compatible object storage)
  * `jq` (to parse JSON responses from the inference API)

## Downtime

Adding a model does not affect models that are already serving. Updating a checkpoint rolls that model's Deployment, and the model server re-downloads the checkpoint from S3 on restart, so expect a delay before it becomes ready again. Plan a maintenance window for single-replica models.

## Add a model

Extract the new checkpoint archive as described in [Upload model checkpoints](/deployment/cloud/openshift/install#step-3-upload-model-checkpoints) so its files sit at the prefix root, then upload it to your S3 bucket. Use a distinct prefix per model. For NooBaa or another non-AWS endpoint, include `--endpoint-url`:

```bash theme={null}
aws s3 cp ./checkpoints/<new-model> s3://<bucket-name>/checkpoints/<new-model> \
  --recursive \
  --endpoint-url https://<s3-endpoint> \
  --region <aws-region>
```

For checkpoint upload details such as concurrency throttling and the S3 CA bundle, see [Upload model checkpoints](/deployment/cloud/openshift/install#step-3-upload-model-checkpoints).

Add a new key under `models` in your `inference_values.yaml` file. Give the model its own `routeHost`, or leave it empty for a router-generated hostname:

```yaml title="Example: inference_values.yaml" theme={null}
models:
  # ...existing models...
  <new-model>:
    model: s3://<bucket-name>/checkpoints/<new-model>
    modelName: <new-model-name>
    modelType: agent
    gpus: 1
    # -- Route host for this model (leave empty for a router-generated hostname)
    routeHost: ""
```

Apply the change with `helm upgrade`. Use the same flags you used to install. If your install command used `--set-file s3.caBundle=...` because your S3 backend uses a private CA such as NooBaa, include that flag every time you run `helm upgrade` on this page:

```bash theme={null}
helm upgrade inference ./charts/inference \
  --namespace poolside-models \
  -f ./inference_values.yaml
```

The chart creates a new `Deployment`, `Service`, and `Route` named `inference-<model-key>` for the model. Confirm the new pod starts and the Route is created:

```bash theme={null}
oc get pods -n poolside-models
oc get route inference-<model-key> -n poolside-models
```

## Update a model checkpoint

Upload the new checkpoint to a new, versioned prefix rather than overwriting the existing one. A new path lets `helm upgrade` detect the change and roll the Deployment automatically, and it lets you roll back by pointing at the previous path. Extract the archive first, as in [Upload model checkpoints](/deployment/cloud/openshift/install#step-3-upload-model-checkpoints), so its files sit at the prefix root:

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
    routeHost: ""
```

Apply the change:

```bash theme={null}
helm upgrade inference ./charts/inference \
  --namespace poolside-models \
  -f ./inference_values.yaml
```

The model's Deployment rolls, and the init container downloads the new checkpoint on startup. Watch the rollout:

```bash theme={null}
oc rollout status deploy/inference-<model-key> -n poolside-models
```

<Note>
  If you reuse the same S3 path instead of a versioned one, `helm upgrade` detects no change to the values and does not restart the model. Force a restart so the init container re-downloads the checkpoint:

  ```bash theme={null}
  oc rollout restart deploy/inference-<model-key> -n poolside-models
  ```
</Note>

## Remove a model

Delete the model's key from `models` in your `inference_values.yaml` file, then apply the change:

```bash theme={null}
helm upgrade inference ./charts/inference \
  --namespace poolside-models \
  -f ./inference_values.yaml
```

The chart removes that model's `Deployment`, `Service`, and `Route`. Confirm the resources are gone:

```bash theme={null}
oc get deploy,svc,route -n poolside-models -l app.kubernetes.io/component=inference
```

If you no longer need the model's checkpoint, delete it from the bucket:

```bash theme={null}
aws s3 rm s3://<bucket-name>/checkpoints/<model-key> --recursive --endpoint-url https://<s3-endpoint> --region <aws-region>
```

## Verification

Confirm a model serves traffic, where `<route-host>` is the host of that model's Route:

```bash theme={null}
curl -s https://<route-host>/v1/models | jq -r '.data[].id'
```

## Related resources

* [Install on OpenShift](/deployment/cloud/openshift/install)
* [Upgrade on OpenShift](/deployment/cloud/openshift/upgrade)
* [Remove from OpenShift](/deployment/cloud/openshift/remove)

For questions about model checkpoints or hardware requirements, contact Poolside support.

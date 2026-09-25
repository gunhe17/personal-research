# Upgrade on Kubernetes

> Upgrade an existing model inference deployment on upstream Kubernetes to a new bundle.

<Warning>
  This guide assumes that you deployed model inference using the instructions in [Install on Kubernetes](/deployment/cloud/upstream-kubernetes/install).
</Warning>

## Overview

This guide describes how to upgrade an existing model inference deployment on a self-managed Kubernetes cluster to a new Helm bundle. The upgrade updates the `inference` Helm release.

The upgrade process includes the following phases:

1. **Prepare the new bundle**: Extract the bundle and reuse the values file from the previous deployment. Add any new values required by the new chart.
2. **Upload new container images**: Push the new bundle's images into your registry.
3. **Upgrade the inference release**: Run `helm upgrade` against the `inference` chart.
4. **Verify**: Confirm that the new revision is deployed and pods are healthy.

## Deployment bundle

The new bundle follows the same structure as the initial deployment. For more information, see [Install on Kubernetes](/deployment/cloud/upstream-kubernetes/install).

## Prerequisites

* A working model inference deployment completed with [Install on Kubernetes](/deployment/cloud/upstream-kubernetes/install).
* The new deployment bundle provided by Poolside.
* The customized `inference_values.yaml` file used for the initial deployment.
* Workstation tools, same versions as the initial deployment:
  * `helm` `3.12` or later
  * `kubectl`
  * `skopeo`

## Downtime

The upgrade rolls model pods one deployment at a time. Each model server re-downloads its checkpoint from S3 on restart, so expect a delay before a rolled model becomes ready. Plan a maintenance window if you run single-replica models.

## Preparation

### Step A: Extract the new bundle

Poolside provides the new bundle as a tarball. Extract it to a directory of your choice, then set shell variables for the old and new bundle roots:

```bash theme={null}
export OLD_BUNDLE=<path-to-previous-bundle>
export NEW_BUNDLE=<path-to-new-bundle>
```

### Step B: Review and update the customized `inference_values.yaml` file

The customized `inference_values.yaml` file from your previous deployment can be reused during the upgrade process. Poolside notes any required values changes in the release notes. The Poolside bundle contains the reference `values.yaml` for the `inference` chart at `charts/inference/values.yaml`. Use it as a reference while reviewing your existing file.

## Upgrade

### Step 1: Upload new container images

The new bundle ships updated images in `./containers/`. Push them to the same registry that the inference stack uses.

Log in to your target registry using `docker login`, `podman login`, or `skopeo login` before uploading.

Run the upload script from the new bundle root:

```bash theme={null}
cd $NEW_BUNDLE
./scripts/upload_images.sh <registry-host>
```

After the upload completes, verify that the new tags are present in your registry before proceeding.

### Step 2: Apply the upgrade

If your S3 backend uses a publicly trusted certificate, you can omit the `--set-file` flag from the `helm upgrade` command below.

If your S3 backend uses a private CA (for example, SeaweedFS, or MinIO with a self-signed certificate), prepare the CA bundle first and pass it with `--set-file`:

```bash theme={null}
helm upgrade inference \
  $NEW_BUNDLE/charts/inference \
  -f <path-to-inference-values.yaml> \
  --set-file s3.caBundle=<path-to-s3-ca.crt> \
  -n poolside-models
```

Watch the state of pods during the upgrade and verify that they are healthy at the end. The pods should be in a `Running` state when the upgrade completes:

```bash theme={null}
kubectl get pods -n poolside-models -w
```

### Step 3: Update models (optional)

You can add, update, or remove model checkpoints as part of this upgrade rather than as a separate operation. Make the model edits in the same `inference_values.yaml` file you reviewed in Step B, before you run the `helm upgrade` in Step 2. The single `helm upgrade` then reconciles both the new chart and the model changes.

For the full procedure to add, update, or remove models, see [Manage models on Kubernetes](/deployment/cloud/upstream-kubernetes/manage-models). You can also run those changes separately at any time after the upgrade.

## Verification

Confirm the release is deployed:

```bash theme={null}
helm history inference -n poolside-models
```

Verify that all pods are healthy:

```bash theme={null}
kubectl get pods -n poolside-models
```

Confirm that the inference endpoints still serve traffic, where `<model-hostname>` is the `ingressHost` of a model under `models`:

```bash theme={null}
curl -s http://<model-hostname>/v1/models
```

## Troubleshooting

* **Pods stuck pulling images**: Verify that the new tags are present in your registry, and confirm that `imagePullSecret` still references a valid secret.
* **Model pods stuck in `Init`**: Each model re-downloads its checkpoint from S3 on restart. Check the init container logs and confirm the checkpoint paths in `inference_values.yaml` are still valid.

## Related resources

* [Install on Kubernetes](/deployment/cloud/upstream-kubernetes/install)
* [Manage models on Kubernetes](/deployment/cloud/upstream-kubernetes/manage-models)
* [Upstream Kubernetes deployment](/deployment/cloud/upstream-kubernetes/overview)
* [Remove from Kubernetes](/deployment/cloud/upstream-kubernetes/remove)

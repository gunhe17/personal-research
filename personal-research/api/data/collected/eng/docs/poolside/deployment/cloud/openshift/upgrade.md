# Upgrade on OpenShift

> Upgrade an existing model inference deployment on OpenShift to a new bundle.

<Warning>
  This guide assumes that you deployed model inference using the instructions in [Install on OpenShift](/deployment/cloud/openshift/install).
</Warning>

## Overview

This guide describes how to upgrade an existing model inference deployment on OpenShift to a new Helm bundle. The upgrade updates the `inference` Helm release.

The upgrade process includes the following phases:

1. **Prepare the new bundle**: Extract the bundle and reuse the values file from the previous deployment. Add any new values required by the new chart.
2. **Upload new container images**: Push the new bundle's images into your registry.
3. **Upgrade the inference release**: Run `helm upgrade` against the `inference` chart.
4. **Verify**: Confirm that the new revision is deployed and pods are healthy.

## Deployment bundle

The new bundle follows the same structure as the initial deployment. For more information, see [Install on OpenShift](/deployment/cloud/openshift/install).

## Prerequisites

* A working model inference deployment completed with [Install on OpenShift](/deployment/cloud/openshift/install).
* The new deployment bundle provided by Poolside.
* The customized `inference_values.yaml` file used for the initial deployment.
* Workstation tools, same versions as the initial deployment:
  * `helm` `3.12` or later
  * `oc` (matching the cluster version)
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

If your S3 backend uses a publicly trusted certificate, you can skip the CA extraction below and omit the `--set-file` flag from the `helm upgrade` command.

If your S3 backend uses a private CA (for example, NooBaa on OpenShift Data Foundation), extract the certificate fresh from the serving certificate secret. NooBaa's certificate rotates automatically, so extract it fresh on each upgrade:

```bash theme={null}
oc get secret noobaa-s3-serving-cert -n openshift-storage \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > /tmp/s3-ca.crt
```

Run the upgrade using the revised `inference_values.yaml` file:

```bash theme={null}
helm upgrade inference \
  $NEW_BUNDLE/charts/inference \
  -f <path-to-inference-values.yaml> \
  --set-file s3.caBundle=/tmp/s3-ca.crt \
  -n poolside-models
```

Remove the temporary CA file:

```bash theme={null}
rm /tmp/s3-ca.crt
```

Watch the state of pods during the upgrade and verify that they are healthy at the end. The pods should be in a `Running` state when the upgrade completes:

```bash theme={null}
oc get pods -n poolside-models -w
```

### Step 3: Update models (optional)

You can add, update, or remove model checkpoints as part of this upgrade rather than as a separate operation. Make the model edits in the same `inference_values.yaml` file you reviewed in Step B, before you run the `helm upgrade` in Step 2. The single `helm upgrade` then reconciles both the new chart and the model changes.

For the full procedure to add, update, or remove models, see [Manage models on OpenShift](/deployment/cloud/openshift/manage-models). You can also run those changes separately at any time after the upgrade.

## Verification

Confirm the release is deployed:

```bash theme={null}
helm history inference -n poolside-models
```

Verify that all pods are healthy:

```bash theme={null}
oc get pods -n poolside-models
```

Confirm that the inference endpoints still serve traffic, where `<route-host>` is the host of a model's Route:

```bash theme={null}
curl -s https://<route-host>/v1/models
```

## Troubleshooting

* **Pods stuck pulling images**: Verify that the new tags are present in your registry, and confirm that `imagePullSecret` still references a valid secret.
* **Model pods stuck in `Init`**: Each model re-downloads its checkpoint from S3 on restart. Check the init container logs and confirm the checkpoint paths in `inference_values.yaml` are still valid.

## Related resources

* [Install on OpenShift](/deployment/cloud/openshift/install)
* [Manage models on OpenShift](/deployment/cloud/openshift/manage-models)
* [OpenShift deployment overview](/deployment/cloud/openshift/overview)
* [Remove from OpenShift](/deployment/cloud/openshift/remove)

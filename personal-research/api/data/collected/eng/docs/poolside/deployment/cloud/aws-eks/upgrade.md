# Upgrade on Amazon EKS

> Upgrade an existing model inference deployment on Amazon EKS to a new bundle.

<Warning>
  This guide assumes that you deployed model inference using the instructions in [Install on Amazon EKS](/deployment/cloud/aws-eks/install).
</Warning>

## Overview

This guide describes how to upgrade an existing model inference deployment on Amazon EKS to a new Helm bundle. The upgrade updates the `inference` Helm release.

The upgrade process includes the following phases:

1. **Prepare the new bundle**: Extract the bundle and reuse the values file from the previous deployment. Add any new values the new chart requires.
2. **Upload new container images**: Push the new bundle's container images into Amazon ECR.
3. **Upgrade the inference release**: Run `helm upgrade` against the `inference` chart.
4. **Verify**: Confirm that the new revision is deployed and the pods are healthy.

## Prerequisites

* A working model inference deployment completed with [Install on Amazon EKS](/deployment/cloud/aws-eks/install).
* The new deployment bundle provided by Poolside.
* The customized `inference_values.yaml` file used for the initial deployment.
* Workstation tools, same versions as the initial deployment:
  * `helm` `3.12` or later
  * `kubectl`, configured for your EKS cluster
  * `skopeo`, to copy the bundled images into Amazon ECR
  * `aws` CLI

## Downtime

The upgrade rolls model pods one Deployment at a time. The chart sets `maxSurge` to 0 so a rolled model does not request additional GPUs during the rollout, which means that model goes down briefly while its new pod starts. Each model server also re-downloads its checkpoint from S3 on restart, so expect a delay before a rolled model becomes ready. Plan a maintenance window if you run single-replica models.

## Step 1: Extract the new bundle

Poolside provides the new bundle as a tarball. Extract it to a directory of your choice, then set a shell variable for the new bundle root:

```bash theme={null}
export NEW_BUNDLE=<path-to-new-bundle>
```

## Step 2: Review the values file

Reuse the `inference_values.yaml` file from your previous deployment. Poolside notes any required values changes in the release notes. The new bundle contains the reference `values.yaml` for the `inference` chart at `charts/inference/values.yaml`. Use it as a reference while reviewing your existing file.

## Step 3: Upload the new container images

The new bundle ships updated container images in `./containers/`. Authenticate `skopeo` to your ECR registry, then push the images to the same repositories that the inference release uses:

```bash theme={null}
aws ecr get-login-password --region <aws-region> \
  | skopeo login --username AWS --password-stdin <account-id>.dkr.ecr.<aws-region>.amazonaws.com

cd $NEW_BUNDLE
./scripts/upload_images.sh <account-id>.dkr.ecr.<aws-region>.amazonaws.com
```

The image tags are specific to the new bundle, not fixed values. After the upload completes, confirm the `atlas` tag that was pushed before you continue:

```bash theme={null}
aws ecr describe-images --repository-name atlas --region <aws-region> \
  --query 'sort_by(imageDetails,&imagePushedAt)[-1].imageTags' --output text
```

## Step 4: Dry-run the upgrade (optional)

Preview the changes before you apply them:

```bash theme={null}
helm upgrade inference \
  $NEW_BUNDLE/charts/inference \
  -f <path-to-inference-values.yaml> \
  -n poolside-models --dry-run --debug | less
```

## Step 5: Apply the upgrade

Run the upgrade and watch the pods roll. The pods should return to a `Running` state when the upgrade completes:

```bash theme={null}
helm upgrade inference \
  $NEW_BUNDLE/charts/inference \
  -f <path-to-inference-values.yaml> \
  -n poolside-models

kubectl get pods -n poolside-models -w
```

## Step 6: Update models (optional)

You can add, update, or remove model checkpoints as part of this upgrade rather than as a separate operation. Make the model edits in the same `inference_values.yaml` file you reviewed in Step 2, before you run the `helm upgrade` in Step 5. The single `helm upgrade` then reconciles both the new chart and the model changes.

For the full procedure to add, update, or remove models, see [Manage models on Amazon EKS](/deployment/cloud/aws-eks/manage-models). You can also run those changes separately at any time after the upgrade.

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
curl -s https://<model-hostname>/v1/models \
  -H "Authorization: Bearer <vllm-api-key>"
```

If API key authentication is off, omit the `Authorization` header.

## Troubleshooting

* **Pods stuck pulling images**: Verify that the new tag is present in the `atlas` ECR repository and that the GPU node group's instance role still has the `AmazonEC2ContainerRegistryReadOnly` policy.
* **Model pods stuck in `Init`**: Each model re-downloads its checkpoint from S3 on restart. Check the init container logs and confirm the checkpoint paths in `inference_values.yaml` are still valid.

## Related resources

* [Install on Amazon EKS](/deployment/cloud/aws-eks/install)
* [Manage models on Amazon EKS](/deployment/cloud/aws-eks/manage-models)
* [Amazon EKS deployment](/deployment/cloud/aws-eks/overview)
* [Remove from Amazon EKS](/deployment/cloud/aws-eks/remove)

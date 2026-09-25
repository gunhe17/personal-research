# Remove from Amazon EKS

> Instructions for removing a model inference deployment from an Amazon EKS cluster.

## Overview

These steps remove the `inference` Helm release, its Kubernetes resources, and the AWS artifacts used by a model inference deployment on Amazon EKS.

The removal process includes the following phases:

1. **Uninstall the inference release**: Uninstall the `inference` Helm release, which also tears down the Application Load Balancer.
2. **Delete cluster resources**: Delete the `poolside-models` namespace, which removes the remaining workloads, secrets, ConfigMaps, and Ingress objects.
3. **Clean up AWS artifacts**: Remove the IRSA role, ECR repository, S3 checkpoints, ACM certificate, and DNS records.

## Prerequisites

These instructions assume that you deployed model inference using [Install on Amazon EKS](/deployment/cloud/aws-eks/install). Before you start, make sure you have:

* Cluster administrator access to the EKS cluster
* `helm` `3.12` or later
* `kubectl`, configured for your EKS cluster
* `aws` CLI, with permission to delete the AWS resources you provisioned

## Step 1: Uninstall the inference release

List the Helm releases in the `poolside-models` namespace:

```bash theme={null}
helm list -n poolside-models
```

Uninstall the release. This deletes the per-model Ingress objects, which prompts the AWS Load Balancer Controller to delete the shared Application Load Balancer:

```bash theme={null}
helm uninstall inference -n poolside-models
```

Wait for the inference pods to stop. Continue when `kubectl get pods -n poolside-models` shows no Poolside pods remaining:

```bash theme={null}
kubectl get pods -n poolside-models
```

Confirm the load balancer is gone before you continue:

```bash theme={null}
kubectl get ingress -n poolside-models
```

## Step 2: Delete cluster resources

Deleting the namespace removes the remaining workloads, secrets, ConfigMaps, and any Ingress objects that the inference release created:

```bash theme={null}
kubectl delete namespace poolside-models
```

## Step 3: Clean up AWS artifacts

Clean up the following AWS resources separately. Remove only the resources that you no longer need.

**IRSA role**

Delete the inference-pod IAM role and its permissions policy. If you created them with `eksctl create iamserviceaccount`, delete them with `eksctl`:

```bash theme={null}
eksctl delete iamserviceaccount \
  --cluster <cluster-name> \
  --namespace poolside-models \
  --name inference
```

If you created the role and policy directly, detach the policy and delete both with the `aws iam` commands you use for IAM cleanup.

**Amazon ECR**

Delete the `atlas` repository if no other deployment uses it:

```bash theme={null}
aws ecr delete-repository --repository-name atlas --force --region <aws-region>
```

**Amazon S3**

Delete the model checkpoints from the bucket you referenced in `models.<key>.model` in the `inference_values.yaml` file you used to install:

```bash theme={null}
aws s3 rm s3://<bucket-name>/checkpoints --recursive --region <aws-region>
```

If the bucket only stored Poolside checkpoints, you can delete the bucket itself.

**TLS certificate and DNS records**

Remove the DNS records that pointed to the model hostnames. If the ACM certificate covered only those hostnames, delete it:

```bash theme={null}
aws acm delete-certificate --certificate-arn <acm-certificate-arn> --region <aws-region>
```

**Local files**

Delete the extracted Helm bundle directory and your `inference_values.yaml` file from your workstation.

## Related resources

* [Install on Amazon EKS](/deployment/cloud/aws-eks/install)
* [Amazon EKS deployment](/deployment/cloud/aws-eks/overview)
* [Cloud deployment overview](/deployment/cloud/overview)

For questions about the removal process, contact Poolside support.

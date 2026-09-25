# Amazon EKS deployment

> Overview of deploying Poolside model inference on Amazon EKS by using Helm, with IRSA for object storage and an ALB for ingress.

Use this page to understand how to serve Poolside models from an Amazon EKS cluster.

You provision the EKS cluster and the supporting AWS services, including the model checkpoint S3 bucket, an Amazon ECR registry, and the GPU node group. Poolside provides the deployment bundle, which contains the `inference` Helm chart. The model checkpoints are provided separately. You deploy the chart, expose each model through its own Application Load Balancer ingress, and call the OpenAI-compatible API.

This deployment uses the Poolside inference chart from the current Poolside inference bundle. It serves the model servers directly.

## Architecture

This deployment includes:

* One `Deployment` and `Service` per model. Each model server downloads its checkpoint from Amazon S3 on startup and serves an OpenAI-compatible API.
* One `Ingress` per model, reconciled by the AWS Load Balancer Controller into a shared internal or internet-facing Application Load Balancer. Each model is reachable at its own hostname.
* A single shared service account, `inference`, annotated for IAM Roles for Service Accounts (IRSA). The model servers read checkpoints from S3 through this role, so the cluster needs no static AWS credentials.
* Optionally, the Poolside documentation site, deployed in-cluster from the bundle. See [Set up offline documentation](/deployment/cloud/set-up-offline-documentation).

You are responsible for sending requests to the inference endpoints and for any authentication or routing in front of them.

## How Amazon EKS differs from upstream Kubernetes

The deployment shape matches the [upstream Kubernetes deployment](/deployment/cloud/upstream-kubernetes/overview), with these AWS-native substitutions:

* **Ingress**: an Application Load Balancer provisioned by the AWS Load Balancer Controller, instead of an in-cluster ingress controller.
* **Object storage access**: IRSA on the `inference` service account, instead of a mounted AWS credentials secret.
* **Container registry**: Amazon ECR, with image pulls authorized by the GPU node group's instance role, instead of an image pull secret.
* **TLS**: terminated at the load balancer with an AWS Certificate Manager certificate, instead of a TLS secret in the cluster.

## Required AWS foundation

You provision the AWS infrastructure that the chart runs on. The [Install on Amazon EKS](/deployment/cloud/aws-eks/install) page lists the required services and the reason for each.

For a turnkey foundation, Poolside publishes a Terraform reference architecture in the [`poolsideai/reference_architectures`](https://github.com/poolsideai/reference_architectures/tree/main/aws) repository. You can apply it as published, fork it, or reproduce the same architecture in your own infrastructure-as-code. For the architecture diagram and the key design decisions, see [Reference architecture](/deployment/cloud/aws-eks/reference-architecture).

## Related resources

* [Install on Amazon EKS](/deployment/cloud/aws-eks/install)
* [Manage models on Amazon EKS](/deployment/cloud/aws-eks/manage-models)
* [Upgrade on Amazon EKS](/deployment/cloud/aws-eks/upgrade)
* [Remove from Amazon EKS](/deployment/cloud/aws-eks/remove)
* [Cloud deployment overview](/deployment/cloud/overview)

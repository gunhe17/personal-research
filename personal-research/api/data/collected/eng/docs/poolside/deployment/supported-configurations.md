# Supported configurations

> Review supported environments and planning guidance for Poolside model inference.

Poolside supports model inference deployments in GPU-backed Kubernetes environments. Use this page to review supported environments and size the infrastructure that serves Poolside models.

<Warning>
  Poolside support covers the environments documented on this page. For other Kubernetes environments, GPU configurations, storage backends, or security requirements, contact your Poolside account team to discuss support options.
</Warning>

## Supported environments

| Deployment                                                                  | Description                                                                                                    |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [Amazon EKS 1.29+](/deployment/cloud/aws-eks/overview)                      | Amazon Elastic Kubernetes Service, with IAM Roles for Service Accounts (IRSA) and an Application Load Balancer |
| [OpenShift 4.16+](/deployment/cloud/openshift/overview)                     | Red Hat OpenShift environments                                                                                 |
| [Upstream Kubernetes 1.29+](/deployment/cloud/upstream-kubernetes/overview) | Self-managed Kubernetes environments such as RKE2 or Charmed Kubernetes                                        |
| [On-premises](/deployment/on-prem/overview)                                 | Single-node Kubernetes (RKE2) on customer-provided or Poolside-provided hardware                               |

## Plan your deployment

Choose infrastructure based on your model, expected concurrency, context length, and latency requirements. GPU memory alone does not determine a supported configuration.

When planning a deployment, consider:

* **Model**: Larger models require more GPU memory and compute capacity.
* **Concurrency and context length**: More simultaneous requests and longer contexts increase memory requirements.
* **GPU topology**: The required GPU count depends on the GPU family and available memory per GPU.
* **Host resources**: CPU and host memory requirements depend on your deployment topology and workload.

Work with your Poolside account team to validate a configuration for your model and expected workload.

## Planning estimates

Use the estimates below as a starting point for infrastructure planning, not as minimum requirements, a supported configuration, or a guarantee of performance for a particular workload. Context length, concurrency, batch size, latency requirements, and GPU topology all affect the resources a deployment actually needs. For concurrent-agent capacity, developer-seat estimates, and models not listed here, contact your Poolside account team for configuration guidance.

| Model         | Quantization | Estimated total GPU memory |
| ------------- | ------------ | -------------------------- |
| Laguna XS 2.1 | FP8          | 96 GB                      |
| Laguna S 2.1  | FP8          | 192 GB                     |
| Laguna M.1    | FP8          | 384 GB                     |

For local development on your own hardware, see [How to run a Poolside model locally](/resources/run-model-locally).

For cloud deployments, storage requirements depend on whether S3-compatible storage is colocated on the inference node.

For on-premises deployments, see [Storage requirements](/deployment/on-prem/storage) for guidance on sizing and configuring storage.

### CPU and host memory

CPU and host memory needs scale with GPU count rather than with a specific model. As an approximate planning estimate, independent of which model a node serves:

* At least 8 CPU cores per GPU
* Host memory at least equal to total GPU memory

For example, a node with 2 GPUs at 96 GB each would need roughly 16 CPU cores and 192 GB host memory under this estimate. Actual requirements scale with concurrency and context length. Confirm sizing for your workload with your Poolside account team.

### GPU types

Poolside model inference targets the following NVIDIA GPU families:

| GPU                | Memory per GPU |
| ------------------ | -------------- |
| H100               | 80 GB          |
| RTX 6000 Blackwell | 96 GB          |
| H200               | 141 GB         |

The per-model table provides planning guidance, not a strict floor or a GPU selector. Context length, batch size, and the number of GPUs affect the configuration that serves a model.

## Support and compatibility

For questions about integration with specific enterprise tooling or deployment workflows, contact Poolside.

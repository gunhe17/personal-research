# Upstream Kubernetes deployment

> Overview of deploying Poolside model inference on a self-managed Kubernetes cluster by using Helm.

Use this page to understand how to serve Poolside models from your GPU-backed Kubernetes cluster, such as RKE2 or Charmed Kubernetes.

You provision the Kubernetes cluster and supporting services, including object storage and a container registry. Poolside provides the deployment bundle, which contains the Helm chart that deploys the Poolside inference workloads. The model checkpoints are provided separately. You deploy the `inference` chart, expose each model through its own ingress, and call the OpenAI-compatible API.

## Architecture

This deployment includes:

* One `Deployment` and `Service` per model. Each model server downloads its checkpoint from S3 on startup and serves an OpenAI-compatible API.
* Each model is exposed at its own hostname through an ingress that routes directly to its vLLM service.
* Optionally, the Poolside documentation site, deployed in-cluster from the bundle. See [Set up offline documentation](/deployment/cloud/set-up-offline-documentation).

You are responsible for sending requests to the inference endpoints and for any authentication or routing in front of them.

## Related resources

* [Install on Kubernetes](/deployment/cloud/upstream-kubernetes/install)
* [Upgrade on Kubernetes](/deployment/cloud/upstream-kubernetes/upgrade)
* [Remove from Kubernetes](/deployment/cloud/upstream-kubernetes/remove)
* [Cloud deployment overview](/deployment/cloud/overview)

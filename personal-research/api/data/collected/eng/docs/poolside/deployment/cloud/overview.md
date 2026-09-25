# Cloud deployment

> Deploy Poolside model inference in a supported GPU-backed cloud Kubernetes environment.

Use cloud deployment to serve Poolside models from a GPU-backed Kubernetes environment. You deploy the `inference` chart, expose each model through its own ingress or OpenShift Route, and call the OpenAI-compatible API.

## Supported environments

<CardGroup cols={1}>
  <Card title="Amazon EKS" icon="aws" href="/deployment/cloud/aws-eks/overview">
    Deploy model inference with Helm on Amazon EKS, using IRSA for object storage and an Application Load Balancer for ingress.
  </Card>

  <Card title="Red Hat OpenShift" icon="boxes-stacked" href="/deployment/cloud/openshift/overview">
    Deploy model inference with Helm on your OpenShift cluster.
  </Card>

  <Card title="Upstream Kubernetes" icon="dharmachakra" href="/deployment/cloud/upstream-kubernetes/overview">
    Deploy model inference with Helm on your self-managed Kubernetes cluster, such as RKE2 or Charmed Kubernetes.
  </Card>
</CardGroup>

## Architecture

Cloud deployment includes:

* One `Deployment` and `Service` per model. Each model server downloads its checkpoint from object storage on startup and serves an OpenAI-compatible API.
* Each model is exposed at its own hostname through an ingress or OpenShift Route that routes directly to its vLLM service.
* Optionally, the Poolside documentation site, deployed in-cluster from the bundle. See [Set up offline documentation](/deployment/cloud/set-up-offline-documentation).

You are responsible for sending requests to the inference endpoints and for any authentication or routing in front of them.

To expose a shared endpoint with centralized access controls, routing, virtual keys, budgets, and spend tracking, see [Use LiteLLM with Poolside model inference](/deployment/inference-gateways/litellm).

## Operational considerations

* **Service availability**: All external services your deployment depends on, including object storage and the container registry, must be reachable from within the cluster. The cluster must have access to compatible GPU hardware.
* **Backup and recovery**: You are responsible for backup and recovery for the infrastructure and external services in your environment, such as object storage, container registry contents, and Kubernetes configuration.

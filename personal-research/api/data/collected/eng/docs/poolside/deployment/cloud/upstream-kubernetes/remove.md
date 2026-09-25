# Remove from upstream Kubernetes

> Instructions for removing a model inference deployment from an upstream Kubernetes cluster.

## Overview

These steps remove the `inference` Helm release, its Kubernetes resources, and the external artifacts used by a model inference deployment on upstream Kubernetes.

The removal process includes the following phases:

1. **Uninstall the inference release**: Uninstall the `inference` Helm release.
2. **Delete cluster resources**: Delete the `poolside-models` namespace, which removes the remaining workloads, secrets, ConfigMaps, Ingress objects, and persistent volume claims.
3. **Clean up external artifacts**: Remove remaining artifacts such as DNS records, TLS certificates, container images, and S3 objects.

## Prerequisites

These instructions assume that you deployed model inference using [Install on Kubernetes](/deployment/cloud/upstream-kubernetes/install). Before you start, make sure you have:

* Cluster administrator access to the Kubernetes cluster
* `helm` `3.12` or later
* `kubectl`

## Step 1: Uninstall the inference release

List the Helm releases in the `poolside-models` namespace:

```bash theme={null}
helm list -n poolside-models
```

Uninstall the inference release:

```bash theme={null}
helm uninstall inference -n poolside-models
```

Wait for the inference pods to stop. Continue when `kubectl get pods -n poolside-models` shows no Poolside pods remaining:

```bash theme={null}
kubectl get pods -n poolside-models
```

## Step 2: Delete cluster resources

Deleting the namespace removes the remaining workloads, secrets, ConfigMaps, Ingress objects, and persistent volume claims that the inference stack created.

Delete the `poolside-models` namespace:

```bash theme={null}
kubectl delete namespace poolside-models
```

## Step 3: Clean up external artifacts

Clean up the following external resources separately. Remove only the resources that you no longer need.

**Container images**

Delete the Poolside container images and repositories from your registry. The exact procedure depends on the registry you use.

**S3-compatible object storage**

Delete the model checkpoints from the bucket you referenced in `models.<key>.model` in the `inference_values.yaml` file you used to install:

```bash theme={null}
aws s3 rm s3://<bucket-name>/checkpoints --recursive --region <aws-region>
```

If you use a non-AWS S3 endpoint, add the `--endpoint-url` flag and set it to your S3 endpoint URL.

If your bucket only stored Poolside data, you can delete the bucket itself.

**TLS certificates and DNS records**

Remove the DNS records that pointed to your inference hostname, and revoke or delete any TLS certificates that you issued for that hostname.

**Local files**

Delete the extracted Helm bundle directory, your `inference_values.yaml` file, and any TLS material (`tls.crt`, `tls.key`, `ca-bundle.crt`) that you kept on your workstation.

## Related resources

* [Install on Kubernetes](/deployment/cloud/upstream-kubernetes/install)
* [Upstream Kubernetes deployment](/deployment/cloud/upstream-kubernetes/overview)
* [Cloud deployment overview](/deployment/cloud/overview)

For questions about the removal process, contact Poolside support.

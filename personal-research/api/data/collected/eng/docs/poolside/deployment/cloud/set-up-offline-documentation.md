# Set up offline documentation

> Deploy the Poolside documentation site in-cluster for offline access as part of a cloud inference deployment.

The deployment bundle ships the Poolside documentation site as a container image (`public-docs`). The same `inference` chart can deploy it in-cluster, so operators have local access to the documentation alongside the models. This is useful in air-gapped or restricted environments where the hosted documentation is not reachable.

This configuration is **not enabled by default**. You can enable it when you first install the chart, or add it later to a running release with `helm upgrade`.

This page applies to [Amazon EKS](/deployment/cloud/aws-eks/install), [OpenShift](/deployment/cloud/openshift/install), and [upstream Kubernetes](/deployment/cloud/upstream-kubernetes/install) deployments. Follow the tab that matches your platform where the steps differ.

## Prerequisites

* A cloud inference deployment, either already installed or in progress. See [Install on Amazon EKS](/deployment/cloud/aws-eks/install), [Install on OpenShift](/deployment/cloud/openshift/install), or [Install on Kubernetes](/deployment/cloud/upstream-kubernetes/install).

* The `public-docs` image uploaded to your registry. The image ships in the bundle's `./containers/` directory, and `upload_images.sh` uploads it alongside the `atlas` image during the install image-upload step. No separate upload is required.

## Enable the site

Set `docs.enabled` to `true` in your `inference_values.yaml` file:

```yaml title="Example: inference_values.yaml" theme={null}
docs:
  # -- Deploy the public-docs site
  enabled: true
```

The chart deploys the site as a single `Deployment` and `Service` named `inference-public-docs`. The `docs.image` registry falls back to the top-level `image.registry`, and the image name and tag come pre-set to match the shipped `public-docs` image, so you do not normally set anything under `docs.image`.

With no hostname configured, the site is reachable only inside the cluster, at:

```text theme={null}
http://inference-public-docs.poolside-models.svc.cluster.local
```

## Expose the site

To reach the site from outside the cluster, give it a hostname. The docs site reuses the same ingress or Route configuration as the models, so it must share the model exposure method.

<Tabs>
  <Tab title="Amazon EKS (ALB)">
    Exposing the site requires `ingress.enabled: true` (the same setting the models use). Set `docs.ingressHost`:

    ```yaml title="Example: inference_values.yaml" theme={null}
    ingress:
      enabled: true
      className: "alb"
    docs:
      enabled: true
      # -- Ingress hostname for the docs site
      ingressHost: "docs.example.com"
    ```

    The docs `Ingress` reuses the shared `ingress.className` and `ingress.annotations`, so it joins the same Application Load Balancer through the `alb.ingress.kubernetes.io/group.name` annotation. TLS terminates at the load balancer with the ACM certificate from the `alb.ingress.kubernetes.io/certificate-arn` annotation, so that certificate must also be valid for `docs.ingressHost`. You do not create an in-cluster TLS secret.
  </Tab>

  <Tab title="Kubernetes (Ingress)">
    Exposing the site requires `ingress.enabled: true` (the same setting the models use). Set `docs.ingressHost`:

    ```yaml title="Example: inference_values.yaml" theme={null}
    ingress:
      enabled: true
      className: "nginx"
    docs:
      enabled: true
      # -- Ingress hostname for the docs site
      ingressHost: "docs.poolside.local"
    ```

    The docs `Ingress` reuses the shared `ingress.className`, `ingress.annotations`, and `ingress.tls`. To serve the site over HTTPS, add `docs.ingressHost` to an entry in `ingress.tls[].hosts` and reference a TLS secret in `poolside-models`:

    ```yaml theme={null}
    ingress:
      enabled: true
      className: "nginx"
      tls:
        - hosts:
            - "docs.poolside.local"
          secretName: "<docs-tls-secret>"
    ```
  </Tab>

  <Tab title="OpenShift (Route)">
    Exposing the site requires `route.enabled: true` (the same setting the models use). Set `docs.routeHost` to an explicit hostname; unlike the model Routes, the docs Route is not created unless you set a host:

    ```yaml title="Example: inference_values.yaml" theme={null}
    route:
      enabled: true
    docs:
      enabled: true
      # -- Route hostname for the docs site (required to expose it)
      routeHost: "docs.apps.cluster.example.com"
    ```

    The docs `Route` reuses the shared `route.annotations` and `route.tls`. If `route.tls.enabled` is set for the models, the same termination and certificate apply to the docs Route, so the certificate must also be valid for `docs.routeHost`.
  </Tab>
</Tabs>

## Apply the change

Set the `docs` values in your `inference_values.yaml` file, then apply them with `helm upgrade -i`. The `-i` (`--install`) flag makes the command idempotent: it installs the release if it does not exist yet, or upgrades it in place if it does. The same command therefore works whether you are enabling the site during the initial install or adding it to a running release. Use the same chart path and flags you used to install. If your install command used `--set-file s3.caBundle=...` because your S3 backend uses a private CA, include that flag when you run `helm upgrade -i` on this page:

```bash theme={null}
helm upgrade -i inference ./charts/inference \
  --namespace poolside-models \
  -f ./inference_values.yaml
```

## Verify

Confirm the docs pod is running:

```bash theme={null}
kubectl get pods -n poolside-models -l app.kubernetes.io/component=public-docs
```

If you exposed the site, request its hostname and confirm it returns the documentation home page:

```bash theme={null}
curl -sI http://docs.poolside.local/
```

The site answers a liveness and readiness check at `/healthz`, which you can use for external monitoring.

## Related resources

* [Install on Amazon EKS](/deployment/cloud/aws-eks/install)
* [Install on OpenShift](/deployment/cloud/openshift/install)
* [Install on Kubernetes](/deployment/cloud/upstream-kubernetes/install)
* [Cloud deployment overview](/deployment/cloud/overview)

# Install on Amazon EKS

> Deploy Poolside model inference on Amazon EKS with Helm, using IRSA for S3 access and an Application Load Balancer for ingress.

Follow these steps to deploy Poolside model inference on your Amazon EKS cluster and serve models through an OpenAI-compatible API. For an overview of this deployment approach and architecture, see [Amazon EKS deployment](/deployment/cloud/aws-eks/overview).

This guide deploys the Poolside inference chart. Each model becomes its own `Deployment`, `Service`, and `Ingress`, reachable at its own hostname through a shared Application Load Balancer.

## Prerequisites

Poolside distributes the Helm deployment bundle as a `.tar.gz` archive. Extract it before you start:

```bash theme={null}
tar -xzf <bundle-name>.tar.gz
cd <bundle-name>
```

Confirm that you are working from the root of the extracted bundle. The bundle root contains the following directories:

```text theme={null}
./scripts/
./containers/
./charts/
```

### Required AWS infrastructure

You provision the following AWS foundation before you deploy the chart. For a turnkey foundation that provisions all of it, apply the Terraform reference architecture in the [`poolsideai/reference_architectures`](https://github.com/poolsideai/reference_architectures/tree/main/aws) repository, or reproduce the same architecture in your own infrastructure-as-code. For the architecture diagram and design decisions, see [Reference architecture](/deployment/cloud/aws-eks/reference-architecture).

* **EKS cluster**, Kubernetes 1.29 or later, with an IAM OIDC provider enabled. The OIDC provider is what makes IRSA work, so the model servers can read checkpoints from S3 without static credentials.
* **GPU node group** with enough GPU memory for the models you deploy. The reference architecture uses `p5e.48xlarge`; `p5` and `p5en` instances also fit. The node group runs an EKS-optimized GPU AMI that can schedule containerized GPU workloads, so each node advertises the `nvidia.com/gpu` resource. Apply the `nvidia.com/gpu=true:NoSchedule` taint to keep non-GPU workloads off these nodes; the chart's default tolerations already tolerate it. These instances are usually not available on demand and need reserved capacity. For instance shapes, model packing, and capacity reservations, see [Reference architecture](/deployment/cloud/aws-eks/reference-architecture#gpu-node-group).
* **NVIDIA GPU Operator** to expose GPUs to the cluster. Run it in one of two modes, depending on your AMI:
  * If the AMI already includes the NVIDIA driver and container toolkit, such as the AL2023 or AL2 NVIDIA accelerated AMIs or the Bottlerocket NVIDIA variant, run the GPU Operator in device-plugin-only mode with the driver and toolkit subcomponents turned off. This is what the reference architecture does.
  * If the AMI ships without drivers, run the full GPU Operator so it installs the driver and container toolkit.
* **AWS Load Balancer Controller**, installed and running in the cluster. It reconciles the per-model `Ingress` objects into an Application Load Balancer. Its admission webhook must be reachable, which requires the controller to have ready pods on schedulable nodes: a controller scaled to zero or stuck `Pending` rejects every `Service` and `Ingress` the chart creates, and the install fails. Tag your subnets for load balancer discovery: `kubernetes.io/role/elb=1` on public subnets for an internet-facing load balancer, or `kubernetes.io/role/internal-elb=1` on private subnets for an internal one.
* **Amazon S3 bucket** for the model checkpoints. Server-side encryption with a KMS key is recommended. Bucket versioning is unnecessary because the checkpoints are content-addressed.
* **Amazon ECR** to host the bundled container images.
* **AWS Certificate Manager certificate** covering the hostnames you assign to the models. The load balancer terminates TLS with this certificate. Decide the per-model hostnames now: you set them as the `ingressHost` values in [Step 6](#step-6-configure-the-values-file), and the certificate must cover every one of them.

<Tip>
  An S3 gateway VPC endpoint keeps checkpoint downloads off your NAT gateways
  and reduces data transfer cost. If your worker nodes pull from Amazon ECR
  through private networking, also configure the Amazon ECR interface VPC
  endpoints required for private image pulls.
</Tip>

### Workstation tools

Install the following tools on the host you use to run the deployment:

* `helm` `3.12` or later
* `kubectl`, configured for your EKS cluster
* `skopeo`, to copy the bundled images into Amazon ECR
* `aws` CLI, to create AWS resources and upload checkpoints to S3
* `jq`, to parse JSON responses from the inference API
* `tar`, to extract the deployment bundle and model checkpoints
* `curl`, to call the inference API
* `eksctl` (optional), to associate an IAM OIDC provider if your cluster lacks one, or to create the IRSA role and service account with the alternative in [Step 4](#step-4-create-the-irsa-role)

**Disk space**

Stage the deployment from a host with tens of GB free. The extracted bundle is roughly 20 GB, because it carries the `atlas` container image, and each model checkpoint is tens of GB more. On a constrained workstation, run the extraction and the uploads from an EC2 instance in the bucket's region that has enough disk, which also speeds up the checkpoint upload, and delete each local copy once it is uploaded.

## Step 1: Create the namespace

The inference stack runs in a single namespace:

```bash theme={null}
kubectl create namespace poolside-models
```

## Step 2: Upload the container images to Amazon ECR

The bundle ships the `atlas` inference server image and the `public-docs` documentation site image as OCI archives under `./containers/`. Copy them into Amazon ECR.

Amazon ECR does not create repositories on push, so create the repositories first. Each repository name must match an image name from the bundle:

```bash theme={null}
for image_name in $(find ./containers -name "*.tar" -type f -exec basename {} .tar \; | sed 's/__.*//' | sort -u); do
  aws ecr describe-repositories --repository-names "$image_name" --region <aws-region> >/dev/null 2>&1 \
    || aws ecr create-repository --repository-name "$image_name" --region <aws-region>
done
```

Authenticate `skopeo` to your ECR registry:

```bash theme={null}
aws ecr get-login-password --region <aws-region> \
  | skopeo login --username AWS --password-stdin <account-id>.dkr.ecr.<aws-region>.amazonaws.com
```

Upload the images with the provided script. Pass your ECR registry host as the target:

```bash theme={null}
chmod +x ./scripts/upload_images.sh
./scripts/upload_images.sh <account-id>.dkr.ecr.<aws-region>.amazonaws.com
```

The script pushes each archive to `<account-id>.dkr.ecr.<aws-region>.amazonaws.com/<image-name>:<image-tag>`. The tags are specific to the bundle you received, not fixed values, and the chart's `image.name`, `image.tag`, `docs.image.name`, and `docs.image.tag` are preset to match the archives, so you set only `image.registry` at install time. You do not need to type the tags anywhere, but you can confirm what was pushed. For example, to inspect the `atlas` image:

```bash theme={null}
aws ecr describe-images --repository-name atlas --region <aws-region> \
  --query 'sort_by(imageDetails,&imagePushedAt)[-1].imageTags' --output text
```

<Note>
  You do not need an image pull secret. The GPU node group's instance role
  authorizes ECR pulls through the AWS-managed
  `AmazonEC2ContainerRegistryReadOnly` policy, so kubelet pulls the image
  directly.
</Note>

## Step 3: Upload model checkpoints to S3

The model servers download their checkpoints from S3 on pod startup, so the checkpoints must be in place before you deploy the chart. Poolside provides the checkpoint files separately from the deployment bundle. Confirm the local path and the destination prefix with your Poolside contact.

Uploading checkpoints is time consuming. Start it now and continue with the remaining steps in parallel.

Poolside ships each model checkpoint as a single `.tar` archive that contains one top-level directory holding the checkpoint files. The model server loads the unpacked files (`*.safetensors`, `*.json`, and the tokenizer files) directly from the prefix you point at, so extract each archive's contents into its own directory.

```bash theme={null}
tar -xf ./checkpoints/<checkpoint-archive>.tar
rm -v ./checkpoints/<checkpoint-archive>.tar
```

Confirm the files sit at the root of the directory, not under a subfolder:

```bash theme={null}
ls ./checkpoints/<model-key>
# config.yaml  generation_config.json  model.safetensors  tokenizer/
```

You choose the S3 layout. Give each model its own prefix, because every model entry in the values file points at one prefix. The command below preserves the local directory structure, so `./checkpoints/laguna-m` and `./checkpoints/laguna-xs` upload to `checkpoints/laguna-m` and `checkpoints/laguna-xs` under the bucket:

```bash theme={null}
aws s3 cp ./checkpoints s3://<bucket-name>/checkpoints --recursive --region <aws-region>
```

Note the full `s3://` prefix for each model. You reference it in the `models.<key>.model` paths in [Step 6](#step-6-configure-the-values-file), and the paths must match what you uploaded exactly: a misspelled or missing prefix downloads nothing and the pod never starts.

<Note>
  Checkpoints are typically tens of GB per model. To speed up the transfer, run
  the upload from an EC2 instance in the same region as the bucket, and tune
  `aws configure set default.s3.max_concurrent_requests` and
  `default.s3.multipart_chunksize`.
</Note>

## Step 4: Create the IRSA role

The model servers read checkpoints from S3 through an IAM role assumed by the `inference` service account. This is the recommended path on EKS, and it keeps static AWS credentials out of the cluster.

Save the following permissions policy to a file named `inference-pod-policy.json`. It grants read-only access to the checkpoint bucket and decrypt access to the bucket's KMS key, and nothing else:

```json title="inference-pod-policy.json" theme={null}
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ListBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::<bucket-name>"
    },
    {
      "Sid": "S3ReadObjects",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:GetObjectTagging"],
      "Resource": "arn:aws:s3:::<bucket-name>/*"
    },
    {
      "Sid": "S3GetBucketLocation",
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation"],
      "Resource": "*"
    },
    {
      "Sid": "KMSDecryptForS3",
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:DescribeKey"],
      "Resource": "<s3-kms-key-arn>"
    }
  ]
}
```

If the checkpoint bucket uses SSE-S3 rather than SSE-KMS, omit the `KMSDecryptForS3` statement.

Save the role's trust policy to a file named `inference-pod-trust.json`. It allows the cluster's OIDC provider to assume the role only for the `inference` service account in the `poolside-models` namespace:

```json title="inference-pod-trust.json" theme={null}
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account-id>:oidc-provider/<oidc-provider>"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "<oidc-provider>:aud": "sts.amazonaws.com",
          "<oidc-provider>:sub": "system:serviceaccount:poolside-models:inference"
        }
      }
    }
  ]
}
```

Replace `<oidc-provider>` with your cluster's OIDC issuer host and path, such as `oidc.eks.<aws-region>.amazonaws.com/id/<oidc-id>`. Retrieve it from the cluster, stripping the `https://` scheme:

```bash theme={null}
aws eks describe-cluster --name <cluster-name> --region <aws-region> \
  --query 'cluster.identity.oidc.issuer' --output text \
  | sed 's#^https://##'
```

If the command returns no issuer, the cluster has no IAM OIDC provider yet. Associate one before you create the role, either through the reference architecture's Terraform or with `eksctl utils associate-iam-oidc-provider --cluster <cluster-name> --approve`.

<Note>
  The trust policy's `sub` condition embeds the namespace:
  `system:serviceaccount:poolside-models:inference`. This guide deploys into
  `poolside-models`. If you deploy into a different namespace, change the
  namespace in the `sub` value to match, or the model servers get `AccessDenied`
  when they read from S3.
</Note>

Create the policy from `inference-pod-policy.json`, create the role with the trust policy from `inference-pod-trust.json`, and attach the policy to the role:

```bash theme={null}
aws iam create-policy \
  --policy-name inference-pod-policy \
  --policy-document file://inference-pod-policy.json

aws iam create-role \
  --role-name inference-pod-role \
  --assume-role-policy-document file://inference-pod-trust.json

aws iam attach-role-policy \
  --role-name inference-pod-role \
  --policy-arn arn:aws:iam::<account-id>:policy/inference-pod-policy
```

The role's ARN is `arn:aws:iam::<account-id>:role/inference-pod-role`. In [Step 6](#step-6-configure-the-values-file), you annotate the chart's service account with this ARN, and the chart creates the annotated `inference` service account for you.

<Accordion title="Alternative: create the role and service account with eksctl">
  `eksctl create iamserviceaccount` creates the IAM role and the Kubernetes service account together, and builds the trust policy for you, so you do not need `inference-pod-trust.json`. You still create the permissions policy first, because `--attach-policy-arn` attaches an existing policy:

  ```bash theme={null}
  aws iam create-policy \
    --policy-name inference-pod-policy \
    --policy-document file://inference-pod-policy.json

  eksctl create iamserviceaccount \
    --cluster <cluster-name> \
    --namespace poolside-models \
    --name inference \
    --attach-policy-arn arn:aws:iam::<account-id>:policy/inference-pod-policy \
    --approve
  ```

  Because `eksctl` already creates the service account, set `serviceAccount.create: false` and `serviceAccount.name: inference` in your values file so the chart uses the existing account instead of creating a second one.
</Accordion>

<Note>
  If you cannot use IRSA, create a Kubernetes secret with static credentials and set `s3.secretName` in your values file instead:

  ```bash theme={null}
  kubectl create secret generic aws-credentials \
    --from-literal=AWS_ACCESS_KEY_ID=<access-key-id> \
    --from-literal=AWS_SECRET_ACCESS_KEY=<secret-access-key> \
    -n poolside-models
  ```
</Note>

## Step 5: Create the API key secret (recommended for internet-facing)

To require an API key on the model servers, create a secret containing the key in `poolside-models`:

```bash theme={null}
kubectl create secret generic vllm-auth \
  --from-literal=VLLM_API_KEY=<vllm-api-key> \
  -n poolside-models
```

Reference it through `authentication.secretName` in the next step. For an internet-facing load balancer, Poolside strongly recommends enabling an API key; for an internal load balancer it is optional.

## Step 6: Configure the values file

Create an `inference_values.yaml` file in the bundle root. Set the fields that apply to your environment. The example below deploys two Laguna model variants, exposes each through its own ALB ingress, and reads checkpoints through IRSA:

```yaml title="Example: inference_values.yaml" theme={null}
# Name the release resources "inference" so the service account matches the IRSA trust subject
fullnameOverride: inference

image:
  # Registry the atlas image was uploaded to in Step 2
  registry: <account-id>.dkr.ecr.<aws-region>.amazonaws.com

serviceAccount:
  create: true
  annotations:
    # ARN of the IRSA role from Step 4
    eks.amazonaws.com/role-arn: arn:aws:iam::<account-id>:role/inference-pod-role

# Required on EKS. Unlike OpenShift, upstream Kubernetes does not assign a user ID automatically
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 10003
  seccompProfile:
    type: RuntimeDefault

authentication:
  # API key auth. Strongly recommended for an internet-facing load balancer.
  # Uses the Step 5 secret; set to "" to disable (reasonable only for an internal LB).
  secretName: vllm-auth

ingress:
  enabled: true
  className: alb
  annotations:
    # Use "internal" for a VPC-internal load balancer
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-TLS13-1-2-2021-06
    alb.ingress.kubernetes.io/group.name: poolside
    # ARN of the ACM certificate covering the model hostnames below
    alb.ingress.kubernetes.io/certificate-arn: <acm-certificate-arn>
    alb.ingress.kubernetes.io/healthcheck-path: /health

models:
  laguna-xs:
    model: s3://<bucket-name>/checkpoints/laguna-xs
    modelName: Lagunaxs
    modelType: agent
    gpus: 1
    ingressHost: <laguna-xs-hostname>
  laguna-m:
    model: s3://<bucket-name>/checkpoints/laguna-m
    modelName: Lagunam
    modelType: agent
    gpus: 4
    ingressHost: <laguna-m-hostname>
```

The checkpoint paths in `models.<key>.model` must match the locations you uploaded in [Step 3](#step-3-upload-model-checkpoints-to-s3). The `image.name` and `image.tag` fields default to the values that match the bundled archive, so you do not set them.

<Warning>
  The example exposes the models through an internet-facing load balancer.
  Poolside strongly recommends enabling API-key authentication on any
  internet-facing endpoint, so the example sets `authentication.secretName` to
  the secret from [Step
  5](#step-5-create-the-api-key-secret-recommended-for-internet-facing). The
  chart does not enforce this: if you set `secretName: ""`, the endpoint is
  reachable without a key. Only do that for an `internal` load balancer.
</Warning>

<Note>
  Each model is exposed at its own hostname through a separate `Ingress` named `inference-<model-key>`. The ingresses share the `poolside` load balancer group, so the AWS Load Balancer Controller provisions one Application Load Balancer for all of them. Give every model a unique `ingressHost`, and point each hostname's DNS record at the load balancer once it is provisioned.
</Note>

**Model type**

Each model's `modelType` selects the default serving arguments for that class of model. It takes one of three values:

* `agent`: Defaults for agent models.
* `agent_small`: Agent defaults with the context length and batch size capped for smaller models or GPUs with less memory.
* `completion`: Defaults for completion models.

Poolside specifies the `modelType` for each model in your bundle. Use the value provided for your checkpoint; the example above reflects the current Laguna models.

**GPU count and tensor parallelism**

Set `gpus` to the number of GPUs each model needs. The model server reads the number of GPUs allocated to its pod and shards the model across them, so you do not pass a tensor-parallel-size argument. The number of GPUs must be a value the server supports, such as 1, 2, 4, or 8, and your hardware must provide enough GPU memory for the model and workload. For planning estimates, see [Supported configurations](/deployment/supported-configurations).

## Step 7: Install the chart

Install the `inference` chart into `poolside-models`:

```bash theme={null}
helm install inference ./charts/inference \
  --namespace poolside-models \
  -f ./inference_values.yaml
```

## Step 8: Verify the deployment

Check that the model pods are running:

```bash theme={null}
kubectl get pods -n poolside-models
```

Each model server takes time to become ready on first start because it downloads its checkpoint from S3. Watch a model's logs to track progress, where `<model-key>` is the key you set under `models` in the values file, such as `laguna-m`:

```bash theme={null}
kubectl logs -f -n poolside-models deploy/inference-<model-key>
```

Confirm that an ingress was created for each model and that the load balancer has an address:

```bash theme={null}
kubectl get ingress -n poolside-models
```

Create or update a DNS record for each `ingressHost`, pointing it at the load balancer address. Then confirm routing works, where `<model-hostname>` is the `ingressHost` you set for that model:

```bash theme={null}
curl -s https://<model-hostname>/v1/models \
  -H "Authorization: Bearer <vllm-api-key>"
```

If API key authentication is off, omit the `Authorization` header.

## Step 9: Call the inference API

Each model serves the OpenAI-compatible API at its own hostname. The base URL has the form:

```text theme={null}
https://<model-hostname>/v1
```

Requests are routed to a model by hostname, so each hostname serves exactly one model. The `model` field in the request body is the served model name (`modelName`), which the server validates against what it loaded. It does not need to be unique across models, because the hostname already selects the backend: in the example values, both Laguna variants use the `modelName` `Laguna` but answer at different hostnames.

Send a chat completion request, where `<served-model-name>` is the model's `modelName`:

```bash theme={null}
curl https://<model-hostname>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "<served-model-name>",
    "messages": [{"role": "user", "content": "Write a function that reverses a string."}]
  }'
```

For example, to call the `laguna-m` model served as `Laguna`:

```bash theme={null}
curl https://laguna-m.example.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Laguna",
    "messages": [{"role": "user", "content": "Write a function that reverses a string."}]
  }'
```

If you enabled API key authentication in [Step 5](#step-5-create-the-api-key-secret-recommended-for-internet-facing), include the key as a bearer token:

```bash theme={null}
curl https://<model-hostname>/v1/chat/completions \
  -H "Authorization: Bearer <vllm-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "<served-model-name>",
    "messages": [{"role": "user", "content": "Write a function that reverses a string."}]
  }'
```

## TLS

The load balancer terminates TLS with the ACM certificate you set in `alb.ingress.kubernetes.io/certificate-arn`, and the `listen-ports` and `ssl-redirect` annotations in [Step 6](#step-6-configure-the-values-file) serve every model over HTTPS on port 443 and redirect HTTP to HTTPS. To cover additional hostnames, issue or import a certificate in AWS Certificate Manager that includes them, then update the `certificate-arn` annotation. Unlike the upstream Kubernetes deployment, you do not create a TLS secret in the cluster or add a `tls` block to the values file.

## Offline documentation (optional)

The bundle also ships the Poolside documentation site, which the same `inference` chart can deploy in-cluster so operators have local access to the docs. It is off by default. To enable and expose it through the Application Load Balancer, see [Set up offline documentation](/deployment/cloud/set-up-offline-documentation).

## Troubleshooting

* If a model pod is `Pending`, confirm the cluster has enough GPUs for the `gpus` value you requested and that the NVIDIA GPU Operator is healthy. Run `kubectl describe pod <pod-name> -n poolside-models` and check the scheduling events.
* If pods stay in `Init` or restart in a loop, check the init container logs with `kubectl logs -n poolside-models <pod-name> -c model-downloader`. A stale or misspelled checkpoint path syncs nothing and the pod never starts. An `AccessDenied` error usually means the IRSA role's policy does not cover the bucket or its KMS key.
* If the load balancer never receives an address, confirm the AWS Load Balancer Controller is running and that your subnets carry the `kubernetes.io/role/elb` or `kubernetes.io/role/internal-elb` tags. Check the controller logs for the `Ingress` events.
* If requests return a 5xx from the load balancer, confirm the target group is healthy. The ALB health check uses `/health` on each model's port; a model that is still downloading its checkpoint stays unhealthy until it is ready.
* If image pulls fail, confirm the GPU node group's instance role has the `AmazonEC2ContainerRegistryReadOnly` policy and that the `atlas` repository exists in ECR.
* If `helm install` fails with `no endpoints available for service "aws-load-balancer-webhook-service"`, the AWS Load Balancer Controller has no ready pods, so its admission webhook rejects the `Service` objects the chart creates. Confirm the controller is running with `kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller`, make sure the cluster has schedulable nodes, then run `helm install` again.
* If model pods never become ready and the init container logs show no checkpoint files synced, the S3 prefix may hold the checkpoint `.tar` instead of its extracted contents. The downloader only fetches unpacked files such as `*.safetensors` and `*.json`. Extract the archive and re-upload its contents, as in [Step 3](#step-3-upload-model-checkpoints-to-s3).

## Related resources

* [Amazon EKS deployment](/deployment/cloud/aws-eks/overview)
* [Manage models on Amazon EKS](/deployment/cloud/aws-eks/manage-models)
* [Upgrade on Amazon EKS](/deployment/cloud/aws-eks/upgrade)
* [Remove from Amazon EKS](/deployment/cloud/aws-eks/remove)

For questions about hardware requirements, infrastructure configuration, or deployment issues, contact Poolside support.

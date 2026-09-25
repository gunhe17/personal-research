# Reference architecture

> AWS reference architecture for a Poolside model inference deployment on Amazon EKS, including the architecture diagram, the AWS layers the inference chart depends on, and the key design decisions.

Use this page to plan a model inference deployment on Amazon EKS and to align on the key decisions before you install. It describes the AWS foundation that the Poolside inference chart runs on, the diagram for that foundation, and the opinions that distinguish it from a generic EKS install.

You provision the AWS infrastructure. Poolside provides the deployment bundle with the `inference` Helm chart, and an optional Terraform reference stack that provisions the same foundation. You can apply the Terraform as published, fork it, or reproduce the architecture by hand against your own infrastructure-as-code standards. In every case the same chart from the bundle installs onto the resulting cluster.

The reference architecture is published in the [`poolsideai/reference_architectures`](https://github.com/poolsideai/reference_architectures/tree/main/aws) repository, alongside the Terraform modules, example roots, and supporting documentation.

## Architecture

<img src="https://mintcdn.com/poolside/kkMWX_7zqePBFTSJ/images/reference-architectures/poolside-inference-aws-1.0.png?fit=max&auto=format&n=kkMWX_7zqePBFTSJ&q=85&s=35d80a94acb63267b232b66635ca41b8" alt="Poolside inference reference architecture for AWS, showing the VPC, EKS cluster with a GPU node group, per-model Deployments behind an Application Load Balancer, and IRSA-based access to the S3 checkpoint bucket and Amazon ECR" width="2440" height="2520" data-path="images/reference-architectures/poolside-inference-aws-1.0.png" />

The inference deployment relies on the following AWS layers.

### Network

A VPC with public and private subnets across multiple availability zones:

* **Public subnets**: the internet-facing Application Load Balancer, when you expose models outside the VPC.
* **Private worker subnets**: the EKS worker nodes, with outbound internet through NAT gateways.

An S3 gateway VPC endpoint routes checkpoint downloads directly to Amazon S3, bypassing the NAT gateways and reducing data transfer cost. If your worker nodes pull from Amazon ECR through private networking, the network also needs the Amazon ECR interface VPC endpoints required for private image pulls.

### EKS cluster

A managed Kubernetes cluster, version 1.29 or later, with an IAM OIDC provider enabled. The OIDC provider is what makes IRSA work, so the model servers read checkpoints from S3 without static credentials.

### GPU node group

A GPU node group with enough GPU memory for the models you deploy, running an EKS-optimized GPU AMI and the NVIDIA GPU Operator so each node advertises the `nvidia.com/gpu` resource. The reference architecture sets `p5e.48xlarge` as the minimum instance type for the supported model performance profile. `p5en.48xlarge` and `p5.48xlarge` are the other supported shapes.

A `p5e.48xlarge` node provides eight H200 GPUs. You place models on the node by GPU count rather than by instance: each model's `gpus` value reserves that many GPUs, and several models share a node until its GPUs are used up. To begin planning model placement, compare its [estimated total GPU memory](/deployment/supported-configurations#planning-estimates) with the total memory available across the assigned [GPU type](/deployment/supported-configurations#gpu-types). Confirm the GPU count for each model with your Poolside account team.

**Node volume sizing**

Size each GPU node's root volume for what the model servers stage locally, not only for the operating system and image. On startup, a model server downloads its entire checkpoint, which is tens of GB, onto the node, on top of the `atlas` image. A default-sized node volume can fill before the pod becomes ready. The reference deployment uses a 300 GB node volume.

**Scheduling under the GPU taint**

The GPU nodes carry the `nvidia.com/gpu=true:NoSchedule` taint, which has two scheduling consequences. Provision a separate non-GPU node group for the cluster controllers that are not GPU workloads, such as the AWS Load Balancer Controller and the GPU Operator's controller, so they have somewhere to run. Configure the GPU Operator's node-level components, including its Node Feature Discovery worker, to tolerate the taint, or they cannot run on the GPU nodes and the nodes never advertise the `nvidia.com/gpu` resource.

**Capacity**

The supported GPU instances are in high demand and are usually not available on demand. To guarantee an instance, reserve capacity before you create the node group, either an On-Demand Capacity Reservation or an EC2 Capacity Block for ML, then launch the node group into the reservation.

* The reference Terraform consumes a reservation for you: set the capacity reservation or capacity block input on the GPU node group, and the launch template targets it.
* If you provision the node group yourself, target the reservation explicitly in the node group's launch template. A managed node group does not consume a Capacity Reservation unless its launch template names that reservation, and a RAM-shared targeted reservation from another account is not consumed automatically.

For the mechanics of reserving capacity, see the AWS documentation on [On-Demand Capacity Reservations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-using.html) and [Capacity Blocks for ML](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-blocks.html).

### Object storage and registry

* **Amazon S3** for the model checkpoints, with server-side encryption using a customer-managed KMS key.
* **Amazon ECR** for the `atlas` inference container image, with pulls authorized by the GPU node group's instance role.

### Ingress and TLS

The AWS Load Balancer Controller reconciles the per-model `Ingress` objects into a shared Application Load Balancer. The load balancer terminates TLS with an AWS Certificate Manager certificate that covers the model hostnames.

### Access

IRSA on the shared `inference` service account grants the model servers read-only access to the checkpoint bucket and decrypt access to its KMS key, and nothing else.

## Key opinions

The reference architecture commits to the following decisions. They distinguish it from a generic Amazon EKS install. If you reproduce the architecture by hand, follow them to stay aligned with what Poolside support and the rest of this documentation expect.

* **IRSA for object storage**: the model servers reach S3 through an IAM role assumed by the `inference` service account, not a mounted credentials secret.
* **ALB ingress**: traffic enters the cluster through the AWS Load Balancer Controller, which provisions one shared Application Load Balancer for all models.
* **Customer-managed KMS key for S3**: the checkpoint bucket uses SSE-KMS with a key you control, and the IRSA policy grants decrypt access to that key.
* **Minimum GPU instance type `p5e.48xlarge`**: required for the supported model performance profile.

## Use the reference architecture

You can use the reference architecture in three ways:

* **Apply it directly**: Clone the repository, configure the example for your environment, and run `terraform apply`.
* **Fork it**: Take the example as a starting point and adapt the inputs, modules, or wrapper to your standards.
* **Reproduce it by hand**: Use the architecture and the opinions on this page as a specification, and build the equivalent foundation in your own infrastructure-as-code.

For the full set of AWS resources, the Terraform modules, and the example roots, see the [`poolsideai/reference_architectures`](https://github.com/poolsideai/reference_architectures/tree/main/aws) repository.

## Related resources

* [Amazon EKS deployment](/deployment/cloud/aws-eks/overview)
* [Install on Amazon EKS](/deployment/cloud/aws-eks/install)
* [Manage models on Amazon EKS](/deployment/cloud/aws-eks/manage-models)
* [Supported configurations](/deployment/supported-configurations)

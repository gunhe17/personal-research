# On-premises deployment

> Overview of Poolside on-premises model inference deployments, including hardware options, architecture, installation approach, and operational considerations.

## Introduction

Poolside on-premises allows you to deploy Poolside model inference on your own hardware. This is useful for organizations that want to serve models from infrastructure they control, have specific security requirements, must be air-gapped, have limited internet access, or have compliance requirements that prevent them from using cloud-based inference.

<Note>This page focuses on single-node configurations. For multi-node sizing and validation, contact your Poolside representative.</Note>

## On-premises hardware options

Poolside offers multiple on-premises hardware options optimized for different model inference scales. Larger HGX-based systems are intended for enterprise-scale usage, while RTX-based workstation configurations are suitable for smaller teams and departmental deployments.

|                       | Option 1:<br />Customer-provided hardware (BYO)                                         | Option 2:<br />Turnkey HGX rack (Dell or Supermicro)     | Option 3:<br />Turnkey GPU workstation tower                     | Option 4:<br />Turnkey GPU workstation rack                              |
| --------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **GPU**               | 8× NVIDIA H200 SXM (recommended) (HGX baseboard, 1128 GB total VRAM)                    | 8× NVIDIA H200 SXM (HGX baseboard, 1128 GB total VRAM)   | 4× NVIDIA RTX 6000 Blackwell Max-Q (PCIe, 96 GB GDDR6 each)      | 8× NVIDIA RTX 6000 Blackwell Server Edition (PCIe, 96 GB GDDR6 each, 5U) |
| **Description**       | Suitable for large enterprise teams                                                     | Fully integrated HGX rack solution validated by Poolside | Workstation-based option for smaller teams and individual groups | Rack-mounted workstation option for mid-sized teams                      |
| **Recommended scale** | Large enterprise teams                                                                  | Large enterprise teams                                   | Small teams and individual groups                                | Mid-sized teams                                                          |
| **Operating system**  | Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, SUSE Linux Enterprise Server (SLES) 16, or RHEL 9.6 | -                                                        | -                                                                | -                                                                        |
| **CPU**               | Customer-provided CPU (128+ cores, 3.0 GHz or higher)                                   | 2× AMD EPYC 9555 (64 cores, 3.2–4.4 GHz)                 | Intel Xeon w9-3575X (44 cores)                                   | 2× Intel Xeon 6960P (72 cores each)                                      |
| **Memory**            | 1 TB DDR5 recommended<br />(512 GB minimum for low-concurrency or PoC environments)     | 1 TB DDR5<br />(12× 96 GB, 4800 MT/s)                    | 512 GB DDR5<br />(8× 64 GB, 4800 MT/s)                           | 1 TB DDR5<br />(16× 64 GB, 4800 MT/s)                                    |
| **Network**           | Dual 10G+ ethernet, 1G IPMI                                                             | Dual 10G RJ45, 1G IPMI                                   | 10 GbE NIC                                                       | Dual 10 GbE NICs                                                         |
| **Storage**           | See [Storage requirements](/deployment/on-prem/storage).                                | See [Storage requirements](/deployment/on-prem/storage). | See [Storage requirements](/deployment/on-prem/storage).         | See [Storage requirements](/deployment/on-prem/storage).                 |

### Sizing and deployment notes

* Customer-provided hardware (option 1) can start with 4× H200 GPUs; however, capacity must be validated based on your intended workload.
* Scale guidance assumes mixed usage of chat, completion, and agent workloads. Select a model based on your workload and available hardware. Compare current model capabilities in [Supported models](/get-started/supported-models).
* Actual capacity depends on concurrency levels, model selection, and usage patterns. For concurrent-agent capacity and developer-seat estimates, contact your Poolside account team.
* Poolside validates all on-premises hardware configurations before deployment.
* Review the official power and electrical specifications provided by the hardware vendor before deployment. Certain workstation configurations may require dedicated high-capacity circuits and specialized cooling. Confirm your hosting environment meets the required power and cooling specifications.

## Architecture

On-premises model inference deployments run on a single RKE2 Kubernetes cluster. While you can configure multiple model replicas for increased throughput, single-node on-premises deployments do not provide high availability against hardware failures. For multi-node sizing and validation, contact your Poolside representative.

The on-premises architecture includes:

* RKE2 Kubernetes
* Poolside model inference workloads
* S3-compatible object storage for model checkpoints
* A local container registry
* `cert-manager` for self-signed certificates
* NVIDIA GPU Operator for GPU access in RKE2 workloads
* Ingress for model inference endpoints

Kubernetes (RKE2), the container runtime, GPU support, and supporting services are installed and configured as part of the on-premises installation procedure.

<img src="https://mintcdn.com/poolside/kkMWX_7zqePBFTSJ/images/reference-architectures/poolside-onprem-airgap.png?fit=max&auto=format&n=kkMWX_7zqePBFTSJ&q=85&s=9fc9d858e101372370f59ed80f0e0335" alt="Architecture Diagram" width="3580" height="2600" data-path="images/reference-architectures/poolside-onprem-airgap.png" />

## Installation

Poolside on-premises model inference uses a step-based Terraform deployment process:

1. Prepare the host and install operating-system-specific prerequisites.
2. Install RKE2 infrastructure.
3. Install supporting infrastructure services.
4. Upload model checkpoints.
5. Deploy model inference and ingress.

Installation is performed using Terraform modules that include all providers and dependencies. The installation bundle can be used in internet-connected or air-gapped environments.

## Operational responsibilities

For all on-premises deployments, your organization is responsible for:

* **Infrastructure resilience**: Power redundancy, cooling, and physical security
* **Data protection**: Backup strategies for object storage and model checkpoint artifacts
* **System monitoring**: Resource utilization, health checks, and alerting infrastructure
* **Network security**: Firewall rules, network segmentation, and access controls
* **Network bandwidth**: Sufficient bandwidth for model checkpoint downloads and inference traffic
* **Capacity planning**: Scaling decisions based on user load and model requirements
* **Disaster recovery**: Business continuity planning and recovery procedures

<Warning>Poolside provides the validated software stack and deployment automation. Ongoing infrastructure operations, monitoring, and data protection remain your organization's responsibility.</Warning>

## Related resources

* [Install on-premises](/deployment/on-prem/install)
* [Storage requirements](/deployment/on-prem/storage)

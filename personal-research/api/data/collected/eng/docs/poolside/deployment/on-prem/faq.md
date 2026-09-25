# On-premises deployment FAQ

> Answers to common questions about Poolside on-premises model inference deployments.

## Hardware recommendations

### What hardware configuration do you recommend for my team size?

Hardware requirements depend on model selection, expected concurrency, and inference usage patterns. Poolside offers on-premises configurations for smaller teams, mid-sized teams, and large enterprise deployments. Contact Poolside to get a recommended configuration for your intended workload. For an overview of supported hardware options, see [On-premises deployment](/deployment/on-prem/overview#on-premises-hardware-options).

### Would you recommend 8x RTX 6000 or 2x H200 if that is the hardware available?

Poolside supports an 8x RTX 6000 workstation-rack configuration for on-premises deployments. For BYO H200 systems, Poolside starts at 4x H200 with capacity validation, and the recommended H200 configuration is 8x H200. A 2x H200 configuration is not a documented supported on-premises configuration.

If your choice is between a supported 8x RTX 6000 configuration and a 2x H200 configuration, use the 8x RTX 6000 option. If you need H200-specific performance characteristics, contact your Poolside account team to validate the hardware against your intended usage.

### Do new Poolside models run on hardware acquired for previous models?

Yes. Laguna runs on currently supported GPU types: RTX 6000 Blackwell and H200. Existing on-premises deployments that meet the recommended hardware requirements for Malibu 2.2 can run Laguna without changes to the underlying hardware. For concurrent-agent capacity by hardware tier and model, see [Capacity planning](/deployment/capacity-planning).

### Which Laguna model should I choose?

The choice depends on your workload mix and available hardware. Compare current model capabilities in [Supported models](/get-started/supported-models). For deployment-specific capacity guidance, contact your Poolside account team.

## Multi-tenant isolation

### I need to onboard two sovereign customers on the same infrastructure. What do you recommend for isolation?

Current on-premises offerings do not provide multi-tenant isolation within a single Poolside deployment. If full tenant isolation is required, deploy separate physical Poolside instances.

## Shared infrastructure

### Can I share a Poolside server with other applications, or must it be dedicated to Poolside?

Poolside on-premises model inference deployments use CPU, memory, storage, network, and GPU resources on the system. Each on-premises Poolside offering is sized for the intended workload, and Poolside systems should not be shared with unrelated applications unless Poolside validates that configuration.

## Platform support

### We have a GPU as a service platform. Do you support OpenShift?

Yes. Poolside supports Red Hat OpenShift as a deployment path. For more information, see [Supported configurations](/deployment/supported-configurations) and [OpenShift deployment](/deployment/cloud/openshift/overview).

### We have a GPU as a service platform. Do you support Canonical?

Poolside supports self-managed Kubernetes environments such as RKE2 or Charmed Kubernetes. For the current supported deployment paths, see [Supported configurations](/deployment/supported-configurations).

If you are evaluating a Canonical-managed GPU platform beyond the documented deployment paths, contact your Poolside account team to confirm support requirements and scope.

### Do you have documentation, reports, or certifications that validate deployment in classified environments?

Poolside supports STIG hardening for Red Hat Enterprise Linux (RHEL) and Ubuntu on on-premises deployments. For deployment guidance, see [STIG hardening considerations](/deployment/on-prem/stig).

For certified software stack details, see [Certified stacks](/deployment/on-prem/certified-stacks/overview). For other certifications, reports, or Software Bill of Materials (SBOM) requests, contact Poolside for further evaluation and assistance.

## Upgrades and updates

### How often do you release updates for model and software changes?

Poolside releases deployment software and model checkpoints on separate schedules. Contact Poolside for the release cadence that applies to your deployment.

### How do you update the solution in air-gapped environments?

For air-gapped environments, updates are delivered as self-contained deployment bundles. The bundle includes the Terraform providers, deployment artifacts, and container images required for the update. Model checkpoints are provided with the initial installation and as new checkpoints become available.

For the upgrade procedure, see [Upgrade on-premises](/deployment/on-prem/upgrade).

## Support

### What is the SLA for support?

For details on support eligibility, scope, contact options, and service-level agreement response times, see [Support overview](/support/overview) and [Standard support](/support/standard-support).

### What are the disaster recovery guidelines to support rapid recovery on new infrastructure?

Your organization is responsible for disaster recovery planning for on-premises deployments. Key areas to address include:

* **Model checkpoint artifacts**: Maintain access to model checkpoint files and any artifacts required to re-upload models.
* **Object storage data**: Back up S3-compatible object storage if your recovery plan depends on restoring the existing model storage state instead of re-uploading checkpoints.
* **Deployment configuration**: Maintain copies of deployment bundles, `terraform.tfvars` customizations, certificates, DNS records, and any Terraform state or generated files required to redeploy.
* **Infrastructure recovery**: Maintain a plan for replacing the deployment host, restoring storage, and validating GPUs.

For more operational responsibilities, see [On-premises deployment](/deployment/on-prem/overview#operational-responsibilities).

## Related resources

* [On-premises deployment](/deployment/on-prem/overview)
* [Install on-premises](/deployment/on-prem/install)
* [Upgrade on-premises](/deployment/on-prem/upgrade)
* [Admin toolkit](/deployment/on-prem/admin)

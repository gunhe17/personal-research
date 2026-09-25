# Support Overview

> Overview of Poolside support offerings, eligibility requirements, and options for non-standard deployments

Poolside offers two support tiers:

* **Standard Support** is included with every support subscription and provides access to expert support engineers for eligible deployments. See [Standard Support](/support/standard-support) for response time SLAs.
* **Premium Support** is an upgrade to Standard Support and provides faster response times and 24/7 availability for urgent tickets for eligible deployments. See [Premium Support](/support/premium-support) for response time SLAs. Contact your account representative to add Premium Support to your subscription.

Both tiers cover the same scope.

## Scope of support

Poolside support covers issues with the products and topics listed below. Issues outside this scope receive best-effort assistance only. If you need help with excluded topics, contact your account representative.

### In scope

**Poolside models**

* Model availability and access
* Unexpected model behavior or defects
* Model version and compatibility questions
* Software updates and security patches

**Poolside inference**

* Inference API availability, reliability, and error rates
* API authentication and authorization
* Request and response handling issues
* Performance and latency degradation
* Configuration in supported environments

**Poolside Agent CLI**

* Installation, updates, and configuration
* Authentication and connectivity to the inference API
* CLI command behavior and troubleshooting

### Out of scope

**Infrastructure and networking**

* Kubernetes clusters, databases, object storage, and secret storage
* Infrastructure provisioning, configuration, networking, DNS, routing, and maintenance
* AWS and on-premises infrastructure

**Third-party and custom components**

* Third-party integrations or plugins
* Custom ingress controllers, service meshes, and CNI plugins
* Custom modifications to Poolside code or configuration
* Issues caused by your cluster configuration or infrastructure

**Operations and administration**

* Database administration
* Dashboard creation or optimization (for example, Grafana)
* Helm chart deployment onto your infrastructure

## Support Eligibility

To qualify for support, your deployment must meet the following requirements:

1. **Environment Tracking.** All deployments must be tracked and registered by Poolside. Untracked environments must complete a Poolside review before becoming eligible. Submit a [support request](/support/submit-a-support-request) to request a review or get a listing of tracked environments.

2. **Supported configuration.** The deployment must meet the requirements in [Supported configurations](/deployment/supported-configurations).

3. **Change approval.** Customer modifications to deployment scripts, configurations, or infrastructure require prior written approval from Poolside.

4. **Authentication.** One of the following:
   * Poolside-provided Keycloak instance
   * Customer OpenID Connect (OIDC)-compliant identity provider (Okta, Entra ID, etc.)

5. **Security configuration.** One of the following:
   * Default OS security configuration
   * STIG-hardened configuration using Poolside-validated baselines with documented exceptions. For supported baseline versions and exception guidance, see [STIG hardening considerations](/deployment/on-prem/stig#supported-operating-systems-and-stig-baselines).

## Frequently Asked Questions

**Our security team requires hardening beyond STIG. Is that supported?**
Additional hardening beyond published STIG baselines requires a non-recurring engineering (NRE) engagement. We'll work with your security team to test specific controls and document any required exceptions.

**Is installing agents like ClamAV, Splunk, or other system monitoring tools supported?**
Yes, you may install third-party agents, but please contact Poolside so we can track which agents are deployed in which environments. Note that issues arising from those agents fall outside the scope of standard support.

**Our team modified deployment scripts without prior approval. What happens?**
Unapproved modifications fall outside Standard Support. The customer assumes responsibility for testing and troubleshooting. Contact your Poolside solutions team to evaluate whether the modifications can be brought into standard support scope.

**Do Service Level Agreements (SLAs) apply to custom deployments?**
No. SLA commitments apply only to deployments meeting the standard supported configuration. Custom deployments receive best-effort support unless an NRE engagement is in place.

**Can we use a non-AWS cloud provider?**
Not under standard support. Non-AWS deployments require an NRE engagement to validate and support.

**Should we notify Poolside before upgrading our deployment or model configuration?**
Yes. Submit a [support request](/support/submit-a-support-request) at least two weeks before the planned upgrade. Include the environment you plan to upgrade and the target upgrade date. Poolside Support reviews the request and confirms whether internal resources are needed.

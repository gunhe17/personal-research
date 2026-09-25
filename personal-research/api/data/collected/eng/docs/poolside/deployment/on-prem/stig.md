# STIG hardening considerations

> Considerations for deploying Poolside on-premises model inference on STIG-hardened systems, including known compatibility issues and recommended configurations.

## Introduction

Use these guidelines when you deploy Poolside on-premises model inference on STIG-hardened Red Hat Enterprise Linux (RHEL) or Ubuntu systems. This page outlines key considerations, known compatibility issues, and recommended configurations for high-security environments that require Defense Information Systems Agency (DISA) Security Technical Implementation Guide (STIG) compliance.

For the full list of supported operating systems, see [Install on-premises](/deployment/on-prem/install#overview). This page covers only the operating systems with Poolside STIG guidance.

These recommendations draw from the [DISA STIG library](https://www.cyber.mil/stigs/) and related STIG references. Poolside does not provide STIG-specific implementation guidance or support for customer-defined STIG policies.

## Supported operating systems and STIG baselines

The following table lists the operating systems with Poolside STIG guidance for on-premises model inference deployments, along with the STIG baselines Poolside has validated and any baselines still under evaluation.

| OS                              | Version   | STIG baseline               | Status                               |
| ------------------------------- | --------- | --------------------------- | ------------------------------------ |
| Ubuntu                          | 22.04 LTS | DISA STIG Ubuntu 22.04 v2r7 | Supported with documented exceptions |
| Red Hat Enterprise Linux (RHEL) | 9.x       | DISA STIG RHEL 9 v2r5       | Supported with documented exceptions |
| Ubuntu                          | 24.04     | DISA STIG Ubuntu 24.04 v1r4 | Currently being evaluated            |

## Recommended approach

Apply STIG hardening after you complete the [on-premises installation](/deployment/on-prem/install). This sequence gives you a clean baseline and simplifies troubleshooting if issues arise.

For Ubuntu and RHEL environments, use the OpenSCAP tooling with the DISA STIG profile. For example, on RHEL 9.x:

```bash theme={null}
# Install prerequisites.
dnf install openscap-scanner scap-security-guide

# Run baseline scan.
sudo oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_stig \
  --results stig-scan-results.xml \
  --report stig-scan-report.html \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
```

DISA also publishes [Ansible playbooks for supported STIGs](https://www.cyber.mil/stigs/downloads/), but they often lag the latest STIG policies.

## Known compatibility considerations

Poolside on-premises model inference relies on the NVIDIA GPU Operator and container runtime components that interact with kernel-level features. Certain STIG controls can conflict with these requirements.

### Berkeley Packet Filter controls

Two specific STIG controls affect how the NVIDIA container runtime manages GPU device access:

| STIG ID  | Control                            | Default STIG value   | Poolside requirement |
| -------- | ---------------------------------- | -------------------- | -------------------- |
| V-257810 | `kernel.unprivileged_bpf_disabled` | `1` (enabled)        | `0` (disabled)       |
| V-257942 | `net.core.bpf_jit_harden`          | `1` or `2` (enabled) | `0` (disabled)       |

**Why this matters**

The NVIDIA container runtime uses Berkeley Packet Filter (BPF) filters to dynamically configure device access rules for GPU containers. When these controls are active, container initialization can fail with errors such as:

```text theme={null}
nvidia-container-cli.real: mount error: failed to add device rules: 
unable to generate new device filter program from existing programs
```

**Remediation**

Set these two kernel parameters to `0` in `/etc/sysctl.conf`:

```ini theme={null}
kernel.unprivileged_bpf_disabled = 0
net.core.bpf_jit_harden = 0
```

Reboot the system after you modify these settings. These are the documented STIG control exceptions for GPU workload compatibility.

## Additional considerations

When applying STIG hardening to Poolside on-premises model inference deployments, consider the following:

| Control area                                                           | Consideration                                                                                         |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Federal Information Processing Standards (FIPS)-validated cryptography | Configure this during OS installation. Contact Poolside if you deploy in a FIPS-required environment. |
| Repeated privilege escalation authentication                           | Terraform-based installation requires a temporary `sudoers` configuration during deployment.          |
| Uncomplicated Firewall (UFW) rate limiting                             | Default rate limits are compatible. High-concurrency deployments may require tuned thresholds.        |
| Sticky bit on public directories                                       | Compatible with Poolside's single-node model inference architecture.                                  |
| Filesystem partition scheme                                            | See [Storage requirements](/deployment/on-prem/storage) for more information.                         |

## Pre-deployment checklist

Before deploying Poolside on a STIG-hardened system:

1. **Document your STIG baseline**: Provide Poolside with the specific STIG profile version and any customer-specific policy modifications.
2. **Apply OS hardening last**: Complete STIG remediation after Poolside installation.
3. **Configure BPF exceptions**: Apply the kernel parameter changes documented in [Berkeley Packet Filter controls](#berkeley-packet-filter-controls). Reboot the system for the changes to take effect.
4. **Validate GPU access**: Confirm all pods in `gpu-operator` are `Running` or `Completed` after hardening.
5. **Retain scan reports**: Keep pre-remediation and post-remediation OpenSCAP reports for troubleshooting.

## Additional resources

* [DISA STIG Library](https://www.cyber.mil/stigs/)
* [OpenSCAP Documentation](https://www.open-scap.org/resources/documentation/)
* [NIST National Checklist Program](https://ncp.nist.gov/repository)

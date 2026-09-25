# Storage requirements

> Storage guidance for Poolside on-premises model deployments, including partitioning recommendations and model checkpoint storage.

These partitioning recommendations draw from the [Defense Information Systems Agency (DISA) Security Technical Implementation Guide (STIG) library](https://www.cyber.mil/stigs/). Poolside does not provide STIG-specific implementation guidance or support for customer-defined STIG policies. For hardening sequence, validated baselines, and compatibility exceptions, see [STIG hardening considerations](/deployment/on-prem/stig).

## Partitioning overview

This page shows recommended partition sizing for single-node Poolside on-premises model deployments running RKE2 and explains how model checkpoints affect storage requirements. The checkpoint estimates cover these model artifacts:

| Model                                 | Checkpoint size (GB) |
| ------------------------------------- | -------------------- |
| laguna\_s\_2\_1\_fp8\_fp8kv\_07\_2026 | 115                  |
| laguna\_xs\_fp8\_fp8kv\_re\_06\_2026  | 33                   |
| laguna\_m\_fp8\_fp8kv\_re\_06\_2026   | 214                  |

## Partition recommendations for STIG-hardened hosts

For STIG-hardened Linux nodes, Poolside recommends the following partition layout and sizing as a minimum for the listed models:

| Mount           | Size | Filesystem | Mount options         | Purpose                        |
| --------------- | ---- | ---------- | --------------------- | ------------------------------ |
| `/boot/efi`     | 600M | `fat32`    | `umask=0077`          | UEFI system partition          |
| `/boot`         | 1G   | `xfs`      | `nodev,nosuid`        | Kernel, `initramfs`            |
| `/`             | 50G  | `xfs`      | defaults              | OS root                        |
| `/tmp`          | 2G   | `xfs`      | `nodev,nosuid,noexec` | Temporary files                |
| `/var`          | 5G   | `xfs`      | `nodev,nosuid`        | Cache, spool, backups          |
| `/var/tmp`      | 10G  | `xfs`      | `nodev,nosuid,noexec` | Temporary files                |
| `/var/log`      | 50G  | `xfs`      | `nodev,nosuid,noexec` | System + audit logs            |
| `/var/lib`      | 400G | `xfs`      | `nodev,nosuid`        | `kubelet`, rancher, containers |
| `/home`         | 50G  | `xfs`      | `nodev,nosuid`        | Terraform working directories  |
| `/opt/poolside` | 400G | `xfs`      | `nodev,nosuid`        | Model artifact storage         |
| swap            | 4G   | `swap`     | none                  | Swap space                     |

The listed partition sizes total approximately 1 TB.

### Dedicated `/opt/poolside` partition for model artifacts

STIG controls recommend dedicated partitions to prevent system partitions from filling up and causing denial of service. Poolside recommends placing model artifact storage on a dedicated `/opt/poolside` partition rather than the root filesystem. Without separation, model artifact growth can render the OS unusable.

### STIG mount option recommendations

* `/tmp` and `/var/tmp` should include `noexec` in the mount options to reduce the risk of executing files from temporary directories.
* `/var/log` should include `noexec` in the mount options to reduce the risk of executing files from log directories.
* `/var/lib` cannot include `noexec`. The container runtime runs binaries from overlay layers stored there. Adding `noexec` here breaks Kubernetes pods.

## Inference storage impact

When you run inference workloads, each inference pod loads model checkpoints from SeaweedFS into a storage-backed `emptyDir` volume under `/var/lib/kubelet`. This means you store at least two copies of the model checkpoint on disk: one copy in SeaweedFS and one copy in the `emptyDir` volume for each running pod.

Each inference workload consumes disk space equal to its model checkpoint size:

| Model                                 | Checkpoint size (GB) | emptyDir consumption (GB) | Total disk usage (GB) |
| ------------------------------------- | -------------------- | ------------------------- | --------------------- |
| laguna\_s\_2\_1\_fp8\_fp8kv\_07\_2026 | 115                  | 115                       | 230                   |
| laguna\_xs\_fp8\_fp8kv\_re\_06\_2026  | 33                   | 33                        | 66                    |
| laguna\_m\_fp8\_fp8kv\_re\_06\_2026   | 214                  | 214                       | 428                   |

Plan for sufficient free space in `/var/lib` to accommodate your largest model's checkpoint size for each running inference pod.

## Scaling prioritization guidance

If you need to scale storage, allocate additional space in this priority order:

1. **`/var/lib`**: Scales per model deployed in-cluster
2. **`/opt/poolside`**: Scales with model checkpoints
3. **`/home`**: Scales with Terraform files. The Poolside Terraform bundle packages container upgrade images.

Core OS partitions (`/`, `/boot`, `/tmp`, `/var`, `/var/tmp`, `/var/log`) can remain fixed regardless of total disk size.

# Install on-premises

> Install Poolside model inference on a single on-premises GPU host by using the Terraform installation bundle.

## Overview

Use this guide to deploy Poolside model inference on a dedicated GPU workstation or server host.

The on-premises installation bundle can be used in internet-connected or air-gapped environments. When the bundle is already cached on the host, installation typically takes about one hour.

The installation process has the following phases:

1. Prepare the host and install operating-system-specific prerequisites.
2. Install RKE2 infrastructure.
3. Install supporting infrastructure services.
4. Upload model checkpoints.
5. Deploy model inference and ingress.

The installation includes:

* RKE2 Kubernetes
* S3-compatible object storage for model checkpoints
* A local container registry
* `cert-manager` for self-signed certificates
* NVIDIA GPU Operator for GPU access in RKE2 workloads
* Model inference workloads for the model checkpoints you provide

Model checkpoint files are provided separately based on your deployment. Upload the model checkpoint files during the model upload step.

## Prerequisites

Before you begin, ensure that the host meets the following prerequisites:

* A supported operating system:
  * Ubuntu 22.04 LTS
  * Ubuntu 24.04 LTS
  * Red Hat Enterprise Linux (RHEL) 9.6
  * SUSE Linux Enterprise Server (SLES) 16
* A supported host CPU architecture:
  * `amd64` (`x86_64`)
  * `arm64` (`aarch64`)
* `sudo` access on the host
* The Poolside installation bundle for your host CPU architecture
* Poolside model checkpoint files available on the host
* The ingress hostnames you plan to expose for model inference
* If you use custom TLS certificates, CA and server certificate files with SANs that cover the hostnames described in Step 2

## Prepare the host

Complete the preparation steps for the host operating system before you run the installation steps.

Some prerequisite tools provide architecture-specific Linux binaries. Use `amd64` downloads for `x86_64` hosts and `arm64` downloads for `aarch64` hosts. To check the host architecture, run:

```bash theme={null}
uname -m
```

### Prepare Ubuntu

These steps apply to both Ubuntu 22.04 LTS and Ubuntu 24.04 LTS.

1. **Install required tools**

   * Install `kubectl` using `sudo snap install kubectl --classic`
   * Install `jq` using `sudo apt install -y jq`
   * Install `yq` (version `v4.49.2` or later) from the [yq releases page](https://github.com/mikefarah/yq/releases/tag/v4.49.2)
     * Download [`yq_linux_amd64.tar.gz`](https://github.com/mikefarah/yq/releases/download/v4.49.2/yq_linux_amd64.tar.gz) or [`yq_linux_arm64.tar.gz`](https://github.com/mikefarah/yq/releases/download/v4.49.2/yq_linux_arm64.tar.gz) and install it to `/usr/local/bin/yq`
   * Install `terraform` (version `1.8.5`) from the [Terraform 1.8.5 releases page](https://releases.hashicorp.com/terraform/1.8.5)
     * Download [`terraform_1.8.5_linux_amd64.zip`](https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_linux_amd64.zip) or [`terraform_1.8.5_linux_arm64.zip`](https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_linux_arm64.zip) and install the binary to `/usr/local/bin/terraform`
     * `unzip` is required to extract the Terraform binary
   * Install `skopeo` (version `v1.18` or later) from the [skopeo-binary releases page](https://github.com/lework/skopeo-binary/releases/tag/v1.20.0)
     * Download [`skopeo-linux-amd64`](https://github.com/lework/skopeo-binary/releases/download/v1.20.0/skopeo-linux-amd64) or [`skopeo-linux-arm64`](https://github.com/lework/skopeo-binary/releases/download/v1.20.0/skopeo-linux-arm64) and install it to `/usr/local/bin/skopeo`

2. **Configure the containers trust policy**

   Ensure the containers trust policy at `/etc/containers/policy.json` allows `skopeo` to access the RKE2 registry with the minimum required permissions to load container images into the registry during installation.

   ```json theme={null}
   {
     "default": [
       {
         "type": "insecureAcceptAnything"
       }
     ]
   }
   ```

3. **Disable the `nouveau` driver if loaded**

   Confirm that the `nouveau` graphics driver is not loaded. For instructions, see [Disable the nouveau driver in the NVIDIA documentation](https://docs.nvidia.com/ai-enterprise/deployment/vmware/latest/nouveau.html).

   Run the following command to check whether the `nouveau` driver is loaded. If the command returns output, follow the next steps to turn off the driver and reboot.

   ```bash theme={null}
   lsmod | grep nouveau
   ```

   If the `nouveau` driver is loaded:

   ```bash theme={null}
   cat <<EOF | sudo tee /etc/modprobe.d/blacklist-nouveau.conf
   blacklist nouveau
   options nouveau modeset=0
   EOF

   # Regenerate the kernel initramfs.
   sudo update-initramfs -u

   # Reboot your system:
   sudo reboot

   # After reboot, confirm that nouveau is not loaded.
   lsmod | grep nouveau
   ```

4. **Configure Ubuntu kernel parameters**

   Poolside file watchers can exceed the Ubuntu default for inotify instances. Set the following parameter to `65535` or higher:

   ```text theme={null}
   fs.inotify.max_user_instances = 65535
   ```

   To apply the setting, add the parameter under `/etc/sysctl.d/` and reload:

   ```bash theme={null}
   echo "fs.inotify.max_user_instances = 65535" | sudo tee /etc/sysctl.d/99-poolside.conf
   sudo sysctl --system
   ```

### Prepare RHEL 9.6

1. **Lock the RHEL release**

   RHEL can upgrade the host to a newer minor release when new updates become available through `dnf update` or `yum update`.

   Before you install packages, lock the release to RHEL 9.6 to prevent automatic minor version upgrades.

   ```bash theme={null}
   # List available versions
   sudo subscription-manager release --list

   # Lock the release to version 9.6
   sudo subscription-manager release --set=9.6

   sudo yum clean all
   ```

2. **Install required tools**

   * Install `iptables-nft` using `yum` (version `1.8.10-11.el9`)

   * Install `container-selinux` using `yum`

   * Install `jq` using `yum` (version `1.6` or later)

   * Install `yq` (version `v4.49.2` or later) from the [yq releases page](https://github.com/mikefarah/yq/releases/tag/v4.49.2)
     * Download [`yq_linux_amd64.tar.gz`](https://github.com/mikefarah/yq/releases/download/v4.49.2/yq_linux_amd64.tar.gz) or [`yq_linux_arm64.tar.gz`](https://github.com/mikefarah/yq/releases/download/v4.49.2/yq_linux_arm64.tar.gz) and install it to `/usr/local/bin/yq`

   * Install `unzip` using `yum` (version `6.00` or later)

   * Install `skopeo` using `yum` (package version `1.18.1-2.el9_6` or later for your host architecture)

   * Install `kubectl` by adding the Kubernetes repository (ensure that the `kubectl` version is the same as or newer than the RKE2 Kubernetes version):

     ```bash theme={null}
     cat <<EOF | sudo tee /etc/yum.repos.d/kubernetes.repo
     [kubernetes]
     name=Kubernetes
     baseurl=https://pkgs.k8s.io/core:/stable:/v1.33/rpm/
     enabled=1
     gpgcheck=1
     gpgkey=https://pkgs.k8s.io/core:/stable:/v1.33/rpm/repodata/repomd.xml.key
     EOF
     ```

     Then run:

     ```bash theme={null}
     sudo yum install -y kubectl
     ```

   * Install `terraform` (version `1.8.5`) from the [Terraform 1.8.5 releases page](https://releases.hashicorp.com/terraform/1.8.5)
     * Download [`terraform_1.8.5_linux_amd64.zip`](https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_linux_amd64.zip) or [`terraform_1.8.5_linux_arm64.zip`](https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_linux_arm64.zip) and install the binary to `/usr/local/bin/terraform`
     * `unzip` is required to extract the Terraform binary

3. **Configure the Terraform command path**

   <Note>
     In RHEL 9.x, `/usr/local/bin` is not included in the `secure_path` setting in `/etc/sudoers` by default. As a result, `sudo terraform` can return a `command not found` error.

     Run Terraform with the absolute path: `/usr/local/bin/terraform`.
   </Note>

4. **Disable the `nouveau` driver if loaded**

   Confirm that the `nouveau` graphics driver is not loaded. For instructions, see [Disable the nouveau driver in the NVIDIA documentation](https://docs.nvidia.com/ai-enterprise/deployment/vmware/latest/nouveau.html).

   Run the following command to check whether the `nouveau` driver is loaded. If the command returns output, follow the next steps to turn off the driver and reboot.

   ```bash theme={null}
   lsmod | grep nouveau
   ```

   If the `nouveau` driver is loaded:

   ```bash theme={null}
   # Check for nouveau in the GRUB configuration.
   grep GRUB_CMDLINE_LINUX /etc/default/grub

   # If this command does not show that nouveau is blocked, ensure that the
   # GRUB_CMDLINE_LINUX line in /etc/default/grub contains "modprobe.blacklist=nouveau",
   # for example, at the end of the line.

   cat <<EOF | sudo tee /etc/modprobe.d/blacklist-nouveau.conf
   blacklist nouveau
   options nouveau modeset=0
   EOF

   # Regenerate the grub config file and add a boot menu entry for EFI firmware configuration.
   sudo dracut --force
   sudo grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg

   # Reboot the system.
   sudo systemctl reboot

   # After reboot, confirm that the nouveau driver is not loaded.
   lsmod | grep nouveau
   ```

### Prepare SLES 16

These steps apply to SUSE Linux Enterprise Server (SLES) 16.

1. **Install required tools**

   Ensure that `sudo` is present and operating correctly on the host. Use `su` to become the root user, then run `zypper install sudo`.

   After you install `sudo`, open the `sudoers` file with `visudo`. Verify that the file includes only one `Defaults secure_path` entry. If multiple entries exist, delete any entries that do not include `/usr/local/bin`. You install `terraform` and `yq` in this directory, so it must be in the `secure_path` value that `sudo` uses.

   To install the required packages available from the operating system repositories, run:

   ```bash theme={null}
   sudo zypper install -y iptables tar unzip skopeo jq
   ```

   * Install `yq` (version `v4.49.2` or later) from the [yq releases page](https://github.com/mikefarah/yq/releases/tag/v4.49.2)
     * Download [`yq_linux_amd64.tar.gz`](https://github.com/mikefarah/yq/releases/download/v4.49.2/yq_linux_amd64.tar.gz) or [`yq_linux_arm64.tar.gz`](https://github.com/mikefarah/yq/releases/download/v4.49.2/yq_linux_arm64.tar.gz) and install it to `/usr/local/bin/yq`
   * Install `terraform` (version `1.8.5`) from the [Terraform 1.8.5 releases page](https://releases.hashicorp.com/terraform/1.8.5)
     * Download [`terraform_1.8.5_linux_amd64.zip`](https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_linux_amd64.zip) or [`terraform_1.8.5_linux_arm64.zip`](https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_linux_arm64.zip) and install the binary to `/usr/local/bin/terraform`
     * `unzip` is required to extract the Terraform binary

2. **Install `kubectl`**

   Ensure that the `kubectl` version is the same as or newer than the RKE2 Kubernetes version.

   To install `kubectl` using native package management, add the Kubernetes repository for the minor version that matches your deployment. The following example uses the v1.35 repository:

   ```bash theme={null}
   cat <<EOF | sudo tee /etc/zypp/repos.d/kubernetes.repo
   [kubernetes]
   name=Kubernetes
   baseurl=https://pkgs.k8s.io/core:/stable:/v1.35/rpm/
   enabled=1
   gpgcheck=1
   gpgkey=https://pkgs.k8s.io/core:/stable:/v1.35/rpm/repodata/repomd.xml.key
   EOF

   sudo zypper install -y kubectl
   ```

   Alternatively, install `wget`, then download the `kubectl` binary directly and install it to `/usr/local/bin/kubectl`. Replace `<arch>` with `amd64` or `arm64`:

   ```bash theme={null}
   sudo zypper install -y wget
   wget https://dl.k8s.io/release/v1.35.3/bin/linux/<arch>/kubectl
   chmod +x kubectl
   sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
   ```

3. **Disable the `nouveau` driver if loaded**

   Confirm that the `nouveau` graphics driver is not loaded. For instructions, see [Disable the nouveau driver in the NVIDIA documentation](https://docs.nvidia.com/ai-enterprise/deployment/vmware/latest/nouveau.html).

   Run the following command to check whether the `nouveau` driver is loaded. If the command returns output, follow the next steps to turn off the driver and reboot.

   ```bash theme={null}
   lsmod | grep nouveau
   ```

   If the `nouveau` driver is loaded:

   ```bash theme={null}
   cat <<EOF | sudo tee /etc/modprobe.d/blacklist-nouveau.conf
   blacklist nouveau
   options nouveau modeset=0
   EOF

   # Regenerate the kernel initramfs.
   sudo dracut --force

   # Reboot the system.
   sudo systemctl reboot

   # After reboot, confirm that the nouveau driver is not loaded.
   lsmod | grep nouveau
   ```

4. **Install the NVIDIA driver**

   Install the NVIDIA driver on the host before you run the installer. The GPU Operator driver container cannot be bundled into the local registry due to licensing restrictions. The following process installs a signed NVIDIA driver that supports secure boot and can be updated from SLES-supported packages.

   * Check whether the NVIDIA-backed repository is present in your installation:

     ```bash theme={null}
     sudo zypper lr
     ```

     The output should include a repository named `NVIDIA-GPU-Compute-Toolkit-CUDA`.

   * If the repository is not enabled, enable the CUDA compute repository:

     ```bash theme={null}
     sudo zypper mr -e <repository-number>
     ```

   * Refresh the available packages:

     ```bash theme={null}
     sudo zypper refresh
     ```

   * Install the driver:

     ```bash theme={null}
     sudo zypper install nvidia-open-driver-G07-signed-cuda-kmp-default
     ```

   * Store the installed driver version:

     ```bash theme={null}
     version=$(rpm -qa --queryformat '%{VERSION}\n' nvidia-open-driver-G07-signed-cuda-kmp-default | cut -d "_" -f1 | sort -u | tail -n 1)
     ```

   * Install the matching compute utilities and persistence daemon:

     ```bash theme={null}
     sudo zypper install -y "nvidia-compute-utils-G07 = ${version}" "nvidia-persistenced = ${version}"
     ```

## Install

Use the Poolside installation bundle for your host architecture, either `linux/amd64` or `linux/arm64`. You can use the bundle in internet-connected and air-gapped environments.

### Step 0 (optional): Set up an air-gapped installation

<Note>
  This configuration is required for air-gapped installations. In internet-connected environments, you can skip this step.
</Note>

To use the local Terraform provider cache included in the bundle, configure Terraform to load providers from the bundled `terraform.d` directory.

1. Locate `poolside-terraform.tfrc` in the root of the unpacked installation bundle.

2. Replace the `$POOLSIDE_INSTALL_DIR` placeholder with the fully qualified path to the bundle's root directory.

3. For Terraform commands in the installation steps, prefix the command with the Terraform CLI configuration path:

   ```bash theme={null}
   TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc terraform <command>
   ```

Setting this variable ensures that both root and non-root users reference the same cached Terraform providers.

<Note>
  You can configure Terraform using alternative methods, such as a `.terraformrc` file, as described in the official [HashiCorp documentation](https://developer.hashicorp.com/terraform/cli/v1.8.x/config/config-file). Because the installation process runs as both `root` and a local user, you must ensure that both accounts are configured to reference the cached providers correctly.
</Note>

### Step 1: Install RKE2 on the host

The `01-infra-rke2` directory contains the Terraform module that installs RKE2 on the host.

Using `sudo`, run the following commands from the `01-infra-rke2` directory.

<Warning>
  You must run the RKE2 installation using `sudo` from the same user account that runs Poolside model inference after deployment.

  Terraform uses the original user and group IDs from the `sudo` environment to set ownership and permissions required by later installation stages.
</Warning>

**Air-gapped environment:**

```bash theme={null}
sudo TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc /usr/local/bin/terraform init
sudo TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc /usr/local/bin/terraform apply
```

**Internet-connected environment:**

```bash theme={null}
sudo /usr/local/bin/terraform init
sudo /usr/local/bin/terraform apply
```

If RKE2 certificates or credentials change, re-run this step to refresh the configuration files that restore access for the installation user.

### Step 2: Install supporting infrastructure services

The `02-infra-services` directory contains the Terraform module that accesses the RKE2 cluster and deploys the supporting infrastructure required by Poolside model inference.

This step installs:

* A local container registry
* S3-compatible object storage
* Ingress and certificate resources for inference endpoints
* NVIDIA GPU Operator, deployed as `gpu-operator`

Before you run Terraform, complete the following configuration steps.

#### 1. Configure ingress hostnames

In `02-infra-services/terraform.tfvars`, set `poolside_ingress_hosts` to the model hostnames that you plan to use later in Step 4. The installer uses this value when it creates self-signed certificate SANs.

If you use installer-generated self-signed certificates, each model `ingress_host_name` that you configure in Step 4 must match one of the hostnames in `poolside_ingress_hosts`. This lets the installer generate certificates with the required SANs before model inference is deployed.

If you use custom TLS certificates, ensure that your certificate SANs include each model `ingress_host_name` that you configure in Step 4.

The installer includes `poolside-docs` in certificate SANs by default. Add a documentation hostname to `poolside_ingress_hosts` only if you want to use a different documentation hostname.

#### 2. Configure custom TLS certificates

Skip this step if you use installer-generated self-signed certificates. If you use custom TLS certificates, you must provide your own CA and server certificate before you run `terraform apply`.

The `custom_certificates` and `custom_ca_trust_chain` parameters configure certificates for the TLS-terminating inference and storage services. The `custom_certificates` schema accepts certificate and key entries for `poolside`, `services.storage`, and `services.storage_s3`. You can use one certificate that covers all exposed hostnames, or separate certificates if your Public Key Infrastructure (PKI) requires it.

Across all certificates you provide, the Subject Alternative Names (SANs) must cover every hostname that you expose, including:

* Every model `ingress_host_name` that you configure in `04-poolside-inference/terraform.tfvars`
* Any custom documentation ingress hostname that you configure instead of the default `poolside-docs` hostname
* `seaweedfs.poolside.local`
* `seaweedfs-s3.poolside.local`

1. Place your CA certificate, server certificate, and private key in a directory accessible to Terraform. The example below uses `<bundle-path>/poolside-install/byo-certs/`. The `poolside-install/` subdirectory holds the installation's persistent state and is preserved across cluster resets, so it is the recommended location for BYO certificate files.

   ```text theme={null}
   <bundle-path>/poolside-install/byo-certs/
   ├── ca.crt       # CA certificate (root, or root and intermediate chain)
   ├── server.crt   # Server certificate signed by the CA
   └── server.key   # Server private key
   ```

   You must reference these files using fully qualified (absolute) paths in the next step. Relative paths are not supported.

2. In `02-infra-services/terraform.tfvars`, set the BYO variables:

   ```hcl theme={null}
   custom_ca_trust_chain = {
     root_ca_path = "<bundle-path>/poolside-install/byo-certs/ca.crt"
   }

   custom_certificates = {
     poolside = {
       cert_path = "<bundle-path>/poolside-install/byo-certs/server.crt"
       key_path  = "<bundle-path>/poolside-install/byo-certs/server.key"
     }
     services = {
       storage = {
         cert_path = "<bundle-path>/poolside-install/byo-certs/server.crt"
         key_path  = "<bundle-path>/poolside-install/byo-certs/server.key"
       }
       storage_s3 = {
         cert_path = "<bundle-path>/poolside-install/byo-certs/server.crt"
         key_path  = "<bundle-path>/poolside-install/byo-certs/server.key"
       }
     }
   }
   ```

   `custom_ca_trust_chain.root_ca_path` must point to the CA that signed `server.crt`. When you run `terraform apply`, the module creates Kubernetes secrets with a `-byo` suffix from these files.

#### 3. Run Terraform

Using `sudo`, run the following commands from the `02-infra-services` directory.

<Warning>
  You must run this step using `sudo` from the same user account that runs Poolside model inference after deployment.

  Terraform uses the original user and group IDs from the `sudo` environment to set the permissions required for RKE2 cluster access in later stages.
</Warning>

**Air-gapped environment:**

```bash theme={null}
sudo TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc /usr/local/bin/terraform init
sudo TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc /usr/local/bin/terraform apply
```

**Internet-connected environment:**

```bash theme={null}
sudo /usr/local/bin/terraform init
sudo /usr/local/bin/terraform apply
```

This step can take some time to complete. The process loads container images into the local RKE2 registry to support disconnected operation and improve Poolside startup performance.

### Step 3: Upload Poolside models

The `03-poolside-model-upload` directory contains the Terraform module that uploads model checkpoints into the deployment's S3-compatible storage.

The module creates a Kubernetes job that syncs model files from a local host directory into the `poolside-models` bucket.

1. Copy the Poolside model checkpoint files for your deployment into the local host directory:

   ```text theme={null}
   /opt/poolside/poolside-model-uploads
   ```

   This is the default location. If you customized the Poolside host volume location in `01-infra-rke2`, use the corresponding directory instead.

2. Run the following commands from the `03-poolside-model-upload` directory.

   **Air-gapped environment:**

   ```bash theme={null}
   TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc terraform init
   TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc terraform apply
   ```

   **Internet-connected environment:**

   ```bash theme={null}
   terraform init
   terraform apply
   ```

3. To upload additional or updated models later, repeat these steps. Uploads are additive and do not remove existing models from the deployment.

This step can take some time to complete because model checkpoint files can be large.

### Step 4: Deploy Poolside model inference

The `04-poolside-inference` directory contains the Terraform module that deploys the inference containers used to serve Poolside models.

1. In the `04-poolside-inference` directory, update `terraform.tfvars` with the model details you want to deploy.

   If you use installer-generated self-signed certificates, each model `ingress_host_name` must match one of the hostnames you configured in `poolside_ingress_hosts` during [Step 2: Install supporting infrastructure services](#step-2-install-supporting-infrastructure-services). If you use custom TLS certificates, the certificate SANs must include each model `ingress_host_name`.

   ```hcl title="Example: Model configuration" theme={null}
   deployment_name = "poolside-server"

   models = {
     agent = {
       s3_uri = "s3://poolside-models/<model-checkpoint-name>"
       ingress_host_name = "poolside-models-agent.poolside.local"
       gpus = 1
       replicas = 1
       model_type = "agent"
     }
   }
   ```

2. Run the following commands from the `04-poolside-inference` directory.

   **Air-gapped environment:**

   ```bash theme={null}
   TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc terraform init
   TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc terraform apply
   ```

   **Internet-connected environment:**

   ```bash theme={null}
   terraform init
   terraform apply
   ```

## Next steps: Post-installation configuration

### Configure local DNS

Add hostname resolution on the deployment host. Replace the model ingress hostnames with the `ingress_host_name` values you configured in Step 4. If you expose multiple model ingress hostnames, include each hostname on the same line.

```bash theme={null}
cat <<EOF | sudo tee -a /etc/hosts
127.0.0.1 <model-ingress-host> <additional-model-ingress-host> seaweedfs.poolside.local seaweedfs-s3.poolside.local
EOF
```

For example:

```bash theme={null}
cat <<EOF | sudo tee -a /etc/hosts
127.0.0.1 poolside-models-agent.poolside.local seaweedfs.poolside.local seaweedfs-s3.poolside.local
EOF
```

## Verification

Your installation is successful when the following checks pass:

* Confirm that all pods show a healthy status, such as `Running` or `Completed`:

  ```bash theme={null}
  kubectl get pods -A
  ```

* Confirm that the model inference endpoint resolves to the deployment host:

  ```bash theme={null}
  getent hosts <model-ingress-host>
  ```

* Confirm that model workloads are running:

  ```bash theme={null}
  kubectl get pods -n poolside-models
  ```

* Confirm that the model upload job completed successfully:

  ```bash theme={null}
  kubectl get jobs -n poolside-models
  ```

## Troubleshooting

### Model pods stuck in `ContainerCreating`

* Confirm that the host detects NVIDIA GPU devices:

  ```bash theme={null}
  lspci | grep -i nvidia
  ```

* Confirm that Kubernetes reports GPUs as allocatable:

  ```bash theme={null}
  kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.allocatable.nvidia\.com/gpu}{"\n"}{end}'
  ```

* Check model workload status:

  ```bash theme={null}
  kubectl get pods -n poolside-models
  ```

### Models not loading

* Confirm that the model checkpoint files were copied into `/opt/poolside/poolside-model-uploads`, or into the custom host volume location you configured.
* Confirm that the model upload job completed successfully.
* Check model initialization logs:

  ```bash theme={null}
  kubectl logs <pod-name> -c model-downloader -n poolside-models
  ```

### Useful commands

```bash theme={null}
# Check overall cluster status.
kubectl get pods -A

# Monitor model workloads.
kubectl get pods -n poolside-models

# Monitor supporting services.
kubectl get pods -n poolside-services

# Inspect pod and deployment details.
kubectl describe pod <pod-name> -n <namespace>
kubectl describe deploy <deployment-name> -n <namespace>

# View logs.
kubectl logs <pod-name> -n <namespace>

# View recent events in a namespace.
kubectl get events -n <namespace>
```

## Related resources

* [On-premises deployment](/deployment/on-prem/overview)
* [Storage requirements](/deployment/on-prem/storage)
* [Certified stacks](/deployment/on-prem/certified-stacks/overview)
* [Upgrade on-premises](/deployment/on-prem/upgrade)
* [Admin toolkit](/deployment/on-prem/admin)
* [STIG hardening considerations](/deployment/on-prem/stig)
* [On-premises deployment FAQ](/deployment/on-prem/faq)
* [Supported configurations](/deployment/supported-configurations)

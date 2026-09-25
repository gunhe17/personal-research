# Upgrade on-premises

> Upgrade an on-premises Poolside model inference deployment to a new installation bundle.

<Warning>
  This guide assumes that you installed Poolside model inference by following [Install on-premises](/deployment/on-prem/install).
</Warning>

## Overview

Use this guide to upgrade an existing on-premises Poolside model inference deployment to a new installation bundle.

Upgrades are performed bundle-to-bundle. To keep the process predictable, preserve the configuration and installation state you need from the current bundle, remove the current Terraform-managed deployment, and apply all phases from the new bundle. Do not run only the model upload and inference phases because the new bundle can include infrastructure changes that require full removal and reapplication.

The upgrade process has the following phases:

1. Prepare the new installation bundle and preserve configuration.
2. Remove the current deployment.
3. Apply the new installation bundle.
4. Configure local DNS.
5. Verify model inference.

## Prerequisites

Before you begin, ensure that you have:

* A working on-premises model inference deployment completed with [Install on-premises](/deployment/on-prem/install)
* Access to the deployment host
* Access to the current installation bundle or a copy of its Terraform configuration
* The new on-premises installation bundle provided by Poolside
* Poolside model checkpoint files available on the host
* The ingress hostnames you plan to expose for model inference
* Any bring-your-own (BYO) certificates that match the ingress hostnames, if you are not using installer-generated self-signed certificates
* The same host tools required by [Install on-premises](/deployment/on-prem/install)

## Downtime

Plan a maintenance window before you start. Model inference endpoints are unavailable while you remove the current deployment and apply the new bundle.

Model upload and model startup can take a long time because model checkpoint files are large. Plan extra time if the upgrade includes large checkpoints or multiple model workloads.

## Preparation

### Step A: Obtain the new bundle

Obtain the new on-premises installation bundle from Poolside and extract it on the deployment host.

Set shell variables for the current and new bundle root directories:

```bash theme={null}
export OLD_BUNDLE="<current-bundle-path>"
export NEW_BUNDLE="<new-bundle-path>"
```

### Step B: Set up air-gapped Terraform configuration

<Note>
  This configuration is required for air-gapped installations. In internet-connected environments, you can skip this step.
</Note>

To use the local Terraform provider cache included in the new bundle, configure Terraform to load providers from the bundled `terraform.d` directory.

1. Locate `poolside-terraform.tfrc` in the root of the new bundle.

2. Replace the `$POOLSIDE_INSTALL_DIR` placeholder with the fully qualified path to the new bundle's root directory.

3. For Terraform commands that run against the new bundle, prefix the command with the Terraform CLI configuration file path:

   ```bash theme={null}
   TF_CLI_CONFIG_FILE=$NEW_BUNDLE/poolside-terraform.tfrc terraform <command>
   ```

For removal commands that run against the current bundle, use `$OLD_BUNDLE/poolside-terraform.tfrc` instead.

### Step C: Preserve installation state

Copy the current bundle's `poolside-install` directory into the new bundle before you remove the current deployment.

```bash theme={null}
cp -aT "$OLD_BUNDLE/poolside-install" "$NEW_BUNDLE/poolside-install"
```

The `poolside-install` directory contains persistent installation state shared across phases, including generated configuration files and BYO TLS certificate files if you stored them under `poolside-install/byo-certs/`.

### Step D: Record configuration values

Record the values from the current deployment that you need to use in the new deployment. At minimum, review:

* Host volume paths configured in `01-infra-rke2`
* Model ingress hostnames
* Model names, S3 URIs, GPU counts, replica counts, and model types
* BYO certificate and CA file paths
* Local DNS entries or external DNS records
* Any environment-specific sizing or networking values

Do not copy current `terraform.tfvars` files directly into the new bundle. The new installation bundle can include different variables, defaults, and phase behavior.

For each phase, open the new bundle's `terraform.tfvars` file and copy only the values that must carry forward from the current deployment. Leave new variables at their default values unless Poolside release notes specify otherwise.

<Note>
  If you used [custom TLS certificates](/deployment/on-prem/install#step-2-install-supporting-infrastructure-services) during the original install and stored the files under `$OLD_BUNDLE/poolside-install/byo-certs/`, update the certificate paths in `$NEW_BUNDLE/02-infra-services/terraform.tfvars` so they point to `$NEW_BUNDLE/poolside-install/byo-certs/`.
</Note>

## Upgrade

### Step 1: Remove the current deployment

Remove the current deployment before you apply the new installation bundle.

<Note>
  This is an upgrade procedure, not a full removal. Do not clean up local model checkpoint files, DNS records, BYO certificate files, or configuration values that the new bundle still needs.
</Note>

<Warning>
  Removing the current deployment deletes the existing on-premises deployment resources. Preserve any model checkpoint files, BYO certificate files, configuration values, and operational records you need before you remove the deployment.
</Warning>

Destroy the Terraform-managed phases from the current bundle in reverse order.

#### Destroy model inference

Run the following commands from the current bundle's `04-poolside-inference` directory.

**Air-gapped environment:**

```bash theme={null}
cd "$OLD_BUNDLE/04-poolside-inference"
TF_CLI_CONFIG_FILE=$OLD_BUNDLE/poolside-terraform.tfrc terraform destroy
```

**Internet-connected environment:**

```bash theme={null}
cd "$OLD_BUNDLE/04-poolside-inference"
terraform destroy
```

#### Destroy model upload

Run the following commands from the current bundle's `03-poolside-model-upload` directory.

**Air-gapped environment:**

```bash theme={null}
cd "$OLD_BUNDLE/03-poolside-model-upload"
TF_CLI_CONFIG_FILE=$OLD_BUNDLE/poolside-terraform.tfrc terraform destroy
```

**Internet-connected environment:**

```bash theme={null}
cd "$OLD_BUNDLE/03-poolside-model-upload"
terraform destroy
```

#### Destroy supporting infrastructure services

Using `sudo`, run the following commands from the current bundle's `02-infra-services` directory.

**Air-gapped environment:**

```bash theme={null}
cd "$OLD_BUNDLE/02-infra-services"
sudo TF_CLI_CONFIG_FILE=$OLD_BUNDLE/poolside-terraform.tfrc /usr/local/bin/terraform destroy
```

**Internet-connected environment:**

```bash theme={null}
cd "$OLD_BUNDLE/02-infra-services"
sudo /usr/local/bin/terraform destroy
```

#### Destroy RKE2 infrastructure

Using `sudo`, run the following commands from the current bundle's `01-infra-rke2` directory.

**Air-gapped environment:**

```bash theme={null}
cd "$OLD_BUNDLE/01-infra-rke2"
sudo TF_CLI_CONFIG_FILE=$OLD_BUNDLE/poolside-terraform.tfrc /usr/local/bin/terraform destroy
```

**Internet-connected environment:**

```bash theme={null}
cd "$OLD_BUNDLE/01-infra-rke2"
sudo /usr/local/bin/terraform destroy
```

After removal, confirm that RKE2 is no longer running:

```bash theme={null}
sudo systemctl status rke2-server
```

### Step 2: Apply the new bundle

Apply the new installation bundle by following [Install on-premises](/deployment/on-prem/install). Use `$NEW_BUNDLE` as the bundle path when you run commands from the install guide.

Run all installation phases in order:

1. Set up air-gapped Terraform configuration, if your environment is air-gapped.
2. Install RKE2 infrastructure from `01-infra-rke2`.
3. Install supporting infrastructure services from `02-infra-services`.
4. Upload Poolside models from `03-poolside-model-upload`.
5. Deploy Poolside model inference from `04-poolside-inference`.

If the upgrade includes new or changed model checkpoint files, copy them into `/opt/poolside/poolside-model-uploads`, or into the custom host volume location you configured in `01-infra-rke2`, before you run the model upload phase.

Model upload and infrastructure service installation can take some time because model checkpoint files and container images can be large.

### Step 3: Configure local DNS

Confirm that local DNS entries still match the model `ingress_host_name` values you configured in the new bundle. If you changed any model ingress hostnames during the upgrade, update `/etc/hosts` or your external DNS records.

For local host resolution, include every model ingress hostname on the same line:

```bash theme={null}
cat <<EOF | sudo tee -a /etc/hosts
127.0.0.1 <model-ingress-host> <additional-model-ingress-host> seaweedfs.poolside.local seaweedfs-s3.poolside.local
EOF
```

## Verification

Your upgrade is successful when the following checks pass:

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

### Pods stuck pulling images

* Confirm that the supporting infrastructure services phase finished loading container images into the local RKE2 registry.
* Check the affected pod events:

  ```bash theme={null}
  kubectl describe pod <pod-name> -n <namespace>
  ```

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

### Model pods stuck in `Init`

Each model pod downloads its checkpoint during initialization. Check the initialization container logs and confirm that the checkpoint paths in `04-poolside-inference/terraform.tfvars` are still valid.

```bash theme={null}
kubectl logs <pod-name> -c model-downloader -n poolside-models
```

### Models not loading after upgrade

* Confirm that the model checkpoint files were copied into `/opt/poolside/poolside-model-uploads`, or into the custom host volume location you configured.
* Confirm that the model upload job completed successfully.
* Confirm that `terraform.tfvars` in `04-poolside-inference` points to the expected model S3 URIs.
* Check model initialization logs:

  ```bash theme={null}
  kubectl logs <pod-name> -c model-downloader -n poolside-models
  ```

## Related resources

* [Install on-premises](/deployment/on-prem/install)
* [On-premises deployment](/deployment/on-prem/overview)
* [Storage requirements](/deployment/on-prem/storage)
* [Admin toolkit](/deployment/on-prem/admin)

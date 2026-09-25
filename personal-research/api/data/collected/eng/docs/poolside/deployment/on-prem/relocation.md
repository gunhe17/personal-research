# Relocate an on-premises server

> Relocate a Poolside on-premises model inference server to a different physical network.

## Overview

Use this guide to relocate an on-premises Poolside model inference server to a different physical network.

This guide covers server relocation only. It does not cover version upgrades, migration between deployment bundles, or migration to different hardware. For upgrades, see [Upgrade on-premises](/deployment/on-prem/upgrade).

Because RKE2 nodes use static IP addresses, relocating the server can require you to stop workloads cleanly, update network-dependent configuration, reset the RKE2 node IP, and bring inference workloads back online.

## Shut down the server

Shut the server down cleanly before you move it.

```bash theme={null}
sudo shutdown -h now
```

## Start the server

After you move the server and connect it to the new network, update host networking before you start or validate Poolside workloads.

### Update `/etc/hosts`

If the primary IP address changed, update `/etc/hosts` so the server hostname resolves to the new IP address.

<Note>
  The server hostname can also be the Kubernetes node name. Local persistent volumes can be tied to that node name. Avoid changing the hostname during relocation unless Poolside instructs you to update local persistent volume node affinity.
</Note>

```text theme={null}
# Example old entry:
# 192.168.1.30 poolside-server <model-ingress-host>

# Example updated entry:
192.168.1.40 poolside-server <model-ingress-host>
```

If local model ingress hostnames should resolve on the deployment host, confirm those entries still point to the correct local or host address. The install guide uses `127.0.0.1` entries for local hostname resolution:

```text theme={null}
127.0.0.1 <model-ingress-host> seaweedfs.poolside.local seaweedfs-s3.poolside.local
```

### Update the system DNS resolver

If DNS servers changed during the move, update the host resolver configuration.

```bash theme={null}
sudo vim /etc/systemd/resolved.conf
```

Set `DNS=` to the new DNS servers, separated by spaces:

```text theme={null}
DNS=<new-dns-server-1> <new-dns-server-2>
```

Restart `systemd-resolved` and confirm the new servers are active:

```bash theme={null}
sudo systemctl restart systemd-resolved
resolvectl status
```

### Reset the RKE2 node IP

If the host IP address changed, reset RKE2 so the control plane uses the new node IP.

```bash theme={null}
# Ubuntu only: disable UFW if it is enabled.
sudo systemctl disable --now ufw

# Ubuntu only: disable AppArmor if required by your RKE2 baseline.
sudo systemctl disable --now apparmor.service

# RHEL only: disable firewalld if it is enabled.
sudo systemctl disable --now firewalld

# Stop RKE2-managed processes.
sudo /usr/local/bin/rke2-killall.sh

# Reset cluster configuration.
sudo rke2 server --cluster-reset

# Start RKE2.
sudo systemctl start rke2-server

# Confirm RKE2 is running.
sudo systemctl status rke2-server

# Confirm the node is ready.
kubectl get nodes
```

### Refresh supporting services

After the external interface or ingress IP changes, rerun the supporting infrastructure phase from the current deployment bundle:

```bash theme={null}
cd <bundle-path>/02-infra-services
sudo /usr/local/bin/terraform init
sudo /usr/local/bin/terraform apply
```

For air-gapped deployments, include the Terraform CLI configuration file:

```bash theme={null}
cd <bundle-path>/02-infra-services
sudo TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc /usr/local/bin/terraform init
sudo TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc /usr/local/bin/terraform apply
```

### Start Poolside workloads

If the deployment includes the `poolside-services` systemd unit, start it:

```bash theme={null}
sudo systemctl start poolside-services
```

If the deployment does not include that unit, rerun the model inference phase from the current bundle:

```bash theme={null}
cd <bundle-path>/04-poolside-inference
terraform init
terraform apply
```

For air-gapped deployments:

```bash theme={null}
cd <bundle-path>/04-poolside-inference
TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc terraform init
TF_CLI_CONFIG_FILE=<bundle-path>/poolside-terraform.tfrc terraform apply
```

## Validate the relocation

Confirm that the RKE2 node is ready:

```bash theme={null}
kubectl get nodes
```

Confirm that supporting services and model workloads are healthy:

```bash theme={null}
kubectl get pods -n poolside-services
kubectl get pods -n poolside-models
```

Confirm that the model ingress hostname resolves:

```bash theme={null}
getent hosts <model-ingress-host>
```

Confirm that the model endpoint responds:

```bash theme={null}
curl -s https://<model-ingress-host>/v1/models
```

## Switch the active interface without a reboot

If both the old and new network interfaces are connected to the server, you can switch IP addresses without shutting down. After the IP change, still update `/etc/hosts`, reset the RKE2 node IP, refresh supporting services, and validate model endpoints.

### Replace the network configuration

Copy the existing netplan file for the active interface and edit the copy to target the new interface and address. Move the original file out of `/etc/netplan/` so only the new file is loaded.

```yaml theme={null}
network:
  version: 2
  ethernets:
    NM-<id>:
      renderer: NetworkManager
      match:
        name: "<new-interface>"
      addresses:
        - "<new-ip>/<prefix>"
      nameservers:
        addresses:
          - <new-dns-server-1>
          - <new-dns-server-2>
      dhcp6: true
      wakeonlan: true
      networkmanager:
        name: "Wired connection 4"
        passthrough:
          connection.autoconnect-priority: "-999"
          ethernet._: ""
          ipv4.address1: "<new-ip>/<prefix>,<new-gateway>"
          ipv4.method: "manual"
          ipv6.addr-gen-mode: "default"
          ipv6.ip6-privacy: "-1"
          proxy._: ""
```

Apply the configuration:

```bash theme={null}
sudo netplan try
sudo netplan apply
```

If the server has multiple NICs available after the switch, edit `/etc/rancher/rke2/config.yaml` to force RKE2 to advertise on the specific IP address you want.

### Verify the new interface

```bash theme={null}
sudo ip a
hostname -i
ssh <new-ip>
ss -tulpn | grep 22
sudo journalctl -u ssh -f
```

In some cases, you must unplug the cable from the old NIC before the server accepts connections on the new IP address.

### Verify DNS

Confirm that UDP 53 is allowed from the new server location to the new DNS servers.

```bash theme={null}
# If dig times out, UDP 53 may be blocked.
dig @<new-dns-server> <test-hostname>

# Test name resolution.
resolvectl query <test-hostname>

# Test UDP 53 connectivity to the new DNS server.
nc -zvu <new-dns-server> 53
```

Confirm CoreDNS is using the expected upstream DNS servers:

```bash theme={null}
COREDNS_POD=$(kubectl get pods -l app.kubernetes.io/name=rke2-coredns -n kube-system -o name)
kubectl exec -it $COREDNS_POD -n kube-system -- cat /etc/resolv.conf
```

## Related resources

* [Admin toolkit](/deployment/on-prem/admin)
* [Install on-premises](/deployment/on-prem/install)
* [Upgrade on-premises](/deployment/on-prem/upgrade)

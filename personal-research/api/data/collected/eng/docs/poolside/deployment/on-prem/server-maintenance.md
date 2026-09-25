# Server and service maintenance

> Stop, start, reboot, or fully shut down a Poolside on-premises model inference node.

## Choose a start or stop method

Use this guide to stop, start, reboot, or fully shut down a Poolside on-premises RKE2 node.

| Goal                                                                       | Use this method                                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Stop and start Poolside inference workloads without stopping RKE2          | [Stop and start Poolside workloads without stopping RKE2](#stop-and-start-poolside-workloads-without-stopping-rke2) |
| Reboot or shut down the node for planned maintenance or hardware servicing | [Reboot or shut down the node](#reboot-or-shut-down-the-node)                                                       |
| Stop RKE2 and remaining RKE2-managed processes without rebooting           | [Stop RKE2 without rebooting](#stop-rke2-without-rebooting)                                                         |
| Preview script actions or use a custom timeout                             | [Run the scripts directly](#run-the-scripts-directly)                                                               |

## Timing expectations

Stopping and starting workloads can take several minutes.

| Action                   | Expected time   | What happens                                                                    |
| ------------------------ | --------------- | ------------------------------------------------------------------------------- |
| Stop Poolside workloads  | 1 to 2 minutes  | Poolside workloads stop. `rke2-server` remains running.                         |
| Start Poolside workloads | 3 to 10 minutes | Poolside workloads start after RKE2 and the GPU Operator report healthy status. |

## Stop and start Poolside workloads without stopping RKE2

Use this method when you want to stop Poolside workloads without stopping RKE2. For example, use this method before short maintenance windows that do not require a full host reboot.

### Stop Poolside workloads

```bash theme={null}
sudo systemctl stop poolside-services
```

This command does not stop `rke2-server`. It stops or scales down Poolside workloads while leaving the RKE2 cluster running.

### Start Poolside workloads

```bash theme={null}
sudo systemctl start poolside-services
```

This command starts `rke2-server` if it is not already active, then starts Poolside workloads.

### Check the current status

```bash theme={null}
sudo systemctl status poolside-services
```

### View live logs

```bash theme={null}
sudo journalctl -t poolside-shutdown -f
sudo journalctl -t poolside-startup -f
```

## Reboot or shut down the node

Use this method for planned maintenance or hardware servicing, such as operating system patching, kernel updates, or GPU replacement.

### Reboot the node

```bash theme={null}
sudo reboot
```

### Shut down the node

```bash theme={null}
sudo shutdown -h now
```

After the host starts again, check RKE2 and Poolside workloads:

```bash theme={null}
sudo systemctl status rke2-server
kubectl get nodes
kubectl get pods -A
```

## Stop RKE2 without rebooting

Use this method when you need to fully stop RKE2-managed processes but cannot reboot the host.

<Warning>
  Stopping `rke2-server` alone is not sufficient. RKE2 can leave DaemonSet pods and static control-plane pods running under orphan `containerd-shim` processes until `rke2-killall.sh` stops them.
</Warning>

### Stop RKE2

```bash theme={null}
sudo systemctl stop rke2-server
```

### Clean up remaining RKE2 processes

```bash theme={null}
sudo /usr/local/bin/rke2-killall.sh
```

### Verify that RKE2 stopped

```bash theme={null}
sudo systemctl is-active rke2-server
```

Expected result: `inactive`.

Check for remaining `containerd-shim` processes:

```bash theme={null}
ps -ef | grep containerd-shim | grep -v grep | wc -l
```

Expected result: `0`.

## Run the scripts directly

Use this method when you want to preview actions with `--dry-run` or set a custom timeout.

### Preview shutdown or startup actions

```bash theme={null}
sudo /usr/local/bin/poolside-shutdown.sh --dry-run
sudo /usr/local/bin/poolside-startup.sh --dry-run
```

### Run with a custom timeout

Specify the timeout in seconds:

```bash theme={null}
sudo /usr/local/bin/poolside-shutdown.sh --timeout 120
sudo /usr/local/bin/poolside-startup.sh --timeout 120
```

### Show script help

```bash theme={null}
/usr/local/bin/poolside-shutdown.sh --help
/usr/local/bin/poolside-startup.sh --help
```

When you run `poolside-shutdown.sh` directly, the script may stop `rke2-server` as its last step. If it does, run `rke2-killall.sh` to clean up remaining RKE2-managed processes.

## Troubleshooting

| Symptom                                                                   | Likely cause                                                             | Action                                                                                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `systemctl stop poolside-services` returns immediately with no log output | The unit is not active, or the current bundle does not install the unit. | Check `systemctl is-active poolside-services` and confirm whether the current deployment includes the unit.                      |
| `systemctl stop poolside-services` hangs                                  | One or more pods did not stop before the unit timeout.                   | Run `kubectl get pods -A`, then inspect stuck pods with `kubectl describe pod <pod-name> -n <namespace>`.                        |
| Startup finishes but pods remain `Pending`                                | GPUs are not allocatable or required images are unavailable.             | Check `kubectl get nodes -o yaml \| grep nvidia.com/gpu`, `kubectl get pods -n gpu-operator`, and pod events.                    |
| Model pods remain in `Init`                                               | The model pod is downloading checkpoints or cannot access model storage. | Check `kubectl logs <pod-name> -c model-downloader -n poolside-models`.                                                          |
| `containerd-shim` processes remain after `rke2-killall.sh`                | Some containers were not reaped on the first pass.                       | Re-run `sudo /usr/local/bin/rke2-killall.sh`. If shims persist, list them with `ps -ef \| grep containerd-shim \| grep -v grep`. |

## Related resources

* [Admin toolkit](/deployment/on-prem/admin)
* [Relocate an on-premises server](/deployment/on-prem/relocation)
* [Upgrade on-premises](/deployment/on-prem/upgrade)

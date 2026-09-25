# Certified stacks

> Certified software stacks for supported Poolside on-premises model inference deployments.

Poolside certifies specific software stacks for supported on-premises model inference deployments. Each release page lists the certified component versions for that release.

<Note>
  Support is limited to the current stable release and previous major version. Beta and pre-release deployments receive best-effort support only. Custom software versions require a separate support agreement.
</Note>

Certified stack pages are listed in this section by release month. Select the page that matches your on-premises model inference bundle version. To inspect the exact components running in your environment, use the registry query below.

## View the software components in your deployment

Each Poolside release includes a Software Bill of Materials (SBOM) that provides a complete, versioned inventory of included software components.

To inspect the exact container images and tags available in your deployment, query the local container registry directly.

```bash theme={null}
for repo in $(curl -s "http://localhost:30500/v2/_catalog?n=1000" | jq -r '.repositories[]'); do
  echo "=== $repo ==="
  curl -s "http://localhost:30500/v2/$repo/tags/list" | jq -r '.tags[]?' 2>/dev/null
done
```

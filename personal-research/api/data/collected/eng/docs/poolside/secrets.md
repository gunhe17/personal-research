# Secrets

> Store sensitive values like API keys and tokens that agents can use without exposing the raw value.

Secrets let you store sensitive values such as API keys and tokens that agents can use at runtime. When an agent needs a secret, it references it by name, not value. The runtime resolves the actual value, passes it to the tool, and redacts it from output before the agent sees it.

In Poolside Agent CLI, you manage local secrets with `pool secrets`. Poolside stores local secrets in your OS keychain.

<Info>
  The agent never sees the raw secret value in its context window. Poolside redacts the value from tool output.
</Info>

## How secrets work

<Steps>
  <Step title="Store a secret">
    You store a secret with a name, description, and value.
  </Step>

  <Step title="Agent discovers secrets">
    The agent can find available secret names and descriptions, but never the secret values.
  </Step>

  <Step title="Agent references a secret">
    When the agent needs to use a secret, it creates a reference to the stored secret in the tool argument. You do not need to type the reference or expose the raw value.
  </Step>

  <Step title="Runtime resolves the value">
    Poolside replaces the reference with the actual secret value before the tool executes.
  </Step>

  <Step title="Output is redacted">
    After execution, Poolside scans tool output and replaces the secret value with `⟦SECRET_REDACTED⟧` before the agent sees the output.
  </Step>
</Steps>

## Manage local secrets

Use `pool secrets` to manage local secrets in your OS keychain:

```bash theme={null}
pool secrets list
pool secrets add <secret-name> -d "<description>"
pool secrets get <secret-name> --show-value
pool secrets edit <secret-name> --name <new-name>
pool secrets delete <secret-name>
```

The `add` command prompts for the secret value interactively with masked input.

Local secrets have these constraints:

* Name: 6 to 256 characters. Letters, digits, underscores, periods, slashes, and hyphens only.
* Value: 4 to 2,560 bytes.

## Use secrets in agent sessions

During an interactive `pool` session, the agent automatically uses secrets interpolation when it needs to pass a secret in a tool argument. To have the agent use a specific secret, mention the secret by name in your prompt.

For example, the agent might use the following syntax to call the GitHub API. The exact syntax can change between versions:

```bash title="GitHub API example" theme={null}
curl -H 'Authorization: Bearer ⟦secret⋮github_token⟧' https://api.github.com/user
```

At runtime, Poolside replaces the interpolation syntax with the actual token value before it executes the tool and redacts the token from the output. This means the secret value is not sent to inference providers or stored in trajectory logs.

## Secret approval

When an agent references a secret for the first time, Poolside checks whether to allow it:

1. **Settings allow list**: If the secret name matches an entry in `secrets.allow` from your `settings.yaml`, Poolside auto-approves it.
2. **Session history**: If you already approved the secret in this session, Poolside auto-approves it.
3. **User prompt**: Otherwise, Poolside asks you to approve or deny the secret.

### Auto-approve secrets

Add secret names to the `secrets.allow` list in your `settings.yaml` to skip approval prompts:

```yaml theme={null}
secrets:
  allow:
    - NPM_TOKEN
    - OPENAI_API_KEY
```

Matching is by exact name only.

For a complete reference of supported `settings.yaml` keys, see [Settings file reference](/settings-file-reference).

**Settings file locations**

| File location                      | Use this for                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `.poolside/settings.local.yaml`    | Personal, project-specific. <br />Do not commit. Takes precedence over all other files.     |
| `.poolside/settings.yaml`          | Shared, project-specific. <br />Commit and share with your team.                            |
| `~/.config/poolside/settings.yaml` | Personal defaults (all projects). <br />Applies when no project-level settings override it. |

For more information about settings file locations and precedence, see [Permissions](/permissions#file-locations).

## Redaction

When an agent uses a secret during a tool run, Poolside scans tool output for sensitive values and replaces matches with `⟦SECRET_REDACTED⟧` before the agent sees the output. Pattern-based redaction can also apply to text you send to the agent. You can add user redaction patterns or control fallback default patterns in `settings.yaml`.

## Related resources

* [Permissions](/permissions)
* [Settings file reference](/settings-file-reference)

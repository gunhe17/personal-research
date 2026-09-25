# Run Poolside in GitHub Actions

> Automate code review, security scans, release notes, and other repository tasks with Poolside in GitHub Actions workflows.

GitHub Actions runs Poolside on an event, a schedule, or on demand from the **Actions** tab, so repository work does not depend on someone opening a terminal to run it. Use it to review pull requests, scan for vulnerabilities, draft release notes, or run any task you would give Poolside interactively.

## Watch the setup video

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/mhV3PcPMjWo" title="GitHub Actions setup video - embed" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

## Prerequisites

* You can create GitHub Actions workflows and repository secrets.
* You have a Poolside API key. Workflows authenticate with an API key instead of `pool login`, so any access method works: Poolside Platform, your organization's Poolside deployment, OpenRouter, or another OpenAI-compatible provider that serves Poolside models. See [Get and set your API key](/api/overview#get-and-set-your-api-key).

## Steps

1. **Add your API key as a repository secret:**

   1. In your GitHub repository, go to **Settings**.
   2. Select **Secrets and variables**, then select **Actions**.
   3. Click **New repository secret**.
   4. Name the secret `POOLSIDE_API_KEY` and paste your Poolside API key as the value.
   5. Click **Add secret**.

   `pool` checks the `POOLSIDE_API_KEY` environment variable before it reads stored credentials, so workflows do not need a login step. For more options, see [use secrets in GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).

2. **Add a workflow file:**

   A workflow is a YAML file in your repository's `.github/workflows/` directory. Copy one of the examples under [Workflow examples](#workflow-examples) into a new file, such as `.github/workflows/poolside.yml`. Update the model and endpoint values as described in [Set workflow variables](#set-workflow-variables), then commit the file to your default branch.

3. **Run the workflow:**

   How a workflow starts depends on its trigger. A workflow with `on: pull_request` runs the next time someone opens a pull request. A workflow with `on: workflow_dispatch` waits for you to start it by hand from the **Actions** tab, using the **Run workflow** button.

   Open the **Actions** tab to watch the run and see its output. Each example under [Workflow examples](#workflow-examples) states where its result appears.

## Set workflow variables

The `pool exec` examples target Poolside Platform with `POOLSIDE_STANDALONE_BASE_URL`. Each example sets `POOLSIDE_STANDALONE_MODEL` so its model selection does not depend on the CLI default. Before you copy a workflow, replace `<poolside-model-id>` with a model available to your API key. To use the default model instead, remove `POOLSIDE_STANDALONE_MODEL`.

To find model IDs for your access method, see [List available models](/api/openai-api-examples#list-available-models).

* **Poolside deployment**: Replace the Poolside Platform environment variables with:

  ```yaml title="Poolside deployment" theme={null}
  POOLSIDE_API_KEY: ${{ secrets.POOLSIDE_API_KEY }}
  POOLSIDE_API_URL: <api-url>
  ```

  Use the API URL from your administrator. Do not use your deployment's `/openai/v1` endpoint for `POOLSIDE_API_URL`.

  Remove the `POOLSIDE_STANDALONE_BASE_URL` and `POOLSIDE_STANDALONE_MODEL` lines when you switch to a deployment. Do not set `POOLSIDE_API_URL` alongside the standalone variables.

* **OpenRouter or another OpenAI-compatible provider**: Replace the Poolside Platform environment variables with:

  ```yaml title="OpenAI-compatible provider" theme={null}
  POOLSIDE_API_KEY: ${{ secrets.POOLSIDE_API_KEY }}
  POOLSIDE_STANDALONE_BASE_URL: <provider-base-url>
  POOLSIDE_STANDALONE_MODEL: <model-id>
  ```

  Use your provider's OpenAI-compatible base URL, including any required path such as `/api/v1`.

<Note>
  The issue triage example calls the API directly with `curl` instead of `pool exec`. For a Poolside deployment, that example uses the `/openai/v1/chat/completions` path instead of `POOLSIDE_API_URL`.
</Note>

## Workflow examples

Choose the example closest to the task you want to automate. The `pool exec` workflows default to Poolside Platform. To use a Poolside deployment or OpenAI-compatible provider, set the environment variables shown in [Set workflow variables](#set-workflow-variables). Copy a workflow as-is to get started, then change its trigger and prompt to fit your workflow.

### Review pull requests

Reviews each pull request opened from a branch in your repository and posts the review as a comment when the job finishes.

The `if` condition skips pull requests opened from forks. GitHub does not expose repository secrets to those runs, so the Poolside step would fail authentication.

```yaml title=".github/workflows/poolside-review.yml" theme={null}
name: Poolside code review

on:
  pull_request:

jobs:
  review:
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Poolside Agent CLI
        env:
          POOL_INSTALL_ACCEPT_EULA: "1"
        run: |
          curl -fsSL https://downloads.poolside.ai/pool/install.sh | sh
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"

      - name: Review the changes
        env:
          POOLSIDE_API_KEY: ${{ secrets.POOLSIDE_API_KEY }}
          POOLSIDE_STANDALONE_BASE_URL: https://inference.poolside.ai
          POOLSIDE_STANDALONE_MODEL: <poolside-model-id>
          BASE_REF: ${{ github.base_ref }}
        run: >-
          pool exec
          --prompt "Review the changes on this branch against origin/$BASE_REF. Flag risks, breaking changes, and missing tests. Write the review as a Markdown comment to review.md."
          --output json
          --unsafe-auto-allow

      - name: Post the review
        env:
          GH_TOKEN: ${{ github.token }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: gh pr comment "$PR_NUMBER" --body-file review.md
```

### Scan the repository on a schedule

Scans the repository every night at 03:00 UTC and uploads the report under **Artifacts** on the run summary.

`if-no-files-found: error` fails the job when the agent does not produce the report, instead of passing with an empty artifact.

```yaml title=".github/workflows/poolside-scan.yml" theme={null}
name: Poolside nightly scan

on:
  schedule:
    - cron: "0 3 * * *"

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Install Poolside Agent CLI
        env:
          POOL_INSTALL_ACCEPT_EULA: "1"
        run: |
          curl -fsSL https://downloads.poolside.ai/pool/install.sh | sh
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"

      - name: Scan the repository
        env:
          POOLSIDE_API_KEY: ${{ secrets.POOLSIDE_API_KEY }}
          POOLSIDE_STANDALONE_BASE_URL: https://inference.poolside.ai
          POOLSIDE_STANDALONE_MODEL: <poolside-model-id>
        run: >-
          pool exec
          --prompt "Scan the repository for security vulnerabilities. Write a JSON report with severity, location, and remediation for each finding to scan-report.json."
          --output json
          --unsafe-auto-allow

      - name: Upload the report
        uses: actions/upload-artifact@v4
        with:
          name: poolside-scan
          path: scan-report.json
          if-no-files-found: error
```

### Generate release notes when you publish a release

Reads the commits since the previous tag and replaces the release body with generated notes.

```yaml title=".github/workflows/poolside-release-notes.yml" theme={null}
name: Poolside release notes

on:
  release:
    types: [published]

jobs:
  notes:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    env:
      TAG: ${{ github.event.release.tag_name }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Poolside Agent CLI
        env:
          POOL_INSTALL_ACCEPT_EULA: "1"
        run: |
          curl -fsSL https://downloads.poolside.ai/pool/install.sh | sh
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"

      - name: Generate release notes
        env:
          POOLSIDE_API_KEY: ${{ secrets.POOLSIDE_API_KEY }}
          POOLSIDE_STANDALONE_BASE_URL: https://inference.poolside.ai
          POOLSIDE_STANDALONE_MODEL: <poolside-model-id>
        run: >-
          pool exec
          --prompt "Find the tag immediately before $TAG, read the commits between that tag and $TAG with git log, and write concise release notes grouped by type of change to notes.md."
          --output json
          --unsafe-auto-allow

      - name: Update the release
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh release edit "$TAG" --notes-file notes.md
```

### Classify new issues

Classifies new issues from trusted authors as a bug, feature, or question and writes the model's response to the step log. This workflow sends the issue body directly to the model, so it does not need repository checkout or Poolside Agent CLI. The `if` condition limits it to repository owners, organization members, and outside collaborators.

Building the payload with `jq` keeps issue text out of the shell command.

For a Poolside deployment, replace `https://inference.poolside.ai/v1/chat/completions` with your deployment's `/openai/v1/chat/completions` endpoint. For an OpenAI-compatible provider, use that provider's chat completions URL, store its key in `POOLSIDE_API_KEY`, and replace the model ID with a provider model ID.

```yaml title=".github/workflows/poolside-triage.yml" theme={null}
name: Poolside issue triage

on:
  issues:
    types: [opened]

jobs:
  triage:
    if: >-
      github.event.issue.author_association == 'OWNER' ||
      github.event.issue.author_association == 'MEMBER' ||
      github.event.issue.author_association == 'COLLABORATOR'
    runs-on: ubuntu-latest
    permissions: {}
    steps:
      - name: Classify the issue
        env:
          POOLSIDE_API_KEY: ${{ secrets.POOLSIDE_API_KEY }}
          ISSUE_BODY: ${{ github.event.issue.body }}
        run: |
          jq -n --arg body "$ISSUE_BODY" '{
            model: "<poolside-model-id>",
            messages: [{
              role: "user",
              content: ("Classify this issue as bug, feature, or question. Reply with one word.\n\n" + $body)
            }]
          }' > request.json

          curl --fail-with-body --request POST \
            --url https://inference.poolside.ai/v1/chat/completions \
            --header "Content-Type: application/json" \
            --header "Authorization: Bearer $POOLSIDE_API_KEY" \
            --data @request.json
```

## Customize a workflow

Use the examples as starting points. Change the trigger, prompt, output step, and model settings to fit the repository task you want to automate.

### Change the trigger

GitHub Actions supports a wide range of workflow events. The same patterns extend to other triggers:

| Trigger             | When it runs                                 | Example task                                              |
| ------------------- | -------------------------------------------- | --------------------------------------------------------- |
| `push`              | Commits land on a branch                     | Keep generated files or documentation in sync with `main` |
| `issues`            | Someone opens an issue                       | Triage, label, and request missing reproduction details   |
| `issue_comment`     | Someone comments on an issue or pull request | On-demand agent runs from a slash command                 |
| `workflow_run`      | Another workflow completes                   | Analyze a failing CI run and suggest a fix                |
| `workflow_dispatch` | You trigger the workflow manually            | Ad-hoc tasks with custom inputs                           |

Anyone can open an issue or comment on a public repository, so gate `issues` and `issue_comment` workflows on the author before the agent runs. For example, check `author_association` for `OWNER`, `MEMBER`, or `COLLABORATOR` before running slash commands.

To review only some pull requests, add `paths` or `branches` filters to the `pull_request` trigger. To make a scheduled workflow available on demand, add `workflow_dispatch:` to the triggers.

### Change the prompt

The prompt is the part of the workflow that is yours. Prompts that work well in CI name the input, the output, and where the output goes:

```text theme={null}
Review the changes on this branch against origin/main. Write the review to review.md.
Find TODO comments added in the last 30 days and write them to todos.md as a checklist.
Update the API reference in docs/api.md to match the exported functions in src/.
Summarize the test failures in test-output.txt and suggest a fix for each one.
```

A later step then does something with the file the agent wrote, such as posting a comment, opening a pull request, updating a release, committing a `CHANGELOG.md` file, or uploading an artifact.

For longer prompts, commit a prompt file to the repository and pass it with `pool exec --prompt-file prompt.txt`.

For direct API calls, change the prompt and the data you pass in. To get a machine-readable answer, add a `response_format` object. See [Constrain the response format](/api/openai-api-examples#constrain-the-response-format).

### Change the model and settings

To use a different model with Poolside Platform or an OpenAI-compatible provider, change `POOLSIDE_STANDALONE_MODEL` in the workflow.

Each example workflow uses two `pool exec` flags that suit automation:

* `--output json` prints newline-delimited JSON that later steps can parse.
* `--unsafe-auto-allow` lets the agent run without approval prompts. Explicit deny rules still apply.

For all flags and exit codes, see [Automate tasks](/cli/automated-mode) and the [CLI reference](/cli/cli-reference#pool-exec).

## Secure agent workflows

`--unsafe-auto-allow` approves the agent's tool actions without prompting. Before you use it:

* Run agent workflows only from trusted events, branches, and actors. Event payloads such as pull request diffs, issue bodies, and comments become agent input.
* Pass event values such as branch names, issue titles, and comment bodies through the `env` block instead of placing them directly in the `run` command.
* Use [permissions](/permissions) and [sandboxes](/sandboxes) to limit what the agent can access and run.
* On `pull_request` runs from forked repositories, GitHub does not expose repository secrets, so Poolside steps fail authentication by design.
* Do not change a `pull_request` workflow to `pull_request_target` to work around that. GitHub withholds secrets from forked pull-request workflows by design, and `pull_request_target` can expose secrets to code you do not control. See [secure use of `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target).

## Troubleshooting

| Symptom                                                  | Cause and fix                                                                                                                                                           |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pool: command not found`                                | The installer puts `pool` in `$HOME/.local/bin` and does not change your `PATH` in a headless run. Add `echo "$HOME/.local/bin" >> "$GITHUB_PATH"` to the install step. |
| The install step waits or fails on the license agreement | Set `POOL_INSTALL_ACCEPT_EULA: "1"` on the install step. The installer cannot prompt in a workflow.                                                                     |
| `401` or `403` from the Poolside step                    | Check that the secret name is `POOLSIDE_API_KEY`, that it holds a key for the access method the workflow points at, and that the base URL matches that access method.   |
| The Poolside step fails only on pull requests from forks | Expected. GitHub withholds repository secrets from forked pull-request runs. See [Secure agent workflows](#secure-agent-workflows).                                     |
| The job passes but the artifact is empty                 | The agent did not write the file the next step expects. Name the output file in the prompt, and set `if-no-files-found: error` on `actions/upload-artifact`.            |

## Related resources

* [Tool integrations](/tools)
* [Install Poolside Agent CLI: CI and automation](/cli/install#ci-and-automation)
* [Automate tasks](/cli/automated-mode)
* [Permissions](/permissions)
* [Sandboxes](/sandboxes)

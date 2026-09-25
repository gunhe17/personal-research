# Install Poolside Agent CLI

> Install `pool` and sign in.

Install the `pool` command to use Poolside from the terminal or in CI.

<Info>
  This documentation describes Poolside Agent CLI v1.0.13. Check your version with `pool --version`. To update, exit any active session and run `pool update` from your terminal. See [Poolside Agent CLI releases on GitHub](https://github.com/poolsideai/pool/releases) for release history.
</Info>

## Prerequisites

* On macOS or Linux, `curl` or `wget`, and `tar`
* <Badge className="beta-badge" size="sm">BETA</Badge> On Windows, PowerShell and `tar`

## Install and authenticate

<Steps>
  <Step title="Install">
    <Tabs>
      <Tab title="macOS or Linux">
        Run either command:

        ```bash theme={null}
        curl -fsSL https://downloads.poolside.ai/pool/install.sh | sh
        ```

        ```bash theme={null}
        wget -qO- https://downloads.poolside.ai/pool/install.sh | sh
        ```

        The installer asks you to accept the Poolside End User License Agreement. In headless environments, run `export POOL_INSTALL_ACCEPT_EULA=1` before you run the installer.

        The script installs `pool` to `~/.local/bin` by default unless `POOL_INSTALL_DIR` or `XDG_BIN_HOME` is set. If that directory is already on your PATH, the CLI is ready to use immediately. Otherwise, the installer either prompts to add it to your shell config or prints instructions to add it manually. You can rerun with `POOL_INSTALL_UPDATE_PATH=1` to update your shell config automatically.
      </Tab>

      <Tab title="Windows (beta)">
        By default, the installer places `pool.exe` in `%LOCALAPPDATA%\Programs\pool\bin` unless `POOL_INSTALL_DIR` is set. It also adds the install directory to your user PATH. To skip the automatic PATH update, set `POOL_INSTALL_UPDATE_PATH=0` before running the installer.

        In PowerShell, run:

        ```powershell theme={null}
        irm https://downloads.poolside.ai/pool/install.ps1 | iex
        ```

        The installer asks you to accept the Poolside End User License Agreement. In headless environments, set `$env:POOL_INSTALL_ACCEPT_EULA = "1"` in the same PowerShell session before you run the installer.

        Before you continue:

        * If the installer indicates that the current session needs a PATH update, restart PowerShell or refresh PATH:

        ```powershell theme={null}
        $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'User') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
        ```

        * If the installer says `pool` is not on your PATH, follow the printed instructions to add the install directory to PATH.

        After PATH is refreshed, continue to authentication. If your shell does not resolve `.exe` commands, run the CLI as `pool.exe` instead of `pool`.
      </Tab>
    </Tabs>
  </Step>

  <Step title="Log in">
    Choose the sign-in method that matches your setup. For help choosing a login option, see [Log in to Poolside](/get-started/log-in).

    <Tabs>
      <Tab title="Poolside deployment">
        Use this if your organization has a Poolside deployment.

        ```bash theme={null}
        pool login --api-url <api-url>
        ```

        Replace `<api-url>` with the API URL for your Poolside deployment. Choose browser login or provide an API token. To sign in again later, run `pool login`.
      </Tab>

      <Tab title="Poolside Platform">
        Use this for the fastest way to get free developer access to models hosted by Poolside.

        ```bash theme={null}
        pool login
        ```

        Choose **Use Poolside Platform for free (recommended)**. This opens `platform.poolside.ai` in your browser. Copy the API key that Poolside creates for you, then paste it into the terminal.
      </Tab>

      <Tab title="OpenRouter">
        Use this if you already use OpenRouter or need paid access to Poolside models.

        ```bash theme={null}
        pool login
        ```

        Choose **Use your OpenRouter account**. Enter an OpenRouter API key from [OpenRouter API keys](https://openrouter.ai/keys).
      </Tab>

      <Tab title="OpenAI-compatible provider">
        Use this if you already have an API key for a model server or provider that exposes an OpenAI-compatible chat completions API.

        ```bash theme={null}
        pool login
        ```

        Choose **Connect an OpenAI-compatible provider**. Enter the provider's OpenAI-compatible API base URL and API key. If your server does not validate API keys, enter any non-empty value, such as `local-test`.

        If you run a local model server or use a provider that does not list models from its API, set the model name before starting `pool`:

        ```bash theme={null}
        POOLSIDE_STANDALONE_MODEL=<model-name> pool
        ```
      </Tab>
    </Tabs>
  </Step>

  <Step title="Verify">
    ```bash theme={null}
    pool --version
    ```

    Then choose the workflow you want to use:

    * [Work from the terminal](/cli/interactive-mode)
    * [Automate tasks](/cli/automated-mode)
    * [Use Poolside in another ACP-compatible editor](/tools/other-acp)
  </Step>
</Steps>

<Note>
  For `pool` CLI bugs and feature requests, open an issue on [GitHub](https://github.com/poolsideai/pool).
</Note>

## Configure and inspect paths

Run `pool config` to see where the CLI stores configuration, credentials, logs, and trajectories.

Run `pool config settings` to edit `settings.yaml` in your editor. After the editor exits, the CLI validates the file before saving it.

By default, Poolside stores configuration files in `~/.config/poolside`. This includes `settings.yaml`, which stores the saved API URL and other CLI settings, and `credentials.json`, where the CLI stores your saved auth token. If your environment uses a custom configuration directory, `pool` uses that location instead.

Set `POOLSIDE_API_URL` to override the Poolside deployment API URL saved in `settings.yaml` without changing the file. For direct provider connections, use `POOLSIDE_STANDALONE_BASE_URL` instead.

## CI and automation

Use environment variables instead of stored credentials in non-interactive environments.

| Variable                       | What it sets                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `POOLSIDE_API_KEY`             | Auth token for a Poolside deployment, Poolside Platform, OpenRouter, or an OpenAI-compatible provider         |
| `POOLSIDE_TOKEN`               | Alternative auth token for a Poolside deployment                                                              |
| `POOLSIDE_API_URL`             | Poolside deployment API URL for centrally managed agents and permissions; overrides the saved setting         |
| `POOLSIDE_STANDALONE_BASE_URL` | Provider's OpenAI-compatible base URL, including any required path such as `/api/v1`; selects standalone mode |
| `POOLSIDE_STANDALONE_MODEL`    | Optional model ID that overrides the default for standalone mode                                              |

`pool` checks these before reading from configuration files.

When you set `POOLSIDE_STANDALONE_BASE_URL` for Poolside Platform, either `https://inference.poolside.ai` or `https://inference.poolside.ai/v1` works. These docs use the shorter form.

To run the CLI or call Poolside models in a GitHub Actions workflow, see [Run Poolside in GitHub Actions](/tools/github-actions).

For authentication, `pool` checks in this order:

* When connected to a Poolside deployment: `POOLSIDE_API_KEY`, `POOLSIDE_TOKEN`, then `credentials.json`
* For Poolside Platform, OpenRouter, or OpenAI-compatible provider connections: `POOLSIDE_API_KEY`, then `credentials.json`

## Uninstall Poolside Agent CLI

Use these steps to remove the `pool` command and, if needed, saved local configuration and state.

If your environment uses custom configuration, log, or trajectory directories, run `pool config` before you start and note the paths.

1. To remove stored authentication credentials, log out:

   ```bash theme={null}
   pool logout
   ```

   `pool logout` removes locally stored credentials. If you signed in to a Poolside deployment, it also revokes that credential on the deployment. If `pool` cannot reach the deployment, it removes the local credential anyway. If you signed in through Poolside Platform, OpenRouter, or an OpenAI-compatible provider, Poolside removes the credential only from your machine. To revoke those keys, use the provider's console.

2. Remove the installed binary. By default, it is at `~/.local/bin/pool` on macOS or Linux, or `%LOCALAPPDATA%\Programs\pool\bin\pool.exe` on Windows, unless `POOL_INSTALL_DIR` was set during installation. On macOS or Linux, `XDG_BIN_HOME` can also change the default location.

   To locate your copy, run `command -v pool` on macOS or Linux, or `Get-Command pool` on Windows. If the command reports a path, remove that file. If it reports an alias or function, remove the alias or function from your shell configuration or PowerShell profile. On macOS or Linux, if `ls -l <path>` shows the file is a symlink, remove its target too.

3. Remove saved local configuration (optional). Remove the config directory from the `pool config` output you noted earlier. If you did not note a custom config directory, remove the default config directory: `~/.config/poolside` on macOS or Linux, or `%USERPROFILE%\.config\poolside` on Windows.

   This directory holds `settings.yaml` and `credentials.json`. To use the CLI again later, you may need to run `pool login` and recreate local settings.

4. If the installer added a PATH entry only for `pool`, remove that entry from your shell configuration or user PATH. Do not remove a shared directory such as `~/.local/bin` from PATH if you use it for other tools.

5. Remove saved local state (optional). This includes logs, trajectories, session history, and other saved runtime state. It does not delete files from your projects. Remove the default directories for your platform:

   * macOS: `~/Library/Application Support/poolside`
   * Linux: `~/.local/state/poolside` and `~/.local/share/poolside`
   * Windows: `%LOCALAPPDATA%\poolside`

   On a custom setup, remove the `poolside` directories under the custom state or data locations you configured. The log and trajectory paths from `pool config` can help you identify the state directory.

If `pool` still runs after you remove the binary, you likely have another installation or a leftover shell alias. Run `type pool` on macOS or Linux, or `Get-Command pool` on Windows, to see what your shell is running.

# Quickstart

> Install Poolside Agent CLI, log in, and run your first agent task.

Set up Poolside in your terminal and send your first prompt to an agent.

<Tip>
  Want to try a Poolside model before installing anything? Use [chat.poolside.ai](https://chat.poolside.ai/) to send prompts from your browser. No sign-up required.
</Tip>

## Watch the quickstart video

Watch how to install `pool`, authenticate with Poolside Platform, make an OpenRouter request, and choose when to use open-weight models.

<Frame caption="Three ways to your first call">
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/uqrXl2BAJPo" title="Three ways to make your first call" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

## Prerequisites

* A local project or repository you can use for your first task.
* On macOS or Linux, `curl` or `wget`, and `tar`.
* On Windows, PowerShell and `tar`.

## Step 1: Install Poolside Agent CLI

<Tabs>
  <Tab title="macOS or Linux">
    Run one of the following commands:

    ```bash title="Install with curl" theme={null}
    curl -fsSL https://downloads.poolside.ai/pool/install.sh | sh
    ```

    ```bash title="Install with wget" theme={null}
    wget -qO- https://downloads.poolside.ai/pool/install.sh | sh
    ```
  </Tab>

  <Tab title="Windows (beta)">
    In PowerShell, run:

    ```powershell theme={null}
    irm https://downloads.poolside.ai/pool/install.ps1 | iex
    ```
  </Tab>
</Tabs>

Verify the installation:

```bash theme={null}
pool --version
```

The command prints the installed version.

For installation details, see [Install Poolside Agent CLI](/cli/install).

## Step 2: Log in

Run:

```bash theme={null}
pool login
```

<Tip>
  Looking for the fastest way to get a free Poolside API key? Choose **Use Poolside Platform for free (recommended)**.
</Tip>

Choose how you want to access models with the Poolside agent:

| Option shown in the CLI                                      | Description                                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Poolside Platform for free (recommended)**             | Choose this option for fast, free developer access. Sign in to Poolside Platform, then copy the API key it creates for you. Recommended for most users. |
| **Use your organization's Poolside deployment (enterprise)** | Choose this option if your organization has a Poolside deployment.                                                                                      |
| **Use your OpenRouter account**                              | Choose this option if you already use OpenRouter or need paid access to Poolside models.                                                                |
| **Connect an OpenAI-compatible provider**                    | Choose this option if you use another provider, your own server, or an organization gateway that serves Poolside models.                                |

For more information, including where to get an API key or token, see [Log in to Poolside](/get-started/log-in).

## Step 3: Start a session

Go to the project directory you want to work in and start `pool`:

```bash theme={null}
cd <project-path>
pool
```

The session stays open so you can:

* Send follow-up prompts
* Review responses
* Approve file or command actions when needed

Send your first prompt:

```text theme={null}
Summarize this project and suggest one small improvement.
```

You know setup worked when Poolside responds in the terminal and waits for your next prompt.

## Next steps

<CardGroup cols={2}>
  <Card title="Keep working in the terminal" icon="terminal" href="/cli/interactive-mode">
    Use `pool` for longer interactive sessions.
  </Card>

  <Card title="Use Poolside in an editor" icon="code" href="/tools#editors">
    Connect Poolside to an editor or editor extension.
  </Card>

  <Card title="Automate a task" icon="bolt" href="/cli/automated-mode">
    Use `pool exec` for one-shot prompts and scripts.
  </Card>

  <Card title="Call the API" icon="brackets-curly" href="/api/overview">
    Send model requests from your own tools and services.
  </Card>

  <Card title="Example prompts" icon="lightbulb" href="/resources/example-prompts">
    Try prompts for common development tasks.
  </Card>

  <Card title="Configure Poolside" icon="sliders" href="/configure">
    Shape agent behavior and control what it can access.
  </Card>
</CardGroup>

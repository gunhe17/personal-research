# How to run a Poolside model locally

> Run an open-weight Poolside model locally to power a coding agent on your own hardware.

Use Ollama, Poolside Agent CLI, and an open-weight Poolside model to run a coding agent on your own hardware, such as Laguna S 2.1 on NVIDIA DGX Spark.

With this setup, Ollama serves the model locally and `pool` connects to it from your project directory. Your code and model traffic stay on the machine where you run the local model server.

<Frame caption="Local Poolside model setup on NVIDIA DGX Spark">
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/_xUowNUVAr0" title="Local Poolside model setup on NVIDIA DGX Spark" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

## Choose a model

| Model        | Parameters                      | License                            | Minimum hardware                                        | Best for                                                |
| ------------ | ------------------------------- | ---------------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| Laguna S 2.1 | 118B total, 8B active per token | [OpenMDW-1.1](https://openmdw.ai/) | 128 GB unified or system memory                         | NVIDIA DGX Spark, high-memory workstations, and servers |
| Laguna XS.2  | 33B total, 3B active per token  | Apache 2.0                         | 32 GB system RAM, or 8 GB VRAM on a discrete NVIDIA GPU | Laptops and single-GPU machines                         |

<Tip>
  Not sure which one? Start with Laguna XS.2 if your machine has less than 128 GB of memory. Move to Laguna S 2.1 when you have a high-memory workstation or server.
</Tip>

## How it works

A local Poolside agent uses four pieces:

* **A Laguna model**: The open-weight model that fits your hardware.
* **Ollama**: The local runtime. Ollama pulls the model and serves it through an OpenAI-compatible endpoint on your machine.
* **Poolside Agent CLI**: The terminal-based coding agent. Use the `pool` command to work with the local model from your project directory.
* **ACP editors**: Editors compatible with the Agent Client Protocol (ACP), such as JetBrains and Zed, can use the same local agent through ACP.

## Prerequisites

Before you install the local agent, check that your machine has enough memory, GPU support, and disk space for the model you want to run.

### Hardware

<Tabs>
  <Tab title="Laguna S">
    Laguna S 2.1 can run locally on the following hardware:

    | Platform                                                           | Status                                                                         |
    | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
    | NVIDIA DGX Spark (GB10)                                            | Supported and sized against unified memory                                     |
    | macOS Apple Silicon, 128 GB unified memory or more                 | Supported with Metal through Ollama                                            |
    | NVIDIA Grace Blackwell GB200                                       | Supported and sized against unified memory                                     |
    | NVIDIA data-center GPUs, 96 GB GPU memory or more on a single card | Supported with CUDA through Ollama; use a multi-GPU node for the `f16` weights |

    Use hardware that meets these minimums:

    * 128 GB of unified or system memory. The default `q4_k_m` weights are 75 GB, and the weights and KV cache share the same memory pool.
    * Enough free disk space for the selected model tag plus 8 GB on the Ollama models volume.
  </Tab>

  <Tab title="Laguna XS">
    Laguna XS.2 can run locally on the following hardware:

    | Platform                                                                         | Status                                      |
    | -------------------------------------------------------------------------------- | ------------------------------------------- |
    | macOS Apple Silicon, M1 and newer                                                | Supported with MLX and Metal through Ollama |
    | Linux with NVIDIA GPUs, 8 GB VRAM or more                                        | Supported with CUDA through Ollama          |
    | Linux with NVIDIA DGX Spark or Grace Blackwell systems, including GB10 and GB200 | Supported and sized against unified memory  |

    On NVIDIA systems, Blackwell, Hopper, and Ada GPUs are recommended. Turing and older GPUs may work, but they are not recommended.

    Use hardware that meets these minimums:

    * 32 GB system RAM on Apple Silicon or unified-memory systems.
    * 8 GB VRAM on discrete NVIDIA GPUs.
    * Enough free disk space for the selected model tag plus 8 GB on the Ollama models volume.
  </Tab>
</Tabs>

### Memory and context

<Tabs>
  <Tab title="Laguna S">
    Model weights and KV cache share memory while the model runs. On a 128 GB box the 75 GB of weights leave limited room, so start with a modest context and raise it as memory allows.

    | Total or unified RAM | Recommended tag                     | Recommended context | Notes                                        |
    | -------------------- | ----------------------------------- | ------------------- | -------------------------------------------- |
    | 128 GB               | `q4_k_m`                            | 32K to 64K          | NVIDIA DGX Spark or a 128 GB Mac Studio.     |
    | 192 GB               | `q8_0`, or `q4_k_m` at full context | 256K                | Room for the quantized builds' full context. |
    | 256 GB or more       | `f16`                               | 1M                  | Full precision. Mac Studio Ultra class.      |
  </Tab>

  <Tab title="Laguna XS">
    Model weights and KV cache share memory while the model runs. Use a context length that fits the memory available on your machine.

    | Total or unified RAM | Recommended tag | Recommended context                        | Notes                                 |
    | -------------------- | --------------- | ------------------------------------------ | ------------------------------------- |
    | 32 to 47 GB          | `q4_K_M`        | 16K                                        | Minimum local setup.                  |
    | 48 to 63 GB          | `q4_K_M`        | 32K                                        | More working room for local sessions. |
    | 64 to 95 GB          | `q8_0`          | 65K                                        | Higher precision and longer sessions. |
    | 96 GB or more        | `bf16`          | 65K by default, 256K with `--context 256k` | Full precision and longer context.    |
  </Tab>
</Tabs>

## Step 1: Install Ollama

Install Ollama:

```bash theme={null}
curl -fsSL https://ollama.com/install.sh | sh
```

For other installation options, see the [Ollama documentation](https://docs.ollama.com/).

Confirm Ollama is available:

```bash theme={null}
ollama list
```

## Step 2: Choose and pull a model tag

<Tabs>
  <Tab title="Laguna S">
    The default Ollama tag is `laguna-s-2.1:latest`, which uses the same model blob as `laguna-s-2.1:q4_k_m`. Use a higher-precision tag when you have enough memory.

    | Tag                   | Approximate size | When to use it                                                |
    | --------------------- | ---------------- | ------------------------------------------------------------- |
    | `laguna-s-2.1:latest` | 75 GB            | Default. Recommended for most local setups.                   |
    | `laguna-s-2.1:q4_k_m` | 75 GB            | Same as `:latest`.                                            |
    | `laguna-s-2.1:q8_0`   | 128 GB           | Higher precision, on a machine with 192 GB of memory or more. |
    | `laguna-s-2.1:f16`    | 235 GB           | Full precision, on a machine with 256 GB of memory or more.   |

    Pull the tag you want to run. For example, to pull the default tag, run:

    ```bash theme={null}
    ollama pull laguna-s-2.1:latest
    ```

    <Note>
      The first load reads 75 GB or more off disk, which can exceed Ollama's default five-minute model-load timeout. If the first run times out, set `OLLAMA_LOAD_TIMEOUT=20m`.
    </Note>
  </Tab>

  <Tab title="Laguna XS">
    The default Ollama tag is `laguna-xs.2:latest`, which uses the same model blob as `laguna-xs.2:q4_K_M`. Use a different tag when you want higher precision and have enough memory.

    | Tag                    | Approximate size | When to use it                                              |
    | ---------------------- | ---------------- | ----------------------------------------------------------- |
    | `laguna-xs.2:latest`   | 23 GB            | Default. Recommended for most local setups.                 |
    | `laguna-xs.2:q4_K_M`   | 23 GB            | Same as `:latest`. Cross-platform.                          |
    | `laguna-xs.2:q8_0`     | 37 GB            | NVIDIA on Linux with comfortable VRAM.                      |
    | `laguna-xs.2:bf16`     | 67 GB            | Full precision. Hopper, Blackwell, or 96 GB+ Apple Silicon. |
    | `laguna-xs.2:nvfp4`    | 22 GB            | Apple Silicon only with the MLX backend.                    |
    | `laguna-xs.2:mxfp8`    | 36 GB            | Apple Silicon only with the MLX backend.                    |
    | `laguna-xs.2:mlx-bf16` | 67 GB            | Apple Silicon only with the MLX backend.                    |

    Pull the tag you want to run. For example, to pull the default tag, run:

    ```bash theme={null}
    ollama pull laguna-xs.2:latest
    ```
  </Tab>
</Tabs>

## Step 3: Test the model in Ollama

You can chat with the model directly through Ollama to confirm it works. Use the same tag you pulled in the previous step:

<Tabs>
  <Tab title="Laguna S">
    ```bash theme={null}
    OLLAMA_LOAD_TIMEOUT=20m ollama run laguna-s-2.1:latest
    ```
  </Tab>

  <Tab title="Laguna XS">
    ```bash theme={null}
    ollama run laguna-xs.2:latest
    ```
  </Tab>
</Tabs>

## Step 4: Install Poolside Agent CLI

Install Poolside Agent CLI so `pool` can connect to the model that Ollama serves locally:

```bash theme={null}
curl -fsSL https://downloads.poolside.ai/pool/install.sh | sh
```

Verify the installation:

```bash theme={null}
pool --version
```

The command prints the installed version. For installation details, see [Install Poolside Agent CLI](/cli/install).

## Step 5: Launch `pool` against the local model

Go to the project directory you want to work in, then point `pool` at the model Ollama serves on your machine. Use the same tag you used in step 2.

<Tabs>
  <Tab title="Laguna S">
    ```bash theme={null}
    cd <project-path>
    ollama launch pool --model laguna-s-2.1:latest
    ```
  </Tab>

  <Tab title="Laguna XS">
    This example uses `laguna-xs.2:latest`:

    ```bash theme={null}
    cd <project-path>
    ollama launch pool --model laguna-xs.2:latest
    ```
  </Tab>
</Tabs>

When the session starts, send a prompt:

```text theme={null}
Summarize this project and suggest one small improvement.
```

The setup works when `pool` starts an agent session and responds to the prompt.

## Optional: Work in your editor

Because `pool` supports ACP, you can connect the same local agent to any ACP-compatible editor instead of working from the terminal:

* [Use Poolside in Zed](/tools/zed)
* [Use Poolside in JetBrains](/tools/jetbrains)
* [Use Poolside in another ACP-compatible editor](/tools/other-acp)

## Next steps

<CardGroup cols={2}>
  <Card title="Learn what you can do with pool" icon="terminal" href="/cli/pool">
    Keep working in the terminal with interactive sessions, automation, and other Poolside Agent CLI workflows.
  </Card>

  <Card title="Configure your agent" icon="sliders" href="/configure">
    Shape agent behavior and control what it can do.
  </Card>
</CardGroup>

## Related resources

* [Ollama's integration docs for pool](https://docs.ollama.com/integrations/pool)
* [Download the Laguna S 2.1 model weights](https://huggingface.co/poolside/Laguna-S-2.1)
* [Download the Laguna XS.2 model weights](https://huggingface.co/poolside/Laguna-XS.2)
* [Read how Poolside trained Laguna XS.2 in A Deeper Dive](https://poolside.ai/blog/laguna-a-deeper-dive)
* [Join the Poolside Discord](https://discord.com/invite/poolsideai) to give feedback, ask questions, and share what you build

# Model release notes

> Release notes for Poolside model releases.

Model release notes summarize changes to Poolside models. For the current list of supported models, context windows, and reasoning support, see [Supported models](/get-started/supported-models).

<Update label="July 2026" tags={["Laguna"]}>
  <h2 id="laguna-s-2-1">
    Laguna S 2.1
  </h2>

  Initial Laguna S 2.1 release.

  * Context window: 1M tokens
  * Model type: Mixture of Experts (MoE)
  * Supported modes: Agentic, Chat
  * Modality: Text-to-text
  * Reasoning: Native reasoning with thinking off or max thinking

  Laguna S 2.1 is a 118B total parameter Mixture-of-Experts model with 8B activated parameters per token, built for agentic coding and long-horizon work. It sits between Laguna XS 2.1 and Laguna M.1 in the Laguna model family.

  Use Laguna S 2.1 when you want an agent to:

  * Work through long-running coding and research tasks
  * Hold onto a goal across extended tool use and validation loops
  * Recover from failed approaches and continue making progress
  * Run an open-weight model locally on high-memory hardware, including a single NVIDIA DGX Spark

  **Highlights**

  * **Long-context agentic work**: Laguna S 2.1 supports up to 1M tokens of context for long-horizon coding and research workflows.
  * **Native reasoning support**: You can run requests with thinking off or with max thinking.
  * **Efficient sparse architecture**: Laguna S 2.1 has 118B total parameters and activates 8B parameters per token.
  * **Open-weight release**: Laguna S 2.1 is released under OpenMDW-1.1 with BF16 weights and FP8, INT4, NVFP4, GGUF, and MLX quantizations.

  **Compatibility notes**

  * Laguna S 2.1 is designed for [Poolside Agent CLI](/cli/pool) workflows and OpenAI-compatible API integrations.
  * Download the weights from the [Laguna S 2.1 Hugging Face model card](https://huggingface.co/poolside/Laguna-S-2.1).
  * Run Laguna S 2.1 locally through `pool`, vLLM, SGLang, Ollama, llama.cpp, MLX, or NVIDIA TensorRT-LLM, or access it through OpenRouter and the Poolside API.
  * Laguna S 2.1 is text-to-text and does not support vision inputs.

  **Evaluation and limitations**

  * Read the [Laguna S 2.1 release blog post](https://poolside.ai/blog/introducing-laguna-s-2-1) for benchmark details, evaluation methodology, example trajectories, and known limitations.
  * Full final-evaluation trajectories are available at [trajectories.poolside.ai](https://trajectories.poolside.ai/).
  * Laguna S 2.1 supports two thinking settings: off and max. Max thinking is enabled by default, and low, medium, and high effort controls are not available in this release.
</Update>

<Update label="June 2026" tags={["Laguna"]}>
  ## Laguna XS 2.1

  Incremental update to Laguna XS.2 with native reasoning support and stronger performance on agentic coding benchmarks.

  * Context window: 256K tokens
  * Model type: Mixture of Experts (MoE)
  * Supported modes: Agentic, Chat
  * Modality: Text-to-text

  Laguna XS 2.1 is a 33B total parameter Mixture-of-Experts model with 3B activated parameters per token, designed for agentic coding and long-horizon work on local machines. It is compact enough to run on a Mac with 36 GB of RAM.

  Compared with Laguna XS.2, Laguna XS 2.1 improves on Poolside's reference benchmarks for multilingual coding and terminal-style tasks, and adds native reasoning support with interleaved thinking between tool calls.

  **Improvements**

  * **Native reasoning support**: Interleaved thinking between tool calls, with the ability to enable or disable thinking per request.
  * **Better multilingual coding results**: Improves SWE-bench Multilingual by +5.4% (57.7% to 63.1%) over XS.2.
  * **Better terminal task execution**: Improves Terminal-Bench 2.0 by +1.8% (35.7% to 37.5%) over XS.2.
  * **Lower memory per token**: KV cache quantized to FP8.

  **Compatibility notes**

  * Laguna XS 2.1 is designed for Poolside Agent CLI workflows and OpenAI-compatible API integrations.
  * Laguna XS 2.1 is text-in, text-out only and does not support vision inputs.
</Update>

<Update label="April 2026" tags={["Laguna"]}>
  ## Laguna M.1

  Initial Laguna M.1 release.

  * Context window: 256K tokens
  * Model type: Mixture of Experts (MoE)
  * Supported modes: Agentic, Chat
  * Modality: Text-to-text

  Laguna M.1 is a Laguna family model for agentic work. It is strongest on coding tasks that require multiple steps, tool use, and validation, such as exploring a codebase, editing files, running tests, and iterating on a fix. You get the most value from Laguna M.1 when you use it in Poolside Agent workflows instead of as a standalone chat model.

  Compared with Malibu 2.2, Laguna M.1 improves performance on Poolside's reference benchmarks for agentic coding and tool-using workflows.

  Use Laguna M.1 when you want an agent to:

  * Debug and fix issues across multiple files
  * Explore unfamiliar code and explain what it finds
  * Run longer task sequences that require tool use and verification
  * Work through coding tasks where tests, commands, or other checks are available

  **Improvements**

  * **Stronger coding performance**: Laguna M.1 improves SWE-bench Verified from 55.6% in Malibu 2.2 to 65.4%.
  * **Better multilingual coding results**: Laguna M.1 improves SWE-bench Multilingual from 31.1% in Malibu 2.2 to 57.4%.
  * **Better agentic task execution**: Laguna M.1 improves Terminal-Bench 2.0 from 16.9% in Malibu 2.2 to 32.7%.

  **Tips for prompting**

  * Give Laguna M.1 a clear task with the specific outcome you want.
  * Include relevant context such as file paths, error messages, failing tests, or reference material.
  * State any important constraints up front, such as coding standards, files to avoid, or commands the agent should run.
  * Expect better results when the environment includes tools the agent can use to verify its work.

  **Compatibility notes**

  * Laguna M.1 is designed for Poolside Agent CLI workflows and OpenAI-compatible API integrations.
  * Laguna M.1 is text-to-text and does not support vision inputs.
  * Performance depends on the quality of the instructions and context you provide, the tools available to the agent, and whether the environment supports validation steps such as tests or executable checks.
</Update>

<Update label="April 2026" tags={["Laguna"]}>
  ## Laguna XS.2

  Initial Laguna XS.2 release.

  * Context window: 256K tokens
  * Model type: Mixture of Experts (MoE)
  * Supported modes: Agentic, Chat
  * Modality: Text-to-text

  Laguna XS.2 is the second-generation model in the Laguna family. It is an agentic model that is strongest on coding tasks that require multiple steps, tool use, and validation, such as exploring a codebase, editing files, running tests, and iterating on a fix. You get the most value from Laguna XS.2 when you use it in Poolside Agent workflows instead of as a standalone chat model.

  Laguna XS.2 trades performance on Poolside's reference benchmarks for faster agentic coding, making it a strong companion to its larger counterpart.

  Use Laguna XS.2 when you want an agent to:

  * Debug and fix issues across multiple files
  * Explore unfamiliar code and explain what it finds
  * Run well-defined coding tasks that require fast performance
  * Deploy Poolside on hardware with GPU constraints

  **Improvements**

  * **Stronger coding performance**: Laguna XS.2 improves SWE-bench Verified from 55.6% in Malibu 2.2 to 64%.
  * **Better multilingual coding results**: Laguna XS.2 improves SWE-bench Multilingual from 31.1% in Malibu 2.2 to 60%.
  * **Better agentic task execution**: Laguna XS.2 improves Terminal-Bench 2.0 from 16.9% in Malibu 2.2 to 29%.

  **Tips for prompting**

  * Give Laguna XS.2 a clear task with the specific outcome you want.
  * Include relevant context such as file paths, error messages, failing tests, or reference material.
  * State any important constraints up front, such as coding standards, files to avoid, or commands the agent should run.
  * Expect better results when the environment includes tools the agent can use to verify its work.
  * Keep tasks self-contained by planning with the model.

  **Compatibility notes**

  * Laguna XS.2 is designed for Poolside Agent CLI workflows and OpenAI-compatible API integrations.
  * Laguna XS.2 is text-in, text-out and does not support vision inputs.
  * Performance depends on the quality of the instructions and context you provide, the tools available to the agent, and whether the environment supports validation steps such as tests or executable checks.
</Update>

<Update label="2025" tags={["Malibu"]}>
  ## Malibu 2.2

  * Context window: 128,000 tokens
  * Model type: Dense
  * Supported modes: Agentic, Chat

  Malibu Agent is a family of models from Poolside that can solve complex coding tasks over multiple rounds of tool use. It calls tools to gather context, perform edits, and run applications in order to solve real-world coding problems within large codebases. Malibu Agent is designed for Poolside Agent workflows.

  **Improvements**

  Unlike Poolside's chat model, Malibu 2.1, Malibu Agent is trained to perform multiple rounds of tool calls in order to solve issues or respond to questions. Give it a direct problem to solve with context such as stack traces or file references. It can then read your codebase to understand the issue, perform edits, and verify that its changes solve the issue.

  Example prompts include:

  * Please figure out why `step_events` is null in `@trajectory.jsx`.
  * Can you debug this 500 request? `<insert-your-stack-trace>`.
  * Can you give me an overview of how `ResponseProvider` works and how it interacts with `TrajectorySource`? Where does it store trajectories?

  Given a request, Malibu Agent can:

  * Read files and folders to understand project structure.
  * Edit files.
  * Run programs, such as linters, compilers, tests, or local services, to validate its edits.

  **Tips for prompting**

  * Give Malibu Agent as much context as possible if you have a specific bug, including stack traces and references to files that may be useful.
  * If Malibu Agent is unable to solve an issue, break your request down into smaller, incremental changes, or be more direct. For example, write `Make X change` instead of `Implement this feature`.

  **Known issues**

  * Malibu Agent can be over-reactive to simple commands like `hi` or `how are you today?`. Because it is trained to solve issues, it interprets these simple commands as problems to solve and attempts to solve them. This is a known issue.
  * Malibu Agent can make edits to files unrelated to the task. If this occurs, use the checkpointing feature to roll back its changes.
  * Malibu Agent can sometimes create test scripts to validate its changes, but forget to delete them. Check to make sure you do not commit these to version control.
</Update>

<Update label="2025" tags={["Malibu"]}>
  ## Malibu 2.1

  * Context window: 32,000 tokens

  Malibu 2.1 is an incremental release from Malibu v2.0 that builds on Malibu v2's improvements in code editing, question answering, and agent capabilities.

  **Improvements**

  Major changes and improvements include:

  * **Code editing**: Malibu 2.1 was trained on an expanded set of RLCEF tasks, leading to better downstream performance at generating code edits that solve real-world problems.
  * **Instruction following**: Malibu 2.1 went through additional training to understand and follow user instructions more accurately, especially over the course of long conversations.
  * **Multi-turn and long-context performance**: Malibu v2 sometimes failed to generate high-quality edits in longer conversations and had degraded performance with many files added to its context. Malibu 2.1 addresses these limitations and performs better in these scenarios.
  * **Agent mode improvements**: Malibu 2.1 has improved tool-calling abilities, which improves its accuracy when generating Agent mode commands to search for files.
</Update>

# Poolside overview

> Poolside provides agentic coding models, self-managed inference, APIs, and agent workflows for secure software engineering.

## What Poolside is

Poolside is an AI lab that trains foundation models from scratch for software engineering. Poolside provides agentic coding models, self-managed inference, APIs, and agent workflows for organizations that need to run AI inside environments they control.

With a self-managed deployment, you run Poolside model inference and supporting services in your virtual private cloud (VPC), on-premises data center, or other controlled infrastructure, including [air-gapped environments](/deployment/on-prem/overview). Your code, prompts, and data stay within your environment, so you can support production software workflows while maintaining data control, security boundaries, and predictable inference costs.

The Laguna model family is built for agentic, long-horizon coding. Poolside releases Laguna model weights publicly so developers and teams can evaluate, inspect, and run the models. Use Laguna models with Poolside agent workflows or through an OpenAI-compatible API. See [Supported models](/get-started/supported-models) to choose a model and compare capabilities. Model weights and comparison details are available at [poolside.ai/models](https://poolside.ai/models).

To choose where to work, see [Use Poolside](/use-poolside). You can use Poolside through:

* **[Poolside Agent CLI](/cli/pool)**: Use `pool` for interactive terminal sessions and `pool exec` for scripts, CI jobs, and other non-interactive workflows.
* **[OpenAI-compatible API](/api/overview)**: Send model requests from your own tools and automation through the `/openai/v1` API.
* **[Tool integrations](/tools)**: Use Poolside with ACP-compatible editors, Poolside Assistant, desktop apps, and coding agents.

## Key capabilities

Poolside provides core capabilities built around models, agents, context, and controlled execution to accelerate software engineering workflows.

* **Foundation models for software engineering**: Models trained using reinforcement learning from code execution feedback across hundreds of millions of real-world tasks.

* **Agentic workflows**: Agents that plan, implement, and iterate on complex tasks such as legacy code refactoring, incident analysis, and security reviews.

* **Extensible context**: Ground agents in your standards and systems using agent instructions, skills, MCP servers, and other configured resources.

* **Controlled execution**: Approval prompts, tool permissions, and sandbox options help you control what agents can do in your environment.

* **Deployment control**: Run model inference in infrastructure you control, with [deployment paths](/deployment/supported-configurations) for cloud, on-premises, and air-gapped environments.

## Common use cases

Teams use Poolside for tasks such as:

* Generating and completing code with awareness of local context
* Explaining unfamiliar or legacy code
* Writing and maintaining code documentation
* Refactoring and modernizing existing systems
* Generating and running tests
* Translating and migrating legacy code
* Automating multi-step engineering tasks using agents
* Investigating incidents and proposing fixes
* Enforcing internal standards using private documentation and policies

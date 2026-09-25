# How agents work

> A conceptual overview of agents powered by large language models, including their core components, behavior, and common use cases.

Poolside uses agents to plan and carry out multi-step tasks on your behalf. The agent interprets your goal, decides which actions to take, uses the tools you allow, and iterates until the task is complete. This page explains how that loop works, so you can understand what happens as Poolside responds to your requests.

## What an LLM agent is

An LLM agent is an AI system that uses a large language model (LLM) as its reasoning engine to take actions, use tools, and complete complex tasks on behalf of users.

## How the agent loop works

Unlike traditional chatbots that only respond to user queries, LLM agents can perceive and interact with their environment. They make decisions and take actions in an iterative loop.

<img src="https://mintcdn.com/poolside/kkMWX_7zqePBFTSJ/images/resources/agentic-loop.png?fit=max&auto=format&n=kkMWX_7zqePBFTSJ&q=85&s=d83b3e20456a3401e6f6155ff91c200b" alt="Agent loop" width="1488" height="1416" data-path="images/resources/agentic-loop.png" />

At a high level, an agent:

* Interprets a user's goal and context
* Plans one or more actions
* Executes those actions using tools permitted by the user
* Inspects the results
* Updates its plan and repeats as needed
* Delivers results and a summary to the user

## Key components

### Model

A model processes information, reasons over the available context, and generates responses that help the agent decide what to do next.

### Tools

Agents use tools to interact with their environment. In Poolside Agent CLI, tools can include reading and editing files, running commands, inspecting command output, and calling configured MCP servers. The agent decides which tools to request based on your prompt, the available context, and the permissions you allow.

### Agent loop

The agent loop is the main process that breaks down complex tasks into steps, maintains goals, and adapts based on outcomes. It also manages short-term context, such as conversation history, and applies compression mechanisms to keep the most important information available as the task progresses. As shown in the diagram, the agent can request permission to run tools, inspect the results, and update its plan before delivering a result and summary.

## Common use cases

* **Code development**: Writing, debugging, and testing code with access to project files and command-line tools
* **Code review**: Inspecting changes, identifying risks, and suggesting fixes
* **Documentation**: Explaining code, generating reference material, and updating docs alongside code changes
* **Repository analysis**: Exploring unfamiliar codebases and summarizing how systems fit together
* **Code migration**: Refactoring code or converting source code from one programming language to another

## Why agents matter

Traditional AI responds to individual prompts. **Agents work toward goals**, breaking down complex objectives into concrete steps, learning from outcomes, and iterating until completion. This shift from reactive to proactive AI unlocks automation of sophisticated, multi-step workflows that previously required human intervention in all steps of the chain.

# Skills

> Use local skills to give agents reusable, task-specific instructions and resources.

Skills package reusable instructions, scripts, and resources that agents can use for specialized tasks. Use a skill when you want an agent to follow a repeatable workflow, apply team-specific conventions, or use supporting files without repeating the same guidance in every prompt.

Poolside supports the [Agent Skills](https://agentskills.io/) format. Each skill is a folder with a `SKILL.md` file that describes when to use the skill and how the agent should apply it. A skill can also include supporting files, such as scripts, references, and templates.

## When to use a skill

Use a skill when you want agents to:

* Follow a repeatable workflow, such as reviewing code against team conventions
* Apply specialized domain guidance for a task
* Use supporting files such as templates, reference docs, or helper scripts
* Reuse the same procedure across projects or team members

Do not use a skill for:

* Broad agent behavior that should apply to every task. Use [AGENTS.md instructions](/agent-instructions) instead.
* Project-specific coding rules that should live with the project. Use `AGENTS.md` instead.
* External tools or services that agents need to invoke. Use an [MCP server](/mcp-servers) instead.

## How skills work

Skills can apply automatically when the description in `SKILL.md` matches your request. You can also explicitly add a skill to the current prompt with the `$` skill picker.

The `description` in `SKILL.md` determines when the agent applies the skill. When the agent uses a skill, it reads the skill instructions and any supporting files it needs.

## Local skill sources

Poolside scans the following local directories for skills:

* `~/.config/poolside/skills/`
* `.poolside/skills/`
* `.agents/skills/`
* `~/.agents/skills/`

Poolside also scans directories used by other tools that use the Agent Skills format, so skills you have already created for those tools can appear in the skill picker automatically.

| Source         | What it's for                             |
| -------------- | ----------------------------------------- |
| Project Skills | Skills stored with the current project    |
| Global Skills  | Personal skills available across projects |

## Skill format

A skill must be a directory with a `SKILL.md` file. The directory name must match the `name` field in the `SKILL.md` frontmatter. The `SKILL.md` file must include YAML frontmatter with a `name` and `description`, followed by Markdown instructions.

```text theme={null}
my-skill/
├── SKILL.md
├── scripts/
├── references/
└── assets/
```

```markdown theme={null}
---
name: code-review
description: Review code changes against team review guidelines. Use when reviewing pull requests, diffs, or local code changes.
---

# Code review

Use this skill to review code changes against the team's review checklist.

## Review process

1. Read the diff.
2. Check the changed code against the review checklist in `references/review-checklist.md`.
3. Report only actionable issues.
```

The `description` helps the agent decide when to use the skill. Write it so it describes both what the skill does and when the agent should use it.

Do not rely on the Agent Skills `allowed-tools` or `compatibility` fields to restrict tools or where a skill can run. Poolside does not enforce those fields.

For the full skill format, see the [Agent Skills specification](https://agentskills.io/specification).

## Skills and sandboxes

If you use local sandboxes, prefer project-level skills in `.poolside/skills/` when a skill must be available inside the sandbox. User-level skills in `~/.config/poolside/skills/` are not mounted in local sandboxes. Only workspace directories and user-configured extra mounts are available inside the container.

## Use a skill

Use the `$` skill picker when you want to explicitly apply a skill to your current prompt in interactive `pool`. Use `/skills` when you want to refresh the skill list and inspect available skills or skill load errors. In compatible Agent Client Protocol (ACP) clients, available skills can appear as slash commands instead.

**Prerequisites**

* You have an active interactive `pool` session.
* The skill is available from a local skill directory.

**Steps**

1. In an interactive `pool` session, type `$` at the start of the prompt or after a space.
2. Continue typing to filter the skill list.
3. Use the arrow keys to select a skill, then press `Tab` or `Enter` to insert the skill reference into your prompt.
4. Finish your prompt and send it.

The selected skill applies to the current prompt. Skills can also apply automatically when the skill description matches your request.

## Create a local skill

Add a local skill when you want to test a repeatable workflow in a project.

**Prerequisites**

* You have write access to the project where you want to add the skill.

**Steps**

1. In your project, create a skill directory under `.poolside/skills/`:

   ```bash theme={null}
   mkdir -p .poolside/skills/code-review
   ```

2. Add a `SKILL.md` file:

   ```bash theme={null}
   touch .poolside/skills/code-review/SKILL.md
   ```

3. Add the required frontmatter and instructions:

   ```markdown theme={null}
   ---
   name: code-review
   description: Review code changes against team review guidelines. Use when reviewing pull requests, diffs, or local code changes.
   ---

   # Code review

   Review code changes against the team's review checklist.
   ```

4. Start an interactive `pool` session in the project.

5. Ask for a task that matches the skill description, such as `Review my current changes against the code review skill`.

If Poolside skips a skill because `SKILL.md` does not match the expected format, verify your `SKILL.md` frontmatter and directory name.

## Troubleshooting

If a skill did not run when you expected, check the following:

* The skill is in one of the local skill directories Poolside scans.
* The skill's `description` matches the task you asked the agent to complete.
* The `SKILL.md` frontmatter is valid and the `name` matches the skill directory.
* The skill is available inside your sandbox, if you run the agent in a sandbox.
* The `/skills` output does not show a load error for the skill.

## Related resources

* [AGENTS.md instructions](/agent-instructions)
* [MCP servers](/mcp-servers)
* [Sandboxes](/sandboxes)

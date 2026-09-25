# AGENTS.md instructions

> Set up instructions for Poolside across personal, project, and directory scopes.

Use `AGENTS.md` files to give Poolside instructions to follow during a session. Add instructions for coding standards, project structure, common commands, response preferences, and constraints.

To learn more about `AGENTS.md` across tools, see [https://agents.md](https://agents.md/).

## How Poolside uses instructions

Poolside uses instructions from personal, project, and directory-level `AGENTS.md` files. When multiple files apply to the same path, Poolside follows this priority order:

| Scope                     | File                                       | Use it for                                                                       |
| ------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| 1. Directory instructions | Nested `AGENTS.md` files in subdirectories | Rules for one part of the codebase, such as frontend, backend, or generated code |
| 2. Project instructions   | `AGENTS.md` at the repository root         | Project architecture, setup commands, coding standards, and common workflows     |
| 3. Personal instructions  | `~/.config/poolside/AGENTS.md` by default  | Preferences and workflows that should follow you across projects                 |

At the start of a session, Poolside reads your personal instructions and the `AGENTS.md` files that apply to the working directory. If the working directory is inside a Git repository, Poolside reads `AGENTS.md` files from the Git repository root through the working directory. If the working directory is not inside a Git repository, Poolside treats the working directory as the root for instruction loading.

As Poolside works in different directories, it also reads any nested `AGENTS.md` files that apply to those paths.

In the following example, three `AGENTS.md` files apply when Poolside works in `app/ui/`: `app/ui/AGENTS.md`, `app/AGENTS.md`, and the root `AGENTS.md`. If you start `pool` from `app/`, Poolside reads the root `AGENTS.md` and `app/AGENTS.md` at the start of the session. Because `app/ui/AGENTS.md` is the most specific file, it takes priority for work in `app/ui/`.

```text theme={null}
repo/
├── AGENTS.md              # instructions for the whole repository
├── app/
│   ├── AGENTS.md          # instructions for all app code
│   └── ui/
│       └── AGENTS.md      # instructions for UI code
└── api/
    └── AGENTS.md          # instructions for API code
```

<Note>
  Because model behavior is not deterministic, responses might not always follow the instruction priority perfectly.
</Note>

## Set up project instructions

Start with project instructions at the repository root. Use directory instructions only when one part of the codebase needs different rules. Use personal instructions for preferences that should follow you across projects.

1. Create an `AGENTS.md` file at the root of your repository.
2. Add a few clear rules about project structure, coding conventions, and common workflows. See [Example project AGENTS.md](#example-project-agents-md).
3. Refine your instructions if Poolside misses important context or behaves inconsistently.

### Example project AGENTS.md

```markdown theme={null}
## Project overview

This repository contains the main application code. The `src/` directory contains product code, `tests/` contains automated tests, and `docs/` contains user-facing documentation.

## Development

- Check `README.md` for setup steps before installing dependencies.
- Run the relevant test command before finishing a code change.
- Use the existing formatter and linter configuration.

## Conventions

- Keep changes focused on the requested task.
- Add or update tests when behavior changes.
- Follow existing naming and file organization patterns.
```

## Add directory-specific instructions

For rules that apply only to one part of a repository, add a nested `AGENTS.md` file in the relevant directory.

Use directory instructions for areas with different setup steps, commands, conventions, or constraints. For example, you might add separate instructions for frontend code, backend code, generated files, or documentation.

### Example directory AGENTS.md

```markdown theme={null}
## Directory overview

This directory contains frontend code for the application UI.

## Development

- Run frontend tests before finishing changes in this directory.
- Use the existing component patterns.
- Do not edit generated files manually.

## Conventions

- Keep components small and focused.
- Follow existing naming and file organization patterns.
```

## Create personal instructions

Use personal instructions for preferences that are not tied to one repository.

1. Create an `AGENTS.md` file in your Poolside config directory.
   By default, Poolside looks for personal instructions at `~/.config/poolside/AGENTS.md` on macOS and Linux. To use a different config directory, set the `XDG_CONFIG_HOME` environment variable.
2. Add personal preferences that should follow you across projects. See [Example personal AGENTS.md](#example-personal-agents-md).
3. Keep project-specific rules in project `AGENTS.md` files instead.

Personal instructions use the same Markdown format as project `AGENTS.md` files. This Markdown file is separate from the `.poolside/` directory that stores settings such as [permissions](/permissions).

### Example personal AGENTS.md

```markdown theme={null}
## Response preferences

- Put the code before the explanation.
- Keep explanations concise unless I ask for more detail.
- When you suggest shell commands, explain any destructive steps.

## Coding preferences

- Prefer immutable patterns over mutation where reasonable.
- Add docstrings to new public functions.
```

## Tips for effective instructions

* Keep instructions short and specific.
* Use Markdown headings to separate project structure, commands, conventions, and workflow rules.
* Include commands Poolside should run before or after common changes.
* Link to existing project documentation instead of duplicating long reference material.
* Keep instructions current. Stale instructions can cause incorrect behavior.

## Understand instruction behavior

* `AGENTS.md` files are guidance, not strict enforcement. For rules that must always apply, such as blocking specific tools, use [permissions](/permissions) instead.
* Poolside skips `AGENTS.md` files in ignored directories, including `.git/`, `node_modules/`, common cache or vendor directories, and paths ignored by repository ignore rules.
* Instructions you type during a session can override `AGENTS.md` instructions.
* Empty `AGENTS.md` files are not sent to the model.
* The model might not follow instructions consistently.

## Related resources

* [Poolside Agent CLI](/cli/pool)
* [Permissions](/permissions)

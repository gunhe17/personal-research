# Unified Harness Protocol — specification `2026-08-11`

An open standard for running complete agent harnesses as shared infrastructure.

This is the normative specification. For an introduction to what UHP is and why it exists, start at
the [protocol README](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/../../README.md).

## Chapters

| # | Chapter | Defines |
|---|---|---|
| 1 | [Architecture](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/architecture.md) | Roles, conformance classes, object model, transport, authentication, design principles |
| 2 | [Lifecycle](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/lifecycle.md) | Version negotiation, capability discovery, task and session states, concurrency |
| 3 | [Harnesses](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) | Discovering, selecting, configuring and managing harnesses; models and availability |
| 4 | [Tasks](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md) | Running work, the response object, model substitution, idempotency |
| 5 | [Streaming](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/streaming.md) | The event vocabulary, ordering guarantees, reconnection |
| 6 | [Sessions](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) | Continuing, inspecting, cancelling, sharing, deleting |
| 7 | [Files](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) | File input, artifacts, download, retention and scope |
| 8 | [Errors](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/errors.md) | The error envelope, codes, retry rules, timeouts |
| 9 | [Security](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/security.md) | Credentials, object scope, artifacts, injection, exhaustion, error hygiene |
| 10 | [Schema](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/schema.md) | Machine-readable definitions and how to generate from them |

## Endpoint summary

| Method | Path | Class | Chapter |
|---|---|---|---|
| `GET` | `/v1/uhp` | Core | [Lifecycle](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/lifecycle.md) |
| `GET` | `/v1/harnesses` | Core | [Harnesses](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `GET` | `/v1/harnesses/{id}` | Core | [Harnesses](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `GET` | `/v1/models` | Core | [Harnesses](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `GET` | `/v1/harnesses/{id}/models` | Core | [Harnesses](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `POST` | `/v1/responses` | Core | [Tasks](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md) |
| `GET` | `/v1/responses/{id}` | Core | [Tasks](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md) |
| `GET` | `/v1/responses/{id}/input_items` | Core | [Tasks](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md) |
| `POST` | `/v1/responses/{id}/cancel` | Core | [Sessions](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `DELETE` | `/v1/responses/{id}` | Core | [Tasks](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/tasks.md) |
| `POST` | `/v1/sessions/{id}/cancel` | Core | [Sessions](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `GET` | `/v1/sessions` | Extended | [Sessions](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `GET` | `/v1/sessions/{id}` | Extended | [Sessions](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `GET` | `/v1/sessions/{id}/turns` | Extended | [Sessions](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `POST` | `/v1/files` | Extended | [Files](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) |
| `GET` | `/v1/sessions/{id}/files` | Extended | [Files](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) |
| `GET` | `/v1/sessions/{id}/files/archive` | Extended | [Files](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) |
| `GET` | `/v1/containers/{cid}/files/{fid}/content` | Extended | [Files](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) |
| `GET` | `/v1/containers/{cid}/files/{fid}/pdf` | Extended | [Files](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/files.md) |
| `POST` | `/v1/harnesses` | Full | [Harnesses](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `PUT` | `/v1/harnesses/{id}` | Full | [Harnesses](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `DELETE` | `/v1/harnesses/{id}` | Full | [Harnesses](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/harnesses.md) |
| `POST` | `/v1/sessions/{id}/share` | Full | [Sessions](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `GET` | `/v1/sessions/{id}/share` | Full | [Sessions](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |
| `DELETE` | `/v1/traces/{id}` | Full | [Sessions](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/sessions.md) |

## Conformance

A server is conformant at a class when it passes the [conformance suite](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/versions/2026-08-11/../../conformance/) at that
class. Nothing else is a conformance claim — not a self-assessment, not an implementation of the
endpoints, not passing "most" tests.

```bash
pip install -e protocol/conformance
uhp-conformance --base-url https://your-server --api-key "$KEY" --class extended
```

The suite is part of this specification. If the suite and this prose disagree, that is a bug in one
of them and MUST be resolved by changing whichever is wrong — never by leaving them inconsistent.

## Conventions

- MUST / SHOULD / MAY are used as defined in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
  [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174).
- JSON examples are illustrative; the [schema](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/versions/2026-08-11/../../schema/) is authoritative for structure.
- Field names are `snake_case` on the task surface (inherited from the Responses-compatible shape)
  and `camelCase` on the harness object. This inconsistency is real, is called out here rather than
  hidden, and is retained because changing either would break existing clients for cosmetic gain.
  A future major version SHOULD unify them.

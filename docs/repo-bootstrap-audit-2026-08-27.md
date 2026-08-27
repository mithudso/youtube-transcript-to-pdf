# Repo Bootstrap Audit — 2026-08-27

Audit of `youtube-transcript-to-pdf` against the mdb-tam repository file
standard, and a record of what was applied, what was adapted, and what was
deliberately excluded.

**Repository shape:** browser extension. No server, no datastore, no MCP
surface, no operator dashboard, zero dependencies. Much of the mdb-tam standard
assumes a long-running service, so this audit adapts rather than transcribes.

**Working tree at audit time:** clean, at `cc02654`.

## Applied

### Workflow infrastructure

| File | Status | Notes |
| --- | --- | --- |
| `CLAUDE.md` | Created | Commands, layout, seven binding rules, verification expectations. |
| `AGENTS.md` | Created | No repo-local agents exist; documents the external agents that operate here and the conventions binding automated edits. |
| `GEMINI.md` | Created | Short form of `CLAUDE.md`. |
| `.github/copilot-instructions.md` | Created | Opens with `## Default Execution Strategy` as the standard requires. |

### Dotfile meta

| File | Status |
| --- | --- |
| `.editorconfig` | Created |
| `.gitattributes` | Created — LF normalisation, binary markers, generated-file marks |
| `.nvmrc` | Created — Node 22 |
| `.vscode/settings.json`, `extensions.json`, `launch.json` | Created |
| `.github/workflows/ci.yml` | Created — checks on Node 20/22/24, then packaging |
| `.github/dependabot.yml` | Created — GitHub Actions only |
| `.github/CODEOWNERS` | Created |
| `.github/PULL_REQUEST_TEMPLATE.md` | Created |
| `.github/ISSUE_TEMPLATE/bug_report.md`, `feature_request.md` | Created |
| `.github/SECURITY.md` | Created |
| `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` | Created |
| `.gitignore`, `LICENSE` | Already present |

### Documentation suite

`ARCHITECTURE.md`, `DEVELOPMENT.md`, `COMPONENTS.md`, `SECURITY.md`,
`TESTING.md`, `INSTALLATION.md`, `requirements.md`, `logging.md`,
`caching-and-optimization.md`, `external-calls.md`,
`integrations-and-assumptions.md`, `known-issues.md`, `onboarding.md`,
`codebase-overview.md` — all created. `README.md` already existed and was left
as the project's entry point.

### Reference and index

| File | Status | Notes |
| --- | --- | --- |
| `docs/codebase-overview.md` | Created | Covers every directory in the repository. |
| `docs/high_signal_file_index.json` | Created | 19 entries, generated from the tree so it cannot be invented. |
| `scripts/check-doc-indexes.mjs` | Created | Validates every indexed path, flags source files missing from the index, `--prune` drops dead entries. Wired into CI as `npm run lint:docs`. |

### Runbooks

`docs/runbooks/transcript-panel-broke.md` and `docs/runbooks/release.md` —
the two recurring operational procedures this project actually has.

## Excluded, with reasons

Each of these is a real part of the mdb-tam standard that does not map onto a
browser extension. Recorded here so a future audit does not re-raise them.

| Standard item | Why not |
| --- | --- |
| `server/src/lib/operations-registry.js` and the generated `docs/operations-registry.json` | The registry exists to make a service's many external calls introspectable and runnable. This extension has three external calls, all in one file, fully documented in [external-calls.md](external-calls.md). A registry would be indirection over a table with three rows. |
| `docs/tool-inventory.json` | Inventories a server's HTTP routes. There is no server and there are no routes. |
| `scripts/generate-ops-registry-doc.mjs`, `ops:doc` / `ops:doc:check` | Generates and drift-checks the registry doc above, which does not exist. |
| The five-standard auto-remediation contract (CLI trigger, centralised error log, auto-remediation map, dashboard card, datastore verification) | Presupposes a service with an operator dashboard and a datastore. The applicable parts — per-call error handling, logging, and documentation — are satisfied and recorded in [external-calls.md](external-calls.md). There is nothing to remediate into and nothing to verify against. |
| `docs/MCP.md`, `.mcp.json`, `.vscode/mcp.json` | The project exposes and consumes no MCP servers. |
| `scripts/semantic_indexer.py`, `scripts/watch_and_index.sh` | A local Ollama and ChromaDB embedding pipeline. This is TAM-internal retrieval infrastructure, not something a public extension repo should carry. |
| `memory.md`, `prompts.md`, `scripts/rotate-workflow-logs.mjs`, `docs/archive/` | Append-forever operator logs recording every session request. That convention suits an internal working repo; committing session transcripts into an extension repository is noise for contributors and a privacy footprint for the maintainer. |
| `.env.example` | The extension reads no configuration. `grep -rn "process.env" src/` returns nothing outside `scripts/`, which reads none either. |
| `.tool-versions` | `.nvmrc` already pins the only toolchain. |
| `CHROMEWEBSTORE.md` | Not yet publishing to the Chrome Web Store. [runbooks/release.md](runbooks/release.md) records what a first submission would require. |

## Findings from the audit itself

| Severity | Finding | Resolution |
| --- | --- | --- |
| Medium | `README.md` cited a test count that had drifted from the suite. | Corrected; [runbooks/release.md](runbooks/release.md) now includes a grep step for count drift. |
| Medium | No CI. Every check was manual. | `ci.yml` runs manifest validation, tests, and doc index validation on three Node versions, then packages. |
| Medium | Nothing prevented documentation index rot. | `check-doc-indexes.mjs`, gated in CI. It caught its own first drift during this run. |
| Low | `package.json` carried no repository, bugs, or homepage fields. | Added. |

## Verification

```
npm run lint:manifest   manifest.json OK — YouTube Transcript to PDF v1.0.0
npm test                31 tests, 31 pass, 0 fail
npm run lint:docs       19 entries, all paths resolve
npm run build           dist/youtube-transcript-to-pdf-1.0.0.zip
```

## Next audit

Re-run after any change to `manifest.json` permissions, any YouTube markup
migration, or before a first Chrome Web Store submission.

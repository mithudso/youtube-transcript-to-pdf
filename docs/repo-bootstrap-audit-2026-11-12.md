# Repository bootstrap audit — 2026-11-12

Audited the complete maintained repository against the pinned mdb-tam file standard and repo-bootstrapper checklist. The [2026-08-27 audit](repo-bootstrap-audit-2026-08-27.md) remains historical evidence. Its browser-only architecture and privacy exceptions still apply; retracted/excluded server infrastructure was not recreated.

## Applicable standard ledger

| Surface | Result and evidence |
| --- | --- |
| `CLAUDE.md`, Copilot instructions | Commands/layout/conventions aligned; Default Execution Strategy remains first; dated audit records replace public session transcripts |
| `AGENTS.md`, `GEMINI.md` | Actual repo has no local agent definitions; external agents and shared rules documented; Gemini points to the binding conventions |
| `.editorconfig`, `.gitattributes`, `.gitignore` | LF/encoding/indent/binary rules checked; private env variants, Python caches, venv and editor swaps excluded |
| `.nvmrc`, `package.json`, CI | Node 22 floor and pin agree; 22/24/26 matrix; zero npm dependencies preserved; syntax/manifest/tests/generated docs plus optional artwork and packaging gates |
| `.vscode` | Removed nonexistent dependency-installed Node launcher and absent ESLint configuration recommendation; retained working built-in JS tooling |
| GitHub governance | Owners and bug/feature templates checked; PR template includes rollback; security reporting links retained with availability-based response wording, no invented SLA |
| Funding | Baseline YAML parser failed on unquoted at-sign handles; corrected supported keys/handles and custom links; no new sponsorship account invented |
| Licensing/contribution | Existing LICENSE and code of conduct preserved; contribution commands and docs links current; no new license grant |
| Architecture/components | Actors, MV3 boundaries, ADRs, pure module contracts, extension API use, language/Print/download behavior and library example reconciled |
| Testing/development/install/requirements | Real commands, runtime prerequisites, all suites, meaningful coverage policy, manual plan and deployment boundary documented |
| Security/privacy/logging/external calls | Direct requests omit credentials; normal YouTube tabs can use their existing session; safe outcome logs and cleanup/storage limitations documented |
| Runbooks and store materials | Release, markup-repair and store-submission steps checked; archive examples updated to 1.0.1; current store publication is unknown, last recorded draft remains historical |
| Wiki | Maintained `docs/wiki/index.md` links orientation, design, safety, integrations, runbooks and dated audits |
| Retrieval | Reviewed deterministic generator refreshes the 31-file index and llms snapshots; CI checks exact generated content plus path coverage; no semantic/model index run |
| Hub registration | Supported project_manager get/upsert/get used; active status preserved and canonical primary repository path retained; no registry file invented or service restarted |
| Data/auth inventory | Only authored synthetic store transcript data is tracked; no account/token/vault/OAuth integration; existing browser tab sessions described truthfully |
| Extension-specific surfaces | No native host, offscreen document or persistent worker state; packaged permissions unchanged; actual source/tool/test/CI/UI coverage is in the companion ledger |

## Deliberate adaptations and non-applicable items

| Standard item | Decision |
| --- | --- |
| Server operations registry, generated server tool inventory, operator dashboard and datastore verification | N/A: this extension has no server, server tools, operator dashboard or datastore. Browser/CLI boundaries and recovery are documented directly. No claim of unadapted service-contract compliance. |
| MCP runtime/configuration/health checks | N/A: no MCP server or client is shipped. Added `docs/MCP.md` to explain this; no `.mcp.json` or editor server config was invented. |
| Semantic indexer, watcher, embedding/model pipeline and concept-tree mutation | Excluded: not this public extension's runtime. No shared semantic store or embedding command was operated by this workflow. Filesystem documentation generation is separate. |
| `memory.md`, `prompts.md`, rotation/archive workflow logs | Existing privacy exception retained. Public dated audit summaries carry the useful maintenance record; raw prompts, transcripts and local reviewer messages stay outside VCS. |
| `.env.example`, credentials and auth health check | N/A: shipped runtime reads no environment variables or provider credentials. Tests' synthetic environment does not create an application configuration requirement. |
| npm lockfile/audit/outdated | N/A: there are no npm dependency declarations and no install step for npm checks. Existing optional Python artwork dependency is isolated and pinned in its dedicated CI job. |
| Numeric coverage target, response SLA, new license | Not invented. Require behavioral regressions, respect existing licensing, and state response availability truthfully. |
| Store submission/live release | Outside this maintenance delivery. Current YouTube compatibility and all manual release checks remain release prerequisites. |

## Validation and workflow outcome

Baseline: `npm run check` passed 31 tests, manifest and path checks; packaging passed. Separate funding YAML syntax failed and was repaired. Full optimizer coverage includes all 31 maintained units with no cap. Resumed tests use the batch process-tree egress guard, scratch state and synthetic mocks. Historical tests preceded those controls; no blanket claim about their semantic effects is made.

The guarded follow-up suite passes 114 Node tests and four Pillow tests before final exact-head CI. Final optimizer status is **BLIND-AUDIT-DISSENT**; see its bounded-gate and repair record. The final guarded Chrome fixture passes direct fetch, preferences, PDF download, accessible language label, Print handoff/consumption and wrapping. Native YouTube panel navigation under the guard is unverified. These resumed checks used scratch profiles and fixtures. They invoked no installer, service activation, or semantic-indexing command.

Final delivery requires reviewed task-owned staging, commit/push, passing checks on the final PR commit, merge, exact remote-default content verification, safe original checkout sync and cleanup of only the clean owned worktree/branch. The merged PR and local canonical receipt carry that evidence; a draft or queued merge is not completion.

Snapshot/rollback is in the [optimizer report](code-deep-optimizer-2026-11-12.md#10-snapshot-and-rollback). Full coverage and exclusions are in the [coverage ledger](maintenance-coverage-2026-11-12.md).

## Existing GitHub Pages compatibility follow-up

After the maintenance merge, CI passed, but the existing Pages/Jekyll 3.10
build parsed JSDoc braces in the optimizer diff excerpt as Liquid syntax. The
optimizer report now uses a Liquid raw block inside HTML comments. This keeps
the source excerpt intact, hides the control tags on GitHub, and lets the
existing Pages renderer handle the report. The behavior follows the
[Liquid raw tag](https://shopify.github.io/liquid/tags/template/#raw) contract. No site configuration, runtime
dependency or deployment workflow was added. Local Ruby has no Liquid gem; the
actual GitHub Pages build is the compatibility gate.

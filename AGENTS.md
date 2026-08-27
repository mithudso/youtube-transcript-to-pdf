# AGENTS.md

Agents and automated helpers relevant to this repository.

## Repo-local agents

None. This project is small enough that the maintainer works it directly; there
are no repo-scoped agent definitions under `.claude/agents/`.

If one is added, document it here with: name, scope, when to use it, and the
tools it is allowed.

## External agents that apply

| Agent / skill | Scope | When to use | Tools |
| --- | --- | --- | --- |
| `code-deep-optimizer` (`/cdo`) | Any source file or the whole repo | Multi-pass audit that applies Medium-or-higher fixes and verifies them against `npm run check`. Used to produce commit `cc02654`. | Read, Edit, Bash |
| `repo-bootstrapper` | Repo meta-documentation | Audit the repo against the mdb-tam file standard and fill gaps. Produced this doc suite. | Read, Edit, Write, Bash |
| `chrome-extension-expert` | `manifest.json`, `src/background/`, `src/content/`, `src/popup/` | Manifest V3 semantics, service-worker lifecycle, content-script injection, permission review. | Read |
| `/code-review` | A single diff | One-shot review of a branch or PR. Complements `/cdo`, which loops to convergence. | Read, Bash |

## Conventions any agent must follow

The rules in [CLAUDE.md](CLAUDE.md) are binding for automated edits too. The
ones agents most often get wrong here:

- Do not import `chrome.*` into `src/lib/`.
- Do not add a dependency. The zero-dependency property is deliberate and is
  what lets CI run without an install step.
- Do not widen `manifest.json` permissions without saying why.
- Run `npm run check` and report the real output, including failures.

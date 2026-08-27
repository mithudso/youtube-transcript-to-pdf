# Codebase Overview

A file map of the whole repository. Machine-readable counterpart:
[high_signal_file_index.json](high_signal_file_index.json), validated by
`npm run lint:docs`.

## Shape

```
youtube-transcript-to-pdf/
├── manifest.json          MV3 declaration — the entry point Chrome reads
├── icons/                 16/32/48/128px PNGs, real dimensions enforced by CI
├── src/
│   ├── lib/               pure modules, no chrome.* — all tests live against these
│   ├── background/        service worker: network and tabs
│   ├── content/           injected transcript-panel reader
│   ├── popup/             the UI
│   └── viewer/            printable page for the Chrome print-to-PDF path
├── scripts/               validation, doc index checks, packaging
├── test/                  unit tests, Node built-in runner
├── docs/                  this suite
└── store-assets/          Chrome Web Store screenshots and their sources
```

## Root

| File | What it is |
| --- | --- |
| `manifest.json` | Manifest V3: permissions, host permissions, service worker, popup, icons, `minimum_chrome_version`. Chrome's entry point. |
| `package.json` | npm scripts only — no dependencies, runtime or dev. |
| `README.md` | Project overview and quick start. |
| `CLAUDE.md` | Rules for Claude Code in this repo. |
| `AGENTS.md` | Agents that operate on this repo and the conventions binding them. |
| `GEMINI.md` | Short-form rules for Gemini CLI. |
| `CONTRIBUTING.md` | Setup, the PR bar, and what good change looks like here. |
| `CODE_OF_CONDUCT.md` | Behaviour expectations. |
| `LICENSE` | MIT. |
| `PRIVACY.md` | Privacy policy, published via GitHub Pages as the Chrome Web Store policy URL. |
| `CHROMEWEBSTORE.md` | Store listing copy, permission justifications, data disclosure, and submission blockers. |
| `.editorconfig`, `.gitattributes`, `.gitignore`, `.nvmrc` | Formatting, line endings, ignores, pinned Node. |

## `src/lib/` — pure modules

No `chrome.*` anywhere in this directory. That is what makes these testable
under plain Node, and it is the codebase's most important structural rule.

| File | Role |
| --- | --- |
| `src/lib/youtube.js` | URL parsing across every accepted YouTube shape, hostname allowlisting, watch-page scraping, caption-track selection. |
| `src/lib/transcript.js` | Caption parsing for both payload formats, timestamp formatting, paragraph grouping, plain-text rendering. |
| `src/lib/pdf.js` | Hand-written PDF 1.4 writer: WinAnsi transliteration, metric-accurate word wrap, pagination, cross-reference table. |

## `src/background/` — service worker

| File | Role |
| --- | --- |
| `src/background/service-worker.js` | Owns every outbound request and tab interaction. Runs the direct-download strategy, then the transcript-panel strategy. Defines the message contract and the error-code vocabulary. Holds no state in module scope. |

## `src/content/` — injected script

| File | Role |
| --- | --- |
| `src/content/scrape-transcript.js` | Opens YouTube's transcript panel and reads its cues. Handles both markup generations plus a structural fallback for obfuscated class names. Injected on demand, never declared, so it does not run on every YouTube page. **The most fragile file here** — see [runbooks/transcript-panel-broke.md](runbooks/transcript-panel-broke.md). |

## `src/popup/` — the UI

| File | Role |
| --- | --- |
| `src/popup/popup.html` | Markup. Module script, no inline handlers — the extension CSP forbids them. |
| `src/popup/popup.css` | Styles, with a dark palette under `prefers-color-scheme`. |
| `src/popup/popup.js` | Controller: prefill from the active tab, one message to the worker, preview rendering, PDF build and download, print handoff, clipboard, persisted options. |

## `src/viewer/` — printable page

| File | Role |
| --- | --- |
| `src/viewer/viewer.html` | Markup for the printable transcript. |
| `src/viewer/viewer.css` | Document styling plus print rules that strip the toolbar. |
| `src/viewer/viewer.js` | Reads the one-shot payload from session storage, deletes it, renders. This is the path that handles scripts Latin-1 cannot encode. |

## `scripts/` — tooling

| File | Role |
| --- | --- |
| `scripts/validate-manifest.mjs` | Manifest shape, referenced files exist, icon PNG signatures and real pixel dimensions match their declared size, no Manifest V2 keys, no `<all_urls>`. |
| `scripts/check-doc-indexes.mjs` | Every path in the doc indexes resolves, and no source file is missing from the index. `--prune` drops dead entries. |
| `scripts/package-extension.mjs` | Builds `dist/<name>-<version>.zip` from only the files Chrome loads. |
| `scripts/build-store-assets.mjs` | Renders the real popup and viewer markup into screenshot harness pages, and generates a genuine PDF, for Chrome Web Store assets. |
| `scripts/compose-store-screenshots.py` | Composes the captured harness renders into 1280×800 store screenshots and the 440×280 promo tile. |
| `scripts/generate-icons.py` | Draws the icon set — a document mark on the project's red field — at every declared size, dropping text lines below 32px where they would blur. |

## `test/` — unit tests

31 tests on the Node built-in runner. No framework, no config, no install.

| File | Covers |
| --- | --- |
| `test/youtube.test.js` | URL shapes, hostname-allowlist rejection, watch-page parsing, the bare-`captionTracks` fallback, the `parsed` flag, regex-literal escaping, track-selection precedence. |
| `test/transcript.test.js` | Both caption formats, the empty body YouTube returns when blocking, format dispatch, timestamps, paragraph grouping, render options. |
| `test/pdf.test.js` | Transliteration, word wrap including hard-split of over-long words, PDF structural validity with byte-accurate cross-reference offsets, pagination, escaping, filename sanitisation. |

## `icons/`

`icons/icon-16.png`, `icons/icon-32.png`, `icons/icon-48.png`,
`icons/icon-128.png`, all generated by `scripts/generate-icons.py`. The mark is
a page with a turned-down corner and lines of text; it replaced an earlier play
triangle that read as YouTube's logo. Each must be exactly the size it is
declared under —
Chrome silently refuses to load an extension whose icon dimensions do not
match, which is why `lint:manifest` reads the PNG header rather than trusting
the filename.

## `docs/`

| File | Covers |
| --- | --- |
| `docs/ARCHITECTURE.md` | System context, the proof-of-origin constraint, the two strategies, four ADRs. |
| `docs/COMPONENTS.md` | Every module with its exports and dependencies. |
| `docs/DEVELOPMENT.md` | Setup, commands, the reload matrix, debugging, troubleshooting. |
| `docs/SECURITY.md` | Permission justifications, threat model, STRIDE. |
| `docs/TESTING.md` | Strategy, suites, coverage target, the manual test plan. |
| `docs/INSTALLATION.md` | Prerequisites, unpacked install, verification, upgrade, uninstall. |
| `docs/requirements.md` | Functional and non-functional requirements, and what is out of scope. |
| `docs/logging.md` | Levels, what is logged, and what must never be. |
| `docs/caching-and-optimization.md` | What is cached, what deliberately is not, where the time goes. |
| `docs/external-calls.md` | All three external calls with timeout, retry, error handling, and test status. |
| `docs/integrations-and-assumptions.md` | Every load-bearing assumption about YouTube and Chrome. |
| `docs/known-issues.md` | Active limitations, videos that will never work, and what is not a bug. |
| `docs/onboarding.md` | A first-hour path through the codebase. |
| `docs/codebase-overview.md` | This file. |
| `docs/high_signal_file_index.json` | Machine-readable retrieval index. |
| `docs/runbooks/transcript-panel-broke.md` | Diagnosing and fixing a YouTube markup change. |
| `docs/runbooks/chrome-web-store-submission.md` | Field-by-field walkthrough of a store submission, and what to do if it is rejected. |
| `docs/runbooks/release.md` | Cutting a release. |
| `docs/repo-bootstrap-audit-2026-08-27.md` | Standard-compliance audit and the deliberate exclusions. |

## `.github/`

`copilot-instructions.md` (Copilot CLI rules), `workflows/ci.yml` (checks on
Node 20/22/24, then packaging), `dependabot.yml` (Actions only — there are no
npm deps), `CODEOWNERS`, `SECURITY.md`, `PULL_REQUEST_TEMPLATE.md`, and issue
templates.

## `store-assets/`

Chrome Web Store graphics and the inputs that produce them. Excluded from the
packaged archive — `scripts/package-extension.mjs` ships only `manifest.json`,
`icons/`, `src/`, and `LICENSE`.

| File | What it is |
| --- | --- |
| `store-assets/sample-transcript.json` | Authored sample content used to render the screenshots, so the store assets carry no third-party text. |
| `store-assets/sample-transcript.pdf` | A genuine PDF produced by the shipping writer from that sample. |
| `store-assets/screenshot-1-popup.png` | 1280×800 — the popup mid-export. |
| `store-assets/screenshot-2-pdf.png` | 1280×800 — the exported document. |
| `store-assets/screenshot-3-viewer.png` | 1280×800 — the Print path. |
| `store-assets/promo-tile-small.png` | 440×280 small promo tile. |
| `store-assets/raw-popup-live.png` | A hand-taken capture of the running popup, cropped to the popup alone. Preferred over the harness render for screenshot 1. |
| `store-assets/raw-popup.jpg`, `raw-viewer.jpg`, `raw-pdf.png` | The captures the composer crops from, kept so the screenshots can be rebuilt without a browser pass. |

Regenerate the sources with `npm run store:assets`, then recompose with
`python3 scripts/compose-store-screenshots.py`. Recapturing the raw renders
needs a browser — see [CHROMEWEBSTORE.md](../CHROMEWEBSTORE.md).

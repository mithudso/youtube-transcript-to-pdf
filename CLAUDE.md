# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A Manifest V3 Chrome extension that turns a YouTube URL into a PDF transcript.
No server, no dependencies, no build step for the extension itself — the files
in the repo are the files Chrome loads.

## Commands

```bash
npm run check          # manifest validation + unit tests + doc index validation
npm test               # 31 unit tests, Node built-in runner
npm run lint:manifest  # manifest schema, file references, icon dimensions
npm run lint:docs      # every path in the doc indexes still exists
npm run build          # dist/youtube-transcript-to-pdf-<version>.zip
```

There is no install step. Zero dependencies, on purpose.

## Layout

| Path | Role |
| --- | --- |
| `manifest.json` | MV3 manifest — permissions, service worker, popup, icons |
| `src/lib/` | Pure modules. **No `chrome.*` here.** Unit-tested under plain Node |
| `src/background/service-worker.js` | All network and tab work |
| `src/content/scrape-transcript.js` | Injected on demand; reads the transcript panel |
| `src/popup/` | Popup UI; builds the PDF and starts the download |
| `src/viewer/` | Printable page for the Chrome "Save as PDF" path |
| `scripts/` | Manifest validation, doc index validation, packaging |
| `test/` | Unit tests for `src/lib/` |

## Rules that matter here

1. **`src/lib/` must not import `chrome.*`.** That boundary is the only reason
   those modules are testable. Extension APIs go in the service worker, popup,
   or a content script.
2. **Manifest V3 only.** `chrome.action`, not `chrome.browserAction`.
   `chrome.scripting`, not `chrome.tabs.executeScript`. No inline scripts or
   inline event handlers in HTML — the extension CSP blocks them.
3. **The service worker holds no state in module scope.** MV3 terminates it
   after roughly 30 seconds idle. Anything that must survive goes in
   `chrome.storage`.
4. **Transcript text is untrusted input from a web page.** Render it with
   `textContent`, never `innerHTML`.
5. **Every icon path in the manifest must resolve to a real PNG of exactly the
   declared size.** `npm run lint:manifest` enforces this; a mismatch makes
   Chrome refuse to load the extension.
6. **Adding a permission requires a written justification** in the PR and a row
   in `docs/SECURITY.md`.
7. **Async/await everywhere.** No `.then()` chains. A `chrome.runtime.onMessage`
   listener doing async work must `return true`.

## Verify before claiming done

Run `npm run check` and paste the result. For anything touching the `chrome.*`
layer — which no test covers — load the extension unpacked and exercise the
path against a real video before saying it works.

## The known-fragile part

`src/content/scrape-transcript.js` reads YouTube's transcript panel. That
markup is not a public API and has already changed once. If transcripts stop
resolving, start there:
[docs/runbooks/transcript-panel-broke.md](docs/runbooks/transcript-panel-broke.md).

## Further reading

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — why the two-strategy design exists
- [docs/COMPONENTS.md](docs/COMPONENTS.md) — every module and its public surface
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — setup, debugging, troubleshooting
- [docs/TESTING.md](docs/TESTING.md) — what is covered and what is not
- [docs/known-issues.md](docs/known-issues.md) — current limitations

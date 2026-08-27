## Default Execution Strategy

Read before writing. This repo is small enough to hold in your head — read
`docs/ARCHITECTURE.md` and the file you are changing before proposing an edit.

Verify with `npm run check` and paste real output. Never claim a change works
because it looks right; the `chrome.*` layer has no automated coverage, so
changes there need a manual pass in a loaded extension.

Prefer the smallest change that fixes the problem. This project has zero
dependencies by design — do not add one without a written justification.

## Project

Manifest V3 Chrome extension. Takes a YouTube URL, resolves the video's
transcript, exports a PDF. Entirely client-side: no server, no API key, no
telemetry.

## Commands

```bash
npm run check          # manifest validation + unit tests + doc index validation
npm test               # 31 unit tests, Node built-in runner
npm run lint:manifest  # manifest schema, file references, icon dimensions
npm run lint:docs      # every path in the doc indexes still exists
npm run build          # dist/<name>-<version>.zip
```

No install step — zero dependencies.

## Hard rules

1. `src/lib/` must not reference `chrome.*`. That is what makes it testable.
2. Manifest V3 APIs only. No inline scripts or inline event handlers in HTML.
3. The service worker keeps no state in module scope — MV3 terminates it when
   idle. Use `chrome.storage`.
4. Transcript text comes from a web page. Render with `textContent`.
5. Manifest icon paths must resolve to real PNGs at exactly the declared size.
6. New permissions need a justification in the PR and a row in
   `docs/SECURITY.md`.
7. `async`/`await` only. `chrome.runtime.onMessage` listeners doing async work
   must `return true`.

## Where things live

`src/lib/` pure modules · `src/background/` network and tabs ·
`src/content/` injected panel reader · `src/popup/` UI ·
`src/viewer/` printable page · `scripts/` tooling · `test/` unit tests.

## Fragile

`src/content/scrape-transcript.js` depends on YouTube's private transcript-panel
markup. See `docs/runbooks/transcript-panel-broke.md`.

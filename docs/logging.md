# Logging

The extension uses local browser consoles and user-visible status messages.
It has no file sink, remote error reporter or telemetry endpoint.

| Context | Where to inspect | Signals |
| --- | --- | --- |
| Worker | Extension service-worker DevTools | `Transcript operation:` records identify watch-page, caption-download and panel-read attempts/outcomes; warnings identify stable failure/cleanup codes |
| Content script | YouTube tab DevTools | Panel timeout/open failure and counts of skipped invalid timestamps and ambiguous captions |
| Popup | Popup DevTools and status line | Fetch, Print, clipboard and preference errors appear in the UI with safe operation/code diagnostics; download interruption/state-query and cleanup warnings use stable codes |
| Viewer | Viewer tab DevTools and document | Storage/handoff errors produce a safe warning and an actionable message |
| Tooling | Terminal stdout/stderr | Completion after writes; nonzero exit and diagnostics on failure; optional font fallback warns with its requested size |

`console.info` records operation transitions, `console.warn` records recovered
failures, and `console.error` records terminal worker failures. Pure `src/lib/`
functions retain their return-value/error contracts instead of logging caption data.
An empty/invalid caption result is observed and logged by the worker at the call boundary.

Never log transcript text, signed caption URLs, session payloads, cookies, tokens,
or raw transport exceptions that can contain those values. Use stable codes and
counts. UI error text stays in the user's local extension page.

`test/service-worker.test.js` checks that signed parameters stay out of logs and
cleanup failures remain observable. Content-script, popup and viewer regressions
assert terminal outcomes and safe diagnostic fields. A console warning alone does
not establish live network or browser compatibility.

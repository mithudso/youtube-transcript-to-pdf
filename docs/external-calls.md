# External calls

## Network and panel operations

| Operation and source | Target/credentials | Timeout and retry | Outcome/log/test |
| --- | --- | --- | --- |
| `loadWatchPage`, `src/background/service-worker.js:94` | Canonical HTTPS YouTube watch page; cookies omitted | 15 seconds through body consumption; no retry | Stable operation logs; HTTP/network/timeout errors; worker and parser tests |
| `loadTrackDirectly`, `src/background/service-worker.js:121` | Page-supplied caption URL validated as HTTPS `www.youtube.com` or `m.youtube.com`, without credentials/port; redirects rejected | 15 seconds per body; JSON3 and original-format attempts | HTTP, empty and exception outcomes; sanitized codes; worker/parser tests |
| `readFromTranscriptPanel`, `src/background/service-worker.js:200` | Native tab query/create/get/remove and script injection; normal tab session | 20-second load wait; bounded content polling; no automatic network retry | Operation outcome and cleanup warning; worker/content tests and disposable native Chrome fixture |

An unreadable anonymous page can still use a panel tab. Missing or incomplete caption metadata also tries the panel before reporting
that no captions were exposed. Auto panel output has unknown language/generation
metadata. An explicit language must succeed through the direct track or return
`language-unavailable`; the worker never labels an unverified panel with a chosen track.

Temporary tabs carry a fragment marker and are excluded from concurrent tab reuse.
Each request closes only the tab it created. User-owned tabs remain open. Video identity is checked before and after
extraction; a navigation mismatch discards the cues. The marker
is a fragment and is not sent in the HTTP request. Direct extension fetches omit
cookies; the YouTube page itself can use the browser's ordinary session and make
YouTube's own requests.

## Other browser API boundaries

| Context | Calls | Persistence/recovery |
| --- | --- | --- |
| Popup | `runtime.sendMessage`, `tabs.query`, `downloads.download/search/onChanged`, clipboard write | Stale replies ignored; primary I/O failures log safe operation/code fields; download completion/interruption drives status and URL cleanup; failures shown locally |
| Popup | `storage.local.get/set` | Two formatting booleans; write errors shown to the user |
| Popup/viewer | `storage.session.set/get/remove`, `tabs.create` | Unique per-Print key; viewer renders then deletes its own payload; failed handoff creation cleans up; failures surfaced |
| Viewer | `window.print` | User controls Chrome's print dialog and destination; no remote request |

No browser call retries authentication, escalates permissions or sends diagnostics
to a server. Storage is local/session, never sync. A failed cleanup can retain a
handoff until browser shutdown; close the browser to clear it.

## Local developer tools

`package-extension.mjs` validates required inputs, invokes the manifest validator
through Node, then invokes `zip` with explicit arguments into a unique temporary
archive. Only successful output replaces the previous archive; failures clean up
the temporary directory and preserve the previous artifact. `check-syntax.mjs` invokes
`node --check` per maintained JS file. Other scripts use local filesystem I/O;
Python artwork scripts read local captures and write images. Tests use disposable
files. None of these commands contacts a live application or datastore.

## Applicability of the service operations standard

The prior bootstrap audit deliberately excludes a server operations registry,
CLI/MCP trigger for browser actions, central JSONL sink, operator dashboard and
datastore-landed checks. This browser extension has no such service or datastore.
Applicable controls are bounded calls, safe local diagnostics, failure feedback,
read-after-write checks in tests/browser fixtures and a complete inventory above.
These adaptations do not claim compliance with the unadapted five-standard service contract.

Developer-tool filesystem operations are synchronous and local. The validation,
syntax, index and generation CLIs report failures through nonzero exit and stderr;
they do not retry. Screenshot and icon scripts read local captures/fonts and write
owned image outputs. Font fallback emits a RuntimeWarning and preserves size.
The complete tool/test inventory is in the file index and coverage ledger.

# External Calls

Every call this extension makes that leaves the process. There are three, all to
`youtube.com`.

## Inventory

### 1. Watch-page fetch

| Field | Value |
| --- | --- |
| Site | `src/background/service-worker.js` — `loadWatchPage()` |
| Target | `https://www.youtube.com/watch?v=<id>&hl=en` |
| Transport | `fetch`, GET |
| Credentials | `omit` — no cookies sent |
| Timeout | 15s via `AbortController` |
| Retry | None. A failure is reported to the user immediately. |
| Error handling | Non-2xx throws `TranscriptError('watch-page')`; abort throws `'timeout'`; network failure throws `'network'`. An unparseable body yields `parsed: false` and `TranscriptError('unreadable')`. |
| Logged | Yes — `console.error` in the message handler |
| Tested | Response *parsing* is covered by 8 tests in `test/youtube.test.js`. The fetch itself is not — see [TESTING.md](TESTING.md). |
| Documented | [ARCHITECTURE.md](ARCHITECTURE.md), [COMPONENTS.md](COMPONENTS.md) |

### 2. Caption track download (strategy 1)

| Field | Value |
| --- | --- |
| Site | `src/background/service-worker.js` — `loadTrackDirectly()` |
| Target | The signed `timedtext` URL from the watch page, tried as `&fmt=json3` then bare |
| Transport | `fetch`, GET |
| Credentials | `omit` |
| Timeout | 15s |
| Retry | Two format attempts, no backoff. Both failing falls through to strategy 2. |
| Error handling | Throws are caught and logged; a non-2xx or empty body is treated as "blocked" and falls through. |
| Logged | Yes — `console.warn` per failed attempt |
| Tested | Payload parsing covered by 8 tests in `test/transcript.test.js`, including the empty body YouTube returns when blocking. |
| Documented | [ARCHITECTURE.md](ARCHITECTURE.md) |

**Note:** this call usually returns HTTP 200 with an empty body. That is
YouTube's proof-of-origin gate, not a bug. It is the reason strategy 2 exists.

### 3. Transcript-panel read (strategy 2)

| Field | Value |
| --- | --- |
| Site | `src/background/service-worker.js` — `readFromTranscriptPanel()` |
| Target | A YouTube tab — reused if open, otherwise created in the background and removed afterwards |
| Transport | `chrome.tabs.create` / `chrome.scripting.executeScript` — not a network call, but it causes YouTube to load a page |
| Credentials | The tab's own session, since it is a normal browser tab |
| Timeout | 20s for tab load; the injected reader polls with its own bounded waits |
| Retry | None |
| Error handling | Injection failure is caught, logged, and returns an empty array, which becomes `TranscriptError('blocked')`. A tab this function created is removed in `finally`, never one the user opened. |
| Logged | Yes — `console.warn` in both the worker and the injected script |
| Tested | Not automated. Selectors were verified against live YouTube; covered by step 4 of the [manual test plan](TESTING.md#manual-test-plan). |
| Documented | [ARCHITECTURE.md](ARCHITECTURE.md), [runbooks/transcript-panel-broke.md](runbooks/transcript-panel-broke.md) |

## Calls that do not exist

Worth stating explicitly, because it is the security posture:

- No analytics or telemetry endpoint.
- No error-reporting service.
- No update or version-check endpoint.
- No third-party API of any kind.
- No `chrome.identity`, no OAuth, no account.

`grep -rn "fetch(\|XMLHttpRequest\|WebSocket\|sendBeacon" src/` returns only the
two `fetch` sites above.

## On the mdb-tam five-standard contract

The mdb-tam repo standard asks that every external call have a CLI trigger, a
centralised error log, an auto-remediation map, a dashboard card, and datastore
verification. Those standards assume a long-running service with an operations
registry and a dashboard.

This is a browser extension with three calls, no server, no datastore, and no
operator dashboard. The applicable parts — error handling, logging, and
documentation per call — are satisfied above. The rest is recorded as
deliberately not applicable in
[repo-bootstrap-audit-2026-08-27.md](repo-bootstrap-audit-2026-08-27.md).

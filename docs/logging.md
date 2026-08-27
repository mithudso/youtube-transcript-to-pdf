# Logging

## Approach

The extension logs to the browser console. There is no log file, no remote
sink, and no telemetry — a log statement here exists so a developer or a user
filing an issue can see what happened, and nothing else.

Because there is no aggregation layer, logs are written to be readable by a
human reading a console, not parsed by a machine.

## Where logs appear

Three separate consoles, and a message is only ever in one of them.

| Context | Where to open it |
| --- | --- |
| Service worker | `chrome://extensions` → the extension's **service worker** link |
| Popup | Right-click the popup → **Inspect** |
| Content script | The YouTube tab's own DevTools console |
| Viewer | The viewer tab's DevTools console |

## Levels

| Level | Used for | Examples |
| --- | --- | --- |
| `console.error` | An operation failed and the user is being told | `Transcript fetch failed:` in the service worker's message handler |
| `console.warn` | A path failed but the code recovered or fell through | Direct caption download failed; transcript panel read failed; popup closed before delivery |
| `console.log` | Not used in extension code | Only in `scripts/*.mjs`, where the console **is** the output |

`console.info` and `console.debug` are unused. Adding a debug level would mean
adding a way to switch it on, which is more machinery than this earns.

## What is logged today

| Path | Level | Message |
| --- | --- | --- |
| `service-worker.js` message handler | `error` | Any failure reaching the user, with the error object |
| `service-worker.js` reply after popup close | `warn` | Port gone; the fetch completed with nobody listening |
| `service-worker.js` `loadTrackDirectly` | `warn` | A direct caption attempt threw — expected often, hence `warn` |
| `service-worker.js` `readFromTranscriptPanel` | `warn` | Injection or the panel read failed |
| `scrape-transcript.js` `openPanel` | `warn` | Could not open the transcript panel |
| `popup.js` | none | Failures surface in the UI status line instead |

## Rules

**Every catch block either logs or surfaces the error to the user.** A silently
swallowed error is a bug. In the popup, "surfaces to the user" means the status
line, which is why the popup has no `console.error` calls — the user sees the
message directly.

**Log the outcome of every external call.** Both caption strategies log their
failures. A successful fetch is not logged, because the transcript appearing in
the UI is the success signal.

**Never log secrets or personal data.** There are no credentials in this
project, so the practical rule is narrower but still real:

- Do not log full signed caption `baseUrl` values. They carry session-scoped
  signature parameters.
- Do not log transcript text. It is the user's content and can be long. Log
  counts instead.
- Video ids, titles, and language codes are fine — they are public metadata the
  user just asked about.

**Log the error object, not a stringified summary.** `console.error('...', error)`
keeps the stack. `console.error('...' + error.message)` throws it away.

## Testing logs

There is no assertion on log output today, because the logging lives entirely in
the `chrome.*` layer, which has no automated coverage. If logging moves into
`src/lib/`, the logger should be injected so a test can assert on it — see
[TESTING.md](TESTING.md).

## If you add a log

Ask whether a developer reading it six months from now, with no memory of the
code, would learn something from it. If not, it is noise.

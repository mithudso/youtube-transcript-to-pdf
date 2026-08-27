# Integrations and Assumptions

## External services

**YouTube (`youtube.com`)** — the only one. Used for the watch page, caption
tracks, and the rendered transcript panel. No API key, no account, no quota.
The extension is an unauthenticated consumer of pages a browser would fetch
anyway.

There is no contract here. Every integration point below is an observed
behaviour of a product that can change without notice.

## Load-bearing assumptions about YouTube

| Assumption | Where it lives | If it breaks |
| --- | --- | --- |
| Video ids are 11 URL-safe base64 characters | `VIDEO_ID_RE` in `src/lib/youtube.js` | URLs stop parsing; clear error, no wrong output |
| The watch page embeds `ytInitialPlayerResponse` as a JSON object literal | `parseWatchPage` | Falls back to a bare `"captionTracks":[...]` scan, then reports `parsed: false` |
| Caption tracks carry `baseUrl`, `languageCode`, `name`, and `kind: 'asr'` for auto-generated | `parseWatchPage` | Track list empties or mislabels auto-generated tracks |
| `timedtext` accepts `&fmt=json3` and returns `events[].segs[].utf8` | `parseJson3` | Falls through to the XML parser, then to strategy 2 |
| `timedtext` still serves the legacy `<text start dur>` XML | `parseTimedTextXml` | Falls through to strategy 2 |
| A "Show transcript" control exists, by text or aria-label | `openPanel` in the content script | Strategy 2 fails; reported as "blocked" |
| Transcript cues render as `transcript-segment-view-model` or `ytd-transcript-segment-renderer` | `SEGMENT_SELECTOR` | Strategy 2 returns nothing; see the runbook |
| Caption text sits in a `span` whose class contains `AttributedString` | `readRow` fallback | Falls back to longest-leaf-text heuristic |
| The transcript panel renders every cue rather than virtualising | Verified live: 137 cues, stable across a 2s re-measure | Long videos would silently truncate — the one failure that could produce *wrong* output rather than none |
| `hl=en` yields English track names and consent text | `loadWatchPage` | Language labels appear localised |

The virtualisation assumption is the one worth re-verifying after any YouTube
redesign, because it is the only one whose failure is silent.

## Assumptions about Chrome

| Assumption | Detail |
| --- | --- |
| Manifest V3, Chrome 116+ | Declared as `minimum_chrome_version` |
| Service workers terminate when idle | ~30s. Nothing is stored in module scope. |
| `URL.createObjectURL` is unavailable in a service worker | Why the PDF is built in the popup |
| A blob URL dies with its creating document | Why the download uses `saveAs: false` |
| `chrome.storage.session` is readable from extension pages | Default `TRUSTED_CONTEXTS` access level |
| `User-Agent` is a forbidden fetch header | It is not set; Chrome would drop it |
| The extension CSP blocks `eval` and inline scripts | Relied on as a defence, not worked around |
| Standard PDF viewers ship Helvetica and Helvetica-Bold | Why no font is embedded |

## Environment differences

There are none. The extension reads no configuration, has no build-time flags,
no `.env`, and no dev-versus-prod branching. What runs unpacked is what ships.

The only environmental variation is the browser: Chromium forks (Edge, Brave,
Arc) work if they are recent enough, but only Chrome is tested.

## Hardcoded values

| Value | Location | Rationale |
| --- | --- | --- |
| 15000ms request timeout | `REQUEST_TIMEOUT_MS` | Long enough for a 1 MB page on a slow link |
| 20000ms tab-load timeout | `TAB_LOAD_TIMEOUT_MS` | YouTube page loads are slow |
| 150ms poll interval | `waitFor` in the content script | Responsive without spinning |
| 420-character paragraph cap | `groupIntoParagraphs` | Roughly a readable print paragraph |
| 2.5s speech-gap break | `groupIntoParagraphs` | Long enough to mean a pause, not a breath |
| 54pt page margin, 11pt body | `buildTranscriptPdf` | Standard document proportions |
| 120-character filename cap | `toSafeFilename` | Under every filesystem limit |

None of these are user-configurable. Each is a judgement call that could
reasonably be exposed as a setting if anyone asks.

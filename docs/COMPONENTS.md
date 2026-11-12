# Components

Every module, what it owns, and what it exposes.

## `src/lib/youtube.js` — URL and watch-page parsing

Pure. No `chrome.*`, no network.

| Export | Signature | Notes |
| --- | --- | --- |
| `parseVideoId` | `(input: string) => string \| null` | Accepts `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`, `/v/`, and a bare 11-character id. Host is checked against an allowlist, so `youtube.com.evil.test` is rejected. |
| `watchUrl` | `(videoId: string) => string` | Canonical desktop watch URL. |
| `extractJsonVar` | `(html: string, varName: string) => object \| null` | Pulls a JSON object assigned to a named variable. `varName` is regex-escaped. |
| `parseWatchPage` | `(html: string) => {tracks, title, author, isPlayable, reason, parsed}` | `parsed` is false when neither the player blob nor a caption-track array was found — a consent wall rather than a captionless video. |
| `pickTrack` | `(tracks, preferredLanguage?) => CaptionTrack \| null` | Exact language, then base language (`en` matches `en-GB`), then a human-authored track, then anything. |

Brace matching is done by `findBalancedEnd`, a string-aware scanner, because
YouTube's inline JSON is not delimited in any way a regex can bound reliably.

**Depends on:** nothing.

## `src/lib/transcript.js` — caption parsing and formatting

Pure. Handles both caption payload formats.

| Export | Signature | Notes |
| --- | --- | --- |
| `parseJson3` | `(body: string) => Segment[]` | `fmt=json3`. Drops the empty roll-up events auto-generated tracks emit. |
| `parseTimedTextXml` | `(body: string) => Segment[]` | Legacy XML. Forward-only cue scan because service workers have no DOMParser. Decodes named and numeric references while preserving the feed’s double-escaping contract. |
| `parseCaptions` | `(body: string) => Segment[]` | Dispatches on the first non-space character. |
| `formatTimestamp` | `(seconds: number) => string` | `M:SS`, or `H:MM:SS` past an hour. |
| `groupIntoParagraphs` | `(segments, options?) => Array<{start, text}>` | Merges cues until a character cap, a sentence end near that cap, or a speech gap over 2.5s. |
| `renderText` | `(segments, options?) => string` | Plain text for the preview and clipboard. |

`Segment` is `{start: number, duration: number, text: string}`.

**Depends on:** nothing.

## `src/lib/pdf.js` — PDF writer

Pure. Emits PDF 1.4 bytes with no library.

| Export | Signature | Notes |
| --- | --- | --- |
| `toWinAnsi` | `(text: string) => string` | Maps to Latin-1: transliterates typographic characters, drops zero-width ones, replaces the rest with `?`. |
| `wrapText` | `(text, maxWidth, fontSize, bold?) => string[]` | Greedy wrap on real Helvetica AFM advance widths. Words wider than the line box are split mid-word. |
| `buildTranscriptPdf` | `(options) => Uint8Array` | Title block, optional grey subtitles, then timestamped paragraphs, paginated. |
| `toSafeFilename` | `(title: string) => string` | Strips what `chrome.downloads` rejects: path separators, reserved characters, control characters, relative segments, leading and trailing dots. |

Internals worth knowing: regular and bold Helvetica tables each cover the 95
WinAnsi ASCII code points 32–126. Other Latin-1 glyphs use a conservative width
bound. Timestamps wrap through the same width checks as other text.
`assemblePdf` lays out objects as catalog, page tree, two fonts, info, then a
page and content-stream pair per page, and computes cross-reference offsets from
running byte position.

**Depends on:** nothing.

## `src/background/service-worker.js` — network and tabs

Owns every outbound request and every tab interaction. ES module
(`"type": "module"` in the manifest). Holds no state in module scope, because
MV3 terminates it when idle.

**Message contract**

Request `{type: 'FETCH_TRANSCRIPT', url: string, language?: string}`, reply
`{ok: true, data: Transcript}` or `{ok: false, error: {code, message}}`.

`Transcript` is `{videoId, title, author, language, isGenerated, source,
availableLanguages, segments}` where `source` is `'timedtext'` or `'panel'`.

**Error codes:** `bad-url`, `watch-page`, `unavailable`, `unreadable`,
`no-captions`, `blocked`, `timeout`, `network`, `caption-url`, `language-unavailable`, `panel-navigation`, `unknown`.

**Key functions:** `fetchWithTimeout` (15s abort, `credentials: 'omit'`),
`loadWatchPage`, `loadTrackDirectly` (strategy 1), `readFromTranscriptPanel`
(strategy 2 — reuses an open tab or opens and closes a background one),
`waitForTabLoad`, `getTranscript` (orchestrates). Tab identity is checked before
and after panel extraction; navigation discards the result.

**Depends on:** `src/lib/youtube.js`, `src/lib/transcript.js`,
`chrome.tabs`, `chrome.scripting`, `chrome.runtime`.

## `src/content/scrape-transcript.js` — transcript panel reader

Injected on demand by `chrome.scripting.executeScript`. Not a declared content
script, so it never runs unless the extension needs it. Resolves to a
`Segment[]`, which becomes `InjectionResult.result`.

Opens the panel by finding a "Show transcript" control, expanding the
description first if the control is hidden behind it, then polls for segments
rather than sleeping a fixed interval.

Reads both markup generations: the older `ytd-transcript-segment-renderer` with
stable `.segment-timestamp` and `.segment-text` classes, and the current
`transcript-segment-view-model` whose classes are obfuscated. For the latter it
matches structurally — the timestamp by its shape, the caption by its
attributed-string span — and ignores the screen-reader duration label sitting
between them.

Only visible rows are read. Ambiguous structural captions are skipped with a
counted warning instead of exporting metadata as caption text.

Recognized caption subtrees are excluded from timestamp candidates. Multiple
unresolved timestamps and ambiguous fragments are skipped with a warning.

Cue durations are derived from the gap to the next cue, since the panel does not
expose them.

**Depends on:** the DOM. **This is the most fragile file in the repo.**

## `src/popup/` — the UI

`popup.html` / `popup.css` / `popup.js`. Module script, no inline handlers.

Prefills from the active tab, sends one message, renders a preview, and offers
three actions: **Download PDF** (builds bytes locally, revokes the blob URL on
the download's completion event), **Print** (stashes blocks in
`chrome.storage.session` and opens the viewer), **Copy**.

Formatting preferences persist in `chrome.storage.local` under `formatOptions`.
All rendering uses `textContent`.

**Depends on:** all three `src/lib/` modules, `chrome.runtime`, `chrome.tabs`,
`chrome.storage`, `chrome.downloads`.

## `src/viewer/` — printable page

`viewer.html` / `viewer.css` / `viewer.js`. Reads its uniquely keyed payload from
`chrome.storage.session`, renders, deletes that key, and offers a print button. Print
styles strip the toolbar and page chrome. Print stays disabled until rendering
succeeds; a later cleanup failure does not disable the rendered transcript. This is the path that handles scripts
the Latin-1 PDF writer cannot encode.

**Depends on:** `chrome.storage.session`.

## `scripts/`

| File | Role |
| --- | --- |
| `validate-manifest.mjs` | Manifest V3 shape, referenced files exist, icon PNG signature and real pixel dimensions match their declared size, no V2 keys, no `<all_urls>`. |
| `generate-doc-index.mjs` | Deterministically refreshes retrieval metadata and llms snapshots; `--check` detects drift. |
| `check-syntax.mjs` | Syntax-checks all maintained JS files with Node. |
| `check-doc-indexes.mjs` | Every path in `docs/high_signal_file_index.json` and `docs/codebase-overview.md` resolves. `--prune` drops dead index entries. |
| `package-extension.mjs` | Builds `dist/<name>-<version>.zip` with only the files Chrome loads. |

## Library usage example

The pure modules can be imported directly from another ES module without Chrome:

```js
import { parseCaptions, renderText } from './src/lib/transcript.js';
import { buildTranscriptPdf } from './src/lib/pdf.js';
const segments = parseCaptions('{"events":[{"tStartMs":0,"segs":[{"utf8":"Hello"}]}]}');
const text = renderText(segments, { timestamps: false });
const pdf = buildTranscriptPdf({ title: 'Example', blocks: [{ text }] });
```

`buildTranscriptPdf` rejects non-finite or impossible font/margin geometry.
`parseTimedTextXml` removes actual child markup before decoding literal text.
The worker consumes response bodies inside its timeout and rejects outbound redirects.
Panel transcripts use `language: 'unknown'` and `isGenerated: null` because the
injected reader cannot establish track metadata.

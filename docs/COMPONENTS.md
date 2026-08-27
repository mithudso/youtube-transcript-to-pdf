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
| `parseTimedTextXml` | `(body: string) => Segment[]` | Legacy XML. Regex-based, not DOMParser, because service workers have no DOMParser. Decodes the double-escaped entities the feed uses. |
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

Internals worth knowing: `HELVETICA_WIDTHS` is 95 entries covering code points
32–126; bold is approximated with a 1.08 factor rather than a second table.
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
`no-captions`, `blocked`, `timeout`, `network`, `unknown`.

**Key functions:** `fetchWithTimeout` (15s abort, `credentials: 'omit'`),
`loadWatchPage`, `loadTrackDirectly` (strategy 1), `readFromTranscriptPanel`
(strategy 2 — reuses an open tab or opens and closes a background one),
`waitForTabLoad`, `getTranscript` (orchestrates).

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

`viewer.html` / `viewer.css` / `viewer.js`. Reads a one-shot payload from
`chrome.storage.session`, deletes it, renders, and offers a print button. Print
styles strip the toolbar and page chrome. This is the path that handles scripts
the Latin-1 PDF writer cannot encode.

**Depends on:** `chrome.storage.session`.

## `scripts/`

| File | Role |
| --- | --- |
| `validate-manifest.mjs` | Manifest V3 shape, referenced files exist, icon PNG signature and real pixel dimensions match their declared size, no V2 keys, no `<all_urls>`. |
| `check-doc-indexes.mjs` | Every path in `docs/high_signal_file_index.json` and `docs/codebase-overview.md` resolves. `--prune` drops dead index entries. |
| `package-extension.mjs` | Builds `dist/<name>-<version>.zip` with only the files Chrome loads. |

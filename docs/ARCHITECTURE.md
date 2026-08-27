# Architecture

## System context

```
┌──────────┐   URL / options    ┌───────────────┐   HTTPS    ┌──────────────┐
│  Popup   │ ─────────────────▶ │ Service       │ ─────────▶ │  youtube.com │
│  (UI)    │ ◀───────────────── │ worker        │ ◀───────── │              │
└────┬─────┘   transcript       └──────┬────────┘            └──────────────┘
     │                                 │
     │ PDF bytes                       │ chrome.scripting.executeScript
     ▼                                 ▼
┌──────────┐                    ┌───────────────┐
│ Downloads│                    │ Content script│  reads YouTube's own
│  (disk)  │                    │ in a YT tab   │  transcript panel
└──────────┘                    └───────────────┘
```

Nothing leaves the machine except requests to `youtube.com`. There is no
backend, no analytics endpoint, and no third-party service.

## The central constraint

Since 2024, YouTube requires a **proof-of-origin token**, minted by its own
bot-detection machinery in a real browser session, on caption downloads. A
plain request to the `timedtext` endpoint — including one carrying the user's
cookies — returns **HTTP 200 with an empty body**. Not an error status; an
empty success. This was verified directly while building the extension, against
both `timedtext` and the `youtubei/v1/player` innertube endpoint.

Every design decision below follows from that.

## Two strategies, tried in order

**Strategy 1 — direct download.** Fetch the watch page, read the caption track
list out of `ytInitialPlayerResponse`, request the track's signed `timedtext`
URL. Instant and silent when it works. Often it does not.

**Strategy 2 — transcript panel.** Load the watch page in a browser tab, inject
a content script, and read YouTube's own rendered transcript panel. The panel
is populated by a page session that already holds a valid token, which sidesteps
the problem entirely. The extension reuses a tab already open on that video; if
there is none, it opens one in the background and closes it afterwards.

Strategy 2 is what carries most requests. It is slower and briefly opens a tab —
the cost of YouTube's token requirement.

## Why the popup is a thin client

All network and tab work lives in the service worker. The popup sends one
message and renders the reply. A Chrome popup is destroyed the moment it loses
focus, so any work owned by the popup would be cancelled mid-flight. Moving it
to the service worker makes the fetch survive a closed popup.

The one thing the popup keeps is **PDF construction and the download call**.
That is deliberate: `URL.createObjectURL` does not exist in an MV3 service
worker, so the blob has to be minted in a document context. Because a blob URL
dies with the document that created it, the download uses `saveAs: false` and
starts writing immediately rather than waiting on a save dialog the user might
leave open long enough for the popup to close.

## Why `src/lib/` has no `chrome.*`

`youtube.js`, `transcript.js`, and `pdf.js` are pure. They take strings and
return data. That makes them runnable — and therefore testable — under plain
Node, which is where all 31 tests live. Everything that needs an extension API
sits in the service worker, popup, content script, or viewer, none of which are
unit-tested.

This boundary is the single most important structural rule in the codebase.

## Data flow, end to end

1. Popup reads the active tab's URL, extracts a video id, prefills the input.
2. User submits. Popup posts `FETCH_TRANSCRIPT` to the service worker.
3. Worker fetches the watch page with `credentials: 'omit'` and parses it for
   title, author, playability, and caption tracks.
4. Worker picks a track by language, then runs strategy 1, then strategy 2.
5. Worker replies with segments plus metadata, including which strategy won.
6. Popup groups segments into paragraphs, renders a preview, and holds the
   transcript in memory for the popup's lifetime.
7. **Download PDF** builds PDF bytes in the popup and hands a blob URL to
   `chrome.downloads`.
   **Print** stashes the blocks in `chrome.storage.session`, opens the viewer,
   and lets Chrome render.

## The PDF writer

`src/lib/pdf.js` emits PDF 1.4 by hand: object table, page tree, content
streams, and a cross-reference table whose byte offsets are verified by test.
Text uses the two standard Type 1 fonts, so nothing is embedded, and word wrap
uses the real Helvetica AFM advance widths.

The cost is encoding. Standard-font text is WinAnsi, meaning Latin-1: typographic
characters are transliterated, and anything outside Latin-1 becomes `?`. The
**Print** path exists to cover that gap — Chrome's renderer handles every script
correctly, at the cost of a print dialog.

Writing a PDF by hand rather than vendoring a library keeps the extension at
zero dependencies, which in turn means no supply-chain surface in something that
holds `youtube.com` host permissions.

## Decisions

**ADR-001 — Hand-written PDF writer instead of jsPDF or pdf-lib.**
*Accepted.* A bundled PDF library is hundreds of kilobytes of third-party code
inside an extension with host permissions. Transcripts are plain text with no
images, tables, or vector art, so almost none of a general library is used. The
trade-off is Latin-1-only output, mitigated by the print path.

**ADR-002 — Transcript panel over reverse-engineering the token.**
*Accepted.* Deriving a proof-of-origin token means running YouTube's BotGuard,
which is obfuscated, changes without notice, and reads as evasion. Reading the
panel that YouTube already rendered for the user is stable in intent even when
the markup shifts, and it fails visibly rather than silently.

**ADR-003 — `credentials: 'omit'` on every request.**
*Accepted.* The extension never needs the user's YouTube session. Omitting
cookies means it cannot act as the user, and it drops the whole class of
concerns about an extension with access to a logged-in session. It costs
nothing, since cookies did not unlock captions anyway.

**ADR-004 — Zero dependencies.**
*Accepted.* Keeps CI install-free, removes supply-chain risk from a
host-permissioned extension, and keeps the review surface small. The cost is
hand-written PDF generation and no lint framework.

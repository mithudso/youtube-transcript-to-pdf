# Onboarding

A path through this codebase for someone seeing it for the first time. Budget
about an hour.

## 1. Use it first (10 minutes)

Follow [INSTALLATION.md](INSTALLATION.md). Export a transcript from a video you
like. Then try both buttons — **Download PDF** and **Print** — and notice they
produce different-looking documents. That difference explains a lot of the code.

Now open a video with Japanese or Russian captions and download it. The `?`
characters you get are the reason the print path exists.

## 2. Understand the constraint (10 minutes)

Read [ARCHITECTURE.md](ARCHITECTURE.md), particularly "The central constraint".

The single fact that shapes this codebase: **YouTube returns HTTP 200 with an
empty body for caption requests that lack a browser-minted token.** Not a 403.
An empty success. Everything else — the two strategies, the background tab, the
content script — follows from that.

## 3. Read the pure modules (20 minutes)

Read in this order. None of them touch `chrome.*`, so they are just functions.

1. **`src/lib/youtube.js`** — start at `parseVideoId`, then `parseWatchPage`.
   Note `findBalancedEnd`: YouTube's inline JSON cannot be bounded by a regex,
   so it is scanned with a string-aware brace matcher.
2. **`src/lib/transcript.js`** — two payload formats, one `Segment` shape.
   `groupIntoParagraphs` is where a wall of caption cues becomes readable prose.
3. **`src/lib/pdf.js`** — a PDF written by hand. Read `buildTranscriptPdf`, then
   `assemblePdf`, and notice how cross-reference byte offsets are computed.

Then read `test/` alongside them. The tests are the specification.

## 4. Read the extension layer (15 minutes)

1. **`src/background/service-worker.js`** — `getTranscript` is the spine.
   Follow it into `loadTrackDirectly` (strategy 1) and
   `readFromTranscriptPanel` (strategy 2).
2. **`src/content/scrape-transcript.js`** — the fragile one. Note that it
   handles two generations of YouTube markup, and that the current generation's
   class names are obfuscated, so it matches structurally.
3. **`src/popup/popup.js`** — thin. It sends one message and renders the reply.
   The interesting part is `handleDownload` and why it uses `saveAs: false`.

## 5. Make a change (15 minutes)

A good first task: add a formatting option — say, a toggle that omits the
speaker-gap paragraph breaks. It touches `src/lib/transcript.js` (with a test),
`src/popup/popup.html`, and `src/popup/popup.js`, and nothing else. That is the
whole loop in miniature.

Then run `npm run check`, reload the extension, and try it.

## Things that will trip you up

- **Reloading.** Popup changes need only a reopen; service-worker changes need
  the reload icon; content-script changes need that *and* a YouTube tab reload.
  See the [reload matrix](DEVELOPMENT.md#the-reload-matrix).
- **Three separate consoles.** The service worker, the popup, and the page each
  have their own. A log you cannot find is probably in one of the other two.
- **The service worker sleeps.** After about 30 seconds idle it is terminated.
  This is why nothing is stored in module scope.
- **`src/lib/` must stay `chrome.*`-free.** It is the only reason any of this is
  testable.

## Where to go next

- [COMPONENTS.md](COMPONENTS.md) — every export, cross-referenced
- [TESTING.md](TESTING.md) — including the manual plan
- [known-issues.md](known-issues.md) — what is broken and what merely looks it
- [CONTRIBUTING.md](../CONTRIBUTING.md) — the bar for a pull request

# Requirements

## Functional

| ID | Requirement | Status |
| --- | --- | --- |
| F1 | Accept a YouTube video URL in any common form — `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`, `/v/` — or a bare 11-character video id. | Done |
| F2 | Prefill the input from the active tab when that tab is a YouTube video. | Done |
| F3 | Resolve the video's transcript, including when YouTube blocks direct caption downloads. | Done |
| F4 | List the caption tracks a video offers and let the user pick one by language. | Done |
| F5 | Distinguish auto-generated tracks from author-provided ones in the UI. | Done |
| F6 | Format the transcript with optional timestamps and optional paragraph grouping. | Done |
| F7 | Export as a PDF file saved to disk. | Done |
| F8 | Offer a print-based export that handles scripts the built-in writer cannot encode. | Done |
| F9 | Copy the formatted transcript to the clipboard. | Done |
| F10 | Remember formatting preferences between sessions. | Done |
| F11 | Report a distinct, actionable error for each failure mode: bad URL, unavailable video, unreadable page, no captions, blocked captions, timeout. | Done |

## Non-functional

| ID | Requirement | How it is met |
| --- | --- | --- |
| N1 | No transcript data leaves the machine. | No backend, no analytics, no error reporting. Only origin contacted is `youtube.com`. |
| N2 | The user's YouTube session is never used. | `credentials: 'omit'` on every request. |
| N3 | Permissions stay minimal and justified. | Five narrow permissions, each with a row in [SECURITY.md](SECURITY.md). No `<all_urls>`. |
| N4 | No third-party runtime code. | Zero dependencies; the PDF writer is hand-written. |
| N5 | Work survives the popup closing. | All network and tab work lives in the service worker. |
| N6 | Requests cannot hang indefinitely. | 15s fetch timeout, 20s tab-load timeout. |
| N7 | Generated PDFs are structurally valid. | Cross-reference offsets verified byte-for-byte in `test/pdf.test.js`. |
| N8 | Page-derived text can never execute. | `textContent` only; no `innerHTML`, `eval`, or `new Function`; extension CSP. |
| N9 | Verifiable without a browser in CI. | Pure modules in `src/lib/` carry no `chrome.*`; 31 tests run on plain Node. |
| N10 | Broken references fail loudly. | `lint:manifest` checks icon dimensions and file paths; `lint:docs` checks index paths. |

## Dependencies

**Runtime:** none.
**Development:** Node 20+ (test runner, tooling), `zip` (packaging, present on
macOS and Linux).
**External services:** `youtube.com` only.

## Out of scope

- Speech-to-text for videos without captions.
- Bypassing YouTube's proof-of-origin requirement by deriving tokens.
- Age-restricted, private, or members-only videos.
- Batch export of playlists or channels.
- Browsers other than Chromium-based ones.

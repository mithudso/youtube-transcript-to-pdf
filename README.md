# YouTube Transcript to PDF

A Manifest V3 Chrome extension that takes a YouTube URL, pulls the video's
transcript, and exports it as a formatted PDF — no server, no API key, no
third-party service. Everything runs locally in the browser.

## Features

- Paste any YouTube URL — `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`,
  `/live/`, or a bare 11-character video ID. The current tab's video is
  detected automatically.
- Picks a caption track by language, including auto-generated tracks.
- Formats output with timestamps and readable paragraphs (both optional),
  grouping caption cues on sentence boundaries and speech pauses.
- **Download PDF** writes a real `.pdf` locally with a built-in, dependency-free
  PDF writer.
- **Print…** renders through Chrome instead, for transcripts in scripts the
  built-in writer cannot encode (see [Limitations](#limitations)).
- **Copy** puts the formatted text on the clipboard.

## Install (unpacked)

```bash
git clone https://github.com/<you>/youtube-transcript-to-pdf.git
cd youtube-transcript-to-pdf
```

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this directory.
4. Pin the extension and click it on any YouTube video.

## How it gets the transcript

Since 2024, YouTube requires a browser-minted proof-of-origin token on caption
downloads. A plain request to the `timedtext` endpoint — even one carrying the
user's cookies — comes back HTTP 200 with an **empty body**. The extension
therefore tries two strategies in order:

1. **Direct download.** Reads the caption track list off the watch page and
   fetches `timedtext`. Silent and instant when YouTube allows it.
2. **Transcript panel.** Loads the watch page in a tab — reusing one already
   open on that video, otherwise opening a background tab it closes again —
   and reads YouTube's own transcript panel, which is rendered by a session
   that holds a valid token.

Strategy 2 is what works most of the time. It is slower and briefly opens a
tab, which is the price of YouTube's token requirement.

## Architecture

| Path | Role |
| --- | --- |
| `manifest.json` | MV3 manifest: permissions, service worker, popup, icons. |
| `src/background/service-worker.js` | Owns all network and tab work; runs the two strategies. |
| `src/content/scrape-transcript.js` | Injected on demand; reads the transcript panel. |
| `src/lib/youtube.js` | URL parsing and watch-page scraping. Pure, unit-tested. |
| `src/lib/transcript.js` | Caption parsing (`json3` + legacy XML) and formatting. Pure. |
| `src/lib/pdf.js` | Dependency-free PDF writer. Pure. |
| `src/popup/` | Popup UI. Builds the PDF and triggers the download. |
| `src/viewer/` | Printable page for the Chrome "Save as PDF" path. |

The popup is a thin client: it sends one message and renders the reply, so
closing it mid-fetch cannot abort the work. The service worker holds no state
in module scope, since MV3 terminates it after roughly 30 seconds idle.

`src/lib/` has no `chrome.*` dependency, which is what makes it testable under
plain Node.

## Permissions

| Permission | Why |
| --- | --- |
| `tabs` | Read the active tab's URL to prefill the input, and find an open tab showing the requested video. |
| `scripting` | Inject the transcript-panel reader when the direct download is blocked. |
| `storage` | Remember formatting preferences; pass the transcript to the printable viewer. |
| `downloads` | Save the generated PDF. |
| `host_permissions` on `youtube.com` | Fetch watch pages and caption tracks. Scoped to YouTube only. |

No analytics, no telemetry, no remote code. Transcript data never leaves the
machine. Requests to YouTube are sent with `credentials: 'omit'`, so the user's
YouTube session is not attached.

## Development

```bash
npm test              # 31 unit tests over the pure modules
npm run lint:manifest # manifest + icon-dimension validation
npm run lint:docs     # documentation index validation
npm run check         # all three
npm run build         # dist/youtube-transcript-to-pdf-<version>.zip
```

Tests run on the Node built-in test runner — no dependencies to install.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the reload matrix, debugging notes,
and the bar for a pull request.

## Limitations

- **Non-Latin scripts in `Download PDF`.** The built-in writer uses the standard
  Helvetica fonts, which are Latin-1 only. Typographic characters are
  transliterated (`—` → `--`, `"` → `"`); anything outside Latin-1 becomes `?`.
  Use **Print…** for CJK, Cyrillic, Arabic, and similar — Chrome's renderer
  handles them correctly.
- **Videos without captions** cannot produce a transcript. There is no
  speech-to-text fallback.
- **Age-restricted, private, and members-only videos** are rejected by YouTube
  before captions are reachable.
- **The transcript panel's markup is not a public API.** YouTube migrated from
  `ytd-transcript-segment-renderer` to `transcript-segment-view-model`; the
  reader handles both and falls back to structural matching, but a future
  redesign may still require an update.

## Documentation

| Doc | Covers |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | The proof-of-origin constraint, the two strategies, design decisions |
| [docs/COMPONENTS.md](docs/COMPONENTS.md) | Every module, its exports and dependencies |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, the reload matrix, debugging, troubleshooting |
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Install, verify, upgrade, uninstall |
| [docs/SECURITY.md](docs/SECURITY.md) | Permission justifications and threat model |
| [docs/TESTING.md](docs/TESTING.md) | Automated coverage and the manual test plan |
| [docs/known-issues.md](docs/known-issues.md) | Current limitations and what is not a bug |
| [docs/onboarding.md](docs/onboarding.md) | A first-hour path through the codebase |
| [docs/runbooks/](docs/runbooks/) | Fixing a YouTube markup change; cutting a release |

## Privacy

No data is collected, stored, or transmitted. The only host the extension can
reach is `youtube.com`, and requests are made without your cookies attached.
Full policy: [PRIVACY.md](PRIVACY.md)
([published copy](https://mithudso.github.io/youtube-transcript-to-pdf/PRIVACY.html)).

## Contributing

Issues and pull requests welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and
the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately per
[.github/SECURITY.md](.github/SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).

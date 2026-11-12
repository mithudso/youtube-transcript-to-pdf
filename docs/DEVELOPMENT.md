# Development

## Prerequisites

- **Node 22 or newer** — for the test runner and tooling only; the extension
  itself does not run on Node.
- **Chrome 116 or newer** — the manifest's `minimum_chrome_version`.

There is no install step. The project has zero dependencies.

## Setup

```bash
git clone https://github.com/mithudso/youtube-transcript-to-pdf.git
cd youtube-transcript-to-pdf
npm run check
```

Load it into Chrome:

1. `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked** → select the repo directory
4. Pin it to the toolbar

## Commands

| Command | What it does |
| --- | --- |
| `npm run check` | Everything below except `build` |
| `npm test` | unit and regression tests on the Node built-in runner |
| `npm run lint:manifest` | Manifest shape, file references, icon dimensions |
| `npm run lint:docs` | Every path in the doc indexes still resolves |
| `npm run build` | `dist/youtube-transcript-to-pdf-<version>.zip` |

Run a single test file with `node --test test/pdf.test.js`, or one case with
`node --test --test-name-pattern="wrapText"`.

## The reload matrix

Chrome reloads different parts at different times, and getting this wrong wastes
more debugging time than any other thing in extension work.

| Changed | To see it |
| --- | --- |
| `src/popup/*`, `src/viewer/*` | Close and reopen the popup |
| `src/background/service-worker.js` | Reload icon on the extension card |
| `src/content/scrape-transcript.js` | Reload the card **and** the YouTube tab |
| `manifest.json` | Reload the card; permission changes may need a full remove and re-add |

## Debugging

- **Service worker** — `chrome://extensions` → the extension's **service worker**
  link. This is where every network log and the two strategies' warnings appear.
  The worker goes idle after roughly 30 seconds; clicking the link wakes it.
- **Popup** — right-click the popup → **Inspect**. Its console is separate from
  the worker's.
- **Content script** — the YouTube tab's own DevTools console. Injected script
  logs land there, not in the worker.
- **Viewer** — a normal tab; normal DevTools.

## Working on the transcript path

The two strategies fail differently and it is worth knowing which one you are
looking at. The popup's meta line says `read from transcript panel` when
strategy 2 won.

To force strategy 2, use a synthetic fixture where the direct fetch returns no captions,
or a video whose direct request is blocked. To confirm strategy 1 still functions at all,
watch the service worker console for a request to `timedtext` that returns a
non-empty body.

To iterate on the panel reader without reloading the extension, paste its logic
straight into a YouTube tab's DevTools console. That is how the current
selectors were derived.

## Troubleshooting

**"This video has no captions"** on a video that visibly has them — the parsed
watch page did not expose a caption track. Check the service worker console and
compare the current page metadata with the parser fixtures.

**"YouTube did not return a usable video page"** — a consent or verification
screen came back instead of the watch page. Open the video in a tab and retry;
the extension will reuse that tab.

**A downloaded PDF shows `?` in place of text** — expected for anything outside
Latin-1. Use **Print** instead. See [known-issues.md](known-issues.md).

**Nothing happens on click, no error** — the service worker probably threw at
startup. Open its console; a syntax error in an imported module shows there and
nowhere else.

**`npm run lint:manifest` fails on icon dimensions** — a PNG's real size no
longer matches the key it is declared under. Regenerate it; The manifest validator requires dimensions to match their declared size.

## Environment variables

None. The extension reads no configuration and has no `.env`.

## Releasing

See [runbooks/release.md](runbooks/release.md).

## Generated documentation and optional artwork tooling

Run `npm run docs:generate` after editing indexed files or snapshot documentation.
`npm run lint:docs` checks exact generated content and path coverage, including
Python tools, tests and CI. `npm run lint:syntax` checks every maintained JS file.

The extension and npm checks have no package dependencies. The optional artwork
scripts import Pillow. A disposable Python 3.11+ environment with Pillow 13.0.0
was verified for this maintenance run; [PyPI](https://pypi.org/project/Pillow/)
is the authoritative package source. Those tools use local images and are excluded
from the extension package. Do not regenerate committed screenshots during code-only work.

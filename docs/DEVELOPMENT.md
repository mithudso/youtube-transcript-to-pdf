# Development

## Prerequisites

- **Node 20 or newer** — for the test runner and tooling only; the extension
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
| `npm test` | 31 unit tests on the Node built-in runner |
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

To force strategy 2, pick a video where the direct fetch is blocked — which,
in practice, is most of them. To confirm strategy 1 still functions at all,
watch the service worker console for a request to `timedtext` that returns a
non-empty body.

To iterate on the panel reader without reloading the extension, paste its logic
straight into a YouTube tab's DevTools console. That is how the current
selectors were derived.

## Troubleshooting

**"This video has no captions"** on a video that visibly has them — YouTube
served a page the parser could not read, or the tab strategy could not open the
panel. Check the service worker console.

**"YouTube did not return a usable video page"** — a consent or verification
screen came back instead of the watch page. Open the video in a tab and retry;
the extension will reuse that tab.

**A downloaded PDF shows `?` in place of text** — expected for anything outside
Latin-1. Use **Print** instead. See [known-issues.md](known-issues.md).

**Nothing happens on click, no error** — the service worker probably threw at
startup. Open its console; a syntax error in an imported module shows there and
nowhere else.

**`npm run lint:manifest` fails on icon dimensions** — a PNG's real size no
longer matches the key it is declared under. Regenerate it; Chrome silently
refuses to load extensions with mismatched icons.

## Environment variables

None. The extension reads no configuration and has no `.env`.

## Releasing

See [runbooks/release.md](runbooks/release.md).

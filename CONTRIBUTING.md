# Contributing

## Getting set up

You need Node 20 or newer and Chrome. There is nothing to install — the project
has no dependencies, and every script runs on the Node standard library.

```bash
git clone https://github.com/mithudso/youtube-transcript-to-pdf.git
cd youtube-transcript-to-pdf
npm run check
```

Then load it: `chrome://extensions` → **Developer mode** → **Load unpacked** →
select the repo directory. After editing the service worker or a content
script, hit the reload icon on the extension card. Popup and viewer changes just
need the popup reopened.

## Before you open a pull request

```bash
npm run check   # manifest validation + 31 unit tests + doc index validation
```

Then load the extension unpacked and exercise the path you changed against a
real video. Automated tests cover the pure modules under `src/lib/`; nothing
covers the `chrome.*` layer, so that part needs a human.

Test against a video with **human-authored** captions and one with
**auto-generated** captions. They take different code paths often enough to
matter.

## What good change looks like here

- **Keep `src/lib/` free of `chrome.*`.** That separation is what makes those
  modules testable under plain Node. Anything touching an extension API belongs
  in the service worker, the popup, or a content script.
- **New behaviour in `src/lib/` comes with tests.** New behaviour in the
  `chrome.*` layer comes with a note in the PR describing how you verified it.
- **A new permission needs a paragraph explaining why.** Permissions are the
  main reason extensions get distrusted, and the current set is deliberately
  small. See [docs/SECURITY.md](docs/SECURITY.md).
- **Never render page-derived text as HTML.** Use `textContent`. The transcript
  is untrusted input that arrives from a web page.
- **Match the surrounding style** — JSDoc on exported functions, comments that
  explain *why* rather than restating the code.

## Commits

Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
`chore:`. Explain the reasoning in the body when it is not obvious from the
diff.

## The fragile part

`src/content/scrape-transcript.js` reads YouTube's transcript panel, which is
not a public API. YouTube has already migrated once, from
`ytd-transcript-segment-renderer` to `transcript-segment-view-model`. If the
extension stops finding transcripts, that file is the first place to look —
see [docs/runbooks/transcript-panel-broke.md](docs/runbooks/transcript-panel-broke.md).

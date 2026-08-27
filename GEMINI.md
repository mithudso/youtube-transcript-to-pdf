# GEMINI.md

Guidance for Gemini CLI in this repository. The full rule set lives in
[CLAUDE.md](CLAUDE.md); this file is the short form.

## Project

Manifest V3 Chrome extension: YouTube URL in, PDF transcript out. Client-side
only — no server, no dependencies, no build step for the extension itself.

## Commands

```bash
npm run check   # manifest validation + unit tests + doc index validation
npm test        # 31 unit tests, Node built-in runner
npm run build   # dist/<name>-<version>.zip
```

## Hard rules

1. No `chrome.*` in `src/lib/` — that boundary keeps those modules testable.
2. Manifest V3 only; no inline scripts or handlers in HTML.
3. No state in service-worker module scope; use `chrome.storage`.
4. Transcript text is untrusted page input — `textContent`, never `innerHTML`.
5. Manifest icon paths must resolve to real PNGs at the declared size.
6. New permissions need written justification and a `docs/SECURITY.md` row.

## Verification

`npm run check` for the pure modules. Anything touching `chrome.*` has no
automated coverage — load the extension unpacked and test it by hand.

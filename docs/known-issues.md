# Known Issues

## Active limitations

### Non-Latin text becomes `?` in the downloaded PDF

**Severity:** medium · **Workaround:** use **Print**

`src/lib/pdf.js` uses the standard Helvetica fonts, which are WinAnsi
(Latin-1). Typographic characters are transliterated — `—` becomes `--`, curly
quotes become straight — but CJK, Cyrillic, Arabic, Greek, and Hebrew become
`?`. The **Print** button exists precisely for this: Chrome's renderer handles
every script correctly.

Fixing it properly means embedding a Unicode TrueType font with a subsetted
CID-keyed font program, which is a large amount of code and roughly a megabyte
of font data, for something the print path already solves.

### The transcript panel is not a public API

**Severity:** high, latent · **Workaround:** see the runbook

`src/content/scrape-transcript.js` reads YouTube's rendered transcript panel.
YouTube has already migrated once, from `ytd-transcript-segment-renderer` to
`transcript-segment-view-model`, and the current markup's class names are
obfuscated. The reader handles both generations and falls back to structural
matching, but a future redesign will eventually break it.

When it does, the extension reports "YouTube would not release the captions"
rather than producing wrong output. See
[runbooks/transcript-panel-broke.md](runbooks/transcript-panel-broke.md).

### Strategy 2 briefly opens a tab

**Severity:** low · **Workaround:** open the video first

When no tab is open on the requested video, the extension opens one in the
background and closes it when done. It is visible in the tab strip for a few
seconds. This is a direct consequence of YouTube's token requirement — there is
no way to render the panel without a page.

If a tab is already open on that video, it is reused and nothing new appears.

### Direct caption download rarely succeeds

**Severity:** low, by design

Strategy 1 usually returns an empty body and the extension falls through to
strategy 2. The code is kept because it is fast when it works and costs one
request when it does not.

### No coverage of the `chrome.*` layer

**Severity:** medium

The service worker, popup, content script, and viewer have no automated tests.
Mocking the extension API would test the mock. The
[manual test plan](TESTING.md#manual-test-plan) covers this instead.

## Videos that will never work

- **No captions.** There is no speech-to-text fallback.
- **Age-restricted.** YouTube requires a signed-in session, which the extension
  deliberately does not use.
- **Private, unlisted-without-link, members-only, or removed.** Reported as
  "YouTube will not serve that video".
- **Live streams still in progress.** No complete transcript exists yet.

## Not bugs

- **A consent screen instead of a video page.** Reported as "YouTube did not
  return a usable video page". Open the video in a tab and retry — the tab will
  be reused.
- **Auto-generated transcripts have no punctuation.** That is what YouTube
  produced. Paragraph grouping falls back to speech gaps and length.
- **Timestamps drift from the audio by a second or two.** Cue boundaries come
  from YouTube.

## Reporting

Open an issue with the video URL, whether its captions are auto-generated, and
anything red in the service worker console.

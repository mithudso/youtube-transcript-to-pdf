# Runbook: the transcript panel reader stopped working

**Symptom:** the extension reports "YouTube would not release the captions" on
videos that clearly have a transcript, and the popup never shows
`read from transcript panel`.

**Cause, almost always:** YouTube changed the transcript panel's markup.
`src/content/scrape-transcript.js` reads a private DOM structure, and YouTube
has already migrated it once.

## 1. Confirm which strategy is failing

Open `chrome://extensions` → the extension's **service worker** link, then
reproduce. You are looking for `Transcript panel read failed` or a fetch that
returned nothing.

If the watch page itself failed to parse, the error is "did not return a usable
video page" instead — that is a different problem, usually a consent screen.

## 2. Reproduce in a real tab

Open the video, open DevTools on that tab, and run:

```js
document.querySelectorAll('transcript-segment-view-model, ytd-transcript-segment-renderer').length
```

- **Non-zero** — the selectors still match; the problem is opening the panel.
  Go to step 3.
- **Zero, panel visibly open** — the cue element was renamed. Go to step 4.

## 3. The panel is not opening

Check the control the reader looks for:

```js
[...document.querySelectorAll('button, tp-yt-paper-button')]
  .filter(el => /show transcript/i.test(`${el.textContent} ${el.getAttribute('aria-label') ?? ''}`))
  .map(el => ({ text: el.textContent.trim(), label: el.getAttribute('aria-label') }))
```

If that is empty, the control was renamed or moved behind another expander.
Find it by hand, then update `findShowButton` in
`src/content/scrape-transcript.js`.

## 4. The cue element was renamed

Find the new one:

```js
[...new Set([...document.querySelectorAll('*')]
  .map(el => el.tagName.toLowerCase())
  .filter(tag => tag.includes('transcript')))]
```

Then inspect one cue's structure:

```js
const row = document.querySelector('<new-tag-name>');
[...row.querySelectorAll('*')].map(el => ({
  tag: el.tagName.toLowerCase(),
  cls: String(el.className).slice(0, 60),
  text: el.textContent.trim().slice(0, 40),
}));
```

Expect three parts: a timestamp, a screen-reader duration label, and the caption
text. Class names are likely obfuscated, which is why `readRow` matches
structurally rather than by class.

Add the new tag to `SEGMENT_SELECTOR` — **keep the old ones**, since users on
older Chrome or in a staged rollout still see the previous markup.

## 5. Verify before shipping

Paste the whole updated reader into the console of a real video and confirm it
returns the expected number of cues.

Then check virtualisation, which is the one failure that produces *wrong* output
rather than none:

```js
const n1 = document.querySelectorAll(SEG).length;
await new Promise(r => setTimeout(r, 2000));
const n2 = document.querySelectorAll(SEG).length;
({ n1, n2, grew: n2 > n1 });
```

If the count grows, YouTube started virtualising the list and the reader needs
to scroll the panel to collect every cue. That is a larger change — it must not
ship as a silent truncation.

Finally: reload the extension, reload the YouTube tab, and run steps 2–5 of the
[manual test plan](../TESTING.md#manual-test-plan) on a short video **and** one
over an hour.

## 6. Record it

Add a line to [known-issues.md](../known-issues.md) and note the markup
generation in [integrations-and-assumptions.md](../integrations-and-assumptions.md),
so the next person knows what changed and when.

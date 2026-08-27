## What this changes

<!-- One or two sentences. What behaviour is different after this merges? -->

## Why

<!-- The problem being solved. Link an issue if there is one. -->

## How it was verified

<!-- Paste real output. "Should work" is not verification. -->

- [ ] `npm run check` passes (manifest validation + unit tests)
- [ ] Loaded unpacked in Chrome and exercised the changed path
- [ ] Tested against a video with human captions **and** one with auto-generated captions

## Risk

<!-- Delete the rows that do not apply. -->

- [ ] Changes `manifest.json` permissions — justified below
- [ ] Touches the transcript-panel reader, which depends on YouTube's markup
- [ ] Changes PDF byte output — structural test still passes
- [ ] None of the above

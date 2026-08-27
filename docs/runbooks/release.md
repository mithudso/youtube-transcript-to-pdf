# Runbook: cutting a release

## 1. Verify

```bash
npm run check
```

Manifest validation, 31 unit tests, and doc index validation must all pass on
Node 20, 22, and 24 — CI covers the matrix.

Then run the [manual test plan](../TESTING.md#manual-test-plan) in full. Nothing
in the `chrome.*` layer is covered by tests, so this is the only gate on the
service worker, popup, content script, and viewer.

## 2. Bump the version

The version lives in two places and they must match:

```bash
# manifest.json  -> "version"
# package.json   -> "version"
```

Chrome requires 1–4 dot-separated integers. Semantic versioning applies:
patch for fixes, minor for new behaviour, major for anything that changes
permissions or removes a feature.

`npm run lint:manifest` enforces the format but cannot know the two files agree
— check by eye.

## 3. Update the docs that carry counts

Grep for anything version- or count-specific that has drifted:

```bash
grep -rn "31 unit tests\|31 tests" README.md docs/ CLAUDE.md AGENTS.md GEMINI.md .github/
```

If the test count changed, these all need updating. The same applies to the
permission table in [SECURITY.md](../SECURITY.md) if `manifest.json` changed.

## 4. Build

```bash
npm run build
```

Produces `dist/youtube-transcript-to-pdf-<version>.zip` containing only
`manifest.json`, `icons/`, `src/`, and `LICENSE` — no tests, no scripts, no
`.git`.

Confirm the contents:

```bash
unzip -l dist/youtube-transcript-to-pdf-*.zip
```

## 5. Tag and push

```bash
git commit -am "chore: release v<version>"
git tag -a v<version> -m "v<version>"
git push origin main --follow-tags
```

## 6. Publish the GitHub release

```bash
gh release create v<version> dist/youtube-transcript-to-pdf-<version>.zip \
  --title "v<version>" \
  --notes "..."
```

Release notes should say what changed for a *user* — not the commit list.

## 7. Publishing to the Chrome Web Store

The listing is prepared but **not yet submitted**. Everything the dashboard asks
for lives in [CHROMEWEBSTORE.md](../../CHROMEWEBSTORE.md): listing copy, the
per-permission justifications, the data-use disclosure, and the asset inventory.

Before a first submission, clear the blockers listed at the top of that file:

1. Set the publisher name and a monitored contact email — both are required and
   both are shown publicly.
2. Replace the icon. The current mark reads as YouTube's play button, which is
   a trademark rejection risk.
3. Reconsider the name. "YouTube Transcript to PDF" leads with a trademark;
   "Transcript to PDF for YouTube" is the safer construction. Changing it means
   editing `manifest.json`, `CHROMEWEBSTORE.md`, and `README.md` together.
4. Recapture screenshot 1 from a live install rather than the harness render.

Confirm the privacy policy is still live before every submission — a dead URL
is an automatic rejection:

```bash
curl -sI https://mithudso.github.io/youtube-transcript-to-pdf/PRIVACY.html | head -1
```

The permission justifications are what reviews most often fail on. "Needed for
the extension to work" is rejected; each one needs a specific, plain-English
reason, which is why they are written out in full in `CHROMEWEBSTORE.md`.

After a successful submission, add a row to that file's Version History and set
its status.

## Rolling back

Unpacked installs roll back with `git checkout <previous-tag>` and a reload on
the extension card. A published Web Store release cannot be un-published — only
superseded by a higher version, so a bad release is fixed by shipping a fix.

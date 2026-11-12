# Runbook: cutting a release

## 1. Verify

```bash
npm run check
```

Manifest validation, unit and regression tests, and doc index validation must all pass on
Node 22, 24, and 26 — CI covers the matrix.

Then run the [manual test plan](../TESTING.md#manual-test-plan) in full. Synthetic tests cover control flow. The live manual plan verifies current YouTube
markup/session behavior and Chrome print output.

## 2. Bump the version

The version lives in two places and they must match:

```bash
# manifest.json  -> "version"
# package.json   -> "version"
```

Chrome requires 1–4 dot-separated integers. Semantic versioning applies:
patch for fixes, minor for new behaviour, major for anything that changes
permissions or removes a feature.

`npm run lint:manifest` checks the format and requires the two versions to agree.

## 3. Update the docs that carry counts

Regenerate committed documentation and check for stale version/count claims:

```bash
npm run docs:generate
rg -n "tests|version" README.md docs/TESTING.md CLAUDE.md GEMINI.md
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

The repository last recorded a prepared draft on 2026-08-27; current store status
is unverified. Everything the dashboard asks
for lives in [CHROMEWEBSTORE.md](../../CHROMEWEBSTORE.md): listing copy, the
per-permission justifications, the data-use disclosure, and the asset inventory.

The historical preparation record says these blockers were cleared: the publisher name and contact
email are set, the icon is now a document mark rather than a play triangle, and
the extension was renamed to "Transcript to PDF for YouTube" so it no longer
leads with a trademark.

The committed screenshot 1 came from a running-extension capture. Recapture it
for the release using a disposable browser profile that can load the unpacked
extension, or by hand: open the popup with a transcript loaded, screenshot it,
crop to the popup alone, and save it as `store-assets/raw-popup-live.png`. The composer picks it
up automatically and falls back to the harness render when it is absent.

For the full submission procedure, see
[chrome-web-store-submission.md](chrome-web-store-submission.md).

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

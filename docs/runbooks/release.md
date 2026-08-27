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

## 7. If publishing to the Chrome Web Store

Not done today; the extension is install-from-source only. Before a first
submission, this repo would need a `CHROMEWEBSTORE.md` carrying the listing
copy, a per-permission justification (the table in
[SECURITY.md](../SECURITY.md) is the starting point), a live privacy-policy URL
matching the data-use disclosure, and at least one 1280×800 screenshot.

The permission justifications are what reviews fail on. "Needed for the
extension to work" is rejected; each one needs a specific, plain-English reason.

## Rolling back

Unpacked installs roll back with `git checkout <previous-tag>` and a reload on
the extension card. A published Web Store release cannot be un-published — only
superseded by a higher version, so a bad release is fixed by shipping a fix.

# Runbook: submitting to the Chrome Web Store

Every value below is copy-paste ready from
[CHROMEWEBSTORE.md](../../CHROMEWEBSTORE.md). Work through this in order; the
dashboard will not let you submit until every required field is filled.

**Budget about 45 minutes** for a first submission, most of it the one-time
account setup. Review then takes anywhere from a few hours to a couple of weeks.

---

## Before you start

You need:

- A Google account you are happy to have associated with a published extension.
- **US$5**, one time, non-refundable, for developer registration. A card is
  required.
- Two-factor authentication enabled on that Google account — the dashboard
  requires it.

---

## Step 0 — Verify the build one last time

```bash
cd /Users/mitch/dev/youtube-transcript-to-pdf
git pull
npm run check
```

Expect: manifest OK, 31 tests passing, doc indexes OK.

Then reload the unpacked extension at `chrome://extensions` and run it once
against a real video. The packaged build is the same code, so if the unpacked
one works, the zip works.

Confirm the privacy policy is live — a dead URL is an automatic rejection:

```bash
curl -sI https://mithudso.github.io/youtube-transcript-to-pdf/PRIVACY.html | head -1
```

Expect `HTTP/2 200`.

## Step 1 — Build the archive

```bash
npm run build
unzip -l dist/youtube-transcript-to-pdf-1.0.0.zip
```

Expect 24 files: `manifest.json`, `icons/`, `src/`, `LICENSE`. If you see
`docs/`, `test/`, `scripts/`, or `store-assets/`, stop — something changed in
the packaging script.

The file you will upload is:

```
dist/youtube-transcript-to-pdf-1.0.0.zip
```

## Step 2 — Register as a developer (one time)

1. Go to <https://chrome.google.com/webstore/devconsole>.
2. Sign in with the Google account you chose.
3. Accept the Developer Agreement.
4. Pay the US$5 registration fee.
5. Under **Account** → set your **Publisher name** to `Mitchell Hudson` and
   your **Contact email** to `mitch@tsiser.net`, then verify the email. Google
   sends takedown and policy notices there, so it has to stay monitored.

Publishing is blocked until the contact email is verified.

## Step 3 — Create the item

1. **Items** → **Add new item**.
2. Drag in `dist/youtube-transcript-to-pdf-1.0.0.zip`.
3. Wait for the upload to parse. It reads `manifest.json`, so the name and
   version populate themselves.

If it rejects the upload, the message names the manifest field at fault.

## Step 4 — Store listing tab

| Field | Value |
| --- | --- |
| Name | `Transcript to PDF for YouTube` (already filled from the manifest) |
| Short description | The 117-character line under **Short Description** in CHROMEWEBSTORE.md |
| Detailed description | The whole **Detailed Description** block. Paste as plain text — the store strips markdown, which is why it is already written without bullets |
| Category | `Productivity` |
| Language | `English` |

Graphics, all from `store-assets/`:

| Slot | File |
| --- | --- |
| Store icon (128×128) | `icons/icon-128.png` |
| Screenshot 1 | `store-assets/screenshot-1-popup.png` |
| Screenshot 2 | `store-assets/screenshot-2-pdf.png` |
| Screenshot 3 | `store-assets/screenshot-3-viewer.png` |
| Small promo tile (440×280) | `store-assets/promo-tile-small.png` |

Leave the marquee tile empty; it is only used for featured placements.

Additional fields:

- **Homepage URL**: `https://github.com/mithudso/youtube-transcript-to-pdf`
- **Support URL**: `https://github.com/mithudso/youtube-transcript-to-pdf/issues`
- **Official YouTube video**: optional. The store takes a YouTube URL, not a
  file, so the end-to-end recording would have to be uploaded to YouTube first.
  Skip it for a first submission.

## Step 5 — Privacy tab

This is where submissions usually fail. Take it slowly.

**Single purpose** — one sentence:

```
Exports the transcript of a YouTube video as a PDF file.
```

**Permission justifications** — one box per permission. Paste from the
Permissions Justification table in CHROMEWEBSTORE.md. Every box needs a
specific reason; "required for functionality" is rejected. The six are:

`tabs`, `scripting`, `storage`, `downloads`, and host access to
`https://www.youtube.com/*` and `https://m.youtube.com/*`.

**Are you using remote code?** → **No, I am not using remote code.**

Everything the extension runs is in the package. There are no dependencies, no
CDN scripts, and no `eval`.

**Data usage** — leave **every** checkbox unchecked. The extension collects
nothing. Then tick all three certifications:

- Data is not sold to third parties
- Data is not used for purposes unrelated to the item's core functionality
- Data is not used to determine creditworthiness or for lending purposes

**Privacy policy URL**:

```
https://mithudso.github.io/youtube-transcript-to-pdf/PRIVACY.html
```

The policy text and these checkboxes must agree. Both say "nothing is
collected", so they do.

## Step 6 — Distribution tab

- **Visibility**: Public
- **Regions**: All regions
- **Pricing**: Free

## Step 7 — Submit

1. Click **Submit for review**.
2. If it offers **deferred publishing**, decide whether you want it to go live
   automatically on approval or to publish it yourself. Automatic is fine here.
3. Confirm.

The item moves to **Pending review**.

## Step 8 — After submitting

- Review usually takes hours to days; extensions requesting broad permissions
  take longer. This one requests narrow, well-justified permissions.
- Decisions arrive at the contact email.
- On approval, the listing goes live and the item gets a permanent extension ID
  — **different from the unpacked development ID**.
- Record the outcome in the Version History table in CHROMEWEBSTORE.md.

## If it is rejected

The rejection email names a policy section. Common causes for an extension
shaped like this one, and what to do:

| Rejection | Fix |
| --- | --- |
| Trademark / brand confusion | Already mitigated: the name is "for YouTube" rather than leading with it, and the icon is a document rather than a play triangle. If it still trips, the next lever is dropping "YouTube" from the name entirely. |
| Permission not justified | Expand the specific box the email names. Say which user-visible feature breaks without it. |
| Privacy policy mismatch | Re-read `PRIVACY.md` against the data-usage checkboxes. They must say the same thing. |
| Screenshots do not show the product | Screenshot 1 is a capture of the running extension. If they want more, add a second live capture showing the saved PDF. |
| Single purpose too broad | The stated purpose is already one sentence and narrow. Do not broaden it. |

Fix, bump the version in **both** `manifest.json` and `package.json`, rebuild,
and upload again. Record the rejection and the fix in the Rejection History
table in CHROMEWEBSTORE.md.

## Publishing an update later

1. Bump the version in `manifest.json` and `package.json`.
2. `npm run check && npm run build`
3. Dashboard → the item → **Package** → upload the new zip.
4. Update anything on the listing that changed, especially permissions.
5. Submit for review again.

The version must be strictly higher than the published one, or the upload is
rejected.

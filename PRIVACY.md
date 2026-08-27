# Privacy Policy for Transcript to PDF for YouTube

**Last updated: 27 August 2026**

## Summary

This extension does not collect, store, or transmit any personal data. Nothing
you do with it is sent anywhere. There is no server, no account, no analytics,
and no third-party service of any kind.

## What data the extension handles

The extension processes three things, all of them locally, in your browser:

| Data | Why it is touched | Where it goes |
| --- | --- | --- |
| The URL of the video you ask about | To identify which video's transcript to fetch | Used to request that video's page from YouTube. Never stored. |
| The URL of your active tab | To prefill the input box when you are already on a YouTube video | Read at the moment you open the popup, used to fill in the text field, and discarded when the popup closes. Never stored, never transmitted. |
| The transcript itself | It is the thing you asked for | Held in memory while the popup is open, and written to the PDF file you choose to save. Never transmitted. |

## What is stored on your device

Two things, both in the browser's extension storage, both local to your machine:

1. **Your formatting preferences** — whether timestamps and paragraph grouping
   are switched on. Two true/false values. Stored in `chrome.storage.local` so
   they survive closing the popup.
2. **A temporary transcript handoff** — when you press **Print**, the transcript
   is placed in `chrome.storage.session` so the printable page can read it. It
   is deleted the moment that page renders, and session storage is cleared when
   you close the browser regardless.

Neither is synced. The extension does not use `chrome.storage.sync`, so nothing
is uploaded to a Google account.

## Network requests

The extension contacts exactly one host: `youtube.com`. It requests the video's
watch page and, where YouTube allows it, the caption track. When YouTube blocks
the direct caption request, the extension instead opens the video in a browser
tab and reads the transcript panel YouTube itself renders.

All requests are made with credentials omitted, meaning **your YouTube cookies
and session are never attached**. The extension cannot see who you are on
YouTube and cannot act on your behalf.

No request is made to any other host. There is no telemetry endpoint, no crash
reporter, no update check, and no advertising or analytics network.

## Third-party services

None. The extension has zero third-party dependencies and loads no remote code.
Everything it runs is contained in the extension package.

## Data sharing

Nothing is shared, because nothing is collected. No data is sold, and none is
used for advertising, profiling, creditworthiness, or any purpose other than
producing the transcript you asked for.

## Data retention and deletion

Your formatting preferences persist until you remove the extension, which
deletes them. The temporary print handoff is deleted immediately after use.
Transcripts are not retained at all.

PDFs you save are ordinary files on your computer. The extension has no access
to them once they are written, and removing the extension does not affect them.

## Permissions

The extension requests five permissions, each tied to a specific feature:

- **`tabs`** — read the active tab's URL to prefill the input, and find a tab
  already open on the video you requested.
- **`scripting`** — inject the transcript reader into a YouTube tab when the
  direct caption download is blocked.
- **`storage`** — save your formatting preferences and hand the transcript to
  the printable page.
- **`downloads`** — save the PDF.
- **Host access to `youtube.com` and `m.youtube.com`** — fetch video pages and
  captions. No other site is accessible to the extension.

## Changes to this policy

If the extension's data practices ever change, this policy will be updated and
the change recorded in the repository's commit history, which is public. The
"Last updated" date above reflects the current version.

## Contact

Questions about privacy, or anything else, can be raised at
[github.com/mithudso/youtube-transcript-to-pdf/issues](https://github.com/mithudso/youtube-transcript-to-pdf/issues).

For security issues specifically, please use
[private vulnerability reporting](https://github.com/mithudso/youtube-transcript-to-pdf/security/advisories/new)
rather than a public issue.

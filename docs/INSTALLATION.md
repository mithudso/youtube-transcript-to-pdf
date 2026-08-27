# Installation

## Prerequisites

- **Chrome 116 or newer** (or a Chromium browser of equivalent vintage —
  Edge, Brave, Arc). Check at `chrome://version`.
- **Node 20 or newer**, only if you intend to run the tests or build an archive.
  Not needed to use the extension.

## Install from source (unpacked)

This is the only supported install today. The extension is not on the Chrome
Web Store.

```bash
git clone https://github.com/mithudso/youtube-transcript-to-pdf.git
cd youtube-transcript-to-pdf
```

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the cloned directory — the one containing `manifest.json`.
5. Pin **Transcript to PDF for YouTube** to the toolbar.

Chrome will show a "Loading unpacked extension" notice on each restart. That is
normal for developer-mode extensions.

## Verify it worked

1. Open any YouTube video that has captions.
2. Click the extension. The URL box should already be filled in, with
   "Detected the video in this tab."
3. Click **Get**. Within a few seconds the preview fills with timestamped text.
   A background tab may briefly open and close — that is the transcript-panel
   strategy.
4. Click **Download PDF**. The file appears in your Downloads folder.

If step 3 fails, open the service worker console: `chrome://extensions` → the
extension's **service worker** link. See
[DEVELOPMENT.md](DEVELOPMENT.md#troubleshooting).

## Upgrading

```bash
git pull
```

Then click the reload icon on the extension's card at `chrome://extensions`.
A manifest permission change may require removing and re-adding the extension.

## Uninstalling

`chrome://extensions` → **Remove**. This deletes the extension's stored
preferences. PDFs you already downloaded are ordinary files and are untouched.

## Building a distributable archive

```bash
npm run build
```

Writes `dist/youtube-transcript-to-pdf-<version>.zip`, containing only the files
Chrome loads. See [runbooks/release.md](runbooks/release.md).

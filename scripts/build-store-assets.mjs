#!/usr/bin/env node
/**
 * Builds the Chrome Web Store screenshot sources.
 *
 * Renders the extension's real popup and viewer markup — the same HTML
 * structure and the same stylesheets the extension ships — filled with the
 * authored sample transcript in `store-assets/sample-transcript.json`, and
 * generates a genuine PDF through `src/lib/pdf.js`.
 *
 * The harness pages exist because a Chrome popup cannot be screenshotted from
 * an ordinary tab. Everything visible in them is produced by the extension's
 * own code; only the transcript text is a stand-in, so the store assets carry
 * no third-party content.
 *
 * Output lands in `store-assets/`, which the packaging script excludes from
 * the distributed archive.
 *
 * Usage: node scripts/build-store-assets.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatTimestamp, groupIntoParagraphs, renderText } from '../src/lib/transcript.js';
import { buildTranscriptPdf, toSafeFilename } from '../src/lib/pdf.js';
import { watchUrl } from '../src/lib/youtube.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'store-assets');

mkdirSync(assets, { recursive: true });

const sample = JSON.parse(readFileSync(join(assets, 'sample-transcript.json'), 'utf8'));

/**
 * Escapes text for safe interpolation into the harness HTML.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The grey lines printed under a transcript's title, as the popup builds them. */
const subtitleLines = [
  sample.author,
  watchUrl(sample.videoId),
  `Language: ${sample.language} · ${sample.segments.length} caption lines`,
];

const blocks = groupIntoParagraphs(sample.segments).map((block) => ({
  timestamp: `[${formatTimestamp(block.start)}]`,
  text: block.text,
}));

// --- A genuine PDF, produced by the shipping writer -----------------------
const pdfBytes = buildTranscriptPdf({
  title: sample.title,
  subtitleLines,
  blocks,
});
writeFileSync(join(assets, 'sample-transcript.pdf'), pdfBytes);

/**
 * Wraps harness body markup in a page that loads a real extension stylesheet.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.stylesheet Path relative to the repository root.
 * @param {string} options.body
 * @param {string} [options.extraCss]
 * @returns {string}
 */
function harnessPage({ title, stylesheet, body, extraCss = '' }) {
  const css = readFileSync(join(root, stylesheet), 'utf8');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
${css}
${extraCss}
    </style>
  </head>
  <body>
${body}
  </body>
</html>
`;
}

// --- Popup harness --------------------------------------------------------
const previewText = renderText(sample.segments, { timestamps: true, paragraphs: true });

const languageOptions = ['English', 'Deutsch', 'Español (Latinoamérica)', '日本語']
  .map((name, index) => `<option${index === 0 ? ' selected' : ''}>${escapeHtml(name)}</option>`)
  .join('\n          ');

const popupBody = `    <header class="header">
      <h1 class="title">Transcript to PDF</h1>
    </header>

    <form class="form">
      <label class="label" for="url">YouTube URL or video ID</label>
      <div class="row">
        <input id="url" class="input" type="text" value="${escapeHtml(watchUrl(sample.videoId))}" />
        <button class="button button--primary" type="button">Get</button>
      </div>

      <div class="options">
        <label class="option">
          <select class="select">
          ${languageOptions}
          </select>
        </label>
        <label class="option"><input type="checkbox" checked /><span>Timestamps</span></label>
        <label class="option"><input type="checkbox" checked /><span>Paragraphs</span></label>
      </div>
    </form>

    <p class="status"></p>

    <section class="result">
      <div class="meta">
        <span class="meta__title">${escapeHtml(sample.title)}</span>
        <span class="meta__sub">${escapeHtml(sample.author)} · ${sample.segments.length} lines · read from transcript panel</span>
      </div>
      <pre class="preview">${escapeHtml(previewText)}</pre>
      <div class="actions">
        <button class="button button--primary" type="button">Download PDF</button>
        <button class="button" type="button">Print…</button>
        <button class="button" type="button">Copy</button>
      </div>
    </section>`;

writeFileSync(
  join(assets, 'harness-popup.html'),
  harnessPage({
    title: 'Popup',
    stylesheet: 'src/popup/popup.css',
    body: popupBody,
    // The popup renders at its natural width; the surrounding page is
    // transparent so the composite step can place it on its own backdrop.
    // Store screenshots are pinned to the light palette: they are viewed on a
    // white store page, and the browser capturing them may be in dark mode.
    extraCss: `
:root {
  --bg: #ffffff;
  --fg: #10151b;
  --muted: #5c6773;
  --border: #dfe3e8;
  --surface: #f5f7f9;
  --accent: #c8202a;
  --accent-fg: #ffffff;
  --danger: #b3261e;
  color-scheme: light;
}
body { width: 380px; margin: 0; }
.preview { max-height: 260px; }
`,
  }),
);

// --- Viewer harness -------------------------------------------------------
const viewerBlocks = blocks
  .map(
    (block) => `      <div class="block">
        <span class="timestamp">${escapeHtml(block.timestamp)}</span>
        <p>${escapeHtml(block.text)}</p>
      </div>`,
  )
  .join('\n');

const viewerBody = `    <div class="toolbar no-print">
      <button class="print-button" type="button">Save as PDF / Print</button>
      <span class="hint">Choose “Save as PDF” as the destination.</span>
    </div>
    <main class="document">
      <h1>${escapeHtml(sample.title)}</h1>
${subtitleLines.map((line) => `      <p class="subtitle">${escapeHtml(line)}</p>`).join('\n')}
${viewerBlocks}
    </main>`;

writeFileSync(
  join(assets, 'harness-viewer.html'),
  harnessPage({ title: 'Viewer', stylesheet: 'src/viewer/viewer.css', body: viewerBody }),
);

console.log('Store asset sources written to store-assets/:');
console.log(`  sample-transcript.pdf  (${pdfBytes.length} bytes, ${toSafeFilename(sample.title)})`);
console.log('  harness-popup.html');
console.log('  harness-viewer.html');

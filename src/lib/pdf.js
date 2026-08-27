/**
 * Minimal, dependency-free PDF writer for text documents.
 *
 * Produces a PDF 1.4 file using the two standard Type 1 fonts every reader
 * ships with (Helvetica and Helvetica-Bold), so nothing has to be embedded.
 * Text is encoded as WinAnsi (Latin-1); characters outside that range are
 * transliterated where there is an obvious equivalent and replaced with "?"
 * otherwise. For non-Latin transcripts use the print-to-PDF path in the popup,
 * which renders through Chrome and keeps full Unicode.
 */

/** Advance widths for Helvetica, in 1/1000 em, for code points 32-126. */
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

/** Fallback width for anything outside the measured range. */
const DEFAULT_WIDTH = 556;

/** Bold glyphs run wider than regular; scale rather than ship a second table. */
const BOLD_WIDTH_FACTOR = 1.08;

/** Characters that have a sensible Latin-1 stand-in. */
const TRANSLITERATIONS = new Map([
  ['‘', "'"], ['’', "'"], ['‚', ','], ['‛', "'"],
  ['“', '"'], ['”', '"'], ['„', '"'], ['′', "'"], ['″', '"'],
  ['‐', '-'], ['‑', '-'], ['‒', '-'], ['–', '-'], ['—', '--'],
  ['―', '--'], ['−', '-'], ['…', '...'], ['•', '*'], ['·', '*'],
  ['‹', '<'], ['›', '>'], ['«', '<<'], ['»', '>>'],
  [' ', ' '], [' ', ' '], [' ', ' '], [' ', ' '], [' ', ' '],
  ['​', ''], ['‌', ''], ['‍', ''], ['﻿', ''],
  ['™', '(TM)'], ['©', '(C)'], ['®', '(R)'],
  ['€', 'EUR'], ['→', '->'], ['←', '<-'],
]);

/** Page geometry presets, in PDF points (72 per inch). */
const PAGE_SIZES = {
  letter: { width: 612, height: 792 },
  a4: { width: 595.28, height: 841.89 },
};

/**
 * Maps a string into the Latin-1 subset the standard fonts can render.
 *
 * @param {string} text
 * @returns {string}
 */
export function toWinAnsi(text) {
  let out = '';
  for (const char of String(text ?? '')) {
    if (TRANSLITERATIONS.has(char)) {
      out += TRANSLITERATIONS.get(char);
      continue;
    }
    const code = char.codePointAt(0);
    out += code <= 0xff ? char : '?';
  }
  return out;
}

/**
 * Measures a already-transliterated string in points.
 *
 * @param {string} text
 * @param {number} fontSize
 * @param {boolean} bold
 * @returns {number}
 */
function measure(text, fontSize, bold) {
  let width = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const glyph =
      code >= 32 && code <= 126 ? HELVETICA_WIDTHS[code - 32] : DEFAULT_WIDTH;
    width += glyph;
  }
  const scaled = (width / 1000) * fontSize;
  return bold ? scaled * BOLD_WIDTH_FACTOR : scaled;
}

/**
 * Greedy word wrap. Words longer than the line box are split mid-word so a URL
 * can never push text past the right margin.
 *
 * @param {string} text
 * @param {number} maxWidth Available width in points.
 * @param {number} fontSize
 * @param {boolean} bold
 * @returns {string[]} One entry per rendered line.
 */
export function wrapText(text, maxWidth, fontSize, bold = false) {
  const words = toWinAnsi(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines = [];
  let line = '';

  /** Hard-splits an over-long word across as many lines as it needs. */
  const pushOversized = (word) => {
    let chunk = '';
    for (const char of word) {
      if (chunk && measure(chunk + char, fontSize, bold) > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    return chunk;
  };

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;

    if (measure(candidate, fontSize, bold) <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = measure(word, fontSize, bold) > maxWidth ? pushOversized(word) : word;
  }

  if (line) lines.push(line);
  return lines;
}

/**
 * Escapes a Latin-1 string for use inside a PDF literal string object.
 *
 * @param {string} text
 * @returns {string}
 */
function escapePdfString(text) {
  return text.replace(/([\\()])/g, '\\$1').replace(/\r/g, '');
}

/**
 * @typedef {object} PdfDocumentOptions
 * @property {string} title Document title, printed and set in the metadata.
 * @property {string[]} [subtitleLines] Small grey lines under the title.
 * @property {Array<{timestamp?: string, text: string}>} blocks Body paragraphs.
 * @property {'letter'|'a4'} [pageSize='letter']
 * @property {number} [fontSize=11]
 * @property {number} [margin=54] Page margin in points.
 */

/**
 * Renders a transcript into PDF bytes.
 *
 * @param {PdfDocumentOptions} options
 * @returns {Uint8Array} Complete PDF file contents.
 */
export function buildTranscriptPdf(options) {
  const page = PAGE_SIZES[options.pageSize ?? 'letter'] ?? PAGE_SIZES.letter;
  const margin = options.margin ?? 54;
  const fontSize = options.fontSize ?? 11;
  const lineHeight = fontSize * 1.45;
  const contentWidth = page.width - margin * 2;
  const bottomLimit = margin + lineHeight;

  const pages = [];
  let currentOps = [];
  let cursorY = page.height - margin;

  /** Starts a fresh page, flushing the one in progress. */
  const newPage = () => {
    pages.push(currentOps);
    currentOps = [];
    cursorY = page.height - margin;
  };

  /**
   * Draws one line, paginating first if it would not fit.
   *
   * @param {string} text Already transliterated.
   * @param {object} style
   * @param {number} style.size
   * @param {boolean} [style.bold]
   * @param {number} [style.indent]
   * @param {[number, number, number]} [style.color] RGB in the 0-1 range.
   */
  const drawLine = (text, style) => {
    const size = style.size;
    const leading = size * 1.45;
    if (cursorY - leading < bottomLimit) newPage();
    cursorY -= leading;

    const [r, g, b] = style.color ?? [0, 0, 0];
    const x = margin + (style.indent ?? 0);
    currentOps.push(
      'BT',
      `${r} ${g} ${b} rg`,
      `/${style.bold ? 'F2' : 'F1'} ${size} Tf`,
      `1 0 0 1 ${x.toFixed(2)} ${cursorY.toFixed(2)} Tm`,
      `(${escapePdfString(text)}) Tj`,
      'ET',
    );
  };

  /** Adds vertical space, without leaving a blank gap at the top of a page. */
  const addGap = (points) => {
    if (currentOps.length === 0 && pages.length > 0) return;
    cursorY -= points;
  };

  // --- Title block -------------------------------------------------------
  const titleSize = fontSize + 6;
  for (const line of wrapText(options.title ?? 'Transcript', contentWidth, titleSize, true)) {
    drawLine(line, { size: titleSize, bold: true });
  }

  for (const subtitle of options.subtitleLines ?? []) {
    for (const line of wrapText(subtitle, contentWidth, fontSize - 1, false)) {
      drawLine(line, { size: fontSize - 1, color: [0.35, 0.35, 0.35] });
    }
  }
  addGap(lineHeight * 0.9);

  // --- Body --------------------------------------------------------------
  for (const block of options.blocks ?? []) {
    if (block.timestamp) {
      drawLine(block.timestamp, {
        size: fontSize - 1,
        bold: true,
        color: [0.78, 0.13, 0.16],
      });
    }
    for (const line of wrapText(block.text, contentWidth, fontSize, false)) {
      drawLine(line, { size: fontSize });
    }
    addGap(lineHeight * 0.55);
  }

  pages.push(currentOps);

  return assemblePdf(
    pages.filter((ops) => ops.length > 0),
    page,
    options.title ?? 'Transcript',
  );
}

/**
 * Serialises page content streams into a complete PDF file.
 *
 * Object layout: 1 catalog, 2 page tree, 3-4 fonts, 5 info, then a
 * (page, content) pair per page.
 *
 * @param {string[][]} pageOps One array of content-stream operators per page.
 * @param {{width: number, height: number}} page
 * @param {string} title
 * @returns {Uint8Array}
 */
function assemblePdf(pageOps, page, title) {
  const pages = pageOps.length > 0 ? pageOps : [[]];
  const firstPageObj = 6;
  const pageIds = pages.map((_, index) => firstPageObj + index * 2);

  const objects = new Map();

  objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(' ')}] >>`,
  );
  objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.set(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  objects.set(
    5,
    `<< /Title (${escapePdfString(toWinAnsi(title))}) /Producer (YouTube Transcript to PDF) >>`,
  );

  pages.forEach((ops, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const stream = ops.join('\n');

    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width.toFixed(2)} ${page.height.toFixed(
        2,
      )}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.set(
      contentId,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  });

  const ids = [...objects.keys()].sort((a, b) => a - b);
  const chunks = ['%PDF-1.4\n%âãÏÓ\n'];
  const offsets = new Map();
  let position = chunks[0].length;

  for (const id of ids) {
    const body = `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
    offsets.set(id, position);
    position += body.length;
    chunks.push(body);
  }

  const maxId = ids[ids.length - 1];
  const xrefStart = position;

  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id += 1) {
    xref += offsets.has(id)
      ? `${String(offsets.get(id)).padStart(10, '0')} 00000 n \n`
      : '0000000000 65535 f \n';
  }
  chunks.push(xref);

  chunks.push(
    `trailer\n<< /Size ${maxId + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  );

  // Latin-1 out: every byte written above is already within 0-255.
  const text = chunks.join('');
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

/**
 * Builds a filesystem-safe filename from a video title.
 *
 * @param {string} title
 * @returns {string} A name ending in `.pdf`.
 */
export function toSafeFilename(title) {
  const base = toWinAnsi(String(title ?? 'transcript'))
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return `${base || 'transcript'}.pdf`;
}

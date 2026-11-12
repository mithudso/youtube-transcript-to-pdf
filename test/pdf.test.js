import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildTranscriptPdf, toSafeFilename, toWinAnsi, wrapText } from '../src/lib/pdf.js';

/**
 * Reads the byte offsets out of a PDF's cross-reference table and confirms each
 * one points at the object it claims to.
 *
 * @param {Uint8Array} bytes
 * @returns {{objectCount: number, pageCount: number}}
 */
function verifyStructure(bytes) {
  const text = Buffer.from(bytes).toString('latin1');

  assert.ok(text.startsWith('%PDF-1.4'), 'has a PDF header');
  assert.ok(text.trimEnd().endsWith('%%EOF'), 'has an EOF marker');

  const startxref = /startxref\s+(\d+)/.exec(text);
  assert.ok(startxref, 'declares a startxref offset');

  const lines = text.slice(Number(startxref[1])).split('\n');
  assert.equal(lines[0], 'xref');

  assert.match(lines[1], /^0 [1-9]\d*$/);
  const entryCount = Number(lines[1].split(' ')[1]);
  assert.ok(Number.isSafeInteger(entryCount) && entryCount > 1);
  assert.ok(lines.length >= entryCount + 2);
  assert.equal(lines[2], '0000000000 65535 f ');
  assert.equal(lines[2 + entryCount], 'trailer');
  const size = /\/Size\s+(\d+)\b/.exec(lines[3 + entryCount] ?? '');
  assert.ok(size);
  assert.equal(Number(size[1]), entryCount);
  let pageCount = 0;
  for (let id = 1; id < entryCount; id += 1) {
    const entry = lines[2 + id];
    assert.match(entry, /^\d{10} 00000 n $/);

    const offset = Number(entry.split(' ')[0]);
    if (/^\d+ 0 obj\n<< \/Type \/Page(?=[\s/])/.test(text.slice(offset))) pageCount += 1;
    assert.ok(
      text.startsWith(`${id} 0 obj`, offset),
      `xref entry ${id} points at object ${id}`,
    );
  }

  return {
    objectCount: entryCount - 1,
    pageCount,
  };
}

test('toWinAnsi transliterates typographic characters and drops unencodable ones', () => {
  assert.equal(toWinAnsi('“quoted” — it’s…'), '"quoted" -- it\'s...');
  assert.equal(toWinAnsi('café'), 'café');
  assert.equal(toWinAnsi('日本語'), '???');
  assert.equal(toWinAnsi('a​b'), 'ab');
});

test('wrapText never exceeds the line box', () => {
  // Independent Helvetica AFM fixture: W = 944 units, space = 278 units.
  const input = 'W '.repeat(60).trim();
  const lines = wrapText(input, 200, 11);
  assert.ok(lines.length > 1);
  assert.equal(lines.join(' '), input);
  for (const line of lines) {
    const width = [...line].reduce((total, char) => total + (char === 'W' ? 944 : 278), 0) * 11 / 1000;
    assert.ok(width <= 200, `measured line width: ${width}`);
  }
});

test('wrapText hard-splits a word longer than the line box', () => {
  const lines = wrapText('W'.repeat(40), 200, 11);
  assert.ok(lines.length > 1);
  assert.equal(lines.join(''), 'W'.repeat(40));
  assert.ok(lines.every((line) => line.length * 944 / 1000 * 11 <= 200));
});

test('wrapText returns a single empty line for empty input', () => {
  assert.deepEqual(wrapText('', 200, 11), ['']);
});

test('buildTranscriptPdf produces a structurally valid single-page document', () => {
  const bytes = buildTranscriptPdf({
    title: 'Short',
    subtitleLines: ['Channel'],
    blocks: [{ timestamp: '[0:00]', text: 'hello' }],
  });

  const { pageCount } = verifyStructure(bytes);
  assert.equal(pageCount, 1);
});

test('buildTranscriptPdf paginates long transcripts', () => {
  const blocks = Array.from({ length: 200 }, (_, index) => ({
    timestamp: `[${index}:00]`,
    text: `Paragraph ${index}. ${'filler text '.repeat(20)}`,
  }));

  const bytes = buildTranscriptPdf({ title: 'Long', blocks });
  const { pageCount } = verifyStructure(bytes);
  assert.ok(pageCount > 5, `expected several pages, got ${pageCount}`);
});

test('buildTranscriptPdf escapes characters that would break a PDF string', () => {
  const bytes = buildTranscriptPdf({
    title: 'Parens ( ) and a backslash \\',
    blocks: [{ text: 'body ( ) \\ text' }],
  });

  verifyStructure(bytes);
  const text = Buffer.from(bytes).toString('latin1');
  assert.ok(text.includes('(body \\( \\) \\\\ text) Tj'));
  assert.ok(text.includes('(Parens \\( \\) and a backslash \\\\) Tj'));
});

test('buildTranscriptPdf handles an empty transcript without crashing', () => {
  const bytes = buildTranscriptPdf({ title: 'Empty', blocks: [] });
  assert.equal(verifyStructure(bytes).pageCount, 1);
});

test('toSafeFilename strips path separators and always ends in .pdf', () => {
  assert.equal(toSafeFilename('a/b:c*d?"<>|'), 'a-b-c-d-.pdf');
  assert.equal(toSafeFilename(''), 'transcript.pdf');
  assert.ok(toSafeFilename('x'.repeat(400)).length <= 124);
});

test('escaping neutralises newlines that would break the content stream', () => {
  const bytes = buildTranscriptPdf({ title: 'Title', blocks: [{ text: 'a\nbc' }] });
  const text = Buffer.from(bytes).toString('latin1');

  verifyStructure(bytes);
  assert.ok(!/\(a\nb/.test(text), 'no raw newline survives inside a literal string');
});

test('toSafeFilename strips the names chrome.downloads rejects', () => {
  assert.equal(toSafeFilename('...hidden'), 'hidden.pdf');
  assert.equal(toSafeFilename('../../etc/passwd'), '-.-etc-passwd.pdf');
  assert.equal(toSafeFilename('trailing dots...'), 'trailing dots.pdf');
  assert.equal(toSafeFilename('a' + String.fromCharCode(0) + 'b'), 'ab.pdf');
  assert.equal(toSafeFilename('   '), 'transcript.pdf');
});

test('Unicode timestamps cannot introduce PDF operators during byte encoding', () => {
  const text = Buffer.from(buildTranscriptPdf({ title: 'Fixture', blocks: [{
    timestamp: '\u0129 Tj 72 0 Td \u0128Injected', text: 'body',
  }] })).toString('latin1');
  assert.ok(text.includes('(? Tj 72 0 Td ?Injected) Tj'));
  assert.ok(!text.includes('() Tj 72 0 Td (Injected) Tj'));
});

test('invalid PDF geometry is rejected before rendering', () => {
  for (const settings of [{ fontSize: NaN }, { fontSize: Infinity }, { fontSize: 0 }, { margin: Infinity }, { margin: 400 }, { margin: -1 }]) {
    assert.throws(() => buildTranscriptPdf({ title: 'Fixture', blocks: [], ...settings }), RangeError);
  }
});

test('filenames avoid Windows reserved device names', () => {
  for (const title of ['CON', 'nul', 'COM1', 'LPT9', 'Con.txt']) {
    assert.doesNotMatch(toSafeFilename(title), /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i);
  }
});


test('PDF structure verification rejects malformed cross-reference counts', () => {
  const text = Buffer.from(buildTranscriptPdf({ title: 'Fixture', blocks: [] })).toString('latin1');
  const malformed = text.replace(/xref\n0 \d+\n/, 'xref\n0 NaN\n');
  assert.throws(() => verifyStructure(Buffer.from(malformed, 'latin1')));
});


test('extended Latin-1 and bold glyphs fit their real rendered widths', () => {
  for (const [char, units, bold] of [['Æ', 1000, false], ['f', 333, true], ['l', 278, true]]) {
    const input = char.repeat(180);
    const lines = wrapText(input, 504, 11, bold);
    assert.equal(lines.join(''), input);
    assert.ok(lines.length > 1);
    assert.ok(lines.every((line) => line.length * units / 1000 * 11 <= 504));
  }
});

test('long timestamps wrap without losing text or overflowing the PDF box', () => {
  const stamp = 'W'.repeat(100);
  const text = Buffer.from(buildTranscriptPdf({ title: 'T', blocks: [{ timestamp: stamp, text: '' }] })).toString('latin1');
  const runs = [...text.matchAll(/\((W+)\) Tj/g)].map((m) => m[1]);
  assert.equal(runs.join(''), stamp);
  assert.ok(runs.length > 1);
  assert.ok(runs.every((run) => run.length * 944 / 1000 * 10 <= 504));
});


test('the PDF xref oracle rejects a freed catalog entry', () => {
  const text = Buffer.from(buildTranscriptPdf({ title: 'Fixture', blocks: [] })).toString('latin1');
  const malformed = text.replace(/\d{10} 00000 n /, '0000000000 65535 f ');
  assert.notEqual(malformed, text);
  assert.throws(() => verifyStructure(Buffer.from(malformed, 'latin1')));
});


test('wrapping measures glyphs in linear work even when many words fit one line', async () => {
  const { readFileSync } = await import('node:fs');
  const vm = await import('node:vm');
  const source = readFileSync(new URL('../src/lib/pdf.js', import.meta.url), 'utf8').replace(/^export /gm, '');
  const context = vm.createContext({});
  vm.runInContext(source + '; globalThis.wrapForTest = wrapText;', context, { timeout: 1000 });
  vm.runInContext('globalThis.visits = 0; const original = String.prototype.charCodeAt; String.prototype.charCodeAt = function(i) { visits++; return original.call(this, i); };', context);
  for (const count of [200, 400]) {
    context.body = 'a '.repeat(count); context.visits = 0;
    const lines = vm.runInContext('wrapForTest(body, 1000000, 11)', context, { timeout: 1000 });
    assert.ok(context.visits > 0, 'glyph instrumentation is active');
    assert.equal(lines.join(' '), context.body.trim());
    assert.ok(context.visits <= 10 * context.body.length, `glyph visits: ${context.visits}`);
  }
});


test('the xref oracle rejects understated table counts', () => {
  const text = Buffer.from(buildTranscriptPdf({ title: 'Fixture', blocks: [] })).toString('latin1');
  const bad = text.replace(/xref\n0 \d+\n/, 'xref\n0 2\n');
  assert.notEqual(bad, text);
  assert.throws(() => verifyStructure(Buffer.from(bad, 'latin1')));
});

test('PDF page markers in document text do not inflate the page oracle', () => {
  const bytes = buildTranscriptPdf({ title: '/Type /Page marker', blocks: [{ text: '/Type /Page more text' }] });
  assert.equal(verifyStructure(bytes).pageCount, 1);
});

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

  const entryCount = Number(lines[1].split(' ')[1]);
  for (let id = 1; id < entryCount; id += 1) {
    const entry = lines[2 + id];
    if (entry.endsWith('f ')) continue;

    const offset = Number(entry.split(' ')[0]);
    assert.ok(
      text.startsWith(`${id} 0 obj`, offset),
      `xref entry ${id} points at object ${id}`,
    );
  }

  return {
    objectCount: entryCount - 1,
    pageCount: (text.match(/\/Type \/Page /g) ?? []).length,
  };
}

test('toWinAnsi transliterates typographic characters and drops unencodable ones', () => {
  assert.equal(toWinAnsi('“quoted” — it’s…'), '"quoted" -- it\'s...');
  assert.equal(toWinAnsi('café'), 'café');
  assert.equal(toWinAnsi('日本語'), '???');
  assert.equal(toWinAnsi('a​b'), 'ab');
});

test('wrapText never exceeds the line box', () => {
  const lines = wrapText('the quick brown fox jumps over the lazy dog '.repeat(6), 200, 11);
  assert.ok(lines.length > 1);
  for (const line of lines) {
    assert.ok(line.length < 60, `line stayed short: ${line.length}`);
  }
});

test('wrapText hard-splits a word longer than the line box', () => {
  const lines = wrapText('a'.repeat(400), 100, 11);
  assert.ok(lines.length > 1);
  assert.equal(lines.join(''), 'a'.repeat(400));
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
  assert.ok(text.includes('\\(') && text.includes('\\)') && text.includes('\\\\'));
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

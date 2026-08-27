import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatTimestamp,
  groupIntoParagraphs,
  parseCaptions,
  parseJson3,
  parseTimedTextXml,
  renderText,
} from '../src/lib/transcript.js';

test('parseJson3 flattens segment runs and drops empty cues', () => {
  const body = JSON.stringify({
    events: [
      { tStartMs: 0, dDurationMs: 1500, segs: [{ utf8: 'Hello' }, { utf8: ' world' }] },
      { tStartMs: 1500, dDurationMs: 500, segs: [{ utf8: '\n' }] },
      { tStartMs: 2000, dDurationMs: 1000, segs: [{ utf8: 'again' }] },
    ],
  });

  const segments = parseJson3(body);
  assert.equal(segments.length, 2);
  assert.deepEqual(segments[0], { start: 0, duration: 1.5, text: 'Hello world' });
  assert.equal(segments[1].start, 2);
});

test('parseJson3 returns nothing for the empty body YouTube sends when it blocks a request', () => {
  assert.deepEqual(parseJson3(''), []);
  assert.deepEqual(parseJson3('not json'), []);
});

test('parseTimedTextXml decodes double-escaped entities and strips inline tags', () => {
  const body =
    '<?xml version="1.0"?><transcript>' +
    '<text start="0.5" dur="2.25">it&amp;#39;s &amp;quot;fine&amp;quot;</text>' +
    '<text start="3" dur="1"> </text>' +
    '</transcript>';

  const segments = parseTimedTextXml(body);
  assert.equal(segments.length, 1);
  assert.deepEqual(segments[0], { start: 0.5, duration: 2.25, text: 'it\'s "fine"' });
});

test('parseCaptions dispatches on payload shape', () => {
  assert.equal(parseCaptions('{"events":[{"tStartMs":0,"segs":[{"utf8":"hi"}]}]}').length, 1);
  assert.equal(parseCaptions('<transcript><text start="0" dur="1">hi</text></transcript>').length, 1);
  assert.deepEqual(parseCaptions(''), []);
});

test('formatTimestamp switches to hours only when needed', () => {
  assert.equal(formatTimestamp(0), '0:00');
  assert.equal(formatTimestamp(61), '1:01');
  assert.equal(formatTimestamp(599), '9:59');
  assert.equal(formatTimestamp(3600), '1:00:00');
  assert.equal(formatTimestamp(3661), '1:01:01');
  assert.equal(formatTimestamp(-5), '0:00');
});

test('groupIntoParagraphs breaks on long silences', () => {
  const segments = [
    { start: 0, duration: 1, text: 'one' },
    { start: 1, duration: 1, text: 'two' },
    { start: 30, duration: 1, text: 'after a long pause' },
  ];

  const paragraphs = groupIntoParagraphs(segments);
  assert.equal(paragraphs.length, 2);
  assert.equal(paragraphs[0].text, 'one two');
  assert.equal(paragraphs[1].start, 30);
});

test('groupIntoParagraphs caps paragraph length', () => {
  const segments = Array.from({ length: 60 }, (_, index) => ({
    start: index,
    duration: 1,
    text: 'word'.repeat(5),
  }));

  const paragraphs = groupIntoParagraphs(segments, { maxChars: 100 });
  assert.ok(paragraphs.length > 1);
  assert.ok(paragraphs.every((paragraph) => paragraph.text.length < 200));
});

test('renderText honours the timestamp and paragraph options', () => {
  const segments = [
    { start: 0, duration: 1, text: 'one' },
    { start: 65, duration: 1, text: 'two' },
  ];

  assert.equal(renderText(segments, { timestamps: true, paragraphs: true }), '[0:00] one\n\n[1:05] two');
  assert.equal(renderText(segments, { timestamps: false, paragraphs: false }), 'one\n\ntwo');
});

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
  assert.ok(paragraphs.every((paragraph) => paragraph.text.length <= 100 + 20));
});

test('renderText honours the timestamp and paragraph options', () => {
  const segments = [
    { start: 0, duration: 1, text: 'one' },
    { start: 65, duration: 1, text: 'two' },
  ];

  assert.equal(renderText(segments, { timestamps: true, paragraphs: true }), '[0:00] one\n\n[1:05] two');
  assert.equal(renderText(segments, { timestamps: false, paragraphs: false }), 'one\n\ntwo');
});

test('malformed JSON timings stay finite and nonnegative', () => {
  const segments = parseJson3(JSON.stringify({ events: [
    { tStartMs: 'bad', dDurationMs: -100, segs: [{ utf8: 'fixture' }] },
    { tStartMs: -10, dDurationMs: 'Infinity', segs: [{ utf8: 'second' }] },
  ] }));
  assert.deepEqual(segments.map(({ start, duration }) => [start, duration]), [[0, 0], [0, 0]]);
  assert.equal(formatTimestamp(Infinity), '0:00');
});

test('escaped XML caption text remains literal while actual markup is stripped', () => {
  const segments = parseTimedTextXml('<transcript><text start="0" dur="1">Use &lt;T&gt; here; a &lt; b and c &gt; d <b>bold</b></text></transcript>');
  assert.equal(segments[0].text, 'Use <T> here; a < b and c > d bold');
});

test('unclosed XML cues have a bounded parsing cost', async () => {
  const { default: vm } = await import('node:vm');
  const result = vm.runInNewContext('parseTimedTextXml(body)', {
    parseTimedTextXml, body: '<text>'.repeat(30000),
  }, { timeout: 1000 });
  assert.deepEqual(result, []);
});


test('the paragraph option changes whether adjacent caption cues merge', () => {
  const segments = [
    { start: 0, duration: 1, text: 'one' },
    { start: 1, duration: 1, text: 'two' },
  ];
  assert.equal(renderText(segments, { timestamps: false, paragraphs: true }), 'one two');
  assert.equal(renderText(segments, { timestamps: false, paragraphs: false }), 'one\n\ntwo');
});


test('empty self-closing XML cues do not steal the next cue timestamp', () => {
  assert.deepEqual(parseTimedTextXml('<transcript><text start="0"/><text start="5">ok</text></transcript>'),
    [{ start: 5, duration: 0, text: 'ok' }]);
});


test('malformed JSON field objects cannot throw during text or timing coercion', () => {
  const body = JSON.stringify({ events: [
    { segs: [{ utf8: { toString: null } }] },
    { tStartMs: { toString: null }, dDurationMs: { toString: null }, segs: [{ utf8: 'Valid text' }] },
  ] });
  assert.deepEqual(parseJson3(body), [{ start: 0, duration: 0, text: 'Valid text' }]);
});

test('XML timing attributes support both quotes and exact attribute names', () => {
  assert.deepEqual(parseTimedTextXml("<text data-start='99' start='12' dur='2'>A</text>"),
    [{ start: 12, duration: 2, text: 'A' }]);
});

test('legacy XML decodes valid character references and retains invalid or deliberately escaped ones', () => {
  const body = '<text>&apos; &#65; &#x1F600; &#0; &#xD800; &#x110000; &amp;amp;#65;</text>';
  assert.equal(parseTimedTextXml(body)[0].text, "' A 😀 &#0; &#xD800; &#x110000; &#65;");
});

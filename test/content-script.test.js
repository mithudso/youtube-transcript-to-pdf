import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/content/scrape-transcript.js', import.meta.url), 'utf8');
function leaf(text) { return { textContent: text, children: [], getAttribute: () => null }; }
function row({ timestamp = '0:05', caption = 'Hello', named = false, emptyAttributed = false, durationLabel = null, durationAfter = false, hidden = false } = {}) {
  const stamp = leaf(timestamp);
  const text = leaf(caption);
  const attributed = emptyAttributed ? leaf('') : null;
  return {
    getClientRects: () => hidden ? [] : [{}],
    querySelector: (selector) => selector === '.segment-timestamp' ? (named ? stamp : null)
      : selector === '.segment-text' ? (named ? text : null) : attributed,
    querySelectorAll: () => [stamp, ...(durationLabel && !durationAfter ? [leaf(durationLabel)] : []), ...(attributed ? [attributed] : []), text, ...(durationLabel && durationAfter ? [leaf(durationLabel)] : [])],
  };
}
async function scrape(rows) {
  const warnings = [];
  let clicks = 0;
  let now = 0;
  const button = { textContent: 'Show transcript', getAttribute: () => '', click: () => { clicks += 1; } };
  const document = {
    querySelector: (selector) => selector.includes('transcript-segment') ? rows[0] : null,
    querySelectorAll: (selector) => selector.includes('transcript-segment') ? rows
      : selector === 'button, tp-yt-paper-button' ? [button] : [],
  };
  const result = await vm.runInNewContext(source, {
    document, getComputedStyle: () => ({ visibility: 'visible' }), Date: { now: () => now },
    setTimeout: (fn, ms) => { now += ms; queueMicrotask(fn); },
    console: { warn: (...args) => warnings.push(args) },
  });
  return { result: JSON.parse(JSON.stringify(result)), warnings, clicks };
}

test('blank attributed spans do not suppress real caption text', async () => {
  assert.deepEqual((await scrape([row({ emptyAttributed: true })])).result,
    [{ start: 5, duration: 0, text: 'Hello' }]);
});

test('identified metadata-shaped captions survive extraction', async () => {
  for (const caption of ['2 seconds', '1:23']) {
    const { result } = await scrape([row({ caption, named: caption === '1:23' })]);
    assert.equal(result.length, 1);
    assert.equal(result[0].text, caption);
    assert.equal(result[0].start, 5);
  }
});

test('invalid timestamps are reported and never fabricated as zero', async () => {
  const { result, warnings } = await scrape([row({ timestamp: 'invalid', named: true }), row({ timestamp: '0:00', named: true })]);
  assert.deepEqual(result, [{ start: 0, duration: 0, text: 'Hello' }]);
  assert.equal(warnings.length, 1);
  assert.doesNotMatch(JSON.stringify(warnings), /Hello/);
});

test('exhausted panel-open attempts emit one terminal warning', async () => {
  const { result, warnings, clicks } = await scrape([]);
  assert.deepEqual(result, []);
  assert.equal(clicks, 2);
  assert.equal(warnings.length, 1);
  assert.match(JSON.stringify(warnings), /timeout/);
});

test('duration labels do not replace identified captions', async () => {
  for (const caption of ['Hello', '2 seconds', '1:23']) {
    const { result } = await scrape([row({ caption, durationLabel: '5 seconds', named: caption !== 'Hello' })]);
    assert.equal(result[0].text, caption);
  }
});


test('hidden transcript rows cannot contaminate the current transcript', async () => {
  const { result } = await scrape([row({ caption: 'Stale', timestamp: '0:00', hidden: true }), row({ caption: 'Current', timestamp: '0:10' })]);
  assert.deepEqual(result, [{ start: 10, duration: 0, text: 'Current' }]);
});

test('ambiguous structural metadata is reported instead of exported as caption text', async () => {
  for (const durationAfter of [false, true]) {
    const { result, warnings } = await scrape([row({ caption: '1:23', durationLabel: '5 seconds', durationAfter })]);
    assert.deepEqual(result, []);
    assert.match(JSON.stringify(warnings), /ambiguous/);
  }
});


test('an expanded panel waits for delayed cues without clicking it shut', async () => {
  let now = 0, clicks = 0;
  const cues = () => now >= 9000 ? [row({ named: true })] : [];
  const panel = { getAttribute: (key) => key === 'target-id' ? 'transcript' : 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED' };
  const button = { textContent: 'Show transcript', getAttribute: () => '', click: () => { clicks += 1; } };
  const warnings = [];
  const document = {
    querySelector: () => cues()[0] ?? null,
    querySelectorAll: (selector) => selector === 'button, tp-yt-paper-button' ? [button]
      : selector === 'ytd-engagement-panel-section-list-renderer' ? [panel] : cues(),
  };
  const result = await vm.runInNewContext(source, {
    document, getComputedStyle: () => ({ visibility: 'visible' }), Date: { now: () => now },
    setTimeout: (fn, ms) => { now += ms; queueMicrotask(fn); },
    console: { warn: (...args) => warnings.push(args) },
  });
  assert.equal(clicks, 1);
  assert.equal(result.length, 1);
  assert.deepEqual(warnings, []);
});


test('a recognized timestamp-shaped caption cannot be mistaken for cue timing', async () => {
  const caption = leaf('1:23'), stamp = leaf('0:10');
  const cue = {
    getClientRects: () => [{}],
    querySelector: (selector) => selector.includes('AttributedString') ? caption : null,
    querySelectorAll: () => [caption, stamp],
  };
  const { result } = await scrape([cue]);
  assert.deepEqual(result, [{ start: 10, duration: 0, text: '1:23' }]);
});

test('structural fallback reads all fragments in an identified caption container', async () => {
  const stamp = leaf('0:10'), first = leaf('Hello'), last = leaf('world!');
  const group = { textContent: 'Hello world!', children: [first, last], contains: (node) => [first, last].includes(node) };
  const cue = {
    getClientRects: () => [{}],
    querySelector: (selector) => selector === '.segment-timestamp' ? stamp : null,
    querySelectorAll: () => [stamp, group, first, last],
  };
  first.parentElement = group; last.parentElement = group; group.parentElement = cue;
  const { result } = await scrape([cue]);
  assert.deepEqual(result, [{ start: 10, duration: 0, text: 'Hello world!' }]);
});

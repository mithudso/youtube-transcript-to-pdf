import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspect } from 'node:util';
import { setImmediate as nextTurn } from 'node:timers/promises';

const videoId = 'abcdefghijk';
const track = { baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`, languageCode: 'en', name: { simpleText: 'English' } };
const watchPage = (tracks = [track]) => `var ytInitialPlayerResponse = ${JSON.stringify({
  videoDetails: { title: 'Fixture', author: 'Fixture author' },
  captions: { playerCaptionsTracklistRenderer: { captionTracks: tracks } },
  playabilityStatus: { status: 'OK' },
})};`;
const captions = JSON.stringify({ events: [{ tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: 'Fixture caption' }] }] });
let instance = 0;
const formatLogArguments = (args) => inspect(args, { depth: null, maxStringLength: null, maxArrayLength: null });

async function worker(t, { fetchImpl, tabs = {}, executeScript } = {}) {
  const previousChrome = globalThis.chrome;
  t.after(() => { if (previousChrome === undefined) delete globalThis.chrome; else globalThis.chrome = previousChrome; });
  const logs = [];
  for (const level of ['info', 'warn', 'error']) t.mock.method(console, level, (...args) => logs.push({ level, args }));
  let listener;
  const removed = [];
  globalThis.chrome = {
    runtime: { id: 'fixture', getURL: (path) => `chrome-extension://fixture/${path}`, onMessage: { addListener: (fn) => { listener = fn; } } },
    tabs: {
      query: async () => [{ id: 7, url: `https://www.youtube.com/watch?v=${videoId}`, status: 'complete' }],
      remove: async (id) => { removed.push(id); },
      onUpdated: { addListener() {}, removeListener() {} },
      get: async () => ({ status: 'complete', url: `https://www.youtube.com/watch?v=${videoId}` }),
      ...tabs,
    },
    scripting: { executeScript: executeScript ?? (async () => [{ result: [{ start: 2, duration: 1, text: 'Panel fixture' }] }]) },
  };
  t.mock.method(globalThis, 'fetch', fetchImpl ?? (async (url) => ({
    ok: true, status: 200, text: async () => url.includes('/watch?') ? watchPage() : captions,
  })));
  await import(`../src/background/service-worker.js?test=${++instance}`);
  return {
    logs, removed,
    request: (language = 'auto') => new Promise((resolve) => {
      assert.equal(listener({ type: 'FETCH_TRANSCRIPT', url: videoId, language },
        { id: 'fixture', url: 'chrome-extension://fixture/src/popup/popup.html' }, resolve), true);
    }),
  };
}

test('service worker returns direct captions through the actual message listener', async (t) => {
  const w = await worker(t);
  const response = await w.request();
  assert.equal(response.ok, true);
  assert.equal(response.data.source, 'timedtext');
  assert.equal(response.data.language, 'en');
  assert.equal(response.data.segments[0].text, 'Fixture caption');
  assert.deepEqual(w.removed, []);
});

test('request timeout covers the response body and reports timeout', async (t) => {
  const timers = new Map();
  let timerId = 0;
  t.mock.method(globalThis, 'setTimeout', (fn) => { timers.set(++timerId, fn); return timerId; });
  t.mock.method(globalThis, 'clearTimeout', (id) => timers.delete(id));
  const w = await worker(t, { fetchImpl: async (_url, { signal }) => ({
    ok: true, status: 200,
    text: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => {
      reject(new DOMException('aborted', 'AbortError'));
    }, { once: true })),
  }) });
  const pending = w.request();
  await nextTurn();
  assert.equal(timers.size, 1, 'body read keeps the abort timer active');
  [...timers.values()][0]();
  const response = await pending;
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'timeout');
  assert.equal(timers.size, 0);
});

test('caption failures log stable outcomes without signed URLs', async (t) => {
  const secret = 'PRIVATE_SIGNATURE';
  const w = await worker(t, { fetchImpl: async (url) => {
    if (url.includes('/watch?')) return { ok: true, status: 200, text: async () => watchPage() };
    throw Error(`Failed https://www.youtube.com/api/timedtext?sig=${secret}`);
  } });
  assert.equal((await w.request()).ok, true);
  assert.ok(w.logs.some(({ level }) => level === 'warn'));
  const output = formatLogArguments(w.logs.flatMap(({ args }) => args));
  assert.doesNotMatch(output, new RegExp(secret));
});

test('panel fallback never labels an unverified language as the selected track', async (t) => {
  const w = await worker(t, { fetchImpl: async (url) => ({
    ok: true, status: 200, text: async () => url.includes('/watch?') ? watchPage() : '',
  }) });
  const response = await w.request();
  assert.equal(response.ok, true);
  assert.equal(response.data.source, 'panel');
  assert.equal(response.data.language, 'unknown');
  assert.deepEqual(w.removed, [], 'panel fallback preserves existing user tabs');
  const selected = await w.request('en');
  assert.equal(selected.ok, false);
  assert.equal(selected.error.code, 'language-unavailable');
});

test('overlapping requests do not borrow and close each other\'s temporary tabs', async (t) => {
  const opened = [];
  const injections = [];
  const w = await worker(t, {
    fetchImpl: async (url) => ({ ok: true, status: 200, text: async () => url.includes('/watch?') ? watchPage() : '' }),
    tabs: {
      query: async () => [...opened],
      create: async ({ url }) => { const tab = { id: opened.length + 1, url, status: 'complete' }; opened.push(tab); return tab; },
    },
    executeScript: ({ target }) => new Promise((resolve) => injections.push({ tabId: target.tabId, resolve })),
  });
  const first = w.request();
  for (let i = 0; i < 10 && injections.length < 1; i += 1) await nextTurn();
  const second = w.request();
  for (let i = 0; i < 10 && injections.length < 2; i += 1) await nextTurn();
  assert.equal(injections.length, 2);
  assert.notEqual(injections[0].tabId, injections[1].tabId);
  for (const injection of injections) injection.resolve([{ result: [{ start: 0, duration: 1, text: 'fixture' }] }]);
  assert.equal((await first).ok, true);
  assert.equal((await second).ok, true);
  assert.deepEqual(w.removed.sort(), [1, 2]);
});

test('an unreadable anonymous watch page still tries a usable transcript panel', async (t) => {
  const w = await worker(t, { fetchImpl: async () => ({ ok: true, status: 200, text: async () => '<html>Consent fixture</html>' }) });
  const response = await w.request();
  assert.equal(response.ok, true);
  assert.equal(response.data.source, 'panel');
  assert.equal(response.data.language, 'unknown');
});

test('temporary-tab cleanup errors are logged without losing the transcript', async (t) => {
  const w = await worker(t, {
    fetchImpl: async (url) => ({ ok: true, status: 200, text: async () => url.includes('/watch?') ? watchPage() : '' }),
    tabs: { query: async () => [], create: async () => ({ id: 8 }), remove: async () => { throw Error('remove failed'); } },
  });
  assert.equal((await w.request()).ok, true);
  assert.ok(w.logs.some(({ level, args }) => level === 'warn' && /cleanup|remove/i.test(JSON.stringify(args))));
});

test('page-supplied caption URLs cannot send requests outside permitted YouTube hosts', async (t) => {
  const contacted = [];
  const w = await worker(t, { fetchImpl: async (url) => {
    contacted.push(url);
    return { ok: true, status: 200, text: async () => watchPage([{ ...track, baseUrl: 'https://outside.invalid/caption?sig=fixture' }]) };
  } });
  assert.equal((await w.request()).ok, true);
  assert.equal(contacted.length, 1);
  assert.ok(contacted.every((url) => url.startsWith('https://www.youtube.com/')));
});


test('navigation during panel extraction never labels another video as the requested one', async (t) => {
  let reads = 0;
  const w = await worker(t, {
    fetchImpl: async (url) => ({ ok: true, status: 200, text: async () => url.includes('/watch?') ? watchPage() : '' }),
    tabs: { get: async () => ({ status: 'complete', url: `https://www.youtube.com/watch?v=${++reads === 1 ? videoId : 'zyxwvutsrqp'}` }) },
    executeScript: async () => [{ result: [{ start: 0, duration: 1, text: 'Other video' }] }],
  });
  const response = await w.request();
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'panel-navigation');
  assert.match(JSON.stringify(w.logs), /panel-navigation/);
  assert.doesNotMatch(JSON.stringify(response), /Other video/);
  assert.deepEqual(w.removed, []);
});


test('incomplete parsed caption metadata does not suppress a usable panel', async (t) => {
  const w = await worker(t, { fetchImpl: async () => ({ ok: true, status: 200, text: async () => 'var ytInitialPlayerResponse = {};' }) });
  const response = await w.request();
  assert.equal(response.ok, true);
  assert.equal(response.data.source, 'panel');
  assert.equal(response.data.segments[0].text, 'Panel fixture');
});


test('the privacy log oracle preserves nested Error messages', () => {
  assert.match(formatLogArguments([{ error: Error('PRIVATE_SIGNATURE') }]), /PRIVATE_SIGNATURE/);
});

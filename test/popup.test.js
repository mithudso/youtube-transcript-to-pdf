import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';

class Element {
  children = [];
  listeners = new Map();
  dataset = {};
  value = '';
  checked = true;
  disabled = false;
  hidden = true;
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return (this.text ?? '') + this.children.map((child) => child.textContent ?? '').join(''); }
  append(...children) { this.children.push(...children); }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  focus() {}
  select() {}
}
const transcript = {
  videoId: 'abcdefghijk', title: 'Fixture', author: 'Fixture author', language: 'en', isGenerated: false,
  availableLanguages: [{ code: 'en', name: 'English', isGenerated: false }],
  segments: [{ start: 0, duration: 1, text: 'Synthetic caption' }],
};
let instance = 0;
async function popup(t, { getOptions = async () => ({}), queryTabs = async () => [] } = {}) {
  const previous = Object.getOwnPropertyDescriptors(globalThis);
  t.after(() => { for (const key of ['chrome', 'document', 'window', 'navigator']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key];
  } });
  const elements = new Map();
  const get = (id) => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  get('url').value = transcript.videoId;
  get('language').value = 'auto';
  globalThis.document = { getElementById: get, createElement: () => new Element() };
  globalThis.window = { close() {} };
  const session = {};
  const urls = [];
  const revoked = [];
  const downloadListeners = new Set();
  t.mock.method(URL, 'createObjectURL', () => 'blob:fixture');
  t.mock.method(URL, 'revokeObjectURL', (url) => revoked.push(url));
  globalThis.chrome = {
    runtime: { getURL: (path) => `chrome-extension://fixture/${path}`, sendMessage: async () => ({ ok: true, data: transcript }) },
    storage: {
      local: { get: getOptions, set: async () => {} },
      session: { set: async (values) => Object.assign(session, values), remove: async (key) => { delete session[key]; } },
    },
    tabs: { query: queryTabs, create: async ({ url }) => { urls.push(url); return { id: urls.length }; } },
    downloads: {
      download: async () => 1,
      search: async () => [{ id: 1, state: 'complete' }],
      onChanged: { addListener: (fn) => downloadListeners.add(fn), removeListener: (fn) => downloadListeners.delete(fn) },
    },
  };
  await import(`../src/popup/popup.js?test=${++instance}`);
  await nextTurn();
  return {
    get, session, urls, revoked, downloadListeners,
    submit: () => get('fetch-form').listeners.get('submit')({ preventDefault() {} }),
    click: (id) => get(id).listeners.get('click')(),
  };
}

test('a rejected refetch removes the previous transcript and export actions', async (t) => {
  const p = await popup(t);
  await p.submit();
  assert.equal(p.get('result').hidden, false);
  chrome.runtime.sendMessage = async () => { throw Error('port closed'); };
  await p.submit();
  assert.equal(p.get('result').hidden, true);
  assert.match(p.get('status').textContent, /port closed/);
  await p.click('download');
  assert.deepEqual(p.revoked, []);
});

test('an older response cannot replace the latest transcript', async (t) => {
  const p = await popup(t);
  const replies = [];
  chrome.runtime.sendMessage = () => new Promise((resolve) => replies.push(resolve));
  const first = p.submit();
  const second = p.submit();
  replies[1]({ ok: true, data: { ...transcript, title: 'Latest' } });
  await second;
  replies[0]({ ok: true, data: { ...transcript, title: 'Old' } });
  await first;
  assert.equal(p.get('video-title').textContent, 'Latest');
});

test('Print failures report an error and discard the unused handoff', async (t) => {
  const p = await popup(t);
  await p.submit();
  chrome.tabs.create = async () => { throw Error('tab refused'); };
  await assert.doesNotReject(() => p.click('print'));
  assert.match(p.get('status').textContent, /tab refused/);
  assert.deepEqual(p.session, {});
});

test('separate Print actions use separate payload keys', async (t) => {
  const p = await popup(t);
  await p.submit();
  await p.click('print');
  await p.click('print');
  assert.equal(Object.keys(p.session).length, 2);
  assert.notEqual(p.urls[0], p.urls[1]);
});

test('already-completed downloads release their blob and event listener', async (t) => {
  const p = await popup(t);
  await p.submit();
  await p.click('download');
  assert.deepEqual(p.revoked, ['blob:fixture']);
  assert.equal(p.downloadListeners.size, 0);
});

test('preference-write failures surface in the popup', async (t) => {
  const p = await popup(t);
  chrome.storage.local.set = async () => { throw Error('storage refused'); };
  await assert.doesNotReject(() => p.get('timestamps').listeners.get('change')());
  assert.match(p.get('status').textContent, /storage refused/);
});

test('interrupted downloads replace the initiation message with a failure', async (t) => {
  const p = await popup(t);
  const logs = [];
  t.mock.method(console, 'warn', (...args) => logs.push(args));
  chrome.downloads.search = async () => [{ id: 1, state: 'in_progress' }];
  await p.submit();
  await p.click('download');
  assert.doesNotMatch(p.get('status').textContent, /Saved/);
  for (const listener of [...p.downloadListeners]) listener({ id: 1, state: { current: 'interrupted' } });
  assert.match(p.get('status').textContent, /interrupted/);
  assert.equal(p.get('status').dataset.tone, 'error');
  assert.deepEqual(p.revoked, ['blob:fixture']);
  assert.equal(p.downloadListeners.size, 0);
  assert.match(JSON.stringify(logs), /download-interrupted/);
});


test('late stored preferences cannot overwrite a user choice or mismatch the preview', async (t) => {
  let restore;
  const p = await popup(t, { getOptions: () => new Promise((resolve) => { restore = resolve; }) });
  p.get('timestamps').checked = false;
  await p.get('timestamps').listeners.get('change')();
  await p.submit();
  const preview = p.get('preview').textContent;
  restore({ formatOptions: { timestamps: true, paragraphs: true } });
  await nextTurn();
  assert.equal(p.get('timestamps').checked, false);
  assert.equal(p.get('preview').textContent, preview);
  await p.click('print');
  const payloads = Object.values(p.session);
  assert.equal(payloads.length, 1);
  assert.ok(payloads[0].blocks.length > 0);
  assert.ok(payloads[0].blocks.every((block) => !block.timestamp));
});

test('late tab detection cannot replace typed input or an active fetch status', async (t) => {
  let detected, reply;
  const p = await popup(t, { queryTabs: () => new Promise((resolve) => { detected = resolve; }) });
  p.get('url').value = 'zyxwvutsrqp';
  p.get('url').listeners.get('input')?.();
  chrome.runtime.sendMessage = () => new Promise((resolve) => { reply = resolve; });
  const pending = p.submit();
  const status = p.get('status').textContent;
  detected([{ url: 'https://www.youtube.com/watch?v=abcdefghijk' }]);
  await nextTurn();
  assert.equal(p.get('url').value, 'zyxwvutsrqp');
  assert.equal(p.get('status').textContent, status);
  reply({ ok: true, data: transcript });
  await pending;
});


for (const operation of ['transcript-fetch', 'pdf-download', 'print-handoff', 'clipboard', 'preferences']) {
  test(`failed ${operation} emits one sanitized diagnostic alongside its UI error`, async (t) => {
    const p = await popup(t);
    const logs = [];
    t.mock.method(console, 'warn', (...args) => logs.push(args));
    const reject = async () => { throw Error('PRIVATE_FIXTURE_TOKEN'); };
    let invoke;
    if (operation === 'transcript-fetch') {
      chrome.runtime.sendMessage = reject; invoke = p.submit;
    } else {
      await p.submit();
      if (operation === 'pdf-download') { chrome.downloads.download = reject; invoke = () => p.click('download'); }
      if (operation === 'print-handoff') { chrome.tabs.create = reject; invoke = () => p.click('print'); }
      if (operation === 'clipboard') {
        Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: reject } } });
        invoke = () => p.click('copy');
      }
      if (operation === 'preferences') { chrome.storage.local.set = reject; invoke = () => p.get('timestamps').listeners.get('change')(); }
    }
    await invoke();
    assert.match(p.get('status').textContent, /PRIVATE_FIXTURE_TOKEN/);
    assert.equal(logs.length, 1);
    assert.equal(logs[0][1].operation, operation);
    assert.equal(typeof logs[0][1].code, 'string');
    assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_FIXTURE_TOKEN|Synthetic caption|Fixture author/);
  });
}


test('late tab detection preserves typed input before a request is submitted', async (t) => {
  let detected;
  const p = await popup(t, { queryTabs: () => new Promise((resolve) => { detected = resolve; }) });
  p.get('url').value = 'zyxwvutsrqp';
  p.get('url').listeners.get('input')?.();
  detected([{ url: 'https://www.youtube.com/watch?v=abcdefghijk' }]);
  await nextTurn();
  assert.equal(p.get('url').value, 'zyxwvutsrqp');
});

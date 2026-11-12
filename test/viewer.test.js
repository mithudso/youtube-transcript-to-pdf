import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/viewer/viewer.js', import.meta.url), 'utf8');
const payload = { title: 'Fixture', subtitleLines: ['Synthetic'], blocks: [{ text: 'First fixture caption' }] };
function element() {
  return { children: [], ownText: '',
    get textContent() { return this.ownText + this.children.map((node) => node.textContent).join(''); },
    set textContent(value) { this.ownText = String(value ?? ''); this.children = []; },
    append(...children) { this.children.push(...children); }, listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } };
}
async function view({ search = '', values = {}, getError = false, removeError = false, getImpl, onPending } = {}) {
  const container = element();
  const printButton = element();
  let prints = 0;
  const removed = [];
  const warnings = [];
  const chrome = { storage: { session: {
    get: getImpl ?? (async (key) => { if (getError) throw Error('fixture get failed'); return { [key]: values[key] }; }),
    remove: async (key) => { removed.push(key); if (removeError) throw Error('fixture remove failed'); },
  } } };
  const document = { getElementById: (id) => id === 'print' ? printButton : id === 'document' ? container : null, createElement: element, createDocumentFragment: element };
  const loaded = vm.runInNewContext(source, {
    chrome, location: { search }, URLSearchParams,
    document,
    window: { print() { prints += 1; } }, console: { warn: (...args) => warnings.push(args) },
  });
  if (onPending) await onPending({ printButton, printCount: () => prints });
  await loaded;
  const text = (node) => node.textContent;
  return { text: text(container), removed, warnings, printButton, document, printCount: () => prints };
}

test('viewer consumes only its own Print payload', async () => {
  const result = await view({ search: '?payload=viewerPayload%3Afirst', values: { 'viewerPayload:first': payload, 'viewerPayload:other': { ...payload, title: 'Other' } } });
  assert.match(result.text, /First fixture caption/);
  assert.deepEqual(result.removed, ['viewerPayload:first']);
  assert.doesNotMatch(result.text, /Other/);
});

test('viewer storage-read failures produce a useful page message', async () => {
  const result = await view({ getError: true });
  assert.match(result.text, /could not|unable|failed/i);
  assert.equal(result.warnings.length, 1);
});

test('viewer renders before reporting failed payload cleanup', async () => {
  const result = await view({ values: { viewerPayload: payload }, removeError: true });
  assert.match(result.text, /First fixture caption/);
  assert.equal(result.warnings.length, 1);
  assert.doesNotMatch(JSON.stringify(result.warnings), /First fixture caption/);
});


test('viewer cannot print until storage retrieval and rendering complete', async () => {
  let restore;
  const result = await view({
    getImpl: () => new Promise((resolve) => { restore = resolve; }),
    onPending: async ({ printButton, printCount }) => {
      printButton.listeners.click();
      assert.equal(printCount(), 0);
      assert.equal(printButton.disabled, true);
      restore({ viewerPayload: payload });
    },
  });
  assert.match(result.text, /First fixture caption/);
  assert.equal(result.printButton.disabled, false);
  result.printButton.listeners.click();
  assert.equal(result.printCount(), 1);
});


test('the viewer DOM fixture replaces descendants when textContent is assigned', () => {
  const node = element();
  const child = element();
  child.textContent = 'Old caption';
  node.append(child);
  node.textContent = 'Replacement';
  assert.equal(node.children.length, 0);
  assert.equal(node.textContent, 'Replacement');
});


test('the viewer DOM fixture returns null for an unknown element ID', async () => {
  const result = await view();
  assert.equal(result.document.getElementById('missing'), null);
});

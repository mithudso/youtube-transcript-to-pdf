/**
 * Printable transcript viewer.
 *
 * Reads the payload the popup stashed in session storage and renders it with
 * the browser's own text engine, so scripts the built-in Latin-1 PDF writer
 * cannot encode (CJK, Cyrillic, Arabic, …) still export cleanly through
 * Chrome's "Save as PDF".
 */

/** Must match the key the popup writes. */
const VIEWER_KEY = 'viewerPayload';

const container = document.getElementById('document');

/**
 * Renders the transcript into the page.
 *
 * @param {{title: string, subtitleLines: string[], blocks: Array<{timestamp: string|null, text: string}>}} payload
 */
function render(payload) {
  document.title = payload.title;

  const heading = document.createElement('h1');
  heading.textContent = payload.title;
  container.append(heading);

  for (const line of payload.subtitleLines ?? []) {
    const subtitle = document.createElement('p');
    subtitle.className = 'subtitle';
    subtitle.textContent = line;
    container.append(subtitle);
  }

  const fragment = document.createDocumentFragment();
  for (const block of payload.blocks ?? []) {
    const wrapper = document.createElement('div');
    wrapper.className = 'block';

    if (block.timestamp) {
      const stamp = document.createElement('span');
      stamp.className = 'timestamp';
      stamp.textContent = block.timestamp;
      wrapper.append(stamp);
    }

    const paragraph = document.createElement('p');
    paragraph.textContent = block.text;
    wrapper.append(paragraph);
    fragment.append(wrapper);
  }
  container.append(fragment);
}

const printButton = document.getElementById('print');
let ready = false;
printButton.disabled = true;
printButton.addEventListener('click', () => { if (ready) window.print(); });

(async () => {
  const requested = new URLSearchParams(location.search).get('payload');
  const key = requested ?? VIEWER_KEY;
  if (key !== VIEWER_KEY && !key.startsWith(`${VIEWER_KEY}:`)) {
    throw new Error('Invalid print handoff.');
  }
  const stored = await chrome.storage.session.get(key);
  const payload = stored[key];
  if (!payload) {
    const message = document.createElement('p');
    message.textContent = 'No transcript to show. Fetch one from the extension popup first.';
    container.append(message);
    return;
  }
  try {
    render(payload);
    ready = true;
    printButton.disabled = false;
  } finally {
    // Render first so a cleanup error cannot hide an otherwise usable transcript.
    await chrome.storage.session.remove(key);
  }
})().catch(() => {
  console.warn('Viewer handoff failed:', { code: 'viewer-storage' });
  const message = document.createElement('p');
  message.textContent = 'Could not open or clear the temporary transcript. Try Print again, or close the browser to clear session storage.';
  container.append(message);
});

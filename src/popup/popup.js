/**
 * Popup controller.
 *
 * Holds the fetched transcript in memory for the life of the popup, re-renders
 * the preview when formatting options change, and builds the PDF locally so no
 * transcript data ever leaves the machine.
 */

import { parseVideoId, watchUrl } from '../lib/youtube.js';
import { formatTimestamp, groupIntoParagraphs, renderText } from '../lib/transcript.js';
import { buildTranscriptPdf, toSafeFilename } from '../lib/pdf.js';

/** Key under which the last-used formatting options are remembered. */
const OPTIONS_KEY = 'formatOptions';

/** Key used to hand the transcript to the printable viewer page. */
const VIEWER_KEY = 'viewerPayload';

const elements = {
  form: document.getElementById('fetch-form'),
  url: document.getElementById('url'),
  fetch: document.getElementById('fetch'),
  language: document.getElementById('language'),
  timestamps: document.getElementById('timestamps'),
  paragraphs: document.getElementById('paragraphs'),
  status: document.getElementById('status'),
  result: document.getElementById('result'),
  videoTitle: document.getElementById('video-title'),
  videoMeta: document.getElementById('video-meta'),
  preview: document.getElementById('preview'),
  download: document.getElementById('download'),
  print: document.getElementById('print'),
  copy: document.getElementById('copy'),
};

/** @type {{videoId: string, title: string, author: string|null, language: string, isGenerated: boolean, availableLanguages: Array<{code: string, name: string, isGenerated: boolean}>, segments: Array<{start: number, duration: number, text: string}>}|null} */
let transcript = null;

/**
 * Shows a message under the form.
 *
 * @param {string} message
 * @param {'info'|'error'} [tone='info']
 */
function setStatus(message, tone = 'info') {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

/** @returns {{timestamps: boolean, paragraphs: boolean}} */
function currentOptions() {
  return {
    timestamps: elements.timestamps.checked,
    paragraphs: elements.paragraphs.checked,
  };
}

/** Re-renders the preview from the transcript already in memory. */
function renderPreview() {
  if (!transcript) return;
  elements.preview.textContent = renderText(transcript.segments, currentOptions());
}

/**
 * Fills the language picker from the tracks the video actually offers.
 *
 * @param {Array<{code: string, name: string, isGenerated: boolean}>} languages
 * @param {string} selected
 */
function renderLanguages(languages, selected) {
  elements.language.textContent = '';

  const auto = document.createElement('option');
  auto.value = 'auto';
  auto.textContent = 'Auto';
  elements.language.append(auto);

  for (const language of languages) {
    const option = document.createElement('option');
    option.value = language.code;
    option.textContent = language.isGenerated ? `${language.name} (auto)` : language.name;
    option.selected = language.code === selected;
    elements.language.append(option);
  }

  elements.language.disabled = languages.length === 0;
}

/**
 * Turns the transcript into the block list the PDF and viewer both consume.
 *
 * @returns {Array<{timestamp: string|null, text: string}>}
 */
function toBlocks() {
  const { timestamps, paragraphs } = currentOptions();
  const blocks = paragraphs
    ? groupIntoParagraphs(transcript.segments)
    : transcript.segments.map((segment) => ({ start: segment.start, text: segment.text }));

  return blocks.map((block) => ({
    timestamp: timestamps ? `[${formatTimestamp(block.start)}]` : null,
    text: block.text,
  }));
}

/** @returns {string[]} The grey lines printed under the PDF title. */
function subtitleLines() {
  const lines = [];
  if (transcript.author) lines.push(transcript.author);
  lines.push(watchUrl(transcript.videoId));
  lines.push(
    `Language: ${transcript.language}${transcript.isGenerated ? ' (auto-generated)' : ''} · ` +
      `${transcript.segments.length} caption lines`,
  );
  return lines;
}

/** Requests the transcript from the service worker and renders it. */
async function handleFetch(event) {
  event.preventDefault();

  const input = elements.url.value.trim();
  if (!parseVideoId(input)) {
    setStatus('Enter a YouTube video URL or an 11-character video ID.', 'error');
    return;
  }

  elements.fetch.disabled = true;
  setStatus('Fetching transcript…');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_TRANSCRIPT',
      url: input,
      language: elements.language.value,
    });

    if (!response?.ok) {
      transcript = null;
      elements.result.hidden = true;
      setStatus(response?.error?.message ?? 'Could not fetch that transcript.', 'error');
      return;
    }

    transcript = response.data;
    elements.videoTitle.textContent = transcript.title;
    elements.videoMeta.textContent = [
      transcript.author,
      `${transcript.segments.length} lines`,
      transcript.isGenerated ? 'auto-generated captions' : null,
      transcript.source === 'panel' ? 'read from transcript panel' : null,
    ]
      .filter(Boolean)
      .join(' · ');

    renderLanguages(transcript.availableLanguages, transcript.language);
    renderPreview();
    elements.result.hidden = false;
    setStatus('');
  } catch (error) {
    setStatus(`Extension error: ${error.message}`, 'error');
  } finally {
    elements.fetch.disabled = false;
  }
}

/**
 * Releases a blob URL once its download has finished.
 *
 * A blob URL minted in the popup dies with the popup's document, so the
 * download must start while the popup is still open — hence `saveAs: false`,
 * which begins the write immediately instead of waiting on a save dialog the
 * user might leave open long enough for the popup to close.
 *
 * @param {string} objectUrl
 * @param {number} downloadId
 */
function revokeWhenComplete(objectUrl, downloadId) {
  /**
   * @param {chrome.downloads.DownloadDelta} delta
   */
  const onChanged = (delta) => {
    if (delta.id !== downloadId) return;
    if (delta.state?.current !== 'complete' && delta.state?.current !== 'interrupted') return;

    chrome.downloads.onChanged.removeListener(onChanged);
    URL.revokeObjectURL(objectUrl);
  };

  chrome.downloads.onChanged.addListener(onChanged);
}

/** Builds the PDF in-page and hands the bytes to chrome.downloads. */
async function handleDownload() {
  if (!transcript) return;

  elements.download.disabled = true;
  setStatus('Building PDF…');

  let objectUrl = null;
  try {
    const bytes = buildTranscriptPdf({
      title: transcript.title,
      subtitleLines: subtitleLines(),
      blocks: toBlocks(),
    });

    const filename = toSafeFilename(transcript.title);
    objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));

    const downloadId = await chrome.downloads.download({
      url: objectUrl,
      filename,
      saveAs: false,
    });

    revokeWhenComplete(objectUrl, downloadId);
    objectUrl = null;
    setStatus(`Saved ${filename} to your downloads.`);
  } catch (error) {
    setStatus(`Could not save the PDF: ${error.message}`, 'error');
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    elements.download.disabled = false;
  }
}

/**
 * Opens the printable viewer. Chrome's own renderer handles the layout, so
 * non-Latin scripts survive — unlike the built-in Latin-1 PDF writer.
 */
async function handlePrint() {
  if (!transcript) return;

  await chrome.storage.session.set({
    [VIEWER_KEY]: {
      title: transcript.title,
      subtitleLines: subtitleLines(),
      blocks: toBlocks(),
    },
  });

  await chrome.tabs.create({ url: chrome.runtime.getURL('src/viewer/viewer.html') });
  window.close();
}

/** Copies the rendered transcript text to the clipboard. */
async function handleCopy() {
  if (!transcript) return;

  try {
    await navigator.clipboard.writeText(renderText(transcript.segments, currentOptions()));
    setStatus('Copied to clipboard.');
  } catch (error) {
    setStatus(`Could not copy: ${error.message}`, 'error');
  }
}

/** Persists formatting options and refreshes the preview. */
async function handleOptionChange() {
  renderPreview();
  await chrome.storage.local.set({ [OPTIONS_KEY]: currentOptions() });
}

/** Prefills the URL box from the active tab and restores saved options. */
async function init() {
  const stored = await chrome.storage.local.get(OPTIONS_KEY);
  if (stored[OPTIONS_KEY]) {
    elements.timestamps.checked = stored[OPTIONS_KEY].timestamps !== false;
    elements.paragraphs.checked = stored[OPTIONS_KEY].paragraphs !== false;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const videoId = tab?.url ? parseVideoId(tab.url) : null;
  if (videoId) {
    elements.url.value = watchUrl(videoId);
    setStatus('Detected the video in this tab.');
  }

  elements.url.focus();
  elements.url.select();
}

elements.form.addEventListener('submit', handleFetch);
elements.download.addEventListener('click', handleDownload);
elements.print.addEventListener('click', handlePrint);
elements.copy.addEventListener('click', handleCopy);
elements.timestamps.addEventListener('change', handleOptionChange);
elements.paragraphs.addEventListener('change', handleOptionChange);
elements.language.addEventListener('change', () => {
  if (transcript) elements.form.requestSubmit();
});

init().catch((error) => setStatus(`Startup error: ${error.message}`, 'error'));

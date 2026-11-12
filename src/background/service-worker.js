/**
 * Background service worker.
 *
 * Owns every network call and tab interaction. The popup is a thin client that
 * sends one message and renders the reply, so a popup that closes mid-fetch
 * cannot abort the work.
 *
 * Two strategies produce a transcript, tried in order:
 *
 *  1. Direct timedtext download. Cheap and silent, but since 2024 YouTube
 *     requires a browser-minted proof-of-origin token on most requests and
 *     answers HTTP 200 with an empty body when it is missing.
 *  2. Transcript-panel read. Loads the watch page in a tab (reusing one that is
 *     already open) and reads YouTube's own transcript panel, which is rendered
 *     by a session that holds a valid token. Slower, but it works.
 *
 * Service workers are ephemeral, so no state is held in module scope.
 */

import { parseVideoId, parseWatchPage, pickTrack, watchUrl } from '../lib/youtube.js';
import { parseCaptions } from '../lib/transcript.js';

/** Abort any single network request that stalls. */
const REQUEST_TIMEOUT_MS = 15000;

/** How long to wait for a freshly opened watch page to finish loading. */
const TAB_LOAD_TIMEOUT_MS = 20000;

/** Path of the injected transcript-panel reader, relative to the extension root. */
const SCRAPER_FILE = 'src/content/scrape-transcript.js';

/** Temporary tabs are excluded from reuse by other concurrent requests. */
const OWNED_TAB_FRAGMENT = '#transcript-to-pdf-export';

/**
 * Error carrying a stable machine-readable code alongside its message, so the
 * popup can show tailored guidance instead of a raw string.
 */
class TranscriptError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'TranscriptError';
    this.code = code;
  }
}

/**
 * fetch() with a timeout and no credentials.
 *
 * Cookies are deliberately omitted: the extension never needs the user's
 * YouTube session, and omitting them keeps the request anonymous.
 *
 * @param {string} url
 * @param {object} [init]
 * @returns {Promise<{ok: boolean, status: number, body: string}>}
 */
async function fetchWithTimeout(url, init = {}) {
  const target = new URL(url);
  if (target.protocol !== 'https:' || !['www.youtube.com', 'm.youtube.com'].includes(target.hostname) || target.username || target.password || target.port) {
    throw new TranscriptError('caption-url', 'YouTube returned an unsupported caption address.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      credentials: 'omit',
      redirect: 'error',
      signal: controller.signal,
    });
    // A fetch resolves at headers; retain the timer until the body is consumed.
    return { ok: response.ok, status: response.status, body: await response.text() };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new TranscriptError('timeout', 'YouTube did not respond in time. Try again.');
    }
    throw new TranscriptError('network', 'Network request failed. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Downloads and parses a video's watch page for its metadata and track list.
 *
 * @param {string} videoId
 * @returns {Promise<ReturnType<typeof parseWatchPage>>}
 */
async function loadWatchPage(videoId) {
  // `hl=en` keeps the consent interstitial and track names in a known language.
  // `User-Agent` is a forbidden header name — fetch drops it — but the worker
  // already presents as desktop Chrome, so YouTube serves the full watch page.
  console.info('Transcript operation:', { operation: 'watch-page', outcome: 'started' });
  const response = await fetchWithTimeout(`${watchUrl(videoId)}&hl=en`, {
    headers: { 'Accept-Language': 'en-US,en;q=0.9' },
  });

  if (!response.ok) {
    throw new TranscriptError(
      'watch-page',
      `YouTube returned HTTP ${response.status} for that video page.`,
    );
  }

  console.info('Transcript operation:', { operation: 'watch-page', outcome: 'ok' });
  return parseWatchPage(response.body);
}

/**
 * Strategy 1 — fetch one caption track directly, JSON feed first, legacy XML
 * feed second. Returns an empty array when YouTube withholds the captions.
 *
 * @param {{baseUrl: string}} track
 * @returns {Promise<import('../lib/transcript.js').Segment[]>}
 */
async function loadTrackDirectly(track) {
  for (const url of [`${track.baseUrl}&fmt=json3`, track.baseUrl]) {
    try {
      console.info('Transcript operation:', { operation: 'caption-download', outcome: 'started' });
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        console.warn('Transcript operation:', { operation: 'caption-download', outcome: 'http-error', status: response.status });
        continue;
      }

      const segments = parseCaptions(response.body);
      console.info('Transcript operation:', { operation: 'caption-download', outcome: segments.length ? 'ok' : 'empty' });
      if (segments.length > 0) return segments;
    } catch (error) {
      console.warn('Direct caption download failed:', { code: error instanceof TranscriptError ? error.code : 'caption-error' });
    }
  }

  return [];
}

/**
 * Resolves once a tab reports `status: "complete"`, or after a timeout.
 *
 * @param {number} tabId
 * @returns {Promise<void>}
 */
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const finish = () => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      clearTimeout(timer);
      resolve();
    };

    /**
     * @param {number} updatedTabId
     * @param {chrome.tabs.TabChangeInfo} changeInfo
     */
    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') finish();
    };

    const timer = setTimeout(finish, TAB_LOAD_TIMEOUT_MS);
    chrome.tabs.onUpdated.addListener(onUpdated);

    // The tab may already be loaded before the listener attached.
    chrome.tabs.get(tabId).then(
      (tab) => {
        if (tab.status === 'complete') finish();
      },
      () => finish(),
    );
  });
}

/**
 * Finds an already-open tab showing this video, so the user's existing session
 * is reused rather than opening a duplicate.
 *
 * @param {string} videoId
 * @returns {Promise<chrome.tabs.Tab|null>}
 */
async function findOpenTab(videoId) {
  const tabs = await chrome.tabs.query({
    url: ['https://www.youtube.com/*', 'https://m.youtube.com/*'],
  });
  return tabs.find((tab) => tab.url && !tab.url.endsWith(OWNED_TAB_FRAGMENT) && parseVideoId(tab.url) === videoId) ?? null;
}

/**
 * Strategy 2 — read YouTube's own transcript panel from a tab.
 *
 * Reuses an open tab when one exists; otherwise opens the watch page in a
 * background tab and closes it again afterwards.
 *
 * @param {string} videoId
 * @returns {Promise<import('../lib/transcript.js').Segment[]>}
 */
async function readFromTranscriptPanel(videoId) {
  console.info('Transcript operation:', { operation: 'panel-read', outcome: 'started' });
  const existing = await findOpenTab(videoId);
  let tabId = existing?.id ?? null;
  const opened = tabId === null;

  try {
    if (opened) {
      const tab = await chrome.tabs.create({ url: watchUrl(videoId) + OWNED_TAB_FRAGMENT, active: false });
      tabId = tab.id ?? null;
      if (tabId === null) return [];
      await waitForTabLoad(tabId);
    }

    const verifyVideo = async () => {
      const tab = await chrome.tabs.get(tabId);
      if (parseVideoId(tab.url ?? '') !== videoId ||
          (tab.pendingUrl && parseVideoId(tab.pendingUrl) !== videoId)) {
        throw new TranscriptError('panel-navigation', 'The video tab changed during transcript extraction. Try again.');
      }
    };
    await verifyVideo();
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      files: [SCRAPER_FILE],
    });

    await verifyVideo();
    const segments = Array.isArray(injection?.result) ? injection.result : [];
    console.info('Transcript operation:', { operation: 'panel-read', outcome: segments.length ? 'ok' : 'empty' });
    return segments;
  } catch (error) {
    console.warn('Transcript panel read failed:', { code: error instanceof TranscriptError ? error.code : 'panel-error' });
    if (error instanceof TranscriptError) throw error;
    return [];
  } finally {
    // Only clean up tabs this function created; never close the user's own.
    if (opened && tabId !== null) {
      try {
        await chrome.tabs.remove(tabId);
      } catch {
        console.warn('Temporary tab cleanup failed:', { operation: 'tab-remove', code: 'cleanup-failed' });
      }
    }
  }
}

/**
 * Resolves a user-supplied URL into a full transcript.
 *
 * @param {{url: string, language?: string}} request
 * @returns {Promise<{videoId: string, title: string, author: string|null, language: string, isGenerated: boolean|null, source: 'timedtext'|'panel', availableLanguages: Array<{code: string, name: string, isGenerated: boolean}>, segments: import('../lib/transcript.js').Segment[]}>}
 */
async function getTranscript(request) {
  const videoId = parseVideoId(request.url);
  if (!videoId) {
    throw new TranscriptError('bad-url', 'That is not a recognisable YouTube video URL.');
  }

  const page = await loadWatchPage(videoId);

  if (!page.isPlayable) {
    throw new TranscriptError(
      'unavailable',
      page.reason ?? 'YouTube will not serve that video (private, removed, or age-restricted).',
    );
  }

  const track = pickTrack(page.tracks, request.language);

  let source = 'timedtext';
  let segments = track ? await loadTrackDirectly(track) : [];

  if (segments.length === 0) {
    if (request.language && request.language !== 'auto') {
      throw new TranscriptError('language-unavailable', 'YouTube blocked the selected caption track. Choose Auto to read the current transcript panel language.');
    }
    source = 'panel';
    segments = await readFromTranscriptPanel(videoId);
  }

  if (segments.length === 0) {
    if (page.parsed && page.tracks.length === 0) throw new TranscriptError('no-captions', 'YouTube did not expose captions in this page or transcript panel.');
    if (!page.parsed) throw new TranscriptError('unreadable', 'YouTube did not return a usable video page or transcript panel. Open the video in a tab and try again.');
    throw new TranscriptError(
      'blocked',
      'YouTube would not release the captions. Open the video in a tab, click ' +
        '“Show transcript” once, then try again.',
    );
  }

  return {
    videoId,
    title: page.title ?? `YouTube video ${videoId}`,
    author: page.author ?? null,
    language: source === 'timedtext' ? track.languageCode : 'unknown',
    isGenerated: source === 'timedtext' ? Boolean(track.isGenerated) : null,
    source,
    availableLanguages: page.tracks.map((t) => ({
      code: t.languageCode,
      name: t.name,
      isGenerated: t.isGenerated,
    })),
    segments,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'FETCH_TRANSCRIPT') return undefined;

  /**
   * Replies to the popup, tolerating a popup that closed mid-fetch — the
   * message port is gone by then and sendResponse throws.
   *
   * @param {object} payload
   */
  const reply = (payload) => {
    try {
      sendResponse(payload);
    } catch (error) {
      console.warn('Popup closed before the transcript was delivered:', { code: 'popup-closed' });
    }
  };

  (async () => {
    try {
      reply({ ok: true, data: await getTranscript(message) });
    } catch (error) {
      console.error('Transcript fetch failed:', { code: error instanceof TranscriptError ? error.code : 'unknown' });
      reply({
        ok: false,
        error: {
          code: error instanceof TranscriptError ? error.code : 'unknown',
          message: error instanceof TranscriptError ? error.message : 'Something went wrong. Try again.',
        },
      });
    }
  })();

  return true; // Keep the message channel open for the async response.
});

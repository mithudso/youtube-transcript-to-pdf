/**
 * YouTube URL parsing and watch-page scraping helpers.
 *
 * These functions are pure (no chrome.* access) so they can be unit tested
 * and reused from the service worker, the popup, or a content script.
 */

/** Hosts we are willing to treat as YouTube. */
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

/** A YouTube video id is exactly 11 URL-safe base64 characters. */
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extracts an 11-character video id from any common YouTube URL shape, or from
 * a bare video id typed straight into the input box.
 *
 * Supported: watch?v=, youtu.be/, /shorts/, /embed/, /live/, /v/.
 *
 * @param {string} input Raw user input — a URL or a bare video id.
 * @returns {string|null} The video id, or null if none could be found.
 */
export function parseVideoId(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;

  // A bare id pasted directly.
  if (VIDEO_ID_RE.test(raw)) return raw;

  let url;
  try {
    url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  // youtu.be/<id>
  if (host.endsWith('youtu.be')) {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id && VIDEO_ID_RE.test(id) ? id : null;
  }

  const v = url.searchParams.get('v');
  if (v && VIDEO_ID_RE.test(v)) return v;

  // /shorts/<id>, /embed/<id>, /live/<id>, /v/<id>
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(segments[0])) {
    const id = segments[1];
    if (VIDEO_ID_RE.test(id)) return id;
  }

  return null;
}

/**
 * Builds the canonical desktop watch URL for a video id.
 *
 * @param {string} videoId
 * @returns {string}
 */
export function watchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

/**
 * Decodes the \uXXXX escapes YouTube embeds inside its inline JSON blobs.
 *
 * @param {string} value
 * @returns {string}
 */
function decodeUnicodeEscapes(value) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

/**
 * Scans forward from `start` (the index of an opening brace or bracket) and
 * returns the index just past the matching closing brace, honouring JSON string
 * literals and escapes so braces inside strings do not confuse the scan.
 *
 * @param {string} text
 * @param {number} start Index of the opening `{` or `[`.
 * @returns {number} Index just past the matching close, or -1 if unbalanced.
 */
function findBalancedEnd(text, start) {
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }

  return -1;
}

/**
 * Extracts a JSON object assigned to a named variable inside watch-page HTML,
 * e.g. `var ytInitialPlayerResponse = {...};`.
 *
 * @param {string} html
 * @param {string} varName
 * @returns {object|null}
 */
export function extractJsonVar(html, varName) {
  const marker = new RegExp(`(?:var\\s+)?${varName}\\s*=\\s*\\{`);
  const match = marker.exec(html);
  if (!match) return null;

  const braceStart = match.index + match[0].length - 1;
  const end = findBalancedEnd(html, braceStart);
  if (end === -1) return null;

  try {
    return JSON.parse(html.slice(braceStart, end));
  } catch {
    return null;
  }
}

/**
 * @typedef {object} CaptionTrack
 * @property {string} baseUrl    Timedtext endpoint (signed, expires).
 * @property {string} languageCode  e.g. "en", "es".
 * @property {string} name       Human-readable track name.
 * @property {boolean} isGenerated True for YouTube auto-generated captions.
 */

/**
 * Pulls the caption track list out of watch-page HTML.
 *
 * Prefers the full `ytInitialPlayerResponse` blob and falls back to a direct
 * regex on `"captionTracks":[...]` for the trimmed responses YouTube sometimes
 * serves.
 *
 * @param {string} html Raw watch-page HTML.
 * @returns {{tracks: CaptionTrack[], title: string|null, author: string|null, isPlayable: boolean, reason: string|null}}
 */
export function parseWatchPage(html) {
  const player = extractJsonVar(html, 'ytInitialPlayerResponse');

  const details = player?.videoDetails ?? null;
  const status = player?.playabilityStatus ?? null;

  let rawTracks =
    player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? null;

  if (!rawTracks) {
    const fallback = /"captionTracks":\s*(\[)/.exec(html);
    if (fallback) {
      const end = findBalancedEnd(html, fallback.index + fallback[0].length - 1);
      if (end !== -1) {
        try {
          rawTracks = JSON.parse(
            decodeUnicodeEscapes(html.slice(fallback.index + fallback[0].length - 1, end)),
          );
        } catch {
          rawTracks = null;
        }
      }
    }
  }

  const tracks = (rawTracks ?? [])
    .filter((track) => typeof track?.baseUrl === 'string')
    .map((track) => ({
      baseUrl: decodeUnicodeEscapes(track.baseUrl),
      languageCode: track.languageCode ?? '',
      name:
        track.name?.simpleText ??
        track.name?.runs?.map((run) => run.text).join('') ??
        track.languageCode ??
        'Unknown',
      isGenerated: track.kind === 'asr' || /auto-generated/i.test(track.name?.simpleText ?? ''),
    }));

  return {
    tracks,
    title: details?.title ?? null,
    author: details?.author ?? null,
    isPlayable: (status?.status ?? 'OK') === 'OK',
    reason: status?.reason ?? status?.errorScreen?.playerErrorMessageRenderer?.reason?.simpleText ?? null,
  };
}

/**
 * Picks the best caption track for a requested language.
 *
 * Order of preference: exact language match, then same base language
 * ("en" matches "en-GB"), then a human-authored track, then whatever exists.
 *
 * @param {CaptionTrack[]} tracks
 * @param {string} [preferredLanguage] BCP-47-ish code, or "auto" / empty for any.
 * @returns {CaptionTrack|null}
 */
export function pickTrack(tracks, preferredLanguage) {
  if (!tracks?.length) return null;

  const want = String(preferredLanguage ?? '').trim().toLowerCase();
  if (want && want !== 'auto') {
    const exact = tracks.find((t) => t.languageCode.toLowerCase() === want);
    if (exact) return exact;

    const base = want.split('-')[0];
    const sameBase = tracks.find((t) => t.languageCode.toLowerCase().split('-')[0] === base);
    if (sameBase) return sameBase;
  }

  return tracks.find((t) => !t.isGenerated) ?? tracks[0];
}

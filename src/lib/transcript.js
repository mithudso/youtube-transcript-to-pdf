/**
 * Caption payload parsing and transcript formatting.
 *
 * YouTube serves timed text in two shapes we care about:
 *   - `fmt=json3` — a JSON envelope with `events[].segs[].utf8`.
 *   - the legacy XML `<transcript><text start dur>` document.
 *
 * Both collapse to the same `Segment` shape.
 */

/**
 * @typedef {object} Segment
 * @property {number} start Offset from video start, in seconds.
 * @property {number} duration Segment length in seconds (0 when unknown).
 * @property {string} text Caption text, whitespace-normalised.
 */

/** Entities the legacy XML feed escapes. Order matters: `&amp;` runs last. */
const XML_ENTITIES = [
  [/&apos;/g, "'"],
  [/&quot;/g, '"'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&nbsp;/g, ' '],
];

/**
 * Collapses whitespace and strips the newlines YouTube uses for line breaks
 * inside a single caption cue.
 *
 * @param {string} text
 * @returns {string}
 */
function normalise(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Decodes the XML entities present in the legacy timedtext format.
 *
 * @param {string} text
 * @returns {string}
 */
function decodeEntities(text) {
  let out = String(text ?? '');
  for (const [pattern, replacement] of XML_ENTITIES) {
    out = out.replace(pattern, replacement);
  }
  out = out.replace(/&#(x[0-9a-f]+|\d+);/gi, (reference, value) => {
    const code = value[0].toLowerCase() === 'x' ? Number.parseInt(value.slice(1), 16) : Number(value);
    const valid = code === 9 || code === 10 || code === 13 ||
      (code >= 0x20 && code <= 0xd7ff) || (code >= 0xe000 && code <= 0xfffd) ||
      (code >= 0x10000 && code <= 0x10ffff);
    return valid ? String.fromCodePoint(code) : reference;
  });
  // The feed has an application escaping layer as well as XML; callers decode twice.
  return out.replace(/&amp;/g, '&');
}

/**
 * Parses a `fmt=json3` timedtext payload.
 *
 * @param {string} body Raw response body.
 * @returns {Segment[]}
 */
export function parseJson3(body) {
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return [];
  }

  const events = Array.isArray(data?.events) ? data.events : [];
  const segments = [];
  const seconds = (value) => {
    if (typeof value !== 'number' && typeof value !== 'string') return 0;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) / 1000 : 0;
  };

  for (const event of events) {
    if (!Array.isArray(event?.segs)) continue;

    const text = normalise(event.segs.map((seg) => typeof seg?.utf8 === 'string' ? seg.utf8 : '').join(''));
    // Auto-generated tracks emit empty "roll-up" events; skip them.
    if (!text) continue;

    segments.push({
      start: seconds(event.tStartMs),
      duration: seconds(event.dDurationMs),
      text,
    });
  }

  return segments;
}

/**
 * Parses the legacy XML timedtext payload.
 *
 * Uses a forward-only scan rather than DOMParser so the same code runs inside the service
 * worker, where DOMParser is unavailable.
 *
 * @param {string} body Raw response body.
 * @returns {Segment[]}
 */
export function parseTimedTextXml(body) {
  const segments = [];
  let cursor = 0;
  while (cursor < body.length) {
    const startTag = body.indexOf('<text', cursor);
    if (startTag === -1) break;
    cursor = startTag + 5;
    if (!/[\s>]/.test(body[cursor] ?? '')) continue;
    const tagEnd = body.indexOf('>', cursor);
    if (tagEnd === -1) break;
    if (/\/\s*$/.test(body.slice(cursor, tagEnd))) { cursor = tagEnd + 1; continue; }
    const end = body.indexOf('</text>', tagEnd + 1);
    if (end === -1) break;
    const attrs = body.slice(cursor, tagEnd);
    const start = Number(/(?:^|\s)start\s*=\s*(["'])([\s\S]*?)\1/.exec(attrs)?.[2] ?? 0);
    const duration = Number(/(?:^|\s)dur\s*=\s*(["'])([\s\S]*?)\1/.exec(attrs)?.[2] ?? 0);
    // Remove actual XML child markup before decoding literal caption text.
    const text = normalise(decodeEntities(decodeEntities(
      body.slice(tagEnd + 1, end).replace(/<[^<>]*>/g, ' '),
    )));
    cursor = end + '</text>'.length;
    if (!text) continue;
    segments.push({
      start: Number.isFinite(start) ? Math.max(0, start) : 0,
      duration: Number.isFinite(duration) ? Math.max(0, duration) : 0,
      text,
    });
  }

  return segments;
}

/**
 * Parses a timedtext response of either supported format.
 *
 * @param {string} body Raw response body.
 * @returns {Segment[]}
 */
export function parseCaptions(body) {
  const trimmed = String(body ?? '').trimStart();
  if (trimmed.startsWith('{')) return parseJson3(trimmed);
  if (trimmed.startsWith('<')) return parseTimedTextXml(trimmed);
  return [];
}

/**
 * Formats a second offset as `M:SS`, or `H:MM:SS` past the hour mark.
 *
 * @param {number} seconds
 * @returns {string}
 */
export function formatTimestamp(seconds) {
  const value = Number(seconds);
  const total = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  return hours > 0
    ? `${hours}:${mm}:${String(secs).padStart(2, '0')}`
    : `${mm}:${String(secs).padStart(2, '0')}`;
}

/**
 * Groups caption cues into readable paragraphs.
 *
 * Cues are merged until the paragraph reaches `maxChars`, a sentence ends near
 * that limit, or the gap to the next cue exceeds `gapSeconds` — which usually
 * marks a pause or topic change.
 *
 * @param {Segment[]} segments
 * @param {object} [options]
 * @param {number} [options.maxChars=420] Soft character cap per paragraph.
 * @param {number} [options.gapSeconds=2.5] Silence gap that forces a break.
 * @returns {Array<{start: number, text: string}>}
 */
export function groupIntoParagraphs(segments, options = {}) {
  const maxChars = options.maxChars ?? 420;
  const gapSeconds = options.gapSeconds ?? 2.5;

  const paragraphs = [];
  let current = null;
  let previousEnd = null;

  for (const segment of segments) {
    const gap = previousEnd === null ? 0 : segment.start - previousEnd;

    const shouldBreak =
      current !== null &&
      (gap > gapSeconds ||
        current.text.length >= maxChars ||
        (current.text.length > maxChars * 0.6 && /[.!?]"?$/.test(current.text)));

    if (current === null || shouldBreak) {
      current = { start: segment.start, text: segment.text };
      paragraphs.push(current);
    } else {
      current.text += ` ${segment.text}`;
    }

    previousEnd = segment.start + segment.duration;
  }

  return paragraphs;
}

/**
 * Renders segments as plain text for preview, clipboard, or PDF body input.
 *
 * @param {Segment[]} segments
 * @param {object} [options]
 * @param {boolean} [options.timestamps=true] Prefix each block with its offset.
 * @param {boolean} [options.paragraphs=true] Merge cues into paragraphs.
 * @returns {string}
 */
export function renderText(segments, options = {}) {
  const timestamps = options.timestamps ?? true;
  const paragraphs = options.paragraphs ?? true;

  const blocks = paragraphs
    ? groupIntoParagraphs(segments)
    : segments.map((segment) => ({ start: segment.start, text: segment.text }));

  return blocks
    .map((block) =>
      timestamps ? `[${formatTimestamp(block.start)}] ${block.text}` : block.text,
    )
    .join('\n\n');
}

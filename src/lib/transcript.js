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
  [/&#39;/g, "'"],
  [/&quot;/g, '"'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&nbsp;/g, ' '],
  [/&amp;/g, '&'],
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
  return out;
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

  for (const event of events) {
    if (!Array.isArray(event?.segs)) continue;

    const text = normalise(event.segs.map((seg) => seg?.utf8 ?? '').join(''));
    // Auto-generated tracks emit empty "roll-up" events; skip them.
    if (!text) continue;

    segments.push({
      start: (event.tStartMs ?? 0) / 1000,
      duration: (event.dDurationMs ?? 0) / 1000,
      text,
    });
  }

  return segments;
}

/**
 * Parses the legacy XML timedtext payload.
 *
 * Uses a regex rather than DOMParser so the same code runs inside the service
 * worker, where DOMParser is unavailable.
 *
 * @param {string} body Raw response body.
 * @returns {Segment[]}
 */
export function parseTimedTextXml(body) {
  const segments = [];
  const cue = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;

  let match;
  while ((match = cue.exec(body)) !== null) {
    const attrs = match[1];
    const start = Number(/\bstart="([^"]*)"/.exec(attrs)?.[1] ?? 0);
    const duration = Number(/\bdur="([^"]*)"/.exec(attrs)?.[1] ?? 0);

    // The payload is double-escaped: entities wrap tags, which wrap entities.
    const text = normalise(decodeEntities(decodeEntities(match[2]).replace(/<[^>]*>/g, ' ')));
    if (!text) continue;

    segments.push({
      start: Number.isFinite(start) ? start : 0,
      duration: Number.isFinite(duration) ? duration : 0,
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
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
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

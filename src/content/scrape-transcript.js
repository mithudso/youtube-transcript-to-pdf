/**
 * Injected fallback: reads the transcript out of YouTube's own transcript
 * panel when the timedtext endpoint refuses a direct download.
 *
 * Runs as the last expression of an injected file, so its resolved value
 * becomes `InjectionResult.result` in the service worker.
 *
 * YouTube has two generations of transcript markup in the wild — the older
 * `ytd-transcript-segment-renderer` with stable `.segment-*` class names, and
 * the current `transcript-segment-view-model` whose classes are obfuscated.
 * Both are handled: named classes first, then a structural fallback that finds
 * the timestamp by its shape and the caption by its attributed-string span.
 *
 * @returns {Promise<Array<{start: number, duration: number, text: string}>>}
 */
(async () => {
  /** Matches "1:02" and "1:02:03" but not caption text. */
  const TIMESTAMP_PATTERN = /^\d{1,3}(?::\d{2}){1,2}$/;

  /** Screen-reader duration labels that sit beside the timestamp. */
  const DURATION_LABEL_PATTERN = /^\d+\s+(?:second|minute|hour)s?$/i;

  /** Both generations of the per-cue element. */
  const SEGMENT_SELECTOR = 'transcript-segment-view-model, ytd-transcript-segment-renderer';

  /**
   * Polls for a condition instead of sleeping a fixed amount, so the common
   * fast case returns immediately.
   *
   * @param {() => boolean} predicate
   * @param {number} timeoutMs
   * @returns {Promise<boolean>}
   */
  const waitFor = async (predicate, timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (predicate()) return true;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    return predicate();
  };

  /** @returns {HTMLElement|undefined} The "Show transcript" control, if present. */
  const findShowButton = () =>
    [...document.querySelectorAll('button, tp-yt-paper-button')].find((el) => {
      const label = `${el.textContent ?? ''} ${el.getAttribute('aria-label') ?? ''}`;
      return /show transcript/i.test(label);
    });

  /** Opens the transcript panel, expanding the description first if needed. */
  const openPanel = async () => {
    if (document.querySelector(SEGMENT_SELECTOR)) return;

    const button = findShowButton();
    if (button) {
      button.click();
      await waitFor(() => Boolean(document.querySelector(SEGMENT_SELECTOR)), 8000);
      return;
    }

    // Newer layouts bury the control behind the description's "...more" expander.
    document.querySelector('#expand, tp-yt-paper-button#expand')?.click();
    await waitFor(() => Boolean(findShowButton()), 4000);
    findShowButton()?.click();
    await waitFor(() => Boolean(document.querySelector(SEGMENT_SELECTOR)), 8000);
  };

  /**
   * Converts a panel timestamp ("1:02" or "1:02:03") into seconds.
   *
   * @param {string} label
   * @returns {number}
   */
  const toSeconds = (label) =>
    String(label ?? '')
      .trim()
      .split(':')
      .map((part) => Number(part) || 0)
      .reduce((total, part) => total * 60 + part, 0);

  /**
   * Pulls the timestamp and caption text out of one cue element.
   *
   * @param {Element} row
   * @returns {{timestamp: string, text: string}}
   */
  const readRow = (row) => {
    let timestamp = row.querySelector('.segment-timestamp')?.textContent?.trim() ?? '';
    let text = row.querySelector('.segment-text')?.textContent?.trim() ?? '';
    if (timestamp && text) return { timestamp, text };

    const leaves = [...row.querySelectorAll('div, span')].filter((el) => el.children.length === 0);

    if (!timestamp) {
      timestamp =
        leaves.find((el) => TIMESTAMP_PATTERN.test(el.textContent?.trim() ?? ''))?.textContent?.trim() ?? '';
    }

    if (!text) {
      // The current markup wraps caption text in an attributed-string span.
      const attributed = row.querySelector('span[class*="AttributedString"]');
      text =
        attributed?.textContent?.trim() ??
        leaves
          .map((el) => el.textContent?.trim() ?? '')
          .filter(
            (value) =>
              value && !TIMESTAMP_PATTERN.test(value) && !DURATION_LABEL_PATTERN.test(value),
          )
          .sort((a, b) => b.length - a.length)[0] ??
        '';
    }

    return { timestamp, text };
  };

  try {
    await openPanel();
    // The list renders in one pass; a short settle avoids catching it half-built.
    if (document.querySelector(SEGMENT_SELECTOR)) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  } catch (error) {
    console.warn('Could not open the transcript panel:', error);
  }

  const segments = [...document.querySelectorAll(SEGMENT_SELECTOR)]
    .map((row) => {
      const { timestamp, text } = readRow(row);
      return { start: toSeconds(timestamp), duration: 0, text: text.replace(/\s+/g, ' ').trim() };
    })
    .filter((segment) => segment.text.length > 0);

  // Derive each cue's length from the gap to the next, so paragraph grouping
  // downstream has something to work with.
  return segments.map((segment, index) => ({
    ...segment,
    duration:
      index + 1 < segments.length ? Math.max(0, segments[index + 1].start - segment.start) : 0,
  }));
})();

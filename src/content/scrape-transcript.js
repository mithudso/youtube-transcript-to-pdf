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

  /** Rank metadata separately, while preserving captions with the same text shape. */
  const DURATION_LABEL_PATTERN = /^\d+\s+(?:second|minute|hour)s?$/i;

  /** Both generations of the per-cue element. */
  const SEGMENT_SELECTOR = 'transcript-segment-view-model, ytd-transcript-segment-renderer';
  const visibleRows = () => [...document.querySelectorAll(SEGMENT_SELECTOR)].filter(
    (row) => row.getClientRects().length > 0 && getComputedStyle(row).visibility !== 'hidden',
  );

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

  /**
   * Finds the control that OPENS the transcript panel.
   *
   * Matching is exact rather than a substring test, because the same panel also
   * renders a "Close transcript" button and a generic "Transcript" chip. A
   * substring match can select the close button and toggle the panel shut,
   * which is indistinguishable from "the panel never opened".
   *
   * @returns {HTMLElement|undefined}
   */
  const findShowButton = () =>
    [...document.querySelectorAll('button, tp-yt-paper-button')].find((el) => {
      const text = (el.textContent ?? '').trim();
      const label = (el.getAttribute('aria-label') ?? '').trim();
      return /^show transcript$/i.test(text) || /^show transcript$/i.test(label);
    });

  /**
   * Whether YouTube currently reports the transcript panel as expanded.
   *
   * The panel populates asynchronously behind a spinner, so an expanded panel
   * with no cues yet means "still loading", while a hidden panel means the
   * click did not take.
   *
   * @returns {boolean}
   */
  const panelIsExpanded = () =>
    [...document.querySelectorAll('ytd-engagement-panel-section-list-renderer')].some(
      (panel) =>
        /transcript/i.test(panel.getAttribute('target-id') ?? '') &&
        panel.getAttribute('visibility') === 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED',
    );

  /**
   * Clicks the control once and waits for cues, or for the panel to at least
   * report itself expanded.
   *
   * @returns {Promise<boolean>} True once cues are present.
   */
  const attemptOpen = async () => {
    let button = findShowButton();

    if (!button) {
      // Newer layouts bury the control behind the description's "...more" expander.
      document.querySelector('#expand, tp-yt-paper-button#expand')?.click();
      await waitFor(() => Boolean(findShowButton()), 4000);
      button = findShowButton();
    }

    if (!button) return false;

    button.click();
    return waitFor(() => visibleRows().length > 0, 8000);
  };

  /** Opens the transcript panel, retrying once if the first click did not take. */
  const openPanel = async () => {
    if (visibleRows().length) return true;

    if (await attemptOpen()) return true;

    // The panel reports itself expanded but has no cues: it is still loading
    // behind a spinner, so wait rather than clicking again and toggling it shut.
    if (panelIsExpanded()) {
      return waitFor(() => visibleRows().length > 0, 8000);
    }

    // The click did not open anything. One retry covers a control that was not
    // yet wired up when the first click landed.
    return attemptOpen();
  };

  /**
   * Converts a panel timestamp ("1:02" or "1:02:03") into seconds.
   *
   * @param {string} label
   * @returns {number|null}
   */
  const toSeconds = (label) => {
    const raw = String(label ?? '').trim();
    if (!TIMESTAMP_PATTERN.test(raw)) return null;
    const parts = raw.split(':').map(Number);
    if (parts.slice(1).some((part) => part >= 60)) return null;
    return parts.reduce((total, part) => total * 60 + part, 0);
  };

  /**
   * Pulls the timestamp and caption text out of one cue element.
   *
   * @param {Element} row
   * @returns {{timestamp: string, text: string, ambiguous?: boolean}}
   */
  const readRow = (row) => {
    const leaves = [...row.querySelectorAll('div, span')].filter((el) => el.children.length === 0);
    const named = row.querySelector('.segment-text');
    const attributed = row.querySelector('span[class*="AttributedString"]');
    const preferred = named?.textContent?.trim() ? named : attributed?.textContent?.trim() ? attributed : null;
    const belongsToCaption = (el) => preferred && (el === preferred || preferred.contains?.(el));
    let timestampElement = row.querySelector('.segment-timestamp');
    if (!timestampElement?.textContent?.trim()) {
      const stamps = leaves.filter((el) => !belongsToCaption(el) && TIMESTAMP_PATTERN.test(el.textContent?.trim() ?? ''));
      if (stamps.length !== 1) return { timestamp: '', text: '', ambiguous: true };
      timestampElement = stamps[0];
    }
    const timestamp = timestampElement.textContent.trim();
    if (preferred) return { timestamp, text: preferred.textContent.trim() };
    const candidates = leaves.filter((el) => el !== timestampElement && el.textContent?.trim());
    const captions = candidates.filter((el) => !TIMESTAMP_PATTERN.test(el.textContent.trim()) && !DURATION_LABEL_PATTERN.test(el.textContent.trim()));
    if (!captions.length && candidates.length > 1) return { timestamp, text: '', ambiguous: true };
    let text = captions[0]?.textContent?.trim() || candidates[0]?.textContent?.trim() || '';
    if (captions.length > 1) {
      let group = captions[0].parentElement;
      while (group && group !== row && !captions.every((el) => group.contains(el))) group = group.parentElement;
      const metadata = candidates.filter((el) => !captions.includes(el));
      if (!group || group === row || group.contains(timestampElement) || metadata.some((el) => group.contains(el))) {
        return { timestamp, text: '', ambiguous: true };
      }
      text = group.textContent.trim();
    }
    return { timestamp, text };
  };

  try {
    if (!await openPanel()) {
      console.warn('Transcript panel unavailable:', { code: 'panel-timeout' });
    }
    // The list renders in one pass; a short settle avoids catching it half-built.
    if (visibleRows().length) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  } catch (error) {
    console.warn('Could not open the transcript panel:', { code: 'panel-open-failed' });
  }

  const segments = [];
  let invalidTimestamps = 0;
  let ambiguousCaptions = 0;
  for (const row of visibleRows()) {
    const { timestamp, text, ambiguous } = readRow(row);
    if (ambiguous) { ambiguousCaptions += 1; continue; }
    const start = toSeconds(timestamp);
    if (start === null) {
      invalidTimestamps += 1;
      continue;
    }
    const caption = text.replace(/\s+/g, ' ').trim();
    if (caption) segments.push({ start, duration: 0, text: caption });
  }
  if (invalidTimestamps) {
    console.warn('Transcript rows skipped:', { code: 'invalid-timestamp', count: invalidTimestamps });
  }

  if (ambiguousCaptions) {
    console.warn('Transcript rows skipped:', { code: 'ambiguous-caption', count: ambiguousCaptions });
  }

  // Derive each cue's length from the gap to the next, so paragraph grouping
  // downstream has something to work with.
  return segments.map((segment, index) => ({
    ...segment,
    duration:
      index + 1 < segments.length ? Math.max(0, segments[index + 1].start - segment.start) : 0,
  }));
})();

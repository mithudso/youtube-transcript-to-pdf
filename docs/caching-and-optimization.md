# Caching and Optimization

## What is cached

Almost nothing, deliberately.

| Data | Where | Lifetime | Why |
| --- | --- | --- | --- |
| Formatting preferences | `chrome.storage.local` (`formatOptions`) | Until uninstalled | Timestamps and paragraph toggles should survive a popup close. Two booleans. |
| Viewer payload | `chrome.storage.session` (`viewerPayload`) | Deleted on read | A one-shot handoff from popup to viewer. Removed immediately after render so the transcript does not sit in storage. |
| Fetched transcript | Popup memory | Until the popup closes | Lets option toggles re-render without refetching. |

## What is not cached, and why

**Transcripts are not persisted.** A transcript could be cached by video id to
make a second fetch instant. It is not, for three reasons: caption `baseUrl`
values are signed and expire, so a cache would go stale invisibly; storing a
user's viewing history in extension storage creates a privacy footprint the
extension otherwise does not have; and the user's actual goal is a PDF they
already saved, so repeat fetches of the same video are rare.

**Watch pages are not cached.** Same reasoning. A page fetch is roughly 1 MB and
one round trip, against a strategy-2 path that costs a tab load anyway.

## Where the time actually goes

| Step | Typical | Notes |
| --- | --- | --- |
| Watch-page fetch and parse | 0.5–2s | ~1 MB of HTML; brace-scan parsing is linear |
| Strategy 1 (direct caption fetch) | 0.2–0.5s | Usually returns empty and falls through |
| Strategy 2 (tab open, load, inject, read) | 3–8s | Dominated by YouTube's page load |
| Paragraph grouping | <10ms | Single pass |
| PDF generation | 20–100ms | Scales with segment count |

Strategy 2 is the cost, and nearly all of it is YouTube loading its own page.
There is no optimization available on this side of that.

## Optimizations that are in place

**A tab already open on the video is reused.** `findOpenTab` scans YouTube tabs
across all windows before opening a new one, which removes the entire page-load
cost when the user is watching the video they are exporting — the common case.

**The panel reader polls rather than sleeps.** `waitFor` checks every 150ms and
returns the moment the condition holds, instead of waiting a fixed interval
sized for the worst case.

**Transcript state lives in the popup.** Toggling timestamps or paragraphs
re-renders from memory. No refetch, no message round trip.

**PDF text is measured, not guessed.** Real Helvetica advance widths mean one
wrap pass with no re-measure loop.

**Everything is bounded.** 15s on any fetch, 20s on a tab load. A hung request
fails with a clear message rather than a spinner that never resolves.

## Deliberate non-optimizations

**Segments are copied a few times** between parsing, grouping, and rendering.
For a transcript of a few thousand cues this is microseconds, and the clarity is
worth more than the copies.

**Bold text is approximated** with a 1.08 width factor rather than a second
metrics table. It affects the title line only.

**The paragraph grouper runs on every option toggle** rather than memoizing.
It is a single linear pass over data already in memory.

## If this ever needs to be faster

The only meaningful lever is strategy 2's tab load, and the honest options are
poor: keeping a hidden tab warm would mean an always-open YouTube tab, which is
worse for the user than waiting five seconds. Reverse-engineering the token to
make strategy 1 work is explicitly out of scope — see
[ARCHITECTURE.md](ARCHITECTURE.md) ADR-002.

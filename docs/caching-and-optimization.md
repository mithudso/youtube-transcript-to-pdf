# Caching and Optimization

## Retained state

| Data | Where | Lifetime |
| --- | --- | --- |
| Formatting preferences | `chrome.storage.local` (`formatOptions`) | Until changed or uninstalled |
| Print handoff | `chrome.storage.session` (`viewerPayload:<unique token>`) | Deleted after rendering; cleanup failures are reported; browser shutdown clears it |
| Active transcript | Popup memory | Until refetch or popup close |

There is no persistent transcript or watch-page cache. Signed caption URLs expire,
and a cache keyed by video ID would retain viewing history. The temporary Print
handoff is separate from a reusable transcript cache.

## Work and bounds

No maintained latency benchmark exists. Current YouTube compatibility and timing
cannot be inferred from synthetic tests.

| Step | Control |
| --- | --- |
| Watch-page and direct caption fetches | Each request has a 15-second timeout through body consumption; no automatic network retry |
| Panel tab | Reuse a matching user tab or create an owned background tab; tab load waits at most 20 seconds |
| Panel reader | Poll every 150ms within bounded open attempts; retain a short settle before extraction |
| Formatting | Pure local passes over the current transcript |
| PDF wrapping | Accumulate integer glyph advances instead of rescanning complete line prefixes |

The worker excludes owned temporary tabs from reuse by concurrent requests. It
checks video identity before and after panel extraction. It closes only tabs the
request created.

## Layout and memory choices

Regular and bold Helvetica ASCII advances have separate tables. Other Latin-1
glyphs use a conservative width bound. Titles, body text and timestamps all wrap.
The regression suite checks real glyph-width fixtures and linear glyph visits;
these checks are not a throughput benchmark.

Formatting options re-render the transcript already held in the popup. The
paragraph grouper remains a simple pass instead of a memoized cache. Parsing,
grouping and rendering copy segment data where that keeps their contracts clear.
No measured allocation bottleneck justifies a larger caching layer.

If performance becomes a problem, first measure the affected path in a disposable
fixture and distinguish network/page loading from local work. Keeping a hidden
YouTube tab warm would change resource and privacy behavior and is not part of
this design. Reverse-engineering caption tokens remains outside scope; see
[ARCHITECTURE.md](ARCHITECTURE.md), ADR-002.

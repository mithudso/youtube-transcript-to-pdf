# Testing

## Strategy and commands

The pure modules remain independent of `chrome.*`. Node tests also import the
actual worker and popup controllers with disposable API fixtures, or execute the
shipping injected script and viewer in an isolated VM. These tests check application
control flow; they do not emulate Chrome or establish current YouTube compatibility.

```bash
npm run check                         # syntax, manifest, tests, generated docs and paths
npm test                              # 114 tests on the built-in Node runner
node --test test/pdf.test.js           # one suite
node --test --test-name-pattern=wrapText
npm run build                         # manifest preflight and zip packaging
npm run docs:generate                  # refresh committed retrieval artifacts
```

There are no npm dependencies or install step. CI runs on Node 22, 24 and 26;
`.nvmrc` selects Node 22. The core job also compiles the optional Python scripts. A separate artwork job
installs the existing optional Pillow 13.0.0 dependency in a fresh CI virtual
environment and runs its synthetic tests. Packaging requires both jobs to pass.

## Suites

| File | Tests | Behavior checked |
| --- | --- | --- |
| `test/youtube.test.js` | 15 | URL allowlist, JSON variable identity, malformed track metadata, language precedence |
| `test/transcript.test.js` | 16 | JSON/XML parsing, finite timing, literal escaped text, bounded malformed XML scanning, paragraph options |
| `test/pdf.test.js` | 21 | Independent width fixtures, PDF xref offsets and malformed counts, escaping, pagination, geometry and portable filenames |
| `test/service-worker.test.js` | 11 | Actual message handler, body timeout, safe logs, panel language, fallback, tab ownership and cleanup, outbound URL validation |
| `test/popup.test.js` | 15 | Stale responses, failed refetches, Print failures and unique keys, download completion/interruption, preference failures |
| `test/content-script.test.js` | 10 | Blank spans, metadata-shaped captions, hidden/ambiguous rows, invalid timestamps, open retries and delayed expanded panels |
| `test/viewer.test.js` | 6 | Isolated handoff consumption and storage failure reporting |
| `test/tooling.test.js` | 20 | Missing package inputs, preserved archive, index coverage/containment/pruning, manifest versions/icons/entrypoints |

Tests restore global API fixtures after each case. Node isolates test files in
separate processes and runs files concurrently by default. Cases that replace
globals remain sequential within their file. No real sleeps are used. The XML
stress case has an execution timeout to guard against pathological scanning;
it is a regression bound, not a benchmark or held-out evaluation.

## Optional artwork tests

The Python artwork scripts already depend on Pillow. In a disposable Python 3.11+
environment with Pillow 13.0.0 installed, run:

```bash
python -W error::ResourceWarning -m unittest discover -s test -p '*_test.py'
```

Four tests use synthetic images in temporary directories. They check that wide
captures cannot cover copy, incompatible crop dimensions fail before output, and missing-font fallback preserves size and emits a warning.
They never rewrite the committed icons or screenshots. The npm/core CI path needs neither Pillow nor an installation step; the separate
artwork CI job installs Pillow only in its fresh virtual environment.

## Coverage target

Require meaningful assertions for important and changed/risky paths, including
error outcomes and safe diagnostic fields. No numeric line-percentage threshold
is enforced. Bug regressions must fail against the affected old behavior.
The PDF oracle checks byte-accurate object offsets and known glyph widths rather
than a character-count approximation. Do not replace behavioral assertions with
execution-only tests.

## Browser checks and limits

A disposable Chrome 157 profile exercised the final extension under a process-tree
egress guard on 2026-11-12. Direct caption fetch with synthetic responses, preference
persistence, PDF download, named language picker, unique Print handoff, payload
deletion and long-token wrapping passed. Only its owned TCP debugging port was
allowed. Native panel navigation timed out under the guard; final panel behavior
is covered by the synthetic worker and DOM regressions. An earlier disposable
native-panel fixture passed before these guard controls. That historical run
was not audited for semantic-dispatch effects. No existing browser profile or
installed extension was changed. This validates Chrome API wiring and DOM behavior.

A separate public-video attempt loaded the extension and returned the existing
`blocked` error. It did not establish live caption compatibility. A full live
manual plan remains required before a store release: human/auto captions, language
selection, new/reused tabs, download, print preview with Unicode, no-caption and
bad-URL errors, and a long video. For panel fallback, verify that Auto reports
unknown language; an explicit language that cannot be downloaded must fail clearly.

## Adding tests

Keep fixtures synthetic and local. Import or execute the actual shipping entrypoint.
Assert both the visible result and relevant cleanup/logging effects. Browser and
live-video results must identify their scope; neither mocks nor saved screenshots
prove that current YouTube markup works.

## Maintenance isolation evidence

The resumed local tests ran through the batch-owned process-tree egress guard,
with scratch HOME/data/config/cache/model/auth paths and explicit synthetic browser
API/network doubles. This extension has no model/provider dependency. Child CLI
fixtures inherit the guard. No test source invokes Git or creates Git commits.
The fixture roots use `transcript-tooling-*`, `transcript-assets-*`, and
`transcript-mutation-*` under scratch temporary directories. Earlier baseline
runs preceded these controls and do not prove semantic-dispatch isolation.

The follow-up regressions produced 18 assertion failures against the affected
pre-fix behavior, plus a missing-font failure. Mutation checks independently
reject a removed expanded-panel guard, user-tab cleanup, an emptied pruned index,
and removal of the CLI timeout. The timeout mutant required a two-second owned
process-group watchdog; its process group was then stopped. The real CLI helper
uses a five-second deadline, and its deliberate hanging-child test uses 200ms.

The bounded final delivery repairs produced 22 additional failing assertions on
the pre-repair behavior. The final suite has 114 passing Node cases and four
Pillow cases. Eight guarded mutants exercise the expanded-panel wait, user-tab
preservation, prune survivors, typing before submission, empty Print handoff,
nested raw-transport errors, child deadlines and full copy-column overlap. The
first proposed nested-error mutant hit an already sanitized exception; the final
mutant logs the raw transport error and is correctly rejected. This is regression
evidence, not a third blind audit or a live-service compatibility claim.

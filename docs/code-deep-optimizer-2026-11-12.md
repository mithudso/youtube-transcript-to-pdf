<!-- {% raw %} -->

# Code deep optimizer — 2026-11-12

Full repository mode, 18 passes, no source cap, two concurrent bounded readers, max five iterations and max two blind attempts. Empirical mode is N/A: this repository has no held-out evaluation or benchmark. Test counts are coverage accounting, not quality scores.

## 1. Per-iteration severity

| Phase | Critical | High | Medium accepted | Low/Nit | Result |
| --- | --- | --- | --- | --- | --- |
| Iteration 1 | 0 | 0 | 44 | skipped below fix bar | 42 grounded per-file findings plus supported-Node and syntax-gate parent findings fixed |
| Iteration 2 / first blind dissent | 0 | 0 | 22 | skipped below fix bar | All collected before writes; fixed and behaviorally verified |
| Final blind / delivery repairs | 0 | 0 | 21 | skipped below fix bar | BLIND-AUDIT-DISSENT |

Bootstrap-only repairs, such as malformed FUNDING YAML and documentation standards, are recorded separately and do not inflate optimizer counts. Closely related symptoms are grouped; no severity was demoted to force convergence.

## 2. Findings

| Pass | File:line | Severity | Finding | Fix | Status/count |
| --- | --- | --- | --- | --- | --- |
| C1/S3/S4 | `scripts/check-doc-indexes.mjs:72` | Medium | Index coverage, containment, separators and prune diagnostics | Validate runtime/tools/tests/CI and retain actionable failures | Applied; I1: 3 |
| C1/S3 | `scripts/compose-store-screenshots.py:156` | Medium | Wide captures overlap copy; invalid crops synthesize padding | Bound both dimensions and reject out-of-range crops | Applied; I1: 2 |
| C1/S2 | `scripts/package-extension.mjs:18` | Medium | Missing package inputs can produce an unusable successful archive | Preflight all inputs before artifact replacement | Applied; I1: 1 |
| C1/S3 | `scripts/validate-manifest.mjs:96` | Medium | Coerced versions, non-files/outside paths, action icons and truncated PNGs | Validate versions and package equality, files and all icon declarations | Applied; I1: 4 |
| C1/P2/S2/S5 | `src/background/service-worker.js:61` | Medium | Body timeout, unreadable-page fallback, false panel language, shared tabs and silent cleanup | Bound bodies, disclose unknown metadata, isolate owned tabs, log safe outcomes | Applied; I1: 5 |
| C1/S3/S5 | `src/content/scrape-transcript.js:138` | Medium | Blank attributed spans, metadata-like captions, invalid timestamps and open timeout | Recover real captions, avoid fabricated timing, report terminal state | Applied; I1: 4 |
| C1/S1/S3 | `src/lib/pdf.js:80` | Medium | Unicode low-byte PDF operator injection, invalid geometry, device filenames | Normalize before escaping, reject impossible geometry, portable names | Applied; I1: 3 |
| C1/P1/S3 | `src/lib/transcript.js:110` | Medium | Literal XML text loss, nonfinite timing, quadratic malformed scan | Strip actual markup before decoding, finite timings, forward-only scan | Applied; I1: 3 |
| C1/S3 | `src/lib/youtube.js:121` | Medium | Malformed track shapes and wrong variable suffix extraction | Validate track data and identifier boundaries | Applied; I1: 2 |
| C1/P2/S2 | `src/popup/popup.js:124` | Medium | Stale replies/exports, Print/preferences errors and interrupted downloads | Sequence requests, isolate handoffs, handle failures and terminal downloads | Applied; I1: 4 |
| C2/S4 | `src/popup/popup.html:30` | Medium | Unnamed language picker | Add accessible name | Applied; I1: 1 |
| C1/S2 | `src/viewer/viewer.js:60` | Medium | Storage errors and shared handoff key | Use one key per Print, render before cleanup, report failure | Applied; I1: 2 |
| C1/S4 | `src/viewer/viewer.css:37` | Medium | Long tokens overflow document column | Wrap anywhere | Applied; I1: 1 |
| T1 | `test/pdf.test.js:13` | Medium | Weak width, xref/count and encoding oracles | Independent metric assertions and byte-accurate structure checks | Applied; I1: 3 |
| T1 | `test/transcript.test.js:118` | Medium | Parser/paragraph assertions miss bad variants | Behavioral counterexamples and true option difference | Applied; I1: 2 |
| T1 | `test/youtube.test.js:132` | Medium | Regex escaping and exact-language precedence unguarded | Counterexamples distinguish the broken variants | Applied; I1: 2 |
| T2/T3 | `.github/workflows/ci.yml:22` | Medium | Node 20 EOL and absent maintained-JS syntax gate | Check supported Node 22/24/26 and all JS syntax | Applied; I1 parent: 2 |
| C1/S3 | `scripts/check-doc-indexes.mjs:106` | Medium | Missing overview directories and escaping overview paths pass | Validate complete relative references, including directories | Applied; I2: 2 |
| C1/S4/S5 | `scripts/compose-store-screenshots.py:54` | Medium | Font fallback collapses typography silently | Preserve requested size and warn | Applied; I2: 1 |
| C1/S2/P2 | `scripts/package-extension.mjs:38` | Medium | Zip failure/concurrent builds destroy the previous archive | Unique temporary archive and atomic successful replacement | Applied; I2: 1 |
| C1/S3 | `scripts/validate-manifest.mjs:39` | Medium | Symlink escape, empty/corrupt PNGs, nested V2 flags and negative sizes | Canonical containment, CRC/pixel-stream checks, presence/size checks | Applied; I2: 4 |
| C1/P2 | `src/background/service-worker.js:214` | Medium | Reused tab navigates to another video while extracting | Check requested video before and after; discard mismatches | Applied; I2: 1 |
| C1/S3 | `src/content/scrape-transcript.js:25` | Medium | Hidden rows contaminate output; ambiguous metadata substitutes for captions | Read visible rows and skip ambiguous fallback text with a counted warning | Applied; I2: 2 |
| C1/S3 | `src/lib/pdf.js:23` | Medium | Latin-1/bold widths underestimate layout; timestamps bypass wrapping | Accurate ASCII bold widths, conservative Latin-1 bound, wrap timestamps | Applied; I2: 2 |
| C1 | `src/lib/transcript.js:120` | Medium | Empty self-closing cue steals the next timestamp | Skip self-closing cues | Applied; I2: 1 |
| C1/P2 | `src/popup/popup.js:21` | Medium | Late startup reads overwrite user choices or an active operation | Apply defaults only to untouched state; keep preview consistent | Applied; I2: 1 |
| C1/P2 | `src/viewer/viewer.js:55` | Medium | Print can run before async rendering | Disable and guard Print until render succeeds | Applied; I2: 1 |
| T1 | `test/content-script.test.js:88` | Medium | Expanded-panel loading guard has no regression | Deterministic delayed-cue test; removed-guard mutant fails | Applied; I2: 1 |
| T1 | `test/pdf.test.js:192` | Medium | Xref oracle accepts a freed catalog | Require in-use generation-zero nonzero objects; reject mutant | Applied; I2: 1 |
| T1 | `test/service-worker.test.js:99` | Medium | Existing user tab preservation has no assertion | Assert no removal on actual panel path; cleanup mutant fails | Applied; I2: 1 |
| T1/S2 | `test/tooling.test.js:17` | Medium | Child deadlines absent; pruning can erase survivors undetected | Bound child processes, distinguish errors, assert exact survivors | Applied; I2: 2 |
| T1/C2 | `test/viewer.test.js:11` | Medium | DOM double retains removed descendants | Match text replacement semantics; verify removal | Applied; I2: 1 |
| C1/S3 | `scripts/check-doc-indexes.mjs:118` | Medium | Pruning drops invalid entries with metadata | Remove only dead objects; retain invalid entries for correction | Applied; final repair; red/green metadata preservation |
| C1/S3 | `scripts/check-doc-indexes.mjs:101` | Medium | Overview skips punctuation-bearing paths | Extract complete inline paths before validating | Applied; final repair; red/green plus and space paths |
| C1/S3 | `scripts/validate-manifest.mjs:142` | Medium | Leading-zero version components accepted | Require canonical integer components | Applied; final repair; red/green version fixtures; official Chrome version rules |
| C1/C2 | `scripts/validate-manifest.mjs:164` | Medium | String action icons falsely rejected | Handle string form with path and PNG validation | Applied; final repair; red/green valid and invalid PNG string icons; Chrome action docs |
| S1/S3 | `scripts/validate-manifest.mjs:173` | Medium | Universal-host patterns evade narrow-host guard | Reject universal hostname patterns as well as all_urls | Applied; final repair; red/green host patterns; Chrome match-pattern docs |
| C1 | `src/background/service-worker.js:282` | Medium | Incomplete metadata blocks usable panel | Try panel before deciding no captions were exposed | Applied; final repair; red/green parsed-empty-player fixture |
| S2/S5 | `src/background/service-worker.js:232` | Medium | Navigation errors lose their code and guidance | Preserve recognized TranscriptError across cleanup | Applied; final repair; red/green navigation code and warning |
| C1/S3 | `src/content/scrape-transcript.js:143` | Medium | Caption-shaped timestamp is mistaken for timing | Identify caption first; exclude it from timing candidates; reject ambiguity | Applied; final repair; red/green recognized caption precedes timestamp |
| C1 | `src/content/scrape-transcript.js:157` | Medium | Structural fallback loses fragments | Read a reliable common caption container or report ambiguity | Applied; final repair; red/green Hello/world container |
| C2/S3 | `src/lib/transcript.js:78` | Medium | JSON field objects can throw during coercion | Accept string caption runs and typed finite timing values | Applied; final repair; red/green malformed text and timing objects |
| C1 | `src/lib/transcript.js:124` | Medium | Single-quoted XML attributes lose timing | Handle both quotes with exact attribute boundaries | Applied; final repair; red/green quote/name fixture |
| C1/S3 | `src/lib/transcript.js:49` | Medium | XML numeric/apos references remain encoded | Decode valid references, retain invalid references and legacy escaping contract | Applied; final repair; red/green Unicode/range/escaping cases |
| P1/P2 | `src/lib/pdf.js:107` | Medium | Wrapping rescans complete prefixes quadratically | Accumulate integer glyph advances for lines and chunks | Applied; final repair; red/green deterministic glyph-visit bound; no benchmark score |
| S5 | `src/popup/popup.js:173` | Medium | Primary popup I/O failures lack safe diagnostics | Emit operation/code warnings alongside existing UI errors | Applied; final repair; five red/green API rejection/privacy cases |
| T1 | `test/pdf.test.js:30` | Medium | Xref oracle accepts understated table counts | Require trailer boundary and matching Size | Applied; final repair; red/green corrupted-count fixture |
| T1 | `test/pdf.test.js:34` | Medium | Document text inflates page oracle | Count page dictionary headers at validated object offsets | Applied; final repair; red/green literal page-marker text |
| T1 | `test/popup.test.js:152` | Medium | Print preference test passes with no handoff | Require one nonempty payload before checking timestamps | Applied; final repair; empty-handoff mutant rejected |
| T1 | `test/popup.test.js:204` | Medium | Active fetch masks independent input race | Add pre-submission typing regression | Applied; final repair; typing-before-submit mutant rejected |
| T1/S1 | `test/service-worker.test.js:15` | Medium | Privacy oracle hides nested Error values | Use error-aware inspect and assert nested message visibility | Applied; final repair; red/green formatter; raw-transport nested-error mutant rejected |
| T1 | `test/store_assets_test.py:32` | Medium | One pixel misses copy-column overlap | Inspect colors over the full copy region | Applied; final repair; 650px overlap mutant rejected |
| T1/C2 | `test/viewer.test.js:24` | Medium | DOM fixture accepts nonexistent IDs | Return null for unknown IDs | Applied; final repair; red/green DOM contract fixture |

Final-round repair rows and proof: Pruning drops invalid entries with metadata — repaired and verified; Overview skips punctuation-bearing paths — repaired and verified; Leading-zero version components accepted — repaired and verified; String action icons falsely rejected — repaired and verified; Universal-host patterns evade narrow-host guard — repaired and verified; Incomplete metadata blocks usable panel — repaired and verified; Navigation errors lose their code and guidance — repaired and verified; Caption-shaped timestamp is mistaken for timing — repaired and verified; Structural fallback loses fragments — repaired and verified; JSON field objects can throw during coercion — repaired and verified; Single-quoted XML attributes lose timing — repaired and verified; XML numeric/apos references remain encoded — repaired and verified; Wrapping rescans complete prefixes quadratically — repaired and verified; Primary popup I/O failures lack safe diagnostics — repaired and verified; Xref oracle accepts understated table counts — repaired and verified; Document text inflates page oracle — repaired and verified; Print preference test passes with no handoff — repaired and verified; Active fetch masks independent input race — repaired and verified; Privacy oracle hides nested Error values — repaired and verified; One pixel misses copy-column overlap — repaired and verified; DOM fixture accepts nonexistent IDs — repaired and verified.

Rejected findings retain their reasons: pure `parseJson3` returning `[]` is an existing pure-library contract; the worker logs invalid/empty results at its call boundary. Adding logging to the pure parser was rejected in both rounds. Double decoding of the legacy XML feed is explicit in the existing contract and fixture; removing it would break that supported format, so the later generic-XML suggestion was rejected. The generator's hypothetical side-effect imports/exported bindings do not occur in any maintained source: the specific proposed syntax does not occur in maintained modules. This lightweight index extracts declared function exports and static `from` imports; it is not a complete ECMAScript or dynamic-dependency graph. The generated content is checked for reproducibility against the maintained source.

## 3. Verify gates

| Command/check | Baseline | After iteration 1 | After iteration 2 / final |
| --- | --- | --- | --- |
| `npm run check` | 31 tests; manifest and 22-entry index pass | 72 guarded Node tests pass; syntax/doc generation added | 114 cases pass; syntax, manifest and 31-entry generated docs/path checks pass |
| `npm run build` | 1.0.0 archive passes | 1.0.1 preflight/build passes | 1.0.1 archive passes with validated input and atomic replacement |
| JavaScript syntax | original sources pass | maintained source/test/tool syntax gate added | included in check and CI |
| Python syntax | original optional scripts parse | pass | CI compilation plus actual Pillow tests |
| Funding YAML | FAIL: unquoted `@` at line 5 | corrected supported keys/handles | FUNDING, CI and Dependabot YAML parse |
| Optional artwork suite | reviewer environment lacked Pillow; not counted as a passing baseline | three historical cases pass in disposable Pillow environment | four guarded cases pass on Pillow 13.0.0; dedicated fresh CI job |
| Follow-up bug regressions | N/A | affected old behavior retained centrally | 18 Node failures and one Pillow failure on old behavior, all green after fixes |
| Oracle/coverage mutants | N/A | strengthened initial oracles | expanded-panel, user-tab, prune-survivor and child-timeout mutants rejected |
| Native Chrome 157 synthetic fixture | public-video attempt returned `blocked`; live compatibility unproven | earlier panel fixture pass predates current guard | final guarded direct fetch/options/download/AX/Print/cleanup/wrapping pass; native panel navigation under guard unverified |

Final local and exact-head GitHub checks are recorded in the delivery receipt and PR. A successful archive or mocked test is not a live YouTube compatibility result.

## 4. Activated skills and evidence

- `repo-bootstrapper`: actual skill, audit/coding references and pinned mdb-tam standard; adapted to mature extension exceptions.
- `code-deep-optimizer`: actual 18-pass workflow, report/status/language/empirical references and convergence/severity contract.
- JavaScript/Python and software-engineering review, coding-standards and testing references: entrypoints, tooling and oracle quality.
- Chrome extension security/messaging/e2e references and security review: MV3 lifecycle, trusted text rendering, tab ownership, permissions and browser API wiring.
- Frontend routing guidance: extension UI remains under the Chrome-extension review scope.

Parent verified dependency/API facts once, not inside every reader. The [official Node schedule](https://github.com/nodejs/Release#release-schedule) supports removing EOL Node 20. Existing Actions v7 refs were checked against their official repositories and pinned by SHA. [PyPI Pillow](https://pypi.org/project/Pillow/13.0.0/) is the optional artwork dependency source. The font bounds were checked against the [PDFKit AFM data](https://github.com/foliojs/pdfkit/tree/master/lib/font/data): Helvetica regular maximum 1015 units and bold maximum 1000; this run commits numeric metrics, not font binaries or a new font license.

## 5. Per-file unified diff excerpts

Only maintained source/test/tool/config diffs appear below. Documentation and generated-artifact changes are described in the bootstrap ledger and full committed patch. Each excerpt is capped at 24 diff lines; blank context lines are normalized for Markdown. Full source inputs to reviewers were never truncated.

### `scripts/check-doc-indexes.mjs`

```diff
--- a/scripts/check-doc-indexes.mjs
+++ b/scripts/check-doc-indexes.mjs
@@ -15,8 +15,8 @@
  *   node scripts/check-doc-indexes.mjs --prune    # drop dead JSON entries
  */

-import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
-import { dirname, join, relative, resolve } from 'node:path';
+import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
+import { dirname, join, relative, resolve, isAbsolute, sep } from 'node:path';
 import { fileURLToPath } from 'node:url';

 const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
@@ -28,7 +28,7 @@
 const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', '.remember', 'icons']);

 /** Extensions the index is expected to cover. */
-const INDEXED_EXTENSIONS = ['.js', '.mjs', '.html', '.css', '.json'];
+const INDEXED_EXTENSIONS = ['.js', '.mjs', '.py', '.html', '.css', '.json', '.yml', '.yaml'];

 /** @type {string[]} */
 const problems = [];
@@ -44,7 +44,7 @@

```
Excerpt truncated: 24 of 113 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `scripts/check-syntax.mjs`

```diff
--- a/scripts/check-syntax.mjs
+++ b/scripts/check-syntax.mjs
@@ -0,0 +1,19 @@
+#!/usr/bin/env node
+/** Syntax-check every maintained JavaScript file without installing a linter. */
+import { readdirSync } from 'node:fs';
+import { dirname, join, resolve } from 'node:path';
+import { fileURLToPath } from 'node:url';
+import { execFileSync } from 'node:child_process';
+
+const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
+function check(directory) {
+  for (const entry of readdirSync(directory, { withFileTypes: true })) {
+    const path = join(directory, entry.name);
+    if (entry.isDirectory()) check(path);
+    else if (/\.(?:js|mjs)$/.test(entry.name)) {
+      execFileSync(process.execPath, ['--check', path], { stdio: 'inherit' });
+    }
+  }
+}
+for (const directory of ['src', 'scripts', 'test']) check(join(root, directory));
+console.log('JavaScript syntax OK — src/, scripts/, test/.');
```

### `scripts/compose-store-screenshots.py`

```diff
--- a/scripts/compose-store-screenshots.py
+++ b/scripts/compose-store-screenshots.py
@@ -27,6 +27,8 @@
 import pathlib
 import sys

+import warnings
+
 from PIL import Image, ImageDraw, ImageFilter, ImageFont

 ROOT = pathlib.Path(__file__).resolve().parent.parent
@@ -54,7 +56,8 @@
     try:
         return ImageFont.truetype(path, size)
     except OSError:
-        return ImageFont.load_default()
+        warnings.warn(f"Requested font {path} unavailable; using Pillow default at {size}px.", RuntimeWarning, stacklevel=2)
+        return ImageFont.load_default(size=size)


 def css_box(x: float, y: float, width: float, height: float) -> tuple[int, int, int, int]:
@@ -136,10 +139,10 @@
         y += 34

```
Excerpt truncated: 24 of 99 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `scripts/generate-doc-index.mjs`

```diff
--- a/scripts/generate-doc-index.mjs
+++ b/scripts/generate-doc-index.mjs
@@ -0,0 +1,77 @@
+#!/usr/bin/env node
+/** Refresh retrieval metadata and the existing llms.txt documentation snapshots. */
+import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
+import { dirname, join, relative, resolve, sep } from 'node:path';
+import { fileURLToPath } from 'node:url';
+
+const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
+const check = process.argv.includes('--check');
+const read = (path) => readFileSync(join(root, path), 'utf8');
+const canonical = (path) => relative(root, path).split(sep).join('/');
+const indexPath = 'docs/high_signal_file_index.json';
+const old = existsSync(join(root, indexPath)) ? JSON.parse(read(indexPath)) : { files: [] };
+const previous = new Map(old.files.map((entry) => [entry.path, entry]));
+function list(directory) {
+  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
+    if (entry.name.startsWith('.') || entry.name === '__pycache__') return [];
+    const path = `${directory}/${entry.name}`;
+    if (entry.isDirectory()) return list(path);
+    return /\.(?:js|mjs|py|html|css|yml|yaml)$/.test(entry.name) ? [path] : [];
+  });
+}
```
Excerpt truncated: 24 of 80 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `scripts/package-extension.mjs`

```diff
--- a/scripts/package-extension.mjs
+++ b/scripts/package-extension.mjs
@@ -8,7 +8,7 @@
  */

 import { execFileSync } from 'node:child_process';
-import { mkdirSync, readFileSync, rmSync } from 'node:fs';
+import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
 import { dirname, join, resolve } from 'node:path';
 import { fileURLToPath } from 'node:url';

@@ -25,12 +25,26 @@
 const { name: slug } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
 const archive = join(root, 'dist', `${slug}-${manifest.version}.zip`);

+// Check before touching the previous archive: zip can succeed while omitting inputs.
+for (const path of INCLUDED) {
+  let stats;
+  try { stats = statSync(join(root, path)); } catch { throw new Error(`Missing required package input: ${path}`); }
+  if ((path === 'src' || path === 'icons') ? !stats.isDirectory() : !stats.isFile()) {
+    throw new Error(`Invalid required package input: ${path}`);
+  }
+}
+execFileSync(process.execPath, [join(root, 'scripts/validate-manifest.mjs')], { stdio: 'inherit' });
```
Excerpt truncated: 24 of 44 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `scripts/validate-manifest.mjs`

```diff
--- a/scripts/validate-manifest.mjs
+++ b/scripts/validate-manifest.mjs
@@ -10,9 +10,10 @@
  * Exits non-zero on the first category of problem found.
  */

-import { readFileSync, existsSync } from 'node:fs';
-import { dirname, join, resolve } from 'node:path';
+import { readFileSync, existsSync, statSync, realpathSync } from 'node:fs';
+import { dirname, join, resolve, relative, isAbsolute, sep } from 'node:path';
 import { fileURLToPath } from 'node:url';
+import { inflateSync } from 'node:zlib';

 const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

@@ -37,13 +38,53 @@
  */
 function readPngSize(path) {
   const bytes = readFileSync(path);
+  const invalid = () => ({ width: -1, height: -1 });
   const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
-
-  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) {
-    return { width: -1, height: -1 };
```
Excerpt truncated: 24 of 174 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `src/background/service-worker.js`

```diff
--- a/src/background/service-worker.js
+++ b/src/background/service-worker.js
@@ -28,6 +28,9 @@

 /** Path of the injected transcript-panel reader, relative to the extension root. */
 const SCRAPER_FILE = 'src/content/scrape-transcript.js';
+
+/** Temporary tabs are excluded from reuse by other concurrent requests. */
+const OWNED_TAB_FRAGMENT = '#transcript-to-pdf-export';

 /**
  * Error carrying a stable machine-readable code alongside its message, so the
@@ -53,24 +56,30 @@
  *
  * @param {string} url
  * @param {object} [init]
- * @returns {Promise<Response>}
+ * @returns {Promise<{ok: boolean, status: number, body: string}>}
  */
 async function fetchWithTimeout(url, init = {}) {
+  const target = new URL(url);
+  if (target.protocol !== 'https:' || !['www.youtube.com', 'm.youtube.com'].includes(target.hostname) || target.username || target.password || target.port) {
+    throw new TranscriptError('caption-url', 'YouTube returned an unsupported caption address.');
+  }
```
Excerpt truncated: 24 of 232 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `src/content/scrape-transcript.js`

```diff
--- a/src/content/scrape-transcript.js
+++ b/src/content/scrape-transcript.js
@@ -17,11 +17,14 @@
   /** Matches "1:02" and "1:02:03" but not caption text. */
   const TIMESTAMP_PATTERN = /^\d{1,3}(?::\d{2}){1,2}$/;

-  /** Screen-reader duration labels that sit beside the timestamp. */
+  /** Rank metadata separately, while preserving captions with the same text shape. */
   const DURATION_LABEL_PATTERN = /^\d+\s+(?:second|minute|hour)s?$/i;

   /** Both generations of the per-cue element. */
   const SEGMENT_SELECTOR = 'transcript-segment-view-model, ytd-transcript-segment-renderer';
+  const visibleRows = () => [...document.querySelectorAll(SEGMENT_SELECTOR)].filter(
+    (row) => row.getClientRects().length > 0 && getComputedStyle(row).visibility !== 'hidden',
+  );

   /**
    * Polls for a condition instead of sleeping a fixed amount, so the common
@@ -92,92 +95,109 @@
     if (!button) return false;

     button.click();
-    return waitFor(() => Boolean(document.querySelector(SEGMENT_SELECTOR)), 8000);
+    return waitFor(() => visibleRows().length > 0, 8000);
```
Excerpt truncated: 24 of 180 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `src/lib/pdf.js`

```diff
--- a/src/lib/pdf.js
+++ b/src/lib/pdf.js
@@ -19,11 +19,18 @@
   556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
 ];

-/** Fallback width for anything outside the measured range. */
-const DEFAULT_WIDTH = 556;
-
-/** Bold glyphs run wider than regular; scale rather than ship a second table. */
-const BOLD_WIDTH_FACTOR = 1.08;
+/** Helvetica-Bold advance widths for the same WinAnsi ASCII range. */
+const HELVETICA_BOLD_WIDTHS = [
+  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
+  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
+  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
+  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
+  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
+  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
+];
+
+/** Conservative bound for Latin-1 glyphs outside the ASCII tables. */
+const DEFAULT_WIDTH = 1015;

```
Excerpt truncated: 24 of 153 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `src/lib/transcript.js`

```diff
--- a/src/lib/transcript.js
+++ b/src/lib/transcript.js
@@ -17,12 +17,11 @@

 /** Entities the legacy XML feed escapes. Order matters: `&amp;` runs last. */
 const XML_ENTITIES = [
-  [/&#39;/g, "'"],
+  [/&apos;/g, "'"],
   [/&quot;/g, '"'],
   [/&lt;/g, '<'],
   [/&gt;/g, '>'],
   [/&nbsp;/g, ' '],
-  [/&amp;/g, '&'],
 ];

 /**
@@ -49,7 +48,15 @@
   for (const [pattern, replacement] of XML_ENTITIES) {
     out = out.replace(pattern, replacement);
   }
-  return out;
+  out = out.replace(/&#(x[0-9a-f]+|\d+);/gi, (reference, value) => {
+    const code = value[0].toLowerCase() === 'x' ? Number.parseInt(value.slice(1), 16) : Number(value);
+    const valid = code === 9 || code === 10 || code === 13 ||
```
Excerpt truncated: 24 of 121 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `src/lib/youtube.js`

```diff
--- a/src/lib/youtube.js
+++ b/src/lib/youtube.js
@@ -120,7 +120,7 @@
  */
 export function extractJsonVar(html, varName) {
   const literal = String(varName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
-  const marker = new RegExp(`(?:var\\s+)?${literal}\\s*=\\s*\\{`);
+  const marker = new RegExp(`(?:^|[^\\w$])(?:var\\s+)?${literal}\\s*=\\s*\\{`);
   const match = marker.exec(html);
   if (!match) return null;

@@ -179,14 +179,16 @@
     }
   }

-  const tracks = (rawTracks ?? [])
-    .filter((track) => typeof track?.baseUrl === 'string')
+  const tracks = (Array.isArray(rawTracks) ? rawTracks : [])
+    .filter((track) => typeof track?.baseUrl === 'string' && typeof track.languageCode === 'string')
     .map((track) => ({
       baseUrl: track.baseUrl,
       languageCode: track.languageCode ?? '',
       name:
-        track.name?.simpleText ??
```
Excerpt truncated: 24 of 57 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `src/popup/popup.html`

```diff
--- a/src/popup/popup.html
+++ b/src/popup/popup.html
@@ -27,7 +27,7 @@

       <div class="options">
         <label class="option">
-          <select id="language" class="select" disabled>
+          <select id="language" class="select" aria-label="Transcript language" disabled>
             <option value="auto">Auto</option>
           </select>
         </label>
```

### `src/popup/popup.js`

```diff
--- a/src/popup/popup.js
+++ b/src/popup/popup.js
@@ -15,6 +15,11 @@

 /** Key used to hand the transcript to the printable viewer page. */
 const VIEWER_KEY = 'viewerPayload';
+
+/** Prevent stale in-flight replies from replacing a newer request. */
+let fetchSequence = 0;
+let interactionVersion = 0;
+let optionsTouched = false;

 const elements = {
   form: document.getElementById('fetch-form'),
@@ -33,7 +38,7 @@
   copy: document.getElementById('copy'),
 };

-/** @type {{videoId: string, title: string, author: string|null, language: string, isGenerated: boolean, availableLanguages: Array<{code: string, name: string, isGenerated: boolean}>, segments: Array<{start: number, duration: number, text: string}>}|null} */
+/** @type {{videoId: string, title: string, author: string|null, language: string, isGenerated: boolean|null, availableLanguages: Array<{code: string, name: string, isGenerated: boolean}>, segments: Array<{start: number, duration: number, text: string}>}|null} */
 let transcript = null;

 /**
@@ -119,8 +124,13 @@
```
Excerpt truncated: 24 of 220 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `src/viewer/viewer.css`

```diff
--- a/src/viewer/viewer.css
+++ b/src/viewer/viewer.css
@@ -34,6 +34,7 @@
 .hint { color: #5c6773; }

 .document {
+  overflow-wrap: anywhere;
   max-width: 42em;
   margin: 24px auto 60px;
   padding: 48px 56px;
```

### `src/viewer/viewer.html`

```diff
--- a/src/viewer/viewer.html
+++ b/src/viewer/viewer.html
@@ -7,7 +7,7 @@
   </head>
   <body>
     <div class="toolbar no-print">
-      <button id="print" class="print-button" type="button">Save as PDF / Print</button>
+      <button id="print" disabled class="print-button" type="button">Save as PDF / Print</button>
       <span class="hint">Choose “Save as PDF” as the destination.</span>
     </div>
     <main id="document" class="document"></main>
```

### `src/viewer/viewer.js`

```diff
--- a/src/viewer/viewer.js
+++ b/src/viewer/viewer.js
@@ -51,21 +51,36 @@
   container.append(fragment);
 }

-document.getElementById('print').addEventListener('click', () => window.print());
+const printButton = document.getElementById('print');
+let ready = false;
+printButton.disabled = true;
+printButton.addEventListener('click', () => { if (ready) window.print(); });

 (async () => {
-  const stored = await chrome.storage.session.get(VIEWER_KEY);
-  const payload = stored[VIEWER_KEY];
-
+  const requested = new URLSearchParams(location.search).get('payload');
+  const key = requested ?? VIEWER_KEY;
+  if (key !== VIEWER_KEY && !key.startsWith(`${VIEWER_KEY}:`)) {
+    throw new Error('Invalid print handoff.');
+  }
+  const stored = await chrome.storage.session.get(key);
+  const payload = stored[key];
   if (!payload) {
```
Excerpt truncated: 24 of 49 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `test/content-script.test.js`

```diff
--- a/test/content-script.test.js
+++ b/test/content-script.test.js
@@ -0,0 +1,132 @@
+import assert from 'node:assert/strict';
+import { test } from 'node:test';
+import { readFileSync } from 'node:fs';
+import vm from 'node:vm';
+
+const source = readFileSync(new URL('../src/content/scrape-transcript.js', import.meta.url), 'utf8');
+function leaf(text) { return { textContent: text, children: [], getAttribute: () => null }; }
+function row({ timestamp = '0:05', caption = 'Hello', named = false, emptyAttributed = false, durationLabel = null, durationAfter = false, hidden = false } = {}) {
+  const stamp = leaf(timestamp);
+  const text = leaf(caption);
+  const attributed = emptyAttributed ? leaf('') : null;
+  return {
+    getClientRects: () => hidden ? [] : [{}],
+    querySelector: (selector) => selector === '.segment-timestamp' ? (named ? stamp : null)
+      : selector === '.segment-text' ? (named ? text : null) : attributed,
+    querySelectorAll: () => [stamp, ...(durationLabel && !durationAfter ? [leaf(durationLabel)] : []), ...(attributed ? [attributed] : []), text, ...(durationLabel && durationAfter ? [leaf(durationLabel)] : [])],
+  };
+}
+async function scrape(rows) {
+  const warnings = [];
+  let clicks = 0;
```
Excerpt truncated: 24 of 135 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `test/pdf.test.js`

```diff
--- a/test/pdf.test.js
+++ b/test/pdf.test.js
@@ -22,12 +22,22 @@
   const lines = text.slice(Number(startxref[1])).split('\n');
   assert.equal(lines[0], 'xref');

+  assert.match(lines[1], /^0 [1-9]\d*$/);
   const entryCount = Number(lines[1].split(' ')[1]);
+  assert.ok(Number.isSafeInteger(entryCount) && entryCount > 1);
+  assert.ok(lines.length >= entryCount + 2);
+  assert.equal(lines[2], '0000000000 65535 f ');
+  assert.equal(lines[2 + entryCount], 'trailer');
+  const size = /\/Size\s+(\d+)\b/.exec(lines[3 + entryCount] ?? '');
+  assert.ok(size);
+  assert.equal(Number(size[1]), entryCount);
+  let pageCount = 0;
   for (let id = 1; id < entryCount; id += 1) {
     const entry = lines[2 + id];
-    if (entry.endsWith('f ')) continue;
+    assert.match(entry, /^\d{10} 00000 n $/);

     const offset = Number(entry.split(' ')[0]);
+    if (/^\d+ 0 obj\n<< \/Type \/Page(?=[\s/])/.test(text.slice(offset))) pageCount += 1;
     assert.ok(
```
Excerpt truncated: 24 of 161 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `test/popup.test.js`

```diff
--- a/test/popup.test.js
+++ b/test/popup.test.js
@@ -0,0 +1,212 @@
+import assert from 'node:assert/strict';
+import { test } from 'node:test';
+import { setImmediate as nextTurn } from 'node:timers/promises';
+
+class Element {
+  children = [];
+  listeners = new Map();
+  dataset = {};
+  value = '';
+  checked = true;
+  disabled = false;
+  hidden = true;
+  set textContent(value) { this.text = String(value); this.children = []; }
+  get textContent() { return (this.text ?? '') + this.children.map((child) => child.textContent ?? '').join(''); }
+  append(...children) { this.children.push(...children); }
+  addEventListener(name, callback) { this.listeners.set(name, callback); }
+  focus() {}
+  select() {}
+}
+const transcript = {
+  videoId: 'abcdefghijk', title: 'Fixture', author: 'Fixture author', language: 'en', isGenerated: false,
```
Excerpt truncated: 24 of 215 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `test/service-worker.test.js`

```diff
--- a/test/service-worker.test.js
+++ b/test/service-worker.test.js
@@ -0,0 +1,184 @@
+import assert from 'node:assert/strict';
+import { test } from 'node:test';
+import { inspect } from 'node:util';
+import { setImmediate as nextTurn } from 'node:timers/promises';
+
+const videoId = 'abcdefghijk';
+const track = { baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`, languageCode: 'en', name: { simpleText: 'English' } };
+const watchPage = (tracks = [track]) => `var ytInitialPlayerResponse = ${JSON.stringify({
+  videoDetails: { title: 'Fixture', author: 'Fixture author' },
+  captions: { playerCaptionsTracklistRenderer: { captionTracks: tracks } },
+  playabilityStatus: { status: 'OK' },
+})};`;
+const captions = JSON.stringify({ events: [{ tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: 'Fixture caption' }] }] });
+let instance = 0;
+const formatLogArguments = (args) => inspect(args, { depth: null, maxStringLength: null, maxArrayLength: null });
+
+async function worker(t, { fetchImpl, tabs = {}, executeScript } = {}) {
+  const previousChrome = globalThis.chrome;
+  t.after(() => { if (previousChrome === undefined) delete globalThis.chrome; else globalThis.chrome = previousChrome; });
+  const logs = [];
+  for (const level of ['info', 'warn', 'error']) t.mock.method(console, level, (...args) => logs.push({ level, args }));
```
Excerpt truncated: 24 of 187 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `test/store_assets_test.py`

```diff
--- a/test/store_assets_test.py
+++ b/test/store_assets_test.py
@@ -0,0 +1,51 @@
+"""Optional Pillow checks. Run with python -m unittest discover -s test -p '*_test.py'."""
+import pathlib
+import runpy
+import tempfile
+import unittest
+from PIL import Image
+
+ROOT = pathlib.Path(__file__).resolve().parent.parent
+
+
+class CaptureGeometryTests(unittest.TestCase):
+    def setUp(self):
+        self.temporary = tempfile.TemporaryDirectory(prefix="transcript-assets-")
+        self.addCleanup(self.temporary.cleanup)
+        self.assets = pathlib.Path(self.temporary.name)
+        self.module = runpy.run_path(str(ROOT / "scripts/compose-store-screenshots.py"))
+        self.globals = self.module["build_popup_shot"].__globals__
+        self.globals["ASSETS"] = self.assets
+
+    def test_missing_font_retains_requested_size_and_reports_fallback(self):
+        with self.assertWarnsRegex(RuntimeWarning, "font"):
```
Excerpt truncated: 24 of 54 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `test/tooling.test.js`

```diff
--- a/test/tooling.test.js
+++ b/test/tooling.test.js
@@ -0,0 +1,295 @@
+import assert from 'node:assert/strict';
+import { test } from 'node:test';
+import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, symlinkSync, readdirSync } from 'node:fs';
+import { rmSync } from 'node:fs';
+import { tmpdir } from 'node:os';
+import { join, basename } from 'node:path';
+import { spawnSync } from 'node:child_process';
+
+const root = new URL('../', import.meta.url);
+function fixture(t, script) {
+  const directory = mkdtempSync(join(tmpdir(), 'transcript-tooling-'));
+  t.after(() => rmSync(directory, { recursive: true, force: true }));
+  mkdirSync(join(directory, 'scripts'));
+  cpSync(new URL(`scripts/${script}`, root), join(directory, 'scripts', script));
+  return directory;
+}
+function run(directory, script, args = [], timeoutMs = 5000) {
+  const result = spawnSync(process.execPath, [join(directory, 'scripts', script), ...args], {
+    encoding: 'utf8', timeout: timeoutMs,
+  });
+  if (result.error) throw new Error(`Tool subprocess failed: ${script}`, { cause: result.error });
```
Excerpt truncated: 24 of 298 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `test/transcript.test.js`

```diff
--- a/test/transcript.test.js
+++ b/test/transcript.test.js
@@ -79,7 +79,7 @@

   const paragraphs = groupIntoParagraphs(segments, { maxChars: 100 });
   assert.ok(paragraphs.length > 1);
-  assert.ok(paragraphs.every((paragraph) => paragraph.text.length < 200));
+  assert.ok(paragraphs.every((paragraph) => paragraph.text.length <= 100 + 20));
 });

 test('renderText honours the timestamp and paragraph options', () => {
@@ -91,3 +91,60 @@
   assert.equal(renderText(segments, { timestamps: true, paragraphs: true }), '[0:00] one\n\n[1:05] two');
   assert.equal(renderText(segments, { timestamps: false, paragraphs: false }), 'one\n\ntwo');
 });
+
+test('malformed JSON timings stay finite and nonnegative', () => {
+  const segments = parseJson3(JSON.stringify({ events: [
+    { tStartMs: 'bad', dDurationMs: -100, segs: [{ utf8: 'fixture' }] },
+    { tStartMs: -10, dDurationMs: 'Infinity', segs: [{ utf8: 'second' }] },
+  ] }));
+  assert.deepEqual(segments.map(({ start, duration }) => [start, duration]), [[0, 0], [0, 0]]);
+  assert.equal(formatTimestamp(Infinity), '0:00');
+});
```
Excerpt truncated: 24 of 72 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `test/viewer.test.js`

```diff
--- a/test/viewer.test.js
+++ b/test/viewer.test.js
@@ -0,0 +1,89 @@
+import assert from 'node:assert/strict';
+import { test } from 'node:test';
+import { readFileSync } from 'node:fs';
+import vm from 'node:vm';
+
+const source = readFileSync(new URL('../src/viewer/viewer.js', import.meta.url), 'utf8');
+const payload = { title: 'Fixture', subtitleLines: ['Synthetic'], blocks: [{ text: 'First fixture caption' }] };
+function element() {
+  return { children: [], ownText: '',
+    get textContent() { return this.ownText + this.children.map((node) => node.textContent).join(''); },
+    set textContent(value) { this.ownText = String(value ?? ''); this.children = []; },
+    append(...children) { this.children.push(...children); }, listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } };
+}
+async function view({ search = '', values = {}, getError = false, removeError = false, getImpl, onPending } = {}) {
+  const container = element();
+  const printButton = element();
+  let prints = 0;
+  const removed = [];
+  const warnings = [];
+  const chrome = { storage: { session: {
+    get: getImpl ?? (async (key) => { if (getError) throw Error('fixture get failed'); return { [key]: values[key] }; }),
```
Excerpt truncated: 24 of 92 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `test/youtube.test.js`

```diff
--- a/test/youtube.test.js
+++ b/test/youtube.test.js
@@ -107,7 +107,7 @@
 });

 test('extractJsonVar treats the variable name as a literal, not a pattern', () => {
-  const html = 'var a.b = {"hit":true}; var axb = {"hit":false};';
+  const html = 'var axb = {"hit":false}; var a.b = {"hit":true};';
   assert.equal(extractJsonVar(html, 'a.b').hit, true);
 });

@@ -115,3 +115,22 @@
   const html = '"captionTracks":[{"baseUrl":"https://x.test/a\\u0026sig=1\\u0026k=2","languageCode":"en"}]';
   assert.equal(parseWatchPage(html).tracks[0].baseUrl, 'https://x.test/a&sig=1&k=2');
 });
+
+test('malformed caption track shapes fail closed without crashing', () => {
+  for (const captionTracks of [{}, 'not-an-array', [null, { baseUrl: 'a', languageCode: {} }]]) {
+    const player = { captions: { playerCaptionsTracklistRenderer: { captionTracks } } };
+    const page = parseWatchPage(`var ytInitialPlayerResponse = ${JSON.stringify(player)};`);
+    assert.deepEqual(page.tracks, []);
+  }
+});
+
```
Excerpt truncated: 24 of 34 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `manifest.json`

```diff
--- a/manifest.json
+++ b/manifest.json
@@ -1,7 +1,7 @@
 {
   "manifest_version": 3,
   "name": "Transcript to PDF for YouTube",
-  "version": "1.0.0",
+  "version": "1.0.1",
   "description": "Fetches the transcript of any YouTube video from its URL and exports it as a formatted PDF file.",
   "minimum_chrome_version": "116",
   "icons": {
```

### `package.json`

```diff
--- a/package.json
+++ b/package.json
@@ -1,20 +1,22 @@
 {
   "name": "youtube-transcript-to-pdf",
-  "version": "1.0.0",
+  "version": "1.0.1",
   "description": "Chrome extension that fetches a YouTube video transcript from its URL and exports it as a PDF.",
   "type": "module",
   "private": true,
   "license": "MIT",
   "engines": {
-    "node": ">=20"
+    "node": ">=22"
   },
   "scripts": {
     "test": "node --test",
     "lint:manifest": "node scripts/validate-manifest.mjs",
-    "lint:docs": "node scripts/check-doc-indexes.mjs",
-    "check": "npm run lint:manifest && npm test && npm run lint:docs",
+    "lint:docs": "node scripts/generate-doc-index.mjs --check && node scripts/check-doc-indexes.mjs",
+    "check": "npm run lint:syntax && npm run lint:manifest && npm test && npm run lint:docs",
     "build": "node scripts/package-extension.mjs",
-    "store:assets": "node scripts/build-store-assets.mjs"
```
Excerpt truncated: 24 of 30 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

### `.github/workflows/ci.yml`

```diff
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -20,17 +20,23 @@
     strategy:
       fail-fast: false
       matrix:
-        node: ['20', '22', '24']
+        node: ['22', '24', '26']

     steps:
-      - uses: actions/checkout@v7
+      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7

-      - uses: actions/setup-node@v7
+      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7
         with:
           node-version: ${{ matrix.node }}

       # The extension has no runtime or dev dependencies, so there is nothing
       # to install — every script runs on the Node standard library alone.
+      - name: Check JavaScript syntax
+        run: npm run lint:syntax
+
+      - name: Check optional Python tool syntax
```
Excerpt truncated: 24 of 67 diff lines. Full source was supplied to reviewers; the committed patch contains the full change.

## 6. Blind re-audit and bounded residuals

Attempt 1: complete 31-unit accounting after resuming quota-ended contexts; 22 corroborated Medium findings caused one follow-up batch. Attempt 2: seven complete target/caller-content matches reused and 24 fresh contexts. All substantive JSONL messages are collected; final-message hook recaps are not treated as the review. Only completed, hash-matching reports are reusable. Failed quota readers are incomplete.

Final state: **BLIND-AUDIT-DISSENT**. Pruning drops invalid entries with metadata — repaired and verified; Overview skips punctuation-bearing paths — repaired and verified; Leading-zero version components accepted — repaired and verified; String action icons falsely rejected — repaired and verified; Universal-host patterns evade narrow-host guard — repaired and verified; Incomplete metadata blocks usable panel — repaired and verified; Navigation errors lose their code and guidance — repaired and verified; Caption-shaped timestamp is mistaken for timing — repaired and verified; Structural fallback loses fragments — repaired and verified; JSON field objects can throw during coercion — repaired and verified; Single-quoted XML attributes lose timing — repaired and verified; XML numeric/apos references remain encoded — repaired and verified; Wrapping rescans complete prefixes quadratically — repaired and verified; Primary popup I/O failures lack safe diagnostics — repaired and verified; Xref oracle accepts understated table counts — repaired and verified; Document text inflates page oracle — repaired and verified; Print preference test passes with no handoff — repaired and verified; Active fetch masks independent input race — repaired and verified; Privacy oracle hides nested Error values — repaired and verified; One pixel misses copy-column overlap — repaired and verified; DOM fixture accepts nonexistent IDs — repaired and verified

The second dissent ended the independent optimizer gate. One bounded delivery-repair batch applied the remaining corroborated findings and received parent review across the 18 applicable passes plus targeted/full checks. No third blind attempt ran. Post-gate repaired bytes are identified in the coverage table; parent source review and regression checks do not substitute for an independent blind pass. Cross-model review was not requested. Native panel navigation under the host egress guard and current live YouTube markup remain unverified.

## 7. Recommendations

N/A: `--suggest` was not requested. No advisory items were mixed into fix counts.

## 8. Implemented features

N/A: `--implement-features` was not requested. Changes repair behavior and verification/documentation gaps.

## 9. Summary

Iterations: 3 of maximum 5, including bounded delivery repairs · Active passes: all 18 considered with reasoned per-file N/A/partial rows · Profile: full repo, uncapped · Final known C/H/M: 0/0/0; low/nit skipped · Verify: PASS (local; exact-head CI required for shipping) · Status: BLIND-AUDIT-DISSENT

## 10. Snapshot and rollback

Run from a deliberately selected rollback checkout of this repository. This restores the pre-run file snapshot, not unrelated later work. Review the diff before committing a rollback. After delivery, prefer a normal revert PR when later work depends on this change.

```sh
cp -R "$HOME/.claude/skill-consolidation/backups/youtube-transcript-to-pdf-20261112T1025Z/original/." .
rm -- 'docs/MCP.md'
rm -- 'docs/code-deep-optimizer-2026-11-12.md'
rm -- 'docs/maintenance-coverage-2026-11-12.md'
rm -- 'docs/repo-bootstrap-audit-2026-11-12.md'
rm -- 'docs/wiki/index.md'
rm -- 'scripts/check-syntax.mjs'
rm -- 'scripts/generate-doc-index.mjs'
rm -- 'test/content-script.test.js'
rm -- 'test/popup.test.js'
rm -- 'test/service-worker.test.js'
rm -- 'test/store_assets_test.py'
rm -- 'test/tooling.test.js'
rm -- 'test/viewer.test.js'
```

The central snapshot also contains `iter1/`, `iter2/`, optional final-repair snapshots, original SHA-256 inventory, and append-only `run-stub.jsonl`. No semantic index or model store is part of this rollback.

## 11. Index

index: n/a (outside semantic corpus roots). No semantic-indexing or embedding command was invoked by this workflow. Existing filesystem retrieval artifacts are refreshed by `npm run docs:generate` and verified by `npm run lint:docs`.

## 12. Memory-central

memory-central: none for youtube-transcript-to-pdf. Existing bootstrap decisions and Stele task constraints were consulted; separate anchored records preserve the body-timeout, panel-language and navigation risks. Codex memory files were not edited. Historical baseline tests preceded the current isolation controls and are not evidence of no semantic-dispatch effects.

<!-- {% endraw %} -->

# Maintenance coverage — 2026-11-12

Scope: only `mithudso/youtube-transcript-to-pdf`, from fetched `origin/main` at `bc2c992`. No file cap, changed-only filter, quick mode, nested fan-out or empirical score was used.

## Maintained source universe

31 fresh-context review units: 11 runtime/UI files, eight developer tools, nine test files, and manifest/package/CI. Initial baseline had 23 units; eight tools/tests were added and included in the complete follow-up coverage. Every review received its full target plus necessary local callers, Stage 0.5 and all 18 pass names. At most two diagnostic contexts ran concurrently. Readers used no web, Stele, skill rediscovery or tool fan-out. Parent verification owns API, dependency, integration and test evidence.

The initial 23 reviews completed. Blind attempt 1 stopped at quota after six completed units; the quota-ended contexts were incomplete, even where a substantive message existed. All JSONL agent messages were collected, including substantive messages before Stop-hook recaps. Six complete target-hash-matching units were reused; remaining contexts resumed in new read-only contexts. The completed round covers all 31 units. Attempt 2 reuses seven complete reports whose full target/caller content still matches; 24 units receive fresh contexts. Two attempts is the hard limit. No third attempt is implied by delivery repairs.

| File | Initial review | Blind 1 | Blind 2 | Final-byte SHA-256 / independent match |
| --- | --- | --- | --- | --- |
| `scripts/build-store-assets.mjs` | complete | complete | complete | `8808749e25a46c63d1e6a758913e5d76b8dec6af0d1a0fcc34a3b4397e5aad36`; yes |
| `scripts/check-doc-indexes.mjs` | complete | complete | complete | `92f47b48432b40a63589c7bee5a7625d89880f30b4ba5a2e3b2893661ceefc95`; repaired after final blind context; parent verification only |
| `scripts/check-syntax.mjs` | added; covered in blind 1 | complete | complete (reused) | `1027b7902822b09e2b4ec1b12d05b8b6279c619e4f38b94fc7472b416d7097a2`; yes |
| `scripts/compose-store-screenshots.py` | complete | complete | complete | `543db00be2b38eac5a670a1648f07e03e4e537e5794c33530b4679f11e85507e`; repaired after final blind context; parent verification only |
| `scripts/generate-doc-index.mjs` | added; covered in blind 1 | complete | complete (reused) | `69fb7429eaa79f3045fa8ebc8bc1a064152c8785838f1f3e74844201f1d4866d`; yes |
| `scripts/generate-icons.py` | complete | complete | complete (reused) | `8c401f99eb841fb90e363c177b80168ce831485eb4bd365eb0de8da6520a83d4`; yes |
| `scripts/package-extension.mjs` | complete | complete | complete | `51d896f1676b8bcd76ec4433d8955e3d0b21f52d69df521755555feac28ba82e`; yes |
| `scripts/validate-manifest.mjs` | complete | complete | complete | `5e9acc4850ed9ede1e396972835366c662b5c688cb47075090db53f157334169`; repaired after final blind context; parent verification only |
| `src/background/service-worker.js` | complete | complete | complete | `d9f124e434048256d0e05696be644997fe1f6764b4ebc8d8062e608670d027e0`; repaired after final blind context; parent verification only |
| `src/content/scrape-transcript.js` | complete | complete | complete | `a0321c43c9b19b9712b3ef60cdb7369f215f989165f1f980defaa896ba4894a0`; repaired after final blind context; parent verification only |
| `src/lib/pdf.js` | complete | complete | complete | `6640ffe9b00428f7db7c40a4bb267406ec5c3ac46f750f92a78100d7df377694`; repaired after final blind context; parent verification only |
| `src/lib/transcript.js` | complete | complete | complete | `55ea7f73f6cc9bd99dd25589a67cec46766981d286c5e94f113d7781ce58b3b5`; repaired after final blind context; parent verification only |
| `src/lib/youtube.js` | complete | complete | complete (reused) | `fe6c816283292ecfc6e15153a53a4ffbb983b3ad7db6d33043c5607bff23521a`; yes |
| `src/popup/popup.css` | complete | complete | complete | `5d23a215ce19b52f638b8034c766a5d3e1eb3bda89c76ca5178590e1ea76a7f8`; yes |
| `src/popup/popup.html` | complete | complete | complete | `a0b9c668d6c1026874c6bb12f58145abf460972bbfc3557e84e5fab4fb7a4cc2`; yes |
| `src/popup/popup.js` | complete | complete | complete | `c7a5e2c16a382f9bd546cd3e9dc9c90d602e4babc99f71000da9cd856c5a0b32`; repaired after final blind context; parent verification only |
| `src/viewer/viewer.css` | complete | complete | complete | `eef0a70fa6d0e0f89fa2ff34b4b2401236e73689553f37c71f355e568992a2e7`; yes |
| `src/viewer/viewer.html` | complete | complete | complete | `1810d350999bcd20d377da0a7d3aa978f11178ff88ddd7ae6a73b11c82536d8b`; yes |
| `src/viewer/viewer.js` | complete | complete | complete | `9cb7276170c983e7af09a26c5895749d1591598b04c67f57364a000ece251301`; yes |
| `test/content-script.test.js` | added; covered in blind 1 | complete | complete | `20587cfb06f12ae764f386f4753d369b4bf1089c9185b522c0a67dbf5f5ce282`; repaired after final blind context; parent verification only |
| `test/pdf.test.js` | complete | complete | complete | `8cc188b7f6425c30ab61ff458139b135a8e4188b269682897ec2ba3ceaf0d1dc`; repaired after final blind context; parent verification only |
| `test/popup.test.js` | added; covered in blind 1 | complete | complete | `fae1ce41c7a5b28e20b6a2b504d1940a66feb59bf8872c38b622d077d8eb9728`; repaired after final blind context; parent verification only |
| `test/service-worker.test.js` | added; covered in blind 1 | complete | complete | `5bac602ea833db562674251edec53f76e82ab182a5f699ffba84abe2c89ed293`; repaired after final blind context; parent verification only |
| `test/store_assets_test.py` | added; covered in blind 1 | complete | complete | `839079f87c030b593d21b46bf022edce951025a5916fc1d7af4e8d826ac06712`; repaired after final blind context; parent verification only |
| `test/tooling.test.js` | added; covered in blind 1 | complete | complete | `b0dbd32de912a2799db9966e32869431fef8fc1d4ba39b5224dbdac4a8a43238`; repaired after final blind context; parent verification only |
| `test/transcript.test.js` | complete | complete | complete | `75ce78b2d6fa653e92f912b0952b3988bc703bd920582b24b5918e69d6c843f6`; repaired after final blind context; parent verification only |
| `test/viewer.test.js` | added; covered in blind 1 | complete | complete | `f2ceb99606ac9aae453351db0f7eda7ca7121ecbe5b5b273b5bed119984d0512`; repaired after final blind context; parent verification only |
| `test/youtube.test.js` | complete | complete | complete (reused) | `0119af403f6dbffc58e4fddd4090c1f85de52c3d8d7e68a5476b8c62b119b9bd`; yes |
| `manifest.json` | complete | complete | complete (reused) | `da54871790ba46e13ddcd514254a40ab4f7bb7c8baae984afbd911f2d73c75f1`; yes |
| `package.json` | complete | complete | complete (reused) | `64324194fbd41e6d1cb536d11524690951564d2c04cf20a8fe0486d5b2ab4f25`; yes |
| `.github/workflows/ci.yml` | complete | complete | complete | `a2f78df355ae6fab573dc8641918affee95dce8cee3b302cd3e38e13161501fc`; yes |

## All 18 passes and parent evidence

| Pass | Evidence / applicability |
| --- | --- |
| C1 Correctness | Full runtime/tool/CI reads and behavioral red-to-green regressions |
| C2 Contracts | Worker/popup/viewer handoff and pure-library callers checked; native API fixture supplements doubles |
| C3 Adversarial | Malformed metadata/XML/PNG/PDF, out-of-order replies, tab ownership/navigation, filesystem counterexamples and oracle mutants |
| S1 Security | Stage 0.5 per context; safe text rendering, PDF escaping, URL allowlist, redirect policy, safe logs and fixed manifest privileges |
| S2 Errors/resources | Body timer, tab cleanup, payload cleanup, download URL/listener cleanup, failed artifact preservation and subprocess deadlines |
| S3 Validation | Identifiers, timing, geometry, paths, PNG/version/icon declarations and language metadata |
| S4 Portability/runtime | Node 22/24/26 CI; Chrome 116 API floor; portable filenames/paths; optional Pillow fallback |
| S5 Observability | Stable browser codes/counts and CLI diagnostics; pure modules retain return-value contracts |
| P1 Performance | Forward-only malformed-XML scan; bounded polling; no invented benchmark or measured speed claim |
| P2 Concurrency | Request ordering, owned tabs, navigation rejection, unique Print keys and isolated archive output |
| M1 Standards | Readability, constants and repository conventions checked in every applicable unit |
| M2 Simplification | Parent cross-file boundary/duplication sweep; pure libraries shared by UI and worker; no unnecessary abstraction added |
| M3 Architecture | Browser-only MV3 boundaries preserved; no chrome APIs in pure libraries; no server or datastore invented |
| M4 Documentation | Maintained docs/wiki, API guide, runbooks, indexes and source snapshots reconciled; old audit retained as history |
| T1 Tests | Actual shipping entrypoints exercised; strengthened oracles, meaningful counterexamples and mutation checks; no numeric threshold invented |
| T2 Supply chain | Zero npm dependencies preserved; optional existing Pillow 13.0.0 checked against PyPI; official Node schedule and action refs verified once by parent |
| T3 Tooling | All-JS syntax, manifest, generated-doc/path checks, supported-runtime CI, optional artwork job and packaging gates |
| T4 Suite performance | Node runs files in parallel; global fixtures remain sequential per file; deterministic timers and small mutable fixtures retained |

N/A/partial rows in the per-file reports are scoped honestly: static CSS/JSON have no runtime error handling; non-test files have no T4 suite behavior; repo-only M3/T2/T3 stay parent-owned. A static reviewer report is never evidence that a runtime test ran.

## Reasoned exclusions and remaining surfaces

- `icons/*.png` and PNG/JPEG/PDF store assets are generated binary artwork, not hand-maintained code. Existing files are preserved. The icon validator checks packaged icons; synthetic image tests check the composer. No screenshot recapture or installed extension activation occurred.
- `store-assets/harness-popup.html` and `harness-viewer.html` are generated snapshots emitted by the reviewed `build-store-assets.mjs`. Their generator is reviewed; snapshots remain historical artwork inputs and were not silently counted as maintained runtime sources.
- `store-assets/sample-transcript.json` is explicitly authored synthetic data. Its schema and generator use were inspected; it is not customer data or a real transcript.
- `llms*.txt` and `docs/high_signal_file_index.json` are generated retrieval artifacts, regenerated from reviewed local sources and checked for exact drift. This is filesystem documentation generation, not semantic indexing or embedding.
- All remaining tracked text/configuration, including editor settings, funding, owners, issue/PR/security policies, licensing and every maintained documentation page, received the parent bootstrap/source-consistency audit. Existing LICENSE is preserved; no new license grant or response SLA was introduced.
- `.git`, ignored `dist`, Python caches, scratch browser profiles, review prompts/messages and the batch tooling/venv are local artifacts, not shipped maintained sources. Reports and recovery metadata remain outside the repository except these public audit summaries.

## Verification scope and residuals

Final known test count: 114 Node cases and four optional Pillow cases. See [testing](TESTING.md) for commands, isolation evidence and browser limits. Optimizer status: **BLIND-AUDIT-DISSENT**. A bounded dissent status remains even after deterministic repairs; it does not become CLEAN without another independent gate, which this run does not permit. Live current YouTube compatibility is not established. No store submission or live app deployment is part of this task.

# WebKit PNG fallback: independent validation

Date: 2026-10-15. Decision: **keep the native WebGL alternative research-only**. No fallback, palette algorithm, UI control or default was changed in production by this investigation.

Native `HTMLImageElement` upload to a texture, framebuffer attachment and RGBA byte readback can preserve the tested translucent PNG colors without the existing bitmap/canvas round trip. That is useful proof, but it does not satisfy the responsiveness gate: the final streamed helper exposed repeated synchronous context creation stalls of 139–141 ms in Windows Playwright WebKit even for a tiny image. Adding posted tasks before a native call cannot interrupt that call. Actual Safari/iOS remains untested.

## What was investigated

The first alternative considered was a narrowly scoped PNG pixel decoder. Its predeclared gates included signature/chunk bounds, CRC/order validation, bounded inflate, filters, straight alpha, profile/animation rejection and cancellation. [The independent fixture generator](../../bench/webkit-fallback-validation-fixtures.mjs) retains 59 cases: eight exact authored RGBA examples and 51 invalid or unsupported variants. Sharp independently confirms every authored byte in the eight positives, including all five PNG row filters, legal consecutive/split/empty IDAT chunks, untagged data and physical density metadata. [The fixture self-check](../../bench/webkit-fallback-validation-fixtures-self-check.json) records that limited result.

**Those 59 policy labels are not native WebGL acceptance assertions.** They describe the abandoned custom pixel decoder proposal. No custom inflate/filter/CRC implementation was introduced. Native decoding may tolerate a damaged CRC, as it did before; the GL research preserves browser ownership of PNG pixels and malformed-data handling. The huge declared geometry is a metadata-only adversary, never a native allocation experiment.

The tested research helper instead uses browser image decoding and a strict metadata eligibility gate: static noninterlaced RGBA8, with only IHDR, IDAT, IEND and optional sRGB/pHYs chunks. It declines profiles, gamma/chromaticity/cICP, EXIF, APNG, other pixel formats and unknown chunks. It also declines files over 32 MiB or attempts over 16 Mi pixels. Those are limits on this optional experiment, not new app import limits. Declines keep the existing browser path; they do not imply the PNG is invalid.

The final helper is [the streamed research candidate](../../bench/webkit-fallback-candidate-gl.mjs), SHA256 `509a2b869ffead7f0d9f2ff5ad038c8b2cce032adbfc62b7f8f982613f511279`, with [metadata reader](../../bench/webkit-fallback-candidate-stream-reader.mjs), SHA256 `82dfb70589cb068c3c7fbe0e162445af97f8d6d8ffb393c08ccd7993e8fc0f7b`. Neither is imported by the shipping application.

## A caught scanner regression

The initial metadata reader used many `File.slice().arrayBuffer()` calls and a 255 scanned-chunk cap. An ordinary Sharp-generated 1 Mi-pixel PNG contained 416 IDAT chunks, so it spent 88–101 ms scanning and then declined. This was a real counterexample to the first eligibility design, not a PNG format failure. [The initial Codex receipt](../../bench/webkit-fallback-validation-codex-initial-native.json) and [slice baseline source](../../bench/webkit-fallback-candidate-slice-baseline.mjs) preserve it.

The final research reader consumes `File.stream()` incrementally, retains one input chunk, skips compressed payload through views, bounds input/header work, and cancels/releases the reader on exit. The same stress PNG is accepted and exact in the final Windows Chromium and Android runs. This repairs the research scanner's needless overhead; it does not remove the separately measured WebKit GL context stall.

## Independent failure and resource checks

[The fault-injection runner](../../bench/webkit-fallback-validation-resources.mjs) exercises the actual research helper with owned PNG bytes and fake native image/GL boundaries. [All 20 final checks pass](../../bench/webkit-fallback-validation-resources.json). The receipt records both helper and imported-reader hashes.

Coverage includes exact straight RGBA at alpha 0/1/64/127/128/192/254/255; absent/lost GL, texture-size refusal, allocation failures, bad framebuffer, GL/read/image failures; authoritative dimension validation; natural-dimension mismatch; source-size refusal before reading; unsupported metadata before DOM/GPU; cancellation before work, during pending metadata read, after metadata before context creation, during image loading and after the first bounded read stripe. It checks owned URL revocation, image detachment, created texture/framebuffer deletion, canvas release, and metadata reader cancellation/lock release. The read-stripe abort is injected at the first read; it establishes publication/resource behavior, not a claim that an individual synchronous GPU call can be interrupted.

These are deterministic contract tests, not actual browser color or GPU performance proof. The older 16/18-check slice receipts remain historical snapshots rather than being relabeled as the final 20 checks.

## Actual browser and phone evidence

[The standalone page](../../bench/webkit-fallback-validation-probe.mjs) and [separate loopback server](../../bench/webkit-fallback-validation-server.mjs) compare the unmodified production decoder, direct research helper, an explicitly forced ImageDecoder-absent production control, and the old bitmap/canvas route. Each run captures dependency hashes before and after; completion and correctness gates are separate fields. Both final Codex and Android receipts have stable dependencies and `validation.passed: true` for the declared research gates.

| Gate | Codex Browser | Physical Android / Brave |
| --- | --- | --- |
| Three eligible tiny inputs: authored RGBA8 plus frozen source/converted PNGs | Direct helper exact RGB and alpha | Direct helper exact RGB and alpha |
| Twelve profile/transform/animation/unsupported format cases | Helper declines | Helper declines |
| Existing native decoding: eight authored exact formats plus two frozen PNGs | Existing native route retained | All exact, unchanged |
| Final 1 Mi-pixel direct helper, three runs | 57.9 / 49.2 / 54.4 ms, exact | 131.4 / 69.5 / 75.2 ms, exact |

See [Codex final receipt](../../bench/webkit-fallback-validation-codex-native.json) and [Android final receipt](../../bench/webkit-fallback-validation-android-native.json). The page also records malformed outcomes and skips the enormous metadata fixture. The 1 Mi-pixel timings include native decode/upload/readback and scheduling but exclude fixture fetch and the independent RGBA comparison. They are neither FPS measurements nor maximum synchronous-stall or heap bounds. The three repeated runs do not represent a broad device performance cohort.

Production has **not** adopted the helper. Forced ImageDecoder-absent controls therefore retain the known bitmap/canvas loss. On Android, the two frozen PNGs differ at 300 and 343 visible pixels under that forced path, matching its explicit old-path control; the actual native production path is exact. A research-only helper pass must not be presented as a repaired shipping WebKit fallback.

The independent Windows WebKit [native corpus controls](../../bench/webkit-fallback-review/webgl-corpus-results.json) distinguish HTML-image GL from the still-lossy ImageBitmap GL route. The [preserved slice-revision cost report](../../bench/webkit-fallback-review/candidate-cost-f221-results.json) records repeated tiny cold context stalls of 133–147 ms and complete helper times of 266–296 ms. Larger slice-revision totals include that reader's obsolete overhead and must not be attributed to the streamed revision. The [final streamed cost report](../../bench/webkit-fallback-review/candidate-cost-streamed-results.json) confirms cold tiny context stalls of 139 / 140 / 141 ms and total helper times of 220 / 232 / 222 ms. These tiny measurements preceded other QA. The later 1/4/16 Mi-pixel runs prove completion and exactness, but their recorded concurrency with other QA precludes an isolated throughput claim. Replacing the scanner did not remove the native GL stall.

## Unchanged shipping app acceptance

The real USB Android app was tested again against the same production index SHA256 `16d2776e085ab2d3907d055ccf5bd52e2fb20bdd089a7c0a87b2fc19cdb92837` and decoder SHA256 `e1207e72ec51656ee6a0b516632599b60de0e510110fd319036203c9cefe15a9`.

Actual native Download files for Keep (422 bytes) and Cut (213 bytes) are byte-identical to the frozen conversion goldens. Independent Sharp decoding checks every alpha byte and visible RGB pixel. Importing the converted Keep PNG as a palette yields exactly eight expected RGB colors, preserves the typed name and artwork count, leaves the saved library unchanged, and does not auto-save. [The new app receipt](../../bench/webkit-fallback-validation-final-app-android.json) preserves these checks without overwriting the previous PNG-repair evidence.

The phone also passes [20 dithering phases](../../bench/webkit-fallback-validation-android-dither.json) and [16 palette-improvement phases](../../bench/webkit-fallback-validation-android-improvements.json), using the current built app. Their Copy assertions intercept owned payloads inside the QA page; they are not new native clipboard delivery tests. No user clipboard was read or written by the native fallback diagnostics or native Download checks.

These results support unchanged-production regression behavior within those suites. They do not make the known WebKit fallback precision failure pass, establish actual Safari/iOS behavior, measure all GPU/heap retention, or promise every large image stays responsive.

## Recommendation

Keep the findings and reproducible negative examples. Do not ship a custom PNG parser, introduce a fallback setting, replace the working Android/Chromium native path, or silently bypass profile interpretation. Any further proposal should identify a feasible native mechanism and demonstrate color correctness **and** acceptable native-call latency on the available engines before app integration. Actual Apple-platform testing is outside the current requested scope. A cheap native API boundary cannot be assumed merely because its JavaScript wrapper yields.

The [WebGL specification](https://registry.khronos.org/webgl/specs/latest/1.0/) distinguishes texture upload, premultiplication/color-conversion state, framebuffer readback and context resource ownership. The [PNG specification](https://www.w3.org/TR/png-3/) distinguishes unassociated alpha, image samples, color metadata and animation. Those separate contracts explain the tested mechanism and the deliberately narrow guard; browser execution evidence remains essential.

# PNG import precision: independent review

Date: 2026-10-15. This review owns fixtures and diagnostics, not the production decoder implementation.

The useful fix is narrow: copy native packed RGBA/BGRA bytes when the decoded frame explicitly identifies full-range sRGB, then reorder BGRA channels in place. Keep managed sRGB conversion for other or incomplete metadata, and retain the existing bitmap fallback for transforms, unsupported native operations and other image formats. Do not replace this with float16 canvas readback or bypass color management for every PNG.

## Independent corpus and oracle

[The fixture generator](../../bench/png-precision-validation-fixtures.mjs) writes owned PNG chunks, scanlines, CRCs and compressed data without importing the app's PNG encoder or decoder. Sharp 0.35.5 independently decodes the eight exact cases. Every visible authored RGB sample and every alpha byte agrees. Hidden RGB at alpha zero is excluded from visual error; alpha itself is always checked, including alpha zero.

The [manifest](../../bench/png-precision-validation-fixtures/manifest.json) records the PNG, authored RGBA and Sharp RGBA hashes. All ordinary fixtures are 13 × 11 pixels. Their small odd widths exercise packed row padding and Adam7 passes. Low-alpha samples include 0, 1, 64, 127, 128, 192, 254 and 255.

| Group | Fixtures | What is checked |
| --- | --- | --- |
| Exact authored sRGB | RGBA8, indexed1 + tRNS, indexed4 + tRNS, grayscale16, grayscale-alpha16, RGBA16, RGB transparency key, Adam7 RGBA8 | Every original alpha byte; visible RGB against an independently verified oracle |
| Managed color | Linear gAMA; Display P3 ICC | Raw must not replace managed conversion when metadata differs or is incomplete |
| Presentation | eXIf orientation 6 | Existing presentation behavior; 13 × 11 encoded grid becomes 11 × 13 |
| Animation | APNG default included in animation; static default excluded | Record existing frame-selection behavior; do not introduce a different default through the precision change |
| Invalid or bounded | Corrupted IEND CRC, truncated data, unknown critical chunk, declared enormous geometry | Record native tolerance; enormous metadata fixture is never passed to native decode |

The 16-bit samples are eight-bit values multiplied by 257. This tests format conversion and partial alpha, not arbitrary 16-bit quantization or HDR precision. APNG/profile/orientation cases intentionally do not assert that arbitrary file bytes are already an sRGB image. The APNG comparison checks raw versus explicit native routes under the same `preferAnimation: false` selection; it is not a new APNG animation feature.

## Actual browser results

The [standalone page](../../bench/png-precision-validation-probe.mjs), served by [its own server](../../bench/png-precision-validation-server.mjs) on loopback port 5300, invokes the unmodified current production module and two independent direct native controls. It captures dependency hashes before and after each run and rejects a changed dependency. Both final receipts have `dependenciesStable: true`, the current fixture manifest hash, and decoder SHA256 `e1207e72ec51656ee6a0b516632599b60de0e510110fd319036203c9cefe15a9`. The direct raw control copies the returned plane layout into RGBA through channel order only. The committed production path requests a tight layout and rejects an unexpected layout instead.

[Android corpus receipt](../../bench/png-precision-validation-android-corpus.json) and [Codex Browser corpus receipt](../../bench/png-precision-validation-codex-corpus.json) retain all per-case results, metadata, dimensions, timing and output hashes. Both browsers use Chromium 155 on the tested Windows and physical Android environments.

| Observation | Codex Browser | Physical Android |
| --- | --- | --- |
| Production path, all 8 exact fixtures | Zero visible RGB or alpha errors | Zero visible RGB or alpha errors |
| Native raw, all 8 exact fixtures | Zero visible RGB or alpha errors; BGRA native frames | Zero visible RGB or alpha errors; RGBA native frames |
| Explicit RGBA/sRGB control | Six partial-alpha formats change 59–85 visible pixels; maximum channel change 33–87 | Exact for all 8 |
| Linear-gamma raw versus managed | 125 visible pixels differ, maximum 87; transfer is `linear` | Same rejection evidence |
| P3 raw versus managed | 125 visible pixels differ, maximum 84; native primaries are `null` | Same rejection evidence |
| Orientation | Production preserves 11 × 13 presentation; raw route ineligible | Same |
| Truncated/unknown critical | Rejected | Rejected |
| Corrupted IEND CRC | Tolerated by native decoder | Tolerated by native decoder |

The linear/P3 cases are positive evidence for retaining the metadata guard. Their raw-versus-managed difference is expected color conversion, not an artistic quality score or a decoder defect. Production retains exactly the explicit managed result for these cases. Null primaries cannot be treated as sRGB.

The separate [Android baseline diagnostic](../../bench/png-precision-validation-android-baseline.json), using two frozen 32 × 24 images, also rejects a universal float16 workaround. Production/native RGBA were exact; float16 canvas readback changed 29 and 28 visible pixels, maximum channel change 32, including opaque pixels. Canvas8 changed 300 and 343 pixels, maximum 109 and 124. This establishes the observed output, not the internal cause of that browser behavior. It does not justify disabling browser settings.

## Final built-app acceptance

The [actual Android app driver](../../bench/png-precision-validation-app-android.mjs) imports the frozen original 32 × 24 source through the rebuilt app, selects the recorded PICO-8 / cap 8 / Oklab / Cleanup / 4 × 4 / strength 50 settings, and invokes the real Save action. It reads only the uniquely named owned file from Android's Download directory; it does not intercept the download payload or use the clipboard. The [final receipt](../../bench/png-precision-validation-final-app-android.json) records production index SHA256 `16d2776e085ab2d3907d055ccf5bd52e2fb20bdd089a7c0a87b2fc19cdb92837` and the frozen decoder above.

The Keep download is 422 bytes and the Cut download is 213 bytes. Both files are byte-identical to their frozen PNG goldens; independent Sharp decoding confirms all 768 alpha bytes and all visible RGB pixels agree. A separate read-only check against the decoded **original source**, rather than only the conversion golden, confirms every Keep alpha byte is unchanged and every Cut alpha byte equals the cutoff-128 binary result. Keep retains all eight tested alpha values; Cut contains only 0 and 255. These conversion goldens use the existing production recoloring algorithm, so this tests import/export consistency, not an independently optimal artistic palette.

The actual palette-image import of the converted Keep PNG produces exactly eight expected RGB colors, preserves the entered draft name and artwork count, leaves the saved library unchanged, and does not automatically save the draft. The [final verification record](2026-10-15-png-import-precision-verification.md) also records the Codex Browser actual native Save and palette-image checks. Both native Save outputs match the same frozen Keep golden.

## Correctness and resource gates

Independent review reran the existing focused decoder tests: **33 passed**. They cover native RGBA/BGRA identity, refusal of unknown/P3/linear/limited or incomplete spaces, unexpected plane layouts, unsupported native paths, transformed fallback, preservation of existing cropped-frame copy behavior, shared palette import, distinct near colors, pixel limits, cancellation during support/decode/copy/reorder, late fallback and resource cleanup.

The production raw route must remain limited to known packed eight-bit RGBA/BGRA, full range, RGB matrix, BT.709 primaries and IEC 61966-2-1 transfer. It must preserve the geometry guards and tight-layout validation. Unknown formats, RGBX/BGRX and incomplete color metadata retain managed conversion. BGRA reordering must be cooperative and cancelable; canceled work must never publish pixels or begin fallback. Native frame/decoder resources must close on every completion/failure/abort; fallback bitmap/canvas resources must also be released.

The chosen route reuses the existing four-byte-per-pixel output allocation and swaps red/blue in place. It avoids the proposed float16 backing store and readback buffers. This is a source-level allocation statement, not a total browser memory measurement: native decoder storage, source buffers and browser internals remain additional. Tiny-fixture timings are diagnostic only; they do not establish large-image throughput or phone frame rates. Large-image timing belongs in the separate production performance evidence.

## Limits and recommendation

The guarded native-byte correction is supported by the completed current-build app acceptance and is committed as `d37d8b7`. Preserve the negative profile and float16 findings alongside the successful results. There is no evidence here for a custom PNG parser, globally disabled color management, a new user setting or a canvas-based import replacement.

This corpus does not validate Safari, every ICC profile, arbitrary 16-bit rounding, HDR, every APNG disposal/blend combination, large malformed native allocations or all browser versions. The deliberately huge header is metadata-only, so its presence is not a native memory-safety claim. Existing GIF decoding and export bytes are outside this decoder change.

The PNG standard defines unassociated alpha and separate gamma/profile semantics; preserving alpha bytes does not alone prove RGB precision. See [PNG Third Edition](https://www.w3.org/TR/png-3/). Native frame format, presentation, color metadata and plane layout are distinct contracts; see [WebCodecs](https://www.w3.org/TR/webcodecs/). Those distinctions motivate the guards and negative cases above.

## Reproduce

Run `node bench/png-precision-validation-fixtures.mjs` to regenerate the corpus with the recorded Sharp version, then `node bench/png-precision-validation-server.mjs`. Open `http://127.0.0.1:5300/?device=codex` and click **Run independent PNG corpus**. For an authorized physical Android CDP session on port 9333, `node bench/png-precision-validation-device.mjs` forwards 5300 and runs the same page. It closes only its owned tab and never reads the clipboard or shuts down the shared browser.

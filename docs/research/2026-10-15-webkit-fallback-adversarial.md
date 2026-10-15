# WebKit fallback precision: independent challenge

October 15, 2026. **Do not ship the tested WebGL fallback.** Native HTML-image texture copying preserves the tested colors, but the final streamed research helper still causes a synchronous 139–141 ms cold context call on tiny PNGs. This fails the user's conditional no-regression gate. The initial metadata scanner's separate overhead was repaired in research; the native startup stall remains. No production decoder, palette algorithm, default or control changed in this investigation.

Production retains the guarded native-copy correction and the existing bitmap/canvas fallback. Windows WebKit's fallback still has its documented translucent-RGB precision limit. Apple platforms are unavailable and explicitly excluded from this pass. Windows WebKit is not actual Safari/iOS, and Apple setup is not an unfinished requirement here.

## Independent gates

Fresh Windows Playwright WebKit build 2336 contexts used owned fixtures. No user profile, clipboard, paid cloud, new browser installation or remote service was used.

| Gate | Requirement |
|---|---|
| Color and alpha | Independently author/decode expected sRGB; compare every alpha byte and visible RGB. Exclude hidden alpha-zero RGB from visible error. Test untagged controlled inputs and explicit sRGB; do not blindly interpret profile-tagged samples as sRGB. |
| Format and presentation | Preserve working native-first behavior, non-PNG formats, GIF processing, metadata transforms and existing APNG selection. Different Sharp orientation/profile policy is not automatically a browser regression. |
| Bounded acquisition | Explicit byte/pixel/header/read bounds and unsupported-metadata behavior. A metadata eligibility scanner is neither CRC validation nor a custom PNG pixel decoder. |
| Lifetime and fallback | Abort cannot publish or start obsolete fallback work. Release image handlers/URL, GL resources and canvas on all exits. GPU refusal must preserve the usable old path. |
| Main-thread cost | Include scan, cold context, load, upload, readback, scheduling and cleanup. Keep cold costs alongside warm throughput. Posting before a native call cannot interrupt the call. |
| Scope | No retained/prewarmed GPU context, custom pixel decoder or new UI follows automatically from a correct tiny fixture. Ship only after precision benefit with acceptable unchanged-workflow cost. |

## Native alternative

The [native-control runner](../../bench/webkit-fallback-review-webgl.mjs) uploads an HTML image or ImageBitmap directly into an RGBA/UNSIGNED_BYTE texture, attaches a framebuffer and reads pixels. There is no shader, blending or canvas2D intermediate. Premultiplication and vertical flip are false; browser-default color conversion remains enabled. The default canvas is 1×1; the attached texture has source dimensions. If exposed, unpackColorSpace is sRGB.

The owned source 32×24 PNG is untagged (`IHDR,pHYs,IDAT,IEND`); the converted PNG has an explicit sRGB chunk. Both have independent expected sRGB8 samples. [Initial results](../../bench/webkit-fallback-review/webgl-results.json) show:

| Source route | Source PNG | Converted PNG |
|---|---:|---:|
| HTML image → WebGL1/2 | 0 alpha/visible-RGB differences | 0 alpha/visible-RGB differences |
| Same HTML image → canvas2D | 292 visible-RGB differences | 330 visible-RGB differences |
| ImageBitmap → WebGL | 323–341 visible-RGB differences, depending on options | 339 visible-RGB differences |

The HTML image source is essential in this engine. Moving an already lossy ImageBitmap into GL does not restore precision. The initial runner evaluated `ms` before awaiting GL work: those initial timing fields are invalid and are not cost evidence. Pixel comparisons remain valid. The corpus runner corrected that timing order.

The [13-case native corpus](../../bench/webkit-fallback-review/webgl-corpus-results.json) includes eight exact authored cases and five managed/presentation/APNG diagnostics. HTML → WebGL1/2 is exact for all eight authored cases, including indexed/tRNS, Adam7 and 16-bit samples deliberately restricted to 8-bit×257. This does not imply the narrow candidate accepts all those formats.

The negative controls require careful attribution:

- P3 GL matches Sharp's managed output. Gamma/P3 GL preserves opaque RGB and alpha versus the same HTML image's canvas; differences are translucent samples. Sharp raw gAMA bytes are diagnostic, not an absolute managed-color oracle.
- WebKit exposes EXIF 6 as 13×11 unrotated through HTML, bitmap and canvas controls; Sharp rotates to 11×13. The 108 alpha differences against that differently oriented oracle are not a newly reproduced GL regression.
- Both APNG controls retain their observed first/static selection, including an HTML/GL sample after 180 ms. The excluded-default fixture also differs from Sharp in the old canvas path. No new animation guarantee or universal frame-selection claim follows.

The [WebGL texture-upload specification](https://registry.khronos.org/webgl/specs/latest/1.0/#TEXIMAGE2D) supports the precision mechanism for lossless 8-bit HTML image uploads with premultiplication disabled. It does not promise native-call latency or prove every backend.

## Actual helper and caught scanner regression

The research helper attempts static, noninterlaced RGBA8 PNGs with only IHDR, IDAT, IEND and optional canonical sRGB/pHYs. Profiles, gamma, orientation, animation and other pixel formats decline. Attempt limits are 32 MiB and 16 Mi pixels. These are research eligibility limits, not new app import limits. Pixel decoding and corrupt-data policy remain native; the scanner does not validate CRC or inflate pixels.

The helper posts before context creation/upload, checks GPU limits and reads 128 KiB stripes with an 8 ms posted-task target. Cleanup runs on all exits. These gates cannot remove the synchronous context/upload calls.

The first frozen helper, SHA256 `f22137782727c1b309ae1969b23460a34100a2b57be8ac331a6f6f28353f6d80`, performed repeated File.slice reads and capped walked headers at 255. It declined an ordinary 416-IDAT PNG after 88–101 ms in Chromium. Windows WebKit amplified that overhead into seconds. Raising the cap alone was inadequate.

The immutable [f221 cost receipt](../../bench/webkit-fallback-review/candidate-cost-f221-results.json), [f221 bundle](../../bench/webkit-fallback-review/assets/candidate-f221.js) and [slice source snapshot](../../bench/webkit-fallback-candidate-slice-baseline.mjs) preserve that rejected revision:

| f221 actual helper | Complete call | Observation |
|---|---|---|
| 32×24, three fresh processes | 296 / 266 / 269 ms | getContext 147 / 135 / 133 ms; maximum rAF gap 173 / 156 / 173 ms; exact pixels. |
| 1 Mi-pixel, three runs | 2346 / 2107 / 2113 ms | Exact; repeated header acquisition dominates warm calls. First context additionally takes 374 ms. |
| 4 Mi-pixel, three runs | 4693 / 4453 / 4356 ms | Exact, but seconds of scanner work. |
| 16 Mi-pixel, one attempt | 3904 ms | Returns null at chunk cap before creating GL; no precision benefit. |
| OffscreenCanvas, three fresh processes | Unavailable | API absent in this installation. |

The final [streamed helper](../../bench/webkit-fallback-candidate-gl.mjs), SHA256 `509a2b869ffead7f0d9f2ff5ad038c8b2cce032adbfc62b7f8f982613f511279`, imports a [bounded stream reader](../../bench/webkit-fallback-candidate-stream-reader.mjs), SHA256 `82dfb70589cb068c3c7fbe0e162445af97f8d6d8ffb393c08ccd7993e8fc0f7b`. It retains one input chunk, skips compressed payload through views and bounds headers/reads. It cancels/releases the reader on exit. This repairs the research scanner; neither file is imported by production.

The [actual-helper runner](../../bench/webkit-fallback-review-candidate-cost.mjs) records both source hashes and the immutable bundle hash. Pixel checks and normalized RGBA hashing occur after timing; encoded fixture transfer is also outside timing. rAF covers the call and one completion frame, not app FPS or device-wide responsiveness.

The [streamed receipt](../../bench/webkit-fallback-review/candidate-cost-streamed-results.json) and [immutable bundle](../../bench/webkit-fallback-review/assets/candidate-streamed.js) confirm:

| Final streamed helper | Complete call | Observation |
|---|---|---|
| 32×24, three fresh processes | 220 / 232 / 222 ms | getContext 139 / 140 / 141 ms; maximum rAF gap 156 / 170 / 171 ms. All exact. These runs preceded other QA. |
| 1 / 4 / 16 Mi-pixel | All return exact RGB and alpha | A separate production QA browser began during size runs. Preserve correctness/completion evidence; do not use overlapping larger timings as isolated throughput evidence. |
| OffscreenCanvas, three fresh processes | Unavailable | The proposed DOM-free control cannot be tested on this installation. |

Both frozen sources stayed unchanged. `completed:true` means measurements finished, not a shipping pass. The repeated tiny cold native calls are sufficient to reject automatic integration, independently of scanner repairs or larger timing variance.

Earlier [native size controls](../../bench/webkit-fallback-review-performance.mjs) and [receipt](../../bench/webkit-fallback-review/native-performance.json) show warm GL can outperform bitmap/canvas in selected runs. The first 1 Mi-pixel context still takes 145 ms versus 21 ms for that run's complete old import. Three noisy samples cannot establish universal speedups or erase the cold counterexample.

No total heap/GPU-memory bound is claimed. A 1×1 default buffer avoids an extra source-sized drawing buffer; native images, GPU textures, output buffers and driver/context still consume memory. Delete/lose-context calls are not whole-browser memory measurements.

## Final unchanged-production acceptance

The current production dist index SHA256 remains `16d2776e085ab2d3907d055ccf5bd52e2fb20bdd089a7c0a87b2fc19cdb92837`, with decoder SHA256 `e1207e72ec51656ee6a0b516632599b60de0e510110fd319036203c9cefe15a9`.

The [fresh original-source WebKit receipt](../../bench/palette-webkit-review/fallback-current-results.json) retains both expected failures: the 20-phase dithering and 16-phase improvements harnesses each stop after two checks at `Preview/full-source sample mismatch ramp`, with no page errors. Source and dist hashes are unchanged. This is the known fallback precision limit, not a new regression; **neither full suite passes in WebKit**.

The separate [binary-alpha smoke receipt](../../bench/palette-webkit-review/fallback-current-smoke-results.json) passes all six checks with no unexpected page errors: independently decoded endpoint RGB/alpha, PICO-8 cap/Cleanup/dither native PNG, Count → Use draft colors, exact two-frame GIF pixels/delays/loop, separate 1-bit PNG, and 320×568 / 568×320 controls. Two ResizeObserver loop notices remain recorded separately. These use opaque/transparent 0/255 endpoint samples whose existing browser decoding is independently exact. They establish bounded engine/UI/export coverage without relabeling translucent failures. The smoke has no clipboard actions; existing full QA intercepts owned payloads and is not native clipboard testing.

The retained portrait and landscape screenshots were also inspected: pattern, strength and Keep controls remain readable and inside the viewport, with the taller panel scrolling in landscape.

The [other independent validation](2026-10-15-webkit-fallback-review.md) retains resource/fault, current Codex and USB Android acceptance. Those working native routes remain unchanged. No new whole-device latency, heap, universal file or Apple claim is made.

## Decision and checklist reconciliation

Keep production's native-copy route and old fallback. The tested native alternative proves a useful precision mechanism but fails the current responsiveness gate. Posted turns only expose cancellation before a stall. Retention/prewarm would change background work and memory/lifetime policy; neither is introduced. No custom PNG pixel decoder, new setting or unrelated palette feature is added.

The [remaining-work audit](2026-10-15-palette-remaining-audit.md) retains completed palette/clipboard decisions, rejected Auto fitting and intentionally deferred locks/collection budgets. Those are not reopened by this investigation. Native clipboard precision remains a separate boundary; no real clipboard was accessed. Actual Apple testing is outside the user's current scope.

A future fallback candidate needs a new independently measured cold-cost strategy, then the same color, profile, format, lifetime and failure gates. There is no remaining authorized production change from this tested candidate.

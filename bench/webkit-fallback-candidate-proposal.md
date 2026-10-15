# Native PNG fallback candidate

**Do not ship this candidate.** Three fresh Windows WebKit browsers reproduced
133/135/147 ms synchronous context creation calls with the earlier helper revision (139/140/141 ms with the final streamed helper, below), even for a tiny sprite.
Posted boundaries give input a turn before those calls; they cannot remove the
native stall. This fails the user's conditional no-regression gate. No production
parser or decoder integration has been added. The
existing Windows Playwright WebKit binary lacks ImageDecoder and VideoFrame.
Its owned 32×24 PNG controls changed 292 source and 330 converted RGB pixels
through canvas import, with zero alpha changes. Float16 canvas backing was not
supported. This engine is not an actual Mac or iOS Safari device.

HTMLImageElement→WebGL texture/FBO readPixels preserves all visible RGB and alpha
in both owned 32×24 images. ImageBitmap→WebGL remains lossy. The independent
reviewer's corpus also found exact HTML→GL samples for eight authored format
cases, including indexed transparency, 16-bit and Adam7. That broader result
does not expand this first candidate's deliberately narrow eligibility.

The [WebGL texture upload contract](https://registry.khronos.org/webgl/specs/latest/1.0/#TEXIMAGE2D)
protects lossless HTML image RGB/RGBA8 precision with premultiplication disabled.
Texture unpack color handling is separate from framebuffer color handling.
The helper retains browser color conversion, without shaders or rendering.

The initial orientation comparison needs care: GL differed from an explicitly
rotated Sharp oracle, but Windows WebKit's previous bitmap/canvas path was also
unrotated with the same alpha layout. This is not evidence of a new GL regression.
Managed P3 samples matched Sharp; gamma/P3 GL-versus-HTML-canvas differences were
limited to translucent RGB. The 180 ms APNG delay test did not reveal a new race.
Profile, presentation and animation exclusions below are scope protection, not
claims that all such native alternatives failed.

## Frozen research helper

`bench/webkit-fallback-candidate-gl.mjs` exports
`decodePngWithWebGL(file, {signal, validateDimensions})`. It returns ImageData on
success, null for an eligibility/capability decline, and throws native/GL failures
or cancellation. The parent would retain its existing canvas fallback for normal
failure/decline while propagating its dimension-limit error and cancellation.

The revised metadata gate consumes File.stream incrementally, retaining one
reader chunk plus tiny headers and skipping payload views. It accepts signature plus
static noninterlaced RGBA8 IHDR/IDAT/IEND with optional sRGB and pHYs, with valid
length/order/uniqueness and no trailing file bytes. Other chunks, profile/gamma,
EXIF/APNG, other color types/depths and interlacing decline. Attempt caps are
32 MiB input, 65,536 PNG chunks, 131,072 stream reads and 16 Mi pixels, and the parent's smaller pixel
limit remains authoritative. These are eligibility bounds, not new import errors.
IDAT payloads are skipped; CRC, zlib and scanline validation remain the native
browser decoder's responsibility. No custom pixel reconstruction is introduced.

The dimension callback runs before creating GPU resources. The helper posts a
task before context creation, verifies MAX_TEXTURE_SIZE and uses a 1×1 default
canvas with a source-sized texture/FBO. It loads an owned object URL into a fresh
HTML image and requires dimensions to agree with the scanned header. It posts
again before texture upload, preserving default managed color conversion and
setting sRGB texture unpack space where supported. ReadPixels copies row stripes
into one output array, checking context/error/cancellation and yielding at an
8 ms target between stripes. No second output-sized RGBA array is added.
Finally it clears the image, revokes the URL, deletes the FBO/texture, loses the
dedicated context and releases the canvas. No shared retained GPU context exists.

Frozen revised helper SHA256:
`509a2b869ffead7f0d9f2ff5ad038c8b2cce032adbfc62b7f8f982613f511279`;
stream-reader dependency:
`82dfb70589cb068c3c7fbe0e162445af97f8d6d8ffb393c08ccd7993e8fc0f7b`.
The original f221 helper is preserved as
`webkit-fallback-candidate-slice-baseline.mjs`. Its per-chunk File.slice approach
was itself a regression: one valid 1 MP PNG had 416 chunks, spent 88–101 ms
scanning in Codex Browser, then declined its 255-additional-chunk cap. Separate
WebKit fixtures took seconds with those small reads. The streamed revision
repairs that research harness design; it cannot remove the independent cold GL
stall or turn the no-ship result into a recommendation. Native context creation,
upload and individual read calls remain synchronous.

The streamed Windows WebKit rerun confirms that conclusion in three additional
fresh browsers: tiny totals are 220/232/222 ms, with context calls
139/140/141 ms and observed maximum animation-frame gaps 156/170/171 ms. These
three cold runs completed before other WebKit testing began. The revised helper
also completes exact 1/4/16 MP output, including the formerly declined 16 MP
case. Another production QA browser ran during those later size observations,
so their totals are retained for completion/exactness and cannot establish an
isolated throughput improvement. The complete receipt, both source hashes,
bundle hash and this concurrency limit are preserved in
`webkit-fallback-review/candidate-cost-streamed-results.json`.

The final Codex Browser and actual USB Android research receipts both validate
19 owned cases, eligible exact output, deliberate unsupported declines and an
ordinary 416-chunk 1 MP source. All three 1 MP runs per device return exact visible
RGB and alpha. Codex totals are 49.2/54.4/57.9 ms; Android totals are
69.5/75.2/131.4 ms. These include metadata/native decode/upload/readback, exclude
fixture fetch and scoring, and are neither isolated scanner costs nor a paired
cross-device speed comparison. Both reports identify the frozen helper,
stream-reader, production decoder and probe hashes, and explicitly record that
the helper is not integrated into production. See
`webkit-fallback-validation-codex-native.json` and
`webkit-fallback-validation-android-native.json`. Independent fault injection in
`webkit-fallback-validation-resources.json` verifies ownership and cancellation;
it does not substitute for native color tests.

## Why a custom PNG decoder is held

The native route demonstrates a precision benefit without pixel-format decoding
maintenance. A custom route would additionally require CRC/order/filter/inflate,
profile and malformed-input resource validation. Existing fflate alone does not
solve all bounds: its documented output buffer truncates excess output, and its
synchronous operation still consumes CPU on an inflation bomb. Native deflate
streams validate checksum/trailing input, but browser internal memory is not an
application-level hard bound. No inflater or custom PNG pixel decoder is proposed
for shipping; the native alternative was also rejected (see the [decision](../docs/research/2026-10-15-webkit-fallback-decision.md)).

Primary references: [PNG Third Edition](https://www.w3.org/TR/png-3/),
[Compression Standard](https://compression.spec.whatwg.org/),
[fflate output buffer contract](https://github.com/101arrowz/fflate/blob/master/docs/interfaces/InflateOptions.md),
[fflate streaming API](https://github.com/101arrowz/fflate/blob/master/docs/classes/Unzlib.md).

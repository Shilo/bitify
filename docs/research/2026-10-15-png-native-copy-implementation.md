# PNG native-copy precision

The direct probe isolated a desktop PNG import defect: requesting an explicit
RGBA/sRGB conversion changed already-sRGB native BGRA pixels. The narrow repair
copies proven sRGB native bytes and changes BGRA channel order only. It does not
promise exact encoded profile bytes or exact native clipboard transport.

## Evidence and scope

Two owned 32×24 fixtures independently decoded to an authored sRGB8 RGBA oracle:
the source and its expected recolored PNG. Before the repair, Codex Browser's
production import differed at 207 and 246 visible RGB pixels respectively, with
every alpha byte intact. A native default-format copy with BGRA-to-RGBA ordering
had zero differences. The repaired uninstrumented production probe also has zero
visible RGB or alpha differences in both fixtures. The observed rounding model
alone was not used as proof; the direct copy controls isolated the avoidable
conversion. Exact native-frame default copies fix the earlier source discrepancy
before recoloring rather than compensating for it afterward.

Actual USB Android exposed RGBA and already decoded both fixtures exactly through
the original explicit path. Its native-format copies were exact too. Float16
canvas, although exact for these fixtures on desktop, changed 29 source and 28
converted RGB pixels on Android, including opaque pixels, with maximum channel
delta 32. That alternative is rejected. Disabling color-space conversion also
failed to repair desktop precision and would discard profile interpretation.

The independent 17-fixture corpus includes authored RGBA8, indexed transparency,
16-bit grayscale/alpha/RGBA, RGB transparency, Adam7, profile/gamma/orientation,
APNG and malformed inputs. The profile negatives are essential: Android's gamma
1.0 frame exposed linear transfer and differed from managed output at 125 pixels
if copied raw; its P3 ICC frame exposed unknown primaries and also differed at 125
pixels. Both must retain managed conversion. Independent receipts are
`bench/png-precision-validation-*-corpus.json`; interpretation belongs to the
[independent review](2026-10-15-png-precision-review.md).

## Implementation contract

The existing ImageDecoder uses default browser color management. A frame is
eligible for native packed copy only when its format is RGBA or BGRA and all four
metadata fields match: fullRange true, matrix rgb, primaries bt709, transfer
iec61966-2-1. Unknown metadata, wider gamut, linear transfer, opaque X formats and
other pixel formats keep the existing explicit RGBA/sRGB copy. Presentation
transforms retain the previous bitmap/canvas fallback. Default visible-rectangle
copying remains unchanged.

The copy requests offset zero and width×4 stride, and validates the returned
single plane. Unexpected layout follows the existing error fallback. BGRA swaps
red and blue bytes in place, preserving green, alpha and hidden RGB without color
arithmetic. It uses 128 KiB blocks, cancellation checks and the existing posted
scheduler after an 8 ms target. RGBA needs no loop. There is no extra output-sized
pixel allocation, custom PNG decoder, profile bypass or float16 path.

## Verification and costs

The focused decoder suite passes 33 tests, including native byte preservation,
metadata rejection, unexpected offsets/strides, cropped visible rectangles,
size limits, fallback ownership and cancellation during the posted BGRA reorder.
Frame/decoder closure and cancellation remain authoritative; a canceled job
cannot publish pixels or restart through canvas.

`bench/png-import-precision-swap-perf.mjs` measures the actual production reorder
with a mocked native decoder/copy, independent pixel assertions and three runs
at 1/4/16 MP. Reorder plus scheduling took 0.9–3.6 / 3.1–5.3 / 12.2–13.8 ms. Each
16 MP run posted once; the maximum observed synchronous span was 8.2 ms. This is
an isolated Node desktop cost, not total browser/phone decoding time, a hard task
deadline or a heap bound. Native decoding can allocate before dimensions appear.

The research build and device receipts live under
`bench/png-import-precision-review/`; current reports embed source hashes. The
frozen decoder hash is
`e1207e72ec51656ee6a0b516632599b60de0e510110fd319036203c9cefe15a9`.
`baseline-build-record.json` and `codex-baseline-raw-report.json` retain the
pre-repair witness. Production dist is built and app-level checks are recorded by
the parent verification task separately; this probe does not rebuild dist.

The fix preserves exact authored sRGB bytes in the tested native paths. Windows
WebKit's fallback remains separately bounded; actual Safari/iOS is untested. No
universal decoder, arbitrary profile or
clipboard exactness claim follows. In particular, OS/browser PNG clipboard
transport can still round translucent RGB after an exact import and Save.

## Primary API references

[WebCodecs VideoFrame copying](https://www.w3.org/TR/webcodecs/#dom-videoframe-copyto)
defines native-format copying, explicit format/color-space options and plane
layouts. The guard relies on reported decoded frame metadata, preserving the
browser's original profile processing.
[HTML image decoding options](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html)
distinguish default color handling from disabling conversion.
[Canvas color types](https://html.spec.whatwg.org/multipage/canvas.html)
describe float16 capability; capability alone did not predict exact output on
the tested phone.

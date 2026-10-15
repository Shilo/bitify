# PNG import precision — final verification

October 15, 2026. Continuation from `a6fc48f`; plan `7f70023`, production repair
`d37d8b7`. Three sub-agents separated implementation, independent fixtures/device
validation, and adversarial review/checklist reconciliation. No push/deployment.

## What changed and why

Direct native controls isolated a real avoidable import conversion. On Windows
Codex Browser and sandbox-enabled Edge, the browser supplied already-sRGB BGRA
frames. Asking copyTo for another RGBA/sRGB conversion changed 207 and 246 visible
RGB pixels in two owned 32×24 PNGs. Copying native bytes and swapping R/B channel
positions preserved every visible RGB and alpha byte. Android supplied RGBA and
was already exact. The candidate is now the committed production path.

Only known packed RGBA/BGRA with full-range RGB matrix, BT.709 primaries and
IEC61966-2-1 transfer can use that path. Unknown/incomplete metadata, Display P3,
linear gamma and other formats retain managed sRGB conversion. Geometry,
unsupported-operation fallback, pixel limits and resource release retain their
contracts. BGRA swaps in place in bounded blocks, checks cancellation and posts
after an 8 ms target; it adds no output-sized scratch buffer.

Independent review removed an unnecessary proposed crop restriction. Three
positive cropped-frame tests now prove that the previous native/managed routes
remain available. No palette algorithm, Auto behavior, control or default changed.

The [implementation record](2026-10-15-png-native-copy-implementation.md) retains
the strict guard, API references, rejected alternatives and bounded Node costs.
The [independent review](2026-10-15-png-precision-review.md) explains the corpus.

## Final app and decoder evidence

| Check | Result |
|---|---|
| Codex Browser direct production decoder | Both 32×24 PNGs: zero visible RGB or alpha mismatches after repair, compared with 207/246 before. Explicit conversion controls retain their negative results. |
| Codex Browser actual built app Save | Native downloaded PNG is 422 bytes, SHA256 `14d0012def2b51dbf17ce7e0022fb43d7cc2911209be1ed2b43bfe995c427691`, byte-identical to the frozen Keep golden. All 768 alpha bytes and 672 visible RGB pixels exact. |
| Physical Pixel 8 Pro / Brave built app | Actual Keep 422-byte and Cut 213-byte downloads are byte-identical to their frozen goldens. Every original/cut alpha byte and visible RGB matches. Only uniquely named owned downloads are read. |
| Actual palette-image import, both devices | Exactly the expected eight RGB colors from the converted PNG, without phantom shades. Typed draft name preserved; artwork remains; no palette automatically saved. |
| Independent format corpus, both devices | Eight authored exact cases pass; gamma/P3 raw shortcuts are correctly rejected, orientation retained, APNG selection unchanged, malformed behavior recorded. Sixteen tiny inputs exercised; huge header deliberately metadata-only. Dependency hashes stable before/after final runs. |
| Units/build | 929 ordinary tests pass, two explicit-GC tests skipped in that run; 33 focused decoder tests pass independently. Production build passes. |
| Codex built-app acceptance | 20 dithering and 16 palette-improvement phases pass. This rerun excludes optional live Lospec; earlier real-network evidence remains separate. |
| Established pre-feature regression | 132 legacy, 11 Palette and 11 RGB independently decoded cases plus 13 integration groups pass against `061c880`. Intercepted clipboard payload assertions are not OS delivery evidence. |
| Windows Playwright WebKit | Six separate binary-alpha smoke checks pass before/after, including PNG/GIF/1-bit exports, Count/Use and 320/568 layouts. Their output bytes remain identical across the repair. Two ResizeObserver notices retained; no other page errors. |

Final production index SHA256:
`16d2776e085ab2d3907d055ccf5bd52e2fb20bdd089a7c0a87b2fc19cdb92837`.
Frozen decoder SHA256:
`e1207e72ec51656ee6a0b516632599b60de0e510110fd319036203c9cefe15a9`.

The desktop native output now matches the same frozen golden that Android
already matched. The previous desktop Save differed at 118 visible pixels,
including 12 opaque pixels because its selected subset changed after source
rounding. This repair acts before recoloring and removes that discrepancy.

Evidence: [native decoder controls](../../bench/png-import-precision-review/),
[Android app receipt](../../bench/png-precision-validation-final-app-android.json),
[Codex independent corpus](../../bench/png-precision-validation-codex-corpus.json),
[Android independent corpus](../../bench/png-precision-validation-android-corpus.json),
[WebKit receipts](../../bench/palette-webkit-review/).

## Rejected alternatives and remaining work

The float16 canvas route was exact on the two Windows fixtures but changed 29/28
RGB pixels on Android, including opaque pixels; it is not shipped. Disabling
profile conversion also failed to solve desktop loss and would violate managed
color. A custom PNG parser is not introduced.

Windows WebKit has no ImageDecoder in this installation. Its production canvas
fallback changes translucent RGB; both full partial-alpha acceptance suites
stop at their retained precision failures. The six narrower smoke checks do
not turn those failures into passes. This native-only fix preserves that
existing fallback, and does not solve every browser's PNG precision.

Actual Safari/iOS remains untested: Windows WebKit and device descriptors do
not substitute for an accessible Apple platform. Further fallback work should
first use that platform's actual decoded-source observations and require a
profile-safe, bounded proposal. Do not add another UI control or silently
disable color management to hide the limitation.

Native clipboard transport remains a separate precision limit after exact
import and Save. The existing conditional Save guidance remains appropriate;
this work does not claim an exact clipboard fix or retest every native paste
destination. Large delayed native clipboard snapshots, prolonged heap use,
arbitrary ICC/HDR/16-bit data and universal artistic quality are outside this
bounded study.

The [remaining-work audit](2026-10-15-palette-remaining-audit.md) confirms that
the implemented palette batch is complete within its recorded scope. Direct
Auto fitting was rejected by its prior regression gate; extra presets, locks,
new dither controls and permanent mobile shortcut rows remain unjustified or
deliberately deferred. Next useful work is actual Safari/iOS verification and
evaluated fallback precision, rather than more palette UI.

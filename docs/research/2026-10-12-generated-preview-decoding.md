# Generated preview continuity and PNG decoding

October 12, 2026. These fixes address separately reproduced preview and source-decoding
issues. They do not add palette rounding, a custom PNG parser or a new conversion style.

## Reproduced issues

Before the fixes, selecting Generated 32 could expose two canvas gaps while its first
palette and the first converted frame were prepared. An empty wall could also show
zero demo canvases after clearing real artwork or starting with Generated persisted.
Generation considered real wall assets only, even though the app displayed an animated
example when the wall was empty.

The supplied 64×64 indexed PNG contains precisely two visible source colors. Independent
Pillow inspection found 733 opaque `#222323` pixels, 773 opaque `#f0f6f0` pixels and
2,590 fully transparent pixels. Its chunks were IHDR, PLTE, tRNS, IDAT and IEND, with
no gamma or embedded profile metadata. A generated palette containing near-duplicates
therefore did not reflect extra colors in that file.

An explicit decoding witness on the physical Pixel 8 Pro running Brave found eight
visible RGB colors after the existing createImageBitmap/drawImage/getImageData path.
The native ImageDecoder/copyTo path returned exactly the two source RGBs and the same
opaque/transparent counts. In Codex's Chromium browser both paths returned the exact
two colors. This is a browser-dependent source readback issue, not a reason to merge
genuine similar colors in the generator. Brave documents randomization of canvas
getImageData in its [fingerprinting defenses](https://brave.com/privacy-updates/4-fingerprinting-defenses-2.0/).

## Changes

Generated source capture now uses the ready animated demo only when the real wall is
empty. A nonempty wall whose pixels are all invisible at the active opacity cut still
generates zero colors; demo colors cannot replace it. Source/frame capture, duration
weighting and export signatures remain shared whole-wall decisions.

Pending generation and conversion handoff retain the last completed converted image
for the same item, including an already displayed 1-bit conversion. A new item cannot
inherit another item's pixels. Original comparison remains explicit; current-frame
readiness gates converted animation, and cancellation prevents late publication.
Completed empty generation clears the old conversion. Failure behavior remains the
specified retained preview with retry guidance.

The new shared `image-decode.js` uses browser-native PNG ImageDecoder when available
and supported, streams the file and copies the resulting frame to straight RGBA in
sRGB. It keeps default browser color-space conversion; no embedded profile is discarded
and no RGB values are rounded or clustered by application code. This avoids canvas
readback and its premultiply/unpremultiply round trip. The native interfaces and target
color-space copy are defined by [WebCodecs](https://www.w3.org/TR/webcodecs/).

The change is PNG-only. Other still-image formats keep bitmap/canvas decoding, and
animated GIFs retain the existing independent compositing decoder. Native capability,
construction/decode/copy failure and frames requiring presentation transforms fall
back to the previous color-managed bitmap/canvas path. Cancellation closes the native
decoder and rejects stale work; frame, bitmap and temporary canvas resources are
released on all completed paths. Palette import retains its byte and pixel limits.
Fallback browsers retain their existing readback limitations; this does not guarantee
cross-device byte-identical decoding for arbitrary profiles.

## Why GIF playback still does work

Generated palette fitting, Max colors subset selection and guarded cleanup operate
once per captured whole-source/clip settings request, with cache sharing. They are not
rerun merely because playback advances. A clip admitted to the shared 8 MiB sampled
index cache quantizes each frame on its first visit; later visits reuse those indexes.
Colorization into RGBA and canvas upload still happen for each displayed frame.
Over-budget clips stream and quantize again when revisited. The budget covers sampled
indexes and used flags, not the source RGBA or all app memory.

The earlier per-frame palette flicker came from clearing the current pixels on an
asynchronous frame request, removing the canvas while its replacement was pending.
Keeping a completed frame until atomic replacement fixes that lifecycle gap; it does
not make conversion free or guarantee source-rate playback on slow devices.

Full GIF exports intentionally convert two sequential passes: the first identifies
the used-color union for a valid global palette table including transparency, then
the second encodes frames with worker acknowledgment/backpressure. That repeats
quantization but avoids an unbounded full-resolution RGBA/index bake for every frame.
Export delays and loop metadata remain source-based rather than preview-speed-based.

## Validation

The normal suite passed 608 tests with two explicit-GC tests skipped. The focused
decoding/import/drop/generated run passed 83 tests, including native source-to-generated
two-color preservation, retention of genuine one-unit RGB differences, partial-alpha
bytes, native fallback, pixel limits, cancellation and resource cleanup.

Eight built-app regression cases passed on both desktop Codex Chromium and the physical
Android phone:

- First Generated selection retained the preview with zero canvas gaps, compared
  with two before the fix.
- Clearing the wall kept one animated demo canvas with 11 generated colors.
- A persisted Generated selection at empty startup likewise showed the demo and
  its 11 colors on one canvas.
- A wholly invisible real wall stayed at zero colors and zero canvases, with Save disabled.
- The supplied PNG alone generated exactly `#222323` and `#f0f6f0`.
- The PNG plus the 56-frame GIF shared 32 generated colors with no blank paints or
  canvas gaps. Both devices produced the same 32-color palette in this tested case
  after native PNG decoding; this is not an arbitrary-profile byte-identity guarantee.
- Actual Save all ZIP downloads contained the two source assets. Independent Pillow/
  NumPy checks of all 57 decoded output frames preserved alpha, palette membership,
  dimensions, GIF delays and loop metadata. The sprite's visible RGBA was exact, and
  both devices' decoded exports matched each other.
- Deliberately failing the generation worker preserved both existing previews and
  disabled Save; selecting Generated again successfully retried and displayed all
  three current assets.

The final review also required preserving the prior preview on generation failure and
preventing the retained converted fallback from overriding explicit Original comparison.
Those guards were fixed and the eight cases rerun after the final rebuild. Explicit
Original comparison showed the source even with zero generated colors. The physical
phone's popup fit with all four settings, including Opacity cut. Desktop opacity
boundary changes regenerated correctly, clearing invisible output and disabling Save;
RGB and Cleanup controls remained usable. Importing the supplied PNG as a palette
also produced exactly two colors.

Native PNG checks against the prior color-managed path passed for the supplied indexed
image, partial transparency, an sRGB ICC profile and gAMA metadata. No alpha differences
were found. Native decoding avoids canvas readback but browser decoder handling can
still round partially transparent channels; arbitrary profile fidelity remains the
browser's responsibility. The final full suite passed 608 tests with two GC tests
skipped; a separate forked run with `--execArgv=--expose-gc` passed all 47 generated,
limit and cleanup client tests, including both retention tests. Production build passed.
These cases do not cover every editor interaction or prove prolonged animation
performance; the preceding whole-wall stress study covers the unchanged cache design.

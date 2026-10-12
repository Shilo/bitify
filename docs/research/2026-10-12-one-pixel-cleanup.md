# Optional one-pixel palette cleanup

Date: October 12, 2026. Scope: the supplied 29×41 AI sprite, six building sprites,
PICO-8 and the supplied shared 255-color palette, plus deliberate-detail and animation
counterexamples. Cleanup is an optional palette effect, Off by default. It does not
change the legacy 1-bit styles.

## Why nearest matching separates the reported pixels

The supplied sprite's zero-based coordinates (26,22) and (26,23) use `#053452` and
`#07050c`. Oklab lightness is about 0.3125 versus 0.1233; linear luminance differs by
roughly 17×. Normal nearest matching therefore reasonably chooses different palette
colors. The other pair, (18,25)/(18,26), uses `#a7a4a0`/`#9c7d85`.
Nearest minimizes individual color error; neither nearest matching nor Max colors
contains an artistic instruction that these pixels form one material or outline.

Brightness-only matching, alternative color spaces, global frequency preferences and
source-color clustering did not demonstrate a reliable fix for both pairs while keeping
the intended surrounding colors. Broad spatial smoothing/segmentation damaged deliberate
window lines and textures. Dithering adds texture and addresses missing intermediate
tones rather than this region-coherence problem; it remains excluded.

## Tested research candidate

Use a frozen nearest result. A candidate pixel has no same-label pixel among its eight
visible neighbors. It may adopt a compatible connected neighbor's palette label; two
isolated pixels may merge only when they mutually agree on one of their existing labels.
Do not repeatedly cascade changes. Reject ambiguous choices, including ties that select
different isolated partners even when the proposed label is equal.

The candidate's maximum source-contact distance is 0.22 in Oklab. All immediate contacts
in the candidate neighboring label group must pass it; for a mutual singleton pair,
this is the pair's source-color distance. Each changed participant also passes an
added squared-Oklab-error bound of `0.35²`. These are deliberately lossy experimental
gates, not an optimal perceptual detector. Cleanup uses these Oklab gates with both
Oklab and RGB nearest matching. It introduces no colors outside the active palette or
Max colors subset and does not change binary transparency.

For PICO-8/Oklab/All, the sprite's two reported pairs merge: 15 of 678 visible pixels
change, and used colors fall from 11 to 9. Across the sprite and six buildings, the
research candidate preserved alpha, palette membership and the cap in 56 combinations
(two palettes × two matching rules × All/8 × seven images). No mirror or transpose
disagreement was observed in those cases. This is coverage, not proof of invariance for
all possible inputs. Earlier broader variants disagreed under reflection in 17 of
112 tested cases and were rejected.

## Intentional details remain ambiguous

Constructed controls deliberately reuse the problem source RGBs as a navy eye and a
subtle gray highlight. Cleanup removes both, although it correctly removes 56 known
speckles and preserves connected mullions, diagonal lines, ramps and checker texture.

A sweep of 874 PICO-8/Oklab/All cutoff/error-budget/exact-protection configurations
found 32 that merged both reported pairs. None also preserved both deliberate-detail
controls. Settings preserving both details left all 56 noise speckles. Protecting exact
palette source colors does not protect these non-palette details. These constructed
counterexamples do not estimate a real-world damage rate or prove every algorithm fails.

Identical RGBA bytes can nevertheless represent either a deliberate eye or unwanted
noise. A deterministic image-only rule cannot satisfy contradictory artistic annotations
without additional information. Explicit keep annotations preserved the selected
details in tests, but supply intent rather than detect it. They are not implemented:
region/pixel editing and motion tracking would require a separate product decision.
Protected labels may safely remain anchors for neighboring unprotected pixels; excluding
all protected pixels from proposals unnecessarily blocks safe merges.

## Whole-animation agreement

A one-step green-channel jitter can cross a cleanup gate while nearest output stays
navy, producing black/navy flicker. For GIFs, prepare every full-resolution frame under
one shared indexed palette/subset. Retain a replacement at a coordinate only if every
frame has the same baseline index and proposes the same replacement index. Otherwise,
every frame keeps its baseline at that coordinate.

This cannot increase binary per-coordinate palette-label transitions relative to nearest:
changing baseline coordinates are untouched; constant baseline coordinates remain
constant. It is not a guarantee of perceived stability or correct material tracking.
A consistently proposed deletion can still erase a stationary intentional eye.
Moving noise is conservatively retained. In the eight-frame threshold-eye control,
unguarded cleanup adds seven transitions and four wrong frame-pixels; agreement restores
0/0. For moving noise, independent cleanup removes eight wrong pixels; agreement keeps
all eight and the baseline's 14 transitions.

Research GIF crops initially hid moving speckles at x4–11/y20. The crop was corrected;
independent decoding then verified all eight displayed speckle frames and 800ms duration.
Animation evidence must check visible decoded pixels and timing, not only numerical
churn or a GIF file's existence.

## Production contract

Nearest settings adds only **Cleanup: Off / On**, with a concise tooltip explaining
possible detail loss. Off restores ordinary nearest behavior and loads no optional
cleanup module/worker. The preference persists across palette/family switches and visits;
Reset restores Off. It is independent of Max colors and Opacity cut.

On prepares a full-source replacement map after any palette-subset selection. Still
images use one source frame; GIFs use every frame, including first-frame PNG Copy.
Wall/Preview sample that same map at the nearest quantizer's center-spread coordinates;
Save, Copy, ZIP and optimized dragging use the full-resolution map. A save owns its
cleanup preference, immutable settings/palette and captured source/frame references when requested.

Preparation is lazy, shared per image/settings snapshot, and independent of playback,
preview dimensions and Original comparison. A serial worker receives bounded chunks
with acknowledgments, assembles only the current source frame and accumulates clip
agreement. Worker construction unavailability uses the same cooperatively yielding
core on the main thread. Canceling the final subscriber terminates worker work; canceling
one preview does not cancel a concurrent export. Worker/runtime failures are reported
without silently reverting to uncleaned output.

The retained cache is one two-byte-per-source-pixel replacement map per prepared item,
not every converted animation frame. Temporary baseline/proposal/neighbor scratch,
source RGBA, bounded source-color cache, decoding and export buffers are additional
memory. Core loops use typed scratch and yield between bounded blocks. There is no
hard phone-memory or responsiveness guarantee for arbitrary source sizes.

## Verification

The integrated suite passes 525 tests and the production build. The independent review
compared 600 randomized still cases and 300 four-frame clips with the earlier scalar
research algorithm. The production core also exactly matched all 56 supplied
sprite/building combinations and 12 control clips containing 40 frames. Tests cover
worker/fallback parity, bounded transfers, source-buffer ownership, subscriber/worker
cancellation, stale jobs, snapshots, opacity boundaries and cooperative export overlays.

Native Codex browser tested the built app with all seven supplied images, the shared
Aseprite palette, four eight-frame source GIFs, a partial-alpha fixture and a 1.92MP
mixed/noisy image. Independently decoded 43 downloads contained 315 PNG/GIF outputs
and 770 frames: 17,844,896 pixels and 5,839 named assertions passed. Checks cover
palette/subset membership, color caps, alpha, exact reference pixels, dimensions,
GIF frame count/delays/loop and the guard's binary label-transition bound. Actual GIF
Copy PNG and Preview Save outputs were included. Still and mixed ZIP matrices covered
PICO-8/shared 255, Oklab/RGB, All/8, and Cleanup Off/On; opacity cuts 1/128/255 were tested.
Separately, all 56 supplied-image Cleanup Off PNG exports were byte-identical to the
palette-state baseline at `ecb8088`, with unchanged quantizer, limiter and encoder
dependencies verified. Off therefore preserves the tested existing files as well as pixels.

The partial-alpha test initially disagreed even with Cleanup Off. A separate visible
browser decoding witness confirmed the existing bitmap/canvas path rounds source RGB:
pixel (33,33) stored as `[167,164,160,128]` decodes to `[167,163,159,128]`, changing its
PICO-8 RGB nearest winner. Validation used that independently captured decoded RGBA,
including an integrity hash and unchanged alpha checks, instead of assuming disk PNG
bytes equal browser ImageData. The binary-alpha supplied images did not need this
adjustment. Image decoding was not changed by this feature.

Native layout checks included 1280×720, 320×700, 390×844, 320×480, 844×390 and
568×320 with Matching, Max colors, Cleanup and Opacity cut visible. The final popup
retains its 730px outer desktop width, fits narrow safe-area bounds and scrolls as one
vertical column on short screens; controls do not shrink. Keyboard focus brings Opacity
cut into view. This fixes a discovered short-screen clipping/width overflow and an
inherited wrapping behavior that otherwise created horizontal columns. Reset, family
retention, restored settings, Original/converted Preview and rapid matching/cleanup/live
limit changes were exercised without console errors. The new controls were also checked
in light and dark themes at desktop and 320px width. Desktop viewport tests are not
physical iOS/Android or Safari validation; nonzero device safe-area insets remain
unverified on hardware.

The independent reviewer found a synchronous full-export overlay took about 29–40ms
at 12MP on this desktop. The accepted fix uses the same overlay kernel cooperatively;
full exports now yield between bounded blocks. Core-only one-pass Node observations
were about 65ms preparation plus 7–9ms overlay on 1.92MP flat/speckled fixtures, and
86ms plus 2ms on a 512² entropy fixture. Native 1.92MP Save took 1.4–3.1 seconds
across All/8 and Off/On. These cold/warm mixed observations include preview contention,
conversion, compression and browser automation; they are neither comparative speedup
claims nor phone performance budgets.

The optional client/overlay chunk is 5,472 raw / 2,329 gzip bytes; its worker including
core/quantization is 10,392 raw / 4,858 gzip bytes. The alternative cooperative core
chunk is 3,882 raw / 2,055 gzip bytes. These optional chunks load only for Cleanup On.
Initial UI/state integration still adds eager code; the figures are chunk sizes, not
total initial bundle growth or measured network timings. Temporary core scratch is
about 11 bytes/source pixel for a still, up to 15 for later animation frames, plus a
bounded 114,688-byte RGB cache and palette vectors; source RGBA, browser decoding,
quantizer arrays, cached maps, runtime GC and export buffers are additional memory.

## Sources

- [Oklab's published matrices](https://bottosson.github.io/posts/oklab/)
- [Graph-based segmentation](https://www.cs.cornell.edu/~dph/papers/seg-ijcv.pdf)
- [Data and smoothness objectives](https://cs.uwaterloo.ca/~oveksler/Papers/ICCV99.PDF)
- [Temporal consistency research](https://arxiv.org/abs/1808.00449)
- [Earlier shared-palette research](2026-10-11-shared-palette.md)
- [Matching decision](2026-10-11-palette-matching.md)

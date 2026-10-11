# Shared-palette conversion research

Later adoption: **Matching: Oklab / RGB** is now available in Palette settings, with Oklab
as default. The comparisons below record the earlier research stage; Ordered and Diffusion
remain research only. See the [matching decision](2026-10-11-palette-matching.md).
The six supplied building PNGs were compared using the exact supplied 16×16 palette
image: 255 unique visible RGB colors and one transparent pixel. All six buildings have
binary alpha; none has an embedded ICC profile. Their browser-decoded RGBA matched
Pillow and a separate PNG decoder byte for byte.

## Current behavior and verified guarantee

Import the palette once and select it for all images. Exact source colors already in
the palette stay unchanged. Every other retained pixel searches the entire selected
palette for the smallest Oklab distance; repeated source colors choose the same output
color across images and frames. Alpha below the selected opacity cut becomes empty.

This means one shared **allowed RGB set**, not that every image uses every color or
that separate PNG files have identical palette tables or indexes. PNG exports compact
each image's used colors. A pipeline requiring identical indexed tables needs a
separate export feature; it should not infer that guarantee from palette selection.

An independent exhaustive Oklab oracle checked every pixel of all six actual app PNG
exports, their ZIP, and a separate ZIP downloaded through Codex browser. All 204,528
pixels matched, including transparency and exact palette RGB matches. All opaque
output colors belonged to the selected palette. Full-size and reduced previews agreed
with export at the corresponding source sample coordinates. Family switching,
library persistence and reset retaining imports were also exercised.

| Building, in upload order | Original visible RGB colors | Nearest output colors |
|---|---:|---:|
| Copper tower | 1,385 | 73 |
| Clock tower | 24 | 20 |
| Glass spire | 42 | 17 |
| Green tower | 8 | 7 |
| Cream tower | 26 | 14 |
| Dark tower | 22 | 13 |

## Experimental comparisons

The gallery shows the original, current Oklab Nearest, an auxiliary encoded-RGB Nearest,
Ordered at 25/50/100%, and error diffusion at 100%. Ordered 0% is byte-identical to
current Nearest. All experimental converted outputs use only selected palette colors
and preserve the original binary alpha.

- **Ordered:** fit a linear-RGB mixture of two colors among the source's eight nearest
  Oklab palette colors; choose one using a 4×4 Bayer pattern at image coordinates.
  Amount moves the target from the nearest color toward the source color. Exact palette
  source RGBs bypass dithering. The percentages define this experiment, not a universal
  standard for an Amount slider.
- **Error diffusion:** left-to-right Floyd–Steinberg in linear RGB, with Oklab nearest
  selection. Amount scales outgoing error. Transparent pixels and exact palette source
  pixels are barriers; lost error is not redistributed. This deliberate preservation
  policy differs from unconstrained diffusion.
- **RGB Nearest:** minimize squared differences in encoded RGB channels. It challenges
  the assumption that Oklab necessarily looks best on every asset; it is not a shipped
  option at the time of this experiment. The RGB choice differed from Oklab on 7.6–47.0% of visible pixels across these
  buildings. Each minimizes its own metric; neither proves universal visual superiority.

An unrestricted all-palette-pairs Ordered variant was also tested. It can choose distant
complementary endpoints with a good average but distracting individual pixels, so it
is supplementary evidence rather than the primary gallery's Ordered method.

## Findings and recommendation

Nearest is the minimum individual-pixel error under the current Oklab rule. It keeps
flat source colors flat and retains window geometry. Missing palette shades still cause
hue shifts: green/teal glass, pinkish gray and cooler cream were visible in these results.
That is not an incorrect search, but it does limit claims that the result is visually
optimal. RGB Nearest reproduced the cream tower's dark blue more closely in our visual
review, while other buildings had mixed tradeoffs.

Ordered improves average tone on flat regions by mixing neighboring pixels. Even 25%
adds visible colored dots on these buildings; stronger amounts produce crosshatching.
Diffusion produces irregular speckles and changes the relationship between repeated
source shades. Both can improve local average hue while increasing individual-pixel
Oklab error. Local 3×3 mean error, flat-region texture and individual-pixel error were
measured separately; no combined quality score was used. The glass spire has no flat
3×3 source-color interior, so no flat-interior score was invented for it.

Keep Nearest as the only shipped palette method for now. These pixel-art fixtures do
not establish that a new style control would be worth its complexity. Optional Ordered
may be useful for intentional texture or smooth gradients, but that needs different
fixtures and a user choice after seeing these examples. If exact hue fidelity matters
more than preserving this exact palette, editing its missing shades is more predictable
than adding dither. That would change the palette and was not done in this research.

## Animation scope and independent challenge

The attached files are still PNGs. The animated examples are explicitly synthetic:
six one-pixel horizontal pan frames at constant brightness, followed by six stationary
brightness-change frames, each 80 ms. Source GIF colors were preserved exactly rather
than first reduced by a GIF encoder. This tests pattern behavior, not a real source
animation's artistic intent.

During the constant-brightness pan, Ordered changed the output at 14.12%, 26.18% and
38.55% of source-aligned unchanged pixels at 25/50/100%. Nearest and diffusion changed
none in this particular translation test. A supplementary Ordered pattern anchored to
the known sprite translation also changed none; deriving such an anchor reliably from
arbitrary animation is a separate unsolved design question.

The reviewer caught a confounded first sequence whose equal-brightness offsets matched
the four-pixel Bayer period. It was replaced before presenting results. Pure translation
over empty padding does not establish that error diffusion must shimmer. A separate
one-pixel change test found diffusion changed other unchanged source sites in five of
six buildings; Nearest and Ordered did not. This demonstrates propagation sensitivity,
not inevitable flicker in every animation.

The independent reviewer challenged algorithm definitions, color-management assumptions,
individual versus averaged error, palette-table semantics, texture, RGB matching and
animation evidence. We agreed on the recommendation above after correcting the motion
experiment. Detailed local evidence and images are in the worktree's ignored
`.tmp/shared-palette-research/` directory; the generated user comparison bundle includes
the PNGs, GIFs, metrics and review.

The final actual-app run passed 124 checks with zero console errors, including the
revised 12-frame GIF and a 255-opaque-colors-plus-empty GIF calibration. Independent
research decoding covered 58 palette-output PNG records and 11 GIFs / 122 frames;
six RGB auxiliary PNGs were checked separately. These overlapping checks are evidence
of the fixture workflow, not a claim that every browser, color profile or art style was tested.

## References

- [Oklab author's description and matrices](https://bottosson.github.io/posts/oklab/)
  explain the perceptual approximation used by the current matcher.
- [ImageMagick quantization examples](https://usage.imagemagick.org/quantize/#dither)
  discuss limited-palette mixtures and speckling; they do not select a winner for these assets.
- [FFmpeg paletteuse](https://ffmpeg.org/ffmpeg-filters.html#paletteuse)
  documents ordered-pattern and error-diffusion tradeoffs for GIF workflows.

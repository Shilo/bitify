# Conversion styles: Cutout and two fixes

Date: 2026-10-07
Status: decisions approved in conversation; this document awaits review.

This changes how Bitify converts images. It adds one style, makes it the default, and fixes
two defects found while reviewing the existing styles. When it is built, the conversion
sections of [2026-10-06-bitify-app-design.md](2026-10-06-bitify-app-design.md) and
[docs/styles.md](../../styles.md) are updated in the same change, and those two stay the
source of truth afterwards.

The comparison sheet from the research is saved next to this file as
[2026-10-07-conversion-styles-spike.png](2026-10-07-conversion-styles-spike.png). It was
drawn by throwaway code, with the light color shown as cream and the dark color as black.
Its "Snap" column is what Solid gives when the first color is the darker one. The app must
be built from the rules below, not from that code.

## What was asked for

Stated by the user:

- Research, review and challenge the conversion algorithms; improve them and add what is
  missing.
- Styles should be useful or smart, for example reproducing the art style of the game End of
  End.
- A style for simple color snapping, which follows Auto and the threshold.
- Every style must respond to Swap, and must work whichever of the two colors is the dark
  one.

Decided in conversation:

- Solid already is the color snapping style: a brightness cut that follows Auto and the
  threshold. It stays as it is, under its own name. No separate Snap style is added.
- Cutout, the End of End style, becomes the default.
- No second slider and no detection of upscaled art in this round.

## The rule every style follows

A conversion never looks at the two chosen colors. It only decides, for every solid pixel,
whether it gets the first color or the second.

- **First color:** lines and dark pixels.
- **Second color:** fill and light pixels.

Swap exchanges the two colors, so in every style it turns the picture into its inverse.
Either color can be the dark one: with the darker color first the picture has the same
light and dark as the original, and with the lighter color first it is inverted.

This is how the app works today, and since 2026-10-07 the palettes follow the same idea: a
palette is stored as a dark and a light color, choosing one puts the dark color first unless
Swap has put the lighter one first, and the app opens on Glow with the dark color first. So
every palette starts with the same light and dark as the original, in every style, and
nothing about palettes changes here.

The research tried the alternative, styles that read the colors (see the research record),
and it was turned down.

## What the review found

Tested on ten images: the user's skeleton sprite, the logo, the style-preview ball, the
prototype's six sample sprites and its opaque scene, and a soft-shaded ball with no parts.

1. **Lines Auto collapses on soft shading.** When an image has only small color steps, Otsu
   splits those steps and picks a threshold around 5. Almost every pixel then sits on the
   darker side of an "edge" and the whole sprite becomes line color.
2. **Pattern styles break outlines and highlights.** The cut-off is shifted by a fixed
   amount, which can pass the image's darkest or lightest color. Across the test images, at
   Auto, 82 (Checker), 109 (Bayer) and 91 (Atkinson) pixels of an image's darkest or
   lightest color ended on the wrong side. On the ghost sprite Atkinson erased the face.
3. **Lines ignores brightness.** A bright part and a dark part both become the same hollow
   fill. On small sprites that loses the strongest signal in the image. End of End does the
   opposite: its sprites are filled shapes, with thin cuts in the background color between
   parts, and no outline around them.

## Styles

Seven, in this order. Cutout is the default.

| Style | Change |
|---|---|
| **Cutout** (default) | New. |
| **Lines** | Rule unchanged. Auto no longer goes below 24. |
| **Solid** | Unchanged. |
| **Checker** | Uses the image's own brightness range. |
| **Bayer** | Uses the image's own brightness range. |
| **Atkinson** | Uses the image's own brightness range. |
| **Silhouette** | Unchanged. |

### Cutout

Bright parts are filled, dark parts are left dark, and the boundaries between parts are cut
in the opposite tone. Every test below uses the tones from step 1, not the results of the
later steps.

1. **Tone.** As in Solid: a solid pixel brighter than the threshold is **light**, every
   other solid pixel is **dark**.
2. **Seams.** A pixel is a seam if one of its four neighbours has the same tone, differs
   from it by more than the seam strength, and this pixel is the darker of the two. On equal
   brightness the pixel earlier in reading order is the darker one. A seam takes the
   opposite tone. Exception: a light pixel that touches empty space, diagonals included, is
   never a seam, so cuts do not eat into the silhouette.
3. **Rim.** A dark pixel that touches empty space in one of the four directions, and has no
   light pixel among its eight neighbours, becomes light. That keeps the shape of a dark
   part, which would otherwise have no edge.

Dark pixels get the first color and light pixels the second.

The difference between two pixels is the one Lines uses. The canvas edge counts as empty
space under the same condition as in Lines: only when the image has at least one empty
pixel.

The threshold sets the brightness cut of step 1. The seam strength is always automatic (see
below).

Known limits:

- A single flat shading step, such as a shadow drawn in one darker color, is cut like a part
  boundary.
- A dark part two pixels wide or less becomes all rim.
- Source art that is already dithered becomes busy.

### Checker, Bayer and Atkinson

All three first turn brightness into a **tone** from 0 to 1 that runs through the image's
own range: the darkest brightness in the image is 0, the threshold is 0.5 and the lightest
brightness is 1.

- At or below the threshold: `0.5 × (brightness − darkest) / (threshold − darkest)`, or 0
  when the threshold is not above the darkest.
- Above the threshold: `0.5 + 0.5 × (brightness − threshold) / (lightest − threshold)`.

A pixel is then light or dark:

- **Checker:** light if the tone is above 0.25 where `x + y` is even, above 0.75 where it
  is odd.
- **Bayer:** light if the tone is above `(b + 0.5) / 16`, where `b` is the matrix value at
  (`x mod 4`, `y mod 4`).
- **Atkinson:** the working value is `tone × 255`. A pixel is light if its working value is
  above 127.5. The error (working value minus 255 or 0) is spread as before: one eighth to
  each of six neighbours.

Dark pixels get the first color and light pixels the second, as today.

With a threshold inside the image's range, Checker and Bayer can no longer turn the darkest
color light or the lightest color dark. On the test images Atkinson did not either.

## Auto

| Value | Used by | How it is picked |
|---|---|---|
| Brightness cut | Cutout, Solid, Checker, Bayer, Atkinson | Otsu on the brightness histogram. Fallback 127. Unchanged. |
| Edge strength | Lines | Otsu on the differences between adjacent solid pixels, zeros left out, but never below 24. |
| Seam strength | Cutout | Otsu on the differences between adjacent solid pixels **of the same tone**, zeros left out, but never below 24. Tones are split at the image's Auto brightness cut, also when the threshold is set by hand, so seams do not jump while the slider is dragged. |

The floor of 24 is one constant shared by both. It is a judgement from the test images: the
smooth shading on the two shaded balls steps by 9 or less, and the weakest boundary that
should be drawn, between the armour plates of the user's skeleton, is about 37.

Seam strength needs its own value because Otsu over all differences is pulled up by the
large light-to-dark jumps, which the tone split already shows. On the user's skeleton it
gave 73 and missed most boundaries inside the armour; over same-tone differences it gives
47.

The threshold slider and number box show and set the brightness cut for every style except
Lines (edge strength) and Silhouette (ignored).

## Animated GIFs

All frames of an animation share one brightness cut, edge strength, seam strength, and
darkest and lightest brightness, taken from all frames together. The seam strength is
picked after the shared brightness cut is known.

Cutout, Solid, Checker and Bayer depend only on a frame's own pixels and those shared
values, so they do not shimmer. Atkinson still can.

## Code

`src/lib/bitify.js`:

- `analyze` also returns the darkest and lightest brightness and the seam strength.
- `unify` shares them across frames as described above.
- `mask` gains the style key `cutout` and the new rules for `checker`, `bayer` and
  `atkinson`. Its arguments and its result (0 empty, 1 first color, 2 second color) do not
  change, and it still does not depend on the colors.
- `autoThreshold` returns the edge strength for Lines and the brightness cut otherwise, as
  today.

Interface:

- The list of styles shows seven entries: one row of seven, and on phones a grid four wide.
  Check it at desktop width and at phone width.
- The default style is `cutout`.
- Help text for the threshold in Cutout: "Parts brighter than N are filled." The other
  styles keep theirs.

## Documents to update in the same change

- `docs/superpowers/specs/2026-10-06-bitify-app-design.md`: the conversion, threshold,
  advanced panel, animated GIF, structure and testing sections.
- `docs/styles.md`: a new Cutout section and new Checker, Bayer and Atkinson sections, with
  every worked example regenerated by running the code on the preview ball. No example is
  drawn by hand.
- `README.md` and `CLAUDE.md`: the count of styles, their names and the default.
  (`AGENTS.md` only includes `CLAUDE.md`.)

## Testing

Unit tests in `src/lib/bitify.test.js`, on small hand-made grids:

- Checker, Bayer, Atkinson: an image with a darkest, a middle and a lightest color keeps the
  darkest dark and the lightest light at Auto and at a low and a high manual threshold;
  the middle color gives a checkerboard (Checker), half of a 4×4 cell (Bayer), a mix
  (Atkinson). The existing tests that use an image of one flat color are replaced, since
  such an image has no range.
- Cutout: a light part with a darker light part inside gets a dark seam one pixel wide; a
  dark part with a darker part inside gets a light seam; a dark part on the silhouette gets
  a light rim; a dark outline around a light part is kept; a light pixel on the silhouette
  is never cut; an opaque image gets no rim; a shading step below the seam strength draws
  nothing.
- Lines Auto: a soft gradient with no parts gives an outline and flat fill; the Auto value
  for an image with no solid pixels is 24.
- `unify`: frames share the darkest and lightest brightness and the seam strength.
- Empty pixels stay empty in every style, including on the large random image.

By hand, at desktop width and at phone width with touch: every style on a sprite, an opaque
image and a GIF; Swap in every style; saving a PNG and a GIF in Cutout.

## Not included

- A second slider for edge and seam strength.
- Detecting art that was scaled up by a whole number and converting it at its native size.
  Detection worked in the research; it is a separate change.
- Line thickness, cleanup of stray pixels, more pattern shapes.

## Research record

What was tried and not adopted, so it is not tried again without new evidence:

- **A style that ignores the order of the two colors** (light pixels always get the lighter
  color), first proposed as "Snap" to replace Solid. It can never come out inverted, but
  Swap does nothing in it. Turned down: Swap must change the picture in every style.
- **Cutout that reads the chosen colors** to decide which tone gets the rim. Swap then
  changes nothing on an opaque image, and little on a sprite that has its own dark outline.
  Turned down for the same reason.
- **Perceptual lightness and color distance (OKLab)** in place of brightness and the
  largest channel difference. The brightness cut changed no pixel on five of ten images and
  looked worse on two (the mushroom lost its spots, the potion its body). As the edge and
  seam measure it changed a few pixels at most, and drew a broken line on the sword.
- **Cutting by color instead of brightness** (projecting each pixel onto the line between
  the two chosen colors) gave the same result as brightness with a cream and a near-black,
  and would make every mask depend on the exact colors. Not tested with two colors that
  differ mainly in hue.
- **A tone curve from 0 to 255 through the threshold**, without the image's own range. It
  flipped more darkest and lightest pixels than today's Bayer (143 against 100 on nine
  images), because a sprite's darkest color is rarely black.
- **Three tones from a two-threshold Otsu** for Checker, **a 2×2 Bayer matrix** and
  **interleaved gradient noise**: no clearer than what exists at sprite sizes.
- **Per-tone seam strengths** (one Otsu for light parts, one for dark): unstable; it drew
  contour bands on the preview ball.

Outside sources, read during the research, agree that small 1-bit sprites want flat shapes
and lines with as little dithering as possible: Pedro Medeiros's 1-bit and outline
tutorials (saint11.art), Lucas Pope on Return of the Obra Dinn (PlayStation Blog, 2019),
Pixel Parmesan's "Dithering for pixel artists", and Panic's "Designing for Playdate". No
description of how End of End's sprites are made was found; the Cutout rules come from
looking at its Steam screenshots.

## Addendum, 2026-10-07: Hatch, Noise and the Auto review

Asked for after the first round was merged: every further style that is reasonably distinct
from the others, one hatch style at most, and a review of the Auto value of every style.
[2026-10-06-bitify-app-design.md](2026-10-06-bitify-app-design.md) and
[docs/styles.md](../../styles.md) hold the resulting rules; this section records why.

### Styles added

- **Hatch.** Diagonal lines three pixels apart. A version with lines four pixels apart gave
  one more shade but was coarse on 16-pixel sprites and broke up the letter on the logo, so
  the finer one was taken.
- **Noise.** Blue-noise dithering from a 16×16 grid made once with the void-and-cluster
  method and stored in the code. Its look is close to Atkinson's; it was added because its
  pattern is fixed in place, so animations do not shimmer. On small flat sprites it reads
  as dirt, which `docs/styles.md` says.

Not added: **Crosshatch** (two crossing sets of lines). At sprite sizes it was hard to tell
from Checker, and it turned a dark sky light.

That makes nine styles: Cutout, Lines, Solid, Checker, Hatch, Bayer, Noise, Atkinson,
Silhouette.

### Auto, style by style

Compared on twelve images: the ten from the first round, a sprite with a two-shade outline,
and two shaded sprites with a single outlier pixel (one white glint, one black speck).

| Auto value | Verdict | What it was compared with |
|---|---|---|
| Brightness cut for Cutout and Solid | Otsu stays. | Otsu over the distinct colors (each color once, whatever its area): turned the heart into a blob. The mean brightness: lost the potion's body. The middle of the brightness range: also lost the heart's outline. |
| Center for Checker, Hatch, Bayer, Noise and Atkinson | **Changed** to the point halfway between the mean brightness of Otsu's dark group and of its light group. | Otsu's value (before): the lighter shade of a two-shade outline came out half patterned, and the logo's letter washed out. The middle of the empty gap above Otsu's value: fixed both, but turned the potion's mid-tone body solid. The middle of the brightness range: the best tone on most sprites, but one outlier pixel flattened a whole sprite. |
| Edge strength for Lines | Otsu with the floor of 24 stays. | Otsu over the distinct differences: the same or worse. A fixed 40: more detail on the skeleton, but a shading line across the logo and a checkered sword blade. A fixed 64: close to Otsu. |
| Seam strength for Cutout | Unchanged. | Reviewed in the first round. |

With the new center, Checker and Hatch keep both shades of a two-shade outline dark. Bayer
and Noise can still light an occasional pixel of the lighter shade, because their lowest
cut-offs are close to 0.

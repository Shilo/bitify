# Conversion styles

How each of Bitify's eleven styles decides which of the two colors a pixel gets, and what each
style's own settings change. The code is in [src/lib/bitify.js](../src/lib/bitify.js); the
tests beside it pin every rule described here. The settings are listed in
[src/lib/settings.js](../src/lib/settings.js).

The menu and stepping order is **Cutout → Solid → Lines → Stencil → Icon → Checker →
Bayer → Hatch → Atkinson → Noise → Silhouette**. General shape conversions come first,
then the two negative-space styles, then shading patterns, then the plain mask. This is
a workflow grouping, not a measured popularity ranking. Checker and Bayer share regular
dot patterns; Hatch uses directional strokes; Atkinson diffuses tone; Noise scatters it.

## What all styles share

Every pixel ends up in one of three states:

- **Empty.** The source pixel's alpha is below 128, or below the style's Opacity cut where
  that has been changed. It stays fully transparent in every style.
- **First color.** Lines and dark pixels. This is the left swatch in the dock.
- **Second color.** Fill and light pixels. This is the right swatch.

There is nothing in between: output pixels are fully opaque or fully transparent, and only
ever one of the two chosen colors.

A style decides only which pixels are first color and which are second. It knows nothing
about what the two colors are, and no style prefers a palette or expects the first color
to be the darker one. Swap exchanges the two colors without changing which pixels are
which, and works the same in every style: with the dark color first the result keeps the
tones of the original, and with the light color first it is the same picture inverted.
See [palettes.md](palettes.md).

Two measurements are used throughout:

- **Brightness** of a pixel is `0.2126 R + 0.7152 G + 0.0722 B`, rounded, from 0 to 255,
  unless the style's Brightness setting reads it from something else.
- **Difference** between two pixels is the largest of their red, green and blue differences,
  from 0 to 255. It is used by Lines, Cutout and Stencil's Edges.

### The threshold

Every style except Icon, Stencil and Silhouette depends on one number from 1 to 254, the
threshold. Each
style keeps its own.

- In **Lines** it is how different two neighbouring pixels must be to count as an edge.
- In **Cutout, Solid, Checker, Hatch, Bayer, Noise and Atkinson** it is the brightness cut-off between dark
  and light.

**Auto** picks the threshold for each image with Otsu's method. Otsu's method takes a
histogram and finds the value that splits it into two groups that are each as tight as
possible, and as far apart as possible.

- For Cutout and Solid the histogram is of pixel brightness, so Auto lands between the
  image's dark tones and its light tones. If there is nothing to split, it uses 127.
- For Checker, Hatch, Bayer, Noise and Atkinson, Auto starts from that same split and takes the point
  halfway between the average brightness of the dark group and that of the light group.
  Otsu's own value is the lightest brightness of the dark group, and a pattern style gives
  the color at its threshold a half-and-half pattern, so with Otsu's value the lighter shade
  of a two-shade outline would come out patterned. Halfway between the groups, dark colors
  stay dark or nearly so, light colors stay light or nearly so, and what lies between them
  is patterned.
- For Lines the histogram is of the differences between every pair of horizontally or
  vertically adjacent solid pixels (identical neighbours are left out). Soft shading steps
  form one group and real part boundaries form the other, so Auto lands between them. It
  never goes below 24, so an image with only soft shading gets an outline and a flat fill
  instead of lines along its shading.

- Cutout also needs a **seam strength**, which is automatic unless its Seams setting gives
  one: Otsu on the differences
  between adjacent solid pixels of the same tone, with tones split at the image's Auto
  brightness cut-off, and never below 24. The large jumps from light to dark are left out
  because the tone split already shows them; with them in, the value comes out too high to
  find the boundaries inside a dark or a light area.

A manual threshold applies the same number to every image.

For an animated GIF, Auto is picked once from all frames together. Picking it frame by frame
would let a pixel flip between the two colors as the animation plays.

### Tone

Checker, Hatch, Bayer, Noise and Atkinson do not compare brightness with the threshold directly. They
first turn brightness into a **tone** from 0 to 1 that runs through the image's own range:
the darkest brightness in the image is 0, the threshold is 0.5 and the lightest brightness
is 1.

- At or below the threshold: `0.5 × (brightness − darkest) / (threshold − darkest)`, or 0
  when the threshold is not above the darkest.
- Above the threshold: `0.5 + 0.5 × (brightness − threshold) / (lightest − threshold)`.

An image's darkest color is therefore always tone 0 and its lightest always tone 1, as long
as the threshold lies between them, and outlines and highlights stay whole. A threshold
outside the image's range puts every pixel on one side of it, and then the darkest or the
lightest color can be patterned. A manual threshold can be outside the range of some images,
because it applies to all of them. For an animated GIF the darkest and lightest brightness
are taken from all frames together.

For the example below the darkest brightness is 25 and the lightest 240.

### Settings

Every style has settings of its own beyond the threshold. They are described under each
style below. Each is remembered for each style separately, the threshold included, and at
its default a style converts exactly as described here. Two settings are the same wherever
they appear:

- **Brightness** (every style but Lines and Silhouette): what brightness is read from.
  **Luma** is the weighted mix above. **Value** is the largest of red, green and blue, which
  keeps strongly colored parts light: pure blue has a luma of 18 and a value of 255. **R**,
  **G** and **B** read one channel alone, like a colored filter over the lens: with R, red
  parts are light and blue and green ones dark. G is close to Luma, which is mostly green.
  The image's brightness range and its Auto values follow the choice. The difference
  between two pixels, which Lines and Cutout's seams go by, is always of the colors.
- **Opacity cut** (every style), 1 to 255, default 128: alpha below it is an empty pixel.
  Lower it to keep soft edges, glows and shadows as part of the shape; raise it to trim
  them off. It only changes an image that has a partly see-through pixel. Pixel art with
  hard edges and photos have none and look the same at every cut, so the app shows this
  setting only while an image on the wall has one.

Two more are shared by the styles that turn brightness into a pattern:

- **Shading** (Checker, Hatch, Bayer, Noise, Atkinson), 0 to 100%, default 100%: how far
  from the threshold a tone is still patterned. The tone becomes
  `0.5 + (tone − 0.5) / shading`, held between 0 and 1. At 100% tones are patterned all the
  way to the image's darkest and lightest. At 50% a tone half way there is already solid
  dark or light, and only the tones near the threshold are patterned. At 0 nothing is,
  which is Solid.
- **Scale** (Checker, Hatch, Bayer, Noise), 1× to 4×: each cell of the pattern is drawn
  that many pixels wide and high. One-pixel patterns vanish into grey on a large image;
  a larger scale keeps them readable. On the wall, a large image is drawn smaller than it
  is, and its pattern is drawn as coarse as it will be in the saved file, down to the
  finest the screen can show.

### The example used below

Each style is shown on the small ball used for the style buttons in the Style panel: a
14×14 circle with a dark outline, a body shaded from a highlight at the top left, and a
darker stripe across the middle. Here is its brightness, one hex digit per pixel (`0` black,
`f` white, blank for empty):

```
    111111
   11dddc11
  1eeeddccb1
 1defeddccbb1
11deeeddccbb11
1dddddddccbaa1
1cdddddccbbaa1
14455544444431
14444444444431
11444444444311
 1abbbaaaa991
  1aaaaaa991
   11999911
    111111
```

In the results, `#` is the first color, `.` is the second color and blank is empty. All use
Auto, which for this image is 81 for Cutout and Solid, 120 for the pattern styles, 52 for
Lines and 24 for Cutout's seams.

## Cutout

The default. Filled shapes with their parts cut apart, after the game End of End. Bright parts are
filled, dark parts are left dark, and what separates two parts of the same tone is a thin
cut in the other tone. No outline is drawn around a light part.

It works in three steps. Every test uses the tones from step 1, not the results of the
later steps.

1. **Tone.** A solid pixel brighter than the threshold is light; every other solid pixel is
   dark. This is Solid.
2. **Seams.** A pixel is a seam if one of its four neighbours has the same tone, differs
   from it by more than the seam strength, and this pixel is the darker of the two. A seam
   takes the opposite tone: a dark cut inside a light area, a light one inside a dark area.
3. **Rim.** A dark pixel that touches empty space in one of the four directions, and has no
   light pixel among its eight neighbours, becomes light. That gives a dark part an edge
   where it would otherwise have none.

Dark pixels get the first color and light pixels the second.

```
    ######
   ##....##
  #........#
 #..........#
##..........##
#............#
#............#
.############.
.############.
..##########..
 #..........#
  #........#
   ##....##
    ######
```

The body is brighter than 81, so it is filled. The stripe is darker, so it is left dark.
The original's own dark outline stays dark around the body: it has light pixels beside it,
so it is not a rim. At the two ends of the stripe the outline and the stripe are both dark
and differ by more than 24, so the outline pixels beside the stripe are seams and turn
light. The two outline pixels at the lower corners of the stripe have no stripe beside them
and no light pixel around them, so they are rims and turn light too. Together they close the
shape where the dark stripe would otherwise run into empty space.

Details:

- **The silhouette is never cut.** A light pixel that touches empty space, diagonals
  included, is never a seam. Without this, a sprite whose edge is a slightly darker shade
  would lose its outer ring of pixels.
- **Equal brightness, and the canvas edge,** work as in Lines: on a tie the pixel earlier in
  reading order is the darker one, and the canvas edge counts as empty only if the image
  has at least one empty pixel.
- **Threshold.** It moves the brightness cut of step 1: lower values fill more of the
  sprite, higher values leave more of it dark. It does not change the seam strength.

Settings:

- **Seams**, Auto or 1 to 255: the seam strength of step 2. Lower values cut along softer
  changes, down to the steps of the shading. Higher values keep only the strongest
  boundaries. No difference is above 255, so 255 cuts no seams at all.
- **Rim**, On or Off: step 3. Off leaves dark parts on the silhouette without their light
  edge. With Seams at 255 as well, Cutout is exactly Solid.

Seams at 8, seams at 255, and rim off:

```
    ######           ######           ######
   ##....##         ##....##         ##....##
  #.#...##.#       #........#       #........#
 #.#.######.#     #..........#     #..........#
##..#...######   ##..........##   ##..........##
#...#.....##.#   #............#   #............#
#...#......#.#   #............#   #............#
.############.   ##############   .############.
.############.   .############.   .############.
..##########..   .############.   #.##########.#
 #..........#     #..........#     #..........#
  #.##.....#       #........#       #........#
   ##.#.###         ##....##         ##....##
    ######           ######           ######
```

At 8 the steps of the body's shading are cut as seams. At 255 the seams at the ends of the
stripe are gone and only the rims are left. With the rim off, the two corner pixels stay
dark and the seams beside the stripe remain.

Limits:

- A flat shading step, such as a shadow drawn in one darker color, is cut like a part
  boundary.
- A dark part two pixels wide or less becomes all rim.
- Art that is already dithered becomes busy.

## Solid

A plain brightness cut. A pixel brighter than the threshold becomes the second color; every
other solid pixel becomes the first.

```
    ######
   ##....##
  #........#
 #..........#
##..........##
#............#
#............#
##############
##############
##############
 #..........#
  #........#
   ##....##
    ######
```

The outline and the stripe are darker than 81, so they are the first color. The body is
brighter, so it is the second. All shading inside each group is lost.

This is the classic 1-bit conversion. It suits art that already reads as two tones, and it
is the most predictable style to tune by hand.

## Lines

It draws an outline around every part of a sprite, not only around its
silhouette, and fills everything else flat.

A solid pixel becomes the first color (a line) if either of these is true for any of its
four neighbours (left, right, up, down):

1. The neighbour is empty.
2. The neighbour differs from it by more than the threshold, and this pixel is the darker of
   the two.

Every other solid pixel becomes the second color (fill).

```
    ######
   ##....##
  #........#
 #..........#
##..........##
#............#
#............#
##############
#............#
#.##########.#
 #..........#
  #........#
   ##....##
    ######
```

The outline is rule 1. The two lines across the middle are rule 2: they are the top and
bottom rows of the stripe, which is darker than the body on either side. The middle row of
the stripe has only stripe pixels above and below it, so it is fill. The shading inside the
body changes by less than the threshold from pixel to pixel, so it draws nothing.

Details:

- **Why the darker side.** An edge has two sides. Marking only the darker one keeps a
  boundary one pixel wide, and it lands on the pixels an artist would have drawn as the
  outline.
- **Equal brightness.** When two neighbours differ in color but not in brightness, the one
  that comes first in reading order takes the line, so the boundary is still one pixel wide.
- **The canvas edge.** It counts as empty only if the image has at least one empty pixel. A
  sprite cropped tight to its canvas still gets a complete outline, while a fully opaque
  scene does not get a frame drawn around it.
- **Threshold.** Lower values turn softer changes into lines, which brings out more detail
  and eventually picks up shading. Higher values keep only the strongest boundaries.

Settings:

- **Thickness**, 1 to 3: a solid pixel fewer than that many steps (left, right, up or down)
  from a line becomes a line too. On a large image a one-pixel line is hair-thin, and this
  gives it weight. On a small sprite it soon fills everything.
- **Fill darks**, Off or 1 to 254: a pixel this dark or darker is first color as well, so
  dark areas such as hair or shadow stay filled instead of becoming an outline around
  empty fill. Thickness does not widen them.

Thickness 2, and fill darks at 100:

```
    ######           ######
   ########         ##....##
  ###....###       #........#
 ##........##     #..........#
###........###   ##..........##
##..........##   #............#
##############   #............#
##############   ##############
##############   ##############
##############   ##############
 ############     #..........#
  ###....###       #........#
   ########         ##....##
    ######           ######
```

At thickness 2 the outline is two pixels wide and the two lines of the stripe have grown
into each other. With fill darks at 100 the stripe, which is darker than that, is filled,
and the outline is as before.

Limits:

- Two neighbouring parts in nearly the same color, with no outline between them, merge.
  There is no edge to find.
- A line is always on the darker side, so a thin dark shape (one or two pixels wide) becomes
  solid line, and a wide dark shape becomes an outline with fill inside.

## Stencil

The whole sprite is the second color, and dark interior pixels are cut out of it
in the first. Brightness alone cannot distinguish a line from shading. It is made for icons
in one color: set the first color to None (see [palettes.md](palettes.md)) and the cuts are holes.

- A **sprite** is a group of solid pixels that touch, diagonals included. An image of
  sixteen separate icons has sixteen sprites, and each is judged on its own.
- A pixel is on a sprite's **outline** when one of the four pixels beside it is empty. The
  rest of the sprite is **inside**. A pixel on the outline is the second color.
- **On Auto** the sprite's colors are split into two groups, a dark one and a light one, by
  Otsu's method on the brightness of all its pixels, outline included. The outline is
  usually most of the dark group, so that group is the outline's colors and whatever is
  drawn in them. A pixel inside that belongs to the dark group is cut.
- **With Cuts set to a number**, the sprite's **outline level** is the brightness of the
  darkest pixel on its outline, and a pixel inside is cut when its brightness is no more
  than that level plus Cuts.
- **Brightness cuts remove fewer than half the inside.** A pixel must also be strictly
  darker than the median brightness of the four-neighbour interior. This applies on Auto
  and with manual Cuts. Flat interiors stay whole, and raising Cuts adds cuts or reaches
  this protection limit; it never restores previous cuts. Edges and Outline Trim are
  independent and can remove more pixels. The limit does not guarantee connectivity.
- A pixel inside that touches empty space at a corner is never cut. Where an outline turns
  it is often two pixels thick, and the inner one would be left as a speck.

```
    ......
   ........
  ..........
 ............
..............
..............
..............
.############.
.############.
..##########..
 ............
  ..........
   ........
    ......
```

The ball's outline and its stripe are its dark group, and its body the light one. The
stripe belongs to the dark group and is below the interior median, so it is cut;
with the first color None the ball is one shape with a band cut through it.

An image with no empty pixel is one sprite with no outline, all of it inside. Its outline
level is its darkest brightness.

Its settings:

- **Cuts**, Auto or 0 to 254, default Auto: how much lighter than the outline an inside
  pixel may be and still be cut. At 0 only pixels as dark as the outline are. While Auto is
  on, the box shows what Auto comes to for the sprites on the wall, least to most.
- **Outline**, Keep or Trim: Keep leaves the outline the second color, so the shape is full
  size and thin parts survive. Trim makes it a cut: in two colors that draws the sprite's
  own outline, in one color it takes a pixel off all round.
- **Edges**, Off or 1 to 100%: also cuts the darker side of a color change stronger than
  `255 − 2 × Edges`, between pixels inside the sprite. It finds parts that no dark line
  separates. These cuts are not limited by the brightness median.
- Brightness and Opacity cut (see "Settings" above). Stencil has no threshold.

Outline Trim, Cuts 20, and Cuts 20 with Edges 70%:

```
    ######           ......           ......
   #......#         ........         ........
  #........#       ..........       ..........
 #..........#     ............     ............
#............#   ..............   ..............
#............#   ..............   ..............
#............#   ..............   ..............
##############   ..............   .#########....
##############   ..............   ..............
#.##########.#   ..............   ..............
 #..........#     ............     ............
  #........#       ..........       ..........
   #......#         ........         ........
    ######           ......           ......
```

Known limits: its cuts are blocks where a hand-drawn icon has thin lines, since it can only
cut what the sprite already has; a sprite with no outline and no dark detail is left as its
shape; and shading as dark as the outline is cut with it. Auto reads brightness only, so it
cannot tell a seam from a shadow of the same darkness. Raising Cuts can recover additional
marks only below the interior median; features at or above it remain filled unless Edges
cuts them. Once all eligible darker pixels are cut, the slider plateaus even though its
range continues to 254. Neither the cap nor Auto identifies meaningful item parts.

## Icon

A filled body with sparse negative-space grooves, intended for small inventory sprites.
Set the first color to **None** for one ink plus transparency. Icon is fifth in the style
list, after Stencil. Its name describes its intended use; it does not imply item recognition.

Icon does not require grayscale or a limited palette. It judges each eight-connected
source component separately. Small sprites with transparency use a cavity-and-gap method:

1. **Find coherent inner shapes.** Otsu separates dark and light brightness; a second
   split estimates outline darkness. Broad connected dark patches containing a 2×2 block
   become cavities. Short dark runs between brighter pixels become seams. Dark pixels
   continuing a source notch become part of that gap. Cuts must be below the interior
   median. A protected three-wide interior core is never cut; isolated cuts are rejected.
2. **Rank whole regions.** Connected cuts enter together. Default Detail 50 includes
   the selected dark features; higher values can add weaker supported seams below the
   median. Increasing Detail never restores a cut or breaks an eight-connected source
   component. There is no 25% budget on this path: a genuine helmet opening can exceed it.
3. **Open selected cavities.** At Detail 50, Auto can extend a cavity or notch through
   the source edge along a row or column. Seams remain inside. Each path is tried alone,
   then together; conflicts are rejected without choosing by scan order. The accepted
   opening cannot increase either four- or eight-connected ink pieces, cut a protected
   interior core, or leave a previously supported ink pixel with fewer than two eight-
   neighbors. The inside is decided first, so refusing an opening cannot preserve a speck.

**Keep** preserves the source edge. Auto and Keep share inner cuts and differ by accepted
opening paths, which can include pixels at corners of transparency. **Trim** retains the
original boundary-peeling method below. **Detail Off** keeps the full silhouette on the
small-sprite path. Features enter as regions, so some steps add several pixels and some
settings produce the same mask. This is a coherent-feature control, not a brightness clamp.

This path applies to components with at most 1,024 source pixels in a box no larger than
64×64, on an image with transparency. Larger components, opaque images and Trim retain
the previous method, keeping preparation bounded for large inputs:

1. **Prepare the body.** Auto infers a drawn near-black stroke when at least 55% of the
   four-neighbor boundary is near-black and there are at least four interior pixels.
   Near-black is at most 32 and at most a quarter of the interior median RGB Value.
   It removes that stroke where the original pixel has at least three neighbors, first
   together if the remaining body is connected, otherwise conservatively pixel by pixel.
   Keep retains all source support. Trim attempts to peel the boundary with the same
   connectivity and thin-part guards. Source transparent gaps stay transparent.
2. **Find potential grooves.** Interior pixels need at least three filled four-neighbors.
   Brightness valleys between brighter opposite neighbors identify creases. RGB normalized
   by Value identifies chromatic material changes without treating a proportional shading
   ramp as a seam. The darker side takes a seam; equal brightness uses RGB order. A point
   dark in both axes is weakened as likely texture.
3. **Select coherent details.** Eight-connected candidate regions are ranked by their
   mean strength. Single dots, compact patches, broad diagonal checker texture and dense
   branching regions are rejected. Stronger regions are tried first. A cut may not split
   the foreground; a resulting single unsupported hole is restored. A region appears at
   one Detail level, rather than adding its pixels individually.

**Detail** is 0–100%, default 50%. On the previous method, Off keeps its prepared body and
details remove at most 25% of that body. **Outline** is Auto, Keep or Trim, default Auto.
**Brightness** controls the cavity method's brightness measurements, or the previous
method's valleys and selected side of material boundaries. Previous-method inferred
outlines use RGB Value. **Opacity cut** works as in other styles.

**100% Detail does not mean 100% of the fill is removed.** It admits all supported detail
levels that pass the detector's rules. Bright or flat regions, ambiguous texture and
protected parts can remain filled at maximum. Raising the numeric maximum alone would
not reveal more shapes: these limits come from feature selection and safety checks.
For denser source detail, compare Stencil with Cuts and Edges; it permits more cuts but
can also turn shading into clutter. Trim removes boundary pixels rather than discovering
missing inner shapes. A mostly filled Icon result is not necessarily a slider-limit bug.

The default preview ball (`#` first color, `.` second color). Its shading stripe is
suppressed rather than treated as an identifying cavity:

```
    ......
   ........
  ..........
 ............
..............
..............
..............
..............
..............
..............
 ............
  ..........
   ........
    ......
```

This is a geometric heuristic, not item recognition. Shading can resemble a cavity, crease
or notch; the supplied breastplate still has a shadow cut, and the steel torso's collar
remains incomplete. Similar source shapes can still become similar icons. Connectivity
does not establish recognizability. Icon analyses GIF frames separately, so changing input
details may flicker. Grayscale and palette reduction do not resolve these ambiguities.

## Checker

Solid, with mid-tones turned into a checkerboard. It gives three apparent tones: dark, a
50% pattern, and light.

A pixel becomes the second color if its tone is above 0.25 where `x + y` is even, and above
0.75 where it is odd. The effect:

- tone above 0.75: always the second color;
- tone 0.25 or below: always the first color;
- anything in between: second color on even pixels and first on odd ones, which is a
  checkerboard.

```
    ######
   ##....##
  #........#
 #..........#
##.........###
#...........##
#..........#.#
#.#.#.#.######
##.#.#.#######
###.#.########
 #.#.#.#.#.##
  #.#.#.#.##
   ###.#.##
    ######
```

The lighter left end of the stripe and the dimmer lower part of the body fall in the middle
band and become the pattern. The darker right end of the stripe stays solid, and so does the
outline, which is the image's darkest color, tone 0.

The pattern is tied to pixel position, not to the image, so it does not shimmer between the
frames of an animation.

Settings: Shading and Scale (see "Settings" above). Shading at 50%, and scale 2×:

```
    ######           ######
   ##....##         ##....##
  #........#       #........#
 #..........#     #..........#
##..........##   ##.........###
#............#   #..........#.#
#............#   #...........##
##############   ##..##..######
##############   #.##..########
##############   ####..########
 #..........#     #..##..##..#
  #.......##       #.##..##.#
   ##....##         ##.##.##
    ######           ######
```

At 50% the stripe and the dim part of the body are far enough from the threshold to be
solid, and almost no checkerboard is left. At 2× the squares of the board are two pixels
wide.

## Bayer

Ordered dithering. Shading becomes a regular crosshatch whose density follows brightness,
giving 17 apparent tones.

Each pixel's tone is compared with a cut-off taken from a repeating 4×4 grid:

```
 0  8  2 10
12  4 14  6
 3 11  1  9
15  7 13  5
```

For the value `b` at the pixel's position in the grid (`x mod 4`, `y mod 4`), the pixel is
the second color if its tone is above `(b + 0.5) / 16`. That gives 16 evenly spaced cut-offs,
from 1/32 to 31/32.

```
    ######
   ##.#..##
  #........#
 #......#.#.#
##..........##
#.#...#...#.##
#............#
##############
##.#.#.#.#.#.#
##############
 #.......#..#
  #.#.#.#.##
   ##..#.##
    ######
```

More of the image is touched than in Checker: the stripe is dark with a row of light pixels
through it, and the dimmer parts of the body pick up a few dark ones. The outline stays
solid, because the image's darkest color has tone 0 and no cut-off is that low.

The grid's values are arranged so that any brightness lights an evenly spread set of
positions. Like Checker, the pattern is tied to pixel position and is stable across frames.
On very small sprites it can read as noise; it works best on larger images with gradients.

Settings: Shading and Scale (see "Settings" above), and:

- **Matrix**, 2, 4 or 8: the side of the grid. For side `n` the cut-off is
  `(b + 0.5) / n²`, which gives 5, 17 or 65 apparent tones. Each quarter of a grid is the
  grid of half its side with every number times four, plus 0, 2, 3 and 1 by quarter. The
  2×2 grid is the coarsest and cleanest, close to Checker with two more tones. The 8×8
  grid only shows on smooth gradients, where 17 tones would band; on a small sprite it
  looks like the 4×4.

Matrix 2 and matrix 8:

```
    ######           ######
   ##...###         ##.#..##
  #........#       #........#
 #......#.#.#     #......#.#.#
##..........##   ##..........##
#.......#.#.##   #.#...#...#.##
#............#   #............#
##############   ##############
##.#.#.#.#.#.#   ##.#.#.#.#.#.#
##############   ##############
 #..........#     #.......#..#
  #.#.#.#.##       #.#.#.#.##
   ##....##         ##..#.##
    ######           ######
```

## Hatch

Mid-tones drawn as diagonal lines, like pen shading. It gives four apparent tones: dark,
wide dark lines, thin dark lines, and light.

A pixel becomes the second color if its tone is above a cut-off that depends on which
diagonal it lies on. With `d = (x + y) mod 3`, the cut-off is 0.75 where `d` is 0, 0.5 where
it is 1 and 0.25 where it is 2. The effect:

- tone above 0.75: always the second color;
- tone from 0.5 to 0.75: one diagonal in three is first color, which draws thin dark lines;
- tone from 0.25 to 0.5: two diagonals in three are first color, which leaves thin light
  lines;
- tone 0.25 or below: always the first color.

```
    ######
   ##....##
  #........#
 #..........#
##.........###
#............#
#...........##
#.##.##.######
###.##.#######
#####.########
 ##..#..#..##
  #.#..#..##
   ##.#..##
    ######
```

The lighter left end of the stripe has a tone between 0.25 and 0.5 and gets wide dark lines;
its darker right end stays solid. The dimmer lower part of the body has a tone between 0.5
and 0.75 and gets thin dark lines. The outline, tone 0, stays solid.

The lines run from the lower left to the upper right. They are tied to pixel position, not
to the image, so they do not shimmer between the frames of an animation. They need room: on
a part only a few pixels wide there is no line to see, and Checker reads better.

Settings: Shading and Scale (see "Settings" above), and:

- **Direction**, `/`, `\`, `—` or `|`: which way the lines run. `d` is then `x + y`,
  `x − y`, `y` or `x`, each mod the spacing. `—` gives the look of scanlines.
- **Spacing**, 3 to 6: how many pixels apart the lines are. With spacing `n` the cut-off is
  `(n − d) / (n + 1)` for `d` from 0 to `n − 1`: a line one pixel wide at the lightest
  patterned tone, one pixel wider at each darker one, and `n + 1` apparent tones in all.

Direction `\`, direction `—`, and spacing 5:

```
    ######           ######           ######
   ##....##         ##....##         ##....##
  #........#       #........#       #........#
 #..........#     #.........##     #..........#
##..........##   ##..........##   ##.........###
#..........#.#   #............#   #.........#..#
#...........##   #.........####   #........#...#
###.##.#######   ##############   ##.####.####.#
#.##.##.######   #.......######   #.####.####.##
#####.########   ##############   #####.####.###
 #..#..#..#.#     #..........#     #...#....###
  #..#..#..#       #........#       #.#....###
   ##.#..##         ########         ##...###
    ######           ######           ######
```

## Atkinson

Error diffusion, the look of early Macintosh graphics. Shading becomes an irregular,
organic scatter of pixels instead of a regular pattern.

Pixels are visited in reading order. Each one is cut at the threshold, and then the error
made by forcing it to pure dark or pure light is handed on to pixels that have not been
visited yet, so the mistakes average out across an area.

1. Every pixel starts with a working value of `tone × 255`. The threshold is then at 127.5,
   the middle of the range.
2. If the pixel's working value is above 127.5 it becomes the second color (treated as 255);
   otherwise the first (treated as 0).
3. The error is the working value minus 255 or 0. One eighth of it is added to each of six
   neighbours, marked `1` below, where `*` is the current pixel:

```
   *  1  1
1  1  1
   1
```

Only six eighths of the error are passed on. The lost quarter is what gives Atkinson its
character: very dark and very light areas stay clean instead of filling with stray pixels.

```
    ######
   ##....##
  #........#
 #..........#
##........#.##
#............#
#........#..##
##############
##############
####.##.######
 #..........#
  #....#...#
   ###..###
    ######
```

The stripe is well below the threshold, so it stays almost solid, with a light pixel here
and there. The body is above it and stays almost flat.

Settings: Shading (see "Settings" above), and:

- **Diffusion**, Atkinson, Floyd or Stucki: where the error goes.
  - **Floyd** is Floyd–Steinberg. It hands on all of the error, to four neighbours: 7/16
    to the right, then 3/16, 5/16 and 1/16 to the pixels below left, below and below
    right. Nothing is lost, so a tone comes out exactly as light as it is, and flat areas
    that Atkinson leaves clean pick up a fine, busy scatter.
  - **Stucki** hands on all of the error too, over twelve neighbours in the two rows
    below, in parts of 42: 8 and 4 to the right; 2, 4, 8, 4, 2 below; 1, 2, 4, 2, 1 below
    that. The wider spread gives a smoother, coarser grain.

Floyd and Stucki:

```
    ######           ######
   ##....##         ##....##
  #........#       #........#
 #......#.#.#     #..........#
##..........##   ##.......#.###
#......#..#.##   #.......#....#
#...#........#   #.........#..#
####.#########   ##############
######.#######   ##############
##.#.###.#.###   ###.##.##.####
 #..#....#..#     #..........#
  #...#.#..#       #...#..#.#
   ###...##         ###.#.##
    ######           ######
```

Limits:

- Each pixel depends on the ones before it, so a small change in the image or the threshold
  can rearrange the scatter. Between the frames of an animation the pattern can shimmer.
- Empty pixels are skipped, and any error handed to one is dropped, so shading does not
  carry across a gap in a sprite.

## Noise

Blue-noise dithering. Shading becomes an irregular scatter of pixels, like Atkinson's, but
the scatter is fixed in place, so it does not shimmer between the frames of an animation.

It works like Bayer with a different grid. A repeating 16×16 grid holds each number from 0
to 255 once. The numbers were placed with the void-and-cluster method, so that at every tone
the cells that are lit are spread evenly and form no regular pattern. For the value `n` at
the pixel's position in the grid (`x mod 16`, `y mod 16`), the pixel is the second color if
its tone is above `(n + 0.5) / 256`.

```
    ######
   ##.#..##
  #......#.#
 #.....#..#.#
##..........##
#.......#....#
#..#.....#.#.#
##.##.###.####
####.##.###.##
########.#####
 #....#..#.##
  #.#....#.#
   ##.##.##
    ######
```

The stripe is dark with a scatter of light pixels, more of them towards its lighter left
end. The body picks up a scatter of dark pixels, more of them where it is dimmer. The
outline, tone 0, stays solid.

On small sprites drawn in flat colors the scatter can read as dirt, and on a still image
Atkinson, which keeps flat areas clean, usually looks better. Noise suits larger images with
gradients, and animations.

Settings: Shading and Scale (see "Settings" above). Lower shading is what cleans the dirt
off flat colors: at 50% only the tones near the threshold are still scattered.

## Silhouette

Every solid pixel becomes the first color. Empty pixels stay empty. The threshold is
ignored.

```
    ######
   ########
  ##########
 ############
##############
##############
##############
##############
##############
##############
 ############
  ##########
   ########
    ######
```

Useful for shadows, masks and collision shapes. A fully opaque image becomes one solid
rectangle.

Its one setting is Opacity cut (see "Settings" above), which decides where a soft edge
ends and so how large the shape is. With no soft-edged image on the wall it has no settings
to show.

## Choosing between them

| You want | Style |
|---|---|
| Filled shapes with their parts cut apart, the End of End look | Cutout |
| Clean two-tone shapes | Solid |
| Line art that shows a sprite's parts | Lines |
| A filled sprite with dark inner details as holes | Stencil, with the first color None |
| A small inventory icon with coherent cavities and selected openings | Icon, with the first color None |
| A hint of shading that stays crisp | Checker |
| Smooth gradients, regular texture | Bayer |
| Shading that looks drawn with a pen | Hatch |
| Smooth gradients, organic texture | Atkinson |
| Organic texture that holds still in an animation | Noise |
| Just the shape | Silhouette |

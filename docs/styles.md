# Conversion styles

How each of Bitify's seven styles decides which of the two colors a pixel gets. The code is in
[src/lib/bitify.js](../src/lib/bitify.js); the tests beside it pin every rule described here.

## What all styles share

Every pixel ends up in one of three states:

- **Empty.** The source pixel's alpha is below 128. It stays fully transparent in every style.
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

- **Brightness** of a pixel is `0.2126 R + 0.7152 G + 0.0722 B`, rounded, from 0 to 255.
- **Difference** between two pixels is the largest of their red, green and blue differences,
  from 0 to 255. It is used by Lines and Cutout.

### The threshold

Every style except Silhouette depends on one number from 1 to 254, the threshold.

- In **Lines** it is how different two neighbouring pixels must be to count as an edge.
- In **Cutout, Solid, Checker, Bayer and Atkinson** it is the brightness cut-off between dark
  and light.

**Auto** picks the threshold for each image with Otsu's method. Otsu's method takes a
histogram and finds the value that splits it into two groups that are each as tight as
possible, and as far apart as possible.

- For the brightness styles the histogram is of pixel brightness, so Auto lands between the
  image's dark tones and its light tones. If there is nothing to split, it uses 127.
- For Lines the histogram is of the differences between every pair of horizontally or
  vertically adjacent solid pixels (identical neighbours are left out). Soft shading steps
  form one group and real part boundaries form the other, so Auto lands between them. It
  never goes below 24, so an image with only soft shading gets an outline and a flat fill
  instead of lines along its shading.

- Cutout also needs a **seam strength**, which is always automatic: Otsu on the differences
  between adjacent solid pixels of the same tone, with tones split at the image's Auto
  brightness cut-off, and never below 24. The large jumps from light to dark are left out
  because the tone split already shows them; with them in, the value comes out too high to
  find the boundaries inside a dark or a light area.

A manual threshold applies the same number to every image.

For an animated GIF, Auto is picked once from all frames together. Picking it frame by frame
would let a pixel flip between the two colors as the animation plays.

### Tone

Checker, Bayer and Atkinson do not compare brightness with the threshold directly. They
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

### The example used below

Each style is shown on the small ball used for the style buttons in the Advanced panel: a
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
Auto, which for this image is 81 for brightness, 52 for Lines and 24 for Cutout's seams.

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

Limits:

- A flat shading step, such as a shadow drawn in one darker color, is cut like a part
  boundary.
- A dark part two pixels wide or less becomes all rim.
- Art that is already dithered becomes busy.

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

Limits:

- Two neighbouring parts in nearly the same color, with no outline between them, merge.
  There is no edge to find.
- A line is always on the darker side, so a thin dark shape (one or two pixels wide) becomes
  solid line, and a wide dark shape becomes an outline with fill inside.

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
##..........##
#............#
#............#
#.#.#.#.#.#.##
##.#.#.#.#.#.#
###.#.#.#.#.##
 #.........##
  #.....#.##
   ###.#.##
    ######
```

The stripe sits in the middle band, so it becomes the pattern. So does the dimmest shading
at the lower right of the body. The outline is the image's darkest color, tone 0, and stays
solid.

The pattern is tied to pixel position, not to the image, so it does not shimmer between the
frames of an animation.

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
   ##....##
  #........#
 #......#.#.#
##..........##
#.........#.##
#............#
###.#.#.###.##
##.#.#.#.#.#.#
###.#.#.#.####
 #..........#
  #.#.#.#.##
   ##....##
    ######
```

More of the image is touched than in Checker: the stripe is patterned, and the dimmer parts
of the body pick up a few dark pixels. The outline stays solid, because the image's darkest
color has tone 0 and no cut-off is that low.

The grid's values are arranged so that any brightness lights an evenly spread set of
positions. Like Checker, the pattern is tied to pixel position and is stable across frames.
On very small sprites it can read as noise; it works best on larger images with gradients.

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
##..........##
#............#
#..........#.#
###.##########
#.##..#..##.##
##.##.###.####
 #..........#
  #........#
   ##.#..##
    ######
```

The stripe is close to the threshold, so it breaks into a scatter. The body is far from it
and stays almost flat.

Limits:

- Each pixel depends on the ones before it, so a small change in the image or the threshold
  can rearrange the scatter. Between the frames of an animation the pattern can shimmer.
- Empty pixels are skipped, and any error handed to one is dropped, so shading does not
  carry across a gap in a sprite.

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

## Choosing between them

| You want | Style |
|---|---|
| Filled shapes with their parts cut apart, the End of End look | Cutout |
| Line art that shows a sprite's parts | Lines |
| Clean two-tone shapes | Solid |
| A hint of shading that stays crisp | Checker |
| Smooth gradients, regular texture | Bayer |
| Smooth gradients, organic texture | Atkinson |
| Just the shape | Silhouette |

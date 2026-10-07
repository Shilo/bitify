# Conversion styles

How each of Bitify's six styles decides which of the two colors a pixel gets. The code is in
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
  from 0 to 255. It is used only by Lines.

### The threshold

Every style except Silhouette depends on one number from 1 to 254, the threshold.

- In **Lines** it is how different two neighbouring pixels must be to count as an edge.
- In **Solid, Checker, Bayer and Atkinson** it is the brightness cut-off between dark and light.

**Auto** picks the threshold for each image with Otsu's method. Otsu's method takes a
histogram and finds the value that splits it into two groups that are each as tight as
possible, and as far apart as possible.

- For the brightness styles the histogram is of pixel brightness, so Auto lands between the
  image's dark tones and its light tones. If there is nothing to split, it uses 127.
- For Lines the histogram is of the differences between every pair of horizontally or
  vertically adjacent solid pixels (identical neighbours are left out). Soft shading steps
  form one group and real part boundaries form the other, so Auto lands between them. If
  there is nothing to split, it uses 0.

A manual threshold applies the same number to every image.

For an animated GIF, Auto is picked once from all frames together. Picking it frame by frame
would let a pixel flip between the two colors as the animation plays.

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
Auto, which for this image is 81 for brightness and 52 for Lines.

## Lines

The default. It draws an outline around every part of a sprite, not only around its
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

The cut-off is moved by 40 depending on where the pixel sits. On pixels where `x + y` is
odd it is raised by 40; where it is even it is lowered by 40. The effect:

- brightness more than 40 above the threshold: always the second color;
- brightness more than 40 below it: always the first color;
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
 #..........#
  #........#
   ##....##
    ######
```

The stripe's brightness is within 40 of the threshold, so it becomes the pattern. The body
and the outline are far enough from it to stay flat.

The pattern is tied to pixel position, not to the image, so it does not shimmer between the
frames of an animation.

## Bayer

Ordered dithering. Shading becomes a regular crosshatch whose density follows brightness,
giving 17 apparent tones.

Each pixel's cut-off is shifted by an amount taken from a repeating 4×4 grid:

```
 0  8  2 10
12  4 14  6
 3 11  1  9
15  7 13  5
```

For the value `b` at the pixel's position in the grid (`x mod 4`, `y mod 4`), the cut-off
becomes `threshold + ((b + 0.5) / 16 - 0.5) × 192`. That moves it by up to 90 either way,
in 16 even steps. The pixel is the second color if it is brighter than its shifted cut-off.

```
    .#.#.#
   ##....##
  .........#
 #..........#
.#...........#
#............#
#............#
#.#.#.#.###.##
.#.#.#.#.#.#.#
###.#.#.#.####
 #..........#
  #.#...#..#
   #.....#.
    ######
```

Because the shift reaches further than Checker's, more of the image is touched: the stripe
is patterned, the outline is broken up where its cut-off drops very low, and the dimmer
lower part of the body picks up a few dark pixels.

The grid's values are arranged so that any brightness lights an evenly spread set of
positions. Like Checker, the pattern is tied to pixel position and is stable across frames.
On very small sprites it can read as noise; it works best on larger images with gradients.

## Atkinson

Error diffusion, the look of early Macintosh graphics. Shading becomes an irregular,
organic scatter of pixels instead of a regular pattern.

Pixels are visited in reading order. Each one is cut at the threshold, and then the error
made by forcing it to pure dark or pure light is handed on to pixels that have not been
visited yet, so the mistakes average out across an area.

1. Every pixel starts with a working value of `brightness + 128 - threshold`. This moves the
   threshold to the middle of the range.
2. If the pixel's working value is above 128 it becomes the second color (treated as 255);
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
#............#
#...#..##.##.#
###.##..#.##.#
##.#.##.##..##
 #..........#
  #........#
   ##....##
    ######
```

The stripe is close to the threshold, so it breaks into a scatter. The body is far from it
and stays flat.

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
| Line art that shows a sprite's parts | Lines |
| Clean two-tone shapes | Solid |
| A hint of shading that stays crisp | Checker |
| Smooth gradients, regular texture | Bayer |
| Smooth gradients, organic texture | Atkinson |
| Just the shape | Silhouette |

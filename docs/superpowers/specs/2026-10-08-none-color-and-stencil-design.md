# A None color and a Stencil style

Date: 2026-10-08. Status: approved in conversation, not yet built.

This adds two things to Bitify, which can be built one after the other:

1. Either of the two colors can be **None**. Its pixels come out transparent.
2. A tenth style, **Stencil**, which fills a whole sprite and cuts only its darkest inner
   lines.

Together they give icons in one color on a transparent background, with transparent cut
lines for detail. The main spec, `2026-10-06-bitify-app-design.md`, stays the source of truth
and is updated in the same changes as the code.

## What was asked for

A user wants minimalist 16×16 inventory icons: one solid color, usually white, on a
transparent background, with detail shown only by transparent gaps. Engines tint a white
sprite to any color, which is why white on transparent is the usual delivery format.

Bitify could not make these. It already has transparency (an empty pixel stays empty on the
wall, in the PNG, in the GIF and on the clipboard), but both colors were always opaque.

## What was tried

Four 64×64 sheets of sixteen colored, outlined, shaded 16×16 icons each were converted with
the first color left out.

- **Cutout, Solid and Lines on Auto do not give a clean icon.** Cutout comes out wiry and
  hollow. Solid drops dark items. Lines is the nearest, but shading turns into specks and
  thin weapons break into dots. All three split a sprite by brightness or by every color
  change, which is right for two colors and wrong for one.
- **A prototype of Stencil gave a recognisable icon for all 64.** Its rule is below.

The mockup and the comparison pictures are in `docs/superpowers/mockups/`
(`2026-10-08-none-color.html` and the `none-color-*.png` files).

## Part 1: a color that is None

### The rule

One of the two colors may be None, never both. A pixel that would get a None color is
empty instead, exactly like a pixel outside the sprite: clear on the wall, transparent in
the PNG and the GIF, transparent on the clipboard. Nothing else about the conversion
changes. A style still decides which pixels are first color and which are second, and
still never looks at the colors.

The color under a None is remembered. Turning None off brings it back.

### Palette panel

Two **None chips** end the row of palettes, after the twelve presets and a divider. There
is no label.

- The first makes the first color None, the second makes the second color None.
- A chip looks like a palette chip of the current two colors with the missing color's half
  shown as the checkerboard of the wall.
- A chip is pressed (`aria-pressed`, with the ring a chosen palette has) while its color is
  None. Pressing it again turns None off. Pressing the other moves None to the other color.
- Tooltips and names for screen readers: "No color for lines and dark pixels" and "No color
  for fill and light pixels".
- When the chips are in two rows there are fourteen in all, seven in each row, and the
  None chips are the last two of the second row.
- A preset stays marked by its two colors as before, whether or not one of them is None.
  Choosing a preset or stepping through the palettes changes the colors and leaves None
  where it is.

### Dock swatches

A swatch whose color is None shows the checkerboard with a diagonal slash in place of the
color. Pressing it still opens the color picker, on the remembered color. Choosing a color
there turns None off for that swatch. Closing the picker without choosing leaves None on.

Swap exchanges the two colors and takes None along: a None first color becomes a None
second color.

### What is drawn

- The wall, the style previews on the style button and in the list of styles, the saved
  PNG and GIF, the copied PNG and every file in the zip all leave the None color out.
- **Silhouette** draws every solid pixel in the first color. With the first color None it
  would draw nothing, so there it is drawn in the second color instead. This is the one
  place where a style's name matters to the coloring; the mask is unchanged.
- The drop screen keeps using the two remembered colors.

### Files

- **PNG.** Still a palette of three and two bits per pixel. The None color's palette entry
  is marked transparent in `tRNS` and carries the other color's red, green and blue, so an
  engine that filters the texture does not pull a different color in at the edges. `tRNS`
  is `[0]` with no None (as today), `[0, 0]` with the first color None and `[0, 255, 0]`
  with the second.
- **GIF.** A GIF frame has one transparent index. Each frame's mask is written with the
  None color's pixels as index 0, the empty index.

### Remembered

Which color is None is saved with the colors as `none`: 0 for neither, 1 for the first,
2 for the second. Anything else stored there reads as 0. Reset settings puts it back to 0.

### Words

- Help, step two: "Pick two colors, or a preset. One of them can be None, for a see-through
  image."
- The slogan "Pixel art in two colors" stays.

## Part 2: the Stencil style

### The rule

Stencil is the third style, after Cutout and Solid and before Lines:
Cutout, Solid, Stencil, Lines, Checker, Hatch, Bayer, Noise, Atkinson, Silhouette.

Every solid pixel is the second color, except the **cuts**, which are the first color. With
the first color None the cuts are holes.

- A **sprite** is a group of solid pixels that touch, diagonals included. An image holding
  sixteen separate icons has sixteen sprites.
- A pixel is on a sprite's **outline** when one of its four neighbours is empty. The canvas
  edge counts as empty only if the image has an empty pixel, as in Lines and Cutout.
- A sprite's **outline level** is the brightness of the darkest pixel on its outline.
- A pixel on the outline is the second color, or a cut when Outline is Trim.
- A pixel inside is a cut when its brightness is no more than its sprite's outline level
  plus **Cuts**, or when **Edges** is on and it is on the darker side of a color change
  stronger than the edge strength. Otherwise it is the second color.
- A pixel inside that touches empty space at a corner is never a cut. Where an outline
  turns a corner it is often two pixels thick, and the inner one would be left as a speck.

So the sprite's own dark line art is what gets cut, and shading is left alone. Each sprite
is judged against its own outline, which is why a sheet of differently colored icons
converts as well as the same icons one file each.

An image with no empty pixel is one sprite with no outline. Its outline level is the
image's darkest brightness.

The difference between two pixels and the tie on equal brightness are the ones Lines uses.

### Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| Cuts | 0 to 100 | 20 | How much lighter than its sprite's outline an inside pixel may be and still be cut. At 0 only pixels as dark as the outline are cut. Higher values cut dark shading too, and far enough up a dark sprite is hollowed out. |
| Outline | Keep, Trim | Keep | Keep leaves the outline as the second color, so the shape is full size and thin parts survive. Trim makes the outline a cut: in two colors that draws the sprite's own outline, in one color it takes one pixel off all round. |
| Edges | Off, or 1 to 100% | Off | Also cuts along strong color changes inside the sprite, such as an emblem on a book. The edge strength is `255 − 2 × Edges`: a change counts when the largest of the red, green and blue differences is above it. |
| Brightness | Luma, Value, R, G, B | Luma | As in the other styles. |
| Opacity cut | 1 to 255 | 128 | As in the other styles, and shown only while an image has a partly see-through pixel. |

Stencil has no Threshold. **Cuts** takes the threshold's place on the strip: on a wide
screen its slider sits beside the style button and the others are in the tray, and on a
phone its chip is first.

### In one color and in two

Stencil is always in the list. It does not look at the colors.

- With the first color None it gives the one-color icon: Keep for most art, Trim for chunky
  sprites where a neater, smaller shape is wanted.
- In two colors with Trim it is a flat fill with the sprite's own outline and inner lines,
  a tidier Lines.
- In two colors with Keep it is close to Silhouette in the second color, with a few marks.

### Pictures smaller than the image, animations, speed

- Each pixel of a smaller picture is exactly what its image pixel is in the full
  conversion, as in Cutout, Lines, Solid and Silhouette.
- The outline levels are found once for an analysed image, the first time Stencil converts
  it, and kept with the analysis. An image with no empty pixel needs none found. Finding
  them walks every sprite once and briefly needs four bytes for each pixel of the image.
- Each frame of an animation has its own outline levels. A sprite whose outline changes
  brightness between frames could change its cuts between frames.

### The preview

On the preview ball Stencil at its defaults is the whole disc in the second color: the
ball's outline is far darker than its stripe. `docs/styles.md` shows that and, side by
side, Outline Trim, Cuts 70 and Edges 70%.

### Known limits

- Cut lines are sparser than in a hand-drawn icon. Cuts and Edges add more at the cost of
  noise.
- A sprite whose outline is no darker than its inside gets few cuts or none.
- A part drawn in the outline's own color and more than a pixel or two wide becomes a hole.

### Considered and left out

- **Dropping single-pixel cuts.** Tried; it changed almost nothing at the default.
- **Trimming the outline only where fill is left behind it.** Tried; thin parts came out
  dotted.
- **The outline level as the middle brightness of the outline.** Tried; sprites with no
  dark outline were hollowed out. The darkest pixel is safe for both kinds.
- **Wider cuts** and **a level set by hand**: not tried, no art to judge them on.
- **Hiding Stencil unless a color is None.** It would break stepping through the styles
  and the rule that style and colors are independent.

## Structure

| File | Change |
|---|---|
| `src/lib/presets.js` | Stencil in `STYLES`. `inks(first, second, none, style)`: the two colors as drawn, a None one as `null`. |
| `src/lib/settings.js` | `cuts`, `outline`, `edges` in `SETTINGS`; Stencil in `STYLE_SETTINGS`; `none` in `DEFAULTS` and `restore`. |
| `src/lib/bitify.js` | The Stencil branch of `mask` and the outline levels. `colorize` takes `null` for a color. |
| `src/lib/save.js`, `src/lib/gif.js` | `pngBytes` and `encodeGif` take `null` for a color. |
| `src/App.svelte` | `none` state, stored and reset; the drawn colors passed to tiles and to saving. |
| `src/Dock.svelte`, `src/app.css` | The None chips and swatch; Swap; Cuts on the strip. |
| Docs | The main spec, `docs/styles.md`, `docs/palettes.md`, `docs/performance.md`, `CLAUDE.md`, `README.md`. |

## Testing

Unit tests, in the modules' own test files:

- `inks`: neither None, first None, second None, and Silhouette with the first None.
- `colorize`, `pngBytes` and `encodeGif` with a `null` color: the pixels, the palette and
  `tRNS` bytes, and a GIF that decodes with the None color's pixels clear.
- `restore`: `none` kept when 0, 1 or 2 and 0 otherwise; Stencil's settings checked like
  any other style's.
- Stencil: the outline kept and trimmed; a cut at and just above the outline level; two
  sprites in one image judged apart; Edges; an opaque image; an all-empty image; a smaller
  picture equal to the picked pixels of the full mask; the drawings in `docs/styles.md`.
- `node bench/equiv.mjs` shows every existing style's masks unchanged, and
  `node bench/bench.mjs` is run before and after.

By hand, at desktop width and at phone width with touch emulation: the None chips in one
row and in two, the swatch, Swap, a palette chosen with None on, the picker turning None
off, Stencil's strip, tray and chips, a saved PNG and GIF opened in an image editor, and a
copy pasted into one.

## Not included

- Partial transparency, or an alpha slider in the color picker.
- Both colors None.
- A separate one-color mode or a one-bit PNG.

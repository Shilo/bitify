# A None color and a Stencil style

Date: 2026-10-08. Status: built.

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

A small **switch** makes a color None. It is no palette, so it is kept out of the row of
palettes and sits with the palette's name: under the name on a wide screen, and at the far
end of the name's row on a phone. It has no label.

- It is the dock's view switch at a smaller size, with three segments that hold pictures
  in place of words: both colors, the first color gone, the second color gone. Pressing a
  segment sets that state.
- Each picture is a small square split as a palette chip is, the first color at the top
  left. A color that is there is filled; one that is gone is a fine checkerboard. The
  pictures are in the text color, not the palette's.
- Tooltips and names for screen readers: "Both colors", "No color for lines and dark
  pixels" and "No color for fill and light pixels".
- A preset stays marked by its two colors as before, whether or not one of them is None.
  Choosing a preset or stepping through the palettes changes the colors and leaves None
  where it is.

The first build had two None chips at the end of the row of palettes. They read as two more
palettes, and on a phone they did not fit the row. Three designs were mocked up
(`docs/superpowers/mockups/2026-10-08-transparent-control.html` and
`2026-10-08-transparent-control-labels.html`): this switch, a switch that turns
transparency on with a choice of side after it, and a switch of three words. Labels were
tried too ("Transparent", "Clear", "Hide", "None", "Alpha") and left out.

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
  is marked transparent in `tRNS`. The picture then has one color, and all three entries
  carry its red, green and blue, the empty pixel's too, so an engine that filters the
  texture has no other color to pull in at the edges. `tRNS`
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
  edge counts as empty only if the image has an empty pixel, as in Lines and Cutout. The
  rest of the sprite is **inside**.
- A pixel on the outline is the second color, or a cut when Outline is Trim.
- Each sprite has a **cut level**. A pixel inside is a cut when it is that dark or darker.
  - **On Auto** the cut level is Otsu's split of the brightness of all the sprite's pixels,
    outline included: the lightest brightness of the darker group. The outline is usually
    most of that group.
  - **With Cuts set to a number** it is the sprite's **outline level**, the brightness of
    the darkest pixel on its outline, plus Cuts.
- **A sprite that would lose half its inside or more is left whole.** The dark group is
  then the sprite's own color, not line art.
- A pixel inside that touches empty space at a corner is never a cut. Where an outline
  turns a corner it is often two pixels thick, and the inner one would be left as a speck.
- When **Edges** is on, a pixel inside is also a cut when it is on the darker side of a
  color change stronger than the edge strength.

So the sprite's own dark line art is what gets cut, and shading is left alone. Each sprite
is judged against itself, which is why a sheet of differently colored icons converts as
well as the same icons one file each.

An image with no empty pixel is one sprite with no outline, all of it inside. Its outline
level is its darkest brightness.

The difference between two pixels and the tie on equal brightness are the ones Lines uses.

### What changed while building

- **Auto was added to Cuts** and is the default. The first design had a fixed Cuts of 20.
  Four Auto rules were tried on the four sheets and on five test sprites; splitting each
  sprite's own colors in two gave the most detail and reproduced the hand-drawn potion
  (an outlined flask with its liquid filled), where a fixed 20 gave a plain bottle.
- **The half rule was added.** The first design hollowed out a flat sprite with no outline
  drawn, and Auto would have hollowed any sprite without one.
- **Cuts goes to 254**, not 100, so that a number can say whatever Auto comes to.

### Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| Cuts | Auto, or 0 to 254 | Auto | How much lighter than its sprite's outline an inside pixel may be and still be cut. At 0 only pixels as dark as the outline are cut. While Auto is on, the box shows what Auto comes to for the sprites on the wall, least to most. |
| Outline | Keep, Trim | Keep | Keep leaves the outline as the second color, so the shape is full size and thin parts survive. Trim makes the outline a cut: in two colors that draws the sprite's own outline, in one color it takes one pixel off all round. |
| Edges | Off, or 1 to 100% | Off | Also cuts along strong color changes inside the sprite, such as an emblem on a book. The edge strength is `255 − 2 × Edges`: a change counts when the largest of the red, green and blue differences is above it. |
| Brightness | Luma, Value, R, G, B | Luma | As in the other styles. |
| Opacity cut | 1 to 255 | 128 | As in the other styles, and shown only while an image has a partly see-through pixel. |

Stencil has no Threshold. **Cuts** takes the threshold's place on the strip: on a wide
screen its slider, number box and Auto sit beside the style button and the others are in
the tray, and on a phone its chip is first.

### In one color and in two

Stencil is always in the list. It does not look at the colors.

- With the first color None it gives the one-color icon: Keep for most art, Trim for chunky
  sprites where a neater, smaller shape is wanted.
- In two colors with Trim it is a flat fill with the sprite's own outline and inner lines,
  a tidier Lines.
- In two colors with Keep it is close to Silhouette in the second color, with its dark
  detail drawn in the first.

### Pictures smaller than the image, animations, speed

- Each pixel of a smaller picture is exactly what its image pixel is in the full
  conversion, as in Cutout, Lines, Solid and Silhouette.
- What Stencil needs to know of each sprite (its outline level, what Auto cuts up to and
  the median brightness of its inside) is found once for an analysed image, the first time
  it is asked for, and kept with the analysis: three bytes for each pixel. An image with no
  empty pixel needs no walk. The walk goes over every sprite once and holds five more
  bytes for each pixel while it runs.
- Each frame of an animation has its own sprites. A sprite whose colors change between
  frames could change its cuts between frames.
- A very large image with see-through parts stalls a phone for some seconds the first time
  it is shown in Stencil. That is not solved; see `docs/performance.md`.

### The preview

On the preview ball Stencil on Auto is the disc in the second color with the ball's stripe
cut out of it: the outline and the stripe are the ball's dark group. `docs/styles.md`
shows that and, side by side, Outline Trim, Cuts 20, and Cuts 20 with Edges 70%.

### How close it comes to hand-drawn icons

Five colored test sprites were converted and set beside the hand-drawn icons three of them
were modelled on (`docs/superpowers/mockups/stencil-replicate.png`). On Auto the skull has
its eyes, nose and teeth, the helmet its visor, and the flask is an outline with its liquid
filled, as in the hand-drawn ones. What it does not do is choose: a hand-drawn icon has
thin one-pixel cut lines placed for looks, and Stencil cuts whole dark areas where the
sprite has them.

### Known limits

- Its cuts are blocks where a hand-drawn icon has thin lines.
- A sprite with no outline and no dark detail is left as its shape.
- Shading as dark as the outline is cut with it.

### Considered and left out

- **Dropping single-pixel cuts.** Tried; it changed almost nothing.
- **Trimming the outline only where fill is left behind it.** Tried; thin parts came out
  dotted.
- **Other Auto rules.** Otsu on the inside pixels alone, the widest gap between two of the
  sprite's brightnesses, and a fixed 20: each gave less detail or hollowed more sprites
  than the split of all the sprite's pixels with the half rule.
- **A cap on image size for the walk.** A large sheet of sprites above it would be judged as
  one sprite.
- **Wider cuts**: not tried, no art to judge them on.
- **Hiding Stencil unless a color is None.** It would break stepping through the styles
  and the rule that style and colors are independent.

## Structure

| File | Change |
|---|---|
| `src/lib/presets.js` | Stencil in `STYLES`. `inks(first, second, none, style)`: the two colors as drawn, a None one as `null`. |
| `src/lib/settings.js` | `cuts`, `outline`, `edges` in `SETTINGS`; Stencil in `STYLE_SETTINGS`; `none` in `DEFAULTS` and `restore`. |
| `src/lib/bitify.js` | The Stencil branch of `mask`, and `sprites` and `spritesOf`, which find and keep what it needs to know of each sprite. `colorize` takes `null` for a color. |
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
- Stencil: Auto's split; Cuts at and just above the outline level; the outline kept and
  trimmed; two sprites in one image judged apart; the half rule at exactly half and just
  under; Edges; the corner rule; an opaque image and an opaque animation; another
  brightness source and another opacity cut; sprites that are all outline; a large sprite
  and very many small ones; an all-empty image; a smaller picture equal to the picked
  pixels of the full mask; the drawings in `docs/styles.md`.
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

# Bitify design

Date: 2026-10-06
Status: design approved in prototype form; this document awaits review.

Bitify converts pixel art images to 1-bit: every image is redrawn using two colors the
user picks. It runs entirely in the browser. Nothing is uploaded.

The approved interactive prototype is saved next to this file as
[2026-10-06-bitify-prototype.html](2026-10-06-bitify-prototype.html). It is the visual and
behavioral reference: where this document and the prototype disagree on look, spacing or
copy, the prototype wins. It is plain HTML and JavaScript, written as a throwaway; the app
is a fresh build, not a port of that file's structure.

## What was asked for

Stated by the user:

- Convert any pixel art image to 1-bit using two user-chosen colors.
- Modern, minimal, full-screen, intuitive, easy.
- Drag and drop any number of images, at any time, including after others are loaded.
  Images can be removed again.
- Changing a color redraws everything immediately.
- Download each image on its own, and download all images.
- A toggle between the original and the bitified image.
- Swap, a palette selector, and a threshold. Threshold and an Auto button live in an
  "advanced" popup.
- The advanced popup offers several conversion algorithms. The default outlines the
  individual parts of a sprite (body parts, clothing, equipment), in the style of the game
  End of End, and not only the silhouette.
- Must work on iOS and Android.
- Vite + Svelte, pure Svelte, no SvelteKit.

Assumptions made here, open to correction:

- Plain JavaScript, not TypeScript.
- Settings are not remembered between visits.
- Exports are PNG at the original pixel size, with no upscaling option.
- An animated GIF is converted as its first frame only.

## Layout: the Wall

One screen, no page scroll. Three layers:

1. **Top bar.** The "Bitify" wordmark, an image count, "Remove all" (only when there are
   images), "Add images", and at the far right a GitHub icon linking to
   `https://github.com/Shilo/bitify` in a new tab.
2. **The wall.** A grid of square tiles that fills the screen and scrolls on its own. Each
   tile shows one image, scaled up with hard pixel edges on a faint checkerboard so
   transparency is visible. Below it: file name and pixel size.
3. **The dock.** A floating bar at the bottom center holding every setting.

Chrome is neutral grey in both light and dark themes (following the system setting), so
the two chosen colors are the only strong colors on screen. Icons are 7×7 one-bit pixel
glyphs. The wordmark and empty-state heading use Pixelify Sans; everything else uses
Schibsted Grotesk. Both load from Google Fonts with system fallbacks.

### Fitting the wall to the screen

The tiles always use the space between the top bar and the dock, and are centered in it.

- With one image, its tile is as large as that space allows. Each time an image is added or
  removed, or the window changes size, the tiles are resized so that all of them still fit
  without scrolling. The column count is whichever gives the largest tiles, so two images sit
  side by side on a wide screen and stacked on a tall one. A partly filled last row is
  centered.
- A tile's size counts its caption, and on touch screens its Download and Remove buttons, so
  nothing is pushed under the dock.
- Tiles are never shrunk below a usable size: 140px on phones, rising to 200px on wide
  screens. Once that many images no longer fit, the wall scrolls instead, with as many
  columns of at least that size as fit, stretched to fill the width.

The rule lives in `src/lib/layout.js` (`fitGrid`) and is unit tested.

### Tiles

- Pointer devices: Download and Remove buttons appear in the tile's top-right corner on
  hover or keyboard focus.
- Touch devices (no hover): the two buttons sit beside the file name and are always
  visible, 40px square.
- Holding a tile shows its other version (original if the wall shows bitified, and the
  reverse) until release. With a mouse this is instant. On touch a press counts as a hold
  after 150 ms, so scrolling the wall does not flash tiles.

### Dock, left to right

| Control | Behavior |
|---|---|
| First color swatch | Native color picker. Color for lines and dark pixels. |
| Swap | Exchanges the two colors. |
| Second color swatch | Native color picker. Color for fill and light pixels. |
| Palettes | Opens the palettes panel. |
| Original / Bitified | Two-way switch for the whole wall. |
| Advanced | Opens the advanced panel. |
| Download all | Saves every bitified image in one zip. Disabled when the wall is empty. |

Panels open directly above the dock. Only one is open at a time. A panel closes on Escape,
on a second press of its button, or on a press outside the dock. Presses on other dock
controls leave it open, so colors can be changed while a panel is showing.

**Palettes panel.** Eight presets in a 4×2 grid, each a diagonally split chip with a
name. The preset matching the current colors is marked. Choosing one sets both colors.

| Name | First color | Second color |
|---|---|---|
| Torch (default) | `#f6dfa4` | `#0b0a0c` |
| Citron | `#262262` | `#e6f0b4` |
| Moss | `#1e3a2b` | `#d7e8a0` |
| Plum | `#3b1f3f` | `#f6c7b6` |
| Ember | `#2a1414` | `#ff9f45` |
| Tide | `#0e3b5c` | `#bfe9e0` |
| Rose | `#4a0d2b` | `#ffd1dc` |
| Mono | `#000000` | `#ffffff` |

**Advanced panel.**

- Style: six buttons in a 3×2 grid. Each shows a live preview, a small shaded ball with a
  stripe, drawn in that style with the current two colors.
- Threshold: a slider from 1 to 254 and an Auto button. Auto is the default. Moving the
  slider switches to manual; pressing Auto switches back.
- One line of help text describing what the threshold currently does, and one line
  explaining hold-to-compare.

### Responsive behavior

| Width | Dock |
|---|---|
| Above 800px | Icon and text labels, dividers between groups. |
| 521 to 800px | Icon-only buttons, one row. |
| 520px and below | Dock spans the screen width with 12px margins. Tools on the first row, the Original / Bitified switch on its own full-width second row. Panels become full-width sheets above it. The image count and the word "images" in the Add button are hidden. |

On coarse pointers every dock control is 40 to 44px square. The app uses
`viewport-fit=cover`, pads for the safe-area insets, and sizes itself with dynamic
viewport height so mobile browser bars do not cut the dock off.

### Adding images

- Drag files anywhere onto the window. While dragging, a full-screen "Drop to bitify"
  overlay shows, drawn in the two chosen colors.
- "Add images" opens the system picker (`accept="image/*"`, multiple). This is the only
  route on phones.
- Pasting an image from the clipboard also adds it.
- New images are appended; existing ones stay.
- Files the browser cannot decode are skipped, and a short message says how many.

### Empty state

A centered heading ("Drop pixel art anywhere", or "Add pixel art" on touch devices), one
line of explanation, and a "Choose images" button. The dock stays visible.

Above the heading sits the Bitify logo, a 32×32 gold coin with a B (`src/assets/logo.png`),
labelled "Example". It is a live preview: it goes through the same conversion as real
images, so the colors, Swap, palettes, style, threshold, the Original / Bitified switch and
hold or Space all apply to it. It is for previewing only. It has no Download or Remove, is
not counted, and is never included in Download all. It disappears when the first image is
added and returns when the wall is empty again.

The example scales with the screen: as large as fits above the text and the dock without
scrolling, between 96px and 320px. Its caption ("Example", then the pixel size) is centered
on one line. On a short, wide screen, such as a phone on its side, the example sits beside
the text instead of above it.

The prototype's "Load examples" button and bundled sample sprites are prototype
scaffolding and are not part of the app.

### Keyboard

- Hold Space: flip the whole wall to the other version until release. A button clicked
  with a mouse or finger does not keep focus, so Space still compares afterwards; a button
  reached with Tab keeps the normal behavior, where Space presses it.
- Escape: close the open panel.
- All controls are reachable by Tab with a visible focus ring.

## Conversion

Each image is analysed once when added, then converted whenever the style, threshold or
colors change.

Every pixel ends up in one of three states:

- **Empty**: alpha below 128. Stays fully transparent.
- **First color**: lines and dark pixels.
- **Second color**: fill and light pixels.

Output pixels are fully opaque or fully transparent. Brightness of a pixel is
`0.2126 R + 0.7152 G + 0.0722 B`, rounded, 0 to 255.

### Styles

| Style | Rule |
|---|---|
| **Lines** (default) | A pixel is first color if any of its four neighbours is empty, or if a neighbour differs from it by more than the threshold and this pixel is the darker of the two. Everything else is second color. |
| **Solid** | Brighter than the threshold: second color. Otherwise first color. |
| **Checker** | As Solid, but the cut-off is raised by 40 on odd `x + y` cells and lowered by 40 on even ones, so mid-tones become a checkerboard. |
| **Bayer** | As Solid, with the cut-off shifted per pixel by a 4×4 ordered-dither matrix, spread 192. |
| **Atkinson** | Error diffusion. Each pixel is cut at the threshold, and one eighth of the error goes to each of six neighbours (right, two right, the three below, two below). |
| **Silhouette** | Every non-empty pixel is first color. |

Details of Lines:

- The difference between two pixels is the largest of their red, green and blue
  differences.
- When two neighbours have equal brightness, the one earlier in reading order takes the
  line, so a boundary is one pixel wide.
- The canvas edge counts as empty only if the image has at least one empty pixel. A sprite
  cropped tight to its canvas still gets a full outline; a fully opaque scene does not get
  a frame.

Known limit of Lines: two adjacent parts in nearly the same color, with no outline between
them, merge. Lowering the threshold recovers some at the cost of picking up shading.

### Threshold

- In Lines it is the minimum color difference that counts as an edge.
- In Solid, Checker, Bayer and Atkinson it is the brightness cut-off.
- Silhouette ignores it.

Auto picks a value per image with Otsu's method, which splits a histogram into two groups
at the point that separates them best:

- For the brightness styles, on the histogram of pixel brightness. Fallback 127.
- For Lines, on the histogram of non-zero differences between horizontally and vertically
  adjacent non-empty pixels. This separates soft shading steps from real part boundaries.
  Fallback 0.

A manual value applies to every image.

## Saving

- A single image saves as `<original name without extension>-1bit.png` at its original
  pixel size.
- Download all saves `bitify.zip` containing one such PNG per image. Duplicate names get
  `-2`, `-3` and so on.
- Saving always uses the bitified version, whatever the wall is showing.
- PNG files are encoded directly from the pixels, not through a canvas. Some browsers
  (Brave, Safari private browsing, Firefox strict mode) add noise when a page reads a
  canvas back, which would put stray colors in a saved file.
- Files are offered through a temporary link with the `download` attribute, which works in
  current iOS Safari and Android Chrome.

## Structure

Vite with the `svelte` template (Svelte 5, runes, mounted with `mount()`), JavaScript.

| File | Purpose |
|---|---|
| `src/lib/bitify.js` | Pure conversion, no DOM. `analyze(imageData)` returns size, pixels, brightness, whether any pixel is empty, and the two auto thresholds. `mask(analysis, style, threshold)` returns one byte per pixel (0 empty, 1 first color, 2 second color). `colorize(mask, first, second)` returns RGBA pixels. |
| `src/lib/save.js` | Output file naming, zip, PNG encoding from pixels, single save, save all. |
| `src/App.svelte` | All state; top bar, wall, empty state, drop overlay, messages; window-level drop, paste and key handling. |
| `src/Tile.svelte` | One image: canvas, caption, Download and Remove, hold to compare. |
| `src/Dock.svelte` | The dock and its two panels. |
| `src/Pixels.svelte` | A canvas that shows a block of pixels; used by tiles and by the style previews. |
| `src/PixelIcon.svelte` | Renders a 7×7 glyph from a row-string map. |
| `src/app.css` | Every style rule, carried over from the prototype: color and type tokens for light and dark, and all component styles. Components have no style blocks of their own. |

State is a handful of `$state` values in `App.svelte`: the two colors, style, threshold
(`null` means Auto), which version the wall shows, the open panel, and the list of images.
Each image holds an id, its name, its original pixels and its analysis. A tile derives its
mask from the image, style and threshold, and repaints its canvas when the mask or either
color changes. That keeps a color drag cheap: the mask is reused and only the two-color
fill is redone.

Dependencies beyond Vite and Svelte:

- `fflate`, for the zip. PNGs are already compressed, so entries are stored without
  compression.
- `vitest`, development only.

## Errors and limits

- Undecodable files are skipped with a message; the rest of the batch still loads.
- If saving fails, a message says so. Nothing else is lost.
- Conversion runs on the main thread. That is instant for pixel art. A multi-megapixel
  photo will cause a visible pause on every change; moving conversion to a worker is the
  upgrade path if that ever matters.
- Tiles scale images to fit, which is not always a whole-number multiple, so displayed
  pixels can be slightly uneven. Exports are exact.

## Testing

- `src/lib/bitify.js` is covered by unit tests on small hand-made pixel grids:
  - empty pixels stay empty in every style;
  - Solid splits at the threshold;
  - Checker produces a checkerboard for a mid-tone block;
  - Lines outlines an inner part as well as the silhouette, draws a one-pixel boundary,
    ignores a shading step below the threshold, and frames only images that have empty
    pixels;
  - Silhouette fills everything;
  - Auto returns a value between two clearly separated groups.
- `src/lib/save.js`: output naming, including duplicates.
- The interface is checked by hand in a desktop browser and at phone width: add by drop,
  picker and paste; remove one and all; change colors, palette, style and threshold;
  compare by switch, hold and Space; save one and all.

## Not included

- Remembering settings between visits.
- Export upscaling, or formats other than PNG.
- Per-image settings; style, threshold and colors apply to the whole wall.
- Custom user palettes.
- Animated GIF frames beyond the first.
- Installable or offline (PWA) behavior.
- Hosting and deployment.

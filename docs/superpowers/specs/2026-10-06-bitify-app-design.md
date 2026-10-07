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
  style strip above the dock, which never covers the images.
- The style strip offers several conversion algorithms. The default shows the
  individual parts of a sprite (body parts, clothing, equipment), in the style of the game
  End of End, and not only the silhouette. Since 2026-10-07 that default is Cutout, which
  fills the parts and cuts them apart; Lines, which outlines them, was the default before.
- Must work on iOS and Android.
- Vite + Svelte, pure Svelte, no SvelteKit.

Assumptions made here, open to correction:

- Plain JavaScript, not TypeScript.
- The two colors, the style and the threshold are remembered between visits (see
  "Remembered settings"). Nothing else is.
- Exports are PNG at the original pixel size, with no upscaling option.
- Animated WebP and APNG files are converted as their first frame only. (Animated GIFs are fully supported; see "Animated GIFs".)

## Layout: the Wall

One screen, no page scroll. Three layers:

1. **Top bar.** The "Bitify" wordmark, an image count, and at the right a trash icon button
   that removes all images (only when there are images), a GitHub icon linking to
   `https://github.com/Shilo/bitify` in a new tab, and "Add images".
2. **The wall.** A grid of square tiles that fills the screen and scrolls on its own. Each
   tile shows one image, scaled up with hard pixel edges on a faint checkerboard so
   transparency is visible. The image is as large as fits the tile with 8px left clear on
   every side, keeping its proportions, so a wide or tall image leaves the rest of the square
   empty. Below it: file name and pixel size.
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
- On a screen too short for even one tile of that size, such as a phone on its side, the
  size a single tile can reach becomes the limit instead (never under 96px). A wall that
  fits is not made to scroll, and when it does scroll a whole row still fits the height.
  Short, wide screens also leave less room for the dock, since it is a single row there.
- While a panel is open, the space the tiles use ends above the panel and not above the
  dock, and the tiles are resized to fit it, so no image is hidden while its palette, style
  or threshold is changed. Closing the panel gives the space back. The example on the empty
  screen shrinks the same way.
- On touch screens a long file name is cut off with an ellipsis before the Download and
  Remove buttons. Tiles narrower than 150px still show the pixel size under the name, set
  slightly smaller and tighter, with the two buttons 36px wide instead of 40px so sizes up to
  seven characters (such as 128×128) fit whole.

The rule lives in `src/lib/layout.js` (`fitGrid`) and is unit tested.

### Tiles

- Pointer devices: Download and Remove buttons appear in the tile's top-right corner on
  hover or keyboard focus.
- Touch devices (no hover): the two buttons sit beside the file name and are always
  visible, 40px square.
- Holding a tile shows its other version (original if the wall shows bitified, and the
  reverse) until release. With a mouse this is instant. On touch a press counts as a hold
  after 150 ms, and only if the finger has moved less than 8px by then, so scrolling the
  wall or swiping (see "Quick switch") does not flash tiles.

### Dock, left to right

| Control | Behavior |
|---|---|
| First color swatch | Native color picker. Color for lines and dark pixels. |
| Swap | Exchanges the two colors. Works the same in every style and with every palette. |
| Second color swatch | Native color picker. Color for fill and light pixels. |
| Palette | Opens the palettes panel. |
| View switch | Two-way switch for the whole wall: "Original", and the bitified image under the name of the current style, such as "Cutout". |
| Style | Opens the style panel. |
| Download all | Saves every bitified image in one zip. Disabled when the wall is empty. |

The dock is three groups, with a divider between them where there is room (see "Responsive
behavior"): the colors with the Palette button that picks them, the view switch with the
Style button that picks what it shows, and Download all.

The two colors show which palette is in use, and the view switch shows which style: its
bitified half reads the style's name, so the name is on screen at every width, and changes
as the styles are stepped through. Its tooltip and its name for screen readers say
"Bitified:" and the style. That half is as wide as the longest name, "Silhouette", so the
dock does not move when the style changes; on phones the two halves are equal. Pressing it
shows the bitified images. It does not open the list of styles; the Style button does.

Panels open directly above the dock. Only one is open at a time. A panel closes on Escape,
on a second press of its button, or on a press outside the dock. Presses on other dock
controls leave it open, so colors can be changed while a panel is showing. A panel never
covers the wall: it is a strip one row high, and the wall makes room for it.

A press that closes something does nothing else. It closes one thing only, the innermost:
with the list of styles or the help open above the style panel, a press outside it closes
that and leaves the panel open, and the next press outside the dock closes the panel. What
was pressed, such as a button, a slider or an image, does not react to that press.

**Palettes panel.** Left to right: the word "Palette" with the name of the chosen
palette ("Custom" when the two colors match none), a divider, then every preset as a
diagonally split chip in a single row. There are twelve, in groups of four with a divider
between groups: classics, handheld screens, then monitors. The chosen chip has a ring, and
each chip's name is its tooltip. Where each pair comes from is in
[docs/palettes.md](../../palettes.md).

The panel is as wide as its chips when the screen has room for them in one row. When it
does not, the chips go in two rows, half the palettes in each, in the same order and
without the dividers. The panel is then taller, and the wall makes room for it as for any
panel. A screen too short to spare the height, such as a phone on its side, keeps one row.

Chips that still do not fit scroll sideways, by touch, by keyboard focus or with a mouse
wheel. That is what lets the list grow: the panel is never more than two rows of chips
high however many palettes there are. The whole panel is the area that scrolls them, so a
swipe that starts on the name or on the panel's edge works as well as one on the chips.
The name stays in place while the chips move. There is no scrollbar. Instead, a side that
has more palettes to scroll to fades out under an arrow, and the fade and arrow go when
that end is reached. The panel opens scrolled to the chosen chip.

A palette is two colors, a dark one and a light one, and nothing else. Palette, Swap and
style are independent: the palette decides which two colors, Swap decides which of them is
the first color, and the style decides which pixels get which. No palette favors a style
or a way round, and no style favors any colors.

- The chip always shows the dark color on the left.
- A preset is marked while the two current colors are its two colors, either way round.
  Swap never unmarks it; changing a color with a swatch does.
- Choosing a preset sets both colors and keeps the way round they are: dark color first,
  or light color first if the first color is currently the brighter of the two.
- The app opens on Glow with the dark color first.

| Name | Dark color | Light color |
|---|---|---|
| Glow (default) | `#222323` | `#f0f6f0` |
| Mono | `#000000` | `#ffffff` |
| Paper | `#382b26` | `#b8c2b9` |
| Torch | `#0b0a0c` | `#f6dfa4` |
| Game Boy | `#0f380f` | `#9bbc0f` |
| Pocket | `#1f1f1f` | `#c4cfa1` |
| Nokia | `#43523d` | `#c7f0d8` |
| Playdate | `#322f29` | `#d7d4cc` |
| Phosphor | `#25342f` | `#01eb5f` |
| Amber | `#3f291e` | `#fdca55` |
| Commodore | `#40318e` | `#88d7de` |
| Rose | `#4a0d2b` | `#ffd1dc` |

**Style panel.** A strip one row high, so that the wall can sit above it. Left to
right:

- The word "Style", set like "Palette" in the palettes panel, then the style button: a
  live preview of the current style (a small shaded ball with a stripe, drawn with the
  current two colors) and the style's name. Pressing it
  opens the list of the nine styles above the strip, each with the same live preview and its
  name, in two rows of five and four. Choosing a style closes the list. So does a press outside it, or
  Escape; either leaves the strip open.
- Threshold: a slider from 1 to 254, then a number box and an Auto button joined into one
  outlined control, so it is clear that Auto fills in the number. The Auto half is filled
  solid while Auto is on and muted while it is off. Auto is the default. Moving the slider or
  typing a number switches to manual; pressing Auto or clearing the box switches back.
  While Auto is on, the box shows the value Auto picked, or the range when images differ.
  The box is just wide enough for three digits, has no spinner arrows, and widens only to
  fit a range.
- Help button ("?"): opens a tooltip above the strip, with its arrow over the button. It
  has four lines in the body text size: what the threshold currently does, how to hold
  an image to compare, how to change the style without the panels ("Scroll to change the
  style."; on touch devices "Swipe up or down to change the style."), and the same for the
  palette ("Hold Shift and scroll to change the palette."; on touch devices "Swipe left or
  right to change the palette."). The threshold value and the word "Hold" are bold. In the
  last two lines the whole gesture is bold: "Scroll", "Hold Shift and scroll", "Swipe up or
  down", "Swipe left or right". Space and Shift are drawn as keys. It closes
  the same ways the list of styles does, and only one of the two is open at a time.

While the strip is a single row, a divider separates the style button from the threshold,
and another separates the threshold from Help. They match the dock's dividers.

### Responsive behavior

| Width | Dock |
|---|---|
| Above 800px | Icon and text labels, dividers between groups. |
| 521 to 800px | Icon-only buttons, one row. |
| 520px and below | Tools on the first row, the view switch on a second row as wide as the tools. The dock is only as wide as its tools, centered, and is never stretched to fill the screen; it keeps at least 12px from each edge. The style panel is as wide as the dock. The palettes panel stays as wide as its chips, centered and never wider than the screen less those margins, with the name on a row of its own above the chips. The style strip takes two rows, without dividers: the style button and Help, then the threshold. Its list of styles is a grid three wide, three rows of three, as wide as the strip. The image count and the word "images" in the Add button are hidden. |

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
images, so the colors, Swap, palettes, style, threshold, the view switch and
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
- Escape: close the open panel. If the list of styles or the help tooltip is open, close that first.
- Arrow keys: step through the styles and palettes (see "Quick switch").
- All controls are reachable by Tab with a visible focus ring.

### Quick switch

The style and the palette can be changed from anywhere, without opening a panel. The style
is the main one, on the up-and-down axis; the palette is on the sideways axis.

| | Next or previous style | Next or previous palette |
|---|---|---|
| Mouse wheel or trackpad | Scroll down or up | Hold Shift and scroll. Ctrl and scroll, and scrolling sideways, do the same. |
| Touch | Swipe up or down | Swipe left or right |
| Keyboard | ↓ or ↑ | → or ← |

Scrolling down, swiping up or left, and ↓ or → go to the next one; the opposite goes to the
one before. Both lists wrap round at their ends. The styles go in the order of the list of
styles, the palettes in the order of the palettes panel.

Each step shows a short message under the top bar for 1.4 seconds, with what changed, its
name and its place: "Style: Bayer · 6/9", "Palette: Game Boy · 5/12".

**Nothing that scrolls is taken over.** Before acting, the app looks at what is under the
pointer or finger, and at everything that contains it:

- If any of it has more content than it shows, the wheel belongs to it and no step is
  taken. That covers the wall once it has too many images to fit, the empty screen on a
  very short window, and the palettes panel while its chips scroll. The wheel never goes
  on to change the style when such an element reaches its end.
- A finger is judged on the axis it first moves along. Moving up or down over a wall that
  scrolls is the wall's own scroll; moving sideways there still steps the palettes, since
  the wall does not scroll that way. Over the palettes panel while its chips scroll it is
  the other way round.
- An arrow key keeps its own job in a number box, on a slider, and while focus is inside
  something that scrolls on that key's axis.
- Shift with the wheel is the usual way to scroll sideways, so it is judged on that axis
  alone: it steps the palettes over a wall that scrolls up and down, and is left to the
  palettes panel while its chips scroll. The help tooltip names Shift.
- Ctrl with the wheel steps the palettes everywhere. Ctrl with the wheel never scrolls
  anything, so there is nothing to take over. It would zoom the page; the app stops that.
  Ctrl with + and − still zooms.
- So with a wall that scrolls, the wheel changes the style over the top bar and the dock
  but not over the images. The arrow keys change it from anywhere.

Details:

- A trackpad pinch reaches the page as a wheel event marked Ctrl, without the key. Ctrl
  counts only after the keyboard has reported the key going down, so a pinch still zooms
  the page and never changes the palette.
- One notch of a mouse wheel is one step. A trackpad's small moves are added up until they
  make 50px. There is at most one step every 180 ms. A trackpad keeps sending moves, fading
  out, after the fingers lift; once a gesture has taken a step, moves under half the size
  of its largest are ignored, so one flick is one step. A gesture ends after 150 ms of
  silence. These numbers live in `wheelSteps` in `src/lib/gesture.js`.
- A swipe is one finger. It steps after 32px, and again every further 72px, so a flick is
  one step and a long drag goes through several. It keeps to the axis it started on. Two
  fingers are left to the browser's pinch zoom. A swipe that starts on a slider or a color
  swatch is that control's own drag.
- A tile that is already being held to compare keeps the gesture: moving the finger then
  does not step.
- While a swipe is the app's, the browser does not scroll, bounce the page or pull to
  refresh.
- Stepping keeps the two colors the way round they are, as choosing a palette in the panel
  does.
- Two colors that match no preset are the user's own. Stepping away from them keeps them
  as one more stop after the last preset, named "Custom", for as long as the page is open,
  so stepping through the palettes cannot lose them. The message then counts 13 palettes.

Known limits:

- A swipe that starts at the very edge of a phone screen may be taken by the system's back
  gesture. A page cannot prevent that.
- If a browser sends a Ctrl wheel move that it does not allow the page to stop, the app
  leaves it alone, so the page zooms and the palette stays.

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
| **Cutout** (default) | A pixel brighter than the threshold is light, every other pixel dark. Then, using those tones: a pixel on the darker side of a change stronger than the seam strength, between two pixels of the same tone, takes the opposite tone; and a dark pixel that touches empty space, with no light pixel among its eight neighbours, becomes light. Dark is first color, light is second. |
| **Lines** | A pixel is first color if any of its four neighbours is empty, or if a neighbour differs from it by more than the threshold and this pixel is the darker of the two. Everything else is second color. |
| **Solid** | Brighter than the threshold: second color. Otherwise first color. |
| **Checker** | Second color if the tone (see below) is above 0.25 on even `x + y` cells and above 0.75 on odd ones, so mid-tones become a checkerboard. |
| **Hatch** | Second color if the tone is above 0.75, 0.5 or 0.25 where `(x + y) mod 3` is 0, 1 or 2, so mid-tones become diagonal lines three pixels apart. |
| **Bayer** | Second color if the tone is above `(b + 0.5) / 16`, where `b` is the value of a 4×4 ordered-dither matrix at the pixel. |
| **Noise** | Second color if the tone is above `(n + 0.5) / 256`, where `n` is the value at the pixel of a 16×16 blue-noise grid: each number from 0 to 255 once, placed by the void-and-cluster method so that it has no regular pattern. |
| **Atkinson** | Error diffusion on `tone × 255`. Each pixel is cut at 127.5, and one eighth of the error goes to each of six neighbours (right, two right, the three below, two below). |
| **Silhouette** | Every non-empty pixel is first color. |

Details of Cutout:

- It fills bright parts, leaves dark parts dark and cuts parts apart, in the style of the
  game End of End. It draws no outline around a light part.
- A light pixel that touches empty space, diagonals included, is never cut, so seams do not
  eat into the silhouette.
- The difference between two pixels, the tie on equal brightness and the rule for the
  canvas edge are the ones Lines uses.
- The seam strength is always automatic. The threshold only moves the brightness cut.

Known limits of Cutout: a flat shading step, such as a shadow drawn in one darker color, is
cut like a part boundary; a dark part two pixels wide or less becomes all rim; art that is
already dithered becomes busy.

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

Checker, Hatch, Bayer, Noise and Atkinson work on a **tone** from 0 to 1 that runs through the image's own
range: its darkest brightness is 0, the threshold is 0.5 and its lightest brightness is 1.

- At or below the threshold: `0.5 × (brightness − darkest) / (threshold − darkest)`, or 0
  when the threshold is not above the darkest.
- Above the threshold: `0.5 + 0.5 × (brightness − threshold) / (lightest − threshold)`.

So with a threshold inside the image's range, Checker and Bayer never turn its darkest color
light or its lightest color dark, and outlines and highlights stay whole.

### Threshold

- In Lines it is the minimum color difference that counts as an edge.
- In Cutout, Solid, Checker, Hatch, Bayer, Noise and Atkinson it is the brightness cut-off.
- Silhouette ignores it.

Auto picks a value per image with Otsu's method, which splits a histogram into two groups
at the point that separates them best:

- For Cutout and Solid, on the histogram of pixel brightness. Fallback 127.
- For Checker, Hatch, Bayer, Noise and Atkinson, the point halfway between the mean brightness of the dark
  group and of the light group that this split separates (the split itself when one group
  is empty). Otsu's value is the lightest brightness of the dark group, and a pattern style
  renders the color at its threshold half and half, so with Otsu's value the lighter shade
  of a two-shade outline came out patterned.
- For Lines, on the histogram of non-zero differences between horizontally and vertically
  adjacent non-empty pixels. This separates soft shading steps from real part boundaries.
  The value is never below 24: an image with only soft shading has nothing to separate,
  and without the floor its shading steps would be taken for boundaries.

- For Cutout's seam strength, on the histogram of non-zero differences between adjacent
  non-empty pixels of the same tone, with tones split at the image's Auto brightness
  cut-off. Never below 24. It is taken at the Auto cut-off also when the threshold is set
  by hand, so seams do not jump while the slider is dragged.

A manual value applies to every image.

## Remembered settings

The two colors, the style and the threshold are saved in the browser on every change and
restored when the app opens. Nothing leaves the device.

- The colors are saved as they are, so a chosen palette, a swap and a custom color all come
  back. A palette is not saved by name; it shows as chosen because its colors match.
- The threshold is saved as a number, or as Auto.
- The view switch, the open panel and the images are not saved.
- They are stored as one JSON value under the `localStorage` key `bitify`. On the way back
  each value is checked on its own: a color must be `#rrggbb`, the style one of the nine,
  the threshold a whole number from 1 to 254. Anything else falls back to its default
  (Glow dark first, Cutout, Auto), so a damaged or outdated value cannot break the app.
- If the browser refuses storage, the app works as before and starts from the defaults.

## Animated GIFs

An animated GIF is imported with all its frames and plays on the wall straight away, looping,
at the speed stored in the file. Frames marked with almost no delay play at 100ms, as they do
in browsers.

- Every frame goes through the same conversion as a still image, and the whole animation uses
  one Auto threshold, one seam strength and one brightness range, taken from all its frames together. Taking
  them frame by frame would make pixels flicker between the two colors as the animation
  plays.
- The view switch, hold and Space show the original animation, still playing.
- GIF frames are often partial patches drawn over earlier frames. They are composited when
  the file is read, so each frame is held as the full picture it shows.
- A GIF with a single frame is treated as a still image. A file that cannot be read as a GIF
  falls back to the browser's own decoding, as a still.
- GIFs are read and written by the app itself (with the `omggif` library), not through a
  canvas, so their pixels are exact in every browser.
- The GIF code is a separate file of about 8 kB (3 kB compressed) that is only downloaded
  the first time a GIF is added. Someone who only uses still images never loads it.

## Saving

- A single image saves as `<original name without extension>-1bit.png` at its original
  pixel size.
- Download all saves `bitify.zip` containing one such PNG per image. Duplicate names get
  `-2`, `-3` and so on.
- An animation saves as `<original name without extension>-1bit.gif`: every frame in the two
  chosen colors, empty pixels transparent, with the original frame delays and loop count.
  Download all puts GIFs and PNGs in the same zip.
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
| `src/lib/bitify.js` | Pure conversion, no DOM. `analyze(imageData)` returns size, pixels, brightness, whether any pixel is empty, the darkest and lightest brightness, and the auto thresholds. `mask(analysis, style, threshold)` returns one byte per pixel (0 empty, 1 first color, 2 second color). `colorize(mask, first, second)` returns RGBA pixels. |
| `src/lib/gif.js` | Reading an animated GIF into full frames (`decodeGif`) and writing a two-color one (`encodeGif`). No DOM. |
| `src/lib/save.js` | Output file naming, zip, PNG encoding from pixels, single save, save all. |
| `src/lib/settings.js` | The default settings, and `restore(text, styles)`, which reads stored settings back and checks each value. No DOM. |
| `src/lib/presets.js` | The list of palettes and the list of styles, whether two colors are a palette's, and stepping to the next or previous style or palette. No DOM. |
| `src/lib/gesture.js` | `wheelSteps()`, which turns the stream of wheel moves from a mouse or trackpad into single steps. No DOM. |
| `src/App.svelte` | All state; top bar, wall, empty state, drop overlay, messages; window-level drop, paste, key, wheel and swipe handling. |
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

- `omggif`, for reading and writing animated GIFs.
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
  - Checker, Hatch, Bayer, Noise and Atkinson pattern a middle color, keep an image's darkest color dark
    and its lightest light, leave an image of one color flat, and at Auto keep both shades
    of a two-shade outline dark;
  - Hatch draws a darker middle color as wide diagonal lines and a lighter one as thin lines;
  - Noise lights exactly half of its 16×16 grid for a middle color, and a lighter color
    lights those cells and more;
  - every worked example in `docs/styles.md` is exactly what the code draws;
  - Lines outlines an inner part as well as the silhouette, draws a one-pixel boundary,
    ignores a shading step below the threshold, frames only images that have empty
    pixels, and at Auto draws no lines along soft shading;
  - Cutout fills a bright part and leaves a dark one dark, cuts a one-pixel seam between
    two parts of the same tone, rims a dark part on the silhouette, keeps a dark outline
    around a light part, never cuts a light pixel on the silhouette, and rims only images
    that have empty pixels;
  - Silhouette fills everything;
  - Auto returns a value between two clearly separated groups.
- `src/lib/save.js`: output naming, including duplicates.
- `src/lib/settings.js`: stored settings come back unchanged; missing or damaged text gives
  the defaults; a single unusable value is replaced on its own.
- `src/lib/presets.js`: styles and palettes step forward and back and wrap at both ends; a
  palette is found either way round; the user's own colors stay as a stop after the presets.
- `src/lib/gesture.js`: one step per notch of a mouse wheel; a trackpad's small moves add
  up; a turn round or a silence starts again; never more than one step per pause; one
  step for a flick with its fading tail.
- The interface is checked by hand in a desktop browser and at phone width: add by drop,
  picker and paste; remove one and all; change colors, palette, style and threshold;
  compare by switch, hold and Space; save one and all; and quick switch by wheel, Shift
  or Ctrl with wheel, arrow keys and swipes, on the empty screen, on a wall that fits and on one
  that scrolls, where the wheel and an up-or-down swipe over the images must scroll them
  and change nothing.

## Not included

- Remembering the view switch or the images between visits.
- Export upscaling, or formats other than PNG.
- Per-image settings; style, threshold and colors apply to the whole wall.
- Custom user palettes.
- Animation in formats other than GIF (animated WebP, APNG): only the first frame is used.
- Pausing or scrubbing an animation, and changing its speed.
- Installable or offline (PWA) behavior.
- Hosting and deployment.

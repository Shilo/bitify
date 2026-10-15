# Colorfetti design

## Full palette ordered dithering — October 14, 2026

Full palettes offer Dithering Off, 2×2, 4×4 and 8×8. Off is the fresh and Reset
default, preserving previous nearest output exactly. The optional Dither strength control
runs from 0 to 100%, defaults to 50%, commits after a 200 ms pause or release/change,
and discards pending edits on pointer cancellation, panel close, palette/family or
pattern change. Zero is identical to nearest. The setting and amount are remembered
across visits and family changes. Invalid stored fields restore Off and 50%.

The full-palette settings heading and Help step are Recolor. Help says “Tune
matching, color limits and dithering.” Rows retain Max colors, Matching and Cleanup,
then add Dithering and conditional Dither strength before conditional Opacity cut.
Pattern choices retain explicit 2×2, 4×4 and 8×8 dimensions rather than bare numbers;
the label explanation identifies them as source-pixel pattern sizes. Dither strength
wraps within the existing label column, with a 44px-high range target, keeping the
relationship explicit without increasing the label column or adding another row. The
existing optional 1-bit Bayer, Noise and diffusion styles keep their behavior and
settings. Multicolor dithering belongs only to the full-palette conversion family.

Ordered Bayer ranks are anchored to original source coordinates, with no changing
frame seed. Alpha is classified before color work; dithering never changes the
opacity cut, visible mask or target palette. Exact RGB members of the active
palette/subset remain exact. Pattern phase and full-source pixel results are the
same in sampled wall previews, enlarged Preview, Save, Copy, GIF, ZIP and dragging.
The cap still selects its existing per-asset/whole-GIF subset first. Dither settings
do not regenerate Auto or refit the subset. Cleanup keeps its independent frozen
nearest-source proposals, then its approved replacements override those source
coordinates with solid target colors after dithering. Other pixels keep the pattern.

Matching chooses the four nearest candidates (or all entries for smaller palettes)
and the nearest anchor. Up to six candidate pairs are scored at up to three
grid-realizable occupancies. Pair averages use linear-light RGB and Oklab tone error,
plus 0.03 times expected point distortion to discourage distant mixtures. Strength
interpolates the target average from the nearest color toward source linear light.
RGB Matching changes candidate ranking/anchor, not the Oklab mixture objective.
These bounded heuristics add texture and cannot recover hues absent from a palette.

Identical source RGB may now map to different palette colors at different pattern
positions. Fixed unchanged coordinates remain stable across animation frames when
their palette/subset and settings stay fixed; moving shapes can swim through the
pattern. This is not motion compensation or a promise of universally better art.
Error diffusion is deferred because it can change distant unchanged pixels.

Dither mode and amount participate in immutable export snapshots, retained-preview
identity, animation-cache identity and export-drag invalidation. Changed/canceled
jobs cannot publish stale settings. Existing palette export overflow/failure rules
remain; no extra color or undithered fallback is silently exported. Off allocates
no dither scratch. Enabled async work uses smaller bounded slices and the existing
posted-task/cancellation scheduler; repeated-color memoization is bounded.

This section supersedes older full-palette wording that restricts conversion to
nearest matching alone or labels the settings panel Nearest.

## Colorfetti identity — October 13, 2026

Colorfetti is the product name. The logo is the approved square C frame (black on light surfaces, off-white on dark surfaces) with
five confetti pieces and the fixed orange, violet, pink, yellow and teal palette.
The master is `src/assets/logo.svg`; geometry and HEX values are specified in
[the brand guide](../../research/2026-10-13-colorfetti-identity.md).

Help, favicon, installed icons, README and social previews share this mark.
General artwork is transparent and cropped to 30×30 logical units with no outer
margin. Help selects the explicit SVG matching the app theme. The empty-wall
example uses the corresponding transparent 60×60 PNG, still processed by the
active conversion settings. Two immutable PNG sources decode once; selection always follows the current theme.
The demo tile is keyed by source identity to reset its conversion caches, while
imported-image tile identities stay unchanged. Unmount cancels pending decoding.
Browser favicon selection uses the browser preference independently of the app's
saved override, choosing versioned explicit SVG/PNG/ICO variants and following preference
changes. Installed and Apple icons retain opaque off-white tiles with platform
padding; maskables use their separate safe-area inset. Monochrome variants remain
separate from normal full-color icons.

Title and install metadata use Colorfetti. The approved description is
“Throw your pixels a palette party. Recolor images and animations.”
Product descriptions lead with generating, choosing, importing and editing palettes;
1-bit is an optional mode for two-color effects. Help follows the selected mode:
Palette says “Use Auto, pick a palette or import your own.” followed by
Nearest: “Tune color matching and limits.” In 1-bit, Palette says “Pick a color pair
or choose your own colors.” followed by Style: “Pick an effect and tune its settings.”
Download all saves `colorfetti.zip`; individual suffixes,
repository URLs and conversion behavior retain their existing rules. Settings use
`colorfetti` and saved palettes use `colorfetti-palettes-v1`; read-only legacy aliases
restore existing records when the new keys are absent, including the initial theme.
These identity rules supersede earlier branding and example-animation references.

## Reviewed performance contracts — October 13, 2026

The unchanged successful palette rendering of a Tile may be reused after Original,
viewer or visibility pause only when source/frame, sample size, palette/subset,
matching, alpha and cleanup inputs match. Pending/canceled or changed inputs never
restore readiness from an old rendering. Keep one identity record for the already
retained pixels, without a new still-image cache or additional pixel buffer.

Palette export packing yields through the existing posted-task primitive, retaining
the unsupported-MessageChannel timer fallback and exact output/timing contracts.
Single-frame GIFs preserve native/browser still pixels; analysis stays on the same
serial import worker following a controlled single-frame response. Unreadable
worker messages terminate/release the affected job through existing failure and
recovery rules; canceled imports never fall back or publish.

Desktop hover stops queued work immediately on leave. In-flight preparation gets
the existing 180 ms hover delay before abort: returning to the same still-pending
request during that window reuses it. Results completed while away still discard.
Supersession, settings invalidation, explicit cancellation and destroy abort at once.
Cancellation releases its own subscribers and compressor, preserving
independent Save/preview work and native active/grace records. Noncancelable module
downloads cannot block a newer hover; late results release their URLs and cannot
publish. Overlapping explicit exports, animation cache policy and opacity-slider
commits remain unchanged. GPL RGB import avoids ambiguous whitespace backtracking.

See docs/research/2026-10-13-performance-stability-fixes.md for verification and
remaining review items. These contracts supersede earlier performance wording
where it implies every Original/viewer transition must reconvert.

Date: 2026-10-06
Status: Floating islands adopted October 9, 2026; full palette family added October 11, 2026. The adoption sections below supersede historical visual references and the original two-color-only scope.

Colorfetti recolors images, sprites and animated GIFs with automatic, preset or custom
palettes of 1–256 unique opaque RGB colors. Optional 1-bit styles use two chosen colors.
In 1-bit, either of the two selected colors may be None, which leaves
its pixels transparent. Full palettes classify source alpha separately. It runs entirely
in the browser. Nothing is uploaded.

### Desktop optimized export dragging (October 11, 2026)

Main-wall images and fullscreen Preview support mouse dragging on ordinary URLs.
It requires a primary fine pointer with hover support. Coarse/no-hover mobile devices
create no drag runtime. Touch and pen input cannot arm a
drag on desktop either. Release, cancellation and capability loss disarm mouse dragging.
Detected mobile browsers (mobile UA data, Android/iOS user agent, or an iPad reporting
a Mac platform with touch points) remain excluded even with a connected mouse.
Touch/pen takeover also cancels queued mouse-hover export work; an already running
export is allowed to finish and its no-longer-requested result is discarded.
This applies to touch/pen presses on controls as well as artwork through a passive
capture listener that does not prevent or consume the original touch gesture.
Touch/pen gestures and the empty example keep their established behavior. Preview
uses the same controller and export identity as the wall; successful drags cancel its
click-dismissal candidate. Original comparison never changes the exported conversion.

The drag file uses the existing full-source conversion snapshot, analysis, `converted`,
`fileBytes` and `downloadName` paths. Existing Save/Copy/ZIP paths and encoders remain
unchanged. The displayed canvas is never encoded for dragging; original comparison
does not change the converted export. GIFs carry all frames, source delays and loop.
Only the drag filename replaces Windows-invalid characters; encoded bytes match Save.

Mouse hover debounces preparation for one image. Jobs run serially, and only the current
image/source identity and complete conversion settings may publish a ready file.
`dragstart` checks those inputs again synchronously. Missing/stale exports cancel the
drag; they never use a preview, a previous settings export or an animation still.
Once started, a drag owns its settings snapshot like Save, even if settings change later.

The default payload preserves Chromium's native encoded-image file and adds DownloadURL.
A transparent, hit-testable image resource is decoded from the optimized export's blob,
while the preview canvas stays visible. Only a primary left mouse press arms this image;
its parent button is not draggable. Record identity, decoded witness, image target/src,
dimensions and current conversion inputs are checked synchronously before allowing drag.
An active source stays connected through settings invalidation until dragend; its own
dragend listener also handles removal of its tile. There are no alternate probe payloads.
Default HTML/preview URL formats are removed without destroying the native file.
The native URL refers to the same encoded
file; active drags retain it across window blur, with 60 seconds of consumer grace
after dragend. At eight evicted exports still in grace, new drags are blocked until
capacity returns. Drops back into Colorfetti are ignored before artwork/palette import.

There is no drag debugging UI, URL flag, fingerprinting, retained metadata log or window
test hook. Prototype tests and fixture servers were removed after the user verified all
PNG/GIF wall/Preview combinations in Brave with Discord and File Explorer. Browser-native
byte equality and touch/lifecycle regression results are recorded in the validation document.

The approved interactive prototype is saved next to this file as
[2026-10-06-colorfetti-prototype.html](2026-10-06-colorfetti-prototype.html). It is a historical behavioral reference. The October 9 Floating islands adoption below
supersedes its appearance and spacing; established conversion and interaction contracts
remain. It is plain HTML and JavaScript, written as a throwaway; the app
is a fresh build, not a port of that file's structure.

## What was asked for

Stated by the user:

- Convert any pixel art image to 1-bit using two user-chosen colors.
- Modern, minimal, full-screen, intuitive, easy.
- Drag and drop any number of images, at any time, including after others are loaded.
  Images can be removed again.
- Changing a color redraws everything immediately.
- Download each image on its own, and download all images.
- Copy each image to the clipboard with a button to the left of its Download button, on
  desktop and on phones, and with Ctrl+C for the first image (added 2026-10-07; see
  "Copying"). On phones the two sit behind one Share button, so that only two buttons are
  beside the name (see "Tiles").
- A toggle between the original and the converted image.
- Swap, a palette selector, and a threshold. Threshold and an Auto button live in an
  style strip above the dock, which never covers the images.
- Settings of its own for every style, beyond the threshold, shown where they do not cover
  the images either, so a change can be watched while it is made (see "Each style's
  settings").
- The style strip offers several conversion algorithms. The default shows the
  individual parts of a sprite (body parts, clothing, equipment), in the style of the game
  End of End, and not only the silhouette. Since 2026-10-07 that default is Cutout, which
  fills the parts and cuts them apart; Lines, which outlines them, was the default before.
- Must work on iOS and Android.
- Vite + Svelte, pure Svelte, no SvelteKit.

Assumptions made here, open to correction:

- Plain JavaScript, not TypeScript.
- The two colors, None, style and style settings are remembered between visits. The October 11
  full palette adoption additionally remembers family, selected palette and alpha cut, and
  keeps explicitly saved named palettes in a separate local library. Source images are not persisted.
- Exports are PNG at the original pixel size, with no upscaling option.
- Animated WebP and APNG files are converted as their first frame only. (Animated GIFs are fully supported; see "Animated GIFs".)

## Layout: the Wall

One screen, no page scroll. Three layers:

1. **Top bar.** The "Colorfetti" wordmark, an image count, and at the right a trash icon button
   that removes all images (only when there are images), "Add images", and last a More
   button (three dots, one above the other) that opens a menu (see "The More menu").
2. **The wall.** A grid of square tiles that fills the screen and scrolls on its own. Each
   tile shows one image, scaled up with hard pixel edges on a faint checkerboard so
   transparency is visible. The image is as large as fits the tile with 8px left clear on
   every side, keeping its proportions, so a wide or tall image leaves the rest of the square
   empty. Below it: file name and pixel size.
3. **The dock.** A floating bar at the bottom center holding every setting.

Chrome is neutral grey in both light and dark themes (following the system setting, unless the other theme is
picked in the More menu), so
the two chosen colors are the only strong colors on screen. The one exception is Reset in
the Style panel, which throws settings away and is tinted to say so (see "Style panel"). Icons are 7×7 one-bit pixel
glyphs. The wordmark and empty-state heading use Pixelify Sans; everything else uses
Schibsted Grotesk. Both load from Google Fonts with system fallbacks.

### Fitting the wall to the screen

The tiles always use the space between the top bar and the dock, and are centered in it.

- With one image, its tile is as large as that space allows. Each time an image is added or
  removed, or the window changes size, the tiles are resized so that all of them still fit
  without scrolling. The column count is whichever gives the largest tiles, so two images sit
  side by side on a wide screen and stacked on a tall one. A partly filled last row is
  centered.
- A tile's size counts its caption, and on touch screens its Share and Remove buttons, so
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
  or a setting of its style is changed. Closing the panel gives the space back. The example on the empty
  screen shrinks the same way.
- On touch screens a long file name is cut off with an ellipsis before the Share and
  Remove buttons. Tiles narrower than 150px still show the pixel size under the name, set
  slightly smaller and tighter, with the two buttons 36px wide instead of 40px so sizes up to
  seven characters (such as 128×128) fit whole.

The rule lives in `src/lib/layout.js` (`fitGrid`) and is unit tested.

### Tiles

- Pointer devices: three buttons, Copy, Download and Remove in that order, appear in the
  tile's top-right corner on hover or keyboard focus.
- Touch devices (no hover): two buttons, Share and Remove, sit beside the file name and are
  always visible, 40px square. Three do not fit beside a name on a 140px tile, so Share
  stands in for Copy and Download.
- Share opens a sheet at the bottom of the screen, over a dimmed wall: the image's file
  name, then Copy, Download and Cancel, one under the other. Copy and Download do what the
  buttons on a pointer device do, and close the sheet. Cancel, a tap on the dimmed wall and
  Escape close it and do nothing else. While it is open nothing behind it reacts, swipes
  included. It is the app's own sheet, not the system's share sheet.
- Holding a tile shows its other version (original if the wall shows converted, and the
  reverse) until release. With a mouse this is instant. On touch a press counts as a hold
  after 150 ms, and only if the finger has moved less than 8px by then, so scrolling the
  wall or swiping (see "Quick switch") does not flash tiles.

### Dock, left to right

| Control | Behavior |
|---|---|
| First color swatch | Native color picker. Color for lines and dark pixels. Shows a slash on a checkerboard while the color is None; the picker still opens, and choosing a color there turns None off. |
| Swap | Exchanges the two colors, and takes None along with its color. Works the same in every style and with every palette. |
| Second color swatch | Native color picker. Color for fill and light pixels. Shows None as the first swatch does. |
| Palette | Opens the palettes panel. |
| View switch | Two-way switch for the whole wall: "Original", and the converted image under the name of the current style, such as "Cutout". |
| Style | Opens the style panel. |
| Download all | Saves every converted image in one zip. With exactly one image on the wall it reads "Download" and saves that image as its own file, not a zip. Disabled when the wall is empty, where it also reads "Download". |

The dock is three groups, with a divider between them where there is room (see "Responsive
behavior"): the colors with the Palette button that picks them, the view switch with the
Style button that picks what it shows, and Download all.

The two colors show which palette is in use, and the view switch shows which style: its
converted half reads the style's name, so the name is on screen at every width, and changes
as the styles are stepped through. Its name for screen readers says
"converted:" and the style. That half is wide enough for every style name, so the
dock does not move when the style changes; on phones the two halves are equal. Its custom
tooltip explains that it shows the converted images using the named style. Pressing it
shows the converted images. It does not open the list of styles; the Style button does.
The Original half's custom tooltip says "Show the source images before conversion."

Changing the style or any of its settings while the original is showing switches the view back
to converted, so the change is seen. That holds for every route: the list of styles (also
when the style chosen there is the current one), a setting's slider, number box, Auto or
buttons, Reset, and stepping the styles by wheel, swipe or arrow key. Changing a color or the palette
leaves the view as it is.

Panels open directly above the dock. Only one is open at a time. A panel closes on Escape,
on a second press of its button, or on a press outside the dock. Presses on other dock
controls leave it open, so colors can be changed while a panel is showing. A panel never
covers the wall: it is a strip one row high, and the wall makes room for it.

A press that closes something does nothing else. It closes one thing only, the innermost:
with the list of styles open above the style panel, a press outside it closes
that and leaves the panel open, and the next press outside the dock closes the panel. What
was pressed, such as a button, a slider or an image, does not react to that press.

**Palettes panel.** Left to right: the word "Palette" with the name of the chosen
palette ("Custom" when the two colors match none) and, under the name, the switch that
makes a color None (see "A color that is None"), a divider, then every preset as a
diagonally split chip in a single row. There are twelve, in groups of four with a divider
between groups: classics, handheld screens, then monitors. The chosen chip has a ring, and
each chip's custom tooltip starts with its palette name, followed by a colon and its
description of the colors and appearance. Where each pair comes from is in
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
- The 1-bit family initially uses Glow with the dark color first. See the October 12 default adoption below.

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

**A color that is None.** One of the two colors may be None, never both. A pixel that would
get a None color is empty instead, exactly like a pixel outside the sprite: clear on the
wall, transparent in the PNG and the GIF, transparent on the clipboard. Nothing else about
the conversion changes: a style still decides which pixels are first color and which are
second, and still never looks at the colors. The color under a None is remembered, and
turning None off brings it back.

- A small **switch** makes a color None. It is no palette, so it is kept out of the row of
  palettes and sits with the palette's name: under the name on a wide screen, and at the
  far end of the name's row on a phone, where the name has a row of its own. It has no
  label.
- The switch is the dock's view switch at a smaller size, with three segments that hold
  pictures in place of words: both colors, the first color gone, the second color gone.
  Pressing a segment sets that state, so any of the three is one press away and the one
  in force is always marked.
- Each picture is a small square split as a palette chip is, the first color at the top
  left. A color that is there is filled, and one that is gone is a fine checkerboard, the
  sign for see-through. The pictures are drawn in the text color, not in the palette's
  colors, which a dark panel can swallow.
- The segments' names for screen readers are "Both colors", "No color for
  lines and dark pixels" and "No color for fill and light pixels"; the group is named
  "Transparent color".
- On a touch screen the switch is larger: 34px high with segments 40px wide, against 26px
  and 30px.
- A preset stays marked by its two colors as before, whether or not one of them is None.
  Choosing a preset or stepping through the palettes changes the colors and leaves None
  where it is.
- A swatch whose color is None shows the checkerboard with a diagonal slash. Pressing it
  opens the color picker on the remembered color; choosing a color there turns None off
  for that swatch, and closing the picker without choosing leaves it on.
- Swap takes None along: a None first color becomes a None second color, so the picture
  turns into its inverse as it does with two colors.
- The wall, the style previews, the saved PNG and GIF, the copied PNG and every file in the
  zip leave the None color out.
- Shape draws every solid pixel in the first color. With the first color None it
  would draw nothing, so there it is drawn in the second color. This is the one place
  where a style's name matters to the coloring; the conversion is unchanged.
- The drop screen keeps using the two remembered colors.

**Style panel.** A strip one row high, so that the wall can sit above it, with the
current style's other settings a press away. Left to right:

- The word "Style", set like "Palette" in the palettes panel, then the style button: a
  live preview of the current style (a small shaded ball with a stripe, drawn with the
  current two colors) and the style's name. Pressing it
  opens the list of the eleven styles above the strip, each with the same live preview and its
  name, in a compact grid matching the parent panel's full width and border edges.
  It fits as many columns as the width allows, with a 60px minimum button width, so all
  eleven styles fit in one row at the parent panel's maximum desktop width. Each button
  is at least 58px high, with a 28px preview, 11.5px label, 5px vertical and 3px horizontal
  padding. The popup has 6px padding and 5px gaps. Thin decorative dividers separate
  Cutout/Solid/Lines, Stencil/Icon, Checker/Bayer/Hatch/Atkinson/Noise, and Shape.
  A divider is omitted when its group begins a wrapped row; it never gets its own grid cell.
  On a phone too short to show them all above the panel, the
  list scrolls. Choosing a style closes the list. So does a press outside it, or
  Escape; either leaves the strip open.
  Each style button has a concise tooltip listing suitable image types and uses, based on
  `docs/styles.md`, without a "Best for" prefix. It appears after 350 ms of mouse hover,
  immediately on keyboard focus, or after a 500 ms touch hold. A touch hold only shows
  the tooltip: release never selects the style or closes the list. The tooltip stays
  readable after release until another press, scrolling, cancellation or resizing.
  Moving a finger 8px cancels the hold and leaves scrolling available. A normal tap still
  selects the style. Escape dismisses a visible tooltip before closing the list. Tooltips
  fit within the viewport, including when the list scrolls, and describe their buttons to
  screen readers.
- Threshold: a slider from 1 to 254, then a number box and an Auto button joined into one
  outlined control, so it is clear that Auto fills in the number. The Auto half is filled
  solid while Auto is on and muted while it is off. Auto is the default. Moving the slider or
  typing a number switches to manual; pressing Auto or clearing the box switches back.
  While Auto is on, the box shows the value Auto picked, or the range when images differ.
  The box is just wide enough for three digits, has no spinner arrows, and widens only to
  fit a range. Shape has no threshold, and the strip leaves its place empty. Stencil
  has none either: its Cuts setting stands there instead, with a slider, number box and
  Auto of its own. While its Auto is on, the box shows what Auto comes to for the sprites
  on the wall, least to most.
  Icon has Detail instead, a 0–100% slider and number box without an Auto button.
- More: a square button with three dots, one above the other, and no word: the same icon as the More button at
  the right end of the top bar, so "more" looks the same wherever it is. It is named "More
  settings" for a screen reader and on hover. It opens the tray (below), and is drawn
  pressed while the tray is open. It carries no mark for settings that have been changed.

While the strip is a single row, a divider separates the style button from the threshold.
It matches the dock's dividers.

**The tray.** More opens the current style's other settings under the strip, inside the
same panel, all at once. The panel grows upward and the wall makes room for it, as for any
panel, so the images stay in view while a setting is changed. Pressing More again closes
it. It stays open or closed as styles are changed, and shows the settings of whichever
style is current. It starts closed, and whether it is open is not remembered between
visits.

- Each setting is a row: its name, then its control. A dot follows the name while the
  setting is not at its default, as on a phone's chips. The threshold has no name on the
  strip and so no dot there; its Auto button, off, says the same. A setting with a few values to choose
  from is a row of buttons, one pressed, like the view switch. A number is a slider and a
  number box, with an Auto button joined to the box where the setting has an Auto. They
  work as the threshold's do: the box clamps what is typed to the setting's range, and
  clearing it goes back to Auto. A number half typed, such as a minus sign alone, changes
  nothing. Fill darks has no Auto; its box is empty and reads "Off"
  at 0, and clearing it turns it off. A box of a setting with neither waits for a number
  when it is cleared, and shows the setting's value again when it loses focus.
- The rows are two side by side. At 700px wide and below there is one to a row, and the
  strip drops the word "Style" to leave the threshold's slider room beside More.
- At the right of the tray, a Reset button (an icon and the word) that puts all of the
  current style's settings, the threshold included, back to their defaults. In the two-column
  tray it fills the empty right-hand cell beside the last setting when there is one,
  centered vertically with that setting; otherwise it follows on its own row. In the
  single-column tray it follows the settings on its own row. Its word, icon
  and edge are tinted red, quietly: `#b3261e` on light, `#f2928a` on dark, the edge only
  part of the way there, and nothing filled. There is no other text under the rows. Reset is disabled while they are all at their defaults. Pressed from the
  keyboard it hands the focus to More (to the pressed chip on a phone), because a disabled
  button would keep the keys to itself.
- Direction's four buttons show a sign each and are read out as Rising, Falling, Level and
  Upright. A focus ring inside the tray or the chip row is drawn within its control, since a
  box that scrolls would cut one drawn outside.
- The tray is never taller than the window less 440px, and never shorter than one control.
  When its rows need more than that (a short window) it scrolls inside itself, so the wall
  always keeps some room.

**On a phone** (520px wide and below) there is no room for a tray with the images still in
view: with six settings open it would leave them a strip a few dozen pixels high. So a
phone shows one setting at a time, and the panel is two rows high for every style, the
height it has always had there:

- First row: the style button, here only its preview and caret (the view switch below
  already names the style), then every setting of the style as a chip, the threshold
  first. A chip shows the setting's name over its value ("Auto", "Off", "70%", "2×"), and
  a dot after the value while that is not the default, the threshold's chip included. The
  chips scroll sideways by swipe
  or wheel, as the palettes do. A side with more chips to scroll to fades out under a small
  arrow, 30px wide; nothing shows on a side that has no more, or when every chip fits.
  After the last chip the row ends in a Reset chip (an icon and the word), which works as
  the tray's Reset does, is tinted as it is, and is disabled while there is nothing to reset.
- The panel is as wide as the screen less 12px on each side, not only as wide as the dock
  under it: the chips and the slider have use for every pixel. At 375px wide the
  slider is 220px or more; at the dock's width it was 110 to 190px.
- Second row: the control of the pressed chip, as wide as the row. Reset is not on this row
  because the control needs all of it: on a phone 280px wide, with Auto showing a range,
  a button beside it left the slider under 50px.
- The threshold's chip is pressed to begin with, so the panel opens as the strip it was.
  The pressed chip is remembered while the app is open; a style that does not have that
  setting shows its first. The pressed chip is the only thing that says which setting the
  control belongs to, so it is always scrolled into view: when it is pressed, when the
  panel opens, and when a change of style brings other chips.
- There is no More button and no tray.

**On a phone on its side** (520px high or less, and wider than high) there is the width for
a tray but not the height: open, it would leave the wall no room at all. So it has the chips
too, in one row: the style button (preview and caret), the chips with Reset at their end,
then the pressed chip's control beside them. The panel is as wide as the screen less 12px on each side, up to 700px. A screen that
is also 520px wide or less (a very small phone on its side) keeps the dock's two rows.
The panel is one row high, as the strip always was there.
The list of styles is one row there as well, scrolling sideways by swipe or wheel, because
two rows do not fit above the strip; it opens with the current style in view. On a screen
280px high it still fits, over the top bar while it is open.

Which of these a screen gets follows its size as the window is resized or the phone turned.

In every one of them a row of buttons to choose from gives a longer word the room it needs
before sharing the rest out equally, so "Value" is whole beside "R", "G" and "B" on the
narrowest phone.

### The More menu

The More button is the last button in the top bar, at every width. It opens a small menu
that drops down below it, lined up with its right edge, with four or five rows, each an
icon and a word or two. The rows are in three groups with a thin line between them: what
the app is set to (the theme, Install), what tells about it (Help, GitHub), and what
throws things away (Reset settings).

- Dark mode or Light mode, first: switches to the theme it names, which is always the one
  not showing. The icon is a moon or a sun. A pick that differs from the system setting is
  kept between visits (see "Remembered settings"); picking the system's own theme goes
  back to following the system. The browser's bar color follows the theme showing.
- Install: asks the browser to install Colorfetti as an app (see "Installing"). The row
  is there only while the browser offers that.
- Help: closes the menu and opens the help (see "Help and welcome").
- GitHub: opens `https://github.com/Shilo/colorfetti` in a new tab. A second, muted icon at the
  right end of the row, an arrow leaving a box, shows that the link leaves the app.
- Reset settings, last, in the Reset color: closes the menu and asks "Reset all settings?" in a
  small dialog in the middle of a dimmed screen, with one line saying that colors, styles
  and theme return to their defaults and, after an empty line, that the images stay, then Cancel and Reset side by
  side. The dialog opens on Cancel. Reset puts everything in "Remembered settings" back to
  its default, which is then what is stored, and a toast says "Settings reset."; the
  images, the view switch and the open panel are left as they are. Cancel, Escape and any
  other click or tap close the dialog and change nothing. While it is open the wheel and
  the keys change nothing, as with the menu.

The menu closes on any click or tap, inside or outside it, and on Escape. While it is open
nothing else on the screen reacts to a press, and the wheel and the keys change nothing
(see "Quick switch").

### Help and welcome

The help is one dialog in the middle of the screen, over a dimmed app. It opens from Help
in the More menu, and by itself on a first visit, as the welcome. A first visit is one with
no remembered settings (see "Remembered settings"); the app saves its settings as it opens,
so the welcome shows once. Where the browser refuses storage it shows on every visit.

It is 420px wide, never wider or taller than the screen less 16px on each side, and scrolls
inside when the screen is too short for it. It fades and rises into place in 150 ms, except
under reduced motion. Top to bottom:

- A compact header contains the approved C-frame logo (`src/assets/logo.svg`),
  drawn at 56px with crisp pixel edges, transparent gaps and no outer source padding.
  Its C is black in light mode and off-white in dark mode; confetti colors stay fixed.
  The Colorfetti wordmark and approved description appear beside it:
  “Throw your pixels a palette party. Recolor images and animations.”
  A Close button sits in the top-right corner.
- Four steps, each an icon, a word and a line. The icons are the app's own: the plus of
  Add and the icons of the dock's Palette, settings and Download buttons. The first is worded
  for the device in use:

  | | Mouse and keyboard | Touch |
  |---|---|---|
  | Add | Drop, paste or choose images. | Choose images. |
  | Palette | Use Auto, pick a palette or import your own. | The same. |
  | Nearest | Tune color matching and limits. | The same. |
  | Save | Download or copy images. | The same. |

  In 1-bit, Palette says “Pick a color pair or choose your own colors.” and Nearest
  becomes Style: “Pick an effect and tune its settings.”

- Under a divider, a table headed "Controls", with a thin line between its rows. Each row
  names a control and gives every way to do it, one way to a column. The rows are in the
  order of the steps. With a mouse and keyboard the columns are "Mouse" and "Keyboard":

  | Controls | Mouse | Keyboard |
  |---|---|---|
  | Add image | Drag, Drop | Ctrl, V |
  | Next palette | Shift, Scroll | ←, → |
  | Next style | Scroll | ↑, ↓ |
  | Style settings | Click, the Style icon, the More icon | (nothing) |
  | See original image | Press, Image | Space |
  | Save image | Click, the Download icon, the Copy icon | Ctrl, C |

  On touch there is one column, "Touch":

  | Controls | Touch |
  |---|---|
  | Add image | Touch, the plus icon |
  | Next palette | Swipe, ←, → |
  | Next style | Swipe, ↑, ↓ |
  | Style settings | Touch, the Style icon |
  | See original image | Hold, Image |
  | Save image | Touch, the Share icon |

  Everything in those columns is drawn as a key, so that it stands out from the text: the
  keys themselves, what a mouse or a finger does, such as "Scroll" and "Hold", what it is done to, and
  the icons of the buttons to press. Each comma above separates two keys; they sit side by
  side with no "+" between them. On a Mac, Ctrl reads ⌘. Save image names the buttons a tile
  has on that device: Download and Copy with a mouse, Share on touch (see "Tiles").
  Style settings names the way to every setting of a style: with a mouse the Style button
  and then More on its strip, which opens the tray; on touch the Style button alone, since
  its panel shows them all as chips there. It has no key, and its Keyboard cell is empty.
- A last row has a compact “Trailer” link styled as a button aligned left and a
  filled “Got it” button aligned right. Trailer uses the same pill button geometry
  as Got it, with the Lucide clapperboard icon to the left of its label
  and the external-link icon at the right edge, through `PixelIcon`. It uses the
  shared tooltip and accessible name
  “Watch trailer (opens in a new tab)”. It opens bundled `colorfetti-trailer.mp4`
  through the app's base URL in a separate tab (`noopener noreferrer`). The video
  is not fetched until the link is followed; Help remains open in the original tab.
  There is no privacy line or separate trailer block in the dialog.

Touch means a coarse main pointer, the same test the rest of the app uses. The steps give no
counts of styles or palettes, which change, and the help says where a style's settings are
but does not explain the threshold or any of them.

Got it, Close, Escape and a click or tap on the dimmed app close it. A click inside it
does not. While it is open nothing behind it reacts: presses, swipes, the wheel and the keys
all change nothing.

### Responsive behavior

| Width | Dock |
|---|---|
| Above 800px | Icon and text labels, dividers between groups. |
| 521 to 800px | Icon-only buttons, one row. |
| 520px and below | Tools on the first row, the view switch on a second row as wide as the tools. The dock is only as wide as its tools, centered, and is never stretched to fill the screen; it keeps at least 12px from each edge. The style panel is as wide as the screen less 12px on each side. The palettes panel stays as wide as its chips, centered and never wider than the screen less those margins, with the name on a row of its own above the chips. The style panel takes two rows, without dividers: the style button and the chips of the style's settings, then the control of the pressed chip (see "On a phone" under "Style panel"). Its list of styles is a compact grid matching the panel's full width, with as many styles to a row as fit at 60px or more each: three at 280px, four at 320px, five at 375px, and more on wider screens. The image count and the word "images" in the Add button are hidden. |

On coarse pointers every dock control is 40 to 44px square. The app uses
`viewport-fit=cover`, pads for the safe-area insets, and sizes itself with dynamic
viewport height so mobile browser bars do not cut the dock off.

### Adding images

- Drag files anywhere onto the window. While dragging, a full-screen "Drop to colorfetti"
  overlay shows, drawn in the two chosen colors.
- Dragged images from Discord or web pages can also supply an image URL instead of a
  file. Accept HTTP(S) URLs from HTML image sources, URI lists, Chromium download
  payloads or plain URL text. Prefer actual files when present, and import each URL
  only once. Prevent the browser's default navigation when accepting these drags.
  Copy the payload during drop, then fetch images directly from their host without
  credentials or a referrer, keeping the complete URL (including Discord signatures).
  The existing image decoder and conversion handle the downloaded file, including GIF
  animation. A fetching message covers the request; each request times out after 30
  seconds. Remove all cancels pending requests and prevents late images from appearing.
  Generic or missing response MIME types use a GIF87a/GIF89a signature to recognize
  GIFs even when the URL has no extension; image MIME parameters are normalized before
  decoding. Concurrent jobs retain separate identities even when their messages match,
  so the progress message always belongs to the newest job that is still running.
  Non-URL text is ignored. Dropped HTML is parsed only for image sources and is never
  inserted into the app.
  Recognize format names without case sensitivity (the browser API lowercases custom
  formats such as DownloadURL). URL batches report a combined count of download and
  decode failures after their final image, so slow requests cannot hide an earlier
  warning. Clearing the batch suppresses late error messages as well as late images.
- "Add images" opens the system picker (`accept="image/*"`, multiple). This is the only
  route on phones.
- Pasting an image from the clipboard also adds it.
- New images are appended; existing ones stay. The images of a batch are read one after
  another, and a photo appears as soon as it has been read, without waiting for the rest.
  Sprites are read far quicker than the wall can be fitted again around each one, so
  images read within a quarter of a second of each other go on the wall together.
- Remove all also stops any batch that is still being read. Its remaining images are not
  read and do not appear on the wall that was just emptied.
- Files the browser cannot decode are skipped, and a short message says how many.

### Empty state

A centered slogan ("Throw your pixels a palette party."), one line saying what the app is ("Recolor images and animations."; no
counts of styles or palettes, which change), and a
button labelled "Drop, paste or choose images" ("Choose images" on touch devices, where there is
nothing to drop), with a plus sign before the words. The text describes the app, not the steps. The dock stays visible.
The empty screen never scrolls sideways: its one column is no wider than the screen, so the
example is at most as wide as the screen less 16px a side however much height there is, and
on a screen narrower than the button's words they wrap onto a second line.

Above the heading sits the approved square Colorfetti logo (`src/assets/logo.png`),
with a tightly cropped transparent 60×60 static source image matching the app theme, labelled “Example”.
It goes through the same conversion as real
images, so the colors, Swap, palettes, style, every setting of the style, the view switch and
hold or Space all apply to it. It is for previewing only. It has no Copy, Download or Remove, is
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
- Escape: close the open panel. If the list of styles is open, close that first. Escape also closes the Share sheet, the More menu and the help. While one of those is open, Space, the arrow keys and Ctrl+C do nothing.
- Arrow keys: step through the styles and palettes (see "Quick switch").
- Ctrl+C (Cmd+C on a Mac): copy the first image on the wall (see "Copying"). While text is
  selected, or a number box has focus, the keys copy that text as usual. On the
  empty screen they do nothing.
- All controls are reachable by Tab with a visible focus ring.

### Tooltips

Every tooltip uses the shared action in `src/lib/tooltip.js`, including the dock, palette
chips, style list and dropdown, tile actions, full file names, top bar and help dialog.
There are no native `title` tooltips. Button tooltips explain the action rather than
repeating the button name alone. Palette chips prefix their color-pair descriptions with
the palette name and a colon. The style dropdown
explains that it chooses how images are converted into two colors; the Style dock button
opens the conversion controls, and Palette opens colors and transparency.

Mouse hover shows a tooltip after 350 ms, keyboard focus immediately, and a stationary
touch hold after 500 ms. Holding a button, link or color picker shows only its tooltip;
release and any delayed click do not activate it. Moving 8px cancels the hold and leaves
scrolling available. Short taps and clicks retain their usual actions. A held tooltip stays
readable after release until another press, scrolling, resizing, window blur or Escape.
Only one tooltip is visible at a time. It can be hovered itself, and Escape dismisses it
before its surrounding popup or dialog. Touch holds do not open native context menus.

Tooltips fit within the viewport and wrap long file names. Manual popovers keep them above
clipping containers and modal dialogs; a dialog's tooltip belongs to that dialog and is
removed or hidden when it closes. Descriptions are linked to focusable controls with
`aria-describedby`, including the inputs inside color-swatch labels. Dynamic descriptions
update when the style, transparency state or image count changes. Global dismissal and
pointer listeners are shared, so adding tiles does not add global listeners per button.

### Quick switch

The style and the palette can be changed without opening a panel: by the wheel or a swipe
over the top bar, the wall or the empty screen, and by the arrow keys from anywhere. The style is the
main one, on the up-and-down axis; the palette is on the sideways axis.

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

**Only the background steps.** The wheel and a swipe step only while the pointer or finger
is over the top bar, the wall (the tiles and the space around them) or the empty screen,
and not over one of the top bar's buttons. The buttons of the wall and the empty screen
count as background: a tile's Share, Copy, Download and Remove, and the empty screen's
button. Over the dock, a panel, a menu, a sheet or the help they never step, so a
move that just misses a row that scrolls, or lands on a panel with nothing to scroll,
changes nothing. A swipe is judged by where it starts.

**Nothing that scrolls is taken over.** Before acting, the app looks at what is under the
pointer or finger, and at everything that contains it:

- If any of it has more content than it shows, the wheel belongs to it and no step is
  taken. That covers the wall once it has too many images to fit and the empty screen on a
  very short window. The wheel never goes on to change the style when such an element
  reaches its end.
- A finger is judged on the axis it first moves along. Moving up or down over a wall that
  scrolls is the wall's own scroll; moving sideways there still steps the palettes, since
  the wall does not scroll that way.
- An arrow key keeps its own job in a number box, on a slider, and while focus is inside
  something that scrolls on that key's axis.
- Shift with the wheel is the usual way to scroll sideways, so it is judged on that axis
  alone: it steps the palettes over a wall that scrolls up and down. The help names Shift.
- Ctrl with the wheel steps the palettes anywhere over the background. Ctrl with the wheel never
  scrolls anything, so there is nothing to take over. It would zoom the page; the app stops
  that everywhere, also where it does not step. Ctrl with + and − still zooms.
- So with a wall that scrolls, the wheel changes the style over the top bar but not over
  the images; a sideways swipe, Shift or Ctrl with the wheel still change the palette
  there. The arrow keys change both from anywhere.
- While the Share sheet, the More menu or the help is open, no step is taken by wheel,
  swipe or key.

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
  fingers are left to the browser's pinch zoom.
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

Each image is analysed when added, then converted whenever the style, one of its settings
or a color changes. It is analysed again only when the style in use reads brightness or
opacity another way (see "Each style's settings").

Every pixel ends up in one of three states:

- **Empty**: alpha below 128, or below the style's Opacity cut where that has been changed
  (see "Each style's settings"). Stays fully transparent.
- **First color**: lines and dark pixels.
- **Second color**: fill and light pixels.

Output pixels are fully opaque or fully transparent. A color that is None is not drawn:
its pixels are left empty, on the wall and in every file (see "A color that is None"). The
conversion is the same; only the coloring differs. Brightness of a pixel is
`0.2126 R + 0.7152 G + 0.0722 B`, rounded, 0 to 255.

### Images larger than their tile

A photo has many more pixels than its tile has screen pixels to show them with, and
converting all of them on every change is what makes a phone stall. So a tile converts and
draws a smaller picture of the image, at its own size:

- The picture has one pixel for each screen pixel of the tile's image area: the area's
  width in CSS pixels (the tile's, less the 8px left clear on each side) times the device
  pixel ratio, along the image's longer side, and the other side in proportion. An image no
  larger than that, which includes every sprite, is converted whole, exactly as it is saved.
- Each pixel of the picture stands for the image pixel under its middle: pixel `i` of `m`
  across an image `n` pixels wide stands for image pixel `floor((i + 0.5) * n / m)`. The
  picture's pixels are so spread evenly over the image, at whatever spacing that comes to.
- The spacing is not rounded to a whole number of pixels, and where it happens to fall
  within 0.04 of one (the picture exactly a half, a third, a quarter of the image, or
  nearly), the picture is made 6% smaller. At a whole-number spacing every pixel of the
  picture would fall at the same place in each repeat of a fine regular texture, and an
  image that has one (art already dithered to black and white, one-pixel stripes, a
  stippled transparency) would come out all light or all dark. Off the whole number such an
  image is as light as it should be on average, with the bands that a shrunken texture has.
- The shorter side of the picture is never given fewer than 32 pixels, unless the image has
  fewer. A long thin image would otherwise be drawn in the wrong shape once its few rows
  were rounded.
- In Cutout, Solid, Icon, Stencil, Lines and Shape each pixel of the picture is exactly what the
  image pixel it stands for is in the full conversion, worked out from that pixel's real
  neighbours in the full image.
- Checker, Hatch, Bayer, Noise and Atkinson are instead drawn afresh on the picture's own
  pixels: the pattern's tile is counted in the picture's pixels, and Atkinson passes its
  error from one of them to the next. Their look comes from how neighbouring pixels
  alternate, and pixels picked out of a pattern do not alternate as the pattern does. Drawn
  afresh, the tile is as light and as dark as the saved file in every part, with a pattern
  as fine as the screen can show; the saved file's own pattern is finer still.
- The original is shown as the same picture, so comparing does not move anything.
- The picture follows the tile: when tiles resize, an image is converted again only if the
  size of its picture changed.
- Saving and copying always convert every pixel. The analysis on adding, which picks the
  Auto thresholds, also reads every pixel.
- The rule for the picture's size lives in `src/lib/layout.js` (`shown`) and is unit tested.
- An animation converts a frame when it is first shown, not all frames on every change.

### Drafts while a slider is dragged

This holds for every slider of the Style panel: the threshold's and those of the other
settings.

On a slow phone a photo's tile can still take a fifth of a second to convert, which is too
long to follow a finger on the slider. So while the slider is being dragged, an image that
is too slow is drawn as a rougher draft, and sharpened when the slider comes to rest or is
let go:

- Each tile times its conversions: milliseconds per pixel converted, for this image, in
  this style, on this device.
- During a drag the wall has 24 milliseconds for each move, shared equally between the
  tiles. A tile whose picture would take longer than its share draws a smaller picture
  instead: the largest that is expected to fit, which is the image scaled by
  `sqrt(share / (width * height * milliseconds per pixel))`.
- A draft is the same conversion as a smaller picture, so its tones and shapes are the
  final ones and only its detail is rougher.
- An image that converts within its share is never drafted, which covers photos on a fast
  computer.
- An image that is drawn whole is never drafted either, however slow. The screen is showing
  every one of its pixels, and a draft would drop some of them: for pixel art that is not
  rougher, it is wrong. So sprites are never drafted.
- A draft, like any tile, keeps at least 32 pixels on the image's shorter side.
- The drag begins with the slider's first move while a pointer is pressed on it. It ends
  when the slider reports its final value, the pointer is lifted or cancelled, the slider
  loses focus, or the Style panel closes (which takes the slider away mid-drag). The arrow keys and the
  number box set a value in single steps with no pointer pressed, and never draft. A drag
  also ends when its slider is taken away by a change of style, by the tray closing or by
  another chip being pressed.
- A drag pauses when the slider has rested for 150 milliseconds with the pointer still
  pressed: the images sharpen under the resting finger, and the next move makes it a drag
  again. If the finger moves on while an image is sharpening, that move waits for it.
- The rest is counted from when the wall has finished redrawing for the last move, not from
  the move itself. A device that needs longer than the rest to redraw would otherwise be
  taken for a resting finger at every move, and redraw at full detail each time.
- There is one timer for this at most. Every move and every end of a drag stops it first,
  so none is left running after a drag.
- Saving and copying are never drafts. They convert every pixel whatever is on screen, also
  in the middle of a drag.
- The rules for when it is a drag live in `src/lib/gesture.js` (`sliderDrag`) and are unit
  tested.

### Styles

| Style | Rule |
|---|---|
| **Cutout** (default) | A pixel brighter than the threshold is light, every other pixel dark. Then, using those tones: a pixel on the darker side of a change stronger than the seam strength, between two pixels of the same tone, takes the opposite tone; and a dark pixel that touches empty space, with no light pixel among its eight neighbours, becomes light. Dark is first color, light is second. |
| **Solid** | Brighter than the threshold: second color. Otherwise first color. |
| **Lines** | A pixel is first color if any of its four neighbours is empty, or if a neighbour differs from it by more than the threshold and this pixel is the darker of the two. Everything else is second color. |
| **Stencil** | Every non-empty pixel is second color, except the cuts, which are first color. A pixel on its sprite's outline is never a cut unless Outline is Trim, which makes all of them cuts. A pixel inside is a cut when it is as dark as its sprite's cut level or darker and also darker than the median of the sprite's inside, so brightness cuts alone remove fewer than half of the inside; or when Edges is on and it is on the darker side of a change stronger than the edge strength. A pixel inside that touches empty space at a corner is never a cut. On Auto the cut level is Otsu's split of the sprite's own pixels (see "Details of Stencil"); with Cuts set it is the sprite's outline level plus Cuts. |
| **Icon** | A connected filled body with coherent cavities, seams and selected openings on small transparent sprites; sparse grooves on larger/opaque art and Trim. Selected cuts are first color; the rest of the source support is second color. With first color None, this produces one ink plus transparency. See "Details of Icon". |
| **Checker** | Second color if the tone (see below) is above 0.25 on even `x + y` cells and above 0.75 on odd ones, so mid-tones become a checkerboard. |
| **Bayer** | Second color if the tone is above `(b + 0.5) / 16`, where `b` is the value of a 4×4 ordered-dither matrix at the pixel. |
| **Hatch** | Second color if the tone is above 0.75, 0.5 or 0.25 where `(x + y) mod 3` is 0, 1 or 2, so mid-tones become diagonal lines three pixels apart. |
| **Atkinson** | Error diffusion on `tone × 255`. Each pixel is cut at 127.5, and one eighth of the error goes to each of six neighbours (right, two right, the three below, two below). |
| **Noise** | Second color if the tone is above `(n + 0.5) / 256`, where `n` is the value at the pixel of a 16×16 blue-noise grid: each number from 0 to 255 once, placed by the void-and-cluster method so that it has no regular pattern. |
| **Shape** | Every non-empty pixel is first color. Internal ID: `silhouette`; saved settings and conversion behavior are unchanged. |

Details of Cutout:

- It fills bright parts, leaves dark parts dark and cuts parts apart, in the style of the
  game End of End. It draws no outline around a light part.
- A light pixel that touches empty space, diagonals included, is never cut, so seams do not
  eat into the silhouette.
- The difference between two pixels, the tie on equal brightness and the rule for the
  canvas edge are the ones Lines uses.
- The seam strength is automatic unless the Seams setting gives one. The threshold only moves the brightness cut.

Known limits of Cutout: a flat shading step, such as a shadow drawn in one darker color, is
cut like a part boundary; a dark part two pixels wide or less becomes all rim; art that is
already dithered becomes busy.

Details of Icon:

- The style menu and stepping order is Cutout, Solid, Lines, Stencil, Icon, Checker,
  Bayer, Hatch, Atkinson, Noise, Shape. Icon is fifth; Stencil is fourth.
- Icon reads original RGB and alpha, without quantizing or requiring grayscale. Every
  eight-connected source component is judged independently. See the algorithm and worked
  example in [docs/styles.md](../../styles.md), implemented in `src/lib/icon.js`.
- Components with at most 1,024 pixels in a box no larger than 64×64, on an image with
  transparency, select broad dark cavities, short seams between brighter pixels and dark
  continuations of silhouette notches. Brightness comes from the chosen source. Otsu and
  recursive dark splits identify candidates below the interior median; three-wide interior
  cores and isolated cuts are protected. Whole connected regions enter together.
- On this path Keep preserves the source edge. At Detail 50, Auto can extend a cavity or
  notch through the edge, along a row or column, but never opens from a seam. Paths are
  tried independently and together, rejecting joint conflicts without scan-order choices.
  An opening cannot increase four- or eight-connected ink pieces, cut a protected inner
  core or leave previously supported ink with fewer than two eight-neighbors. The inner
  selection is final before opening and identical in Keep and Auto; rollback leaves no
  dependent cuts. Source transparent gaps stay transparent.
- Larger/opaque art and Trim retain the previous near-black outline preparation and
  coherent chromatic/brightness grooves. Trim attempts a boundary peel. This path limits
  grooves to 25% of its prepared body; small-sprite cavities have no such area budget.
- Detail is 0–100%, default 50%. At Off the small-sprite path keeps the full silhouette;
  the previous method keeps its prepared body. Default includes the selected dark features;
  higher values can add weaker supported seams. More Detail never undoes a previous cut.
  An eight-connected source component remains connected and nonempty at every setting.
  100% admits every eligible detail level; it is not a requested percentage of removed
  fill. Unsupported features and protected parts remain filled even at maximum.
- Icon has no threshold or Auto detail button. Detail occupies the main desktop slider and
  number box; Outline (Auto/Keep/Trim), Brightness and Opacity cut are in the tray or phone
  chips. They are remembered independently. Reset restores 50%, Auto, Luma and 128.
- Preparation is lazy, cached per analysed image and outline choice. Moving Detail samples
  the cached full-source result, including on a smaller tile. Saving and copying use every
  original pixel. Brightness and alpha changes reanalyse the source and invalidate its cache.
- This is geometric abstraction, not semantic item recognition. Ambiguous shading can be
  mistaken for a groove or suppressed; some results remain generic. GIF frames are prepared
  separately and detail can flicker as the input changes.

Details of Stencil:

- It fills the whole sprite and cuts dark interior pixels. Brightness alone cannot tell
  identifying lines from shading. With the first color None the cuts are holes, which gives
  an icon in one color.
- A sprite is a group of non-empty pixels that touch, diagonals included. A pixel is on its
  outline when one of its four neighbours is empty; the canvas edge counts as empty by the
  rule Lines uses. The rest of its pixels are inside. Each sprite is judged on its own, so
  a sheet of differently colored icons converts as well as the same icons one file each.
- A sprite's outline level is the brightness of the darkest pixel on its outline. With
  Cuts set to a number, its cut level is that plus Cuts.
- On Auto, a sprite's cut level is the value Otsu's method picks on the histogram of the
  brightness of all its pixels, outline included: the lightest brightness of the darker of
  the two groups it splits them into. The outline is usually most of that group, so the
  group is the outline's colors and whatever is drawn in them. A sprite of one brightness
  has nothing to split, and its cut level is its outline level.
- Only an inside pixel darker than the median brightness of its sprite's inside pixels is
  cut for being dark, on Auto and with manual Cuts. Brightness cuts therefore remove fewer
  than half of the four-neighbour interior. Flat interiors stay whole. Increasing Cuts
  adds cuts or reaches this limit, without undoing previous cuts. Edges and Outline Trim
  are independent and may remove more; the median cap does not guarantee connectivity.
  Previously, reaching the median disabled all brightness cuts at once. The cap replaces
  that whole-sprite switch with a per-pixel condition, retaining earlier cuts.
- An image with no empty pixel is one sprite with no outline, all of it inside. Its outline
  level is its darkest brightness. Each frame of an animation is read from its own pixels,
  not from what the frames share.
- The edge strength is `255 − 2 × Edges`. The difference between two pixels and the tie on
  equal brightness are the ones Lines uses. Edges cuts whatever Cuts is, and is not held
  back by the median.
- While Auto is on, the Cuts box shows the least and the most that Auto comes to for the
  sprites of the images on the wall, each as its cut level less its outline level, between
  0 and 254. Sprites with nothing inside are left out.

Known limits of Stencil: its cuts are blocks where a hand-drawn icon has thin lines, since
it can only cut what the sprite already has; a sprite with no outline and no dark detail
is left as its shape; shading as dark as the outline is cut with it. Increasing Cuts cannot
recover features at or above the interior median unless Edges cuts them. Once all eligible
darker pixels are cut, the slider plateaus even though its range continues to 254. Auto's
Otsu selection is unchanged and does not identify meaningful item parts.

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
- Icon, Stencil and Shape have none.

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

### Each style's settings

Every style has settings of its own beyond the threshold. Each is kept for each style
separately, the threshold included: changing Hatch's threshold leaves Bayer's alone, and
coming back to a style finds it as it was left. Every default converts exactly as the
style did before it had settings.

| Setting | Styles | Values | Default | What it does |
|---|---|---|---|---|
| Threshold | all but Icon, Stencil and Shape | Auto, or 1 to 254 | Auto | See "Threshold". |
| Seams | Cutout | Auto, or 1 to 255 | Auto | The seam strength. Lower values cut along softer changes. No difference is above 255, so 255 cuts no seams. |
| Rim | Cutout | On, Off | On | Off leaves out the light rim on dark pixels at the silhouette. With Seams at 255 as well, Cutout is Solid. |
| Cuts | Stencil | Auto, or 0 to 254 | Auto | How much lighter than its sprite's outline an inside pixel may be and still be cut. At 0 only pixels as dark as the outline are. Auto picks for each sprite (see "Details of Stencil"). Raising it adds cuts or reaches the median protection limit without restoring cuts. Brightness cuts alone remove fewer than half the inside; Edges and Trim are independent. |
| Detail | Icon | Off, or 1 to 100% | 50% | Admit coherent negative-space features with connectivity guards; weaker supported seams enter above 50%. The previous large/opaque/Trim path retains its groove budget. |
| Outline | Icon | Auto, Keep, Trim | Auto | Open selected cavities/notches on small transparent sprites, keep the source edge, or use the previous boundary-peeling method. Larger/opaque Auto still infers a near-black stroke. |
| Outline | Stencil | Keep, Trim | Keep | Keep leaves the outline second color, so the shape is full size and thin parts survive. Trim makes it first color: in two colors that draws the sprite's own outline, and with the first color None it takes one pixel off all round. |
| Edges | Stencil | Off, or 1 to 100% | Off | Also cuts the darker side of a color change stronger than `255 − 2 × Edges` between pixels inside a sprite, which finds parts that no dark line separates. |
| Thickness | Lines | 1, 2, 3 | 1 | A solid pixel fewer than this many steps (left, right, up or down) from a line is a line too. |
| Fill darks | Lines | Off, or 1 to 254 | Off | A pixel this dark or darker is first color as well, so dark areas stay filled. Thickness does not widen them. |
| Shading | Checker, Hatch, Bayer, Noise, Atkinson | 0 to 100% | 100% | How far from the threshold a tone is still patterned. The tone becomes `0.5 + (tone − 0.5) / shading`, held between 0 and 1: at 50% a tone half way to the darkest or lightest is already solid. At 0 every tone is solid, which is Solid at the same threshold. |
| Scale | Checker, Hatch, Bayer, Noise | 1×, 2×, 3×, 4× | 1× | Each cell of the pattern is this many pixels wide and high. |
| Direction | Hatch | `/`, `\`, `—`, `\|` | `/` | Which way the lines run. `d` in Hatch's rule is `x + y`, `x − y`, `y` or `x`, each mod the spacing. |
| Spacing | Hatch | 3, 4, 5, 6 | 3 | How many pixels apart the lines are. With spacing `n` the cut-offs are `(n − d) / (n + 1)` for `d` from 0 to `n − 1`, which gives `n + 1` apparent tones. |
| Matrix | Bayer | 2, 4, 8 | 4 | The side of the ordered-dither matrix. The cut-offs are `(b + 0.5) / n²`, giving 5, 17 or 65 apparent tones. Each quarter of a matrix is the matrix of half its side times four, plus 0, 2, 3 and 1. |
| Diffusion | Atkinson | Atkinson, Floyd, Stucki | Atkinson | Where the error goes. Floyd is Floyd–Steinberg: 7/16 right, then 3/16, 5/16 and 1/16 below left, below and below right. Stucki spreads over twelve pixels in the two rows below, in parts of 42: 8 and 4 to the right; 2, 4, 8, 4, 2 below; 1, 2, 4, 2, 1 below that. Both hand on all of the error, where Atkinson drops a quarter. |
| Brightness | all but Lines and Shape | Luma, Value, R, G, B | Luma | What brightness is read from: the weighted mix given under "Conversion", the largest of red, green and blue, or one channel alone. The brightness range and the Auto values follow it. Differences between neighbouring pixels, which seams go by, are of the colors and do not change. |
| Opacity cut | all | 1 to 255 | 128 | Alpha below this is an empty pixel. Offered only while an image on the wall has a partly see-through pixel (see below). |

- **Opacity cut is offered only where it can do something.** It changes an image only if
  the image has a pixel that is partly see-through, with an alpha from 1 to 254; an image
  whose pixels are all clear or all solid (most pixel art, and every photo) is the same at
  every cut. So its row in the tray and its chip are shown only while an image on the wall
  has such a pixel, and on the empty screen only if the example has one, which the logo does
  not. Without it Shape has no settings at all: its strip has the style button and
  nothing else, with no More button, and on a phone its panel is one row, in which the style
  button is as wide as the panel and has its words back ("Style", the style's name, and the
  caret at the far end), since there are no chips to make room for. A value set while
  it showed stays stored and is not counted as a change while it is hidden: it lights
  neither a dot nor Reset, and comes back with the control when such an image is added.
  Whether an image has such a pixel is found in the pass over its pixels that the analysis
  already makes when it is added, at no cost that can be measured: ten runs each way on a
  12-megapixel image gave a median of 209 ms with it and 212 ms without.
- Brightness and Opacity cut change what the analysis finds, so every image is analysed
  again when they change, by the setting itself or by a change to a style that has other
  values for them. That reads every pixel of every image. It is done before the tiles
  redraw, so no tile converts an image as it was analysed before. An image with no partly
  see-through pixel is not analysed again for a change of Opacity cut, by the setting or
  by a change of style: only Brightness counts for it. While a slider is being dragged
  over a wall holding more than a million pixels in all, it waits until the slider rests
  or is let go, and the images follow then. Saving or copying in that moment does not wait:
  what is saved is analysed as the settings then are.
- In a picture smaller than its image (see "Images larger than their tile"), Scale
  shrinks with the picture: it is the setting times the picture's width over the image's,
  rounded, and at least 1. So the tile shows the pattern as coarse as the saved file has
  it, down to the finest the screen can show. A pattern finer than that looks the same
  on the tile at every scale, though the saved files differ.
- Thickness, Fill darks, Seams and Rim give each pixel of a smaller picture exactly what
  its image pixel is in the full conversion, as Lines and Cutout always do. For Thickness
  above 1 the lines are found for the whole image and grown when the picture has at least
  half the image's pixels; a smaller picture has each of its pixels ask the few within
  reach, which is then the cheaper way. Either way a tile of a large photo takes about
  three to five times as long to convert with Thickness above 1 as with 1.
- The style previews on the style button and in the list of styles use each style's own
  settings.
- Stencil has no threshold. Cuts takes its place: on a wide screen its slider is on the
  strip and the others are in the tray, and on a phone its chip is first.
- Stencil gives each pixel of a smaller picture exactly what its image pixel is in the
  full conversion. What it needs to know of each sprite is found once for an analysed
  image, the first time Stencil converts it (see [docs/performance.md](../../performance.md)).
- Settings are defined in `src/lib/settings.js`: `SETTINGS` describes each, and
  `STYLE_SETTINGS` lists each style's in the order they are shown.

## Remembered settings

The two colors, which of them is None, the style, every style's settings and a picked theme are saved in the browser on every change and
restored when the app opens. Nothing leaves the device.

- The colors are saved as they are, so a chosen palette, a swap and a custom color all come
  back. A palette is not saved by name; it shows as chosen because its colors match.
- Which color is None is saved as `none`: 0 for neither, 1 for the first, 2 for the second.
  Anything else stored there reads as 0.
- Each style's settings are saved under the style's name, the threshold among them, as a
  number or as Auto.
- The theme is saved as `light` or `dark` only while it was picked against the system
  setting; otherwise nothing is saved for it and the system setting is followed.
  A short script in `index.html` puts a saved theme in place before the page is first drawn,
  so the system's theme does not flash.
- The view switch, the open panel, whether the tray is open and the images are not saved.
- They are stored as one JSON value under the `localStorage` key `colorfetti`. On the way back
  each value is checked on its own: a color must be `#rrggbb`, the style one of the eleven,
  each setting of each style one of its options or a whole number in its range (see
  "Each style's settings"), and the theme `light` or `dark`. Anything else falls back to its default (Glow dark first,
  Cutout, and the defaults in that table), so a damaged or outdated value cannot break the
  app. What was stored before styles had settings held one threshold for all styles; it is
  not carried over, and every style starts at Auto.
- If the browser refuses storage, the app works as before and starts from the defaults.
- A visit that finds nothing stored is a first visit, and opens the welcome (see "Help and
  welcome"). No separate record of having seen it is kept.

## Animated GIFs

An animated GIF is imported with all its frames and plays on the wall straight away, looping,
at the speed stored in the file. Frames marked with almost no delay play at 100ms, as they do
in browsers.

- Every frame goes through the same conversion as a still image, and the whole animation uses
  one Auto threshold, one Auto seam strength and one brightness range, taken from all its frames together. Taking
  them frame by frame would make pixels flicker between the two colors as the animation
  plays. Stencil's outline levels are the exception: each frame's sprites are judged by
  their own.
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
- Download all saves `colorfetti.zip` containing one such PNG per image. Duplicate names get
  `-2`, `-3` and so on. With exactly one image on the wall there is no zip: the button reads
  "Download" and saves that one file, the same as the image's own Download.
- An animation saves as `<original name without extension>-1bit.gif`: every frame in the two
  chosen colors, empty pixels transparent and a None color's pixels with them, with the original frame delays and loop count.
  Download all puts GIFs and PNGs in the same zip.
- Saving always uses the converted version, whatever the wall is showing.
- Every download shows a toast naming its output file: an individual PNG or GIF, or
  `colorfetti.zip` and the image count for Download all. This includes small downloads and the
  fullscreen viewer; its toast is inside the open dialog.
- What is saved or copied is what was asked for: the images that were on the wall and the
  colors, style and settings that were set at the click or key press. A long job starts a
  moment later (see "Long jobs"), and a change made in that moment does not reach it.
- PNG files are encoded directly from the conversion, not through a canvas. Some browsers
  (Brave, Safari private browsing, Firefox strict mode) add noise when a page reads a
  canvas back, which would put stray colors in a saved file.
- A PNG lists its colors once, as a palette of three (empty, first color, second color, with
  the empty one transparent), and holds two bits for each pixel. A color that is None is
  transparent too. The picture then has one color, and all three palette entries hold it,
  so a program that blends the picture's edges has no other color to pull in. The picture is exactly the
  same as a file with four bytes per pixel would give, but there is a sixteenth of the data
  to compress, so a photo saves several times faster and into a smaller file. An image
  editor opens such a file as an indexed-color image.
- Download all converts and encodes one image at a time, so that only one image's full
  conversion is in memory at once.
- Files are offered through a temporary link with the `download` attribute, which works in
  current iOS Safari and Android Chrome.

## Copying

- A tile's Copy button (on touch screens, Copy in its Share sheet) puts that image on the
  clipboard as a PNG at its original pixel size, ready to paste into another program. Ctrl+C
  does the same for the first image.
- Like saving, copying always uses the converted version, whatever the wall is showing, and
  the PNG is encoded directly from the conversion, in the same form as a saved one.
- Browsers accept PNG on the clipboard but not GIF, so an animation is copied as its first
  frame, and the message says so.
- A short message confirms the copy ("name copied."), or says that it failed. It fails where
  the browser has no image clipboard or the page is refused the use of it.
- The copy is made with the asynchronous Clipboard API (`navigator.clipboard.write`), which
  works in current desktop browsers, iOS Safari and Android Chrome on a secure page. It is
  started directly in the click or key press, with nothing awaited first, because Safari
  refuses it otherwise. The clipboard is promised the image at that moment and given it
  when it has been made, which lets a long copy show its message first (see "Long jobs").

## Installing

Colorfetti can be installed as an app, and that is all: there is no service worker, the app
caches nothing itself, and it does not open offline. An installed copy loads from the site like a browser
tab does, so every deploy reaches it the same way.

- `public/manifest.webmanifest` sets Colorfetti, the approved description, standalone display and the dark splash background. Its relative start address supports the existing deployment path.
- `npm run icons` generates exports from `src/assets/logo.svg` using `build/brand-assets.mjs`. `node build/brand-assets.mjs --check` verifies exact output and maskable safe-area padding.
- The manifest declares separate ordinary and maskable PNGs at 192px and 512px, plus a separate transparent monochrome icon. Browser tabs use SVG, PNG and a multi-size ICO; Apple home-screen icons are provided at 152px, 167px and 180px. Installation icons use opaque off-white tiles and approved colors; general logos and favicons are transparent light/dark variants with no outer margin.
- `index.html` links the manifest and platform icons and updates the browser bar for the active theme. Description and Open Graph metadata use the approved copy and 512px icon. Absolute social URLs retain the actual GitHub Pages address.
- Chrome, Edge and other Chromium browsers, on desktop and Android, tell the page when the
  app can be installed and is not yet. The page keeps that offer and shows Install in the More
  menu; pressing it opens the browser's own install prompt. The offer works once, so the row
  then goes until the browser offers again. Since the page defers the browser's automatic
  install UI, Chromium may log that the banner was not shown after `preventDefault()`; this is
  expected, and the Install row calls `prompt()` from the user's click. Safari, Firefox and
  every browser on iOS make no such offer and never show the row; there the app is installed
  from the browser's own menu (on iOS, Share, then Add to Home Screen).

## Structure

Vite with the `svelte` template (Svelte 5, runes, mounted with `mount()`), JavaScript.

| File | Purpose |
|---|---|
| `src/lib/recolor.js` | Pure conversion, no DOM. `analyze(imageData)` returns size, pixels, brightness, each pixel's difference from the pixel to its right and from the one below, whether any pixel is empty, the darkest and lightest brightness, and the auto thresholds; it takes what brightness is read from and the opacity cut. What Stencil needs to know of each sprite is added to that the first time Stencil converts the image. `mask(analysis, style, settings, width, height)` returns one byte per pixel (0 empty, 1 first color, 2 second color), for the whole image or, given a smaller width and height, for a picture of it that size. `shrink(imageData, width, height)` returns the pixels of the original that such a picture stands on. `colorize(mask, first, second)` returns RGBA pixels. |
| `src/lib/gif.js` | Reading an animated GIF into full frames (`decodeGif`) and writing a two-color one (`encodeGif`). No DOM. |
| `src/lib/save.js` | Output file naming, zip, PNG encoding from a mask and the two colors (either may be None), single save, save all, copy to the clipboard. |
| `src/lib/settings.js` | Every setting a style can have and which each style has, their defaults, and `restore(text, styles)`, which reads what was stored back and checks each value. No DOM. |
| `src/lib/presets.js` | The list of palettes and the list of styles, whether two colors are a palette's, the two colors as they are drawn when one is None (`inks`), and stepping to the next or previous style or palette. No DOM. |
| `src/lib/gesture.js` | `wheelSteps()`, which turns the stream of wheel moves from a mouse or trackpad into single steps, and `sliderDrag()`, which says when a slider of the Style panel is being dragged and when it has come to rest. No DOM. |
| `src/App.svelte` | All state; top bar, wall, empty state, drop overlay, the Share sheet, messages; window-level drop, paste, key, wheel and swipe handling. |
| `src/Tile.svelte` | One image: canvas, caption, Copy, Download and Remove (Share and Remove on touch screens), hold to compare. Measures itself to pick the size of the picture it draws (see "Images larger than their tile"). |
| `src/Dock.svelte` | The dock and its two panels, with the tray and the chips of the style's settings. |
| `src/Pixels.svelte` | A canvas that shows a block of pixels; used by tiles and by the style previews. |
| `src/PixelIcon.svelte` | Renders a 7×7 glyph from a row-string map. |
| `src/app.css` | Every style rule, carried over from the prototype: color and type tokens for light and dark, and all component styles. Components have no style blocks of their own. |

State is a handful of `$state` values in `App.svelte`: the two colors, which of them is None, style, each style's
settings (a threshold of `null` means Auto), which version the wall shows, the open panel, and the list of images.
Each image holds an id, its name, its original pixels and its analysis. A tile derives its
mask from the image, style, the style's settings and the size of its picture, and repaints its canvas when the mask or either
color changes. That keeps a color drag cheap: the mask is reused and only the two-color
fill is redone. Masks and colored pixels are made for a frame when it is first shown and
kept until what they depend on changes.

Dependencies beyond Vite and Svelte:

- `omggif`, for reading and writing animated GIFs.
- `fflate`, for the zip. PNGs are already compressed, so entries are stored without
  compression.
- `vitest`, development only.

## Long jobs

Reading an image, saving and copying go through every pixel, and the page can do nothing
else meanwhile. For a photo on a phone that can be a second or more, so the page says what
it is doing:

- A job of 2 million pixels or more first shows a message under the top bar, where the
  other messages show, with a small square that turns: "Reading name…" ("Reading 2 of 5…"
  within a batch), "Downloading name-1bit.png…", "Downloading colorfetti.zip (5 images)…" for
  Download all, or "Copying name…". An animation counts all its frames, and Download all
  counts all the images together.
- Every download, including a smaller job, shows a toast naming its output file. A smaller
  job has no spinner. When the fullscreen viewer is open, it shows the same status in its
  own toast inside the dialog.
- The job starts 50 milliseconds after the message, so that the message is drawn first.
  That wait is a timer, not a screen frame, because a hidden tab has no frames and the job
  would wait for the tab to be shown.
- The square is turned by a CSS animation of its rotation alone, which the browser runs
  without the page's help. It keeps turning while the job has the page stuck.
- The message replaces any other message while a job runs. If jobs overlap it is that of
  the newest one still running, and it goes when the last has ended.
- The message of a copy stays until the PNG has been made, not only its conversion.
- A batch that is being read keeps its message from its first large image until it ends,
  changing the count as it goes. The message does not come and go between files.
- The square turns at an even speed, not in steps. Some browsers only run an even turn
  without the page's help.

## Errors and limits

- Undecodable files are skipped with a message; the rest of the batch still loads.
- Image URL drops require the source host to allow browser cross-origin requests and
  the URL to still be valid. A failed request or non-image response shows a short
  message suggesting copying/pasting the image or saving and adding its file. The
  rest of the batch still loads. There is no proxy or backend; conversion stays local.
- If saving or copying fails, a message says so. Nothing else is lost.
- Conversion runs on the main thread. A change costs about as many pixels as the screen
  shows, however large the images are (see "Images larger than their tile"), so it stays
  quick on a phone, and a drag of a slider is kept quick by drafts (see "Drafts
  while a slider is dragged"). What still reads every pixel of a photo, and so
  pauses the page for a moment on a slow phone, is adding it, saving or copying it, and
  changing Brightness or Opacity cut, which analyses it again. Adding, saving and copying
  show a message meanwhile (see "Long jobs"); the analysis after a change of setting or of
  style does not. Moving those to a worker is the upgrade path if that ever matters.
- A tile's picture is a sample of a larger image, not an average of it. An image with a
  fine regular texture shows bands when shown smaller, as it did when the browser shrank
  the whole conversion. The saved file has none.
- Reading an image uses a canvas of its full size for a moment, which is given back as
  soon as the pixels are read.
- The settings are applied as they change, not held back to one per screen frame. Browsers
  already report a slider's moves once per frame, and holding changes back was measured to
  add a frame or two of delay to every one of them.
- Zooming the page in with two fingers shows a large image's tile at the detail it was
  converted for, not more.
- Tiles scale images to fit, which is not always a whole-number multiple, so displayed
  pixels can be slightly uneven. Exports are exact.

## Testing

- `src/lib/recolor.js` is covered by unit tests on small hand-made pixel grids:
  - empty pixels stay empty in every style;
  - Solid splits at the threshold;
  - every setting at its default, given or left out, converts as before; each setting does
    what "Each style's settings" says, on grids small enough to write out; Lines and Cutout
    with settings give a smaller picture what the full conversion has; Scale shrinks with
    a smaller picture;
  - Checker, Hatch, Bayer, Noise and Atkinson pattern a middle color, keep an image's darkest color dark
    and its lightest light, leave an image of one color flat, and at Auto keep both shades
    of a two-shade outline dark;
  - Hatch draws a darker middle color as wide diagonal lines and a lighter one as thin lines;
  - Noise lights exactly half of its 16×16 grid for a middle color, and a lighter color
    lights those cells and more;
  - every worked example in `docs/styles.md` is exactly what the code draws, the examples
    of the settings included;
  - Floyd and Stucki are, pixel for pixel, a plain error diffusion written out from their
    weights; an animation analysed with another Brightness or Opacity cut still shares one
    set of Auto values;
  - Lines outlines an inner part as well as the silhouette, draws a one-pixel boundary,
    ignores a shading step below the threshold, frames only images that have empty
    pixels, and at Auto draws no lines along soft shading;
  - Cutout fills a bright part and leaves a dark one dark, cuts a one-pixel seam between
    two parts of the same tone, rims a dark part on the silhouette, keeps a dark outline
    around a light part, never cuts a light pixel on the silhouette, and rims only images
    that have empty pixels;
  - Shape fills everything;
  - a smaller picture has, in Cutout, Solid, Icon, Stencil, Lines and Shape, exactly the full
    conversion's value at the image pixel under the middle of each of its pixels, and
    shrinking the original gives the same pixels of it;
  - at every size the patterns and Atkinson come out as light as the full conversion, and
    keep empty pixels empty;
  - an image with a fine regular texture (dithered art, one-pixel stripes, a stippled
    transparency) comes out as light as it is at the sizes a tile could have;
  - Auto returns a value between two clearly separated groups.
- `src/lib/save.js`: output naming, including duplicates; a PNG holds the palette and
  exactly the given pixels, packed two bits each.
- `src/lib/image-drop.js`: protected hover payloads, file precedence, URL format
  fallbacks, signed queries, URI-list comments and duplicates, unsafe URLs, MIME types,
  filenames, failed responses and cancellation. Browser checks at desktop and phone
  widths cover inert HTML parsing and entity decoding, prevented navigation, GIF
  playback, cross-origin success/failure, continued imports after a failed URL,
  existing file drops and clipboard paste, overlay appearance and Remove all during
  a pending download. A public image from Discord's CDN was also imported successfully.
  On October 11, the user tested direct image drags from their Discord client into the
  live Codex browser preview and confirmed successful imports. The preview displayed
  eight imported images, stayed on Colorfetti and reported no browser console errors.
  The exact native payload formats were not recorded; Firefox and Safari were not
  directly tested.
- The October 11 adversarial sub-agent review reproduced four defects before agreeing
  on their fixes: lowercase DownloadURL hover detection, animation loss for generic or
  parameterized GIF MIME types, out-of-order progress messages, and skipped-image
  warnings expiring behind a later fetch. The corrected build passed 289 unit tests.
  `bench/image-drop/qa.html` preserves the browser regression checks: build with
  `npm run build`, run `node bench/image-drop/server.mjs` from the repository root, open
  its loopback URL and run all three buttons. These use synthetic drag payloads and
  controlled network/decoder waits against the actual production app, plus a real
  Discord CDN image download. They assert that every supported payload is accepted
  during hover, GIF frames advance, cancellation aborts a held request and rejects late
  pixels, failed downloads and corrupt images are counted together, and overlapping
  jobs show the correct progress. The timeout probe verifies the configured 30-second
  duration while accelerating the native timeout for the test. The narrow iframe
  checks phone-width layout only; it does not emulate touch or prove native cross-app
  dragging on a phone.
- `src/lib/settings.js`: stored settings come back unchanged; missing or damaged text gives
  the defaults; a single unusable value is replaced on its own.
- `src/lib/layout.js`: besides the wall's fit, the size of the picture a tile draws: the
  whole image when the tile has room, the tile's own size for a larger image, smaller for
  a draft that would otherwise run over its budget, never a draft for an image drawn whole,
  a little smaller where it would be a whole number of times smaller than the image, and
  never fewer than 32 pixels on the shorter side.
- `src/lib/presets.js`: styles and palettes step forward and back and wrap at both ends; a
  palette is found either way round; the user's own colors stay as a stop after the presets.
- `src/lib/tooltip.js`: hover/focus descriptions, viewport placement, normal taps and touch
  holds without activation, delayed clicks, cancellation, dynamic text, color-picker
  accessibility, modal lifecycle, single visible tooltip and shared listener cleanup.
- `src/lib/gesture.js`: one step per notch of a mouse wheel; a trackpad's small moves add
  up; a turn round or a silence starts again; never more than one step per pause; one
  step for a flick with its fading tail.
  For the slider: a drag only with a pointer pressed; a pause after a rest and a drag again
  at the next move; one timer at most, started again at every move and gone when the drag
  ends; the rest counted from the end of a redraw; no timer started if the drag ended
  during one.
- The interface is checked by hand in a desktop browser and at phone width: add by drop,
  picker and paste; remove one and all; change colors, palette, style and threshold; open
  the tray and change every setting of every style, and Reset; at phone width press every
  chip and use its control; see that a style comes back as it was left, and after a reload;
  compare by switch, hold and Space; with a large photo and the processor slowed down in the
  browser's developer tools, drag the threshold slider and see the image follow as a rougher
  draft, sharpen when the finger rests and again on release; add, save and copy a large
  photo and see the message with its turning square; save one and all; copy by button and by Ctrl+C, then
  paste into another program; at phone width, copy and save from a tile's Share sheet, and
  close it by Cancel and by a tap outside; and quick switch by wheel, Shift
  or Ctrl with wheel, arrow keys and swipes, on the empty screen, on a wall that fits and on one
  that scrolls, where the wheel and an up-or-down swipe over the images must scroll them
  and change nothing.
- Installing is checked by hand in Chrome, on the deployed site or on `npm run preview`:
  Install appears in the More menu, opens the browser's prompt, and is gone once the app is
  installed. Chrome can hold its offer back until the page has been used for a while.

## Not included

- Remembering the view switch or the images between visits.
- Export upscaling, or formats other than PNG.
- Per-image settings; the style, its settings and the colors apply to the whole wall.
- Settings shared between styles: each style keeps its own, so a threshold set in one is
  not carried to the next.
- Custom user palettes.
- Animation in formats other than GIF (animated WebP, APNG): only the first frame is used.
- Pausing or scrubbing an animation, and changing its speed.
- Working offline. That needs a service worker, which would cache the app and stand between
  a deploy and the people using it.
- Hosting and deployment.

## GlassKit design exploration (October 9, 2026, historical)

The isolated worktree branch `codex/glasskit-prototypes` adds experimental interfaces at
`?prototype=dock`, `?prototype=inspector`, and `?prototype=clear`. This is a proposal, not a
replacement of the approved default interface. `src/prototypes/` contains the visual
adapters and comparison controls. The default URL retains the existing layout.

All prototypes retain the real conversion, GIF playback, palette/transparency logic,
style settings, copy/save paths and gesture/tooltip behavior. A separate
`colorfetti-glass-prototypes` storage key prevents prototype settings from changing the
ordinary app's preferences. Built-in samples pass through the ordinary image-add path.

Prototype changes to geometry are deliberate: image gaps are 12px, image inset is 4px,
and touch caption footprint is 56px. These values must match both CSS and the parameters
passed to `fitGrid` and `shown`. Desktop inspector mode reserves horizontal space; other
modes reserve the measured complete bottom editing stack, including the style chooser.
Native dialogs remain modal; editing panels remain nonmodal. Workspaces have one
continuous line/dot grid, with an optional full checkerboard comparison and solid-control
fallback. The grid and glass surfaces are presentation only and are never exported.

Research, source audit, full UI replacement map and implementation recommendation are
in `docs/design/2026-10-09-*.md`. Safari/iOS material performance and composited contrast
on arbitrary user content remain hardware-validation requirements before adoption.

Short-window refinement: the prototype style chooser temporarily replaces its settings
strip below 650px height on narrow phones, and in short landscape windows. This preserves
space for the image and its metadata. Closing/choosing restores the strip. On coarse
pointer screens at most 360px wide, colors occupy their own dock row to keep 44px targets.
The prototype uses an actual reduced scroll viewport rather than bottom padding to keep
scrolling image content clear of its editing controls.

Prototype control refinement: each prototype uses one style-named comparison button,
with `aria-pressed` true for converted images. Clicking toggles the persistent original
view; the style name remains visible in both states. A filled indicator shows conversion
on; a hollow dashed indicator and subdued button show original. Its accessible
description and shared tooltip explain the current view and next action. Hold-to-compare
and Space retain their existing behavior. Floating islands group Palette with the color
pair and Style with this comparison button; only Download floats independently. All
three prototypes use these same semantic groups, stacking colors above conversion and
Download on phones. The approved default interface retains its two-part comparison.

The Designs comparison includes Old design (`?prototype=legacy`). Selecting it removes
prototype presentation classes and the grid adapter, uses the existing app CSS and
original Dock controls, and restores 16px image gaps, 8px inset and 48px touch captions.
The workspace remains mounted, preserving images, colors, style settings and comparison
state. Designs remains available to switch back; grid/material options are disabled
while viewing the old design. This comparison uses the prototype storage key and does
not change ordinary app preferences. Reloading its URL opens the same design mode.

Readability refinement: all new prototypes use one strongly tinted capsule for tile
actions and a compact tinted caption substrate (13px names, 12px metadata). Hover,
focus and press retain opaque ink and stronger backing. Fine-pointer caption allowance
is now 35px and touch allowance 62px, superseding the initial exploration's values.
The bottom control/popup materials are unchanged. Original design comparisons keep
the approved default tile CSS and geometry.

Canvas grid has Lines, Dots, Checkerboard and Off. Patterns use a 16-source-pixel cell
scaled by the median CSS/source image scale; Average image selects the arithmetic mean.
CanvasGrid observes the actual shared image box, including the empty example. Checker
repeat tiles span two cells. Extremely fine intervals are grouped in powers of two to
at least 8 CSS pixels, with the source spacing disclosed in Designs. This continuous
pattern is a representative guide and cannot align every independently fitted image.
Optional image backing is Canvas only (default), Quiet neutral or Local checkerboard.
Backings/grid are presentation only and never change image pixels or exports.

## Floating islands adoption (October 9, 2026)

The user approved Floating islands as the sole design. The ordinary URL loads it directly;
prototype parameters no longer select a design. The comparison picker, alternate dock/rail,
old-layout branches and built-in sample loader are removed. Historical research/screenshots
remain documentation. Normal `colorfetti` preferences and the first-visit welcome are retained.

The window is a continuous canvas with 12px tile gaps and 4px image insets. Colors and
Palette share one island; the style-named original/conversion toggle and Style share
another. Download is the only standalone bottom action. Captions and tile action groups
use stronger neutral material and opaque foreground; hover/focus strengthens backing.
Fine-pointer caption allowance is 35px and no-hover allowance is 62px. Persistent panels
and the style chooser reserve their measured full extent so artwork refits above them.

GlassKit foundation, original geometry and `src/glass.css` adapters load in that order.
Native dialogs, tooltip/gesture contracts, conversion and full-resolution export remain.

The sole background is a continuous full-window checkerboard, in neutral shades appropriate to each theme.
Each cell represents 16 source pixels at the median image display scale, updating as
images are added, removed or refitted. Dense photo intervals group powers-of-two multiples
to at least 8 CSS pixels. The checker repeat is two cells. Image surfaces are transparent
with no separate backing; grid settings and per-image backing are not implemented.
The checker is a representative visual guide, not a pixel-aligned measurement overlay
for every differently sized image. Backgrounds never change converted/exported pixels.

Reduced transparency and missing backdrop support use opaque materials in both themes.
Fallback token selectors match theme specificity; forced colors uses system colors.

Narrow no-hover tiles stack full-width caption and a centered Share/Remove capsule below
the art. The compact 62px fit selects stacking below192px; a second fit reserves95px
and retains the explicit stack flag even if tiles grow. Caption height27px + action
height52px + two8px gaps fits that allowance. Actions stay44px each; zero inter-action
gap yields a96px capsule at the minimum tile width. Larger touch tiles retain side-by-side
metadata/actions. The style chooser aims to leave191px for one96px art plus95px footer,
while tiny viewports may scroll. Shared inset/gap constants live in lib/workspace.js.

The checker uses subdued light grays #c5cbd1 / #d2d6da in light mode and the original
dark grays #272e35 / #323941 in dark mode. The canvas follows the theme alongside chrome.
A single transparent image ink can have less contrast against the corresponding theme;
users can compare the original or change the theme/palette. Arbitrary chosen inks can still match a checker shade; no recoloring
or background-based conversion/export adjustment is performed.

The checker paints once on the root. Body stays transparent, so safe-area padding does
not restart its phase at a second background origin.

Wordmark/count share a compact strong neutral label substrate. Empty explanatory text
has the same predictable substrate. Header actions retain strong backing; the original
comparison state uses opaque foreground plus its hollow/dashed indicator. Small popup
labels use the main foreground rather than low-contrast muted ink. This protects UI text
against the themed checker while keeping the image canvas unbacked.

Standalone header and Download actions use opaque neutral hover/focus fills and main
foreground; their selectors override generic glass/primary hover rules.

All glass UI shares one 94% surface tint: captions, actions, header, editing islands,
Download and popovers. Material roles alias the same readable token, rather than
assigning different RGB values or opacity by component. Light surface is #e8ecef and
ink #25282c; dark surface is #272c32 and ink #f0f2f4. Backdrop compositing can cause
small visible variations; stronger hover/selected fills communicate interaction state.

The inline startup script resolves an explicit saved theme or the current system theme
before stylesheet loading. Missing, malformed or unavailable storage follows the system,
so dark mode does not briefly paint a light checker before App mounts.

Startup also sets both browser theme-color metadata entries to the resolved theme,
including a saved theme opposite the OS preference. App keeps these synchronized later.

## GlassKit default-material comparison (October 9, 2026)

For the user's next visual test, this section supersedes the 94% surface tint and opaque
interaction fills above. The single live layout remains Floating islands with the themed
checker. It uses unmodified GlassKit1.22.2 glass material, border, blur, shadow and ink tokens.
Compact geometry, native dialogs, pixel glyphs and conversion behavior remain Colorfetti's.

Islands, captions/actions, brand and explanatory text use card surface-2 (white60% light,
10% dark) with24px blur. Header actions use pill surface-3 (70%/14%), hover surface-5
(85%/22%). Download uses the tertiary surface-2 and16px blur, hover surface-4 (75%/16%).
Panels use card material; menus and the tooltip adapter use popover surface-3. Dialogs
use the library's glow gradient (90% to50% light /32% to8% dark) and40px blur. Segmented
selection and Auto use surface-5. The library's native range-thumb fill and actual artwork
color swatches remain functional fills; no custom opaque UI substrate is applied normally.

Opaque reduced-transparency/no-blur and forced-color fallbacks remain conditional.
This is a comparison baseline, not a claim that default glass guarantees readable image
actions over arbitrary pale/dark artwork. The default library aura background and bulky
component spacing are not introduced into the existing canvas layout.

Reduced transparency and forced colors also remove modal-backdrop blur; the normal
GlassKit-style dim scrim is retained.

## Image-action contrast protection (October 9, 2026)

The user approved one local exception to default GlassKit materials: the shared tile
Copy/Download/Remove capsule uses the opaque theme surface (#e8ecef light / #272c32
dark), with full default foreground ink. Share/Remove uses the same material on touch
layouts, including when positioned beside or below the caption. The capsule and its
children have no backdrop blur. Individual buttons remain transparent at rest; library
hover/focus/active tints composite over the opaque parent, so artwork cannot change their
contrast. Existing focus outlines, tooltip behavior, hit areas and placement remain.

Captions, editing islands, header controls, popovers and dialogs retain their default
GlassKit materials. Image canvases have no backing. Forced colors retains system colors.
This section supersedes only the default-material comparison's tile-action treatment.

## Consistent editing material and file controls (October 9, 2026)

The user requested icon-only Palette/Style triggers, Import/Export, no visible image
count, and a theme-aware destructive action. The visible count and its CSS/formatting
are removed; item length still drives layout, export eligibility and single-file/ZIP
behavior. The conversion button retains its style name and Original comparison state.

The Palette name/transparency controls sit outside the swatch scroll viewport with a
transparent background. Editing islands, Palette/Style panels and their chooser popups
use one GlassKit card surface, border/shadow and24px blur. Swatch scroll hints use content
masks instead of a second glass layer. Selected/hover/input states remain distinguishable.
The panel refits the image wall as before.

Import and Export are44px icon buttons in a horizontal shared glass capsule at the top
right, Import first. Import opens the local picker; Export downloads one converted
PNG/GIF or all converted files as ZIP. It stays disabled when empty and its tooltip/
accessible name describes the action. Export is removed from the bottom editing islands.
The import glyph is a pixel folder/incoming arrow, export keeps the download-to-tray glyph.
The labeled empty-state picker remains an introduction for first-time visitors.

Remove all stays separate from the file capsule on wider screens. Its negative glass
uses GlassKit error surface/border/on-surface ink tokens, which differ by theme; no
fictional generic danger component is introduced. At520px and narrower it moves into
More to preserve44px targets and canvas space. Existing clear-all behavior is retained.
Phone editing islands occupy two centered rows; no export third row is introduced.
Reduced-transparency and forced-color materials retain their corresponding fallbacks.

The separate import/export layout comparison is exploratory documentation; the live
app still has one layout. Top-right pairing is an app-specific recommendation, not
an Apple-mandated placement. Bottom and vertical alternatives remain reviewable mockups.

The destructive text row inside More uses GlassKit error-dark/on-error as an opaque
readability exception, with the same material on hover/focus. Desktop icon-only trash
retains the negative glass tint. Forced colors still take precedence.


### Unified control geometry (October 9, 2026)

Header wordmark, grouped file actions, standalone header circles and bottom editing
islands use a consistent 56px outer height. Grouped buttons and color/swap controls
are 44px squares with circular borders/states; standalone header circles are 56px
squares. Both sizes exceed the 44px web touch target, with no hit-area overlap.
The view label is a 44px-high capsule inside its island. Panel content adapts to its
settings rather than forcing complex popups into the toolbar height. More opens below
the measured header. Existing image-action capsule sizing remains unchanged.


### Import and export emphasis

Empty state emphasizes Import in the header and the labeled Import images CTA.
With images loaded, header Export becomes primary while Import becomes neutral.
The action positions, dimensions and labels remain stable. Use GlassKit primary
colors/gradient with the library's documented dark on-primary ink for orange contrast.
Palette and Style remain neutral editing actions. Empty-state instructions are a
static GlassKit status notice between subtitle and CTA; desktop mentions drop/paste,
touch asks to import, and both say images stay on the device. The CTA and Help use
the same import glyph as the header, with no plus glyph for file import.


### Native GlassKit reset modal and toasts

Reset confirmation uses the library's native dialog overlay and separate modal
header/body/footer with Cancel then Reset actions. Cancel, Escape and clicking the
outside overlay leave settings unchanged. Content clicks do not dismiss it. Reset
closes the dialog before restoring defaults and announcing feedback; images stay.
Focus returns to the top More trigger. Dock outside/Escape handlers yield to open
native dialogs and already-handled keys, so underlying editing panels stay intact.

Transient selection, error and busy messages use the actual GlassKit toast host,
text element and is-visible state, with existing timers/busy priority and status
semantics. Its top position follows the measured header and safe area. The toast keeps
GlassKit's native surface as the lower background layer, covered by an opaque theme
surface using `background: linear-gradient(var(--surface),var(--surface)),linear-gradient(to bottom,var(--gl-surface-4) 0%,var(--gl-surface-2) 100%)`;
backdrop blur is disabled. This applies to both the app and fullscreen toasts so canvas
art never shows through. Legacy toast and confirmation paint/layout rules are removed.
Narrow-viewport fit and forced-color system-background overrides remain.


The empty-state example measures the available workspace, text and caption to fit
around instructions and the import action. It observes text/font and workspace
resizing and disconnects on unmount. Short landscape reduces explanatory spacing;
small viewports may still scroll naturally when the minimum example cannot fit.

The example fit updates when the async example arrives, including its actual caption.
Style-panel More and Help Close also use circular 44px icon controls.

### Modal contrast protection

The Reset dialog retains GlassKit's native modal anatomy, blur, gradient, divider and
unfilled footer actions. A local 96% theme-surface underlay prevents arbitrary image
colors from overwhelming this blocking dialog. Body and Cancel use full foreground;
Reset blends the library error-on-surface ink with foreground (60% error ink in light
mode, 40% in dark for additional hover contrast). This is an explicit
readability exception, not an unmodified default material. Instructions in the native
GlassKit status notice also use full foreground. Editing islands keep their default
materials. Toasts use the opaque theme-surface layer described above; reduced
transparency needs no extra toast override, and forced colors use system colors.

For short portrait viewports (up to 640px high), empty-state typography and notice
padding compact, and the example may shrink to 48px. The 56px import action keeps
its normal target size, and the example caption keeps enough width for its label. The empty workspace remains scrollable for larger system
text or exceptionally small windows.

## Numbered refinement tasks (October 9, 2026)

5. Toolbar buttons retain their position on hover, focus and press. GlassKit primary
   color/shadow feedback remains, but its one-pixel vertical motion is disabled in the toolbar.
10. Interface actions use one vendored Lucide outline family with 18px glyphs, including
    Import, Export, Copy, Remove, More and Help. The glyph source is static; no network
    request is made to render an icon. Lucide's license is kept with the assets. All UI
    headings, labels and controls use Schibsted Grotesk; the branded wordmark remains
    Pixelify Sans. Artwork and conversion previews remain pixel rendered.

### October 9 refinement tasks 10, 11, 13, 14 and 15: editing controls

10. Editing labels, inputs and buttons use the shared GlassKit/body font. Style names remain readable labels alongside previews; action glyphs continue through the shared icon component.
11. Advanced setting rows use compact 8px label/control gaps and 6px row gaps. Discrete choices such as Rim keep their natural width instead of stretching across the column; their targets remain at least 44px wide. The advanced tray uses one column below 800px to keep five-way Brightness choices comfortable. Reset retains a 44px height.
13. The style chooser now uses a transparent 24px faceted sprite with broad tonal regions, an inset cavity and an offset band, replacing the ball only in the UI. Every preview uses the real conversion algorithm and the style's remembered settings, including Brightness and Opacity cut. All eleven default outputs differ. The original ball and worked examples in docs/styles.md remain historical algorithm illustrations.
14. Palette buttons show an inset stepped two-color sample, keeping each ink visible and separated from the control border. The transparency switch shows actual selected inks and checkerboard for omitted regions. Bottom color swatches display a readable None label when transparent. Choosing a palette still preserves the active transparency setting; no conversion or palette values change.
15. Palette/style chooser buttons and transparency/discrete setting choices use native GlassKit button and segmented classes. This adapter changes only spacing, sample geometry and type hierarchy; editing islands and popup surfaces continue to use existing shared GlassKit theme tokens.


### October 9 follow-up: brand, onboarding and action language (tasks 2, 3, 4, 6, 10, 12)

- Task 2: The header uses the approved C-frame confetti mark with the Colorfetti wordmark. Below 600px the wordmark hides to preserve target sizes; the brand retains an accessible Colorfetti name. Help uses the same mark. The product brand stays distinct from interface action symbols.
- Tasks 3 and 4: Empty-state heading, subtitle and concise instructions occupy a separate responsive GlassKit card row inside the top header. The live example is the only content in the empty canvas. The top Import button expands to an icon plus "Import images" while empty; it becomes a circular icon button after import. There is no duplicate central import CTA. On narrow empty screens only, the disabled Export button hides to leave room for the expanded Import action. The measured header height feeds panel and canvas fitting and updates when fonts or viewport dimensions change. Short landscape displays put the heading beside supporting copy within the onboarding row; touch instructions describe import rather than unsupported paste/drop gestures.
- Task 6: The global "Remove all images" trash button is the very first toolbar control whenever images exist, including phones. Its destructive GlassKit theme tint remains distinct from Import/Export. The duplicate More-menu removal row stays hidden while this control is available.
- Task 10: Header, onboarding and Help use the shared body typeface; the static pixel mark is a deliberate brand motif. Buttons and Help use the shared icon component, including GitHub and import symbols.
- Task 12: Import means bringing images onto the canvas; Export means writing converted PNG/GIF files or a ZIP archive; Copy means writing a still PNG to the clipboard. The mobile internal sheet is named "Image actions", not a promise to open the OS share sheet. Help and import notices consistently say "Images stay on your device." Progress and error messages say "Exporting" / "could not be exported". Internal save function names are unchanged.

### October 9 follow-up: fullscreen integration (task 8)

Clicking an imported image or the live example opens the native image viewer. Long pressing continues to compare the original. The viewer resolves the current analyzed item by ID when conversion settings change, avoids copying source pixel data, and provides export/copy only for imported images. Closing restores keyboard focus to the opening image. A native modal suspends global wheel stepping as well as global keyboard shortcuts, allowing the viewer to handle scrolling and controls.

While the fullscreen viewer is open, export and copy progress/success/error messages are announced by one GlassKit toast inside the native dialog; the outer App toast is hidden to avoid duplicate status announcements and top-layer occlusion.

On phones no wider than 520px and no taller than 700px, opening an editing panel temporarily compacts empty-state onboarding to its heading; Import remains in the toolbar. The subtitle and instructions return when the panel closes. Actual header measurement releases this space to the live example, preventing its caption from sitting behind an editing panel.

The final header refinement also sets the wordmark in the same Schibsted Grotesk
family as the interface; the approved C-frame confetti mark carries the brand character.
Pixelify Sans is no longer loaded. The scoped canvas, header, dock and UI adapters
load after GlassKit and the established geometry/material adapters in every build.

### Canvas alignment, image inspection and scrolling (tasks 1, 7, 8, 9)

1. The continuous checker anchors a cell corner to the top-left source-pixel bounds of the first wall image, or the empty example. Object-fit letterboxing and the image inset are included. The origin follows canvas scrolling, header reflow, resizing and panel refits; its spacing retains the existing median 16-source-pixel rule and dense-photo grouping. Mixed independently fitted images still cannot all align to one representative grid. Canvas child insertion is observed independently of frame painting, so GIF animation does not move the origin.
7. Per-image removal uses the same trash glyph as clearing the wall. Modal dismissal keeps the X glyph. On touch, the former Share trigger is an Image actions menu with a More glyph, offering Copy and Export; it does not imply a native operating-system share action.
8. Activating an image by a quick stationary click/tap, Enter or Space opens a native modal viewer covering the application viewport. Original/converted comparison, Copy and Export remain available; the empty example cannot be exported or copied. The image fits its actual aspect ratio rather than a square, and conversion still follows displayed pixel dimensions. GIF playback remains active. The viewer uses native dialog focus isolation and Escape dismissal, returns focus to the originating image, and contains its own GlassKit toast for export/copy feedback. Holding an image for 150ms compares without opening; movement, cancellation or leaving the surface prevents opening. Comparison clears when its image loses focus. Browser fullscreen permission is unnecessary.
9. Canvas scrolling reaches the available bottom window edge, with trailing dock/panel space and a reduced sizing probe keeping resting images and the final scrolled row clear of editing islands. The empty example uses the same available-height contract; introducing header content does not reserve a second external bottom margin.

The supplied Brave still image shows an older prototype but cannot establish an animation/compositor fault. No speculative blur disabling, opaque dialog replacement or GIF pausing is introduced. Animated canvas writes do not change the measured grid origin. Actual Brave/iOS compositor flicker remains a hardware/browser reproduction requirement.

Review corrections: smooth Lucide outlines override the historical pixel-icon edge
snapping. Style Reset and the More menu's Reset use GlassKit semantic error ink;
style Reset borders use the matching error border token. The old hardcoded reset
palette is superseded, with system button colors in forced-color mode.

The empty example caption retains a 6px gap between its name and pixel dimensions
on touch screens, rather than inheriting the dense stacked-tile caption spacing.

Fullscreen feedback sits 8px below the viewer's measured header, including safe-area padding and phone toolbar wrapping. This keeps Copy/Export feedback from obscuring or intercepting the viewer's controls after responsive or font-size changes.


## October 9 correction pass: superseding numbered refinements

The following behavior supersedes earlier conflicting layout, palette and comparison notes.

- **3:** The explanatory empty-state card, heading and subtitle are removed. The expanded Import button reads “Import, drop or paste images” on a mouse/keyboard screen wider than 600px, and “Import images” on narrow or coarse-pointer screens. Loaded layouts use the icon alone. Help and tooltips retain context.
- **6:** Global Remove all sits immediately before the right-side Import/Export capsule. It opens the same native GlassKit Modal anatomy as Reset, titled “Remove all images?” with Cancel and Remove. Copy explains that original files remain on the device; Cancel/dismissal makes no changes. The entire batch cancellation remains deferred until confirmation.
- **7:** Actual canvas vertical overflow, not image count, enables opaque themed backgrounds for the bottom editing island, panel, chooser and tray shells. Their nested controls retain existing GlassKit backgrounds and states. The material returns to normal glass when the wall fits again.
- **8:** Fullscreen title/action shells use 56px height, 44px inner circular icons and the main header inset/gap. A compact comparison icon has dynamic accessible action text and pressed state. Controls remain in one row at phone widths with a truncated filename.
- **10:** Schibsted Grotesk is the single application UI typeface. Lucide is the single control icon family through the shared vendored component. The pixel brand and conversion thumbnails represent the product and image output, rather than control glyphs.
- **11:** Advanced controls fill the complete right column, aligned with the reset edge. The label column measures the longest currently visible setting plus its changed marker, with an 8px label/control gap.
- **13:** Style previews remain actual conversions of a representative sample sprite, labeled with their style names. They communicate output, not an arbitrary icon metaphor.
- **14:** Palette circles return to smooth diagonal two-color swatches, with one circular clipping edge and a separate theme selection ring. Transparency uses the original compact monochrome checker symbols; None dock colors use the original checker/slash representation without a text label.
- **16:** The checker aligns its origin and representative 16-source-pixel spacing after initial import, image collection changes or actual viewport resizing. It then stays viewport fixed during image scrolling, panel/chooser/tray fitting and their closures. Source reanalysis or color/style changes do not reanchor it. Stable full-window background takes precedence over continuously following refitted image coordinates.
- **17–18:** The empty preview is named Colorfetti and uses the same item analysis, Tile renderer, sizing probe and fitImageWall layout as imported images. It is shown only when no imported images exist and has no copy/export/remove actions. The top bar keeps only the accessible pixel logo.
- **19:** A quick stationary empty-canvas press opens the picker immediately in the click activation. The example activates Import too, including Enter. Dock/popup/dialog/control clicks, consumed dismissal presses, swipes, scrolling and long comparison holds never trigger it.
- **20:** Quick 150ms surface entrances and control feedback complement GlassKit hover/toast behavior. Header controls never translate; geometry, checker phase and blur are not animated. Surface entrance feedback uses opacity only. Reduced-motion preferences suppress app animations and transitions.
- **21:** Image holds and Space temporarily invert the persistent original/converted state. One shared effective state drives every tile and the bottom toggle label/pressed state; multiple holds and Space count as one temporary comparison. Release, cancel, blur, hiding or image removal clears transient sources. Enter activates the image or empty Import; Space over normal controls retains native behavior.
- **22:** Color input, swap, palette and transparency changes enable conversion, as style/settings edits do. This includes reselecting unchanged colors or presets through those controls. Temporary holds never restore an obsolete persistent preference.

### October 9 tasks 29–30: touch image actions

- **29:** A touch image has one standalone 44px circular Share button beside its caption; no surrounding capsule or inline Remove button. Its accessible name identifies the image; its tooltip states that it opens Save, Copy and Remove actions, rather than promising an OS destination chooser. Desktop retains the opaque shared action capsule with Copy, Save and Remove.
- **30:** The image action sheet orders Save (GlassKit primary tokens), Copy, Remove (GlassKit error tokens), then a separated Cancel. Each action captures the selected image before closing. Removing filters only that image and restores focus to another Share button or the Add images control after DOM update; native dismissal/Cancel restores the surviving invoking control. Original source files are untouched.

### October 9 tasks 23–24: transparency geometry and circular style previews

- **23:** The palette transparency switch uses explicit border-box geometry: 28px total height with 24px-high, 28px-wide segments and 18px symbols on mouse screens; 52px total with 48px-square segments and 32px symbols on coarse pointers. Its 2px padding and 2px gaps are included, not added to an inherited item height. The palette-name section uses a 3px title gap and 4px vertical padding so the title and switch cannot be clipped by a one-row swatch popup. Existing GlassKit segmented selection/material tokens remain unchanged.
- **24:** Style previews use the same circular clipping shape as palette swatches: 44px chooser thumbnails on desktop, 36px on compact screens, and 32px in the current-style picker. The shared input is now a simple 32px tonal disk with one dark circular inset, a broad lower seam and a thin dark rim. All eleven previews still run through the actual converters with remembered settings and selected inks/transparency; default outputs are distinct. Names and explanatory tooltips remain because similar small dither patterns cannot communicate their exact algorithms unaided. Conversion loops and imported artwork are unchanged.

Research rationale: Apple’s Icons guidance favors simplified recognizable shapes and consistent detail; GlassKit’s CSS segmented component supplies materials/states and permits application-specific sizing. Circular framing is a presentation adapter, not a fictional decorative output. Sources: https://developer.apple.com/design/human-interface-guidelines/icons and https://glasskit.jungherz.com/docs.html.

## October 9 tasks25–28 and31: bottom workspace

25. The top bar and brand are removed. Editing groups sit bottom left, file actions and More bottom right. Palette, Style, the Remove/Add/Save capsule and More are four independently measured layout items. They pack from the bottom/right in semantic order, moving overflow to rows above without a fixed wrapping breakpoint. Palette and Style align left within each row; file actions and More align right. Whole groups keep their target sizes intact. Editing panels anchor above the complete workspace, and its measured rows reserve canvas space. A single measured workspace reserves all wrapped rows and open editing panels, leaving the canvas the full remaining window.
26. Remove all shares the Add/Save capsule, separated by semantic danger feedback and the existing confirmation.
27. Fullscreen art occupies the entire viewport, aspect-preserving contain with zero image inset. Header actions overlay the image in protected theme surfaces. No caption or toolbar height is subtracted from art fitting.
28. More, Help, image actions and confirmation modal content are opaque theme surfaces. Native dialog backdrop, geometry, semantics and focus handling remain.
31. User-facing input is Add images; output is Save image or Save all images. Help, tooltips and progress use the same wording. Tooltips state original-size output and ZIP for batches. Save does not create a persistent project. Import/export identifiers inside encoding modules remain technical names.


## October 10 workspace/mobile correction

1. Workspace packing prioritizes one row, then Palette above Style/file actions/More. Before allocating a third row, it tries Palette with More on the upper row and Style with the file capsule below. Editing stays left aligned; app/file actions stay right aligned. More's dialog anchors above its actual row, including safe areas. Hidden file actions consume no width or gaps.
2. Add is always icon-only. Add remains visible while empty. The example art button and stationary background taps also activate Add, with drop/paste and accessible keyboard activation retained. After adding images, Remove and Save join the Add capsule.
3. Mobile image actions use the shared vertical More icon inside the full-width title caption, with a44px target. It opens the existing Save/Copy/Remove sheet and has an image-specific accessible name. Compact captions no longer reserve a separate action row.
4. Remove-all and Reset confirmations use GlassKit error-surface and error-on-surface tokens for their destructive action, with system-color fallbacks.
5. Pointer comparison starts after450ms. Stationary taps below that threshold activate Add when empty or fullscreen when loaded. Pointer movement, cancellation and multitouch still suppress activation. Touch pointerleave after a completed release preserves the pending click, while leaving during an active press cancels it. Space comparison remains immediate.


The empty example caption has a right-aligned44px primary Add button using the shared import glyph, matching the mobile title-bar More target. Its left label reads “Add images” for touch/coarse pointers and “Add, drop or paste images” for mouse/keyboard. Example pixel dimensions are replaced by these instructions. The full-width52px caption reserves the62px footer allowance on desktop too. Imported image captions and actions remain unchanged.


Example-caption clarification: the entire caption is one primary Add button, with no nested action. Colorfetti and resolution are stacked at left; device-specific Add instructions are right aligned before a decorative import glyph. Touch caption height remains52px, matching imported image title bars; desktop uses44px for the two-line metadata and accessible target. Instructions read “Add images” for touch/coarse pointers and “Add, drop or paste images” for mouse devices. This supersedes the separate44px caption icon action.


The example primary-caption button explicitly keeps a nonwrapping horizontal row in portrait and landscape; only its left metadata stacks vertically. This overrides the legacy mobile caption-column rule. Labels and the import glyph stay inside the existing title-bar bounds.


Empty-state file-toolbar preference: hide the bottom Add button and its entire file capsule while no images are imported. Keep More and editing islands visible. The primary example caption and canvas activate Add; after import the Remove/Add/Save capsule appears. Hidden capsule width is zero and consumes no packing gap. Focus after removing the final image returns to the visible primary example Add action.


Fullscreen bottom-workspace refinement: remove filename/title header and its measurements. Image art fits the full viewport with zero inset and preserved aspect ratio; letterboxing is unavoidable for mismatched aspect ratios. A solid theme action capsule sits bottom left; solid More sits bottom right and opens Close full screen. Controls respect safe areas and wrap when needed. The local conversion preference starts opposite the main canvas, has matching selected/unselected feedback, and changes only the fullscreen image; closing never updates global conversion state. Holds temporarily invert this local preference. Feedback toast is solid and stays away from the bottom controls.


Fullscreen conversion presentation: retain the original circular swap-icon button rather than a style-name label. It has selected/unselected backgrounds and aria-pressed for the local converted state, with dynamic accessible action text. Local opposite initialization and global-state isolation remain unchanged.


Fullscreen dismissal clarification: the bottom-right control is the original direct Close icon button. Remove the fullscreen More dropdown and its menu state/dismissal handlers. Native Escape and Close both dismiss the viewer, restoring focus to the originating image. Bottom placement, solid material and isolated conversion state remain.


Fullscreen checker uses dialog-local spacing from the displayed fullscreen source scale, through the same canvasGridSpacing helper and16-source-pixel/dense-photo grouping policy as the main canvas. It anchors to the centered fullscreen image top-left and recomputes with viewer dimensions. The dialog overrides its own --canvas-grid-step only; it never writes the main root grid variables. Closing restores the unchanged main grid.


Fullscreen focus restoration follows its opening modality: keyboard-opened image previews return focus to the originating image without scrolling. Pointer-opened previews clear the native restored image focus on dismissal, avoiding an unwanted large image outline when Escape closes a click/tap preview. Keyboard navigation retains visible focus normally.


Image preview actions (October 10): the user-facing name of the enlarged, edge-to-edge image dialog is Preview, including accessible labels and tooltips. Desktop image actions order Preview, Copy, Save, Remove; Preview uses the shared expand icon and the same viewer activation as clicking the artwork. Remove uses GlassKit error tokens in both themes, including interactive states. Mobile image actions order Preview, Save (primary), Copy, Remove (negative), Cancel. Preview closes the action sheet before opening the image dialog and preserves the originating More control for modality-aware focus restoration. The example retains Add behavior and has no image action menu.

Desktop image actions have a decorative theme-token divider immediately before Remove, including the compact two-row capsule. The separator occupies the existing gap and does not change button target sizes or capsule width. Mobile image actions remain in their sheet.


Image action order and caption activation: desktop actions order Save, Copy, Preview, divider, Remove; mobile sheet orders Save (primary), Copy, Preview, Remove (negative), Cancel. Preview's bottom capsule orders Save, Copy, Convert. The desktop divider adds 2px of vertical spacing at each end, without increasing capsule width. Imported image caption metadata is a native Preview button on both input modes. Touch reserves a 64px-wide More area: the original 44px circular control remains visually unchanged, but its hit area extends 20px left and 4px vertically, with no overlapping Preview target. Example captions continue to add images.


Desktop divider correction: restore the original vertical extent; spacing belongs horizontally between Preview and Remove. A 6px additional gap puts the theme-token separator between those targets without changing button sizes. Compact capsules retain two-row packing.


Settings scroll fades: gradient masks clear the first 8px and fade chips through 28px beneath each arrow without reserving layout width. The glass panel remains continuous instead of acquiring opaque edge patches. Indicators appear only on overflowing sides and do not intercept input; forced colors keep native system-colored arrows.


Help audit: use the canonical C-frame confetti logo asset. Add wording is Choose, drop or paste images on mouse devices. Separate Preview, Close Preview, Save, Copy, Remove, conversion toggling and temporary comparison guidance for each input mode. Hold replaces Press for comparison. Ctrl/Cmd+C copies the first image; Save has no dedicated shortcut. Document gesture, field and dialog guards accurately, including the held-Ctrl wheel exception for palette changes over a scrolling canvas. Help table columns reserve readable action space, with a 640px desktop maximum and the existing 420px touch maximum; narrow/short dialogs scroll vertically without horizontal overflow.


Preview dismissal and Space comparison: a quick stationary primary-pointer click/tap anywhere outside the bottom workspace closes Preview, including image pixels and letterboxed canvas. Long image comparisons, moved/dragged sequences, cancellation and secondary pointers do not dismiss. Bottom controls and their capsule remain exempt. Space is reserved for temporary comparison throughout Preview, including when its toolbar has focus; key release restores the local state and never activates a toolbar button. Enter retains ordinary button activation. Preview initially focuses its dialog, and blur/visibility loss clears transient state. Global conversion preferences remain unchanged.


Concise Help correction: use the canonical static logo.svg. Remove Close Preview, Toggle conversion and Compare temporarily rows, plus all appended explanatory paragraphs. Keep concise Add, palette/style navigation, Style settings, Save, Copy, Preview and Remove controls; Preview follows Copy on both input modes. Restore short shortcut cells rather than prose instructions and the original 420px dialog maximum. Retain responsive wrapping to prevent overflow. This supersedes the expanded Help audit presentation; actual interactions are unchanged.


Help wording refinement: Add replaces Add images within Help. Palette instructions read “Pick palette, 1-bit colors or import your own.” Save instructions read “Download or copy images.” Combine Save and Copy into one control row with both icons and the existing Ctrl/Cmd+C shortcut. Preview image follows it and shows only Click/Tap Image, with Enter on desktop. Other Help controls remain unchanged.


Preview conversion correction: snapshot the currently visible app original/converted state before clearing main-canvas temporary comparison on opening. Initialize Preview from that snapshot, rather than its opposite. The local swap icon is highlighted and aria-pressed only while the original is visible. Clicking toggles the local preference; holding image or Space temporarily inverts it until release, with overlapping holds inverting once. No Preview interaction updates global conversion state; reopening snapshots the app again. This supersedes opposite initialization and converted-state highlighting.


Help row order refinement: Preview image precedes Save or copy image on both input modes. Desktop Controls and Mouse columns use 40% and 34%, leaving spare keyboard space for the combined Save/Copy label. Modal width and touch column sizing remain unchanged.


Preview highlight refinement: selected/aria-pressed means converted, matching the main conversion control. Initial visible state still snapshots the main canvas, and all Preview preferences remain local. Capture Space keydown/up at window scope while the viewer dialog is open, so pointer-button blur to the page does not disable temporary comparison. Remove both listeners on viewer teardown. Image/Space holds invert the local preference until release and never change global state. This supersedes original-state highlighting.


Desktop Help column correction: Controls uses 37% and Mouse 31%, leaving room for the complete Keyboard heading and shortcuts. Verify Save or copy image and Keyboard remain single-line at the unchanged 420px desktop modal width. Touch columns remain unchanged.


Touch hover correction: the PostCSS hover-capability adapter gates actual :hover selectors in app and imported GlassKit CSS behind the primary-input (hover: hover) capability. Mixed selectors retain focus-visible/active/non-hover alternatives with unchanged pseudo-class specificity and cascade order. Palette/style selection, segmented toggles, Auto, conversion and aria-expanded panel highlights remain state-driven on every device. Touch buttons retain temporary inset press feedback that ends on release. Desktop hover and keyboard focus remain available. This covers no-hover touch devices; mixed-input devices whose primary input can hover retain native hover behavior.

Mobile theme correction: the resolved app theme declares `color-scheme: only light` or `only dark`, including the pre-paint color-scheme metadata. Browser automatic darkening must not recolor the selected theme, its checkerboard, palette swatches or rendered artwork. Startup and live theme changes keep metadata and the root scheme synchronized while retaining the existing saved-choice/system-following rules. This does not opt out of forced-colors accessibility mode; its existing system-color adapters remain active.

Roomy bottom-workspace alignment: center Palette and Style together horizontally on the complete workspace only when all visible groups fit one row and the centered pair leaves at least 24px (or the layout gap, if larger) before the right-aligned file actions and More. Use measured group widths rather than a device breakpoint, including style-label changes, zoom and the hidden empty-state file capsule. If centering would crowd the right actions, keep editing groups left aligned with the existing one-row/two-row packing priorities. Button sizes, panel anchors, canvas reservations and right-action alignment remain unchanged.

Centered editing popups: when the measured Palette/Style pair is centered, its Palette panel, Style settings panel (including advanced settings), and Style thumbnail chooser share that horizontal midpoint. The chooser retains the settings panel's width and border alignment. When the editing pair falls back left, restore all existing left anchors immediately, including during resizing with a popup open. Popup sizing, safe-area constraints and canvas height reservations are unchanged.

### Known issue: Style chooser backdrop blur

The Style thumbnail chooser can look more translucent than the settings panel and bottom islands because the checkerboard remains sharp behind it. Live inspection confirmed that the chooser, settings panel and editing islands share the same GlassKit material (`--gl-surface-2`, `rgba(255,255,255,0.10)` in dark mode) and `blur(24px)`; this is not a separate color or opacity setting. In `src/Dock.svelte`, `.menu.glass-card` is nested inside `.panel.style-panel.glass-card`. The parent's backdrop filter establishes a backdrop root, restricting the child's blur from sampling the canvas behind that parent. See [MDN: backdrop roots](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter#backdrop_root).

Possible solution (not implemented): move the chooser outside the filtered settings panel, making both surfaces siblings under the unfiltered dock. Preserve the chooser's width, border alignment, gap, conditional centered/left anchoring, canvas reservations and dismissal behavior. Keep the same GlassKit material and blur rather than masking the issue with a more opaque color. Verify checkerboard blur in light/dark themes at desktop and touch widths, resizing with both surfaces open, and the existing opaque-surface fallback when the canvas is scrollable.

### October 10: responsive Style selector and control row

The Style popup keeps the slider and number/Auto control together on one row. Roomy screens keep the selector, primary control and vertical More settings button in explicit grid columns, with additional settings in the existing tray. Stencil retains Cuts and Icon retains Detail in the primary position. Shape's opacity setting remains available only for partially transparent artwork. A selector standing alone fills the panel and shows its complete name, preview and caret.

Compact screens (at most 520px wide, or at most 520px high in landscape) show all settings immediately as horizontally scrolling chips, including the primary setting and Reset. There is no More button or tray. The selector and chips share the first row, and the selected setting's control fills the second row. Short landscape screens wider than 520px place the selector, chips and selected control in one row. This restores the phone behavior specified above and supersedes the earlier October 10 change that put compact chips behind More. Choosing a style, manual/Auto inputs, remembered per-style values, Reset, chooser alignment, outside/Escape dismissal and measured canvas reservations retain their behavior.

Actual Android Brave rotation reproduced the original failure in the historical build: returning from landscape to portrait delivered a resize event with `innerWidth=642` and `innerHeight=1175` while the CSS viewport was already 448×819. The window bindings retained those transitional dimensions after the viewport settled, selecting desktop markup inside phone CSS. Ten captured portrait states consequently showed More instead of chips. Compact mode now initializes from and subscribes to the CSS media query itself, so portrait/landscape transitions that remain compact cannot switch to desktop markup. A ResizeObserver on the actual chip row keeps the selected chip and overflow indicators current when its width changes, without relying on those window dimensions.

Regression coverage: build with `npm run build`, then run `node bench/style-panel-qa.mjs`. The production-browser harness checks all eleven styles at 27 portrait/landscape resolutions (280–2560px wide) in mouse and touch modes, full-width labels for a selector standing alone, Auto ranges across multiple images, all compact setting controls, live panel/chooser resizing, Reset, persistence and dismissal. `node bench/style-panel-qa.mjs flows` runs the focused interaction checks. For actual Android rotation, forward the browser debug socket with `adb forward tcp:9567 localabstract:chrome_devtools_remote`, then run `node bench/style-rotation-qa.mjs dist lan=<computer-LAN-IP>`. It serves the production build over LAN, performs real OS portrait and both landscape rotations with the panel open, closed and with the chooser open, checks selected-setting persistence and Reset, then rotates every style with opaque and partially transparent images loaded. It restores the prior rotation mode and closes its own test tab. Passing `baseline=1` with a historical build records the original mismatch without expecting fixed behavior.

Orientation fix verification: all 594 style layouts (27 resolutions × two input modes × eleven styles) passed without wrapping or horizontal control overflow. Actual Android Brave testing over LAN passed 60 captured states, including portrait and both landscape directions, with zero compact-mode mismatches or unexpected More buttons. The final production build and all 271 tracked unit tests passed. The earlier local count of 279 included an ignored historical-build copy of eight tests. Headless resolution checks use a fresh page per viewport to avoid intermittent compositor stalls when changing mobile emulation repeatedly; live breakpoint transitions remain covered separately by native pointer flows and actual phone rotation.

Deployment follow-up: commit `047911b` removed the always-visible compact branch; `b920cee` restored it, but its Pages deployment (run 38053932945) failed before building because the exhaustive workspace-control test exceeded 5000ms. Codex Desktop reproduced the old More-without-chips layout on the deployed site. Keep the same six packing configurations and every half-pixel width from 320 through 2560, replacing only hot-loop matcher allocations with equivalent strict assertions. Do not weaken coverage or increase the global timeout. A pushed fix is not deployed until the Pages workflow succeeds and the live asset revision is verified.

Follow-up verification: the production harness again passed 594 layouts and focused interaction flows. `node bench/style-panel-qa.mjs pixel8` checks the previously captured Pixel 8 Pro Brave content viewports (448×819 and 947×364 CSS pixels), full-display approximations (448×997 and 997×448), and DPR 2.25. It checks 44 style layouts plus five live portrait/landscape transitions at 0°, 90° and 270°, preserving the selected setting. Every selected compact chip must expose exactly one matching control. Codex Desktop separately passed all eleven styles at 30 sizes from 280 through 2560 CSS pixels, each setting at the Pixel portrait viewport, and live width/height breakpoint transitions. Its viewport tool cannot override density or drag the native window; those results must not be described as physical-device testing or native dragging. No physical device was used for this follow-up, at the user's request. Independent adversarial review found no remaining demonstrated runtime defect.

Responsive Save label: the bottom Save icon expands into an icon-and-Save pill only when its measured text width fits while keeping the editing pair centered and at least 24px clear of the right actions. Evaluate against the recovered icon-only capsule width on every measure, avoiding label-dependent resize oscillation. Otherwise retain the circular icon-only button, existing wrapping and empty-state hiding. Observe label width for font changes. Button height, primary token, accessible Save image/Save all images names, save behavior and Help's Save naming remain consistent.

Bottom file actions appear in Save, Add, Remove order on every screen size. Their DOM and keyboard focus order match their visual order.

Desktop image Save uses the same GlassKit primary gradient and on-primary icon color as Save in the mobile image action sheet. Hover, keyboard focus and press retain the primary treatment without moving the button; forced colors use system Highlight/HighlightText. The action order, capsule geometry and save behavior remain unchanged.

## October 11: full palette family and minimalist chooser

This adoption supersedes the historical two-color-only palette scope, the old multi-row
palette-chip presentation, and the statement that no named palettes are stored. Existing
1-bit conversion algorithms, twelve color pairs, Swap/None roles, styles and settings
remain independent. Glow/Cutout remains the initial 1-bit configuration; fresh visits now use the October 12 Palette default below.

### Conversion families

- **1-bit:** the existing eleven structural/pattern styles and selected color pair. The
  engine and per-style settings remain unchanged. The rail and stepping order group
  classics/decorative pairs (Glow, Mono, Paper, Torch, Rose), handheld screens
  (Game Boy, Pocket, Nokia, Playdate), then monitors (Phosphor, Amber, Commodore).
  Vertical dividers separate these three groups.
- **Palette:** an allowed set of 1–256 distinct opaque sRGB8 colors, normalized to lowercase
  six-digit hex. Every visible source RGB first checks exact palette membership, then
  chooses the nearest entry in Oklab (default) or encoded RGB, as selected in Matching.
  Equal distances retain the earliest entry. Every
  opaque output belongs to the selected set; every selected color need not appear.

The selected full palette is shared across all images. Presets and saved palettes do not
generate new colors. Auto fits one common palette from the whole wall.
With Max colors: All and Cleanup: Off, identical visible source RGBs map identically at the same alpha cut and matching choice.
Nearest minimizes individual pixel distance under that rule, rather than local averaged shading error. PNG exports
may compact different used subsets into different physical color tables; membership in
the common selected RGB set is the shared-palette guarantee, not identical table bytes.

Full palette conversion uses original source RGB, independently of legacy brightness,
threshold and structural settings. It has no None or Swap role and no separate style or
single-option method chooser. Source alpha below the family-specific Opacity cut becomes
empty; default 128, adjustable 1–255. Alpha zero always stays empty, and all other output
alpha is binary. The settings icon/panel is always available, with a 16px semibold Nearest heading in the
shared body font and heading color, vertically centered beside an icon-only Reset button
at the top right. Below are 13px setting labels in this order: Max colors, Matching
(Oklab / RGB), Cleanup Off / On, then Opacity cut only for partial source alpha or a nondefault cut.
Matching and Cleanup labels use the shared tooltip action: mouse hover after 350ms,
stationary touch hold after 500ms. Matching explains appearance (Oklab) versus red,
green and blue values (RGB); Cleanup explains isolated-pixel merging, possible small
detail loss and agreement across animation frames. The same descriptions are linked
to their setting groups for assistive technology. Labels add no icons or controls.
Oklab compares squared Euclidean perceived-color coordinates; RGB compares squared
unweighted encoded sRGB8 channel differences. There is no brightness/contrast adjustment.
The panel shares the Style popup's responsive width and safe-area constraints;
rows stack vertically. Touch matching buttons are at least 44px high. Reset restores
Oklab, Max colors: All, Cleanup Off and cut 128, retaining the palette; keyboard Reset moves focus to enabled Oklab.
HSL/HSV, CMYK, additional perceptual metrics and dithering are excluded pending demonstrated
benefit; see docs/research/2026-10-11-palette-matching.md. Switching families retains the other family's
state. Selecting/altering colors or conversion settings reveals converted output.

Max colors is an additive integer preference: 0 means All (default), otherwise 2–256.
Cleanup is an independent boolean preference, false/Off by default. On merges isolated
one-pixel palette regions using frozen nearest labels, bounded Oklab contact/error
gates and mutually agreed isolated pairs. A final veto after frozen winner selection
preserves exact RGB matches in the active palette/subset and permits added squared
Oklab error only up to min(0.005, 0.5 * original squared error + 0.0004), including when
Matching is RGB. It does not retry another target after a veto. It remains deliberately
lossy: ambiguous eyes/highlights can change. It never fills transparency or introduces a color outside the
selected palette/subset. GIFs require all frames to agree at each changed coordinate on
both the baseline label and the proposed label. Full-source preparation is shared by
sampled previews and full exports, including first-frame PNG Copy and optimized dragging.
Worker input is chunked/acknowledged, one assembled frame at a time; cooperative fallback
and full-export overlay yield and cancel. Off takes the existing path without importing
the optional cleanup runtime. A failure reports retry/Off rather than silently reverting.
See docs/research/2026-10-12-one-pixel-cleanup.md for the findings and limitations.

### Auto and bounded animation preview storage

The visible generated source name is Auto; retain its `generated-32` identity and
64-color capacity. Its tooltip's first line is `Auto · X colors · Your images` or
`Auto · X colors · Example image` (singular for one color), followed by the existing
generation guidance on a new line. Publish source provenance atomically with the
palette; a pending/inactive tooltip describes the retained completed result. Updating
or showing the tooltip does not scan sources or start a job. Preserve keyboard focus,
hover and touch long-press behavior, accessible description and narrow-screen bounds.

New full-palette preview conversions post their first browser task before source
access/allocation, preserving captured options and cancellation. Animation cache
hits bypass that work, and exports retain their direct async conversion path.
This bounds initial conversion slices across a wall effect flush; it does not
promise to eliminate import, layout, colorization or memory-pressure long tasks.

Animated art surfaces share one IntersectionObserver. Their timers and subsequent
palette frame conversions pause outside the viewport, retaining the held frame,
completed canvas and clip cache. Positive visible area resumes that frame with its
normal source delay, without catching up hidden elapsed time. This applies to both
families and Original comparison. Stills do not register; unavailable observation
retains prior playback. Enlarged Preview remains independent and its `active` prop
still pauses hidden wall playback. Visibility never gates source fitting, subset
selection, cleanup, full-source exports or GIF output delays/loop metadata.

User artwork import lazily loads one serial analysis worker. GIFs use the existing
compositor and analyze/unify off the main thread. PNG/other formats keep their
existing native/browser sRGB decode path; only newly decoded, unpublished RGBA
may transfer. Return original and analysis buffers one frame per acknowledgment,
dropping worker references to each returned frame. Preserve every composited
pixel, dimensions, delays, loop and legacy analysis result. Capture source/cut
before awaiting import; changed settings reprepare unpublished frames and publish
atomically with the matching analysis metadata. Remove all/unmount cancels queued
and active imports, and no canceled work may fall back or repopulate the wall.
Failed workers discard partial output and re-decode the immutable File. Unsupported
workers use cooperative GIF/frame-analysis fallback; one huge frame/shared unify
may still block. The tiny example keeps its prior path and does not start the new
worker. Existing live-wall 1-bit reanalysis/export snapshots remain synchronous;
no source/analysis memory reduction, downsampling or export change is implied.
Single-frame non-GIF stills up to 4096 pixels instead use the same cooperative
analysis through that queue, with posted tasks before analysis/unification and
unchanged settings, ownership and cancellation guards. This measured conservative
transport cutoff is not a cross-device timing guarantee.

Auto leads the rail directly before Resurrect 64 without a divider; saved
palettes follow the curated choices. Fresh visits and global Reset select Palette and
Auto. Existing saved choices remain intact. ENDESGA 32 is the curated fallback
for missing/deleted existing palette selections. Generation
loads lazily and samples all successfully decoded wall assets and every composited
animation frame. It publishes one immutable revision of up to 64 opaque RGB colors;
fewer unique visible colors are retained exactly. The fixed Oklab fit uses bounded
histograms and six refinements; it is a heuristic, not semantic cleanup or a global optimum.
With no real wall assets, generation uses the ready animated demo. A nonempty real
wall remains authoritative even when all its pixels are invisible at the opacity cut;
the demo must not supply colors in that case.

Each nonempty asset contributes equal total mass. GIF visible pixels are duration
weighted within that asset; loop counts do not affect fitting. Sources, frame durations
and Opacity cut refresh generation. Matching, Max colors, Cleanup, playback, wall order,
layout and Original comparison do not. All retains its existing meaning; per-image
caps select from the shared generated colors.
During initial generation and the subsequent conversion handoff, keep the last completed
converted rendering of the same item, including an existing 1-bit preview. Original
comparison stays explicit. An item replacement cannot reuse another item's rendering.
Completed empty results clear the retained preview; animation readiness still belongs
to the requested converted frame, and canceled jobs cannot publish late.

Retain the last completed palette while updating, with brief source status. Initial
empty/wholly invisible inputs produce zero colors and disable Save/Copy/Edit; completed
empty results clear old pixels. Failures retain the last preview with retry guidance,
without substituting a preset. Generated guidance is hidden in 1-bit. Only the source
ID persists. Edit opens a fixed copy in the existing editor. Adding/removing assets can
recolor existing artwork; saving a copy freezes it.

Save, Copy, drag and ZIP capture the whole-wall signature and source/settings references
before awaiting generation. All files in a ZIP use that captured palette. Preview
cancellation cannot cancel an export subscriber. Workers use acknowledged 128 KiB
slices without detaching sources. At most two small completed palettes are cached;
old source histograms are not retained. App's completed generated publication stores
the request key and palette, without retaining the captured source request. Tile clears
inactive limiter/cleanup request references on All, Off or family changes. Canceling
the last subscriber immediately removes an unstarted limiter/cleanup job from its
queue and active map, while running/shared export jobs retain their subscribers.

Palette previews lazily retain completed animation indexes only when the whole sampled
clip fits a shared global 8 MiB budget, including indexes and used flags. Stills bypass
storage. No eager native bake or small frame LRU is added; oversized/over-budget previews
stream without evicting admitted clips. Identity includes source buffers/dimensions,
ordered colors, matching, opacity, sampled dimensions and guarded cleanup. Last-consumer
release frees storage; canceled work cannot publish late. Exports convert full sources.
Original skips converted-frame jobs. Opening Preview pauses hidden wall playback while
retaining its cache. Existing 1-bit masks/colors remain cached. Max colors exact
histograms reuse nearest error without altering accumulation order. Prepared empty
cleanup skips overlays; exhausted animation agreement skips remaining transfer/processing
after all source metadata is validated.
The animation budget covers only sampled indexes and used flags, not total app memory.
Cleanup Off skips work but does not evict a previously cached two-byte/source-pixel map
while its source identity remains live. See
docs/research/2026-10-12-generated-wall-stress.md for the bounded whole-wall validation
and remaining import and process-memory limitations.

All and limits at least the palette size return the original prepared palette immediately;
they do not load the limiter or change nearest matching. The control is one row with a
slider, exact integer field and pressed All button, following the existing tolerance/Auto
pattern. All displays an empty field with the palette color count as its placeholder and
places the slider thumb at that maximum. Moving the slider or committing a valid integer
enables the limit. Range drags commit after a 200ms pause or on release/change.
Invalid, fractional or out-of-range numbers restore the applied value;
an empty committed field selects All. The last limit remains stored (initially 16),
but does not determine the thumb position while All is selected.
All/Reset pointer presses prevent premature field-blur conversion but apply only on click.
Number and All targets are 44px square, including the field border allowance.

A limit selects existing shared-palette entries independently per original-resolution
image, then applies the existing nearest quantizer to that subset. Animations select once
across all frames, weighted by their positive delays (otherwise the existing 100ms fallback).
Preview, viewer, first-frame Copy, Save and ZIP use the same stable selection. Source/palette
edits cancel obsolete preview work; frame changes, resizing and comparison do not restart
selection. Exports capture colors, metric, cut and maximum before awaiting work. Identical
source RGB can map differently across separately limited images; small details can merge.
The selected shared palette itself stays unchanged and transparency is outside the cap.

Selection uses a bounded greedy/frequency seed and at most eight improving swaps, with
original palette order retained for ties. Up to 4096 distinct source RGBs use an exact
histogram. If unrestricted winners fit the cap, one pass preserves the existing output.
Otherwise more colors use 4096 bounded bins and a second original-pixel pass choosing
between the fitted subset and the true full-nearest frequency seed. This safeguards total
error against that baseline, not semantic detail or a global optimum. A lazy serial worker
receives new slices of at most 128 KiB with acknowledgment; originals are never detached.
Shared subscribers cancel independently. The last cancellation terminates the worker and
releases the queue, including during worker download. Missing workers use a cooperative
lazy fallback. Failure shows retry/All guidance without silently exceeding the cap.

The existing single conversion toggle keeps its style name in 1-bit and shows the
selected palette's name in the full family. Short full-palette names keep their natural
width; long names use CSS ellipsis within a responsive maximum of 156–208px. The complete
name remains in the DOM, accessible label and tooltip. Transitions affect only colors
and shadows, never responsive geometry.
Its filled/dashed indicator and pressed state show converted/original. Hold image
and Space comparison still apply to wall and Preview. Full palette horizontal palette
stepping uses curated and saved/session palettes; vertical style stepping has no full
palette method list to traverse. Controls, fields and open dialogs retain gesture guards.

### Palette chooser

Use existing floating materials and measured canvas reservations. A single horizontal
rail contains one round preview per palette with its name underneath. It scrolls sideways
with faded edges when needed and reveals the selected choice. The header has the compact
Palette/1-bit switch first, so its position is independent of the selected name. The
selected name sits to its right only when measured space allows
the name, switch and actions to fit; never force another header row. Rail labels render
the complete name in a fixed single-line width, with CSS ellipsis based on actual rendered
width rather than a character-count abbreviation. Accessible labels and shared tooltips
retain the complete name. Header names remain compact; comparison names use CSS ellipsis.
Palette circles remain
44px. Touch targets are at least 44px; fine-pointer desktop header controls remain compact.
Family buttons transition only colors and shadows, so breakpoint size changes are immediate.
Full-palette circles show all entries up to sixteen; larger sets use sixteen actual colors
selected greedily for RGB coverage, seeded by the color nearest the integer-summed mean.
Selected colors retain original order. This thumbnail overview avoids hairline wedges;
conversion, editing and export still use every palette entry. It does not imply frequency
or per-image usage.
The transparency group has symmetric 2px padding around fixed 32px fine-pointer or
44px touch buttons, with centered glyphs. Full-height masks fade both previews and names
over 36px at scrollable edges; chevrons float over the underlying glass without a dark
rectangle. Selection reveal keeps the chosen button beyond the masked region. Forced
colors removes the masks/chevrons and exposes a normal scrollbar.

The 1-bit header keeps its three-way Both/None switch. The Palette header instead has
Import and Edit icon buttons with accessible labels and shared tooltips. Its rail starts
with Auto directly followed by Resurrect 64 without a divider, then ENDESGA 32,
PICO-8 (16), DawnBringer 16, Grayscale 8,
Ice Cream GB (4), Game Boy green (4), Glow (2) and Paper (2), then a
divider and saved/session palettes. Preset attribution lives with each immutable record
and in [palettes.md](../../palettes.md). Game Boy green is explicitly an LCD-inspired RGB
interpretation. Editing a preset or session palette creates a named copy.

Full presets are grouped by descending color count: 64, 32, 16, 8, 4, 2. Vertical
dividers separate color-count groups, and a separate divider precedes saved/session
palettes when present. Glow and Paper use the existing 1-bit RGB pairs, attributed to
Polyducks (1bit Monitor Glow) and Doph (Paperback-2), and run the existing nearest
matching method. Dividers scroll with the choices and remain visible on touch layouts.
They use the style chooser's 1px-wide, 24px-high line treatment, with 4px side margins;
the rail edge masks fade them along with the choices. Palette rails stay one scrolling
row at all widths, so they have no wrapped-row boundary dividers to hide.
Divider verification in the Codex in-app browser covered 25 viewports from 280 to
2560px wide, including portrait and 320–520px-high landscape layouts. The final
styling passed 100 first/last-preset layout checks, all 21 preset selections at five
representative sizes (105 checks), four saved-library layouts, 12 light-theme layouts,
and restored selection after reload. Checks found no horizontal page overflow,
out-of-viewport palette panels, header-button overflow, wrapped rails or clipped
selected choices. Tab skips decorative dividers; Enter selects across group boundaries;
horizontal scrolling preserves selection. Style-divider comparison passed all 25
sizes, including nine wrapped layouts with row-start dividers hidden after resize
observers settled. These are browser viewport checks, not physical-device or touch
emulation results. All 487 unit tests and the production build passed.
Rapid resizing emitted ResizeObserver undelivered-notification warnings in the dev
server. The same 25-size sequence reproduced them in an isolated unchanged HEAD
checkout, so these warnings predate the divider changes; settled layout checks passed.
Equal-count order is curated,
with Lospec downloads informing PICO-8 before DawnBringer 16. ENDESGA 32 is the
curated fallback for invalid/deleted existing selections independently of rail order;
existing stable IDs retain their selection. Resurrect 64 and Ice Cream GB use Kerrie
Lake's published RGB entries in published order. No palette controls or layout change.

### Native import/review/editor

A native dialog provides focus containment, Escape dismissal and inert background.
One dialog remains mounted throughout acquisition and review. Its editable Name input
replaces the visible title and separate Name row. A round HEX backup button sits directly
before Close and remains visible, disabled for empty, truncated or busy drafts. Name,
backup and Close stay outside the scrolling body, along with the save footer. The
body shows shared color review and editing/recovery controls, then the segmented group
offering Image or file, Paste colors and Add colors, then the active input controls.
All three method buttons remain mounted and reachable by body scrolling, with complete
wrapping labels and targets at least 44px high. The header input retains the app's visible glass field
styling, with a 20px semibold name and nonshrinking round icon buttons. The field and both
buttons are 44px high, with enough inner padding for the text. It has an accessible
Name label and Palette name placeholder when empty. The dialog itself retains its
Import/Edit/Make a palette copy accessible action label. Native autofocus on Close
preserves the prior initial focus and keeps it off the text input.
Short landscape uses smaller vertical section gaps and header padding.
Vertical sections, including Name to count, use one 12px gap, reduced to 6px in short
landscape. Header bottom padding is zero so body padding supplies that gap once. Input panels,
notices and the shared review do not add overlapping margins; tool rows and swatches
retain their 8px spacing within a group.
Native Tab/Enter/Space and aria-pressed convey the choice;
do not apply partial ARIA tab roles. New imports start with Image or file; editing or
copying existing colors starts with Add colors. Only the active method's controls show.
Switching methods preserves the draft, name, pasted text, new-color picker and recovery
state. It neither imports data nor opens/closes another dialog.
Successful conflict Reload replaces the source as well as the colors/name/revision,
clearing first-frame/partial-alpha notices and image extraction options from the
abandoned import. Failed Reload preserves the existing draft and notices.

Color review has one shared position above the method buttons, with 0 colors at initial
opening and after removing all colors. The grid remains mounted; an empty grid occupies
no space. Its native scroll height is bounded to three rows normally and two in short
landscape, with 64 colors per page. Four pixels of grid padding and scroll padding keep
the keyboard focus ring inside the scrollport. The body handles remaining overflow; there are no
sticky method buttons or programmatic scroll changes. Name remains mounted from initial
opening through every method and acquisition. New drafts suggest New palette,
then the first available New palette 2, 3, etc. if that name is already occupied by
saved or session palettes, comparing trimmed names without case. This is a suggestion
at new-draft opening, not uniqueness enforcement or a reservation across tabs.
Existing edit/copy names and entered names are never automatically numbered.
An untouched file import can suggest its filename. File/text actions explicitly say Replace when colors
exist and replace rather than merge; Add appends a unique color. Entered names survive
source replacement. An all-transparent image reports no visible colors and preserves the
current draft. Failed, cancelled or duplicate operations preserve the method and draft.
Only an explicit method-button activation changes the selected method. File acquisition,
including a drop or image paste, updates the shared draft while retaining the chosen
input tool, text and picker. Names entered before the first acquisition are also retained.
It makes no programmatic focus or scroll change. Busy work
temporarily disables editing. Image options remains reachable through Image or file.

Image options appears only under Image or file when a decoded image exists. Its native
expandable section opens when the image exceeds the saving limit. Source notices,
progress/cancellation and acquisition errors sit below the method buttons and remain
available across methods, including when image paste retains a different input method.
Shared draft limits, editing errors and conflict/session recovery actions sit above the
method buttons. Show removal/limit instructions only
when needed, and do not repeat the GIF compatibility notice.
Artwork drop/paste and global stepping do not react behind it. Choose a palette image or
file, paste an image, or use Paste colors. Supported images are PNG/JPEG/WebP/BMP/GIF,
and the open dialog also accepts Discord/web HTTP(S) image and Aseprite URL drops.
Capture drag strings synchronously with the existing artwork payload parser: image
HTML sources, URI lists, DownloadURL and plain URL text. Files take precedence; only
the first source replaces the current draft, preserving entered name and selected
method. Never import into the artwork behind the dialog or navigate the page.
Fetch signed URLs unchanged with CORS, omitted credentials and no referrer.
Direct URL imports require the source to permit browser cross-origin reads. Discord
image imports succeeding does not imply that its binary Aseprite attachments allow
them: the supplied paletteV1.ase returns valid bytes but no CORS permission header.
Such links must be saved first and imported as local files. Fetch-level network errors
explain that the website may block direct imports or the link/connection may be
unavailable, without claiming which cause the browser concealed. The existing draft
is retained and the message offers saving and importing the file. Parser and timeout
errors retain their specific messages.
Verification on October 11: the supplied Discord PNG URL includes
`Access-Control-Allow-Origin: *` and imports into the live Codex browser editor,
finding 6,743 colors (over the review limit). The supplied `.ase` URL fails with the
new conditional explanation while preserving the draft; its downloaded 2,055-byte
file imports 255 colors. Local file drops preserve entered names and the selected
Paste colors method. All 448 unit tests and the production build pass; independent
review also ran all 41 palette-download tests.
Stream downloads up to 32 MiB; reject larger bodies before accumulating the remainder. The
30-second timeout covers download only; decoding uses user cancellation without a
new local deadline. Cancel/Close suppress late successes and errors. Failure/timeout
retains the draft and offers saving the file locally. Extensionless generic Aseprite
attachments route by binary magic to the existing lazy parser. Image signatures
identify supported image types, including extensionless GIF. Remote text palette
URLs are unsupported; their existing local file and text routes remain available.
Local supported images are
up to 32 MiB and 16 × 1024 × 1024 decoded pixels. GIF uses the first frame with a notice.
Browser decoding yields color-managed sRGB values; exactness concerns those decoded
values, not arbitrary original color-profile bytes. Artwork and palette-image import
share `image-decode.js`: PNG uses native ImageDecoder when supported and copies its
frame directly to straight RGBA/sRGB, avoiding canvas readback noise and alpha round-trip
rounding. Native capability, decoding/copy errors or presentation transforms fall back
to the existing color-managed bitmap/canvas path. Other image formats retain that path;
the existing multi-frame GIF decoder is unchanged. Both paths honor cancellation,
palette pixel limits and resource cleanup. No colors are heuristically rounded or merged.
The browser can allocate decode
buffers before dimensions are exposed.

Supported text is HEX/TXT, legacy RGB GPL and text JASC-PAL version 0100, up to 256 KiB.
Hex accepts #RGB, #RRGGBB or bare six-digit tokens separated by whitespace/comma/semicolon.
Alpha hex, malformed rows/counts, binary PAL, Adobe ASE and ACO are rejected. Do not mine
arbitrary documents for hex-looking substrings. TXT means this hex grammar.

Aseprite `.ase` / `.aseprite` files, up to 32 MiB, use a dynamically imported palette
parser only when that file type is selected. Read the first frame's embedded palette,
prefer modern records over legacy records, and require complete known entries rather
than fabricating defaults or sampling artwork. Keep palette-index order, remove RGB
duplicates, skip alpha-zero entries and normalize positive alpha to opaque with the
existing source notice. Multi-frame documents show the existing first-frame notice,
worded for Aseprite. Read stored RGB channels directly, like HEX; document profiles are
metadata and are not applied. Export a color-managed PNG first for rendered-appearance
colors. No layer compositing, cel decompression, external file loading or new controls.
Limit embedded tables to 4096 entries before deduplication. Validate binary magic,
lengths, ranges and framing; reject malformed/missing palette data
without replacing the draft. Cooperative parsing supports cancellation and progress.

Every color scans every full-resolution alpha-positive pixel, in reading order, with RGB
deduplication. Alpha zero is excluded; partial alpha is normalized to opaque palette RGB
with a notice. There is no layout assumption or automatic rare/background/black/white
removal. Optional Find solid colors proposes matching visible RGB in 3×3 patches; differing
positive alpha still represents one RGB color. Borders/backgrounds may remain. Zero solid
candidates explain that no patch was found and preserve the current draft. The supplied
PNG fixtures give exact counts 255/31/345 and solid counts 0/31/31; every ordered browser
RGB matched independent decoding in the tested browser.

Review uses 64-color pages, select/remove, single-color editing, Add and Undo edits.
Duplicates are rejected, including restoration of the native color picker's prior value.
Names require 1–64 trimmed Unicode characters. Up to 4096 candidates may be edited down
to 1–256 for Save. Above 4096, show the exact total and disclose that only the first 4096
are displayed; this incomplete draft cannot be saved or exported as a complete backup.
Try solid candidates or a smaller prepared input. Cancel changes neither selected palette
nor saved records. Image scanning/preview jobs yield and cancel; closing releases the
dialog's owned source and outstanding scan.
An asynchronous GIF-limit failure cannot replace an editor already open. Preserve its
request, draft, editing limit and focus-return trigger; show a reactive inline alert
identifying the failed export palette and instructing the user to finish/cancel, then try
Save again. No deferred dialog or automatic replacement is queued. Without an open editor,
the existing explicit 255-color copy flow applies.

### Concise Help and description

The app description is “Throw your pixels a palette party. Recolor images and animations.”
Help, README and page/social metadata use this copy, with the existing local
privacy statement. Help keeps the short numbered layout and compact shortcut table at its
existing 420px maximum. In Palette, the Palette step says “Use Auto, pick a palette or
import your own.” and Nearest says “Tune color matching and limits.” In 1-bit, Palette
says “Pick a color pair or choose your own colors.” and Style says “Pick an effect and
tune its settings.” No extra explanatory section or palette count is added. Both modes
retain four steps: Add, Palette, Nearest/Style and Save.

The table shows Next style only in 1-bit. Its settings row follows the dock: Style
settings in 1-bit; Palette settings in Palette. Palette navigation, image actions and device-specific shortcut
wording remain. Native dismissal, first-visit welcome and background gesture guards remain.
Initial focus goes to the top Close button, revealing the introduction instead of scrolling
to Got it on narrow or short screens. Its accessible Close label is sufficient; it has no
redundant focus tooltip, so a single Escape dismisses Help on initial entry. Other tooltips
retain their existing Escape handling. Enter still dismisses; Tab reaches Got it using
native dialog focus behavior. Reopening after scrolling reveals the top again. This supersedes
the historical footer autofocus rule. Dismissal returns focus to the visible More button,
including after the first-visit welcome, rather than the Help row in its closed menu.

### Persistence and reset

Family, palette ID, alpha cut, global matching `metric`, `maxColors` and `cleanup` are additive preferences.
Max colors slider and number bounds follow the active palette's unique color count.
Nearest settings inherit the Style popup's responsive width and safe-area constraints,
giving the slider more room on wide screens while fitting phone and landscape viewports.
Both settings families use Reset buttons with 12px corner radii and the existing reset
color treatment. Palette Reset is always a 44px icon-only button beside the Nearest title.
Style Reset shows an icon and Reset text above 520px wide, or a 44px icon-only
button at 520px and below. Both retain complete accessible names and tooltips.
Their numeric display is the lesser of the requested maximum and that count; All retains
an empty number value with the palette's color count as its placeholder, and a slider thumb
at that palette's maximum. `lastMaxColors` remains stored independently. Neither palette selection,
palette editing nor blurring an untouched number changes the stored global preference.
A larger palette restores its remembered value. Slider moves update the preference after
200ms without another move, or immediately on release/change. Pending moves are canceled
on pointer cancellation, closing, palette/family switching, All and Reset. Number fields
still commit on change/Enter/blur. The last completed rendering stays visible while the
same frame recalculates, with converted animation playback waiting for the new rendering.
Exports use the committed settings and full source, never a retained previous preview.
Only committed edits update the preference;
invalid edits are restored, and changing palettes or closing the popup discards unfinished
slider drafts and native gestures. All remains an explicit choice even when a numeric limit equals
the palette's size. The minimum is 2 for palettes with multiple colors. A one-color palette
uses its sole color and disables both limit inputs; a two-color palette disables only the
immovable slider. Stored `maxColors` or `lastMaxColors` of 1 restore as 2, retaining All (0),
palette identity and all higher preferences. Accessible descriptions explain a temporarily
bounded higher preference.
Missing or invalid metric restores Oklab; only `oklab` and `rgb` persist. Palette records
do not own matching, so imports, edits and selections retain the global choice. Reset
settings restores Oklab, Max colors: All, Cleanup Off, remembered limit 16 and cut 128. Fresh/unreadable/non-record preferences select Palette/Auto. Parsed preference objects
without a valid family retain legacy 1-bit; their missing palette selection falls back
to ENDESGA 32. Explicit valid family and palette IDs remain intact. Global Reset uses
the fresh defaults; Nearest settings Reset retains the palette. Explicit named Save uses
`colorfetti-palettes-v1`: version 1, at most 100 records and 256 KiB serialized UTF-8. Images
and drafts are not persisted. Validate records independently. Each record has ID, name,
colors, revision and source attribution. Re-read before writing to retain unrelated tab
changes; edited/deleted revision conflicts offer Save copy or Reload. Web Storage cannot
make simultaneous read/modify/write operations transactional.
Storage events refresh saved choices, including a native local-storage clear in another
tab. Session palettes, current settings and an open draft stay in memory. Session-storage
events, including a matching library key or clear, do not change persistent palette choices.

Save closes/selects only after persistence succeeds. Failures retain the draft and offer
session-only use and HEX backup. Saved palette deletion requires confirmation. Reset
settings keeps images and saved palettes by default; an unchecked Delete saved palettes
checkbox additionally removes only this library key. A storage deletion failure leaves
settings/library intact and reports the failure. No `localStorage.clear()` is used.

### Original-resolution exports and playback

Snapshot selected colors/matching/maximum/alpha/family at the Save or Copy gesture; asynchronous completion
cannot adopt later edits. Full palette exports use `-palette` filenames, with existing
collision handling. Legacy `-1bit` names and bytes remain compatible. Copy exports PNG of
the first animation frame. Save all downloads no file/ZIP until every encoding succeeds.

Internal full palette indices are Uint16, opaque 0–255 and empty sentinel 256. PNG compacts
used entries to 1/2/4/8-bit indexed output, including transparency when needed. All 256
used opaque colors plus empty use directly encoded RGBA PNG. Export never reads back a
canvas or silently reduces the chosen colors. Full palette GIF preflights the global used
union and its empty entry. It fits 256 opaque colors, or 255 opaque colors plus empty;
all 256 plus empty opens a named 255-color copy instead of downloading. Remove colors
explicitly, save/select the copy, then request a new download. Cancel preserves selection.
Local GIF tables and implicit automatic reduction are not implemented. An explicit
Max colors limit selects its subset before this compatibility check.

GIF conversion retains only one converted frame per pass, transfers the remapped frame
to one compression worker, and waits for its acknowledgment before proceeding. Worker
failure reports an error; a missing Worker uses the same direct writer. Source RGBA GIF
frames and compressed output are still retained. Exported delays/loop remain from the
source. Full palette preview's next-frame clock starts when conversion is ready, so an
expensive preview may run slower than the source; this does not change export delays.
Original comparison, including held and viewer comparison, follows source-frame timers
without waiting for conversion. While Original is shown, preview readiness does not
restart that timer. Converted playback still waits for the current converted frame.
While that frame converts, retain the last completed canvas from the same item.
Clear retained pixels on item or conversion-family changes. Canceling obsolete jobs
prevents their results from replacing the newest requested frame. This avoids blank
canvas gaps without retaining a converted cache of the whole animation.

### Verification boundaries

The integrated unit suite passed 310 tests. The built-browser harness passed all 132
legacy color-pair/style combinations and five full preset cases, independently decoding
exports and checking compatibility/persistence flows. Targeted native-editor checks and
Codex browser interaction/layout checks complement that coverage. Use `BASE_REF` with
the pre-feature revision for `bench/palette-qa.mjs` after committing this feature.
Physical Android/iOS, Safari, arbitrary image profiles, privacy-altered canvas decoding
and sustained peak-memory behavior of the new family remain unverified. Earlier physical
device measurements in this document concern the legacy system, not this implementation.

### Merged palette refinement verification (2026-10-11)

Local main 7ff57cb is merged into the palette branch. Its dialog drag-enter guard is
combined with web-image detection; both branches’ import and palette behavior are retained.
The final refinement passes 356 unit tests and the production build. Fresh browser
checks cover 132 old style/pair combinations, both matching rules across all six buildings
and five presets each, native Codex ZIP output, 80 settings/name cases plus 40 short-name
and theme cases, and web/Discord URL/GIF drops including errors, progress and cancellation.
Codex browser independently passed the desktop, phone and asynchronous drop-review flows.
Settings rows, cut adjustment/reset and exact mode-specific Help text were inspected.
The thumbnail overview does not alter output pixels. Physical-phone/Safari checks remain open.

Follow-up: the Nearest heading uses 16px/600 body typography and the existing heading
color, distinct from 13px setting labels. The thumbnail cap is sixteen, keeping PICO-8
and DawnBringer complete. The final follow-up passes 359 unit tests, build, and 120 targeted
layout/theme cases. Auto matching remains research only; no per-image policy was added.

### Add colors and Help correction verification (2026-10-11)

The frozen editor/Help change passes all 359 unit tests and the production build.
Targeted production checks pass 290 completed editor/keyboard/recovery/layout assertions,
20 GIF-copy/export-notice assertions and 21 isolated Help assertions across both families
and pointer modes, with no JavaScript exceptions. They cover manual creation, both source
methods, supported file parsers, image/drop/paste, duplicates, name preservation, copies,
Undo, limits, conflict reload/copy, storage failure/session use and cancellation.
Native Codex browser checks confirm the supplied 255-color image, stable Add controls,
320px keyboard focus/text retention, landscape body scrolling and restored Help steps.
The combined Help-navigation harness encountered an inherited tooltip interception;
isolated keyboard navigation passes all four family/pointer cases. Exact before/after
checks confirm the existing tooltip-first Escape rule. Conversion code is unchanged;
the earlier conversion matrices remain historical coverage. Physical-device/Safari
limitations above still apply.

### One-modal palette editor verification — before editable header (2026-10-11)

The editor keeps one mounted dialog, Name field and shared color review. Name is always
above the three input methods and initially says Custom palette. Section gaps are 12px,
or 6px in short landscape; empty utility and swatch rows occupy no space after Undo.
All 359 unit tests and the production build pass. Final production assets
index-BKjddKew.js / index-BawmA8RT.css pass 1703 editor assertions, including 404 repeated
dialog/Name/review continuity observations, 60 layout cases with 781 assertions, and
23 GIF-copy/recovery assertions, with no JavaScript exceptions. These counts include
repeated guards, not distinct user scenarios. Checks cover all three methods, replacement,
manual addition, supported parsers, image/drop/paste, name retention, edit/copy, limits,
duplicates, save conflicts, storage recovery, cancellation, and Undo to zero colors.
Every layout checks the 12px/6px gaps, fixed Name/methods, full labels and 44px targets.
At 844×320 the scrolling body retains 51px of usable content. Independent source checks
pass 12 spacing cases, 18 target-visibility cases and four empty-draft cases; the reviewer
also passes ten final production geometry cases. Native Codex browser checks confirm
Custom palette at initial opening, entered-name retention with the supplied 255-color
image, persistent controls during long review, Undo to zero and short landscape.
The earlier Help and conversion gates above remain historical coverage; their source is
unchanged in this editor change. Browser emulation does not replace physical-device or
Safari testing.

### Editable-name header and mixed input verification — before review reordering (2026-10-11)

The editable name now replaces the title and separate Name row. Both it and Close are
exactly 44px high; the name retains a 20px semibold font, a 24px line and 8px vertical
padding. New drafts receive the first free Custom palette suggestion; provided and
entered names retain their existing protection. All 362 unit tests, compilation and
the production build pass. Final assets index-CvmDOgec.js / index-C2nDswBh.css pass:

- All 27 three-step File/Paste/Add sequences across four origins (new, saved edit,
  preset copy, GIF compatibility copy) and two pointer modes: 216 cases, 4573 assertions.
  Each occurrence uses different inputs; checks include exact replacement/append order,
  duplicate rejection, retained inputs/name/identity, eight representative saved drafts
  and four-step return cycles.
- The adapted editor baseline: 1703 assertions; 60 responsive cases: 781 assertions;
  naming/keyboard/session checks: 137 assertions; GIF-copy/recovery: 23 assertions.
- Codecs and remaining editor controls: 99 assertions, including independent PNG,
  JPEG, WebP, BMP and GIF decoding, chooser activation, swatch editing/selection,
  paging, HEX backup, dismissal and deletion.
- Failed conflict Reload preserves source warnings/draft in eight cases (49 assertions);
  delete-conflict Reload/Save copy recovers in four cases (21 assertions).

All final browser reports have no JavaScript exceptions. Independent review passes ten
production header geometry cases and both actual PNG/GIF conflict-reload paths. The
review discovered that successful Reload kept stale first-frame/partial-alpha guidance;
the narrow fix clears source-specific notices/options on success, with failure retention
retested. Source checks also pass 36 layout/focus cases and four naming flows. Native
Codex browser checks confirm the supplied image→pasted replacement→manual addition,
duplicate/valid swatch editing, clear selection, exact HEX backup, empty-name validation,
and equal 44px controls in narrow portrait and short landscape.
Assertion counts include repeated guards. The matrix exhausts its finite sequences,
not arbitrary-length interactions or every possible input/browser. Physical phones and
Safari remain unverified; unchanged Help/conversion coverage above remains historical.

### Review above input methods and New palette verification (2026-10-11)

Shared color count and review now precede the three input methods. The fixed header
contains Name, HEX backup and Close, all 44px high. Empty drafts say New palette and
0 colors; backup stays present and is disabled when empty, truncated or busy. The
name-to-count gap is exactly 12px normally and 6px in short landscape. Numbered
suggestions use the first free New palette suffix; existing names are preserved.

The independent review challenged pinned input buttons and two scrolling panes; the
agreed layout uses one body scroller and a bounded swatch grid. It also identified
keyboard focus rings clipped by the grid. A 2px outline offset and 4px scroll padding
keep the ring visible without changing control sizes. Final production checks on
index-DBirBfap.js / index-DRgAmXuj.css pass ten independent viewport/pointer cases,
including all 640 native swatch Tab focuses, and 60 responsive layout cases. All 362
unit tests and the build pass.

The final production regression also passes all 216 three-step mixed-method cases
across new imports, saved edits, preset copies and GIF recovery copies in both pointer
modes. Editor, naming, codec/control, backup and recovery suites pass, with 8113
executed assertions and no JavaScript exceptions. These are finite scenarios and
include repeated guards; they do not exhaust arbitrary interaction sequences.

Native Codex browser checks confirm the supplied 255-color image, last-swatch-on-page
access, paging, pasted replacement, manual addition, duplicate rejection, Undo and an
exact four-color HEX download. Normal, 320px portrait and 844×320 landscape checks
confirm shared review order, header/button geometry and the single section gap.
Physical-device and Safari limitations still apply.

### Final whole-branch review against main (2026-10-11)

Independent review against main `7ff57cb` confirmed two defects: Original GIF playback
waited for palette conversion, and the saved library mishandled storage events. The
agreed fixes share the Original visibility predicate, gate only converted playback,
and accept library-key or clear events only from local storage. Challenging the first
storage fix exposed actual session-storage library-key events replacing the saved rail;
the strengthened guard rejects them as well as session-storage clears.

Final production assets index-DncP2FqG.js / index-DRgAmXuj.css pass all 362 unit tests
and the build. Actual wall and viewer regressions hold conversion yields while source
frames keep advancing; converted playback waits, displays the current frame and resumes.
An independent component witness also checks held comparison, stale-job cancellation
and that preview completion does not restart the Original timer. Native two-document
storage checks preserve session identity, matching, opacity, legacy settings and the same
open draft, while refreshing saved choices and rejecting session-storage events.
The complete built-app regression passes 132 legacy color/style combinations against
the pinned main baseline, all five presets in both matching modes, and nine integration
categories covering independent PNG/GIF/clipboard/ZIP decoding and export snapshots,
editor recovery, native storage events and pending-conversion animation. No browser
JavaScript exceptions were observed.

Affected naming, failed Reload and delete-conflict checks pass 229 assertions; session
copy, preset immutability, persistent reload and edit identity pass 29. The fresh mixed
matrix passes all 216 three-step File/Paste/Add cases across new, saved edit, preset copy
and GIF recovery copy in both pointer modes, with 4573 assertions. Synthetic storage
fixtures now supply the actual local-storage area; their assertions remain unchanged.
These finite sequences do not exhaust arbitrary interactions. Native Codex
browser checks confirm new/edit/preset-copy controls, duplicate handling, color editing,
Undo, cancellation, both families, both matching choices and the retained Style Help row.
The earlier editor/codec/layout counts remain historical evidence. Physical-device and
Safari limitations remain unchanged.

### Lazy Aseprite palette import verification (2026-10-11)

The parser imports embedded numeric RGB entries only. Review corrected legacy packet
starts and six-bit expansion, and rejected treating the supplied document's gamma 2.2
profile as ordinary sRGB. The agreed contract preserves stored RGB like HEX, ignoring
artwork/profile payloads after validating their chunk bounds. A final challenge exposed
late failures after Cancel; the scoped route now preserves cancellation on rejected
module loads, file reads and parsing, with concise reload guidance for a load failure.

All 407 unit tests and the production build pass. Final assets index-CFW9g8Uc.js,
palette-ase-1nNkaIAs.js and unchanged index-DRgAmXuj.css pass 311 affected browser
assertions across both pointer modes, including 36 fixture scenarios. They cover the
supplied 255-color table and exact HEX backup, modern/legacy records, ranges, names,
alpha, ignored profile metadata, malformed framing/data, limits, mixed input methods,
persistence, saved edits, preset/session/GIF copies and both cancellation rejection paths.
These are finite fixtures and repeated assertions, not exhaustive arbitrary files.
A retained built-browser gate independently reads the SHA-pinned supplied table and
verifies no parser request for startup/editor/PNG/text, one first Aseprite load, cached
repeat imports, all 255 ordered RGB values and saved Aseprite source metadata.

Native Codex browser checks independently match all 255 supplied colors in order,
save/reload/reopen them, and import PNG/JPEG/WebP/BMP/GIF/HEX/TXT/GPL/JASC-PAL in the
same editor. Adobe ASE failure retains the draft; Paste/Add/Undo/Cancel preserve the
saved original. The 320px check retains 44px header targets without horizontal overflow.
The preceding build's unchanged legacy/export paths pass 132 combinations, five presets
in both matching modes and nine integration categories; final scoped route checks are
fresh evidence. Physical-device and Safari limits remain unchanged.

### Cooperative Save all scheduling (October 13)

Batch exports give browser input and rendering a turn between fully encoded files.
The gesture's captured item list and settings remain authoritative; a later file
failure downloads no partial ZIP. One-file Save adds no batch scheduling turn.
Individual synchronous masks and still PNG encoders retain their existing behavior.

1-bit animated Save/Save all/hover exports capture frame analyses, delays, order,
loop, inks and copied style settings at the gesture, then produce and encode frames
sequentially. No clip-wide output-mask allocation precedes encoding. The GIF writer
uses growable output storage and posted turns between groups at an 8 ms budget;
an individual frame remains synchronous. None, transparency, disposal, delay rounding,
dimensions, loop and output bytes remain compatible. Aborted hover work stops before
later frame production; explicit Save subscribers and active native drag grace remain
independent. PNG Copy still exports the first frame.

### Palette preparation failure contract (October 13)

A Max colors or Cleanup failure retains the same item's last completed preview,
marks Retry needed in its existing dimensions line and shows persistent Dock
Retry guidance. In the viewer the notice and Retry remain in the top-layer dialog;
pressing Retry does not dismiss it. Each surface/stage owns its failure against
immutable source and conversion inputs; stale attempts cannot settle replacements.
A successful viewer cannot hide a failed wall preview.

Save, Copy, Share export actions and drag export are disabled/guarded for an affected
item; Save all is disabled/guarded if any selected item is affected. Previously
captured exports are independent. Explicit Retry and unchanged palette/settings
reselection retry only failed stages, retaining gates until success. Healthy stages
are reused, unrelated imports do not erase failures, and no automatic retry loop
runs. All, Cleanup Off and 1-bit bypass only their corresponding stages. Changing
Cleanup does not retry a failed limiter. Source/settings changes filter obsolete
failures and surface teardown releases its own records.

A drag whose export request is unavailable is refused without a preparing/wait notice;
existing Auto or preparation-failure guidance explains the block. A valid request
whose native export file is not yet ready retains the preparation notice.

Live 1-bit Brightness and relevant Opacity cut changes capture immutable source/frame
metadata, prepare replacement analyses cooperatively between frames and shared seam
passes, and publish the captured wall together only for the current source/cut,
family and membership. Existing converted pictures remain visible while preparation
is pending or deferred by dragging, with converted animation held; Original remains
available. Empty-wall preparation uses only the example. Matching analyses perform
no replacement work. Failure reports once without an automatic retry loop. Export
gestures prepare their captured sources/settings independently from wall cancellation,
and Copy requests clipboard writing immediately with a promise for the PNG.

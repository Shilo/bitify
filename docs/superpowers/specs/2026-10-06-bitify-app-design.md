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
- Copy each image to the clipboard with a button to the left of its Download button, on
  desktop and on phones, and with Ctrl+C for the first image (added 2026-10-07; see
  "Copying"). On phones the two sit behind one Share button, so that only two buttons are
  beside the name (see "Tiles").
- A toggle between the original and the bitified image.
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
- The two colors, the style and every style's settings are remembered between visits (see
  "Remembered settings"). Nothing else is.
- Exports are PNG at the original pixel size, with no upscaling option.
- Animated WebP and APNG files are converted as their first frame only. (Animated GIFs are fully supported; see "Animated GIFs".)

## Layout: the Wall

One screen, no page scroll. Three layers:

1. **Top bar.** The "Bitify" wordmark, an image count, and at the right a trash icon button
   that removes all images (only when there are images), "Add images", and last a More
   button (three dots) that opens a menu (see "The More menu").
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
| Download all | Saves every bitified image in one zip. With exactly one image on the wall it reads "Download" and saves that image as its own file, not a zip. Disabled when the wall is empty, where it also reads "Download". |

The dock is three groups, with a divider between them where there is room (see "Responsive
behavior"): the colors with the Palette button that picks them, the view switch with the
Style button that picks what it shows, and Download all.

The two colors show which palette is in use, and the view switch shows which style: its
bitified half reads the style's name, so the name is on screen at every width, and changes
as the styles are stepped through. Its tooltip and its name for screen readers say
"Bitified:" and the style. That half is as wide as the longest name, "Silhouette", so the
dock does not move when the style changes; on phones the two halves are equal. Pressing it
shows the bitified images. It does not open the list of styles; the Style button does.

Changing the style or any of its settings while the original is showing switches the view back
to bitified, so the change is seen. That holds for every route: the list of styles (also
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

**Style panel.** A strip one row high, so that the wall can sit above it, with the
current style's other settings a press away. Left to right:

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
  fit a range. Silhouette has no threshold, and the strip leaves its place empty.
- More: a button with the word "More" and a caret. It opens the tray (below). It shows a
  small square beside the word while any of the style's settings other than the threshold
  is away from its default, so settings that are out of sight are not out of mind.

While the strip is a single row, a divider separates the style button from the threshold.
It matches the dock's dividers.

**The tray.** More opens the current style's other settings under the strip, inside the
same panel, all at once. The panel grows upward and the wall makes room for it, as for any
panel, so the images stay in view while a setting is changed. Pressing More again closes
it. It stays open or closed as styles are changed, and shows the settings of whichever
style is current. It starts closed, and whether it is open is not remembered between
visits.

- Each setting is a row: its name, then its control. A setting with a few values to choose
  from is a row of buttons, one pressed, like the view switch. A number is a slider and a
  number box, with an Auto button joined to the box where the setting has an Auto. They
  work as the threshold's do: the box clamps what is typed to the setting's range, and
  clearing it goes back to Auto. Fill darks has no Auto; its box is empty and reads "Off"
  at 0, and clearing it turns it off. A box of a setting with neither waits for a number
  when it is cleared, and shows the setting's value again when it loses focus.
- The rows are two side by side. At 700px wide and below there is one to a row.
- Under the rows, a line saying that the style keeps these settings for itself, and a Reset
  button that puts all of the current style's settings, the threshold included, back to
  their defaults. Reset is disabled while they are all at their defaults.
- The tray is never taller than the window less 440px, and never shorter than one control.
  When its rows need more than that (a short window, a phone on its side) it scrolls
  inside itself, so the wall always keeps some room.

**On a phone** (520px wide and below) there is no room for a tray with the images still in
view: with six settings open it would leave them a strip a few dozen pixels high. So a
phone shows one setting at a time, and the panel is two rows high for every style, the
height it has always had there:

- First row: the style button, here only its preview and caret (the view switch below
  already names the style), then every setting of the style as a chip, the threshold
  first. A chip shows the setting's name over its value ("Auto", "Off", "70%", "2×"), and
  a dot after the value while that is not the default. The chips scroll sideways by swipe
  or wheel, as the palettes do.
- Second row: the control of the pressed chip, as wide as the row, then a Reset button (an
  icon) that works as the tray's does.
- The threshold's chip is pressed to begin with, so the panel opens as the strip it was.
  Pressing a chip scrolls it into view. The pressed chip is remembered while the app is
  open; a style that does not have that setting shows its first.
- There is no More button and no tray.

Which of the two a screen gets follows its width as the window is resized.

### The More menu

The More button is the last button in the top bar, at every width. It opens a small menu
that drops down below it, lined up with its right edge, with two or three rows, each an
icon and a word:

- Help: closes the menu and opens the help (see "Help and welcome").
- GitHub: opens `https://github.com/Shilo/bitify` in a new tab.
- Install, last: asks the browser to install Bitify as an app (see "Installing"). The row
  is there only while the browser offers that.

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

- A header in one row, so that it takes little height: the logo, then "Bitify" in Pixelify
  Sans with the empty screen's one line under it ("Instantly convert sprites and animated
  GIFs to 1-bit colors and styles."). The logo is the still gold coin itself
  (`src/assets/logo.png`), not bitified, drawn at exactly twice its size (56px) with hard
  pixel edges and nothing behind it. A Close button (an X) sits in the top-right corner.
- Four steps, each an icon, a word and a line. The icons are the app's own: the plus of
  Add and the icons of the dock's Palette, Style and Download buttons. The first is worded
  for the device in use:

  | | Mouse and keyboard | Touch |
  |---|---|---|
  | Add | Drop, paste or choose images. | Choose images. |
  | Palette | Pick two colors, or a preset. | The same. |
  | Style | Pick effect, tune its settings. | The same. |
  | Save | Download or copy images. | The same. |

- Under a divider, a table headed "Controls", with a thin line between its rows. Each row
  names a control and gives every way to do it, one way to a column. The rows are in the
  order of the steps. With a mouse and keyboard the columns are "Mouse" and "Keyboard":

  | Controls | Mouse | Keyboard |
  |---|---|---|
  | Add image | Drag, Drop | Ctrl, V |
  | Next palette | Shift, Scroll | ←, → |
  | Next style | Scroll | ↑, ↓ |
  | See original image | Press, Image | Space |
  | Save image | Click, the Download icon, the Copy icon | Ctrl, C |

  On touch there is one column, "Touch":

  | Controls | Touch |
  |---|---|
  | Add image | Touch, the plus icon |
  | Next palette | Swipe, ←, → |
  | Next style | Swipe, ↑, ↓ |
  | See original image | Hold, Image |
  | Save image | Touch, the Share icon |

  Everything in those columns is drawn as a key, so that it stands out from the text: the
  keys themselves, what a mouse or a finger does, such as "Scroll" and "Hold", what it is done to, and
  the icons of the buttons to press. Each comma above separates two keys; they sit side by
  side with no "+" between them. On a Mac, Ctrl reads ⌘. Save image names the buttons a tile
  has on that device: Download and Copy with a mouse, Share on touch (see "Tiles").
- A last row: "Images never leave your device." and a filled "Got it" button, which has
  the focus when the dialog opens.

Touch means a coarse main pointer, the same test the rest of the app uses. The steps give no
counts of styles or palettes, which change, and the help does not explain the threshold or the other settings.

Got it, Close, Escape and a click or tap on the dimmed app close it. A click inside it
does not. While it is open nothing behind it reacts: presses, swipes, the wheel and the keys
all change nothing.

### Responsive behavior

| Width | Dock |
|---|---|
| Above 800px | Icon and text labels, dividers between groups. |
| 521 to 800px | Icon-only buttons, one row. |
| 520px and below | Tools on the first row, the view switch on a second row as wide as the tools. The dock is only as wide as its tools, centered, and is never stretched to fill the screen; it keeps at least 12px from each edge. The style panel is as wide as the dock. The palettes panel stays as wide as its chips, centered and never wider than the screen less those margins, with the name on a row of its own above the chips. The style panel takes two rows, without dividers: the style button and the chips of the style's settings, then the control of the pressed chip (see "On a phone" under "Style panel"). Its list of styles is a grid three wide, three rows of three, as wide as the strip. The image count and the word "images" in the Add button are hidden. |

On coarse pointers every dock control is 40 to 44px square. The app uses
`viewport-fit=cover`, pads for the safe-area insets, and sizes itself with dynamic
viewport height so mobile browser bars do not cut the dock off.

### Adding images

- Drag files anywhere onto the window. While dragging, a full-screen "Drop to bitify"
  overlay shows, drawn in the two chosen colors.
- "Add images" opens the system picker (`accept="image/*"`, multiple). This is the only
  route on phones.
- Pasting an image from the clipboard also adds it.
- New images are appended; existing ones stay. The images of a batch are read one after
  another, and each appears as soon as it has been read, without waiting for the rest.
- Remove all also stops any batch that is still being read. Its remaining images are not
  read and do not appear on the wall that was just emptied.
- Files the browser cannot decode are skipped, and a short message says how many.

### Empty state

A centered slogan ("Pixel art in two colors"), one line saying what the app is ("Instantly convert sprites and animated GIFs to 1-bit colors and styles."; no
counts of styles or palettes, which change), and a
button labelled "Drop, paste or choose images" ("Choose images" on touch devices, where there is
nothing to drop). The text describes the app, not the steps. The dock stays visible.

Above the heading sits the Bitify logo, a 28×28 spinning gold coin with a B
(`src/assets/logo.gif`, an eight-frame animation), labelled "Example". It plays like any
animated GIF on the wall. It is a live preview: it goes through the same conversion as real
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
  palettes panel while its chips scroll. The help names Shift.
- Ctrl with the wheel steps the palettes everywhere. Ctrl with the wheel never scrolls
  anything, so there is nothing to take over. It would zoom the page; the app stops that.
  Ctrl with + and − still zooms.
- So with a wall that scrolls, the wheel changes the style over the top bar and the dock
  but not over the images. The arrow keys change it from anywhere.
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

Each image is analysed when added, then converted whenever the style, one of its settings
or a color changes. It is analysed again only when the style in use reads brightness or
opacity another way (see "Each style's settings").

Every pixel ends up in one of three states:

- **Empty**: alpha below 128. Stays fully transparent.
- **First color**: lines and dark pixels.
- **Second color**: fill and light pixels.

Output pixels are fully opaque or fully transparent. Brightness of a pixel is
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
- In Cutout, Lines, Solid and Silhouette each pixel of the picture is exactly what the
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
- The seam strength is automatic unless the Seams setting gives one. The threshold only moves the brightness cut.

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

### Each style's settings

Every style has settings of its own beyond the threshold. Each is kept for each style
separately, the threshold included: changing Hatch's threshold leaves Bayer's alone, and
coming back to a style finds it as it was left. Every default converts exactly as the
style did before it had settings.

| Setting | Styles | Values | Default | What it does |
|---|---|---|---|---|
| Threshold | all but Silhouette | Auto, or 1 to 254 | Auto | See "Threshold". |
| Seams | Cutout | Auto, or 1 to 255 | Auto | The seam strength. Lower values cut along softer changes. No difference is above 255, so 255 cuts no seams. |
| Rim | Cutout | On, Off | On | Off leaves out the light rim on dark pixels at the silhouette. With Seams at 255 as well, Cutout is Solid. |
| Thickness | Lines | 1, 2, 3 | 1 | A solid pixel fewer than this many steps (left, right, up or down) from a line is a line too. A step may cross an empty pixel. |
| Fill darks | Lines | Off, or 1 to 254 | Off | A pixel this dark or darker is first color as well, so dark areas stay filled. Thickness does not widen them. |
| Shading | Checker, Hatch, Bayer, Noise, Atkinson | 0 to 100% | 100% | How far from the threshold a tone is still patterned. The tone becomes `0.5 + (tone − 0.5) / shading`, held between 0 and 1: at 50% a tone half way to the darkest or lightest is already solid. At 0 every tone is solid, which is Solid at the same threshold. |
| Scale | Checker, Hatch, Bayer, Noise | 1×, 2×, 3×, 4× | 1× | Each cell of the pattern is this many pixels wide and high. |
| Direction | Hatch | `/`, `\`, `—`, `\|` | `/` | Which way the lines run. `d` in Hatch's rule is `x + y`, `x − y`, `y` or `x`, each mod the spacing. |
| Spacing | Hatch | 3, 4, 5, 6 | 3 | How many pixels apart the lines are. With spacing `n` the cut-offs are `(n − d) / (n + 1)` for `d` from 0 to `n − 1`, which gives `n + 1` apparent tones. |
| Matrix | Bayer | 2, 4, 8 | 4 | The side of the ordered-dither matrix. The cut-offs are `(b + 0.5) / n²`, giving 5, 17 or 65 apparent tones. Each quarter of a matrix is the matrix of half its side times four, plus 0, 2, 3 and 1. |
| Diffusion | Atkinson | Atkinson, Floyd, Stucki | Atkinson | Where the error goes. Floyd is Floyd–Steinberg: 7/16 right, then 3/16, 5/16 and 1/16 below left, below and below right. Stucki spreads over twelve pixels in the two rows below, in parts of 42: 8 and 4 to the right; 2, 4, 8, 4, 2 below; 1, 2, 4, 2, 1 below that. Both hand on all of the error, where Atkinson drops a quarter. |
| Brightness | all but Lines and Silhouette | Luma, Value, R, G, B | Luma | What brightness is read from: the weighted mix given under "Conversion", the largest of red, green and blue, or one channel alone. The brightness range and the Auto values follow it. Differences between neighbouring pixels, which seams go by, are of the colors and do not change. |
| Opacity cut | all | 1 to 255 | 128 | Alpha below this is an empty pixel. |

- Brightness and Opacity cut change what the analysis finds, so every image is analysed
  again when they change, by the setting itself or by a change to a style that has other
  values for them. That reads every pixel of every image. While a slider is being dragged
  over a wall holding more than a million pixels in all, it waits until the slider rests
  or is let go, and the images follow then.
- In a picture smaller than its image (see "Images larger than their tile"), Scale
  shrinks with the picture: it is the setting times the picture's width over the image's,
  rounded, and at least 1. So the tile shows the pattern as coarse as the saved file has
  it, down to the finest the screen can show. A pattern finer than that looks the same
  on the tile at every scale, though the saved files differ.
- Thickness, Fill darks, Seams and Rim give each pixel of a smaller picture exactly what
  its image pixel is in the full conversion, as Lines and Cutout always do.
- The style previews on the style button and in the list of styles use each style's own
  settings.
- Settings are defined in `src/lib/settings.js`: `SETTINGS` describes each, and
  `STYLE_SETTINGS` lists each style's in the order they are shown.

## Remembered settings

The two colors, the style and every style's settings are saved in the browser on every change and
restored when the app opens. Nothing leaves the device.

- The colors are saved as they are, so a chosen palette, a swap and a custom color all come
  back. A palette is not saved by name; it shows as chosen because its colors match.
- Each style's settings are saved under the style's name, the threshold among them, as a
  number or as Auto.
- The view switch, the open panel, whether the tray is open and the images are not saved.
- They are stored as one JSON value under the `localStorage` key `bitify`. On the way back
  each value is checked on its own: a color must be `#rrggbb`, the style one of the nine,
  and each setting of each style one of its options or a whole number in its range (see
  "Each style's settings"). Anything else falls back to its default (Glow dark first,
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
  `-2`, `-3` and so on. With exactly one image on the wall there is no zip: the button reads
  "Download" and saves that one file, the same as the image's own Download.
- An animation saves as `<original name without extension>-1bit.gif`: every frame in the two
  chosen colors, empty pixels transparent, with the original frame delays and loop count.
  Download all puts GIFs and PNGs in the same zip.
- Saving always uses the bitified version, whatever the wall is showing.
- What is saved or copied is what was asked for: the images that were on the wall and the
  colors, style and settings that were set at the click or key press. A long job starts a
  moment later (see "Long jobs"), and a change made in that moment does not reach it.
- PNG files are encoded directly from the conversion, not through a canvas. Some browsers
  (Brave, Safari private browsing, Firefox strict mode) add noise when a page reads a
  canvas back, which would put stray colors in a saved file.
- A PNG lists its colors once, as a palette of three (empty, first color, second color, with
  the empty one transparent), and holds two bits for each pixel. The picture is exactly the
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
- Like saving, copying always uses the bitified version, whatever the wall is showing, and
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

Bitify can be installed as an app, and that is all: there is no service worker, the app
caches nothing itself, and it does not open offline. An installed copy loads from the site like a browser
tab does, so every deploy reaches it the same way.

- `public/manifest.webmanifest` gives the name, the standalone display, the dark background
  color for the title bar and the splash screen, and three icons. Its start address is
  relative, so it works under `/bitify/`.
- The icons in `public/` are made from the favicon, `public/favicon.svg`, by `npx @vite-pwa/assets-generator`
  (settings in `pwa-assets.config.js`): 192px and 512px, a 512px one with room for a mask,
  and a 180px one for iOS. The last two have the logo's orange behind them.
- `index.html` links the manifest and the iOS icon, and sets the browser's bar color to the
  page background, light or dark.
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
| `src/lib/bitify.js` | Pure conversion, no DOM. `analyze(imageData)` returns size, pixels, brightness, each pixel's difference from the pixel to its right and from the one below, whether any pixel is empty, the darkest and lightest brightness, and the auto thresholds; it takes what brightness is read from and the opacity cut. `mask(analysis, style, settings, width, height)` returns one byte per pixel (0 empty, 1 first color, 2 second color), for the whole image or, given a smaller width and height, for a picture of it that size. `shrink(imageData, width, height)` returns the pixels of the original that such a picture stands on. `colorize(mask, first, second)` returns RGBA pixels. |
| `src/lib/gif.js` | Reading an animated GIF into full frames (`decodeGif`) and writing a two-color one (`encodeGif`). No DOM. |
| `src/lib/save.js` | Output file naming, zip, PNG encoding from a mask and the two colors, single save, save all, copy to the clipboard. |
| `src/lib/settings.js` | Every setting a style can have and which each style has, their defaults, and `restore(text, styles)`, which reads what was stored back and checks each value. No DOM. |
| `src/lib/presets.js` | The list of palettes and the list of styles, whether two colors are a palette's, and stepping to the next or previous style or palette. No DOM. |
| `src/lib/gesture.js` | `wheelSteps()`, which turns the stream of wheel moves from a mouse or trackpad into single steps, and `sliderDrag()`, which says when a slider of the Style panel is being dragged and when it has come to rest. No DOM. |
| `src/App.svelte` | All state; top bar, wall, empty state, drop overlay, the Share sheet, messages; window-level drop, paste, key, wheel and swipe handling. |
| `src/Tile.svelte` | One image: canvas, caption, Copy, Download and Remove (Share and Remove on touch screens), hold to compare. Measures itself to pick the size of the picture it draws (see "Images larger than their tile"). |
| `src/Dock.svelte` | The dock and its two panels, with the tray and the chips of the style's settings. |
| `src/Pixels.svelte` | A canvas that shows a block of pixels; used by tiles and by the style previews. |
| `src/PixelIcon.svelte` | Renders a 7×7 glyph from a row-string map. |
| `src/app.css` | Every style rule, carried over from the prototype: color and type tokens for light and dark, and all component styles. Components have no style blocks of their own. |

State is a handful of `$state` values in `App.svelte`: the two colors, style, each style's
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
  within a batch), "Saving name…", "Saving 5 images…" for Download all, or "Copying name…".
  An animation counts all its frames, and Download all counts all the images together.
- A smaller job shows nothing. It is over before a message could be read.
- The job starts 50 milliseconds after the message, so that the message is drawn first.
  That wait is a timer, not a screen frame, because a hidden tab has no frames and the job
  would wait for the tab to be shown.
- The square is turned by a CSS animation of its rotation alone, which the browser runs
  without the page's help. It keeps turning while the job has the page stuck.
- The message replaces any other message while a job runs. If jobs overlap it is that of
  the newest one still running, and it goes when the last has ended.
- The message of a copy stays until the PNG has been made, not only its conversion.

## Errors and limits

- Undecodable files are skipped with a message; the rest of the batch still loads.
- If saving or copying fails, a message says so. Nothing else is lost.
- Conversion runs on the main thread. A change costs about as many pixels as the screen
  shows, however large the images are (see "Images larger than their tile"), so it stays
  quick on a phone, and a drag of a slider is kept quick by drafts (see "Drafts
  while a slider is dragged"). What still reads every pixel of a photo, and so
  pauses the page for a moment on a slow phone, is adding it, saving or copying it, and
  changing Brightness or Opacity cut, which analyses it again with no message. A
  message says so meanwhile (see "Long jobs"). Moving those to a worker is the upgrade path
  if that ever matters.
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

- `src/lib/bitify.js` is covered by unit tests on small hand-made pixel grids:
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
  - every worked example in `docs/styles.md` is exactly what the code draws;
  - Lines outlines an inner part as well as the silhouette, draws a one-pixel boundary,
    ignores a shading step below the threshold, frames only images that have empty
    pixels, and at Auto draws no lines along soft shading;
  - Cutout fills a bright part and leaves a dark one dark, cuts a one-pixel seam between
    two parts of the same tone, rims a dark part on the silhouette, keeps a dark outline
    around a light part, never cuts a light pixel on the silhouette, and rims only images
    that have empty pixels;
  - Silhouette fills everything;
  - a smaller picture has, in Cutout, Lines, Solid and Silhouette, exactly the full
    conversion's value at the image pixel under the middle of each of its pixels, and
    shrinking the original gives the same pixels of it;
  - at every size the patterns and Atkinson come out as light as the full conversion, and
    keep empty pixels empty;
  - an image with a fine regular texture (dithered art, one-pixel stripes, a stippled
    transparency) comes out as light as it is at the sizes a tile could have;
  - Auto returns a value between two clearly separated groups.
- `src/lib/save.js`: output naming, including duplicates; a PNG holds the palette and
  exactly the given pixels, packed two bits each.
- `src/lib/settings.js`: stored settings come back unchanged; missing or damaged text gives
  the defaults; a single unusable value is replaced on its own.
- `src/lib/layout.js`: besides the wall's fit, the size of the picture a tile draws: the
  whole image when the tile has room, the tile's own size for a larger image, smaller for
  a draft that would otherwise run over its budget, never a draft for an image drawn whole,
  a little smaller where it would be a whole number of times smaller than the image, and
  never fewer than 32 pixels on the shorter side.
- `src/lib/presets.js`: styles and palettes step forward and back and wrap at both ends; a
  palette is found either way round; the user's own colors stay as a stop after the presets.
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

# Performance

How Bitify stays fast with big images on phones: what was slow, what was changed and why,
what was measured, what was tried and thrown away, and what is still open. It is the record
of the performance work of October 2026 (commits `e1eccfd` to `6d6e37f`, on top of
`ce7bffa`), written so that the work can be continued without anything but this file, the
code and the spec.

The rules of behavior are in the spec,
[superpowers/specs/2026-10-06-bitify-app-design.md](superpowers/specs/2026-10-06-bitify-app-design.md),
in the sections "Images larger than their tile", "Drafts while a slider is dragged" (which
since covers every slider of the Style panel, not only the threshold's), "Long jobs", and parts of "Adding images", "Saving", "Copying" and "Errors and
limits". This file explains the reasons and holds the numbers.

## Icon preparation (October 8, 2026)

### Small-sprite cavities and openings

Small transparent components (at most 1,024 source pixels in a 64×64 box) now use
`src/lib/icon-glyph.js` for Auto and Keep. Larger/opaque inputs and Trim keep the previous
linear groove path. The outer component flood and two-byte cached result are unchanged.
The new bounded scratch space is under 128 KiB per component and is discarded after
preparation. Arrays are typed and allocated per component, never per pixel. Opening work
allows at most 128 unique straight paths; overflow conservatively keeps the contour.
Moving Detail still samples the cache, without rerunning the detector.

Separate-process measurements are in
[integration-performance-before.json](../bench/icon-research/integration-performance-before.json)
and [integration-performance-after.json](../bench/icon-research/integration-performance-after.json).
For all 65 actual 16px items together, fresh preparation was 2.782 ms before and 6.263 ms
after; cached updates were 0.226 and 0.289 ms. These are desktop best-of-five timings.
The extra preparation buys whole cavities and selected edge openings rather than the old
filled helmet results. The large opaque stress path has identical output and no additional
per-pixel scratch; single-pass times varied substantially (including roughly twice as long
at 512² and 2048² after the inventory warm-up). The new small-sprite path does not warm
the old large-input loops. These figures are not a speedup claim or phone measurements.
`node bench/bench.mjs` also ran before and after. The earlier figures below describe the
original Icon implementation and are retained as historical measurements.

Icon adds a separate structural preparation in `src/lib/icon.js`. It is lazy and is not
run for any other style. `Tile.svelte` prepares it before timing the mask loop, like
Stencil, so the slider's draft decision measures the cached conversion. Every outline
choice is cached on the analysed image as two byte arrays: body membership and minimum
Detail. Moving Detail samples these arrays; colors only repaint. Saving and copying use
the full-source mask. Brightness/alpha changes produce a fresh analysis and cache.

Preparation uses linear component floods, constant-size connectivity lookups and ranked
linked buckets. It allocates 13 temporary bytes per source pixel plus 2 cached bytes per
outline choice, in addition to the existing source/analysis/mask. No pixel creates an
array or object. Three cached outline choices can retain 6 bytes per pixel. Large inputs
still have a synchronous first pass and significant temporary memory demand.

`node bench/icon-research/bench-icon.mjs` measured 65 actual 16×16 inventory items at
2.898 ms for fresh preparation and 0.220 ms for a cached Detail update on this desktop
(best of five after warming the engine). A noisy, fully opaque stress image took:

| Source size | First Icon pass | Cached full mask |
|---|---:|---:|
| 512×512 | 34.1 ms | 0.86 ms |
| 2048×2048 | 580.8 ms | 13.0 ms |
| 4000×3000 | 3224.1 ms | 76.3 ms |

Stress results are single passes, not a phone benchmark. Icon is intended for inventory
sprites. `node bench/bench.mjs` was run before and after; unchanged conversion branches
showed ordinary shared-machine variance, rather than a consistent regression. All ten
existing styles matched `bench/bitify.old.js` in 24,000 image/style/threshold cases,
including sampled pictures, using `node bench/equiv.mjs`. The old baseline remains local
and untracked.

## Stencil median cap (October 8, 2026)

The brightness guard in `mask` now compares each pixel with its sprite's cached interior
median, rather than disabling all brightness cuts when the requested cutoff reaches that
median. Sprite preparation, caching, sampling and allocations are unchanged. Original
Otsu Auto selection is retained; the proposed recursive Auto split is not shipped.

`node bench/bench.mjs bench/bitify.old.js` and `node bench/bench.mjs` compared commit
`7c0437d` with the cap, best of three on this desktop:

| Stencil input | Before, cached | After, cached | Before, first pass | After, first pass |
|---|---:|---:|---:|---:|
| 512×512 opaque | 3.7 ms | 3.8 ms | 3.9 ms | 3.9 ms |
| 512×512 sprite | 4.3 ms | 4.4 ms | 8.5 ms | 8.6 ms |
| 2048×2048 opaque | 113.0 ms | 111.4 ms | 109.8 ms | 115.8 ms |

Larger/shared-machine timings varied substantially, including unchanged branches. These
runs support no speedup claim and are not phone measurements. The cap adds no allocation
or preparation work. `bench/equiv.mjs` verifies 24,000 byte-identical combinations for
the ten unchanged styles, plus exact preview sampling for 2,400 Stencil cases. The unit
suite sweeps all 65 AI items through Cuts 0–254 in 30 brightness/outline/edge configurations.
The historical guard comparison is reproducible with
`node bench/icon-research/stencil-guard.mjs`, which loads its baseline from Git `7c0437d`.

## The rules that must hold

Two were set by the owner. The rest are what the work depends on.

1. **Saving, downloading and copying are always full quality.** Every pixel of the image is
   converted, whatever is on screen, also in the middle of a slider drag. A palette PNG
   counts as full quality. No path from a button or a key may reach a tile's smaller picture.
2. **The slider's draft has no race, its timer is always stopped or started again, and
   nothing leaks.** There is one timer at most; every move and every end of a drag stops it
   first.
3. **Performance-only changes preserve conversion.** `mask` with no size is byte-identical
   to the old `mask`. Intentional algorithm changes must update the spec and tests; the
   equivalence harness checks unaffected styles and exact structural preview sampling.
4. **The loops in `src/lib/bitify.js` make nothing per pixel**: no array, no object, no
   function. They run once for every pixel of a photo, on phones.
5. **Work per change follows the screen, not the file.** Only adding an image, saving and
   copying may go through every pixel.

## What was wrong

Measured before any change, on a desktop, with Node (`bench/bench.mjs`) and in a browser
with the processor slowed down:

1. **The conversion loops made things for every pixel.** Cutout, the default style, built a
   small array of the eight neighbours for each pixel and ran closures over it. It took
   3.0 s for a 12-megapixel image on a desktop, 0.57 s for 4 megapixels.
2. **Every change converted every pixel of the file.** A change of color, style or
   threshold made a full mask, a new copy at four bytes per pixel, and pushed it into a
   full-size canvas, whose size was also set again each time (which reallocates it). The
   browser then shrank that canvas to a tile about 1000 screen pixels wide. For a
   12-megapixel photo on a phone, 15 of every 16 pixels converted were never shown.
3. **Saving copied the image at four bytes per pixel** and compressed all of it: 3 s for 12
   megapixels on a desktop.

In a browser with the processor slowed 4 times, a 12-megapixel photo in Cutout took 25 s to
add and 13 s for every move of the threshold slider.

## How it works now

### Analysis (`analyze` in `src/lib/bitify.js`)

Done once when an image is added. It goes through every pixel, because the Auto thresholds
are picked from all of them.

- One pass works out the brightness of each pixel, the histogram of brightness, and each
  pixel's color difference from the pixel to its right and from the one below. The
  differences are kept, one byte each, in `right` and `down`.
- A second, cheap pass (`seamStrength`) picks Cutout's seam strength. It needs the Auto
  threshold from the first pass, so it cannot be part of it. It reads only brightness and
  the stored differences.
- **Why the differences are kept.** Lines and Cutout asked for them at every pixel on
  every threshold change, and working them out from RGBA is most of their cost. Without the
  two arrays Cutout is about 2 times slower and Lines about 3 times (measured by a
  reviewer). They cost 2 more bytes per pixel of memory.
- An image holds 7 bytes per pixel in all: 4 of RGBA, 1 of brightness, 2 of differences.
  That is 84 MB for a 12-megapixel photo. One that has been shown in Stencil holds 3 more
  (see "Conversion").
- For an image with no empty pixel, `mask` never reads the RGBA array (`opaque`), which
  keeps a photo's conversion to the three small arrays.

### Conversion (`mask`)

`mask(img, style, threshold, mw, mh)`. With no size it converts the whole image. With a
smaller `mw` by `mh` it converts a smaller picture of the image, which is what a tile draws.

- **Where the picture's pixels fall.** Pixel `i` of `m` across `n` image pixels stands for
  image pixel `floor((i + 0.5) * n / m)`, the one under its middle (`spread`). The spacing
  is whatever that comes to. It is deliberately not a whole number. See "Whole-number
  steps" under what was thrown away: this is the most important lesson of the work.
- **Cutout, Solid, Stencil, Lines, Silhouette** give each pixel of the picture exactly what its
  image pixel is in the full mask, worked out from that pixel's real neighbours in the full
  image. The picture is the full result with pixels left out.
- **Checker, Hatch, Bayer, Noise and Atkinson are drawn afresh on the picture's pixels.**
  The pattern's tile is counted in the picture's pixels, and Atkinson passes its error from
  one of the picture's pixels to the next. Their look comes from how neighbouring pixels
  alternate, and pixels picked out of a pattern do not alternate as the pattern does (every
  second pixel of a checkerboard is one color). The tile is as light and dark as the saved
  file, with a pattern at the scale of the screen; the file's own pattern is finer.
- **Tone** for the pattern styles is read from a table of 256 entries, made once per call,
  not worked out per pixel. The four patterns are small tables of cuts (`TILES`), 2, 3, 4
  and 16 pixels square.
- **Atkinson** keeps its running values for three rows at a time, not for the whole image.
  That saves 4 bytes per pixel on each conversion. It did not make it faster.
- **Colors** (`colorize`) are written one whole pixel at a time through a 32-bit view.

Cost per pixel converted, desktop, Node: Solid 1.3 to 2.5 ns, the patterns 3 to 6, Lines 8
to 12, Cutout 14 to 20. It is about the same at every picture size.

- **Stencil judges each sprite on its own**, so it first needs to know every sprite:
  `sprites` walks each one once and keeps three bytes per pixel with the analysed image
  (its outline level, what Auto cuts up to, and the median brightness of its inside), so
  the walk is done once however often the settings change. `spritesOf` does it the first
  time it is asked, not `analyze`, so an image never shown in Stencil never pays for it,
  and a tile's smaller picture reads the same arrays.
  - A photo has no empty pixel and skips the walk.
  - The walk holds five more bytes for every pixel while it runs: 60 MB for 12 megapixels.
  - In Node on a desktop the first Stencil mask of a 2048 by 2048 image with see-through
    parts took about 80 ms longer than the ones after it, and of a 4000 by 3000 one
    between 0.3 and 1.3 s longer, the most on a machine that was busy. `node bench/bench.mjs` shows it as "stencil first".
  - The walk is not part of a tile's `pace`: `Tile.svelte` asks for the sprites before it
    starts its clock, so the first drag of a slider in Stencil is drafted no rougher than
    the next.
  - **Not solved:** a very large see-through image stalls a phone for some seconds the
    first time it is shown in Stencil. That is also paid when Stencil is only stepped
    past, since it is third in the list, and again after each change of Brightness or
    Opacity cut, which analyses the image afresh. A cap on size was turned down: above it
    a large sheet of sprites would be judged as one sprite, which is the case the walk is
    for.

### What a tile draws (`shown` in `src/lib/layout.js`, used by `src/Tile.svelte`)

A tile measures the square its image sits in and asks `shown` for the size of the picture
to draw.

- **An image no larger than the tile's screen pixels is drawn whole.** That covers every
  sprite. It is then exactly what is saved.
- **A larger image is drawn at the tile's own size**: the image area's width in CSS pixels
  (the square less 8px on each side) times the device pixel ratio, along the longer side.
- **A picture a whole number of times smaller than the image, or within 0.04 of that, is
  made 6% smaller.** See "Whole-number steps".
- **The shorter side keeps at least 32 pixels**, or all the image has. A long thin image
  was otherwise drawn up to 30% too tall once its few rows were rounded.
- **During a drag of the threshold slider** a smaller picture may be drawn. See "Drafts".

In `Tile.svelte`:

- `size` is the pair from `shown`; `mw` and `mh` are derived from it one each, so that
  working `size` out again to the same numbers redraws nothing.
- `masks`, `colored` and `originals` are caches, one entry for each frame. A frame is
  converted when it is first shown and kept until what it depends on changes: a mask until
  the style, threshold or size changes, colored pixels until a color changes too. So a
  color change reuses the masks, and an animation converts one frame at a time as it
  plays, not all frames on every change.
- The original is shown as the same picture (`shrink`), so comparing moves nothing.
- `pace` is how long the tile's last conversion took, in milliseconds per pixel. It is a
  plain variable, set inside the derived value that converts.
- A square of 16px or less has not been laid out yet, and nothing is converted for it.
- `src/Pixels.svelte` sets the canvas's size only when it changes.

### Drafts while the threshold slider is dragged

On the Pixel 8 Pro a full redraw of a photo's tile in Cutout takes 60 to 80 ms. That is too
slow to follow a finger. On a slow phone it is several times more.

- While the slider is dragged the wall has `DRAG_MS` = 24 ms for each move, shared equally
  between the tiles (`budget` on `<Tile>`).
- A tile whose picture would take longer than its share, by its own `pace`, draws a
  smaller one: the image scaled by `sqrt(share / (width * height * pace))`. It does not
  classify the device. It times this image, in this style, on this device.
- **An image drawn whole is never drafted**, however slow. A draft would drop pixels the
  screen was showing, which for pixel art is wrong, not rough. Twelve sprites on the Pixel
  therefore take 33 ms per move and are left at that.
- The size of the draft is fixed for the drag (`pace` is not reactive), so the detail does
  not flicker during it.

When it is a drag is decided by `sliderDrag` in `src/lib/gesture.js`, wired in
`src/Dock.svelte`:

- A drag is moves with a pointer pressed (`pointerdown`, then `input`). The arrow keys and
  the number box move the threshold with no pointer pressed and never draft.
- It ends on `change`, `pointerup`, `pointercancel` or `blur`, and when the Style panel
  closes, which takes the slider away with its events.
- **It pauses when the slider has rested for 150 ms** with the pointer still down: the
  image sharpens under the resting finger, and the next move makes it a drag again. This
  was the owner's choice among four designs.
- **The rest is timed from the end of the redraw**, not from the move. `sliderDrag` is
  given `tick` from Svelte, which settles once the wall has converted and drawn. Timed from
  the move, a device that needs longer than 150 ms to redraw would be taken for a resting
  finger at every move, and would redraw at full detail each time.
- Real touch on Chrome for Android gives one `pointerdown`, the `input` events, one
  `pointerup` and one `change`. There is no `pointercancel` in a normal drag.

Known behavior that follows from this design, left as it is: a touch that lands off the
slider's thumb starts with one full redraw (the first `input` comes at touch-down, and the
browser holds the next moves until the finger has travelled); a slow, careful drag shows
rough then sharp at each step; if the finger moves on while an image is sharpening, that
move waits for it; and the original is drafted too when compared in mid-drag.

### Long jobs (`during` in `src/App.svelte`)

Adding, saving and copying a photo go through every pixel on the main thread, and the page
can do nothing else meanwhile.

- A job of `BUSY_PIXELS` = 2,000,000 or more first shows a message in the toast with a
  spinner: "Reading name…", "Downloading name-1bit.png…", "Downloading bitify.zip (5
  images)…", or "Copying name…". Every download also shows its output filename in the toast
  for smaller jobs, without a spinner.
- The job starts 50 ms after the message (`drawn`), so that the message is on screen
  first. **That wait is a timer, not a screen frame**: a hidden tab has no frames, and a
  job waiting for one would wait until the tab was shown.
- **The spinner (`.spin` in `src/app.css`) is a CSS animation of rotation alone.** The
  browser runs such an animation without the page, so it keeps turning while the job has
  the page stuck. It turns at an even speed: WebKit may not run a stepped one that way.
  Seen turning on Chrome for Android; not checked on Safari.
- **What is saved is what was asked for.** `asking()` takes the colors, style and threshold
  at the click, and Download all takes the list of images then too. The job that starts
  50 ms later uses those, whatever has changed since.
- **A copy asks the clipboard at once and hands it the PNG later.** Safari only allows
  `navigator.clipboard.write` inside the click, so `copyOne` is called in the click with a
  promise of the PNG (`pngBlob`), which is made inside the job the message covers.
- `working(text)` puts a message up and returns what ends it. If jobs overlap, the message
  is that of the newest one still running.

### Adding images (`addFiles` in `src/App.svelte`)

- Images of a batch are read one after another. A photo goes on the wall as soon as it is
  read.
- **Images read within a quarter of a second of each other go on the wall together.**
  Putting each sprite on by itself refitted the whole wall every time, which for 120
  sprites took up to three times as long as adding them at once.
- A batch keeps its "Reading 2 of 5…" message from its first large image until it ends.
- **Remove all stops a batch that is still being read** (`emptied` counts the times; a
  batch checks after every wait).
- The full-size canvas used to read an image is given back at once (`canvas.width = 0`).
  iOS limits how much memory all canvases may hold.

### Saving (`src/lib/save.js`)

- **A PNG is written straight from the mask** as a palette image: color type 3, 2 bits per
  pixel, a palette of three entries (empty, first color, second color) and a `tRNS` chunk
  that makes the first one transparent, and a color that is None with it. That is a sixteenth of the data to compress, and
  the image is never held as RGBA.
- zlib level 3. Level 6 is twice as slow for a file 4% smaller.
- Download all converts and encodes one image at a time, so only one full mask is in
  memory at once.
- GIFs were always palette images. Nothing changed there.

Encoding a 12-megapixel Cutout image, desktop:

| Form | Time | Size |
|---|---|---|
| RGBA, level 6 (before) | 1560 ms | 1175 kB |
| RGBA, level 1 | 617 ms | 1666 kB |
| 2 bits per pixel, level 6 | 262 ms | 763 kB |
| 2 bits per pixel, level 9 | 676 ms | 744 kB |
| 2 bits per pixel, level 3 (now) | 131 ms | 797 kB |

### Memory

- A removed image used to be kept by the Share sheet, which remembers the image it was
  last opened for. An effect in `App.svelte` now lets it go.
- After garbage collection, removing all images returns image memory, elements and
  listeners to where they were (`bench/leak.mjs`).

## What was measured

### On a real phone

Pixel 8 Pro, Chrome 154, driven over USB with real touch input, at the phone's own speed.
Old build (`ce7bffa`) to new (`6d6e37f`). Best of 2 or 3 runs. Milliseconds.

| Scenario | Add image | Change style | One slider move | Save | Memory in use (MB) |
|---|---|---|---|---|---|
| Sprite 256 by 256 | 79 to 60 | 55 to 19 | 14 to 5 | 65 to 30 | 14 to 13 |
| 12 sprites 256 by 256 | 357 to 169 | 133 to 71 | 80 to 33 | 178 to 74 | 30 to 45 |
| Photo 4 MP, Cutout | 1727 to 384 | 943 to 79 | 1273 to 20 | 1383 to 248 | 98 to 61 |
| Photo 12 MP, Cutout | 4698 to 1112 | 2459 to 60 | 3657 to 19 | 3787 to 592 | 273 to 117 |
| Photo 12 MP, Solid | 952 to 847 | 193 to 27 | 138 to 10 | 1524 to 239 | 273 to 111 |
| Photo 12 MP, Lines | 2585 to 855 | 708 to 44 | 1668 to 7 | 1080 to 309 | 273 to 141 |
| Photo 12 MP, Bayer | 1189 to 843 | 274 to 30 | 203 to 12 | 1160 to 241 | 273 to 111 |
| Photo 12 MP, Atkinson | 2227 to 890 | 1350 to 49 | 1200 to 14 | 4164 to 427 | 290 to 117 |
| 6 photos of 4 MP, Cutout | 7822 to 1308 | 3522 to 55 | 3136 to 30 | 7851 to 1100 | 441 to 190 |
| Photo 12 MP, Cutout, phone slowed 4 times more | 19260 to 3080 | 6974 to 103 | 15066 to 24 | 17286 to 2106 | 228 to 111 |

"One slider move" is the time from a move reaching the page to the last tile being
redrawn. "Memory in use" is before garbage collection; after a forced collection the
sprite rows are level with the old build. The picture a 12-megapixel photo's tile draws on
this phone is 900 by 675, and about 600 by 450 while dragging in Cutout. The raw figures
are in `bench/matrix-device.txt` (old and an earlier new build) and
`bench/final-device.txt` (the final build).

### By part

| Part | Measured on | Before to after | Gain |
|---|---|---|---|
| Flat loops and stored differences, Cutout | Desktop, whole 4 MP image | 566 to 87 ms | 6.5 times |
| the same, Lines | the same | 244 to 52 ms | 4.7 times |
| the same, Atkinson | the same | 486 to 52 ms | 9.3 times |
| the same, Solid and the patterns | the same | 29 to 54, to 15 to 21 ms | 1.9 to 2.6 times |
| the same, coloring | the same | 31 to 3.5 ms | 9 times |
| the same, analysis | the same | 159 to 86 ms | 1.9 times |
| Tiles draw at the size of the screen | Pixel, 12 MP | 12 MP to 0.61 MP converted per change | 20 times fewer pixels |
| The two together | Pixel, 12 MP Cutout, change of style | 2459 to 60 ms | 41 times |
| Drafts | Pixel, 12 MP Cutout, a slider move against a full redraw | 60 to 19 ms | 3.2 times |
| Palette PNG | Pixel, 12 MP Cutout, save | 3787 to 592 ms | 6.4 times, files 35 to 45% smaller |
| Analysis, and no full-size first draw | Pixel, 12 MP Cutout, add | 4698 to 1112 ms | 4.2 times |
| Memory | Pixel, 12 MP | 273 to 117 MB | 57% less |

Whole 12-megapixel image on a desktop, Node, before to after: analysis 746 to 243 ms,
Cutout 3043 to 247, Lines 706 to 151, Solid 82 to 42, Atkinson 1334 to 149, coloring 84
to 9.

### Checks that passed on the final build

- `npm test`: 115 tests at the time.
- `bench/equiv.mjs`: `analyze`, `mask` and `colorize` byte-identical to the old code on
  400 random images, 9 styles, 6 thresholds; a smaller picture is the full mask at the
  image pixels its pixels stand for.
- `bench/tone.mjs` and `bench/alias.mjs`: at every picture size each style is as light as
  the full conversion, also for dithered art, stripes and a stippled transparency, also on
  tiles exactly a half, third or quarter of the image.
- `bench/saved.mjs`: a photo saved and copied in the old build and the new, at Auto and in
  the middle of a drag, in all nine styles, is full size and identical pixel for pixel.
- `bench/leak.mjs`: five rounds of add, every control, save and remove, each followed by a
  forced garbage collection, return to the same memory, elements, listeners and file links.
- On the phone: draft while moving, full while the finger rests, a draft again on moving,
  and a file saved in the middle of that is the full 4000 by 3000.
- By a reviewer: a real clipboard write in Edge is identical to the saved file; an
  animation plays, drafts and saves at full size; `sliderDrag` under 1,500 random orderings
  of moves and late redraws never has two timers or one left over; and in Firefox 157 the
  palette PNG decodes to the old pixels and the clipboard accepts the promised image.

## What was tried and thrown away

### Whole-number steps (the mistake to remember)

The first version of the tile took every k-th pixel of every k-th row, with k a whole
number. It looked exact and it was cheap. It was wrong twice, and neither the author's
tests nor a check of 21,600 cases against the old code saw it, because they all proved
that the tile equalled the full mask sampled, which was the fault itself.

1. **It collapsed the pattern styles.** A pattern that repeats every 2, 3, 4 or 16 pixels,
   sampled every k pixels, gives the same few cells each time. On a photo, Bayer showed
   98% light where the saved file is 51%; Checker 82% at even k; Hatch 19% at k of 3. Found
   by the first review. Fixed by drawing the patterns and Atkinson afresh on the picture.
2. **It locked onto any fine regular texture in the image itself, in every style.** Art
   already dithered to black and white came out 97% light where the file is 50%; one-pixel
   stripes came out one color; a stippled transparency lost its midtones. It also kept
   lines and seams in enlarged pixel art on the left and top of each art pixel only. Found
   by the second review. This matters for this app, since dithered art is a likely input.

Before the work the browser shrank the whole conversion at whatever ratio the tile gave,
which does not lock on. The fix is the same: spread the picture's pixels evenly at
whatever spacing comes, and step off a whole-number ratio where the tile happens to give
one.

It had a third cost. With k rounded down, an image between one and two times its tile had
k of 1: it was converted whole on every slider move and, being "shown whole", never
drafted (507 ms per move for a 1900-pixel image on a slowed phone, 30 ms after the fix).

**The test to trust is a picture's brightness against the full conversion's, on images
with a texture, not equality with a sample.**

### Holding changes back to one per screen frame

Setting changes were applied in `requestAnimationFrame`, so that several slider moves in
one frame would cost one conversion. It made a slider move slower, 76 ms to 126 ms at 4
times slowdown, and a palette change went from 6 ms to 155 ms: every change waited one or
two frames. Browsers already report a slider's moves once per frame, and while a
conversion runs they merge the moves that arrive, so conversions never queue up behind
each other. Removed.

### Other ways to shrink, considered and not taken

- **Random offsets within each block** would break the locking, but make every straight
  edge ragged by a pixel, which is worse for the common case.
- **Averaging blocks of the image before converting** is the proper way to shrink, and
  would remove the bands a shrunken texture shows. But the Auto thresholds and Cutout's
  seam strength are picked from full-size differences and would not fit an averaged
  image, and Lines and Cutout would draw features several times thicker than the file's.
- **Averaging the full conversion** is the most faithful picture of the saved file, and
  needs a full conversion on every change, which is the cost the work removed.

### A worker

Not done. Conversion, analysis and saving all run on the main thread. A worker is the only
way to full quality on every slider move with a smooth thumb, and to a page that stays
alive while a photo is read or saved. It makes loading, drawing, saving and copying
asynchronous, needs the image data copied to the worker or moved there, and has to be
tried on iOS. It was left as the upgrade path. Analysis is the easiest part to move,
since adding is already asynchronous; it would not make it finish sooner.

### Smaller things

- **Auto thresholds from a sample of the pixels** would make adding a photo several times
  faster, but the thresholds would no longer be exactly those of the full image, and the
  per-pixel arrays would have to be made on the fly, which makes every conversion slower.
- **Other ways of writing the difference** between two pixels (comparisons in place of
  `Math.max`, bit tricks, reading pixels as 32-bit words): none was faster than
  `Math.max` of three `Math.abs`. Reading pixels as words was 15% faster in one test, not
  worth what it does to the code.
- **Folding the seam pass into the first pass** needs two tables of 256 by 256 counts and
  would save at most a quarter of the analysis.
- **Grouping a batch's images over a tenth of a second** still left 120 sprites slower to
  add than before. A quarter of a second brought them level.
- **Not ending the drag on `pointercancel`** was meant to keep drafts going if a browser
  cancelled the pointer in mid-drag. No browser tried does that, and it left the drag to
  be ended by the rest timer. It ends on cancel now.

## What is left

1. **Safari and iOS have not been run at all.** Chrome on Android and on a desktop, Edge,
   and headless Firefox have. Unverified on Safari: the clipboard being handed a promise
   of the image, the spinner turning while the page is busy, and real touch on the slider.
2. **Adding and saving a photo still stall the page**: about 1.1 s and 0.6 s for 12
   megapixels on the Pixel. A message shows, but nothing else responds. A worker is the fix.
3. **Memory is 7 bytes per pixel per image, and 10 for one that has been shown in Stencil.** Of the 84 MB a 12-megapixel photo holds, 48
   are its RGBA pixels, which after analysis are read only for the compare view and for
   transparency. Letting them go, and reading the file again to compare, would more than
   halve it. Several photos can still exhaust a phone.
4. **Images above about 16.7 megapixels cannot be read on iOS**, because reading uses a
   canvas of the full size. Not changed by this work.
5. **A tile's picture is a sample, not an average.** An image with a fine regular texture
   shows bands when drawn smaller, as it did before the work. The saved file has none.
6. **For the patterns and Atkinson a large image's tile is not a sample of the saved
   file**: as light and dark, but with the pattern at the scale of the screen.
7. **Saved PNGs open in indexed-color mode** in image editors. The pixels are identical.
8. **Zooming in with two fingers does not reveal more detail** in a large image's tile.
9. **`devicePixelRatio` is read without being watched.** Moving the window to a screen of
   another density leaves a tile's picture at the old size until the tile resizes.
10. **The draft's speed estimate is one earlier conversion.** A tile that has never
    converted is not drafted on its first drag. On a browser with a coarse clock (Firefox
    with fingerprint resistance) the estimate would be poor.
11. **The benchmark image is synthetic**: smooth shapes with grain and a 64-pixel grid,
    saved as a JPEG. Real photos, sprite sheets and dithered art have not been timed.

## The reviews

Three independent reviews were run, each told to assume the work was wrong. All three
found things the author's own checks had passed.

- **First, a Claude subagent, on an early version.** One blocking bug: the pattern styles
  collapsing at whole-number steps. Also: Atkinson walked every pixel on each change;
  sprites could be drafted; the drag could stick when the Style panel closed; the step
  formula was untested and in the component; thin images were drawn too tall; the canvas
  used to read an image was never freed.
- **Second, Codex.** One blocking bug: a stippled transparency lost its midtones, which
  led to the wider fault of whole-number steps. Also: a long save or copy read its
  settings and images after its 50 ms wait, not at the click; Remove all did not stop a
  batch being read; the drag did not end on `pointercancel`; a copy's message was
  withdrawn before the PNG was made; the message of overlapping jobs could be a finished
  one's.
- **Second, a Claude subagent, on the same version.** The same six, and: an image between
  one and two times its tile was converted whole on every move; adding 120 sprites took
  two to four times as long; the spinner turned in steps; lines in enlarged pixel art were
  kept on two sides only; the "Reading" message blinked between the photos of a batch.

Everything they found that was a defect is fixed. A review is worth running again after
any change to `mask`, `shown`, `sliderDrag` or `during`.

## Measuring

The scripts are in `bench/`. They need Node 22 or later, and Microsoft Edge or Chrome for
the ones that open a browser (set `BROWSER` to its path if it is not at the default Edge
location).

| Script | What it does |
|---|---|
| `bench.mjs` | Times `analyze`, `mask` in every style, `colorize` and `pngBytes` on whole images, in Node |
| `equiv.mjs` | Checks the conversion against an earlier copy of `bitify.js` saved as `bench/bitify.old.js` |
| `kcost.mjs` | Cost per pixel converted at several picture sizes |
| `tone.mjs` | Each style's brightness and texture at several picture sizes, on a smooth image |
| `alias.mjs` | The same for dithered art, stripes and a stippled transparency, at the size each of several tiles would draw |
| `png.mjs` | Time and size of the ways of writing a PNG |
| `live.mjs` | Drives a build of the app in a real browser or on a phone, and times adding, style changes, a real slider drag and saving |
| `matrix.mjs` | Runs `live.mjs` over a list of scenarios for an old and a new build |
| `final-device.mjs` | Runs `live.mjs` over the scenarios for one build on a phone |
| `saved.mjs` | Saves and copies a photo in two builds and compares every pixel of the files |
| `leak.mjs` | Adds, uses and removes images in rounds and measures what is still held |

Before a change to the conversion:

```bash
cp src/lib/bitify.js bench/bitify.old.js && node bench/bench.mjs
```

After it:

```bash
npm test && node bench/equiv.mjs && node bench/tone.mjs && node bench/alias.mjs && node bench/bench.mjs
```

To compare two builds in a browser, build each next to the scripts. The old one comes
from a commit, with `node_modules` linked in:

```bash
mkdir bench/baseline && git archive ce7bffa | tar -x -C bench/baseline && cmd //c mklink //J "bench\\baseline\\node_modules" "node_modules" && (cd bench/baseline && npx vite build --outDir ../dist-base --emptyOutDir) && npx vite build --outDir bench/dist-new --emptyOutDir
```

Remove that link with `cmd //c rmdir bench\baseline\node_modules` before deleting the
folder. Deleting the folder with the link still in it can delete the real `node_modules`.

Then, from inside `bench/`:

```bash
node live.mjs dist-new w=4000 h=3000 cpu=4 style=cutout steps=20
```

```bash
node saved.mjs dist-base dist-new
```

```bash
node leak.mjs dist-new
```

`live.mjs` options: `w`, `h`, `cpu` (slowdown), `style`, `steps` (slider moves), `count`
(copies of the image to add), `profile` (`phone`, `tablet`, `desktop`), `kind` (`photo`,
`sprite`). `HEADLESS=1` hides the window; `PROFILE=1` adds a processor profile of the
drag; `SHOTS=name` saves screenshots during the drag and after release; `BUSY=name` saves
two during the read; `TRACE=1` prints each stage as it is reached.

### On a phone

An Android phone with USB debugging on, Chrome open and the screen awake:

```bash
adb forward tcp:9555 localabstract:chrome_devtools_remote
```

```bash
cd bench && DEVICE=9555 node final-device.mjs dist-new
```

If nothing answers on that port, another Chromium browser (Brave, on the owner's Pixel)
holds the usual socket while frozen in the background. Chrome's own is then
`chrome_devtools_remote_<Chrome's process id>`; `adb shell cat /proc/net/unix | grep
devtools` lists them. `live.mjs` opens a tab of its own and closes it, serves the build
from this machine through `adb reverse`, and uses real touch events.

### What to know about the measurements

- **Slowing the processor in a desktop browser is not a phone.** It does not slow memory
  or the graphics chip. For a 12-megapixel photo in Cutout, a desktop slowed 4 times took
  2.5 s to add it and 1.6 s to save it; the Pixel 8 Pro at its own speed took 1.1 s and
  0.6 s. Measure on the phone.
- **The machine is shared with other work**, and runs vary by up to 2 times. The scripts
  keep the best of several runs.
- **Time one way of writing a loop per process.** Timing several variants of a function in
  one process makes the later ones slower, because the engine has stopped trusting what
  it learned from the first. An early comparison was wrong for this reason.
- **A headless browser sometimes stops answering.** The scripts wait for the app to load,
  try the connection again, and `saved.mjs` gives each style a browser of its own. If a
  script prints nothing, run it again.
- **The browser cannot hand over a screenshot while the page is busy.** To see the page
  during a long job on a phone, `live.mjs` photographs the screen through `adb`.
- **A tile needs a drawn frame to learn its size.** In a browser pane that is not being
  shown, tiles stay unmeasured and report a canvas of 1 by 1 or none.
- **`npm test` may count tests twice**, if a copy of the sources (a worktree, or a
  `bench/baseline`) lies inside the repository. `npx vitest run src/lib` does too. Delete
  the copy.

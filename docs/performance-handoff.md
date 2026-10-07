# Performance work: record and handoff

Written 2026-10-07, after three reviews. It says what was asked, what changed, what was
measured, what each review found, and what is still open. A new reviewer should challenge
it, not confirm it.

## What was asked

Bitify was unusable with big images on phones and tablets. The owner asked for it to be
made many times faster, measured in a real browser and on a real phone, with performance
put first but **without unwanted downsides**. Two rules the owner has stated outright:

- Saving, downloading and copying must always be full quality. A palette PNG is fine.
- The slider's draft must have no race, its timer must always be stopped or started again
  properly, and nothing may leak.

## The commits

On `main`, on top of `ce7bffa`:

| Commit | What |
|---|---|
| `e1eccfd` | The performance work: flat loops, tiles convert only what they show, drafts, palette PNG |
| `27eda94` | A removed image is no longer kept in memory by the Share sheet |
| `6aad1e7` | A draft sharpens when the slider comes to rest |
| `d592b64` | A message with a spinner while a photo is read, saved or copied |
| `5278398` | A tile draws a picture at its own size, its pixels spread evenly (second review) |
| `e95d32f` | What is saved is what was asked for; Remove all stops a batch; a cancelled drag ends (second review) |
| `6d6e37f` | Many sprites are added as quickly as before; a batch keeps its message (second review) |

```bash
git diff ce7bffa 6d6e37f -- src docs/superpowers CLAUDE.md
```

**Other sessions edit this same working tree.** Uncommitted changes in `src/App.svelte`,
`src/app.css`, `src/PixelIcon.svelte` and the spec may belong to them. Review commits, not
working files. Read `CLAUDE.md` first. The spec at
`docs/superpowers/specs/2026-10-06-bitify-app-design.md` is the source of truth; the
sections this work added are "Images larger than their tile", "Drafts while the threshold
slider is dragged", "Long jobs", and parts of "Adding images", "Saving", "Copying" and
"Errors and limits".

## What was wrong (measured before any change)

1. The conversion loops made small arrays and ran closures for every pixel. Cutout, the
   default style, took 3.0 s for a 12-megapixel image on a desktop.
2. Every change to a color, style or threshold converted every pixel of the file, made a
   new 4-bytes-per-pixel copy, and pushed it into a full-size canvas, which the browser
   then shrank to a tile about 1000 screen pixels wide. On a phone, 15 of every 16 pixels
   converted were never shown.
3. Saving made a 4-bytes-per-pixel copy and compressed all of it.

## What changed

| Change | Where |
|---|---|
| Loops written flat, pattern thresholds and tones from small tables. Output unchanged. | `src/lib/bitify.js` |
| `analyze` keeps each pixel's color difference from its right and lower neighbour (2 more bytes per pixel), which Lines and Cutout asked for on every threshold change. | `src/lib/bitify.js` |
| `mask(img, style, threshold, width, height)` converts a smaller picture of the image: each of its pixels stands for the image pixel under its middle, at whatever spacing that comes to. Cutout, Lines, Solid and Silhouette give the full mask's value there. The patterns and Atkinson are drawn afresh on the picture's pixels. | `src/lib/bitify.js` |
| A tile draws a picture at its own size in screen pixels. It is made 6% smaller where it would be a whole number of times smaller than the image, never drafts an image it draws whole, and keeps 32 pixels on the shorter side. | `src/lib/layout.js` `shown`, `src/Tile.svelte` |
| While the threshold slider is dragged, an image too slow for the device is drawn as a smaller picture, sized from its own measured speed to fit 24 ms shared by all tiles. It sharpens when the slider rests for 150 ms or is let go. | `src/lib/gesture.js` `sliderDrag`, `src/Dock.svelte`, `src/Tile.svelte`, `src/App.svelte` |
| PNG written with a 3-entry palette and 2 bits per pixel, straight from the mask. | `src/lib/save.js` `pngBytes` |
| Download all handles one image at a time. A photo of a batch appears as it is read; sprites read within a quarter second go on the wall together. The canvas used to read an image is given back at once. | `src/lib/save.js`, `src/App.svelte` |
| A job of 2 million pixels or more shows a message with a spinner first. What it saves is what was on screen at the click. | `src/App.svelte` `during`, `working`, `asking`, `src/app.css` `.spin` |

Tried and removed: holding setting changes back to one per screen frame. It added one or two
frames of delay to every change (76 ms to 126 ms per slider move at 4 times slowdown).

## Results on a real phone

Pixel 8 Pro, Chrome 154, driven over USB with real touch input, at the phone's own speed.
Old build (`ce7bffa`) to the committed build (`6d6e37f`). Best of 2 or 3 runs. Milliseconds.

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

"One slider move" is the time from a move reaching the page to the last tile being redrawn.
"Memory in use" is before garbage collection; a reviewer measured the sprite rows after a
forced collection and found them level with the old build. The old-build figures are in
`bench/matrix-device.txt`, the new in `bench/final-device.txt`.

## How it was checked

- `npm test`: 115 tests.
- `node bench/equiv.mjs`: the new `analyze`, `mask` and `colorize` give byte-identical
  results to the old ones on 400 random images, 9 styles, 6 thresholds, and a smaller
  picture is the full mask at the image pixels its pixels stand for.
- `node bench/tone.mjs` and `node bench/alias.mjs`: at every picture size each style is as
  light as the full conversion, including for dithered art, stripes and a stippled
  transparency, and including tiles exactly a half, third or quarter of the image.
- `node bench/saved.mjs bench/dist-base bench/dist-new`: a photo is saved and copied in the
  old build and the new, at Auto and in the middle of a slider drag, in all nine styles.
  Every file is full size and identical to the old build's, pixel for pixel.
- `node bench/leak.mjs bench/dist-new`: rounds of add, every control, save, remove, each
  followed by a forced garbage collection. Image memory, elements, listeners and open file
  links return to the same values every round.
- On the phone: a real touch drag gives one press, the moves, one release and one change,
  with no cancel. The image is a draft while moving, full while the finger rests, a draft
  again on moving, and a file saved in the middle of that is the full 4000 by 3000. Two
  captures of the phone's screen during a long read show the message with its spinner at
  two different angles.

## The reviews

**First (a Claude subagent), on an early `e1eccfd`.** One blocking bug: taking every k-th
pixel of a pattern style landed on the same few cells of the pattern, so a photo's tile
came out far too light or dark. Also: Atkinson walked every pixel on each change, sprites
could be drafted, `dragging` could stick, the step formula was untested, thin images were
drawn too tall, the read canvas was never freed. All fixed in `e1eccfd`.

**Second (Codex), on `d592b64`.** One blocking bug and five smaller ones, all confirmed and
fixed in `5278398` and `e95d32f`:

1. A stippled transparency lost its midtones in the tile. The cause was wider: a
   whole-number step locks onto any fine regular texture, so dithered art came out 97%
   light where the file is 50%, in every style. Tiles now draw at their own size with
   pixels spread evenly.
2. A long save or copy read its settings and images after its 50 ms wait, not at the click.
3. Remove all did not stop a batch still being read.
4. The slider's drag did not end on `pointercancel`.
5. A copy's message was withdrawn before the PNG was made.
6. With two long jobs, the message could be that of a finished one.

**Second (a Claude subagent), on the same commit.** Found the same six, and five more:

1. An image between one and two times its tile was converted whole on every move and never
   drafted (507 ms per move on a slowed phone). Fixed by `5278398`: now 30 ms.
2. Adding 120 sprites took two to four times as long, because the wall was refitted for
   each. Fixed in `6d6e37f`: about level with the old build, first sprite five times sooner.
3. The spinner turned in steps, which WebKit may not run without the page. Changed to an
   even turn in `6d6e37f`. Not verified on Safari.
4. Lines and seams in enlarged pixel art were kept on the left and top only. Fixed by
   `5278398`: all four sides now match the file.
5. The "Reading" message blinked between the photos of a batch. Fixed in `6d6e37f`.

It also checked and found correct: every save and copy path ends in a full-size
conversion; a real clipboard write in Edge is pixel-identical to the saved file; an
animation plays, drafts and saves at full size; `sliderDrag` under 1,500 random orderings
never has more than one timer or one left over; no leak; and in Firefox 157 the palette
PNG decodes to the old pixels and the clipboard accepts the promised image.

Left as they are, by the owner's choice of drafts with sharpening at rest: a touch that
lands off the slider's thumb starts with one full-detail redraw; a slow, careful drag shows
rough then sharp at each step; the original is drafted too when compared in mid-drag.

## Known downsides and limits

1. **For the patterns and Atkinson, a large image's tile is not a sample of the saved
   file.** It is as light and dark in every part, but its pattern is at screen scale and
   the file's is finer. Anything drawn whole (every sprite) is exactly what is saved.
2. **A tile's picture is a sample, not an average.** An image with a fine regular texture
   shows bands when drawn smaller, as it did before this work.
3. **A draft is rougher than the final image**, and sharpening is one pause. If the finger
   moves on during that pause, the move waits for it.
4. **The draft's speed estimate is one earlier conversion**, fixed for the drag. A tile
   that has never converted is not drafted on its first drag.
5. **Many sprites on a slow phone are not drafted**, by design: 12 sprites take 33 ms per
   slider move on the Pixel.
6. **Saved PNGs are palette images.** Identical pixels, but image editors open them in
   indexed-color mode. Level 3 compression makes them about 4% larger than level 6 would
   (still 35 to 45% smaller than before).
7. **Adding and saving a photo still stall the page**: about 1.1 s and 0.6 s for 12 MP on
   the Pixel. A message shows meanwhile, but nothing else responds.
8. **A long job starts 50 ms later** than it used to, so that its message is drawn first.
9. **Memory is 7 bytes per pixel per image**: 84 MB for a 12 MP photo. Several photos can
   still exhaust a phone. Images above about 16.7 MP still cannot be read on iOS.
10. **Zooming in with two fingers does not reveal more detail** in a large image's tile.
11. **`Tile.svelte` times conversions inside a `$derived`** and keeps the result in a plain
    variable (`pace`). `devicePixelRatio` is read without being watched.
12. **Safari and iOS have not been run at all.** Chrome on Android and desktop, Edge, and
    headless Firefox have. On Safari the unverified parts are the clipboard being handed a
    promise, the spinner turning while the page is busy, and real touch on the slider.
13. **The benchmark image is synthetic** (smooth shapes with grain, saved as a JPEG), and
    the benchmark scripts sometimes fail to start their browser; a rerun passes.

## Open questions

- Should conversion, analysis and saving move to a worker? That is the only way to full
  quality on every slider move with a smooth thumb, and to a page that stays alive while a
  photo is read or saved. The owner chose drafts for now.
- Is there a faster way to analyse a photo that still gives exactly the same Auto
  thresholds?

## How to rerun the measurements

`bench/live.mjs` needs Node 22 or later and Microsoft Edge or Chrome; set `BROWSER` to the
browser's path if it is not at the default Edge location. It opens real browser windows.
If a script prints nothing, its browser did not start: run it again.

```bash
npm test
```

```bash
git show ce7bffa:src/lib/bitify.js > bench/bitify.old.js && node bench/equiv.mjs && node bench/tone.mjs && node bench/alias.mjs && node bench/bench.mjs
```

Build the old and the new code next to the scripts:

```bash
mkdir bench/baseline && git archive ce7bffa | tar -x -C bench/baseline && cmd //c mklink //J "bench\\baseline\\node_modules" "node_modules" && (cd bench/baseline && npx vite build --outDir ../dist-base --emptyOutDir) && npx vite build --outDir bench/dist-new --emptyOutDir
```

Then, from inside `bench/`:

```bash
node live.mjs dist-new w=4000 h=3000 cpu=4 style=cutout steps=20
```

```bash
node matrix.mjs
```

```bash
node saved.mjs dist-base dist-new
```

```bash
node leak.mjs dist-new
```

On an Android phone with USB debugging on and Chrome open, forward Chrome's debugging
socket and set `DEVICE` to the local port. If another Chromium browser holds the usual
socket, Chrome's is `chrome_devtools_remote_<its process id>`.

```bash
adb forward tcp:9555 localabstract:chrome_devtools_remote
```

```bash
DEVICE=9555 node final-device.mjs dist-new
```

`live.mjs` options: `w`, `h`, `cpu` (slowdown), `style`, `steps` (slider moves), `count`
(copies of the image to add), `profile` (`phone`, `tablet`, `desktop`), `kind` (`photo`,
`sprite`). `HEADLESS=1` hides the window; `PROFILE=1` adds a processor profile of the drag;
`SHOTS=name` saves screenshots during the drag and after release; `BUSY=name` saves two
during the read; `TRACE=1` prints each stage as it is reached.

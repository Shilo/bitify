# Performance work: handoff for review

Written 2026-10-07, after one review round. This is for a reviewer who has not seen the
work. Your job is to challenge it, not to confirm it.

## What was asked

Bitify was unusable with big images on phones and tablets. The owner asked for it to be
made many times faster, measured in a real browser and on a real phone, with performance
put first but **without unwanted downsides**. Two rules the owner has stated outright:

- Saving, downloading and copying must always be full quality. A palette PNG is fine.
- The slider's draft must have no race, its timer must always be stopped or started again
  properly, and nothing may leak.

## What you are reviewing

Four commits on `main`, on top of `ce7bffa` (a fifth, `ef76dec`, adds only this file and `bench/`):

| Commit | What |
|---|---|
| `e1eccfd` | The performance work: flat loops, tiles convert only what they show, drafts, palette PNG |
| `27eda94` | A removed image is no longer kept in memory by the Share sheet |
| `6aad1e7` | A draft sharpens when the slider comes to rest |
| `d592b64` | A message with a turning square while a photo is read, saved or copied |

```bash
git diff ce7bffa d592b64 -- src docs/superpowers CLAUDE.md
```

**Another session is editing this same working tree.** Uncommitted changes in
`src/App.svelte`, `src/app.css`, `src/PixelIcon.svelte`, `CLAUDE.md` and the spec belong to
it (a new help and welcome dialog). Leave them alone and review the commits, not the
working files.

### This is the second review. Look here first.

The first review saw only an early form of `e1eccfd`. None of the following has been
reviewed by anyone but its author:

- **The patterns and Atkinson drawn afresh on the kept pixels** (`mask` in
  `src/lib/bitify.js`, the last two blocks). Is the tile a fair picture of the saved file
  at every `k`, including with transparent pixels, tiny images and `k` larger than the image?
- **`sampling` in `src/lib/layout.js`**: the step a tile converts at, the rule that an image
  shown whole is never drafted, and the 32-pixel floor on the shorter side.
- **`sliderDrag` in `src/lib/gesture.js` and its wiring in `src/Dock.svelte`**: the rest
  timer. Hunt for a race, a timer that survives a drag, a drag that never ends, and a
  redraw at full detail in the middle of a fast drag. Remember that `tick` is what tells it
  the wall has redrawn.
- **`during` in `src/App.svelte`** and the copy path in `src/lib/save.js`: the busy message,
  its 50 ms wait, its count of running jobs, and the clipboard being handed a promise. What
  happens when a job throws, when two overlap, when the list of images changes during the
  wait, or when Remove all is pressed while a batch is still being read?
- **The effect that lets go of a removed image** held by the Share sheet (`src/App.svelte`).
- **Whether saving, downloading and copying can ever produce less than the full image.**
  Trace every path from a button or key to `pngBytes` and `encodeGif`.
- **Memory**: anything that keeps an image, a mask, a canvas, a timer or a listener alive
  after its tile is removed or the drag has ended.

To run exactly what was committed, without the other session's uncommitted changes, build
from the commit (the `bench/dist-new` already on disk may be older):

```bash
rm -rf bench/committed && mkdir bench/committed && git archive ef76dec | tar -x -C bench/committed && cmd //c mklink //J "bench\\committed\\node_modules" "node_modules" && (cd bench/committed && npx vitest run && npx vite build --outDir ../dist-new --emptyOutDir)
```

Read `CLAUDE.md` first. The spec at `docs/superpowers/specs/2026-10-06-bitify-app-design.md`
is the source of truth and changes in the same commit as the code. The sections this work
added are "Images larger than their tile", "Drafts while the threshold slider is dragged",
"Long jobs", and parts of "Saving", "Copying" and "Errors and limits".

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
| `mask(img, style, threshold, k)` converts every k-th pixel of every k-th row. Cutout, Lines, Solid and Silhouette give the full mask with pixels left out. The patterns and Atkinson are drawn afresh on the kept pixels. | `src/lib/bitify.js` |
| A tile picks `k` so that it still has an image pixel for each screen pixel, never drafts an image it shows whole, and keeps 32 pixels on the shorter side. | `src/lib/layout.js` `sampling`, `src/Tile.svelte` |
| While the threshold slider is dragged, an image too slow for the device is drawn with a larger `k`, sized from its own measured speed to fit 24 ms shared by all tiles. It sharpens when the slider rests for 150 ms or is let go. | `src/lib/gesture.js` `sliderDrag`, `src/Dock.svelte`, `src/Tile.svelte`, `src/App.svelte` |
| PNG written with a 3-entry palette and 2 bits per pixel, straight from the mask. | `src/lib/save.js` `pngBytes` |
| Download all handles one image at a time. Images of a batch appear as each is read. The canvas used to read an image is given back at once. | `src/lib/save.js`, `src/App.svelte` |
| A job of 2 million pixels or more shows a message with a spinner first. | `src/App.svelte` `during`, `src/app.css` `.spin` |

Tried and removed: holding setting changes back to one per screen frame. It added one or two
frames of delay to every change (76 ms to 126 ms per slider move at 4 times slowdown).

## Results on a real phone

Pixel 8 Pro, Chrome 154, driven over USB with real touch input, at the phone's own speed.
Old build (`ce7bffa`) to new build. Best of 2 or 3 runs. Milliseconds.

| Scenario | Add image | Change style | One slider move | Save | Memory in use (MB) |
|---|---|---|---|---|---|
| Sprite 256 by 256 | 79 to 58 | 55 to 19 | 14 to 4 | 65 to 39 | 14 to 12 |
| 12 sprites 256 by 256 | 357 to 201 | 133 to 67 | 80 to 32 | 178 to 72 | 30 to 38 |
| Photo 4 MP, Cutout | 1727 to 342 | 943 to 80 | 1273 to 17 | 1383 to 261 | 98 to 51 |
| Photo 12 MP, Cutout | 4698 to 853 | 2459 to 70 | 3657 to 18 | 3787 to 585 | 273 to 117 |
| Photo 12 MP, Solid | 952 to 811 | 193 to 24 | 138 to 10 | 1524 to 233 | 273 to 111 |
| Photo 12 MP, Lines | 2585 to 844 | 708 to 53 | 1668 to 8 | 1080 to 298 | 273 to 117 |
| Photo 12 MP, Bayer | 1189 to 831 | 274 to 33 | 203 to 9 | 1160 to 273 | 273 to 117 |
| Photo 12 MP, Atkinson | 2227 to 838 | 1350 to 48 | 1200 to 13 | 4164 to 443 | 290 to 117 |
| 6 photos of 4 MP, Cutout | 7822 to 1472 | 3522 to 55 | 3136 to 28 | 7851 to 1169 | 441 to 202 |
| Photo 12 MP, Cutout, phone slowed 4 times more | 19260 to 2558 | 6974 to 123 | 15066 to 25 | 17286 to 2131 | 228 to 111 |

"One slider move" is the time from a move reaching the page to the last tile being redrawn.
The raw numbers are in `bench/matrix-device.txt` (its 12-sprite slider figure was measured
to the first tile's redraw and is wrong; the row above is from a rerun). Earlier desktop
runs with a slowed processor are in `bench/matrix-before-review.txt`; they predate the
review fixes and were disturbed by other work on the machine.

## How it was checked

- `npm test`: 110 tests.
- `node bench/equiv.mjs`: the new `analyze`, `mask` and `colorize` give byte-identical
  results to the old ones on 400 random images, 9 styles, 6 thresholds.
- `node bench/tone.mjs`: at every `k` each style is as light, and has the same texture, as
  at `k` of 1.
- `node bench/saved.mjs bench/dist-base bench/dist-new`: a photo is saved and copied in the
  old build and the new, at Auto and in the middle of a slider drag, in all nine styles.
  Every file is full size and identical to the old build's, pixel for pixel.
- `node bench/leak.mjs bench/dist-new`: rounds of add, every control, save, remove, each
  followed by a forced garbage collection. Image memory, elements, listeners and open file
  links return to the same values every round.
- On the phone: a real touch drag gives one press, the moves, one release and one change,
  with no cancel. The image is a draft while moving, full while the finger rests, a draft
  again on moving, and a file saved in the middle of that is the full 4000 by 3000. Two
  captures of the phone's screen during a long read show the message with its square at
  two different angles.

## The first review, and what was done

An independent review found one blocking bug and several smaller ones. All of these are
fixed in `e1eccfd`:

1. **Blocking.** Taking every k-th pixel of Checker, Hatch, Bayer or Noise landed on the
   same few cells of the pattern, so a photo's tile came out far too light or dark (Bayer
   98% light where the file is 51%). The patterns are now drawn on the kept pixels.
2. Atkinson walked every pixel of the file on each change. It now diffuses over the kept
   pixels.
3. Sprites could be drafted. An image shown whole is now never drafted.
4. `dragging` could stick if the Style panel closed mid-drag. Closing the panel ends it.
5. The step formula was untested and in the component. It is `sampling` in `layout.js`.
6. Thin images were drawn too tall. The shorter side now keeps 32 pixels.
7. The canvas used to read an image was never freed.

The reviewer checked and found correct: 12,600 edge-case masks against the old code, the
PNG packing through an independent reader and Pillow, and the save, copy and add paths.

## Known downsides and limits. Challenge these first.

1. **For the patterns and Atkinson, a large image's tile is not a sample of the saved
   file.** It is as light and dark in every part, but its pattern is at screen scale and
   the file's is finer. Anything shown whole (every sprite) is exactly what is saved.
2. **A draft is rougher than the final image**, and sharpening is one pause: 40 to 75 ms on
   the Pixel, more on a slower phone. If the finger moves on during that pause, the move
   waits for it.
3. **The draft's speed estimate is one earlier conversion**, fixed for the drag. A tile
   that has never converted is not drafted on its first drag.
4. **Many sprites on a slow phone are not drafted**, by design, so 12 sprites take 32 ms
   per slider move on the Pixel.
5. **Saved PNGs are palette images.** Identical pixels, but image editors open them in
   indexed-color mode. Level 3 compression makes them about 4% larger than level 6 would
   (still 35 to 45% smaller than before).
6. **Adding and saving a photo still stall the page**: 0.85 s and 0.59 s for 12 MP on the
   Pixel. A message shows meanwhile, but nothing else responds.
7. **A long job starts 50 ms later** than it used to, so that its message is drawn first.
8. **Memory is 7 bytes per pixel per image**: 84 MB for a 12 MP photo. Several photos can
   still exhaust a phone. Images above about 16.7 MP still cannot be read on iOS.
9. **Zooming in with two fingers does not reveal more detail** in a large image's tile.
10. **In the pattern styles a large image's tile can show faint evenly spaced lines**, where
    the browser fits the canvas to the screen. The saved file has none.
11. **`Tile.svelte` times conversions inside a `$derived`** and keeps the result in a plain
    variable (`pace`).
12. **Only Chrome was measured.** Nothing was run on Safari, iOS or Firefox. The copy now
    hands the clipboard a promise of the image, which those browsers document as supported
    but which was not tried there. The spinner turning while the page is busy was seen on
    Chrome for Android only.
13. **The benchmark image is synthetic** (smooth shapes with grain, saved as a JPEG).

## Open questions

- Is the draft the right answer for the slider, or should conversion move to a worker
  (full quality always, smooth thumb, image trailing by the conversion time)? The owner
  chose drafts with sharpening at rest for now.
- Should analysis and saving move to a worker, so the page stays alive during them?
- Is there a faster way to analyse a photo that still gives exactly the same Auto
  thresholds?
- Is anything in `during` or `sliderDrag` wrong when two jobs or two gestures overlap?

## What to deliver

A list of findings, most serious first. For each: the file and line, what goes wrong and
for whom, how you know (a failing input, a measurement, or reasoning you can show), and
what you would do instead. Say plainly which downsides should block, which are fine, and
what is missing from the list. If you claim something is slower or faster, measure it. Do
not rewrite the code; this is a review.

## How to rerun the measurements

`bench/live.mjs` needs Node 22 or later and Microsoft Edge or Chrome; set `BROWSER` to the
browser's path if it is not at the default Edge location. It opens real browser windows.

```bash
npm test
```

```bash
git show ce7bffa:src/lib/bitify.js > bench/bitify.old.js && node bench/equiv.mjs && node bench/tone.mjs && node bench/bench.mjs
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
DEVICE=9555 node matrix.mjs
```

`live.mjs` options: `w`, `h`, `cpu` (slowdown), `style`, `steps` (slider moves), `count`
(copies of the image to add), `profile` (`phone`, `tablet`, `desktop`), `kind` (`photo`,
`sprite`). `HEADLESS=1` hides the window; `PROFILE=1` adds a processor profile of the drag;
`SHOTS=name` saves screenshots during the drag and after release; `BUSY=name` saves two
during the read.

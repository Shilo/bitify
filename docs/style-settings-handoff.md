# Style settings: handoff

Written 2026-10-08. For whoever picks this up next: what was built, what has been checked,
what has not, and what is left to decide. The rules themselves are in the spec,
[2026-10-06-bitify-app-design.md](superpowers/specs/2026-10-06-bitify-app-design.md)
("Style panel", "Each style's settings", "Remembered settings"), and per style in
[styles.md](styles.md). This file does not repeat them.

## Where it is

Branch `worktree-style-settings`, worktree `.claude/worktrees/style-settings`, nine commits
on top of `main` at `bd84609`. Not merged, not pushed.

| Commit | What |
|---|---|
| `0ad28ab` | The conversion takes each style's settings; `lib/settings.js` lists and restores them |
| `09ef9d4` | The interface: a tray on wide screens, chips on phones; every setting kept per style |
| `167459d` | Spec, `styles.md` and `CLAUDE.md` |
| `7c70fde` | The mockups the layout was chosen from, and a fourth dev-server port |
| `31b85dc` | The phone layout follows the window's width |
| `3b4fe3c` | A phone on its side: chips in one row, a list of styles that fits |
| `7d4be4b` | The pressed chip stays in view |
| `ee2051d` | Reset ends the chip row; a narrow, short screen has a one-row panel |
| `6c64d02` | What the code review found |

```bash
git diff bd84609 worktree-style-settings -- src docs CLAUDE.md
```

## What was built

Every style has settings of its own beyond the threshold: 13 settings in all, 41 counting
each style's copy. Each is remembered for each style, the threshold included.

| Style | Its settings, after Threshold |
|---|---|
| Cutout | Seams, Rim, Brightness, Opacity cut |
| Solid | Brightness, Opacity cut |
| Lines | Thickness, Fill darks, Opacity cut |
| Checker | Shading, Scale, Brightness, Opacity cut |
| Hatch | Shading, Scale, Direction, Spacing, Brightness, Opacity cut |
| Bayer | Shading, Scale, Matrix, Brightness, Opacity cut |
| Noise | Shading, Scale, Brightness, Opacity cut |
| Atkinson | Shading, Diffusion, Brightness, Opacity cut |
| Silhouette | Opacity cut only (it has no threshold) |

Where they show:

- **Wide screens:** a More button on the style strip opens them all in a tray under it. The
  panel grows and the wall makes room.
- **Phones (520px wide or less):** every setting is a chip showing its value; the pressed
  chip's control is on the row below. The panel is two rows for every style.
- **A phone on its side (520px high or less, wider than high):** the same chips, with the
  control beside them, in one row.

The three layouts were chosen from the mockups in
[superpowers/mockups/style-settings.html](superpowers/mockups/style-settings.html) (open it
in a browser; "A. Tray" and "B. One at a time" are what was built, "C. Popover" was
rejected because it covers the images).

## What changed from the first plan

- **Fill darks** is Off or 1 to 254. The plan also gave it an Auto; it has none.
- **Reset** on phones is the last chip in the row, not a button beside the control, which
  left the slider under 50px on a 280px-wide phone.
- **A phone on its side** has the chips, not the tray. With the tray open at 568×320 the
  wall was left 5px.
- **The style panel** is 700px wide on wide screens, up from 560px, for two settings side
  by side. On phones it is as wide as the screen less 12px a side, not as wide as the dock.
- **More** is a square button with an icon and no word: the three dots of the top bar's
  More button, reused, which the owner chose over the candidates in
  [superpowers/mockups/more-icons.html](superpowers/mockups/more-icons.html).
- **Reset** is tinted red (`--undo` in `app.css`), the one color in the chrome.
- **Opacity cut** is shown only while an image on the wall has a partly see-through pixel
  (`img.soft`, found in the analysis's own pass at no measurable cost). It did nothing for
  any other image, and those are no longer analysed again when it changes.
- **The chip row** fades out under a small arrow on a side that has more to scroll to.

## What has been checked

Unit tests: 141 pass (`npm test`), 26 of them new. `npm run build` is clean.

In a browser (the Claude desktop Browser pane, Chromium, with size emulation):

- **Every control visible and uncovered**, for all nine styles, at 280×653, 320×568,
  360×640, 375×667, 568×320, 640×360, 653×280, 667×375, 812×375, 521×800, 600×900,
  768×1024, 1024×560, 1024×768 and 1280×800. At 480×320, 568×280 and 653×280 the open
  list of styles lies over the top bar's buttons until it is closed.
- **Every setting, changed alone,** gives a 64×64 sprite tile and a 1600×1200 photo tile
  that are byte for byte what `mask` returns for the stored settings, and Reset brings the
  first picture back. All 41.
- **Persistence:** all 41 set away from their defaults, then a reload: the same stored
  values, the same control states, and tiles that match the conversion.
- **Stored text that is damaged, hostile, partial or from before this feature** starts the
  app with every usable value kept and the rest at their defaults.
- **Saving:** a saved PNG, the frames of a saved GIF and the PNG inside a Download-all zip
  are what the tiles show.
- **A real mouse drag** on the Threshold slider; typing into the number boxes, including a
  lone minus sign; arrow keys on a slider or box; Escape; Reset from the keyboard; the
  light theme.

A second agent reviewed the code independently, with its own scripts. It found no
defect in the conversion or in persistence (20,000 random cases against a reference written
from the spec table; 480,000 comparisons of default output with the code before; 50,000
fuzzed stored texts). What it did find is fixed in `6c64d02`.

Speed, on a desktop: every default converts as fast as before, within noise (Atkinson
about 5% slower). At 12 megapixels Floyd takes 182 ms and Stucki 407 ms against Atkinson's
100 ms; Lines at thickness 3 takes 144 ms against 64 ms.

## What has not been checked

These need a person, or a device this work did not have:

1. **A real phone, iOS and Android.** Dragging a slider with a finger, swiping the chip
   row, turning the phone between upright and on its side, the on-screen keyboard over a
   number box. Everything phone-sized was desktop emulation with a mouse.
2. **A real window resize** across 520px wide and across 520px high. The pane's emulation
   fires no resize event, so the switch between tray and chips was triggered by hand. The
   code binds to the window's size in the standard way.
3. **Copy to the clipboard** with settings changed.
4. **Saving or copying while the Opacity cut slider is held** on a wall of more than a
   million pixels. It was fixed in code (`reread` in `save`, `copy` and `saveEverything`)
   and never reproduced.
5. **A screen reader.** The labels are in the page ("Direction: Rising", "Reset Hatch");
   nobody has listened to them.
6. **Focus rings inside the tray and the chip row,** by eye. The computed style was read
   on one number box.
7. **Firefox and Safari.**

## Known limits, accepted for now

- **Thickness 2 or 3 on a large photo** makes its tile take about three to five times as
  long to convert as thickness 1. A drag of a slider is covered by drafts; pressing 1, 2
  or 3 is one conversion. If it shows on phones, the place to look is `near` in the Lines
  branch of `mask`.
- **Brightness and Opacity cut analyse every image again,** on a change of the setting and
  on a step between styles that have different values for them, with no message. About
  75 ms for a 6-megapixel photo on a desktop, several times that on a phone. A cache of
  the analysis by `source` and `cut`, or the worker the spec already names, is the way out.
- **Scale shows no change on the tile of a large photo.** A pattern finer than the screen
  looks the same at every scale; the saved files differ.
- **The single threshold stored by the version before this** is not carried over. Every
  style starts at Auto after the upgrade.
- **Under about 280px of height** (a small phone on its side with the browser's bars
  showing) the wall has almost no room while the panel is open. That was so before.

## Before merging

- Run through "What has not been checked", items 1 to 3 at least.
- Merge or rebase onto `main` if it has moved. `src/lib/bitify.js`, `src/App.svelte`,
  `src/Dock.svelte`, `src/Tile.svelte` and `src/app.css` are all touched here.
- Every push to `main` deploys.

## Working on it

- Settings are data: `SETTINGS` and `STYLE_SETTINGS` in `src/lib/settings.js`. A new
  setting is an entry there, a line in `mask` (or in `analyze`, if it changes what the
  analysis finds), a row in the spec's table and a paragraph in `styles.md`. The tray and
  the chips draw themselves from the list.
- Time `bitify.js` before and after any change to its loops, each case in its own process.
  Two measurements in one process disagree by more than the changes being measured.
- The dev server for this worktree: `npm run dev -- --port 5176 --strictPort`. The preview
  tool reads the main checkout's `.claude/launch.json`, not this worktree's.
- In the Browser pane: after each change of size run
  `window.dispatchEvent(new Event('resize'))`, and take a screenshot before reading a
  tile's canvas, or a new tile has none yet. Screenshots can lag behind the page; measure
  in the page where it matters.

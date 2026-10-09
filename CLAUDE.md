# Bitify

Bitify is a browser-only tool that instantly converts sprites and animated GIFs to 1-bit colors and styles: each image is redrawn in exactly two colors the user picks, either of which can be None (transparent). There is no backend and nothing is uploaded.

## What it does

The screen is a wall of image tiles with one floating dock of controls. Images are added by drop, file picker or paste. Changing a color, palette, style or setting redraws every image at once. Either color can be None, set by a small three-way switch beside the palette's name; its pixels are transparent on the wall and in every saved or copied file. There are eleven styles; the default, Cutout, fills the bright parts of a sprite and cuts its parts apart, in the style of the game End of End. Icon, the fifth, selects coherent cavities and openings on small transparent sprites, and sparse grooves on larger art, from source RGB and alpha. Stencil, the fourth, fills a whole sprite and cuts only its darkest inner lines; with the first color None it makes icons in one color. The threshold is Auto (picked per image) or manual. Every style also has settings of its own (Hatch's direction, Bayer's matrix and so on), each remembered for that style; a wide screen shows them all in a tray that More opens under the style strip, and a phone shows them as chips with one control at a time. The original can be compared by a switch, by holding a tile, or by holding Space. Scrolling, swiping up or down, or the up and down arrow keys step through the styles; Shift or Ctrl with the wheel, a sideways swipe, or the left and right arrow keys step through the palettes. The wheel and swipes step only over the top bar, the wall or the empty screen where it does not itself scroll, never over a top bar button, the dock, a panel or a dialog; the arrow keys step from anywhere. Stills save as PNG; animated GIFs play on the wall and save as GIF; Download all makes a zip. Each tile also has a Copy button that puts its image on the clipboard as a PNG, and Ctrl+C copies the first image. On touch screens a tile's Copy and Download sit behind one Share button, which opens a sheet with both. Tiles resize to fill the space between the top bar and the dock. The empty screen shows the logo as a live example of the current settings. Help, in the More menu, is a dialog that says what Bitify is, gives four steps and lists the controls, all worded for the device in use (touch, or mouse and keyboard); it also opens by itself on a first visit, as a welcome. It can be installed as an app, from an Install row in the More menu where the browser offers that; there is no service worker and the app caches nothing itself, so it does not work offline. It has to work on desktop, iOS and Android.

Read docs/superpowers/specs/2026-10-06-bitify-app-design.md before changing behavior. It is the source of truth for the rules above, including the exact conversion and layout rules. Update it in the same change as the code.

docs/styles.md explains how each of the eleven styles works, with a worked example of each, and what each style's settings do. docs/palettes.md lists the twelve preset palettes, where each comes from, and how to change them. docs/performance.md explains how the app stays fast with big images on phones: what a tile converts and why, the drafts while a slider is dragged, what was measured, and what was tried and thrown away. Read it before changing bitify.js, layout.js, gesture.js, Tile.svelte or the saving and adding code in App.svelte.

## Commands

npm run dev                                  dev server on localhost:5173
npm test                                     all unit tests (Vitest)
npx vitest run src/lib/bitify.test.js        one test file
npx vitest run -t "part of a test name"      one test
npm run build                                writes dist/

Every push to main deploys to GitHub Pages (.github/workflows/deploy.yml).

## How the code fits together

Svelte 5 with runes, plain JavaScript, no SvelteKit.

src/lib holds the logic as DOM-free modules, each with unit tests: bitify.js turns pixels into a one-byte-per-pixel mask and the mask into two-color pixels, layout.js sizes the tiles and picks how many of an image's pixels a tile converts, presets.js lists the palettes and styles and steps through them, gesture.js turns wheel moves into single steps and says when a slider of the Style panel is being dragged, gif.js reads and writes GIFs (loaded on demand), save.js encodes PNGs, names files and builds the zip, settings.js lists every setting a style can have and restores what was kept between visits.

App.svelte owns all state and passes it down. Dock.svelte edits settings through bindable props. Tile.svelte derives masks from an image and repaints when they or a color change. A style's settings go to mask as one object; two of them, Brightness and Opacity cut, are read by analyze instead, so App.svelte analyses the images again when the style in use has other values for them. A tile converts only what it can show: for an image larger than the tile, a picture of it at the tile's own size (the width and height given to mask), its pixels spread evenly over the image. Saving and copying convert every pixel.

All CSS is global in src/app.css. Components have no style blocks, and there is no border-box reset; sizes depend on that.

PNGs and GIFs are encoded by hand, not through a canvas, because some browsers add noise when a canvas is read back. A PNG is written with a palette and two bits per pixel, straight from the mask.

## Things that bite

After a git checkout or merge the dev server can keep serving old CSS. Restart it, or touch the files in src, before trusting the preview.

The loops in bitify.js run once for every pixel of a photo, on phones. Keep them flat, with no array, object or function made per pixel, and time them before and after any change there: node bench/bench.mjs. To check that a change leaves every mask as it was, copy the file to bench/bitify.old.js before the change and run node bench/equiv.mjs after it. docs/performance.md has the rest, including how to measure the app in a browser and on a phone.

Interface behavior has no automated tests. Check it in a browser at desktop width and at phone width with touch emulation.

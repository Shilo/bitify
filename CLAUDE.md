# Bitify

Bitify is a browser-only tool that redraws pixel art in exactly two colors the user picks (1-bit). There is no backend and nothing is uploaded.

## What it does

The screen is a wall of image tiles with one floating dock of controls. Images are added by drop, file picker or paste. Changing a color, palette, style or threshold redraws every image at once. There are nine styles; the default, Cutout, fills the bright parts of a sprite and cuts its parts apart, in the style of the game End of End. The threshold is Auto (picked per image) or manual. The original can be compared by a switch, by holding a tile, or by holding Space. Stills save as PNG; animated GIFs play on the wall and save as GIF; Download all makes a zip. Tiles resize to fill the space between the top bar and the dock. The empty screen shows the logo as a live example of the current settings. It has to work on desktop, iOS and Android.

Read docs/superpowers/specs/2026-10-06-bitify-app-design.md before changing behavior. It is the source of truth for the rules above, including the exact conversion and layout rules. Update it in the same change as the code.

docs/styles.md explains how each of the nine styles works, with a worked example of each. docs/palettes.md lists the twelve preset palettes, where each comes from, and how to change them.

## Commands

npm run dev                                  dev server on localhost:5173
npm test                                     all unit tests (Vitest)
npx vitest run src/lib/bitify.test.js        one test file
npx vitest run -t "part of a test name"      one test
npm run build                                writes dist/

Every push to main deploys to GitHub Pages (.github/workflows/deploy.yml).

## How the code fits together

Svelte 5 with runes, plain JavaScript, no SvelteKit.

src/lib holds the logic as DOM-free modules, each with unit tests: bitify.js turns pixels into a one-byte-per-pixel mask and the mask into two-color pixels, layout.js sizes the tiles, gif.js reads and writes GIFs (loaded on demand), save.js encodes PNGs, names files and builds the zip.

App.svelte owns all state and passes it down. Dock.svelte edits settings through bindable props. Tile.svelte derives masks from an image and repaints when they or a color change.

All CSS is global in src/app.css. Components have no style blocks, and there is no border-box reset; sizes depend on that.

PNGs and GIFs are encoded by hand, not through a canvas, because some browsers add noise when a canvas is read back.

## Things that bite

After a git checkout or merge the dev server can keep serving old CSS. Restart it, or touch the files in src, before trusting the preview.

Interface behavior has no automated tests. Check it in a browser at desktop width and at phone width with touch emulation.

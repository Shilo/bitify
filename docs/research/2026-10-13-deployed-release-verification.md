# Deployed Colorfetti release verification

Date: 2026-10-13. Production: https://shilo.github.io/bitify/

## Release and scope

Main was pushed through `d2e13c9`, including the accepted slider/reanalysis fix in `5b7d08f`. GitHub Pages run 38404183905 succeeded. The production page loaded `assets/index-m0_9UO6i.js`, matching the local production build before testing started.

Another session subsequently pushed `e6707b7` (rebrand audit cleanup and text normalization). Its whitespace-insensitive diff changes no application runtime code; the Vite change is a comment. Pages run 38406207715 succeeded, and a final live reload served the same tested JavaScript bundle. Other sessions' untracked review harnesses were left untouched.

The read-only Codex subagent accepted the slider fix and rebrand/storage migration, with no actionable blocker. This verification introduced no production algorithm or UI change.

## Automated verification

- 779 unit tests passed; 2 existing tests skipped.
- 41 explicit garbage-collection tests passed.
- Production build passed; main entry 88.48 kB gzip.

## Actual Codex browser checks

Tests used a separate production tab. The user's existing tab was preserved. Test palettes were deleted and imported test assets removed afterwards.

- Imported all six supplied buildings, the supplied 56-frame dungeon GIF, two 1024-square images and a partial-transparency image together.
- Auto regenerated to 64 colors for this wall. All nine curated full palettes selected correctly, with their expected color counts.
- Max colors, All, RGB/Oklab matching, Cleanup On/Off, Opacity cut and Reset were exercised. Palette-specific slider bounds and All knob/readout behavior were correct.
- GIF playback and original/converted viewer comparison remained visible; captured converted screenshots show different animation frames. This is a visual smoke check, not a measurement proving that every possible frame transition is flicker-free.
- Imported the supplied 255-color Aseprite palette, saved it, selected it, edited it and downloaded its HEX colors.
- Combined file import, pasted colors and added colors in one editor; duplicate handling, removal and Undo worked. Copying PICO-8 created an independent saved palette without changing the preset.
- PNG clipboard copy, individual GIF Save and ten-file Save all ZIP worked in palette and 1-bit modes.
- All eleven 1-bit styles selected successfully. Brightness G followed immediately by a native Threshold slider drag remained functional on the large wall; returning to Luma and Reset worked.
- At 390 x 844, Nearest with Opacity cut visible, the palette editor, and the 1-bit controls fit without horizontal overflow. Range keyboard boundary changes and resets worked. This was responsive desktop-browser sizing, not a physical-phone touch/performance run.
- Help retains Add, Palette, **Style** and Save instructions and the Colorfetti identity.
- Clearing the wall regenerated Auto to the seven-color example. Importing the exact two-color girl image then generated exactly two colors, excluding the example. Clearing again and reloading restored the seven-color example without a blank preview.
- The final browser warning/error log was empty.

## Independent output decoding

Pillow decoded 22 downloaded files containing 242 frames: a PICO-8/cap-8 GIF, a two-ink GIF, a shared-palette/cap-16 ten-file ZIP and a two-ink ten-file ZIP.

Every output retained source dimensions and frame count. GIF delays and loop metadata matched source semantics. Thresholded transparency matched the source. All opaque colors belonged to the selected palette, and every capped image/clip stayed within its requested color count. The shared HEX download contained 255 unique colors.

The copied building PNG was independently checked as an additional file: dimensions and alpha matched its source, and all eight used colors belonged to PICO-8. Total independently checked outputs: **23 files, 243 frames**.

Local evidence (ignored): `.tmp/deployed-qa-20261013/independent-decode.json`, `verify.py`, downloaded outputs and desktop/mobile screenshots. No visual or functional regression was observed within this scope. Physical-phone performance, native OS file dragging and Safari/iOS were not re-measured in this deployed-browser pass; earlier accepted performance measurements remain separate evidence.

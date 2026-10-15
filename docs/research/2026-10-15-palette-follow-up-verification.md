# Fresh palette implementation verification

October 15, 2026. Fresh checks passed on the same frozen production build: all defined unit tests across the normal and explicit-GC runs, baseline exports, independent Edge checks, and twenty dithering plus sixteen improvement phases on both Codex Browser and USB Android. Actual downloads from both devices match byte-for-byte. No new PixelLab requests, algorithms or product features were added for this pass.

## Frozen production artifact

Built production source `4523a4ab80362a4b329f518c827dd4c0b1a5fc0b` once before device checks. Later documentation/QA-only commits do not change this artifact. [Build identity](../../bench/palette-follow-up-review/build-record.json) records:

- Main module `index-BuuGkGvJ.js`, SHA256 `20019c24990b4fddca9a637d90e88011bba5b191cf5ab04dd28bb9a688f2dfa7`.
- HTML SHA256 `0b61657e4bf8e35317a45bd2973d02cc94282855b1f9d14b5b8435eb94822d20`.
- CSS `index-FVm9n676.css`, SHA256 `1bf8f32ff7cbfc91ce3bae7c5ec32f01c28f84e285d380ce43be8b50d86538c1`.

The build stayed frozen while native Edge, Codex Browser and USB Android checks used it. Build succeeded; no production source edits were needed for this verification pass. [The consolidated summary](../../bench/palette-follow-up-review/host-summary.json) links the fresh retained results.

## Host checks

| Check | Result | Evidence |
|---|---|---|
| Full Vitest suite | 59 files; 910 passed, 2 GC-dependent skips | [Log](../../bench/palette-follow-up-review/unit.log) |
| Explicit GC client checks | 41 passed, including both formerly skipped queued-buffer release tests | [Log](../../bench/palette-follow-up-review/gc-client-tests.log) |
| Production build | Passed | [Log](../../bench/palette-follow-up-review/build.log) |
| Pre-dither baseline regression | 132 legacy combinations, 11 full presets, 11 RGB presets and 13 integration groups passed; no browser exceptions | [Results](../../bench/palette-follow-up-review/baseline-results.json), [log](../../bench/palette-follow-up-review/baseline.log) |
| Independent native Edge lifecycle/responsive checks | All nine phases passed; browser sandbox enabled | [Results](../../bench/palette-follow-up-review/edge-results.json) |
| Independent native Edge boundary challenge | Five checks passed; detached Edit-color overwrite hypothesis rejected; trusted outside-dismissal and subsequent real Save verified | [Results](../../bench/palette-follow-up-review/results.json) |
| Source/export/cache combination challenge | 32 combinations and eight all-transparent controls passed | [Results](../../bench/palette-follow-up-review/edge-contract-results.json) |
| QA-only saved-palette cleanup | All sixteen improvement phases passed in independent mobile-sized Edge context, including final owned-palette deletion | [Results](../../bench/palette-follow-up-review/edge-cleanup-results.json) |

The full suite uses the repository's Windows TEMP/TMP workaround. GC is deliberately passed to the Vitest worker processes with `--execArgv=--expose-gc`; passing it to the launcher alone did not expose it inside workers. Across the full and focused runs, every defined unit test was exercised successfully. The focused run does not add another 41 unique tests to the suite count.

The regression uses `BASE_REF=061c880`, which predates optional full-palette dithering (`5124e77`). It therefore checks broader unchanged legacy engine/PNG/GIF invariants than the later palette-improvement batch baseline `5aa6418`. It compares historical engine/encoder files rather than treating today's encoder as its own oracle. New full-palette cases still use independent decoded PNG/GIF values and reference matching.

The thirteen integration groups cover legacy custom colors/None/Swap/settings memory, Original, clipboard PNG payloads and single save; full preset RGB matching and ordered HEX copies; cap invalid/minimum/All/palette-size behavior; GIF pixels/delays/loop and mixed ZIP; family restoration; click-time 2MP save and removed-item ZIP snapshots; palette overflow and atomic ZIP failure; recovery from large GIF failure; native cross-document storage; animation Original clocks while conversion yields; lazy Aseprite palette import; and palette-URL import preserving the existing editor/name/method.

The nine native Edge phases independently cover a detached Cut slider, Lospec module cancellation and changing ownership/text/close/reopen, Count cancellation by Reset/family/removal, pending Auto Count during source refresh, forced-dark canvas/native-input overlay fidelity, and 320×568 / 568×320 touch layouts. External Lospec responses in this suite are synthetic and intercepted. Native OS color-picker behavior is not implied by dispatched input/change events.

## Device coverage and boundaries

The dithering acceptance suite checks Off plus 2×2/4×4/8×8 at strengths 0/50/100, and a combined RGB/cap8/Cleanup/4×4 case. It independently decodes still/GIF/ZIP output and checks sampled previews, source alpha, frame delays/loop, rapid setting changes, immutable export snapshots, clipboard payloads, full Preview and Save, family restoration, persistence and Reset.

The improvements suite checks the two added presets, partial-alpha source import, Keep with cap/Cleanup/dither, native PNG/GIF/ZIP payloads, Keep export surviving an immediate Cut edit, Cut output, stale Cut gestures, full-GIF color counting, count invalidation, exact used-palette reuse/HEX/save/reload, bounded alpha memory/kernel costs, real public Lospec import and Reset. The optional public import must report `success`; an optional `network unavailable` outcome alone is not successful live-import evidence.

| Fresh device | Dithering suite | Improvements suite | Real public Lospec import |
|---|---:|---:|---|
| Codex Browser | [20 passed](../../bench/palette-follow-up-review/codex-dither.json) | [16 passed](../../bench/palette-follow-up-review/codex-improvements.json) | SLSO8, eight swatches, success |
| USB Pixel 8 Pro / Brave | [20 passed](../../bench/palette-follow-up-review/android-dither.json) | [16 passed](../../bench/palette-follow-up-review/android-improvements.json) | SLSO8, eight swatches, success |

Both completed improvement runs also delete their own saved QA palettes through the actual editor while preserving all other records: four on Codex Browser and six on Android.

Actual native downloads were obtained separately from [Codex Browser](../../bench/palette-follow-up-review/codex-native-decoded.json) and [Android](../../bench/palette-follow-up-review/android-native-followup.json), then decoded independently. Both are 128×64, 1912-byte PNGs with SHA256 `af55fff6eab37b18e9020222f792ed60bc87010a2665daeb063811b236409388`. All 8192 alpha bytes match the source, including 0/127/128/255, and the same six visible RGBs agree with the production full-source conversion under Keep + cap8 + Cleanup + 4×4 dithering at50. The retained native files are [Codex PNG](../../bench/palette-follow-up-review/codex-native-followup.png) and [Android PNG](../../bench/palette-follow-up-review/android-native-followup.png). Only the owned test downloads were read. The [final Codex output-palette view](../../bench/palette-follow-up-review/codex-output-palette.jpg) shows Count/Use six output colors after the real Save.

The [fresh Android native-picker test](../../bench/palette-follow-up-review/android-native-picker-results.json) opens the actual Brave picker for New color and Edit color. Selecting Red and confirming Set produces `#ff0000`; selecting Blue and confirming Set produces `#0000ff`. Both the native input value and review swatch update correctly. No palette is saved by this picker test. This evidence goes beyond the synthetic input/change tests of the canvas overlays.

Canvas/clipboard interception verifies encoded application payloads; it does not establish OS clipboard readback. Safari/iOS remains outside this pass, and Node or kernel timings do not establish app FPS or whole-device memory use.

## Outside-press Save diagnosis

The first desktop native-download attempt timed out because Recolor was open. The existing [panel interaction contract](../superpowers/specs/2026-10-06-colorfetti-app-design.md) specifies that a press which dismisses a panel does nothing else. A trusted click on the outside Save button therefore closes Recolor without starting a download; the next click saves. This was expected product behavior, not a service/tool failure or a reproduced application defect.

The fresh independent Edge boundary test records the trusted pointer/click sequence, confirms the first click closes the panel with zero download attempts/events, and obtains an actual 1912-byte PNG on the second click. Its dimensions, alpha, visible RGB and hash agree with both device downloads above. No production change was made to bypass the dismissal contract.

## Test-only cleanup correction

The improvements suite used to leave its uniquely named saved QA palette after proving persistence. A final phase now selects its exact `savedPaletteId`, opens the real editor and deletes only that record through the normal confirmation UI, asserting all other library records remain identical. No arbitrary library clear is used. A failed run preserves state for diagnosis rather than attempting blind cleanup.

The [first Android result](../../bench/palette-follow-up-review/android-initial-cleanup-failure.json) passed the fifteen existing phases but exposed a timing error in the new cleanup test: it clicked confirmation synchronously before Svelte rendered it. The harness now waits for the actual Delete palette control. A separate sandboxed Edge run passed all sixteen phases after this correction, preserving a deliberately seeded unrelated saved palette byte-for-byte; the final Codex and Android sixteen-phase runs also passed.

The palette left by that initial failed test was subsequently [removed by its exact recorded ID](../../bench/palette-follow-up-review/android-failed-test-cleanup.json), preserving all six unrelated saved records. The original failure evidence remains separate from the successful final Android report. This was a QA sequencing defect, not a reproduced production defect; the production build was not changed or rebuilt.

## Conclusion within completed scope

Host and device checks found no production defect in their stated scope. The one corrected failure was in the newly added test cleanup; the outside-press download timeout followed the existing interaction contract. These checks do not prove the absence of every possible bug, and OS clipboard readback/Safari remain explicit coverage limits.

The implemented palette improvements are verified within this pass. The tested Auto refinement remains rejected for shipping on its recorded quality/target-identity evidence; its research is complete. No actual defect or demonstrated workflow gap from this follow-up justifies adding another feature or control.

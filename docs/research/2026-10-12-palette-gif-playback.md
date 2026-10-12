# Palette GIF preview flicker

October 12, 2026. Reproduced with the supplied
`bone-brut3e-dungeon-v2-export.gif`: 512×458, 56 composited frames, infinite loop,
50/100ms frame delays. Independent subagent diagnosis and review accompanied the fix.

## Cause and bounded fix

This reproduction was a display lifecycle bug. `Tile.svelte` cleared `fullPixels`
whenever the source frame changed. The `{#if pixels}` branch consequently removed
the canvas while cooperative palette quantization yielded, briefly exposing the grid.
Legacy 1-bit playback normally supplied its cached frame synchronously and avoided
that gap. Altering the color space or generating a different palette cannot fix this.

Keep the last completed converted frame while the next frame or settings convert,
provided the item and conversion family are unchanged. Item/family transitions clear
the retained result. Every new request still clears `fullReady`; playback waits for
that requested frame, and canceled conversions cannot publish their results. Original
comparison follows source timing independently. `putImageData` replaces the completed
RGBA frame atomically, including transparent pixels, rather than compositing it over
the previous frame. No full-animation converted cache or extra product UI is added.

The alternative of letting source timers continuously advance during conversion was
rejected: slow conversions could repeatedly cancel without ever displaying a frame.
Retaining all 56 full-resolution converted frames would add about 50MiB for this clip
alone. Holding one completed frame is sufficient for the observed defect.

## Actual built-app browser evidence

The standalone `bench/palette-playback-qa.html` observes the actual app in a same-origin
iframe. Copy it beside a built `index.html`, import an animation normally, and press
Measure playback. It records canvas removals, missing-canvas display samples, actual
completed `putImageData` paints and wholly transparent paints for two seconds. It
requires at least two completed paints, preventing a frozen image from passing.
Open Preview to test the enlarged viewer instead of the wall. Timing is descriptive;
there is no fragile exact-framerate assertion.

| Supplied dungeon GIF scenario | Missing-canvas samples | Canvas removals | Completed paints |
|---|---:|---:|---:|
| Before fix: PICO-8/Oklab/All/Off, wall | 11/122 | 16 | 16 |
| After: PICO-8/Oklab/All/Off, wall | 0/121 | 0 | 16 |
| After: PICO-8/Oklab/All/Off, viewer | 0/120 | 0 | 15 |
| After: Original, viewer | 0/121 | 0 | 21 |
| After: PICO-8/Oklab/8/On, wall | 0/121 | 0 | 17 |
| After: ENDESGA32/Oklab/All/Off, wall | 0/121 | 0 | 17 |
| After: ENDESGA32/Oklab/All/Off, viewer | 0/118 | 0 | 14 |
| After: Resurrect64/RGB/16/On, wall, warm | 0/121 | 0 | 17 |
| After: Resurrect64/RGB/16/On, 375px wall | 0/122 | 0 | 19 |
| After: Resurrect64/RGB/All/Off, 320px viewer | 0/120 | 0 | 17 |
| After: 1-bit, wall | 0/115 | 0 | 17 |
| After: Return from 1-bit to Resurrect64/RGB/All/Off | 0/121 | 0 | 16 |
| After: Resurrect64/Oklab/All/Off, final corrected harness | 0/122 | 0 | 15 |

All measured post-fix scenarios above had zero wholly transparent completed paints.
One immediate cold Resurrect64/RGB/16/On measurement had zero paints for two seconds
while preparing the whole-clip subset/cleanup; it correctly failed the moving-playback
criterion but had no missing canvas or removals. Once preparation completed, playback
passed. This fix addresses blank gaps, not startup processing latency or guaranteed
source-speed playback. Desktop completed-paint intervals reached roughly 184ms in
these recorded checks; source frames can be 50ms, so the existing readiness-gated
preview remains slower than source timing on some frames. The largest recorded
interval was 187ms in the PICO-8 enlarged preview.

The independent review approved the production fix and found two QA concerns.
The harness now disables Measure playback until its `finally` cleanup has restored
the observer/paint wrapper. Browser verification confirmed disabled during measurement,
enabled afterward and a passing final run. Empty-paint counts remain descriptive,
because a source may intentionally contain fully transparent frames; only canvas gaps,
removals or fewer than two completed paints fail the lifecycle test.

The mobile checks exercised the existing settings and enlarged preview at 375×740
and 320×700 viewport overrides. These are responsive desktop-browser checks, not
measurements on physical mobile processors. No settings layout was changed.

## Native export regression

Saved two real GIFs through the built app's native Save image control, then decoded
them independently with Pillow alongside the original file:

| Resurrect64 / RGB export | Used opaque colors | Verified |
|---|---:|---|
| All, Cleanup Off | 33 | Exact independent encoded-RGB nearest results |
| Max colors 8, Cleanup On | 8 | Shared-palette membership and whole-clip cap |

Both preserve 512×458 dimensions, all 56 frames, every 50/100ms delay, infinite loop
and every frame's alpha mask. The same original RGB maps consistently across frames
in both tested exports. This does not guarantee that source colors changing slightly
near a palette boundary will retain one output color in arbitrary animations.

The iframe download-event observation timed out despite no app error; the verification
was repeated through a direct app tab, where native downloads completed successfully.
This was a QA event-observation limitation, not an exported-file failure.

All 528 unit tests pass, and the production build passes. Initial sandboxed test
execution could not rename Vite's Windows temporary cache files; the same suite ran
successfully outside that sandbox. Local raw captures, source metadata and independent
export verification are in `.tmp/gif-flicker-20261012/`; a compact preserved measurement
record is `2026-10-12-palette-playback-measurements.json`.

Preset/default and shared-adaptive conclusions are separate research in
`2026-10-12-palette-default-and-adaptive.md`. Neither a preset change nor an adaptive
palette feature is part of this production fix.

# Practical sprite workloads — October 16, 2026

`manifest.json` freezes the CC0 source records, original source URLs/archive
hashes, dimensions, frame timing and hashes. `fixtures.mjs` reproduces assemblies.
The sheets use genuine low-color sprites, nearest scaling and transparent gutters;
they deliberately do not model photographs, dense smooth effects or random noise.
Motion clips are owned assemblies, not hand-drawn character walk cycles. The
32-pixel magic clip contains six genuine rubberduck effect frames, transformed
to binary-alpha GIF with test-assigned timing, not an unchanged upstream GIF.

`desktop.mjs` runs the actual built app in sandboxed Edge. `workflows.mjs` is shared
with the USB Android runner in `../android-theme-practical-2026-10-16/workloads.mjs`.
File transport/allocation is staged before measuring the import event. Readiness
means every displayed canvas painted, **not** that sampled sheets produced a
full-resolution count. Native PNG/GIF/ZIP outputs are decoded through Sharp.
Nearest uses a separate scalar Oklab oracle. Cap/Cleanup/dither uses the committed
core outside the browser plus independent membership/alpha checks: integration
equality, not an independent proof of those algorithms. Transparent hidden RGB is
ignored; visible RGB and every alpha byte must match exactly. GIF dimensions,
frame count, delay and loop must match the decoded fixture.

Renderer CPU excludes worker CPU. Long Tasks and rAF are recorded per stage.
Elapsed times include UI automation/observation and are not pure conversion
latencies. A long task is an investigation signal, not by itself a shipping bug.
Performance results are observations on this cohort, not universal device bounds.

An independent reviewer strengthened two early harness checks before acceptance:
final settings must repaint **after the final dither click**, and playback counts
must advance within a dedicated observation window rather than counting prior
paints. The observation window is two *source* loop durations; it does not promise
two converted loops. Offscreen animation pause must be distinguished from slow
or stopped visible playback.

`verify-native.mjs fixture-id native-file [receipt.json]` verifies a Codex Browser
or Android native Save made with Resurrect 64, Oklab, All, Cleanup Off, Dithering
Off, Opacity Cut 128. It never reads browser canvas pixels.

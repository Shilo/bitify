# Generated palette wall stress and memory lifetime

October 12, 2026, local date; recorded runs began October 13 UTC.

The built app passed all 18 lifecycle stages on desktop Chromium and a physical
Pixel 8 Pro using Brave. This is a bounded regression check, not a guarantee that
arbitrarily large walls stay smooth or fit phone memory. Large wall changes still
produced substantial main-thread tasks. The fixes remove confirmed JavaScript
retention paths; the process measurements do not prove complete memory reclamation.

## Coverage

Each full wall contained 184 assets: 167 stills and 17 GIFs, including the supplied
sprite, all six buildings and the 56-frame dungeon animation. There were 439 source
frames in total, counting stills as one frame each (272 GIF frames). Decoded source
RGBA alone accounted for 89,140,680 bytes, approximately 85.0 MiB.

The full cohort used Generated 32, Oklab, All and Cleanup Off. The 18 stages covered
incremental imports, whole-cohort animation playback, RGB/Oklab switching, partial
alpha and opacity changes, removing/readding half the wall, switching between
Generated 32 and presets/1-bit/Original, regeneration, actual ZIP download and an
eight-second final clear observation. A separate 28-asset cohort exercised cap 8
with Cleanup Off and On; the expensive full dungeon was excluded from that phase.
The cap/cleanup checks therefore do not establish their cost across all 184 assets.

Both runs reported no application errors. Desktop recorded three ResizeObserver
loop warnings during control changes; phone recorded none. The whole-cohort
five-second playback observation retained canvases and observed paints for all
17 GIFs. Paint counts and sampled hashes establish lifecycle activity, not exact
full-frame color correctness or sustained source-rate playback.

Additional Codex browser checks at widths 375, 320 and landscape 812 found no
horizontal overflow, kept the conditional opacity row visible and restored All on
Reset. Three rapid cycles of matching, Cleanup and caps 4/5/6/All settled on the
latest controls. Copying Generated 32 into the palette editor saved 32 colors.
Live desktop Codex browser playback also sampled 20 screenshots in each of three
single-GIF cases: PICO-8/Oklab/All/Off, PICO-8/RGB/cap 8/On and Generated 32/All.
Each case retained one canvas, produced 20 distinct screenshot hashes and reported
no error logs. The full-GIF viewer retained one canvas across 20 samples; returning
to its wall restored nine canvases. These are visible playback/lifecycle observations,
not full-frame pixel oracles.

## Measured timings

The phone wall viewport was 424×738 and the desktop viewport was 1241×562.
These are single-run measurements of different devices, not controlled speedups.
Readiness includes the reported conversion/control settlement, not just generation.

| Operation | Phone | Desktop |
| --- | ---: | ---: |
| Initial 40 stills: file change to controls ready | 528 ms | 337 ms |
| Complete 184-asset wall: file change to controls ready | 3,390 ms | 2,788 ms |
| 28-asset cap 8, Cleanup Off: settings to wall ready | 830 ms | 619 ms |
| 28-asset cap 8, Cleanup On: settings to wall ready | 329 ms | 281 ms |
| Restore full wall: file change to controls ready | 4,939 ms | 3,164 ms |
| Full-wall ZIP capture | 7,050 ms | 2,791 ms |

The cap/cleanup timings involve distinct warmed settings and should not be read as
Cleanup On making conversion faster. The full-wall playback observation had no
recorded long tasks. Import/regeneration stages did: the phone complete-wall stage
included a 380 ms task; desktop reached 1,091 ms when restoring the full wall.
Passing the lifecycle checks does not make these blocking intervals acceptable for
every device or workload. Incremental large imports remain a performance limitation.

## Independent export verification

The actual phone and desktop ZIPs were decoded independently with Pillow and NumPy,
without importing application code. Each contained all 184 expected files. Each
verification checked 439 composited frames and 22,285,170 pixels: dimensions,
binary alpha, membership in that run's captured shared palette, and GIF delays/loop
all passed. No pixel used a color outside its selected palette; the largest
per-asset color union across frames was 30. The supplied sprite, six buildings and
dungeon passed these checks individually. This does not assess perceptual optimality.

The two generated palettes were not byte-identical. Six of 32 sorted color slots
differed, with a maximum absolute channel difference of one RGB unit. Each archive
passed against its own captured palette. Browser decoding/canvas behavior is a
plausible cause, consistent with earlier phone canvas observations, but this test
does not establish the cause. It does not show stale palette publication and does
not support a cross-device byte-identity claim.

## Retention fixes and remaining memory limits

Three confirmed strong-reference paths were removed:

- App stores the completed generated request key and palette, without retaining
  the captured wall request and its source references after switching away.
- Tile clears inactive limited/cleanup request results when their features or
  family become inapplicable, preserving the completed visible rendering.
- Last-subscriber cancellation immediately removes an unstarted limiter or cleanup
  job from the serial queue and its active-job map. A running job or an export with
  another subscriber remains alive. Collection tests cover canceled queued sources
  while an independent export blocks the worker.

The global 8 MiB animation cache budget covers sampled index and used-color typed
buffers only. It excludes source RGBA, cached analysis, cleanup maps, JavaScript
objects, canvases/GPU resources, worker scratch, decoding and export buffers.
Cleanup Off skips its CPU/runtime path but does not evict a previously prepared
two-byte-per-source-pixel map from a still-live source's weakly keyed cache. That
map becomes collectible with its source identity; aggregate maps across a large
live wall are not bounded by the animation cache budget.

The Android monitor summed PSS across **all Brave processes**, including other tabs,
browser/native/GPU/worker allocations. Samples were correlated to UTC stage times;
the monitor's broad `phase` labels were not used to identify individual operations.
Sampling was coarse, and short stages sometimes had no memory sample.

| UTC-correlated phone window | All-Brave PSS range | Samples |
| --- | ---: | ---: |
| 60 seconds before the run | 1,692–1,724 MiB | 9 |
| During the run | 1,815–2,324 MiB | 15 |
| First 60 seconds after the run | 1,860–1,880 MiB | 9 |

The final monitor sample was 1,903,968 KiB PSS across 16 Brave processes, compared
with approximately 1,732,726 KiB across 15 before the run. This stayed above the
baseline. Other tabs, process changes, native allocation caches and lack of forced
GC prevent attribution to Bitify or a conclusion of full reclamation. Phone-reported
JS heap was exactly 23,100,000 bytes throughout, below decoded RGBA alone; this
rounded/stale browser value is not evidence of a constant 23.1 MB app heap.
Desktop heap likewise did not fall immediately during the final unforced clear
observation (about 219.3 MiB before and after). Explicit source-reference collection
tests provide narrower evidence than these process-wide measurements.

## Checks and evidence

The current unit suite passed 589 tests with two explicit-GC tests skipped in its
normal invocation. The separate explicit-GC client run passed all 44 tests. The
production build passed, with the main JavaScript bundle at 227.79 kB
(85.58 kB gzip). Safari, prolonged wall sessions and isolated whole-app memory
peaks remain unverified.

Sanitized records retain stage timings and memory ranges without user paths,
device identifiers or raw fixture filename lists:

- [Stage and process-memory summary](2026-10-12-generated-wall-stress-stage-summary.json)
- [Independent export summary](2026-10-12-generated-wall-stress-export-summary.json)

Related implementation and single-GIF measurements are in
[the palette implementation record](2026-10-12-palette-implementation.md).

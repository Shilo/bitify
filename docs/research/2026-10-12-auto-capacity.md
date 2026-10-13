# Auto palette capacity: 32 or 64

October 12, 2026. This is a bounded research experiment, separate from the Auto
rename and tooltip implementation. The production generator remains capped at 32.

## Recommendation

64 is a reasonable future capacity for a shared, source-derived palette when the
first-load goal is to retain the artwork's color scheme. It should mean **up to**
64, not padding a smaller source to 64. Retain Max colors All by default and the
existing per-image cap for deliberate reduction. Do not introduce a second Auto
capacity control or silently change this capacity during the naming work.

The case for 64 is fidelity and shared color coverage, not better pixel-art
structure. A larger palette does not remove orphan pixels or guarantee readable
art. It can retain more incidental gradients. 32 remains the better default if
the overriding goal is immediate color reduction rather than preservation.

The extra cost is bounded but not zero. Representative generation here was
mostly source scanning, so 64 added little to a mixed wall. Fitting a broad,
high-entropy source more than doubled, and uncached nearest searches may scan
twice as many palette entries. The synthetic result prevents treating the
representative wall result as a universal performance promise. Physical phone
results support offering 64 as the next capacity if the user approves it; they do
not justify silently changing 32 during this naming task. Keep 32 in production
until that approval. The paired browser runs completed on Codex and the physical
Pixel 8 Pro without a capacity-specific failure; whole-app stress remains a
separate check, rather than a consequence inferred from these core timings.

## Experiment and limits

`bench/auto-capacity-prepare.py` prepares an identical straight-RGBA source corpus
using Pillow, and clones the current generator into `.tmp/auto-capacity/` with
only its fixed capacity changed. No research clone is imported by production.
`bench/auto-capacity-core.js` runs the same production quantizer, limiter and
cleanup core for both capacities. PNG/GIF decoding is excluded so native browser
readback differences cannot bias this capacity comparison.

The representative wall contains 43 assets and 162 decoded frames: the supplied
two-color girl, six buildings, the 56-frame dungeon, the first 32 stills and three
animations from the earlier AI-art stress corpus. Their RGBA storage is 60.82 MiB.
A separate 256×128 synthetic image covers all 32768 five-bit RGB bins; it is an
adversarial fitting case, not typical pixel art. Including it, the harness loads
44 assets and 163 frames (60.94 MiB) but never mixes it into the representative wall.

Generation and first-frame conversion use three trials, alternating 32/64 order.
The table gives medians. Full-clip conversion, cap and cleanup are one exploratory
sample each. Measurements include cooperative yields, exclude decoding and
worker message transport, and run the cores directly rather than the production
worker clients. They do not measure whole-app responsiveness or total memory.
The separate whole-app audit measures those browser concerns.

The fidelity score is mean squared Oklab distance at a uniform sample of at most
64 pixels on the longest edge, averaged equally across assets and weighted by
frame duration within an animation. It measures color distortion, not semantic
detail preservation or readability. The generator's own binned objective is not
substituted for this original-pixel sample.

## Desktop numerical results

Node.js, current desktop, October 12. Timings are milliseconds; short sub-ms
results should be treated as equivalent rather than useful speed differences.

| Cohort | Generate 32 | Generate 64 | First frames 32 | First frames 64 | Sample color-error reduction with 64 |
|---|---:|---:|---:|---:|---:|
| Exact two-color girl | 0.23 | 0.20 | 0.06 | 0.07 | Both exact, zero error |
| Six buildings | 7.99 | 13.08 | 3.27 | 4.54 | 77.2% |
| Dungeon animation | 135.20 | 134.32 | 3.48 | 3.21 | 85.4% |
| Representative mixed wall | 171.98 | 180.79 | 19.00 | 19.70 | 39.5% |
| Adversarial high-entropy bins | 79.20 | 182.86 | 3.65 | 5.66 | 34.6% |

The dungeon's 56-frame 256×229 cold preview conversion was 64.40/56.70 ms for
32/64, and its whole-clip cap-to-eight fit was 158.93/167.03 ms. Exact-color hits,
memoization, JIT state and timer/yield noise mean these are not monotonic timing
guarantees. Cleanup was 8.94/7.52 ms and made no changes: its whole-clip guard
exhausted candidates early. That is not a worst-case cleanup benchmark.

Both capacities return exactly the girl's two source colors and preserve true
low-color sources rather than inserting invented entries to reach a target.

## Memory and performance challenge

- The generated fitter retains the same bounded 4096 exact entries or 32768 bins.
  Its principal bin/vector arrays do not double with capacity; its small center
  arrays and color lists grow. Worker source chunk size and two-result cache can
  remain unchanged.
- The optional limiter's `Float64Array(U * P)` distance table doubles from at most
  1 MiB for 4096×32 entries to 2 MiB for 4096×64. These are core array sizes, not
  an assertion that all app/worker memory is bounded to these numbers.
- Animation indexes remain Uint16 regardless of palette size. Their existing
  shared 8 MiB budget does not change at 64. Playback still colorizes and uploads
  frames; increasing capacity cannot eliminate these required operations.
- Exact matching and the existing repeated-color memo mean real sprite matching
  is often cheaper than a per-pixel × palette-size estimate. High-color sources
  can bypass that memo and pay the larger nearest search cost.
- Cleanup Off has no cleanup preparation. Cleanup On reuses whole-source
  decisions; its nearest conversion can be more expensive at 64 but a larger
  capacity alone does not allocate another copy of every animation frame.

## Physical phone and Codex-browser results

The parent agent ran the same built harness in Codex browser and on the USB
connected Pixel 8 Pro in foreground Brave/Chromium. Android's reduced browser
User-Agent says Android 10; it is not the phone's actual OS version. Both reports
completed. They use identical prepared RGBA bytes and exclude source decode,
worker transport, UI imports, export and paint. The main generation figures are
three-trial medians, not cold wall-loading latency.

| Cohort | Phone generate 32 / 64 | Phone first frames 32 / 64 | Codex generate 32 / 64 | Codex first frames 32 / 64 |
|---|---:|---:|---:|---:|
| Exact two-color girl | 1.0 / 1.3 | 0.3 / 0.1 | 0.2 / 0.3 | 0.1 / 0.1 |
| Six buildings | 19.9 / 20.7 | 5.7 / 4.1 | 5.7 / 9.6 | 3.1 / 2.8 |
| Dungeon animation | 249.9 / 249.5 | 4.6 / 4.3 | 114.6 / 112.0 | 3.1 / 3.0 |
| Representative mixed wall | 301.7 / 306.1 | 32.7 / 28.3 | 141.0 / 147.6 | 19.0 / 18.5 |
| Adversarial high-entropy bins | 97.0 / 168.8 | 5.3 / 7.7 | 55.2 / 106.9 | 4.6 / 6.5 |

On the phone, the mixed-wall fit rose 1.5%, while the broad-bin adversarial fit
rose 74.0% and its first-frame match rose 45.3%. The latter is a useful warning
against promising a universal small cost. The phone's dungeon cap-to-eight
preparation rose from 322.1 to 385.8 ms (19.8%); cold 56-frame preview conversion
was 79.9/70.6 ms and guarded cleanup preparation was 20.8/18.2 ms. As with Node,
these one-shot downstream timings can favor 64 due to exact matching, memoization,
JIT state and timer noise; 64 cannot be assumed faster in general.

Sample fidelity scores agreed to numerical precision across Node, Codex and phone
(maximum difference below 4×10⁻¹⁸): the same two-color
source remained exact, and the 64-color improvement for the mixed wall was 39.5%.
The source corpus is selected and this result is not a claim about every AI image.

## Rejected speculative seed optimization

The generator's seed uses `colors.includes()` inside candidate scans. A research
clone replaced this with a selected-color Set. Across 60 fits (five paired trials
at both capacities for buildings, wall and synthetic bins), complete output
including colors and costs was identical. Performance was inconsistent: the
representative wall was effectively unchanged, the high-entropy 64 case improved
34%, and the high-entropy 32 case regressed in that run. Concurrent desktop load
and JIT effects may contribute. **Do not ship this speculative optimization on
that evidence.** A clearer isolated phone profile is required for a later change.

## Reproduction

1. Run `python bench/auto-capacity-prepare.py` with Pillow available.
2. Run `node bench/auto-capacity-node.mjs`; the machine-readable report is
   `.tmp/auto-capacity/node-results.json`.
3. Build `vite build --config bench/auto-capacity.vite.config.js`.
4. Copy `.tmp/auto-capacity/raw` and `manifest.json` into the build root.
5. Serve `.tmp/auto-capacity/build` using `bench/palette-integration-server.mjs`,
   with a dedicated reports directory and loopback port. Reverse that port using
   authorized ADB, open `/bench/auto-capacity.html`, and tap Run paired benchmark.
   The report POSTs as `performance` to the existing bounded report receiver.
6. The optional Set experiment is `node bench/auto-capacity-seed-set.mjs` and
   writes `.tmp/auto-capacity/seed-set-results.json`.

Controlled browser reports were saved to
`.tmp/auto-capacity/reports/android-performance.json` and
`.tmp/auto-capacity/reports/desktop-performance.json`; these are test artifacts,
not assets downloaded by app clients. The research-only benchmark bundle was
about 33 kB raw / 11 kB gzip and is also excluded from the production build.

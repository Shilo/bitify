# Keep real-art study: desktop and Android parity

Date: 2026-10-15. HEAD `f49000d` (with the uncommitted `evaluate.mjs` change that pads
animation frames onto one canvas). Research only. Nothing is committed and `src/` is unchanged.

## Scope

These checks test only the research modules, not the built app. `pipeline.js` and the
`../keep-alpha-weighting-spike` candidates ran in two native browser engines. The inputs
were the RGBA bytes that Sharp decoded in Node, verified by SHA-256 before each run. Each
case compares the five variants: production, none, linear, squared and cut128. For every
variant, the page checks the shared palette, the subset for each unit, and the hash of
every output frame against Node's expected summary.

The checks do not test browser image decoding, the app's import worker, Tile, the caches,
or PNG/GIF encoding or export. The blind sheets and the blind key were not opened.

## Case sets

- **Main**: `results/browser/` (14 cases, written by `evaluate.mjs`). Thirteen use
  `glow-orb-red` (175×180) and one uses `glow-lens-flare` (512×512). There are 12 cases
  where the policies give different output and 2 where they give the same output.
- **Extra**: `device/extra-cases/` (9 cases, written by
  `device/export-extra-cases.mjs` without touching `results/`). It adds one case where the
  policies differ for each remaining category:
  - shadow: `shadow-tree-topdown`, auto c8 oklab
  - antialiased: `aa-tango-face-smile`, auto c4 oklab, dither 4×4
  - fade: `fade-radial-light`, Resurrect 64 c4 oklab
  - effect: `fx-sparks-64`, auto All
  - all-soft: `soft-cloud`, auto c4
  - synthetic: `synthetic-many-soft-colors`, auto c16
  - animation: `anim-para-fire` (8 frames), auto c8
  - animation: `anim-rubberduck-magic` (6 frames), PICO-8 c4 rgb
  - wall: the antialiased category wall (5 units), auto c8 oklab

  The exporter checks two things against `results/results.json` before it writes
  anything: every decoded source hash, and every variant's palettes and frame hashes.
  All of them matched.

## Results

| Device | Engine | Main | Extra |
|---|---|---|---|
| Desktop: Claude desktop built-in browser pane, Windows 11 | Chrome 152.0.7977.130 | 70/70 PASS | 45/45 PASS (2 runs) |
| Android: Pixel 8 Pro (husky), Android 17, USB, CDP | Brave 1.97.56, Chromium 155.0.8059.40 | 70/70 PASS | 45/45 PASS (2 runs) |

There were no mismatches. Every palette and output hash is identical across Node, desktop
and Android. `device/compare.mjs` reran every case in Node from the gzipped sources and
reproduced every expected summary.

## Timings

These are the totals of each case's variant times, in milliseconds.

| Set | Node 25.0.0 | Android | Desktop pane |
|---|---|---|---|
| Main | 1369 | 2415 | 1063 |
| Extra | 1442 | 2790 / 2785 | 13113 / 12978 |

The Android times are steady at about 2× Node. The slowest case was the 5-unit wall
(cut128: 305 ms on Android).

The desktop extra runs are an outlier caused by the environment, not by the algorithm. The
browser pane was hidden and unfocused during the runs. In that state, a plain integer loop
of 2e8 iterations took 1856 ms in the pane and 180 ms in Node. That points to a renderer
with throttled CPU. A cooperative yield over MessageChannel took about 0.1 ms, so the
yields were not the cause. Do not use desktop pane times as performance evidence.

## Files

- Scripts in `bench/keep-real-art-study/device/`:
  - `export-extra-cases.mjs`
  - `android.mjs`: opens and closes its own CDP page, and never calls `browser.close()`
  - `compare.mjs`
- Receipts in `bench/keep-real-art-study/device/receipts/`:
  - `main-{desktop,android}.json`. The copies that `serve.mjs` wrote stay in
    `results/browser/receipt-*.json`.
  - `extra-{desktop,desktop-rerun,android,android-rerun}.json`
  - `summary.json`, which holds the timing for each case on each device
  - `android-{main,extra}.png`

Cleanup: `adb reverse tcp:5360` was removed. The phone's other reverses and the 9333
forward were already there, so they were left in place. The server was stopped.

# Palette algorithm experiments

Original synthetic research, October 14, 2026. Production modules are imported only as baselines; production source is unchanged.

Run `node bench/palette-algorithm-spikes/run.mjs` from the repository root. It requires Node and the repository checkout, with no new dependency. The script writes 61 files in `output/`, including synthetic fixtures, comparison outputs, `results.json`, a PNG contact sheet, a self-contained labeled SVG sheet and `index.html` with labels. `node bench/palette-algorithm-spikes/label-sheet.mjs` refreshes only the SVG labels from existing recorded results.

The current quantizer, subset selector and automatic palette generator supply baselines. The independent prototypes are exhaustive continuous-pair ordered dithering, grid-aware ordered dithering, serpentine Floyd–Steinberg diffusion in linear RGB and Oklab, a manually reserved accent, and unbounded direct-K Oklab fitting. The first ordered variant deliberately remains as a failed experiment.

The script asserts palette membership, count bounds, exact active-palette pixels, alpha classification and strength-zero baseline equality for all six fixtures and five conversion modes. It also measures unchanged-pixel churn after one source pixel changes, whole-clip versus independent subset selection, and an incorrect display-coordinate ordered preview. The latter is a failure control, not a production preview test.

Point and 4×4 block-average Oklab errors measure different objectives. PNG sizes use truecolor RGBA with filter 0, not the production indexed encoder. Timings are Node observations that include prototype allocation; they do not establish browser or phone performance. Direct-K generation timings have different scheduling and bounds from production and are not speedup claims. The prototypes intentionally violate production flat-loop and scratch-memory requirements and must not be pasted into the runtime.

Full decisions and limitations:

- [Full-palette dithering](../../docs/research/palette-improvement-spikes-2026-10-14/01-full-palette-dithering.md)
- [Matching and low-color fidelity](../../docs/research/palette-improvement-spikes-2026-10-14/02-matching-and-low-color-fidelity.md)

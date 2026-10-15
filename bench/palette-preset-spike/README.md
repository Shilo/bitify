# Original preset comparison

Run `node bench/palette-preset-spike/run.mjs` from the repository root. Open `output/index.html` or the self-contained labeled `output/comparison.svg`; numerical evidence is `output/results.json`.

`endesga-8.json` and `slso8.json` are primary Lospec single-palette API responses retrieved October 14, 2026. Published author and swatch order are retained. Sources:

- https://lospec.com/palette-list/endesga-8.json
- https://lospec.com/palette-list/slso8.json

The harness uses these saved responses, existing Grayscale8 and PICO8 presets, and original synthetic artwork only. It imports current nearest matching/limiting for behavior baselines. Reproduction requires no network or new dependency.

The flat-region fixture uses constructed role labels and three shades each for skin/cloth/wood/metal, an outline and a tiny red accent. Labels provide probe locations, not inferred semantic ground truth or proof of material readability. The chromatic ramp has no authored roles. All runs use Oklab, cap8, alpha cut128, no dithering and no cleanup. Limiting an eight-color palette may remove unused entries without changing nearest output.

Oklab point error favors the selected matching objective; probe collisions and shade-step counts are separate constrained diagnostics. No user study, real-art comparison, diffusion, animation, runtime timing or native production export test was performed. PNGs use a small independent RGBA encoder solely for visual artifacts.

# Independent small-color review

This folder contains neutral research artifacts only. No production code is edited.

`manifest.json` freezes 18 PNG files and two two-frame sequences, source archive
hashes, licenses, exact output settings and semantic regions. The real assets are
Kenney CC0; `licenses/` retains their supplied notices. The owned knight is retained
from an earlier counterexample; the three new owned controls are generated here.

Rebuild sources on a fresh checkout:

1. Run `node bench/important-colors-review/download.mjs` (three small official
   archives, data only; `raw/` is ignored).
2. Expand each ZIP into its same-named `raw/` subdirectory with PowerShell
   `Expand-Archive` or another ZIP extractor. Do not execute downloaded files.
3. Run `node bench/important-colors-review/curate.mjs` to generate ignored source
   inventories and contact sheets, then `node bench/important-colors-review/freeze.mjs`.
   Compare the resulting file hashes with the committed manifest before analysis.

After the candidate agent's `bench/important-colors-spike/run.mjs`, run
`node bench/important-colors-review/review.mjs` for separate Sharp-decoded output
measurements. `independent-metrics.mjs` imports neither production nor candidate
modules. Montage ROIs translate the already-frozen component regions; they do not
select favorable coordinates after output. `confirm.mjs` saves focused explicit
region results; add `--render` for the six uniform-background native/enlarged sheets.

The attempted random-label review in `blind/` is **invalidated**, not a valid blind
quality study. See its `STATUS.md`. No preference count or acceptance conclusion
uses those provisional judgments. The final review instead confirms actual mapped
RGB values and explicitly labeled native PNGs, with independent reviewers.

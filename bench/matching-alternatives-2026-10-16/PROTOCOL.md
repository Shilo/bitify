# Alternative palette matching experiment

Review and research only. Preserve production source and dependencies.

Before inspecting results, compare current Oklab and RGB against CIEDE2000,
CAM16-UCS, CIELAB, CIELUV, IPT, HCT UCS-style distance, HDR-oriented Jzazbz and
ICtCp, redmean and linear RGB, Oklab OK2, hue/chroma/lightness weighting,
Oklrab, experimental Helmlab, and an exploratory adjacency-aware heuristic.
Check the algebraically equivalent OKLCH distance as a redundancy control.

Use the prior 29 images/frames and all fixtures from the pre-existing annotated
important-colors manifest. Keep original sheets, annotated real sprites, effects,
scene captures, animations and authored counterexamples as separate groups.
Use full resolution, all target colors, Cut128, no dithering, no Cleanup.
Preserve exact palette RGB members in every method.

Compare source/output error in Oklab, CIEDE2000 and CAM16-UCS; tone error,
introduced chroma on neutral pixels, hue error on chromatic inputs, merged edges,
tone reversal and dominant-color collisions between pre-existing named regions.
Hue error assigns 90 degrees when a chromatic source maps to a near-neutral
target. It is a declared task penalty, not a perceptual color-difference standard.

Do not infer visual quality from the metric minimized by the candidate itself.
Measure differences from both existing modes, inspect real visual output, test
one-byte input perturbations, exact membership, palette reorder, alpha and repeat
determinism. Validate CIEDE2000 against the author's 34 reference pairs. Compare
the two independent CAM16 implementations under identical viewing conditions.
Measure sprite and high-entropy kernel cost separately; library/prototype overhead
must not be represented as the unavoidable cost of a production implementation.

A useful mode needs an explainable purpose and repeated visual benefit. Novel
output alone does not establish usefulness. A general default replacement needs
broader evidence than an optional artistic matching objective. No new mode is
authorized for implementation by this experiment.

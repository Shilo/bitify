# Palette matching decision

Adopt one global **Matching: Oklab / RGB** row in Palette settings. Keep Oklab as default,
preserving previous output. Skip palette dithering and additional color-space controls.

Both rules preserve exact palette RGBs, then exhaustively choose the closest allowed
color. Oklab minimizes squared Euclidean distance after sRGB linearization and the
published Oklab transform. RGB minimizes unweighted squared differences between encoded
0–255 channel values. There are no brightness, contrast, saturation or strength changes.
Identical source RGBs map identically across images and animation frames at one setting.
Neither can reproduce missing palette colors or guarantee the artist's preferred result.

The objection to RGB is an unfamiliar extra choice without a universal visual winner.
Its justification is a distinct, reproducible objective: prior experiments with the
supplied 255-color palette changed 7.6–47.0% of visible pixels across the six buildings.
RGB looked closer on some blue glass; other shades favored Oklab or remained poor under
both. Automatic per-image selection would compromise consistent source-color mapping.
The objection to Oklab is that approximate perceived distance can disagree with artistic
intent. Compatibility and a useful perceptual objective justify the default, rather than
an assertion of universal visual superiority. A main agent and independent reviewer
challenged both positions and agreed on these two options.

| Candidate | Why it might help | Why no additional control now |
| --- | --- | --- |
| HSL / HSV | A deliberate hue-priority policy | Circular hue, neutral hue and axis weighting need a defined artistic goal; popularity is not evidence of better matching. |
| CMYK | Printer/ink reproduction | This browser sprite workflow has no printer/profile target. A naive RGB-to-CMYK distance assumes an ink objective. |
| CIELAB / CIEDE2000 | Another perceptual difference model | Credible future comparison, but no demonstrated improvement here; adds overlapping choices and conversion/formula validation. |
| Linear RGB | Light arithmetic | Useful for light mixing; no demonstrated matching advantage over either offered objective for these sprites. |
| OKLCH | Explicit hue/chroma priorities | Euclidean Cartesian Oklab distance already has an equivalent polar expression. Different axis weighting would introduce a new policy requiring evidence. |

[W3C CSS Color 4](https://www.w3.org/TR/css-color-4/) documents HSL's uneven hue spacing
and powerless neutral hue, separates encoded and linear-light RGB, and supplies Lab/Oklab
conversions. HSV's similar hue/neutral concern is an inference from its representation;
no HSV algorithm was implemented or benchmarked here.
[Oklab's author](https://bottosson.github.io/posts/oklab/) describes its design goals and
model-based evaluation limits. These sources support the objectives, not aesthetic rankings.
[W3C CSS Color 5](https://www.w3.org/TR/css-color-5/#device-cmyk) distinguishes device/profile
CMYK from naive approximations.
[Sharma, Wu and Dalal](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/ciede2000noteCRNA.pdf)
provide supplementary CIEDE2000 tests and discuss discontinuities whose practical magnitude
is often small. Validation complexity is a reason to require demonstrated benefit here,
not to dismiss the formula as unusable. No speed comparison with these unimplemented spaces
is claimed.

Matching persists independently of palette records. Missing/invalid saved values restore
Oklab. Reset restores Oklab and Opacity cut 128 without replacing the palette. Wall, Preview,
Save, Copy and ZIP share the choice; export snapshots capture it before asynchronous work.
Metric changes cancel older preview jobs. One short row and conditional opacity controls
use the app's existing segmented buttons, with 44px touch targets and a 360px maximum panel.

## Verification and review

All six supplied building PNGs were exercised in both modes through Codex browser,
including expanded previews and native Save-all downloads. Separate PNG decoding and
scalar nearest references verified every output RGB and transparency pixel against the
same exact 255-color imported palette. Default Oklab PNG bytes matched the earlier app
exports. The six sources are still images; GIF checks used the explicitly synthetic
12-frame motion/fade fixture and two-frame 255-color/empty calibration fixture.

Matching-specific built-app checks passed 195 Oklab and 189 RGB assertions. Coverage includes
native/reduced previews, PNG/Copy/ZIP/GIF request-time snapshots after changing matching,
task-separated changes during pending previews, reload/invalid metadata/family/reset,
and coarse-pointer opacity panels at narrow portrait and landscape sizes. The retained
regression run passed all 132 legacy color-pair/style combinations and five default full
presets; additional retained RGB preset checks use an independent scalar reference.
The unit suite passed 324 tests, and the production build passed.

Review and browser checks caught an inherited CSS width/row conflict, 38px mobile
segmented targets and tests that changed matching only within one batched task. These
were corrected and rechecked. Matching changes now cancel running work across actual
task boundaries, with final and delayed pixel assertions. No visual-optimality or
bug-absence guarantee is inferred from exact nearest-distance results. Physical phones,
Safari and arbitrary input color profiles remain unverified.

Nine additional storage checks verified palette selection/edit retains RGB, failed
library deletion preserves settings and saved colors, and successful reset restores
Oklab/cut128. The async options-capture unit test uses a deterministic clock and an
uncached later-batch color so neither one-batch completion nor memoization can hide a
metric mutation. The corrected full 324-test suite passed again.

# Auto refinement: same-source PixelLab comparison

Recorded October 15, 2026. Research only; no production behavior changed. The useful result is to retain the current default, rather than silently insert per-asset centroid fitting. A lower mean error did not preserve material cues, exact pixels or the shared Auto target. The bounded shared-target swap candidate made no change in this cohort.

## Public contract and retained coverage

PixelLab's current public reducer accepts a requested count of 2–256 or a target-palette image, mutually exclusively. Multiple equal-size frames use a shared palette. Omitted count asks the service to detect a size; it is not an equivalent K-color test. Ordered dithering defaults to None. These are public product contracts, not claims about its implementation. [Official API schema](https://api.pixellab.ai/v2/openapi.json), [official MCP tool reference](https://api.pixellab.ai/mcp/docs).

The study reused retained native PNGs before adding exactly five authorized REST jobs: inventory K16 and breastplate K2/4/8/16. Each sent the unchanged owned source PNG, numeric count and no target or dithering options. All five returned HTTP200 and reported `generations: 0.1` each, total 0.5 reported generations. This is response usage, not a dollar price or an independently observed account balance. No further service jobs were made. The [sanitized records](../../bench/auto-refinement-comparison/native-gap-results.json) retain endpoint, source hashes, settings, output metrics and timings, without credentials.

The resulting fifteen cases comprise:

- Native inventory 64×64 and breastplate 16×16 at K2/4/8/16: eight real-art comparisons.
- Opaque 64×32 grayscale ramp at K2 and K8; a two-frame shifted ramp at K8 with equal frame weights.
- Partial-alpha two-color K8 and partial-alpha ramp K2, using the app's explicit Keep mode for equivalent alpha behavior.
- A two-color input requested at K8, verifying underfill; the retained website numeric2/None ramp PNG as a separate transport check.

Fixed-target results are excluded from this Auto-fitting experiment: imposing the same authored RGB palette answers a different question. No new MCP job was needed; its existing contract/transport review remains separate. The new K16 REST result does not establish website/MCP K16 output equality.

## Equal capacity and measurement

[The offline runner](../../bench/auto-refinement-comparison/run.mjs) fits current Auto64 independently for each service request, then applies the existing per-asset cap. A multi-image request is one equal-duration animation asset, so there is one subset across its frames. This is not a multi-asset wall comparison. The larger weighted-wall and unequal-duration experiments belong to the companion refinement spike.

The candidates start from that exact current subset. Centroid refinement may invent RGB values outside the shared Auto target. Subset swaps can choose only the original target's RGB values. Mean, strict and rare guards are all retained; none is substituted into the app. The strict and rare guards compare source-color errors with the original baseline. The shared target restriction and visual quality remain separate requirements.

All app outputs use actual full-source production quantization: Oklab matching, Cleanup Off and dithering Off. Binary/opaque sources use Cut128; partial-alpha controls use Keep with eligibility1. The independent metric is squared Oklab point distance over eligible source pixels, weighted by frame duration. Alpha bytes, dimensions, visible RGB count, previous exact-pixel losses and source-RGB regressions are checked separately. Hidden RGB under alpha0 contributes neither a quality score nor a false transparency mismatch. Requested K is an upper budget, not a requirement to fabricate K distinct visible colors.

[Results and dependency hashes](../../bench/auto-refinement-comparison/results.json) include source PNG/decoded-RGBA hashes, native output hashes and the candidate/core modules used. Node timings are three sequential core medians. They exclude decoding, worker transfer, UI and native service networking; candidate medians include calculating all three guard policies. Service timings are single HTTP round trips including server work. These columns cannot establish a production or phone speed ratio.

## Native art results

Smaller point error is better for this metric. Strict/rare centroids and every shared-target swap policy retained the current result in all eight rows, so their error is the Current column. The mean-centroid column is included to show both the apparent numerical gain and its costs.

| Source | K | Current | Mean centroid | PixelLab native | Mean centroid previous exact pixels lost |
|---|---:|---:|---:|---:|---:|
| Inventory | 2 | 0.0184830 | 0.0179684 | 0.0464126 | 11 |
| Inventory | 4 | 0.0078121 | 0.0075739 | 0.0117573 | 0 |
| Inventory | 8 | 0.0044035 | 0.0041765 | 0.0056373 | 26 |
| Inventory | 16 | 0.0023047 | 0.0020417 | 0.0026432 | 26 |
| Breastplate | 2 | 0.0176270 | 0.0175342 | 0.0205699 | 7 |
| Breastplate | 4 | 0.0054676 | 0.0052483 | 0.0054529 | 13 |
| Breastplate | 8 | 0.0012866 | 0.0011899 | 0.0015293 | 28 |
| Breastplate | 16 | 0.0004790 | 0.0004095 | 0.0005571 | 48 |

Current has lower point error than the native service in seven of these eight small art cases. The service wins breastplate K4 by about 0.27%; it also slightly wins the synthetic K2 ramp. That mixed result matters: neither service nor app is a universal quality winner. The service inventory K16 uses 15 visible RGBs; all other real-art outputs reach their requested budget. All fifteen cases passed dimensions, equivalent-alpha and visible-count assertions.

Mean centroids lower the eight art means by roughly 0.5–14.5%, but worsen 19–110 original source-RGB groups per art case and invent 2–16 colors outside the shared target. Exact-pixel losses occur in seven cases; inventory K4 has no exact baseline source pixels to lose. These findings independently reject a silent default replacement even before evaluating UI/export identities.

## Native-size and enlarged counterexamples

The [interactive comparison sheet](../../bench/auto-refinement-comparison/index.html) places each source beside current, mean centroid, strict centroid, shared-target swaps and native service output at original dimensions and enlarged with nearest-neighbor pixels. Static figures retain the same views: [inventory](../../bench/auto-refinement-comparison/sprite-paired.png), [breastplate](../../bench/auto-refinement-comparison/armor-paired.png). Native artwork was inspected together with enlargement; enlargement exposes changes but is not its own artistic-quality score.

On breastplate K4, mean centroid lowers mean error 4.0% while cooling the brown shoulder/edge accents toward dark gray. At source coordinate (4,2), original `#543b25` becomes current `#3c3124`, mean-centroid `#362e2c` and native-service `#393230`. The candidate's error for that one-pixel brown group rises from 0.0034148 to 0.0058343. The K4 service's almost identical overall error also comes with a visibly different distribution of body highlights. A point-average winner therefore does not establish preserved material identity or the artist's preferred highlight shape.

Inventory K2 shows the complementary service counterexample: its dark/light clustering flattens several filled interiors and changes the book, bottle and tool silhouettes' internal readability relative to current. At K16 the differences are much smaller; mean centroids improve shading error while recoloring previously exact source pixels. These are observations on two owned examples, not a blinded artist study or an assertion that every detail necessarily becomes worse.

## Alpha, transport and cost limits

The partial-alpha controls match only because Keep was selected explicitly. They do not justify comparing the app's default Cut128 with a service retaining fractional alpha. The two-color K8 control stays two colors with zero error in all methods. The equal-frame K8 ramp checks shared-palette rendering, but supplies no evidence about unequal duration weights or general animation flicker.

The retained website numeric2/None ramp and REST numeric2 ramp have identical decoded input RGBA and identical decoded output RGBA. This is one paired fixture, not proof that all transports share algorithms or settings. Website target/cap/dither compatibility, native downloads and validation remain documented by the [actual website output verification](pixellab-review-2026-10-14/web-output-verification.md). No API price, website charge or general timing guarantee is inferred from that equivalence.

In this run, art current preparation/capping medians span about 0.34–6.96ms; calculating all centroid guards adds about 0.04–0.39ms on these tiny sources. Gap-fill REST round trips span 266–1059ms. Warm caches, worker lifecycle, larger exact-color bounds and phone main-thread latency require the companion device study; these Node figures alone do not pass those gates. Reruns may change timings, so raw current-run samples remain authoritative.

## Decision and remaining useful work

Keep current Auto/Max colors unchanged. Mean-only per-asset centroids change published target membership and exact pixels, while strict/rare centroids delivered no benefit here. The six-pass shared-target swap search found no improvement here; do not add latency or a control merely because the experiment exists. Neither result proves that all possible refinement strategies are exhausted.

Any future fitting proposal should first preserve the shared wall target, authored/fixed palettes, source alpha, GIF duration weighting and every baseline exact/rare feature. It needs adverse fixtures and native visual review as well as a point-error guard. The companion independent review/device results determine whether a narrower candidate warrants another spike; no production work is authorized by this report.

The remaining useful product research is a clear lock contract: retaining a palette entry versus forcing a semantic source region are different operations, and locks must count toward the cap. The earlier one-pixel eye counterexamples already show why availability alone does not guarantee use. Defer permanent 2/4/8/16 shortcut rows and additional fitting controls: the existing numeric cap handles these values, and no demonstrated benefit here justifies more phone controls. Preserve the existing Count/Use output colors workflow for extracting the actual result, rather than treating displayed Auto64 swatches as the emitted subset.

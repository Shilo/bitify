# Palette matching research spike — closed, no implementation

October 16, 2026. Final disposition confirmed by the user after the independent review. Some machine receipts use October 17 UTC; this is the same local-date research session.

## Final decision

**Close this spike with no implementation planned. Retain the existing Oklab and RGB matching choices.** Do not add brightness/Value matching, CAM16-UCS, OK2, CIEDE2000, or another setting from this research. No feature task, migration, production dependency, or follow-up experiment is authorized or scheduled by these documents.

CAM16-UCS remains a credible experimental candidate in the retained comparison harness. Its technical plausibility and distinct output do not establish sufficient practical benefit. The initial recommendation to add it was too strong and was revised after independent challenge. “Deferred” here means no implementation, with no commitment to revisit it. Any future investigation requires a separate decision.

## Questions and scope

The user asked whether brightness or Value could make palette matching more distinct and predictable, then requested a broader search for worthwhile matching algorithms and color spaces. The user required primary research, tests using the existing sprites and Codex browser, and an independent sub-agent challenge to CAM16-UCS. This was a research/review request throughout.

The current matcher preserves exact RGB members of the target palette. Otherwise it chooses the nearest target color using squared Oklab or encoded-sRGB distance. Oklab already includes perceived lightness. Neither method understands objects, intended shading ramps, or which small details must remain separate. Changing the distance formula changes that compromise; it cannot guarantee preservation of semantic detail.

## Complete research record

| Document | Contents |
| --- | --- |
| [Brightness and lightness study](2026-10-16-palette-lightness-matching.md) | Current matcher review; distinctions between Value, lightness, luminance and luma; grayscale and weighted alternatives; sources, metrics, stability, browser checks and reproduction. |
| [Alternative matching study](2026-10-16-alternative-palette-matching.md) | Twenty methods; corpus and protocol; color/tone/edge results; visuals; independent implementation checks; runtime, cap and Auto probes; revised recommendation and reproduction. |
| [Independent CAM16 challenge](2026-10-16-cam16-independent-challenge.md) | Standards versus adoption; supporting and critical primary papers; independent rerun; shade-loss counterexamples; limits of the original conclusion. |

This closure document governs the final disposition. Suggestions in the supporting reports about possible future evaluation or integration are conditional research notes, not planned work.

## Experiments and retained evidence

| Stage | Coverage | Evidence |
| --- | --- | --- |
| Brightness/lightness | 29 images or frames × 12 palettes × 12 methods = 4,176 renders | [Results](../../bench/matching-spike-2026-10-16/output/results.json), [stress checks](../../bench/matching-spike-2026-10-16/output/stress.json), [browser receipt](../../bench/matching-spike-2026-10-16/output/browser-receipt.json) |
| Broader alternatives | 47 images or frames × 12 palettes × 20 methods = 11,280 renders | [Declared protocol](../../bench/matching-alternatives-2026-10-16/PROTOCOL.md), [results](../../bench/matching-alternatives-2026-10-16/output/results.json), [decision aggregates](../../bench/matching-alternatives-2026-10-16/output/decision-summary.json) |
| Stability and math | Input perturbations, exact membership, ties, finite coordinates, independent CAM implementations, official CIEDE2000 reference pairs and direct-kernel checks | [Stress results](../../bench/matching-alternatives-2026-10-16/output/stress.json), [kernel validation](../../bench/matching-alternatives-2026-10-16/output/kernel-validation.json) |
| Integration feasibility | 120 isolated subset cases and a frozen shared Auto palette; production code untouched | [Probe results](../../bench/matching-alternatives-2026-10-16/output/integration-probes.json) |
| Browser verification | 1,128 baseline comparisons; 940 candidate hashes; 940 Keep-alpha checks; 47 native-decode comparisons; 34 CIEDE2000 reference pairs; zero recorded failures | [Browser receipt and timings](../../bench/matching-alternatives-2026-10-16/output/browser-receipt.json) |
| Independent challenge | 816 finalist renders: 17 real sprites × 12 palettes × 4 methods; hashes and diagnostics reproduced | [Audit script](../../bench/cam16-independent-challenge/audit.mjs), [audit results](../../bench/cam16-independent-challenge/audit.json) |
| Distinctness | Output-color distances from both existing modes, rather than label differences alone | [Novelty probe](../../bench/matching-alternatives-2026-10-16/output/novelty-probe.json) |

These counts describe coverage. They are not independent artist preference judgments. Frames, related sprites and repeated palette combinations share substantial information.

## Findings that determined the decision

**Brightness-only matching discards useful information.** On the five original sheets and twelve presets, pure Oklab lightness reduced lightness error by 8.8% but increased RMS Oklab color error by 16.5%. Equal-lightness colors can carry different details; arbitrary colored palettes can introduce rainbow bands. HSV Value and HSL Lightness are particularly poor labels for promising perceptually predictable brightness. Weighted lightness is a compromise with insufficient demonstrated benefit for another control.

**CAM16-UCS produces distinct, plausible color-family choices.** Across the 17 real sprites and six multicolor palettes, its output differs from both current modes on an average 16.6% of visible pixels. Mean CIEDE2000 error improves about 8.4% versus Oklab. The independent audit found improved hue diagnostics in 64 of 102 combinations and worse hue diagnostics in zero. These are supportive diagnostics, not preference votes.

**Those gains can remove intentional shading.** In the same multicolor comparison, mean Oklab-lightness error increases about 35.6% and merged qualifying source edges increase from 7.8% to 10.5%. Edge merging worsens in 48 combinations and improves in 13. The shield with Resurrect 64 loses its entire inner metal shade step; the heart with mulfok32 loses a separate warm shade. Both receive better average color scores. Codex browser inspection confirmed the losses: [shield comparison](../../bench/matching-alternatives-2026-10-16/output/browser-challenge-shield.png), [heart comparison](../../bench/matching-alternatives-2026-10-16/output/browser-challenge-heart.png). The [accessory comparison](../../bench/matching-alternatives-2026-10-16/output/browser-accessories.png) retains a favorable material-color example.

**Standardization and adoption do not establish fitness for this task.** CAM16-UCS is a research-backed perceptual distance space. [CIE 248:2022](https://cie.co.at/publications/cie-2016-colour-appearance-model-colour-management-systems-ciecam16) covers the CIECAM16 appearance model; the [CIE uniform-space committee](https://www.cie.co.at/technicalcommittees/recommend-cam16-ucs-cie-uniform-colour-space) separately describes recommending its uniform space. Original CAM16 and CIECAM16 also have documented differences. Google Material's CAM16/HCT use is meaningful adoption, but its [WSMeans image quantizer](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/quantize/quantizer_wsmeans.ts) uses Lab. The research did not establish CAM16-UCS as a popular fixed-target sprite matcher. The independent report contains the detailed primary-source analysis and competing research findings.

**No other candidate automatically earns the setting.** OK2 is inexpensive but shares some shade losses. CIEDE2000 has interesting local benefits and a more expensive pairwise search. Equivalent OKLCH distance reproduces Oklab exactly. Other tested spaces and weighting rules did not establish a sufficiently clear additional purpose. The exploratory edge-aware heuristic distorted colors and made the same source RGB depend on its neighbors; it was not a faithful implementation or rejection of every published structural recoloring method.

## Limits and unresolved questions

The central quality comparison contains 17 real sprite inputs, including related Kenney assets and repeated pilot poses. It is a convenience sample. No blinded artist comparison was conducted. Metrics value different objectives, are correlated, and do not know whether a lost highlight matters. Diagnostic thresholds are not validated aesthetic acceptance thresholds.

Numerical tests support stability within the tested sRGB domain and fixed viewing conditions. They do not prove universal superiority or every possible custom palette. The independent agent reran the shared implementation; this is reproducibility, not an independently authored color model or observer study. The separate Google/Color.js coordinate agreement is documented in the alternative study.

Desktop prototype timings do not establish physical-phone, Safari, large-wall or high-entropy performance. Candidate cap/Auto probes do not validate an integrated feature. Candidate dither, Cleanup, animation playback, cancellation, storage, cache identity and preview/export behavior were not fully integrated and tested. No implementation was attempted to close those gaps.

If a separate future request reopens this topic, the missing evidence is repeated practical preference with preserved intentional details on art and custom palettes from additional independent artists. Additional model names or more renders of the same assets would not resolve that question. This is a condition for reconsideration, not a scheduled next step.

## Reproduction and portability

Run commands from the repository root. The two matrix scripts currently locate Sharp at this machine's bundled Codex runtime path. On another machine, adapt that research-only import to an available Sharp installation. Original asset fixtures and their manifests must be available; their paths, hashes and provenance are retained in the detailed results. Generated PNG/RGBA matrix files are ignored and must be regenerated. Research JSON, receipts and browser screenshots are retained.

The alternative engine uses isolated dependencies under `.tmp/matching-alternatives`, pinned to Color.js 0.7.1 and Material Color Utilities 0.4.0. The [dependency lock](../../bench/matching-alternatives-2026-10-16/research-deps-lock.json) records them. They were not added to product dependencies.

```powershell
node bench/matching-spike-2026-10-16/run.mjs
node bench/matching-spike-2026-10-16/stress.mjs
npm install --prefix .tmp/matching-alternatives --no-audit --no-fund --ignore-scripts colorjs.io@0.7.1 @material/material-color-utilities@0.4.0
node bench/matching-alternatives-2026-10-16/run.mjs
node bench/matching-alternatives-2026-10-16/stress.mjs
node bench/matching-alternatives-2026-10-16/kernel-validation.mjs
node bench/matching-alternatives-2026-10-16/integration-probes.mjs
node bench/matching-alternatives-2026-10-16/summarize.mjs
node bench/matching-alternatives-2026-10-16/novelty-probe.mjs
node bench/cam16-independent-challenge/audit.mjs
```

For interactive inspection, run either server in a separate terminal:

```powershell
node bench/matching-spike-2026-10-16/serve.mjs
node bench/matching-alternatives-2026-10-16/serve.mjs
```

Open `http://127.0.0.1:5371/` for brightness comparisons or `http://127.0.0.1:5372/` for alternatives. Each viewer offers **Verify in this browser**, which writes its browser receipt. Reverification overwrites that receipt with the new environment and timing. The saved canvas-roundtrip failure in the brightness study is retained as a diagnostic: native product PNG decoding resolved that test-setup mismatch.

## Change boundary

This spike added research reports, isolated harnesses, evidence and temporary research dependencies. It did not change product matching, UI, storage, product dependencies, specifications or deployment. Unrelated working changes were preserved. The research is complete and closed; implementation is not planned.

# Independent Keep selection review

October 15, 2026. Baseline `310df63`. Research and acceptance gates only; no production changes are authorized by this document. No service calls or vendor implementation references are needed for this experiment.

## Predeclared gates (before candidate results)

- Cut at every existing cutoff, opaque artwork, binary transparency, and unaffected 1-bit behavior must remain byte-identical. Keep preserves every source alpha byte and existing RGB target membership. Auto All retains all visible unique RGBs when there are at most 64.
- The faint-spill fixture must improve opaque-core output and independent composited error in both matching metrics. Lower fitting error alone is insufficient.
- Hold out a useful low-alpha halo, a fade, antialiased edges, two rare opaque red eyes, all-soft artwork, 32 distinct low-alpha RGBs, and over 4096 distinct RGBs. Evaluate black, white, and checker compositing using independently implemented encoded-RGB and Oklab errors. Inspect opaque and alpha-at-least-128 regions separately, so an aggregate improvement cannot hide opaque detail loss.
- A candidate fails a held-out case if composited channel RMSE increases by more than 2 byte values on any background, or opaque-region channel RMSE increases by more than 1 byte value, unless a separately reviewed visible benefit justifies an explicit tradeoff. Do not silently average away a failed case. The exact-color AA and small-color-set controls require zero visible RGB changes with Auto All.
- Equal per-asset influence, duration scaling/splitting, chunk boundaries, wall order, source immutability, the bounded-histogram second pass, identity/cache separation, cancellation, worker fallback, and preview/export consistency must retain their contracts. Capture and selection identities must distinguish Keep from Cut even at cut 1.
- Timing must compare equivalent work, retained memory must not grow with source pixels beyond existing buffers, and cooperative scheduling must remain bounded. Two review rounds maximum; report unresolved tradeoffs rather than manufacture consensus.

The independent held-out generator and composite metrics are in `bench/keep-alpha-weighting-review/fixtures.mjs`. Fixtures were authored before seeing candidate fixture design or results. They are synthetic stress cases, not evidence that tracked real artwork has a defect.

## Round 1: independent measurements and challenge

Research candidate source SHA-256 values are frozen in `bench/keep-alpha-weighting-review/results.json`; the candidates are copies outside production source. `run.mjs` measured 162 output cases (9 fixtures × 3 policies × 2 matching metrics × 3 output paths) with 81 exact chunk-invariance checks. `invariants.mjs` added 27 wall-order, equal-asset resize, duration scaling/splitting and pre-abort checks. `uniform-alpha.mjs` added 240 constant-alpha invariance cases across 120 seeded sources. All 348 structural/invariance checks passed. Source alpha bytes stayed exact in all 162 output cases.

All first-pass held-out cases satisfy the predeclared numeric tolerances, but the intended-halo challenge rejects the squared policy despite its aggregate improvement. In Auto/cap3/Oklab, squared weighting removes the cyan color of the alpha-48 halo: its soft-region composited channel RMSE rises from 0 to 22.73 on black, white and checker backgrounds. Total image RMSE improves 18.87 to 17.35 because the opaque core is restored, proving that the aggregate result conceals a substantial visual tradeoff. Linear retains the cyan halo and leaves this output unchanged.

Both weighted policies repair the alpha-one spill fixture: Auto/cap3/Oklab opaque-core channel RMSE falls from 88.41 to 0, and whole-image composite RMSE from 33.15 to 0.56. AA edges and the 32-source-RGB Auto/All controls stay exact. Binary transparency remains identical under both policies.

After freezing the held-outs, I cross-checked the researcher's negative `many-soft-colors` case using the independent metrics (`crosscheck.mjs` / `crosscheck.json`). The case has 5120 soft pixels and no opaque core; it is meaningful as an algorithm stress case, not proof about typical sprites:

| Path | Baseline → linear black composite channel RMSE | Baseline → linear black composite Oklab RMSE |
|---|---:|---:|
| Auto/cap3/Oklab | 36.4166 → 36.8524 | 0.095281 → 0.096476 |
| Resurrect64/cap4/RGB | 30.3781 → 30.5197 | 0.098125 → 0.105997 |

The corresponding white-background errors also increase. Linear's absolute channel changes are small and below the numeric tolerance; its roughly 8% Oklab RMSE increase in the fixed/RGB case is still a real counterexample to universal dominance. `montage.png` independently composites source/baseline/linear/squared over black and white, with an explicit source-byte alpha equation and nearest enlargement. Visual inspection shows the lost cyan halo clearly; the high-entropy case shows a smaller shift away from some yellow/blue variety. These are deliberately synthetic images and do not establish a failure on tracked real sprites.

## Provisional disposition

Linear weighting is the strongest of the two simple candidates: it repairs negligible-alpha pollution while avoiding the demonstrated squared-weighting halo loss. It does **not** satisfy a strict claim of no output-quality regression. Retain production behavior unless a real-art acceptance set and an explicit product decision justify those tradeoffs. Do not add a faint-alpha threshold or an adaptive guard merely to fit these synthetic examples. Do not characterize unchanged Cut/binary paths as proof that all Keep results improve. Two-round review remains bounded; no implementation is requested by this reviewer.

## Round 2: bounded evidence audit and final disposition

Reran all five owned scripts (`run.mjs`, `invariants.mjs`, `uniform-alpha.mjs`, `crosscheck.mjs`, `montage.mjs`) after checking explicit target identity. The target is stable ID `preset-res64`; no fallback to a potentially reordered first preset remains in the independent scripts. The candidate researcher was informed of the equivalent fallback in their harness. The rerun retained 162 output cases, 81 chunk checks, 27 other invariants and 240 constant-alpha cases with the same numerical conclusions. The result report now records candidate, fixture-generator and quantizer SHA-256 values. Timestamp and timing fields are not correctness or reproducibility gates.

The output pipeline in this reviewer intentionally reuses the app's quantizer and candidate selection/generation copies; only the held-out generators and composite error implementation are independent. This is an independent challenge to candidate selection policy, not a second independent implementation of every production algorithm. It is also not a native download, browser import or device performance test. Those gates belong to the orchestrator/device checks and must be named separately.

At this review, `git diff 310df63 -- src` is empty. No production decoder, matching, alpha, Cleanup, dither or export behavior has been changed. Known Firefox/WebKit low-alpha decoder rounding and native clipboard transport rounding remain separate concerns: weighting cannot reconstruct RGB values already lost during decoding or copying. The synthetic spill success is not proof that a typical real asset currently has a problem, nor that this policy is better than an external service.

**Final recommendation: do not ship either unconditional candidate.** This closes the requested two review rounds without an algorithm change. A future bounded acceptance exercise should contain actual intended Keep artwork: at least a glow, soft shadow, antialiased sprite, translucent effect, all-soft image and duration-varying animation; include the artist's intended background(s), native source pixels, original/current/candidate outputs and regions of important detail. Compare both matching modes, Auto All plus 2/4/8/16 caps, representative fixed targets and explicit Cut controls. Retain negative results. Use region-specific alpha/opaque/soft metrics together with side-by-side 1× inspection, and have the product owner explicitly accept any visible color tradeoff. Do not repeatedly reopen the same synthetic spike or require new service calls merely to postpone that decision.

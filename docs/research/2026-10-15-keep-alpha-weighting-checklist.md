# Keep-mode opacity-aware palette selection: working checklist

October 15, 2026. Baseline: 310df63, including Claude's Firefox PNG and Lospec
fixes. User authorizes the recommended research, sub-agents and useful proven
improvements, with a Claude handoff if independent follow-up is needed. No push.

**Status: complete and closed (October 15).** The owner kept current Keep: no opacity
weighting and no new setting. No further weighting experiments are planned. See the
[real-art decision](2026-10-15-keep-real-art-decision.md) and the coverage limits below.

## Decision to test

When Keep is selected, pixels at alpha 1 currently compete equally with opaque
pixels for Auto colors and a maximum-color subset. Test whether opacity-aware
selection protects visible artwork without discarding meaningful glows, fades
and translucent details. Compare current equal mass with linear and squared
opacity mass. Do not change pixel alpha, RGB matching, dither, Cleanup, imports,
the separate 1-bit family or fixed palettes with All colors. Add no UI setting.

The current specification explicitly has no alpha weighting. Any accepted change
therefore updates the specification and tests deliberately; it is not a secret
interpretation of the old contract. Equal nonempty wall-asset mass and GIF
duration weighting remain. A wholly faint asset still contributes one asset's
mass; weighting within an asset is a different policy from weighting assets.

## Work and acceptance gates

| Work | Owner | Gate / status |
|---|---|---|
| Research candidates and original comparisons | keep_weighting_spike | Complete: 52 configurations; unweighted control equals baseline. Linear improves 18, ties 32, worsens 2. Squared also removes a useful cyan halo. 72 compatibility and 112 additional invariants pass; negatives retained. |
| Independent held-out challenge | keep_weighting_challenge | Complete: 162 output cases and 348 invariance checks. Independently reproduces both linear negatives; region inspection rejects squared despite aggregate improvement. Two review rounds complete. |
| Minimal integration map | keep_weighting_integration | Complete read-only proposal. Keep must be distinguished from Cut1 in generated/limiter worker messages, cache/snapshot/request identity and failure ownership. Effective cutoff alone is insufficient. |
| Shipping decision | Root + independent reviewer | Complete: no ship for either candidate. Spill/core benefit is real, but blanket weighting trades away other soft colors. No synthetic-tuned threshold guard or new control. |
| Production implementation, if accepted | Assigned after gate | Not applicable: rejected by gate. Production source/spec/defaults remain identical to 310df63. Keep/Cut1 integration proposal is retained only as future guidance. |
| Built desktop and physical Android | Root | Complete within scope below. Current build/unit/regression checks pass. Codex Browser and USB Pixel 8 Pro each pass 288 research assertions across 28 rows, with all 112 cross-device rendered hashes/palettes identical. No candidate was integrated, so worker/cache/UI/native-import/export candidate integration is deliberately unperformed, not claimed verified. |
| Final challenge and separate commits | All | Complete: two bounded reviews agree on no ship. Research/evidence and final handoff committed separately from planning; no deployment. |

No paid service request is needed: the retained independent service cohort and
its opaque-core failure already supply adversarial evidence. Neutral research
stays free of competitor source/reference details. The Firefox/browser low-alpha
decode limitation remains separate; weighting does not recover lost RGB bytes.

## Final evidence and scope

- [Research and decision](2026-10-15-keep-alpha-weighting-spike.md) and
  [independent challenge](2026-10-15-keep-alpha-weighting-review.md) retain both
  favorable and negative outputs. Independent native/enlarged black/white montage:
  `bench/keep-alpha-weighting-review/montage.png`.
- Research-module native-browser receipts:
  `bench/keep-alpha-weighting-spike/browser-codex.json`,
  `bench/keep-alpha-weighting-spike/browser-android.json` and
  `bench/keep-alpha-weighting-spike/android-summary.json`. Both use supplied RGBA
  arrays and actual selection/quantization modules; they do not exercise native
  file decoding, clipboard, app UI state or the PNG encoder.
- `npm test`: 59 files, 930 passed / 2 existing gc-gated skips. `npm run build`
  succeeds. Index SHA256:
  `67b5a088de09d901f63badcb14a4f7ba41e4e8c4b78ddc8b9b8767d8128dd82f`.
- `BASE_REF=310df63 node bench/palette-qa.mjs dist` passes 132 legacy, 11 Palette,
  11 RGB exports and 13 integration groups, with no reported page errors. Edge
  needed execution outside the command sandbox after launch failures; Chromium's
  own sandbox remained enabled. These are existing unchanged-app regressions,
  separate from Codex Browser/phone research-module checks.
- Production source, CLAUDE.md, specification and performance contract have an
  empty diff from 310df63. No code fix is needed to close this experiment.
- Research timings are noisy and inconclusive. They establish neither a candidate
  speed win nor a mobile/thermal/whole-memory bound. No Mac/iOS tests were run.

## What remains useful

The missing input is genuinely authored Keep artwork whose intended soft colors
can be judged: glows, shadows, antialiased outlines, fades, translucent accents and
animations. A focused Claude handoff in
`.claude/handoffs/2026-10-15-062048-keep-opacity-real-art-acceptance.md` assigns that
new acceptance study explicitly. It must preserve these counterexamples and make
a product decision, not repeat the same synthetic-only review or force a fix.

**Status (October 15):** that study is complete; see the
[real-art decision](2026-10-15-keep-real-art-decision.md). Blind judges strongly prefer
linear over current Keep on real art, but linear keeps about ten meaningful judged
losses, so it does not meet the no-regression gate. The owner declined the tradeoff:
current Keep stays, with no weighting and no new setting.

| Real-art acceptance item | Status |
|---|---|
| Licensed cohort frozen before comparison (26 assets, 4 animations, 6 synthetic counterexamples) | Complete: `4525906`, `f49000d`; preserved |
| Blind evaluation, two judging rounds, metrics, unblinding | Complete: `756415a`; judgments and keys preserved |
| Built-in browser pane and USB Pixel 8 Pro research-module parity | Complete: 115/115 each |
| Decision | Complete: no ship, owner-accepted |

**Coverage limits, recorded rather than pursued:**
- No hand-placed multi-color pixel art with partial alpha; every pack checked was binary.
- Grayscale particle textures are over-represented, and only one translucent subject has a neutral soft shadow.
- Selections are concentrated at caps 3–8. Cap 2 and fixed palettes at All were not run.
- Device checks covered the research module only, not built-app import, export, Count or Use.
- Cut invariance under a weighting flag was never measured, because no flag was built.
- Real Safari/iOS were not tested.

Other separate concerns remain: low-cap preservation of small important hues,
known fallback/clipboard translucent RGB rounding, and human-only existing-image
Smart evaluation. Prior evidence does not establish a universal winner against
the service. Smart integration remains research only; current controls stay intact.

# Keep-mode opacity-aware palette selection: working checklist

October 15, 2026. Baseline: 310df63, including Claude's Firefox PNG and Lospec
fixes. User authorizes the recommended research, sub-agents and useful proven
improvements, with a Claude handoff if independent follow-up is needed. No push.

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
| Research candidates and original comparisons | keep_weighting_spike | Research copies only initially. Compare none/linear/squared, histograms and >4096-color bins; retain source hashes, exact bytes and negative examples. |
| Independent held-out challenge | keep_weighting_challenge | Predeclare black/white/checker composite and opaque/detail gates. Challenge glows, shadows, fades, antialiasing, rare accents, all-faint assets and frame/wall/chunk order before seeing results. |
| Minimal integration map | keep_weighting_integration | Complete read-only proposal. Keep must be distinguished from Cut1 in generated/limiter worker messages, cache/snapshot/request identity and failure ownership. Effective cutoff alone is insufficient. |
| Shipping decision | Root + independent reviewer | Only integrate a candidate with a demonstrated spill/core improvement and no meaningful held-out visual/detail regression. Otherwise record a no-ship decision. Do not weaken gates to force a fix. |
| Production implementation, if accepted | Assigned after gate | Preserve every Cut output (including Cut1), opaque/binary Keep bytes, source alpha, target membership, exact matches and fixed-target All. No new output-sized buffers or background policy. |
| Built desktop and physical Android | Root + delegated reviewer | Actual app imports, Auto/cap/Keep/Cut1 switching, native PNGs, Count/Use, worker/fallback equality, snapshot/cancellation and preview/export consistency. Compare bounded costs; do not label throughput as FPS or JS heap as whole memory. |
| Final challenge and separate commits | All | At most two research/fix review rounds. Correct reproducible findings, retain no-ship/defer outcomes, update checklist and hand off to Claude only when useful. |

No paid service request is needed: the retained independent service cohort and
its opaque-core failure already supply adversarial evidence. Neutral research
stays free of competitor source/reference details. The Firefox/browser low-alpha
decode limitation remains separate; weighting does not recover lost RGB bytes.

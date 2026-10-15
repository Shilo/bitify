# Guarded Auto refinement — working checklist

User-authorized follow-up, October 15, 2026. Baseline: `c7ad228`.
Research first; ship a production refinement only with demonstrated useful gains
and no identified regressions in the stated acceptance scope. No finite corpus
can prove universal artistic superiority. Keep Colorfetti intuitive and local.

## Plan and ownership

| Work | Owner | Status / gate |
|---|---|---|
| Seed a candidate from the current selected Auto subset | Kernel sub-agent | Complete: 176 observations. Mean fitting changes 175 and violates shared target identity; strict/rare guards accept none. |
| Investigate a target-preserving alternative | Kernel sub-agent | Complete: six permissive swap improvements worsen individual RGB groups; strict/rare swaps accept none. No production adoption. |
| Direct current / candidate / service comparison | Integration sub-agent | Complete: fifteen cases; matched real-art K2/4/8/16. Exactly five gap-fill REST jobs report 0.5 generations. API/website attribution remains distinct. |
| Independent challenge before implementation | Review sub-agent | Complete: pre-result gates, adverse/positive guard controls, source/hash checks, actual downstream outputs and no-ship recommendation. |
| Codex Browser and USB Android | Root | Complete: 24 research checks each, identical strict output RGBA to baseline, alpha/frame metadata/dither/Cleanup, repeat determinism and cancellation; extra cost without observed gain. |
| Other recommendations | Root + review | Complete: native Android New/Edit picker suggestions and Set verified; stale website-output limitation corrected. No additional controls justified. |
| Separate commits | Root | Plan, experiment, service comparison and final device/review evidence separated. Production unchanged; no push/deploy. |

## Acceptance contract

- Auto currently publishes one shared palette of up to 64 RGB entries for the
  captured wall. Max colors selects an exact subset separately per asset; GIFs
  have one duration-weighted subset. A candidate must not silently change these
  semantics, the displayed palette or export snapshot identity.
- A lower mean distance is insufficient. Retain exact-color, rare-eye/material,
  gradient/gamut and animation counterexamples, and inspect native-size outputs.
- Check both matching metrics and downstream Cleanup/dithering. Preserve alpha,
  source coordinates, deterministic order, preview/export consistency and bytes
  on unchanged paths. Establish performance and cancellation costs on both devices.
- Research spikes describe public service behavior and native outputs, with no
  vendor source-code details or extension-file references. Never retain credentials.
- If a candidate fails a gate, retain the current production algorithm and record
  that decision with evidence rather than introducing an ambiguous new setting.

## Progress

The initial shared-target risk was confirmed, and strict variants delivered no
adopted improvement. **Decision: do not ship the tested refinement.** See the
[decision and device evidence](2026-10-15-auto-refinement-decision.md),
[expanded experiment](2026-10-15-auto-refinement-spike.md),
[paired service comparison](2026-10-15-auto-refinement-service-comparison.md) and
[independent review](2026-10-15-auto-refinement-independent-review.md).

Commit record: `48d0b8a` establishes gates, `866df2d` retains the expanded experiment
and `1c1bf14` retains the native service comparison. Final validation is committed
separately with this completed checklist. Production behavior remains at `c7ad228`;
all follow-up changes are research, testing and documentation.

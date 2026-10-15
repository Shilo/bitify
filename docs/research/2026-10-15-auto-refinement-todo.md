# Guarded Auto refinement — working checklist

User-authorized follow-up, October 15, 2026. Baseline: `c7ad228`.
Research first; ship a production refinement only with demonstrated useful gains
and no identified regressions in the stated acceptance scope. No finite corpus
can prove universal artistic superiority. Keep Colorfetti intuitive and local.

## Plan and ownership

| Work | Owner | Status / gate |
|---|---|---|
| Seed a candidate from the current selected Auto subset | Kernel sub-agent | Research only; compare mean-only, per-source-color and rare/exact-detail guards. No production edits. |
| Investigate a target-preserving alternative | Kernel sub-agent | Preserve published shared Auto RGB entries and current per-asset budgets; reject complexity without material benefit. |
| Direct current / candidate / service comparison | Integration sub-agent | Reuse attributable native PixelLab outputs at matching source/count/settings first; separate API, MCP and website evidence. |
| Independent challenge before implementation | Review sub-agent | Gates established before results: shared target identity, tiny features, alpha, GIF timing/palette stability, dither/Cleanup, cancellation and bounded cost. |
| Codex Browser and USB Android | Root | Test research outputs and retained production workflow on both; any accepted production change must repeat app acceptance and independent codecs. |
| Other recommendations | Root + review | Review unresolved needs; do not add palette/menu controls without demonstrated value. |
| Separate commits | Root | Commit plan, reproducible experiment, any accepted production change and final validation separately. No push/deploy. |

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

Initial independent review identifies an important rejection risk: moving each
asset's selected RGB centers creates colors outside the shared Auto palette.
An error guard alone cannot make that a drop-in refinement. Research will measure
this candidate and a target-preserving alternative before any shipping decision.

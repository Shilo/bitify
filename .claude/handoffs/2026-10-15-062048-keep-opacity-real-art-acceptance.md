# Handoff: independent real-art acceptance for Keep opacity selection

**Closed (October 15).** The study is complete, and the owner kept current Keep: no
weighting and no new setting. No further weighting experiments are planned. See
docs/research/2026-10-15-keep-real-art-decision.md.

## Session Metadata

October 15, 2026. Project: C:/Programming_Files/Shilocity/colorfetti. Branch: main.
Baseline: 310df63 (after Claude's Firefox/Lospec fixes and independent audit).
Planning commit: 4a6df8f; research and device evidence: 4f251bc.
This session is research only. No push: pushing main deploys.

## Handoff Chain

Continues finding S1/D1 in docs/research/2026-10-15-claude-audit-ledger.md.
The old broad audit is background, not an assignment to repeat. Unrelated bead
handoffs in this directory are not predecessors to this work.

## Current State Summary

The user authorized opacity-aware Keep palette-selection research with sub-agents,
desktop/USB Android testing, and implementation only if results improve without
regressions. Both simple policies were rejected for shipping. Linear opacity mass
repairs faint-pixel pollution but has independently reproduced all-soft color
regressions. Squared opacity mass also removes a deliberate cyan halo. Production
is unchanged. Your useful next assignment is an independent real-art acceptance
study, not checking whether our checklist says complete. Do not force a code change.

## Codebase Understanding

## Architecture Overview

Read AGENTS.md, CLAUDE.md, the app specification and docs/performance.md first.
Auto shares a palette across nonempty assets with equal asset mass and GIF-duration
weighting. Max colors chooses a per-item subset. Keep currently includes every
alpha-positive RGB at equal pixel weight and retains source alpha. The spec
explicitly describes this policy. Matching, dither and Cleanup remain separate.

## Critical Files

| File | Purpose |
|---|---|
| docs/research/2026-10-15-keep-alpha-weighting-checklist.md | Gates, disposition and latest device evidence |
| docs/research/2026-10-15-keep-alpha-weighting-spike.md | Original experiment, negatives and timing limits |
| docs/research/2026-10-15-keep-alpha-weighting-review.md | Independent held-outs and two review rounds |
| bench/keep-alpha-weighting-spike/build-candidates.mjs | Copies current algorithms and records hashes; verify baseline before regeneration |
| bench/keep-alpha-weighting-spike/experiment.mjs | Original comparisons and independent composite metrics |
| bench/keep-alpha-weighting-review/fixtures.mjs | Independent held-out generator and metrics |
| src/lib/palette-generated.js | Bounded Auto accumulator |
| src/lib/palette-limit.js | Subset fitting and original-pixel verification |
| docs/research/2026-10-15-claude-audit-service.md | Prior service evidence and human Smart procedure |

## Key Patterns Discovered

Weight must consistently reach histograms, bin moments, frequency, fitting error
and limiter verification. Do not silently weight RGB matching, alpha or Cleanup.
Keep and Cut1 must gain distinct source/worker/fallback/cache/failure/export
identities if fitting changes; effective cutoff alone conflates them. Preserve
opaque/binary outputs and Auto All exactness for <=64 visible colors. Fixed
integer mass and canonical remainders must retain chunk/wall/duration invariance.
A wholly faint asset still receives one asset's mass under the existing contract.

## Work Completed

## Tasks Finished

- Original research: 52 configurations, baseline/control/linear/squared.
- Independent held-outs: 162 output cases, 348 exact invariance checks.
- Original invariants cover Cut, opaque/binary Keep, ordering, duration, equal
  asset influence, dither alpha and bounded-bin behavior.
- Both reviewers and root agree to ship neither candidate.
- Current unit suite: 930 pass, 2 existing gc-gated skips. Build succeeds.
- Read the checklist for final Codex Browser/USB Android receipts and exact scope;
  research-module checks must not be presented as actual app exports.

## Files Modified

Only research harnesses, evidence, checklist and this handoff. No production,
specification, default, UI or dependency change. Verify source diff from 310df63.

## Decisions Made

| Decision | Rationale |
|---|---|
| Retain current algorithm | Neither candidate meets improvement without quality tradeoffs |
| Keep linear as research comparator | Fixes spill and retains the halo; still has negative cases |
| No tuned alpha threshold or adaptive guard | Would fit known synthetics without evidence of general benefit |
| No new user knob | No established intuitive meaning or proven workflow benefit |

## Pending Work

## Immediate Next Steps

1. Use sub-agents for independent cohort selection and evaluation challenge. Conduct
   your own bounded study using genuinely authored public/owned Keep
   artwork: glows, shadows, antialiasing, fades, colored effects, all-soft art and
   animation. Record provenance/license. Do not relabel synthetic fixtures as real
   artwork. Request user assets only if useful inputs cannot otherwise be obtained.
2. Freeze the cohort before comparison. Retain spill, cyan-halo and many-soft
   counterexamples. Compare current/linear/squared at relevant caps, Auto/fixed,
   RGB/Oklab and black/white/checker/colored backgrounds. Inspect native 1× and
   enlarged outputs plus important opaque/soft regions. Metrics support visual
   judgment; an aggregate win cannot erase meaningful detail loss. Use retained
   compatible service outputs; new calls only when materially informative.
3. Reach a concrete no-ship or narrowly justified product decision within two
   review rounds. If accepted, implement separately with spec updates and tests
   for Keep/Cut1 identity, worker/fallback equality, cancellation, bounded scheduling,
   and real app native PNG/preview/Count/Use checks on Codex Browser and USB Android.
   Independently challenge fixes; commit separately; do not push.

## Blockers/Open Questions

- No demonstrated real tracked sprite defect yet. Synthetic faint spill is real.
- Linear Auto/cap3/Oklab composite channel RMSE 36.4166 to 36.8524. Fixed
  Resurrect64/cap4/RGB 30.3781 to 30.5197; independent Oklab RMSE 0.098125 to 0.105997.
  Small channel differences do not establish dominance.
- Squared useful-halo soft-region composite channel RMSE 0 to 22.73 while total
  RMSE improves. Reject aggregate-only acceptance.
- Bounded timings are not app FPS, thermal stability or whole-process memory.

## Deferred Items

- Existing-image Smart is research only. No equivalent official REST/MCP route was
  found; new-image Smart generation is a different task. Human Aseprite test remains
  in the prior service report. No integration is authorized by this handoff.
- Rare tabard/eyes lost at low caps remains separate hue-coverage/locks research.
- Real Mac/iOS hardware is unavailable and outside this pass.

## Context for Resuming Agent

## Important Context

The user values intuitive, local, fast workflows and credible service comparisons.
Neutral spikes must not include competitor implementation/source or extension-file
references. User explicitly said credentials must not block work; never print
secrets. Keep Chromium's own sandbox enabled. Preserve existing user browser tabs.
Use exact visible UI names; earlier repeated clipboard instructions confused them.

Your assignment begins with new independent real-art evidence. Prior completion
is not a reason to respond nothing to do; it is also not permission to repeat
endless reviews or force implementation. Preserve negative evidence honestly.

## Assumptions Made

The no-regression requirement includes meaningful translucent-region color quality,
not only default/Cut compatibility or one aggregate error. No external uploads or
paid calls are needed to reproduce the current experiment.

## Potential Gotchas

Low-alpha browser decode and clipboard rounding remain separate limits; weighting
cannot recover RGB already rounded during decode. Research uses copied algorithms
and real quantization, but independent composite metrics. Browser research harness
bypasses native import/export; never call it built-app validation.

## Environment State

## Tools/Services Used

Node 25, Vitest/Vite, bundled Playwright/Sharp. Pixel 8 Pro serial 37211FDJG00267;
Android SDK ADB; CDP normally localhost:9333. Close only owned pages, never the
shared CDP browser. Research paths contain a local bundled Sharp require path.

## Active Processes

Research server: node bench/keep-alpha-weighting-spike/serve.mjs on localhost:5302.
Recheck availability; servers are temporary. Device/browser receipts in checklist.

## Environment Variables

TEMP/TMP may point to .tmp/keep-alpha-test-temp for command sandbox tests.
BASE_REF selects the built regression reference (310df63 here). No secret values.

## Related Resources

- docs/research/2026-10-15-claude-audit-ledger.md
- docs/research/2026-10-15-palette-follow-up-checklist.md
- docs/research/2026-10-14-palette-improvements-todo.md
- docs/superpowers/specs/2026-10-06-colorfetti-app-design.md
- docs/performance.md

# Small important colors at low limits: working checklist

October 15, 2026. Starting revision `4566494`; production source remains the
Claude-audited `310df63` baseline. User authorizes sub-agents, paired PixelLab
comparison, conditional implementation, Codex Browser/USB Android checks and
separate commits. No push or deployment.

## Question and boundaries

Can a bounded, local subset-selection improvement retain small meaningful colors
(eyes, cloth, pickup markers) without meaningful visual regressions elsewhere?
Availability of a palette entry is not proof that source pixels use it. Evaluate
rendered detail identity, hue and local contrast alongside broad shading, skin,
neutrals, noise and temporal consistency. Do not assume frequency measures intent.

Keep opacity weighting and direct small-K generation were independently rejected;
do not reopen those decisions. Current defaults, target palette, RGB matching,
source alpha, dithering, Cleanup and the 1-bit family remain separate. No new UI
control or semantic/AI integration is authorized by this experiment alone.

## Work and gates

| Work | Owner | Status / gate |
|---|---|---|
| Freeze cohort and meaningful-detail gates | accent_challenge | Complete: 12 real licensed source views, one montage, five owned synthetic files and two two-frame sequences; original region definitions and byte hashes retained. |
| At most two distinct candidate hypotheses | accent_candidates | Complete: concave frequency and balanced hue, 640 rows. Unweighted control equals current throughout; 101 rows change under at least one rule. Nine chunk/duration and 39 additional technical checks pass. |
| Paired service evidence | accent_service | Complete: public REST/MCP contracts refreshed, five compatible retained configurations plus eight fresh REST reductions (0.8 generations). Native PNGs, source hashes, target/alpha/count verification and actual region colors retained. |
| Independent quality decision | Root + challenge | Complete in two rounds: reject both. Six native-image/region confirmations show material, skin or important-detail losses. All reviewers agree. Discarded random-label judgments are not acceptance evidence; a checker-phase misreading was corrected. |
| Conditional production change | Unassigned until accepted | Not applicable: gate failed. No candidate reaches production, so candidate worker/cache/UI/export integration is deliberately unperformed. Source/spec/defaults remain unchanged. No new UI setting. |
| Native-browser and physical phone | Root | Complete within recorded scope: each passes 189 research checks with identical Node/device hashes. Actual app native 8-color PNGs are byte-identical; Count and Use match independently decoded colors. Chromium sandbox retained. Bounded timing includes a 4096-color stress input, without app-FPS/whole-memory claims. |
| Separate commits and final ledger | Root | Complete: separate planning, licensed cohort, candidate/challenge evidence, service evidence and final validation/decision commits. No source fix, push or deployment. |

## Acceptance interpretation

The low-color budget necessarily trades colors. A single red eye is not always
more important than broad form; rare accidental noise must not be promoted just
because it is saturated. Freeze candidate rules and the acceptance cohort before
seeing outputs. Examine native size plus nearest enlargement. Include 2/4/8/16,
Auto and fixed targets, Oklab/RGB, animations and unchanged-coordinate stability.
Any claim applies to the tested cohort, not universal superiority over a service.

## Final decision and remaining gaps

[Decision and validation](2026-10-15-important-colors-decision.md),
[independent challenge](2026-10-15-important-colors-review.md) and
[paired service results](2026-10-15-important-colors-service.md) record the useful
gains and failures. The service retains bucket blue/cyan and a purple hood in
some cases where local output loses them; local output retains exact colors and
details in other cases. Neither candidate closes those gaps without new losses.

Current units: 930 pass / two existing gc-gated skips. Build succeeds.
`BASE_REF=1e4e8fd node bench/palette-qa.mjs dist` passes 132 legacy, 11 Palette,
11 RGB export cases and 13 integration groups, with no page errors. Edge ran
outside the command sandbox for launch compatibility; Chromium's own sandbox
remained enabled. App source, CLAUDE.md, spec and performance docs have an empty
diff from 310df63. Known translucent decode/clipboard limits remain separate.

Device evidence is in `bench/important-colors-validation/`; the source-module
receipts are in `bench/important-colors-spike/`. No new website outputs, stock
Firefox, Mac/iOS, sustained thermal or whole-memory coverage is claimed.
The real cohort is limited to one author and the animation coverage to two short
sequences. The attempted random-label preference study is explicitly invalidated;
the decision uses independent decoded region RGBs and verified uniform figures.

Next useful design: artist-controlled protection with clear source-versus-target
meaning, budget-conflict handling and animation/mobile behavior. Do not add that
control without designing it, and do not restart another automatic weighting loop
from these same examples. The Keep weighting study remains closed.

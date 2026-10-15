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
| Freeze cohort and meaningful-detail gates | accent_challenge | Pending: licensed real pixel sprites/animation plus retained tabard/eye failure, neutral/shading and accidental-noise controls, before candidate outputs. |
| At most two distinct candidate hypotheses | accent_candidates | Research only: bounded subset fitting, consistent histogram/bin/verification objective. Retain baseline controls and all negative outputs. |
| Paired service evidence | accent_service | Public schema refresh, reuse compatible retained outputs, up to eight materially useful fresh reductions. Same source bytes/settings; record surface, cost, alpha, palette and actual important-region outputs. No vendor source/extension references in spikes. |
| Independent quality decision | Root + challenge | Require demonstrated detail benefit with no meaningful held-out visual regression. Aggregate point-error wins cannot conceal lost details, and small numerical error increases alone do not prove visible loss. Two review rounds maximum. |
| Conditional production change | Unassigned until accepted | Only after gate. Update spec/tests; verify All/exact membership/alpha/cap/duration/bin/order/cancellation and worker/fallback/cache/preview/export paths; no new unbounded buffers. Otherwise close with no ship. |
| Native-browser and physical phone | Root | Codex Browser and USB Android research output parity and bounded timing; built-app/native PNG checks if integrating. Separate module evidence from app delivery evidence. Keep Chromium sandbox enabled. |
| Separate commits and final ledger | Root | Planning, frozen evidence, any accepted source fix, and final validation separately. No push. Record known limits and the next useful action without another unbounded review loop. |

## Acceptance interpretation

The low-color budget necessarily trades colors. A single red eye is not always
more important than broad form; rare accidental noise must not be promoted just
because it is saturated. Freeze candidate rules and the acceptance cohort before
seeing outputs. Examine native size plus nearest enlargement. Include 2/4/8/16,
Auto and fixed targets, Oklab/RGB, animations and unchanged-coordinate stability.
Any claim applies to the tested cohort, not universal superiority over a service.

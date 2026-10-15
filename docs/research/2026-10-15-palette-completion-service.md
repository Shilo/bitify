# Palette service coverage completion

October 15, 2026. Service behavior evidence, separate from neutral algorithm
spikes. No production change, private implementation inspection, integration,
push or deployment. Current product behavior remains the reviewed `310df63`.

## Decision

The three targeted website gaps now have **attributable native downloads**:
partial-alpha PNG reduction, an imported image target, and a shared two-image
reduction. Their results strengthen the earlier conclusions; they do not justify
another automatic fitting change or a larger default palette catalog.

**Neither product is an output-quality oracle.** Colorfetti retains a bright glow
core the website removes. The website preserves coherent skin tones in a compact
target and blue eyes/red clothing at a small shared budget that current default
matching loses. These are visible tradeoffs, not hidden fixes in this research.

## Fresh public contracts and Smart feasibility

The six official resources were fetched successfully, with timestamps and hashes
in [contract-refresh.json](../../bench/palette-completion-service/contract-refresh.json):
[REST schema](https://api.pixellab.ai/v2/openapi.json),
[API index](https://api.pixellab.ai/v2/llms.txt),
[MCP documentation](https://api.pixellab.ai/mcp/docs),
[Reduce Colors](https://www.pixellab.ai/docs/tools/reduce-colors),
[Colors](https://www.pixellab.ai/docs/options/color) and
[Dithering](https://www.pixellab.ai/docs/options/dithering).

The 101-path REST contract is unchanged: reduction accepts `images`,
`num_colors`, `palette_image`, `dithering` and `dithering_strength`.
Authenticated MCP `tools/list` returned 117 tools, with no Smart field or mention.
The Smart target model is reachable through new-image generation and an animation
route that explicitly refuses Smart; it is absent from the reduction request.
No new-image Smart operation was run as a substitute for recoloring existing art.
No Smart toggle appeared in the inspected single-image website reducer controls,
including imported-target controls. This establishes no public supported route
we can exercise for existing-image Smart, rather than proving a feature cannot
exist elsewhere. The previously specified human Aseprite trial remains deferred;
no integration or UI control is approved. Nothing requires a credential change
or another login request to reach this decision.

## Website method and attribution

Codex Browser settled on sign-in. The separately authorized Playwright fallback
reused the previously signed-in, isolated Edge test profile with
`chromiumSandbox: true`, headless. No authentication storage, cookies, token
values, frontend source or unrelated gallery contents were read or saved.
Public documentation does not establish authentication for either browser.

The first upload displayed an **Upscaled pixel art detected** dialog. Choosing
**Use anyway** retained the exact intended input dimensions, without turning off
checks. The modal hides the reducer from accessibility queries; initial sidebar
timeouts were therefore a harness/modal issue, not evidence of logout.

Each submitted job recorded reducer settings, `POST /quantize-image/background`
success, job polling and the current working view's native **Download image**.
The sidebar preview remained the source. No gallery thumbnail or screenshot
substitutes for output. The first W1 job completed, but our ambiguous Download
selector matched multiple buttons; a fixed selector and handled download wait
enabled one bounded W1 repeat. This test-harness issue is retained in evidence.

**Four website jobs charged 0.4 subscription generations**, matching the free
before/after balance delta; USD credits were unchanged. There were no new paid
REST/MCP image operations. Three native downloads represent those four jobs.
The earlier attempt's output was not retained, so it is not a determinism test.
Network latency was not compared with local algorithm timings.

## Inputs, exact settings and native outputs

All inputs are previously retained, owned synthetic images, reused without edits.
Input hashes, exact target HEX order and output hashes are in
[comparison.json](../../bench/palette-completion-service/comparison.json).
Paths and receipts are relative to `bench/palette-completion-service/`.

| Case | Website inputs/settings | Verified native result |
|---|---|---|
| W1 | `glow-alpha.png`, 32×32; Number of colors 4; None | `website/web-w1.png`: 32×32, three visible RGB colors, every source alpha byte preserved, including 1/64/127/128/192/254. |
| W2 | `knight-a.png`, 24×24; From a palette image, exact eight-color `target-edg8.png`; no maximum; None | `website/web-w2.png`: 24×24, six used colors, all exact imported-target members; source alpha preserved. Native PNG bytes match the retained REST result. |
| W3 | `knight-a.png` + `knight-b.png`, both 24×24; Number of colors 8; None | `website/web-w3-sheet.png`: one native 48×24 horizontal PNG sheet. Two documented 24×24 crops share seven colors total and preserve alpha. Each crop's RGBA matches its corresponding retained REST frame. |

W3 is one website-generated sheet, **not two native downloads or a verified
animated GIF**. `derived-w3-frame0.png` and `derived-w3-frame1.png` are Sharp crops
of that native sheet in upload order. Their exact retained-frame matches verify
the orientation/order. Among 531 unchanged source coordinates, zero output
coordinates change between frames. This is one equal-sized pair, not a claim of
arbitrary animation consistency or variable-duration weighting.

The local paired pipeline regenerates unchanged production Auto, subset matching,
quantization and native PNG encoding in Node. Keep preserves partial opacity;
Oklab, Cleanup Off and Dithering Off are used throughout. W3 treats the two frames
as **one equal-duration animation**, which uses one shared subset. Separate still
tiles share Auto's available palette but select their capped subsets separately;
the study does not claim a global eight-color cap across an ordinary still wall.
`localMatchesRetained` means current local output equals earlier **local** output,
not that local equals the service. All four local renders match that control.

## Direct output comparison

The contact sheets have explicit Source / Website / Retained REST / Colorfetti
labels, native size followed by nearest-neighbor enlargement on uniform gray:
[glow](../../bench/palette-completion-service/sheets/w1.png),
[imported target](../../bench/palette-completion-service/sheets/w2.png),
[first shared frame](../../bench/palette-completion-service/sheets/w3-0.png),
[second shared frame](../../bench/palette-completion-service/sheets/w3-1.png).
These are unblinded observations, not judge preference scores.

- **Glow:** Colorfetti keeps the pale center; website and REST flatten it orange.
  Every alpha byte is exact in all three. Website and retained REST RGB differ;
  the cause is unresolved and no cross-surface algorithm identity is asserted.
- **Imported ENDESGA 8:** website and REST use orange consistently on the face;
  current local Oklab splits the ramp into yellow/orange/red. All outputs remain
  exact target members. The website also changes the source wood/metal hues.
- **Shared K8 knight:** website and REST keep blue eyes and red clothing. Local
  favors wood/metal shading and loses those accent families. The service loses
  other details, including the green gem, and uses seven rather than eight colors.

Descriptive composited encoded-RGB per-channel RMSE (local / website) is 9.12 /
18.03 for W1, 34.48 / 34.36 for W2 and 15.37 / 18.57 for either W3 frame.
It uses source alpha only when output alpha is identical, and is null otherwise.
These errors do not measure material identity or establish artistic superiority.
In particular, W3's lower local error accompanies lost meaningful accents.

## Verification and remaining limits

[verification.json](../../bench/palette-completion-service/verification.json)
independently decodes PNGs with Sharp, checks dimensions, caps/target membership,
8,256 per-pixel alpha comparisons, W3 shared union/churn, reconciled billing and a
zero-match credential scan of owned artifacts. Large pixel counts are assertions,
not independent user scenarios. The root and kernel reviewer independently viewed
all four labeled figures and agreed with the bounded observations above. W1's
local center remains paler than the service center but is not identical to the
source cream. W2 is an owned synthetic knight, not a representative real-skin
cohort. No physical mobile test was attempted in this pass, as requested.

The website check is now complete for these three focused cases. It does not
cover all presets/import modes, 2×2/8×8 website dithering, strength calibration,
partial-alpha plus imported target together, variable-duration animation, upscale
downloads or every browser. Retained API/MCP tests and historical website tests
remain separately scoped. Smart integration is research-only and still lacks
existing-image output evidence. The small-color semantic tradeoff is a legitimate
reason for the separately deferred artist-controlled design mock-up, not permission
to implement it or reopen the closed weighting experiments.

## Independent cross-review since the requested baseline

Review base is `f08d4d3f6e3df771d17524f00f1bba2e492c4ec0`. This service
reviewer reread the retained website verification, REST/MCP evidence, Claude
service audit, important-color service report and decision, Keep real-art
decision, and current consolidated checklist. Previously completed reviews were
treated as claims, not permission to stop. The live schema refresh and three
native website configurations above provide new direct challenge evidence.

The old records distinguish Smart **generation** from existing-image recoloring,
retain mixed counterexamples and explicitly qualify historical website limits.
The new evidence supersedes those specific partial-alpha/import/shared website
gaps; it does not rewrite historical claims into broader successes. Neutral
`*spike*.md` documents were checked for vendor private-code/extension references;
none were found. A vendor-cohort name in a performance spike is a dataset label,
not an implementation reference. The vendor-specific evidence report remains a
separate source; no private implementation detail was copied into a neutral spike.

Two bounded cross-review rounds challenged the kernel and design reviewers:

- The [kernel review](2026-10-15-palette-completion-kernel-review.md) separates
  oracle agreement from global quality, confirms exact historical defaults and
  states memory/performance bounds honestly. Its sampled desktop timings do not
  establish real-phone, whole-app or sustained-session performance. No runtime
  correction follows from one service output looking more coherent.
- The [protection mockup](2026-10-15-color-protection-design.md) must say an exact
  source RGB mapping does not preserve every shade or an entire semantic object.
  Its fixed-only proposal does not resolve motivating Auto cases. Eligibility
  and budget conflicts remain explicit approval blockers. The design reviewer
  accepted these limitations; this is not authority to implement mappings.
- The kernel reviewer challenged alpha-aware metric validity and multi-image
  attribution. The report and harness now null composite RMSE if alpha changes,
  name W3 crops as derived, distinguish current-vs-retained local equality, and
  retain upload order/native dimensions. The root separately inspected outputs.

**Final service-review disposition:** no actionable production fix is supported
by this evidence. Preserve current behavior and the mixed-output counterexamples.
Existing-image Smart stays a research limitation, protection stays an unapproved
mockup, and new website evidence closes only the three measured coverage gaps.

# Palette completion and final independent review

October 15, 2026. Baseline: `f08d4d3f6e3df771d17524f00f1bba2e492c4ec0`.
Starting revision for this pass: `cf72fe5`. The production source tree remains
`2d5311edd204c7a3be651e7aa4c185e73add8c53`, unchanged since `310df63`.
No production fix was justified by this pass. No push or deployment occurred.

Separate delivery commits: `bbff77f` (plan), `75a213a` (independent kernel
invariants), `9e45da2` (design and responsive UI review), `e75b078` (native website
comparisons), and `303c093` (browser/performance verification and final kernel
challenge). This ledger/checklist closure is a separate documentation commit.

## Outcome

The accepted palette/reduction functionality remains intact. Three targeted
website cases now have native output evidence, complementing the separately
retained API/MCP tests. An artist-controlled color-protection interaction has
reviewable mockups, **not an implemented feature**. Reviewers independently
challenged algorithms, UI integration, exports, research and service claims in
two bounded rounds. No newly reproducible production defect remains from those
reviews; the limits below must not be relabeled as successful exactness checks.

The user explicitly prohibited physical mobile testing and Claude for this pass.
No phone/ADB or Claude was used. Narrow portrait/landscape tests are desktop
browser simulations. Earlier physical-device evidence remains historical.

## What the service comparison actually establishes

See the [service report](2026-10-15-palette-completion-service.md) and native
outputs under `bench/palette-completion-service/`.

- A 32×32 partially transparent glow retains every source alpha byte after
  website reduction to at most four colors. It uses three RGB colors. Local
  Keep preserves alpha too, and retains more brightness variation in its center.
- An uploaded eight-color palette produces a 24×24 native knight PNG with six
  exact target colors. This result is byte-identical to the retained REST PNG.
  The service face is more consistently orange; local Oklab splits its shades
  among yellow/orange/red. Target membership alone does not resolve that preference.
- Two uploaded 24×24 knights produce a 48×24 native website sheet with seven
  shared colors. Documented crops match the retained REST frames. At 531 unchanged
  source coordinates, output does not change between frames. This is not a
  verified website GIF or variable-duration animation test.
- The service retains blue eyes/red cloth at eight colors, while local output
  retains more wood/armor shading. The service loses other useful details too.
  Neither aggregate RGB/Oklab error nor a single attractive result establishes
  universal superiority. The frozen adverse examples still reject the prior
  automatic accent, Auto-refinement and Keep-weighting candidates.
- The glow's website RGB differs from its retained REST output. The cause is
  unresolved; website/API identity must not be assumed.

Four website jobs used 0.4 subscription generations, including one repeat after
our download selector failed. No new paid REST/MCP image calls were made.
The existing signed-in isolated Edge profile worked with Chromium's sandbox
enabled; authentication storage was not inspected or copied. Codex Browser
itself was signed out, so this website evidence uses the authorized fallback.

Fresh official REST/MCP contracts and inspected reducer controls expose no
supported existing-image Smart operation we can exercise. New-image generation
is not an equivalent test. **Smart integration remains research-only and deferred
pending the human Aseprite comparison**, with no integration approved.

## Design outcome and challenges resolved

Open the [interactive mockups](http://127.0.0.1:5310), or run
`node bench/color-protection-design/server.mjs` if that temporary server has stopped.
The [proposal](2026-10-15-color-protection-design.md) explains the behavior and
remaining decisions. The mockup works as a self-contained HTML file with its two
adjacent PNG assets; it neither recolors nor exports nor changes app preferences.

The concept preferred for user review maps an exact original RGB to an existing
target color for one image/all its frames. It explains that every occurrence of
that RGB changes, other shades do not, and the target consumes budget slots.
The alternative merely keeps target colors available and cannot promise a muted
eye becomes red. We recommend against offering both as ambiguous lock controls.

Independent challenges changed or qualified the proposal:

1. Already-mapped pixels must not compete for additional residual palette slots.
2. A maximum-color budget must not imply all available slots are actually used.
3. A mapping made wholly invisible by Cut needs an explicit inactive-slot policy;
   this is unresolved, rather than silently reserving or releasing capacity.
4. Initial fixed-palette-only scope excludes Auto, the fresh default. That is a
   substantial usability limitation and blocks treating this as ready to ship.
5. Choosing exact source colors on a phone needs a magnified/tap-confirm picker;
   an agent completing a mockup is not evidence that artists will discover it.

Production implementation is deferred until the user reviews the designs. No
new setting, color lock, mapping engine or storage/worker protocol was added.

## Final validation

| Evidence | Result and boundary |
|---|---|
| Complete unit suite | 930 passed, 2 existing GC-dependent skips; 59 files. |
| Production build | Passed; index SHA256 `67b5a088de09d901f63badcb14a4f7ba41e4e8c4b78ddc8b9b8767d8128dd82f`. |
| Built regression against actual baseline | 132 legacy exports, 11 full-palette, 11 RGB and 13 integration groups passed; no page errors. Includes native PNG/GIF/ZIP, captured saves, storage events and animation readiness. |
| Independent kernel oracle | 80 cases / 68,080 pixels, 9,120 independently calculated labels across nearest/dither cases, 80 PNG roundtrips and 120 historical default/zero-strength invariants passed. 196 focused tests complement it. |
| Research provenance | All 18 important-color fixtures and 59 Keep files rehash to their manifests. This verifies retained bytes, not every upstream license claim. |
| Codex Browser native app | Real picker import, Auto/Max8, 4×4/49%, native Save, Count8 and Use8 draft agree. Sharp-decoded 96×48 output equals the captured Node reference and its eight RGBs equal the visible draft. |
| Actual app, simulated touch | 320×568 and 568×320: Add → PICO-8 → Max8 → dithering/strength → Count/Use → all three import methods → local HEX draft → Preview/Save. Native PNGs match across orientations and save surfaces, exact alpha/target membership. No horizontal overflow/page errors. |
| Design layout | 51 isolated desktop/portrait/landscape checks, plus root-rendered Codex screenshots. Navigation/layout only, not protected output or human acceptance. |
| Fresh Firefox 153 app run | **12/18 source-file correctness phases pass; six still fail due to known translucent RGB rounding.** All 139 compared observations, mismatch counts and native output hashes match the retained post-fix run. Alpha, preview/export agreement, counts and layout remain consistent. No new regression was found; exact source-file RGB is not claimed. |
| Desktop timing diagnostic | At cap8 on 512² high entropy, conversion medians Off→4×4: Cut 9.7→74.1ms, Keep 17.0→139.7ms. Cooperative progress interval ≤8.3ms; no measured >50ms main task. Three runs per configuration; source modules only, not import/export/FPS/physical-phone guarantees. |

Root receipts: `bench/palette-completion-validation/`. The fresh Firefox native
run is `bench/claude-audit-2026-10-15/device/firefox-completion/results.json`;
`compare-firefox.mjs` records its unchanged failures explicitly. Other reviewers'
evidence is in the [kernel review](2026-10-15-palette-completion-kernel-review.md)
and [UI review](../../bench/color-protection-design/UI-REVIEW.md).

An initial Codex screenshot immediately after viewport changes was malformed;
subsequent settled DOM measurements and screenshots verified the intended layout.
The malformed capture was replaced, not used as passing evidence. Unrelated
browser-tool telemetry errors did not originate in the application.

## Cross-review and remaining actions

The root read the production changes for snapshots/Count/Use/import routing,
verified native Codex output with Sharp, inspected all four labeled website
comparison sheets and challenged the design's budget wording. The kernel agent
reviewed all changed conversion/decode/cache/export paths; the UI agent reviewed
all changed components/CSS and exercised the built app; the service agent refreshed
contracts, generated website files and challenged retained research claims.
Agents exchanged and resolved concrete qualifications rather than accepting an
earlier audit's conclusion as proof. No production before/after fix cycle was
needed because no new production defect was reproduced. Design/harness corrections
were tested without changing app behavior.

What remains is deliberately bounded:

- User review of the design, then a separate implementation decision. Do not
  silently freeze Auto or ship an availability lock as semantic protection.
- Human Aseprite Smart output comparison if integration is still of interest.
- Real-user task observation; simulated touch cannot establish intuitiveness.
- Known Firefox/WebKit canvas and OS clipboard translucent-RGB rounding; native
  PNG Save remains the exact encoded-output route from decoded source values.
- Sustained phone thermal behavior, whole-process memory and unavailable Mac/iOS
  coverage. Large imports/frames and final encoding copies retain synchronous work.
- Optional batch-wide shared subsets and additional exchange formats remain
  opportunities, not incomplete accepted features. No extra presets or permanent
  quick-budget row is justified by the current evidence.
- Release/deployment remains separate; all commits in this session stay local.

Recommended next action: review the protection interaction and observe an artist
perform the existing core tasks. Keep current algorithms/defaults in the meantime;
there is no evidence-backed automatic change ready to add safely.

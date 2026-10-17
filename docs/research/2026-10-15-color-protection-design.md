# Artist-controlled color protection — design review only

October 16, 2026 status: **The user explicitly deferred this feature and its
mockups. Do not implement it in the palette usability batch.** Research and
mockups remain versioned for possible future discussion; their existence is not
implementation approval.

Original design: October 15, 2026. **Implementation deferred.**
No production algorithm, component, setting, specification or export behavior is
changed. This is a proposed interaction, not an accepted feature contract.

## What problem this could solve

Automatic reduction cannot distinguish a deliberately painted one-pixel eye from
an accidental colored pixel with the same bytes. Earlier trials restored some
important hues but also removed headbands, changed potions and damaged skin.
An artist may know which detail matters. A useful control must let the artist
express that choice without pretending every small color should survive.

The [existing lock counterexample](2026-10-14-auto-fitting-and-color-locks.md)
also rules out a misleading promise: leaving red available in the target does
not force a muted red eye to use red. The [small-colors decision](2026-10-15-important-colors-decision.md)
retains the failures motivating this proposal. Neither authorizes implementation.

## Two workflows, different guarantees

| | A: map an original color to a target | B: reserve target colors |
|---|---|---|
| Artist action | Choose an exact original RGB, then one color from the active fixed palette | Choose active-palette colors which must survive subset selection |
| Actual proposed guarantee | Every eligible pixel with that exact original RGB in this image uses that target RGB | Selected target RGBs remain in the smaller available palette |
| Guarantee it does not make | It does not understand eyes, cloth, regions or nearby shades; other pixels with the same RGB also change | It does not promise any pixel uses the reserved color or any detail survives |
| Budget | Distinct protected targets consume slots | Distinct reserved targets consume slots, even if unused |
| Benefit | Directly addresses the muted-eye counterexample | Easier algorithm but weaker connection to the observed user need |
| Primary risk | Unexpected same-color occurrences; extra source-picking interaction | User expects a lock to preserve the eye and sees no visible effect |

**Design recommendation: favor A for further user review; defer B.** Do not add
both concepts to the product. The meaningful difference cannot be hidden behind
a generic lock icon. Naming and discoverability still need user acceptance.
The mockup uses **Protect colors…** under the existing per-image Image actions
entry; the dialog explains the exact-source behavior. The global Recolor panel
receives no permanent row, toolbar or second color-budget control.

Discoverability is not proven. The mockup uses a readable **Image actions** button
to make the entry reviewable; the existing app uses an ellipsis on touch and
Preview/hover actions on desktop. This design does not authorize replacing those
controls. An artist must be able to find the action without knowing what an image
caption means. If the proposed entry is still hard to discover, that is a reason
to revise or reject the design before adding the feature.

This is only a provisional design recommendation. An exact-RGB workflow may be
too restrictive for textured or soft-edged artwork, and advanced users can already
edit a palette. If the user finds this interaction confusing or not worth the
extra complexity, keep the feature deferred rather than implement availability
locks as a substitute.

## Reviewable mockups

Run `node bench/color-protection-design/server.mjs`, then open
<http://127.0.0.1:5310>. The page compares both concepts and exposes current
controls, proposed entry, source selection, target selection, review, applied,
color-limit conflict and palette-change conflict screens. It adapts to desktop,
320×568 portrait and short landscape with a scrolling body and fixed dialog
header/actions. Every actionable target is at least 44 CSS pixels high. The source
and target swatches retain explicit text alternatives; color alone is insufficient.

**No proposed result is fabricated.** The large knight is the original owned
24×24 CC0 research fixture, not a processed prediction. `current-auto8.png` is the
actual retained Auto/8/Oklab first-frame output, labeled separately. The mockup
never recolors, exports, writes storage or changes application state. Its source
names (eyes, cloth, gem) are authored annotations, not a proposed semantic detector.
Only the red-cloth selection is demonstrated; other source swatches are context.

Assets are exact copies from:

- `bench/important-colors-review/fixtures/owned-knight-a.png` (owned CC0 fixture;
  original hash `fbe0f27539ac667c61977282e5b481027dbe54cabbd2e3a4eac80d7818c725ea`).
- `bench/important-colors-service/ours/retained-knight-2frame-k8-oklab-0.png`
  (actual unchanged output; complete settings/evidence in the prior study).

The target chooser uses the existing PICO-8 RGB values. Selected original cloth
RGB is actually present in the owned fixture: **#D4364A**, five pixels in this
frame. The original contains two other red shades, which this one mapping would
not protect. That limitation is intentional and must be visible in review.

## Proposed behavior requiring agreement before implementation

| Situation | Provisional design behavior |
|---|---|
| Scope | Per source item, all original GIF frames; other wall items are unaffected. No global hidden mappings. |
| Exact source matching | Uncomposited original RGB equality, for every eligible pixel with that RGB. No coordinate tracking, fuzzy hue range, object recognition or automatic regional mask. |
| Multiple mappings | Multiple source RGBs may share a target; only distinct target RGBs consume slots. Reassigning one source replaces its prior mapping. |
| Color limit | Protected targets are mandatory starting entries; residual fitting chooses the remaining slots for the unforced source pixels. Already mapped pixels must not spend more slots approximating a color whose result is forced. Unmapped pixels may still match protected targets normally. Protecting red may displace body shading. Review warns that other output colors can change. The limit is a maximum: “1 reserved slot · up to 3 others · max 4” does not promise exactly four used output colors. |
| Too many targets | Reject the pending edit, retain the last valid committed rendering and limit. Explicit Keep current limit or Review protected colors actions; never silently raise a limit or discard protection. |
| All / one-color palette | All still permits mappings. A one-color palette has one target; several sources mapping there consume one slot. No extra color is invented. |
| Palette switch | Preserve mappings only when every target RGB exists in the new palette. Otherwise hold the old committed palette and require remap/remove/cancel. No nearest-target substitution. |
| Auto | Initial concept is restricted to fixed/saved palettes. Auto requires removing protection or explicitly using a fixed palette first. Do not silently freeze Auto, alter shared generated colors, or add a compound workflow in v1. |
| Alpha | Existing Cut/Keep eligibility and alpha output remain authoritative. Cut-ineligible pixels stay empty. Keep preserves their exact source alpha. No alpha weighting, opacity inflation or hidden pixels reintroduced. |
| Dither | Mapped source pixels use one exact target; they bypass ordered dithering. Other pixels keep the selected method and strength. This needs explicit visual and export tests. |
| Cleanup | Mapped source pixels cannot be removed/reassigned by Cleanup. Other pixels follow the existing cleanup rule. Protecting intentional isolated pixels must not be undone by a later stage. |
| Animation | Exact source RGB mapping applies across every frame and uses one shared target subset. Different RGB shades in a fade or changing-color eye require additional explicit mappings; no false frame tracking claim. |
| Batch | Per-image mappings only; cloning rules to other assets or shared batch budgets is a separate feature and remains out of scope. |
| Remove/reset | Remove one mapping and Clear this image are explicit. Global Reset clears all mappings with settings. Removing an item destroys its mappings. No stale mapping should reactivate after an item/palette is re-added. |
| Save / Copy / Count / Use | All consume the same captured mapping/version and actual full-source conversion. Count reports actual used output colors, not reserved slots. Use includes only actually used colors. Existing partial-alpha GIF failure remains explicit. |
| Cancel / failure | Draft selection has no effect until Apply. Cancel/Close keeps the committed result. A failed or canceled job cannot replace it or export an uncapped result. |

The lack of Auto support is a substantial limitation: Auto is the fresh default
and several motivating cases use it. This is a reason to **defer implementation**
until the user judges whether fixed-palette control is useful on its own, not a
reason to quietly invent Auto behavior. Converting Auto to a fixed editable draft
is possible with today's palette-reuse workflow, but must stay an explicit action.

Independent algorithm review raised a second unresolved policy: if changing Cut
makes every occurrence of a mapped source RGB invisible, should that mapping still
reserve its target slot? Always reserving is predictable but creates invisible
budget pressure; reserving only currently eligible mappings requires an explicit
inactive indicator and a full-source/all-frame eligibility identity. A mapping
absent in the current GIF frame but present in another eligible frame must not
flicker between active and inactive. **The mockup does not silently settle this.**
Before implementation, choose and visually review the inactive state and its
budget wording. Do not treat this table as an approved algorithm specification.

## Mobile interaction and acceptance protocol

Physical Android is disconnected and **is not used in this pass**, per the user's
latest instruction. Browser viewport checks are layout simulations only.

For a real implementation after approval, use a magnified original-pixel picker
with tap-to-confirm and a clearly marked source swatch; a raw 24×24 thumbnail is
not a usable touch picker. The current mockup demonstrates the swatch alternative.
No long press, hover tooltip, keyboard shortcut or tiny lock glyph is the only
way to discover or operate protection. A keyboard user needs source swatches,
target names/HEX labels, focus restoration and cancelable dialog navigation.

Practical study tasks, without coaching beyond the stated goal:

1. Find how to preserve the red cloth on only this knight at four colors.
2. Explain whether all red shades or all red-looking objects will be affected.
3. Choose a target, review its budget cost, apply and locate the active indicator.
4. Try a two-color limit with four protected targets. Recover without losing work.
5. Switch to a palette lacking the target. Explain why a decision is needed.
6. Remove protection, then find normal Count/Use and Save again.

Failures to discover the action, understand exact RGB scope or recover from a
conflict block implementation. The design is not validated merely by fitting
inside a phone screenshot. Actual usability requires the user's review and,
later, user observation; agent walkthroughs are only a preliminary challenge.

## Review status

**Agent design review complete; awaiting the user's mockup review.** No feature
implementation is authorized by completion of these checks.

The independent kernel reviewer challenged mandatory-target fitting and inactive
alpha mappings; the root reviewer challenged an initial exact-count budget label,
the Auto-default gap and action discoverability. The mockup budget now says slots,
“up to” and maximum rather than promising a used-color total. Residual fitting is
explicit; inactive protection remains an approval-blocking design question.

Sandbox-enabled isolated Chromium passed 51 standalone mockup layout cases across
1440×1000, 320×568 and 844×390; source/target, review, conflict and alternative
screens had reachable fixed actions and no horizontal document overflow. A first
phone draft left too little body space; the design-only phone/short-landscape
dialog now uses the workspace instead of preserving the dock underneath it.
The root's initial Codex mobile screenshot was malformed during resizing and is
not evidence; a subsequent settled DOM snapshot and screenshot rendered correctly.
These are agent walkthrough/layout checks, not observed human usability.

Implementation remains deferred. No claims of physical Android, iOS, Safari,
algorithm quality, native exports or performance validation are made for a feature
that does not exist. Separate checks of the actual unchanged application are in
`responsive-app-results.json`; they do not validate a proposed protection feature.

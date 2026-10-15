# Spike 04: Reduction workflow and collection color budgets

Date: October 14, 2026. Status: research proposal supported by one original executable experiment; no app changes.

Status/supersession (Oct 15): historical proposal. Current behavior is documented in [palettes](../../palettes.md) and the [design specification](../../superpowers/specs/2026-10-06-colorfetti-app-design.md); its next-step language is not an open task list. Explicit used-color Count and Use N output colors shipped; quick-budget rows and a whole-wall cap were not adopted.

## Decision to make

Evaluate whether optional quick color budgets, used-color inspection and a whole-wall cap help users finish sprite collections with predictable colors. Keep the existing simple default: Auto, All colors, Oklab and Cleanup Off. Add no permanent scope control unless usability evidence shows a need.

This spike concerns user intent and measurable behavior. It does not prescribe a module layout, numerical optimizer, or replacement of the current matching path.

## Baseline and vocabulary

Current behavior is described in [Colorfetti's palette guide](../../palettes.md) and [repository guidance](../../../CLAUDE.md). Historical implementation measurements in [palette implementation](../2026-10-12-palette-implementation.md) and [wall stress](../2026-10-12-generated-wall-stress.md) establish lifecycle/export constraints, but refer to earlier 32-color generation. Current Auto capacity is 64; do not mistake those historical runs for current-capacity performance measurements.

| User concept | Meaning | Current capability | Wording to test |
|---|---|---|---|
| Target palette | Set of allowed opaque RGB values | Curated, imported, edited or saved full palette | “Use these colors” |
| Auto palette | Fit a shared allowed palette from wall sources; it follows changes to the wall | Present, capacity 64; source/duration/opacity changes can regenerate it | “Auto · colors from your images” |
| Automatic count | Choose how many colors are sufficient under a quality criterion | No independent quality/count policy exposed | Evaluate only after a quality target and corpus are defined |
| Requested maximum | Upper bound on colors selected from allowed colors | Present per image, one subset per entire animation | “Up to 8 colors per image” |
| Allowed count | Size of the active target palette or selected subset | Palette count is available; a maximum may be lower | “32 allowed · up to 8 per image” |
| Used count | Unique visible RGB values actually present in converted output | Not exposed as an explicit inspection workflow | “6 used” with image/clip scope |
| Whole-wall maximum | One subset with a shared bound across the complete collection | No optional shared capped subset exposed | “Up to 8 colors across these images” |
| Fixed generated copy | Freeze completed generated colors into an ordinary named palette | Already available through Edit/save | Improve discovery before adding another capture mechanism |

A palette with eight colors need not produce eight used colors. An upper bound is not an “exactly N” request. Auto is automatic color fitting, not a proven automatic minimum-count choice. A future quality-based count picker needs explicit quality limits; it must not be inferred from the word Auto.

Count opaque visible RGB only. Empty pixels do not consume the user's opaque-color budget. An image or animation may have zero visible used colors. GIF encoding separately needs a transparency table entry: 256 opaque colors plus transparency exceed its global-table capacity. Do not fix that by silently changing the target. The existing explicit compatibility flow remains authoritative.

## Original experiment and limits

The executable [collection experiment](../../../bench/palette-collection-spike/run.mjs) and its [recorded results](../../../bench/palette-collection-spike/results.json) use two synthetic 100-pixel assets. Each has 50 black pixels, 45 accent pixels (red in one, blue in the other), and five identical purple pixels. The allowed target contains black, white, red and blue, with maximum two.

| Scope | First asset's used set | Second asset's used set | Combined used union | Identical purple source maps to |
|---|---|---|---:|---|
| Current independent image subsets | Black/red | Black/blue | 3 | Red in the first, blue in the second |
| One equal-asset collection subset | Black/red | Black/red | 2 | Red in both |

Both outcomes satisfy their respective scopes. The shared subset enforces collection consistency but removes the blue asset's blue accent. It is therefore a useful optional production constraint, not a universal quality improvement. A shared vocabulary and a shared small subset are different promises.

This is a semantic demonstration using the existing limiter and matcher, not an independent proof of optimizer quality or a new app feature. It contains no animation, transparency, dither, cleanup or performance measurement. Raw individual and collection objective values have different weighting and must not be directly compared. The unequal-size follow-up currently selects black/red for **both** pixel-mass and equal-asset weighting; it does not demonstrate a changed subset under those alternatives. An asymmetric fixture is needed to measure that tradeoff.

With a fixed shared subset, Matching fixed and Cleanup/dithering Off, identical source RGB maps consistently across the wall. Optional spatial operations may map identical RGB differently according to neighbors/coordinates. Do not advertise general same-RGB consistency while those operations are active.

## Hypotheses and alternatives

| Proposal | Hypothesis | Default/scope | Tradeoff | Priority |
|---|---|---|---|---|
| Quick budgets 2 / 4 / 8 / 16 / All | Users reach a useful low-color result faster than dragging/typing | Optional shortcuts to existing committed maximum | More controls; small palettes need clear effective limits | P1 |
| Used-color inspector | Users understand missing accents and exported counts with visible swatches/frequencies | Open for one selected image or whole clip | Full-source scan cost; numbers can distract | P1 |
| Save reduced colors | Users can reuse a successful subset without reconstructing it | Explicit named ordinary palette copy | Selected subset versus actual-used set is ambiguous | P1 |
| Better fixed-copy discovery | Users find existing Auto Edit/save before the wall changes | Show an optional explanation/action in relevant palette context | A second redundant button may confuse | P1 |
| Whole-wall cap | A shared constrained collection can trade asset fidelity for predictable union size | Optional scope, independent per-image remains current behavior | One asset's accents may disappear | P2 |
| Fit directly to requested capacity | Direct small palette fitting yields better useful reductions than fitting 64 then restricting | Optional Auto capacity, distinct from target cap | Additional choices/computation | P2; coordinate with workflow/preset spike |
| Automatic minimum count | A quality target can choose a useful count without manual exploration | No default until quality is measurable | Rare details can fail while average error passes | P3 |

P1 is the first research batch, P2 follows demonstrated task demand, and P3 needs a separate quality definition. These priorities are not a shipping commitment.

For quick budgets, preserve the current global requested maximum versus effective maximum distinction. Selecting an eight-color budget on a four-color target uses at most four; a later larger target can retain the requested eight only if the user explicitly committed it. Do not create stale slider gestures or silently turn All into a numerical maximum. One-color palettes remain supported; no 2 shortcut should fabricate a second color. The palette count should explain disabled/inapplicable choices without adding an error dialog.

For reduced-color saving, compare two explicitly named actions in a prototype: **save selected subset** (the actual limiter's allowed entries, even if unused) and **save used colors** (only visible output RGB). Start with one action if participants cannot explain the difference. A still uses all full-resolution pixels; an animation uses the complete clip union, not the currently displayed frame. Whole-wall union is a separate named scope. Preserve original target order where possible and make empty output non-saveable with a reason. This workflow must reuse existing editor/library protections for names, duplicate colors, storage failure, session recovery and HEX backup.

Freezing an Auto palette is already possible. First prototype explaining “this follows your wall; Edit saves a fixed copy.” A newly saved copy should immediately stop following later additions/removals. Saving a subset of that copy is another explicit action. There is no need for a parallel palette-storage system.

## Collection weighting decision

Evaluate a shared subset against at least three policies: pooled visible pixels, equal nonempty asset weight, and explicit user-selected reference weight. Equal asset contribution is the initial hypothesis because it aligns with current Auto behavior; it is not proven best for every collection. A huge background should not accidentally dominate small characters solely because of dimensions unless pixel-mass weighting is intentionally selected.

For equal assets, a clip gets one asset's total mass. Within that clip, visible pixel-time is weighted by effective frame duration and normalized across the entire animation. A hundred-frame clip must not receive a hundred times a still's influence merely because it has more frames. Repeating an animation loop in preview must not affect fitting. Define treatment of empty frames/nonempty assets and duration fallbacks in user documentation. Do not sample only frames that happened to display during processing.

The weighting experiment must include unequal dimensions, rare one-pixel accents, an almost-empty frame, one long dwell and several short frames, a duplicated identical frame with adjusted delay, and a duplicated asset. State whether duplicates intentionally add another asset vote. Run permutations of wall order and different viewport sizes; the fitted result must not depend on scrolling, display scale or processing order.

Consider a pinned reference subset only if artists regularly need a master sprite to dominate. Avoid a weighting slider without evidence users understand its consequence. Record per-asset detail loss as well as a single aggregate objective.

## Processing, inspection and export rules to evaluate

Use full decoded source pixels and immutable source/duration/opacity metadata. Bounded samples/histograms and streamed frame work should avoid one giant concatenated collection image. A collection task must publish one completed immutable subset revision across the wall; partial per-asset publication would briefly mix different budgets. Hold the prior completed preview while preparing the replacement, with current readiness controlling playback and exports.

Capture the wall identity, ordered palette, matching, alpha cut, cap, scope and source references before asynchronous fitting. Changing the wall, cap, family or target invalidates stale preview work. Last preview subscriber cancellation should remove queued work and release captured source references. An independent already-captured explicit Save/Copy/ZIP may finish with its original snapshot. Neither cancellation nor failure should silently export uncapped colors. Keep existing retry/bypass guidance meaningful for the selected scope.

Used-color statistics need the same snapshot ownership. A badge computed for a thumbnail or one frame cannot claim the full-resolution clip count. Label pending/stale statistics, or retain the last completed value with its captured source label. Do not scan the whole wall on hover. Reuse bounded completed statistics where valid, and clear source-retaining summaries when no consumer needs them.

Measure memory separately for decoded source RGBA, transfer/chunk buffers, histogram summaries, current frame/index data, retained preview, output encoders and captured exports. The documented 8 MiB sampled-animation cache is not a total application memory ceiling. Shared-subset work must not duplicate full source storage for every tile/viewer. Record peak worker/main/process memory where available and retention after cancellation/clear. Follow the [existing wall-stress measurement limits](../2026-10-12-generated-wall-stress.md); a short process-memory drop does not prove complete reclamation.

Every export in one ZIP must use the same captured collection subset when whole-wall scope is selected. Per-image scope retains separate subsets. GIFs retain one clip subset and original delays/loop count; original comparison playback remains independent. Native PNG/GIF/ZIP decoding must verify allowed membership, opaque cap, alpha, dimensions and timing. Palette export can preserve the selected full subset even when an individual compact PNG uses fewer entries; document that difference.

## Experiments

1. **Budget discovery:** five participants complete “reduce this sprite to at most eight colors,” return to All, then use a four-color target and explain the result. Compare current controls with optional 2/4/8/16 choices in the existing settings panel. Record task completion, accidental edits and understanding of the cap.
2. **Collection intent:** present the original red/blue/purple fixture and a real multi-sprite character set. Ask for a consistent shared two/eight-color collection, then for the best-looking independently limited sprites. Compare wording “per image” / “across these images” and measure whether users anticipate accent loss before switching.
3. **Used versus selected:** use a 16-color target whose output uses six entries, plus a two-frame animation whose second frame introduces a new accent. Ask participants to save reusable colors. Test whether one action is sufficient or whether selected-subset versus used-union choices are understood.
4. **Fixed-copy discovery:** start on Auto, save a fixed palette using the existing editor, add a strong new-color image, and verify the saved copy stays fixed. Compare help text/action placement without creating a new storage feature.
5. **Weighting stress:** extend original synthetic fixtures until pooled and equal-asset policies select different subsets. Then evaluate character/background pairs and short/long dwell clips. Publish counterexamples and per-asset loss; no conclusion from one scalar average alone.
6. **Lifecycle/export:** rapidly change caps/scope/target, remove assets during queued work, close a viewer, clear the wall, and change sources after starting ZIP. Decode resulting native outputs against the captured snapshot and inspect retained-source lifetimes. Test cancellation during transfer, fitting, matching and encoding.

## Acceptance and stop gates

- At least four of five participants find and correctly apply eight colors without help, return to All, and explain an upper bound. Treat this small study as formative evidence rather than a statistical success rate.
- At least four of five correctly predict that per-image cap two can use more than two colors across the wall. Whole-wall scope is justified only if participants have a concrete collection constraint and understand the accent-loss tradeoff.
- In independent scope, the original fixture retains union three and its distinct purple mappings; in shared scope, the union is at most two and identical source RGB maps consistently with spatial operations Off. These are behavior checks, not image-quality rankings.
- Used-color counts equal independent full-source native-export counts for stills, complete animations and collection unions. Transparent pixels are separate; never report a current-frame count as whole-clip count.
- Saving used colors or selected subset creates a named fixed palette with correct unique RGB values and declared order. Zero visible colors cannot produce a fabricated palette. Cancel/storage failure keeps the draft recoverable.
- Whole-wall mode never exceeds the captured union budget, changes exact target colors, or silently relaxes the cap. Transparent RGB do not count; GIF table overflow follows explicit recovery.
- Quick choices, source/scope wording and inspection fit 360px phones and desktop without hiding existing controls. Keyboard and screen-reader labels convey scope/count; touch targets remain at least 44px.
- Stale jobs never replace newer previews, queued canceled jobs release source references, and already-captured exports remain internally consistent. A failed shared-subset task blocks affected exports with an explicit retry/bypass path.
- Collect baseline timings on desktop and a representative phone before setting numerical latency/memory targets. Keep uncapped preset work lazy: it must not acquire collection-fitting cost solely because this option exists. Re-test historical stress workloads at current Auto capacity.

Timebox: two research days for control/inspection mockups, one for weighting/lifecycle fixtures and native export checks, plus optional participant scheduling. Deliver a behavior table, original fixture extensions, a small contact sheet showing accent losses, task observations and a go/no-go proposal for each independent option. Do not bundle scope, count selection, statistics and new algorithms into one required release.

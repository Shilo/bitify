# Spike 03: Palette workflows, presets and exchange

Date: October 14, 2026. Status: one completed original synthetic preset comparison plus research proposals; no app behavior changed.

Status/supersession (Oct 15): historical proposal. Current behavior is documented in [palettes](../../palettes.md) and the [design specification](../../superpowers/specs/2026-10-06-colorfetti-app-design.md); its next-step language is not an open task list. The rail now has eleven curated presets including ENDESGA 8, and Lospec import accepts full palette URLs (not bare slugs).

## Decision to make

Find the smallest improvement to palette discovery, reference matching and exchange that makes an eight-color sprite workflow easier without overloading the dock. Prefer evaluating one chromatic eight-color preset and a direct “Use colors from this image” flow before expanding the rail into a large catalog.

This spike is implementation-neutral. It describes user outcomes and experiments, not a prescribed source layout or algorithm implementation.

## Current baseline

The [current palette guide](../../palettes.md) documents a shared Auto palette with capacity 64, nine curated full palettes, custom image/text/Aseprite palette import, editing, local saved palettes and HEX backup. The curated eight-color choice is grayscale. Users can import other palettes today. Exact palette membership, Oklab/RGB matching, maximum-color subsets, animation handling and optional cleanup are already available.

Two concepts need clearer separation: a palette's number of allowed colors and an image's actual used-color count. A cap on a supplied palette chooses a subset; it does not promise every allowed color appears. Auto currently fits a shared palette for the wall; applying a smaller cap afterward is a distinct operation from directly fitting at that requested maximum. Neither option promises exactly that many colors in output.

This spike owns reference acquisition, preset selection and exchange. [Spike 04](04-reduction-workflow-and-collection-budgets.md) owns cap/count wording, used-color inspection, fixed-copy discovery and collection scope; reuse its usability tasks rather than treating the overlapping hypotheses here as a second required feature set.

PNG/GIF output exists. Palette exchange currently backs up HEX; text import covers hex lists, legacy RGB GPL and JASC-PAL. `.ase`/`.aseprite` import reads an embedded first-frame Aseprite table. Adobe Swatch Exchange `.ase` and Paint.NET ARGB `.txt` are different formats and are not supported. Full-palette spatial dithering is a separate research spike; legacy two-color styles do not cover it.

## Hypotheses and priority

| Hypothesis | Priority | Benefit if true | Main risk |
|---|---|---|---|
| A chromatic eight-color preset helps users explore very low color counts faster than reducing a 32/64-color target | P1 | One-click useful starting point | May lose material separation or distract from Auto |
| Selecting a wall image as a palette source is clearer than importing the same file again | P1 | Faster match-to-reference workflow | Source changes and animation scope can surprise users |
| Displaying “allowed / used / maximum” separately reduces incorrect expectations | P1 | Users understand why an eight-color target exports fewer colors | Extra numbers can clutter the dock |
| A requested capacity for Auto improves reduction quality compared with fitting 64 and selecting a subset | P2 | More direct reduction intent | More computation, cross-asset changes and preference complexity |
| Catalog import by palette link/slug is more useful than dozens of built-in presets | P2 | Larger choice without a longer rail | Network/CORS, attribution and failure recovery |
| PNG-strip/GPL/JASC export removes friction when returning colors to an editor | P2 | Easier round trip | Index order versus compact used-color export needs explicit semantics |
| Adobe ASE/Paint.NET TXT support materially increases successful imports | P3 | Fewer format errors | Rare variants and ambiguous extensions add maintenance |

P1 means first evaluation batch, P2 follows evidence of demand, and P3 needs concrete failed-user workflows. These are evaluation priorities, not authorization to ship.

## Palette candidates and selection policy

| Candidate | Verified source identity/count | Distinct use to test | Recommendation before testing |
|---|---|---|---|
| [ENDESGA8](https://lospec.com/palette-list/endesga-8) | ENDESGA; 8 | Broad hue coverage with a tiny budget | Compare first |
| [SLSO8](https://lospec.com/palette-list/slso8) | Luis Miguel Maldonado; 8 | Cool shadows and warm highlights in one stylized ramp | Compare first |
| [Sweetie16](https://lospec.com/palette-list/sweetie-16) | GrafxKid; 16 | Colorful general-purpose option | Add only if clearly useful beside existing 16-color choices |
| [Apollo](https://lospec.com/palette-list/apollo) | AdamCYounis; 46 | Longer shading ramps at an intermediate count | Catalog or optional collection first |
| [Zughy32](https://lospec.com/palette-list/zughy-32) | Zughy; 32 | Alternative authored look | Avoid enlarging the main rail without distinct user value |
| [Oil6](https://lospec.com/palette-list/oil-6) | GrafxKid; 6 | Sparse tonal stylization and gradient tests | Optional collection |
| [AAP-Splendor128](https://lospec.com/palette-list/aap-splendor128) | Adigun A. Polack; 128 | Fidelity-oriented authored colors | Import/catalog candidate |

The cited palette pages establish author, count and published swatches. “Broad,” “warm” and “longer ramps” above are hypotheses to test visually, not measured quality results. Avoid rankings based solely on current likes/downloads. Preserve published values/order, stable preset identities and existing user selection. Confirm redistribution terms and attribution before bundling.

Scope for the first experiment: evaluate two eight-color candidates and at most two larger alternatives; select **zero, one or two additions** based on evidence. Retaining the current rail is a valid result. Include exact eight-color targets and caps of eight on larger targets in comparisons; they solve related but different problems.

## Completed bounded preset experiment

Run `node bench/palette-preset-spike/run.mjs`. The [original harness and methodology](../../../bench/palette-preset-spike/README.md), [recorded results](../../../bench/palette-preset-spike/output/results.json), [labeled comparison](../../../bench/palette-preset-spike/output/index.html) and [self-contained visual sheet](../../../bench/palette-preset-spike/output/comparison.svg) accompany this spike. Primary Lospec JSON snapshots for ENDESGA8 and SLSO8 retain author and published order; the recorded reproduction is offline. Original fixtures are a 128×80 flat-region sprite with three skin/cloth/wood/metal shades, an outline and tiny red accent, and a 128×64 chromatic ramp. No external artwork was used.

All eight conversions used current Oklab nearest/limiting, cap eight, alpha cut128, Cleanup Off and no dither. All passed palette membership, at-most-eight visible colors and unchanged alpha classification. The eight-entry targets can discard unused entries during subset selection; their full source snapshots still retain all eight published colors.

| Target | Sprite used / point Oklab MSE | Distinct constructed role probes, out of 6 | Chromatic ramp used / point Oklab MSE |
|---|---|---:|---|
| ENDESGA8 | 7 / .015802 | 5 | 7 / .013251 |
| SLSO8 | 6 / .009009 | 4 | 7 / .021200 |
| Existing Grayscale8 | 6 / .006486 | 3 | 6 / .026233 |
| Existing PICO8 capped8 | 8 / .007081 | 5 | 8 / .012383 |

Grayscale has the lowest sprite point error while merging several differently labeled midtones. ENDESGA8 separates all four material midtone probes, but the red accent shares wood's mapped color; SLSO8 merges wood/metal and accent/skin probes. PICO8 merges cloth/metal and compresses three wood shades into two. ENDESGA8 and SLSO8 keep three distinct sampled shades in each of the four constructed ramps, although colors shift: visual inspection shows strong red/orange/purple substitutions with ENDESGA8 and warmer tonal convergence with SLSO8. This is a demonstrated hue-versus-shade tradeoff, not an artist preference ranking.

Constructed role probes measure identical output labels only; they do not prove adjacent materials, eyes or outlines remain perceptually readable. Oklab error favors the selected matching objective and cannot establish artistic quality. Two synthetic fixtures provide no real-art, animation, participant or mobile-performance evidence. These measurements support provisionally evaluating ENDESGA8 as a hue-varied eight-color choice and SLSO8 as a stylized ramp alternative; neither is a universal winner, and existing PICO8 capped8 remains competitive. All real-art and usability experiments below are still proposed.

## Workflow alternatives

| Decision | Option A | Option B | Option C | Initial choice to prototype |
|---|---|---|---|---|
| Reference source | Re-import a file through existing dialog | Use colors from one selected wall image | One live palette following an image or clip | B: fewer steps with explicit snapshot |
| Animated reference | Current displayed frame only | Entire clip | User frame range | B, with clear all-frame label; A remains an explicit alternative |
| Reference with over 256 unique colors | Reject with guidance | Offer candidate reduction to chosen capacity | Automatically discard colors | B with review; no silent loss |
| Auto capacity | Fixed 64 then subset cap | Fit directly to requested 4/8/16/32/64 | Per-image capacity | Compare A/B; keep shared-wall behavior explicit |
| New presets | Add all to rail | Add one eight-color choice | Searchable optional collection | B initially; C only if collection growth warrants it |
| Palette catalog | Open external download | Paste page URL/slug into import | Full in-app search | Compare A/B; do not assume an undocumented search API |
| Export palette | HEX only | HEX plus PNG strip and GPL/JASC | Full editor sprite document | B; C has more format/profile semantics |

An image-derived palette must distinguish **visible pixels** from **embedded palette entries**. Embedded entries may include unused authored colors; visible extraction may omit intentional future ramp colors. Label which source was used and do not imply the two are interchangeable.

The [official Lospec API](https://lospec.com/palettes/api) documents single-palette JSON/CSV by slug, including name/author/colors. A browser-origin CORS and failure test is required before selecting direct fetch. Preserve the current local-file fallback. Avoid making imported artwork or normal recoloring depend on an external service. Downloaded colors become an ordinary reviewable snapshot; subsequent catalog changes must not silently recolor a saved project.

The [Aseprite CLI](https://www.aseprite.org/docs/cli/) supports palette assignment and indexed conversion; it provides a useful round-trip destination. Its [file specification](https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md) distinguishes palette updates across frames, so exporting a palette is not equivalent to promising full animated-document interchange.

## Experiments

1. **Preset comparison.** Use 24 owned or openly licensed sprites: skin/cloth/metal/wood, saturated icons, low-saturation objects, dark outlines, highlights, gradients and transparent edges. Add four short animations and four intentionally palette-authored sprites. Compare current presets, ENDESGA8, SLSO8, Sweetie16 and Apollo at native size and nearest-neighbor enlargement. Repeat eight-color experiments with dithering off and with candidate dithering from its separate spike. Record used RGB count, membership, tiny-feature retention, material separability and blind artist preference. Do not judge a stylized palette only by source pixel error.
2. **Task usability.** Five participants complete “make this use at most eight colors,” “make these sprites match this reference,” “save these colors for later,” and “bring these colors back to an editor.” Compare current UI against a mockup with reference-source choice, allowed/used count wording and one new preset. Capture success, errors, time and explanation of what the cap means.
3. **Source semantics.** Create fixtures where visible colors differ from embedded entries, transparency hides RGB, a clip contains a one-frame accent, and alpha varies. Compare snapshot from one image, whole clip, and table import. Review the displayed source label and explicit warnings before commits.
4. **Auto capacity.** Compare fit-at-64-then-cap with fit-at-requested-count on the same corpus at 4/8/16/32. Include mixed-size wall assets and long/short dwell frames. Keep weighting assumptions constant and measure elapsed time, rare-detail loss, per-asset error and artist preference. Decide whether a capacity control solves a problem beyond the existing maximum.
5. **Exchange.** Export candidate HEX, PNG strip, GPL and JASC palettes and reload them into Colorfetti and a real pixel editor. Verify exact RGB, order, deduplication, selected-versus-used policy, names with Unicode, and 1/2/8/16/64/256-color limits. Explain that a compact artwork PNG may contain only used entries and cannot serve as a guaranteed full-target table.
6. **Catalog acquisition.** From the deployed browser origin, test known slug, pasted page URL, unknown slug, offline, timeout, blocked CORS, malformed values and over-256 results. Never replace the draft on failure. Check whether native local files remain the faster task path before adding network UI.

## Acceptance gates

- At least four of five usability participants complete the eight-color and reference-match tasks without help; at least four correctly explain allowed count versus used count afterward. Treat this as formative evidence, not a statistical generalization.
- Select a new preset only if it has a documented distinct use and is preferred in at least one corpus category without a hidden membership/alpha failure. Publish representative failures alongside successes. Do not change the fresh default from this study alone.
- The one-image reference snapshot requires fewer interactions than re-importing and preserves current artwork/draft on cancel/error. Labels distinguish current frame, whole clip and embedded table.
- Every accepted exported palette round-trips exact unique opaque RGB and chosen order in all promised formats. Transparency is labeled separately and excluded from the opaque color count; supported one-color targets remain valid.
- Requested maximum remains an upper bound, never a claim that all colors are used. GIF's transparency/table limit stays explicit. Any shared-subset feature must state its wall/asset/clip scope.
- A network importer ships only after real deployed-origin verification. No API availability assumption, automatic upload, or required backend is introduced.
- At 360px phone width and desktop size, palette selection, source choice, backup and errors remain keyboard/screen-reader reachable without adding permanent dock clutter. Keep touch targets at least 44px.
- Report total task time and conversion time on desktop and a representative phone; reject an approach with a material regression without a documented benefit. Numerical performance targets should be set from baseline measurements, not invented before the experiment.

## Lower-priority subspike: shade-ramp inspection and authoring

P3, separate from the first preset/import experiment. The current editor already adds, edits, removes and reviews individual colors; inspected behavior does not expose dedicated ramp grouping or ramp generation. Test whether a temporary shade-ramp view helps artists inspect related shadows/midtones/highlights, and whether a reviewed hue-shifted ramp proposal is faster than adding those swatches individually. No ramp experiment has been completed here.

Compare manual grouping, suggested grouping and inspection-only lightness ordering. Suggested groups are tentative color relationships, not semantic identifications of skin, metal or a shared material. Allow users to split, merge or reject them; a color can belong to several useful ramps. An inspection sort must not reorder the actual palette. Nearest matching treats colors as an allowed set and uses entry order for ties; it does not assign shadow/highlight roles or preserve a material's ramp identity. Role-based recoloring would need a separate mapping contract and visual evaluation.

For generation, compare a constant-hue lightness ramp with an artist-controlled hue shift across shadows and highlights. Independently control lightness spacing, chroma envelope, endpoints and step count; explain near-neutral hue ambiguity. [Oklab's author](https://bottosson.github.io/posts/oklab/) describes its lightness/chroma/hue representation and interpolation uses. [CSS Color 4's gamut guidance](https://www.w3.org/TR/css-color-4/#gamut-mapping) explains why perceptual coordinates can exceed a destination gamut and why gamut mapping needs an explicit policy. Evaluate chroma reduction against simple RGB clipping; do not assume either produces the artist's preferred shading.

All suggestions remain an isolated preview until the user reviews exact resulting sRGB swatches and accepts a draft change. Show which entries would be added/replaced, rounded duplicates, actual unique count and any gamut adjustment. Cancel preserves the original draft/target; saving follows existing library rules. Keep existing entries byte-exact unless explicitly selected for replacement, preserve order unless explicitly changed, and enforce the final 1–256 unique opaque RGB bound. Alpha remains separate: ramp generation must not introduce alpha-bearing palette entries or change the artwork's opacity classification.

Use before/after sheets of skin, cloth, metal, wood, neutral ramps, saturated highlights, intentional hue shifts and shared-color materials at native and enlarged sizes; include tiny eyes/outlines and animation highlights. Compare manual-only editing with proposed grouping/generation, recording editing time, rejected suggestions, detail readability and artist preference. Four of five formative participants should understand that grouping does not impose shade roles and should complete a reviewed four-step ramp without silently changing unrelated entries. Accept only if generated swatches are in gamut, unique-count/alpha limits hold, and accepted RGB/order round-trip exactly through promised HEX/PNG/GPL/JASC color exchange. Those formats need not retain group metadata; label that limitation. Preserve no-change and manual-edit alternatives if automatic grouping confuses users or the visual corpus shows no useful gain.

## Deliverables and stop conditions

Timebox for the first preset/import/exchange batch, excluding the optional ramp subspike: two to three research days: one for corpus/preset contacts, one for workflow and round-trip prototypes, and up to one for user observations and recommendation. This is an estimate of investigation effort, not an elapsed benchmark.

Deliver a comparison contact sheet, source/count wording mockups, exact RGB round-trip report, usability observations and a ranked proposal with a no-change option. All prototypes should be isolated; no production behavior changes belong in this spike.

Stop expanding the palette list if participants cannot locate their saved palette faster, if the candidates mostly duplicate existing looks, or if attribution/redistribution is unresolved. Keep complex Adobe ASE variants, full document export, hardware-accurate emulation, cloud sync and a full online palette browser out of the first implementation scope.

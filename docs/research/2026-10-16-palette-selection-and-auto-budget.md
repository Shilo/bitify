# Palette curation and automatic color-budget research

Date: October 16, 2026. Research only; production edits require the separate implementation review. The user approved keeping automatic Max colors research-only in this batch. Color protection and opacity-weighting studies remain closed/deferred; this work does not reopen them.

## Recommended 32-color addition

Add **mulfok32**, immediately after ENDESGA 32, provided the independent reviewer agrees its deliberately pastel/purple treatment earns one additional preset. Preserve ENDESGA 32 as the existing curated fallback, Auto as the fresh default, all existing stable IDs and all artist color orders. Do not add Zughy 32 and DawnBringer 32 at the same time.

The public Lospec exact-32/downloads list was retrieved for this study. This corrects an early shortlist that considered Zughy and DawnBringer without checking the whole first page. Snapshot: [public evidence](../../bench/palette-curation-2026-10-16/public-evidence.json).

| Public list order | Palette | Downloads at retrieval | Likes at retrieval | Decision |
| --- | --- | ---: | ---: | --- |
| 1 | ENDESGA 32 | 205,936 | 2,284 | Existing; retain first |
| 2 | mulfok32 | 43,360 | 1,659 | Most-downloaded missing candidate; recommend one addition |
| 3 | Zughy 32 | 42,152 | 739 | Strong, warmer/earthier alternative; import rather than add another rail item |
| 4 | DawnBringer 32 | 22,448 | 463 | Recognizable legacy/general palette, but less downloaded in this source |
| 5 | Resurrect 32 | 20,632 | 863 | Less compelling beside existing Resurrect 64 |

This is a dated **Lospec-download popularity proxy**, not a count of distinct users, real-world installations or every palette on the internet. Likes agree with mulfok32 over the two main missing alternatives. Lospec's August 26 gallery-matching announcement also names DawnBringer 32 among commonly matched palettes; historical gallery usage and downloads are different signals. No general claim that mulfok32 is universally the most popular is justified.

Primary sources: [filtered public list](https://lospec.com/palette-list/load?colorNumberFilterType=exact&colorNumber=32&page=0&tag=&sortingType=downloads), [mulfok32](https://lospec.com/palette-list/mulfok32), [Zughy 32](https://lospec.com/palette-list/zughy-32), [DawnBringer 32](https://lospec.com/palette-list/dawnbringer-32), [Lospec gallery announcement on its home page](https://lospec.com/).

### Distinctness and bounded output comparison

The creator describes mulfok32 as a soft/pastel palette. Its dark neutrals lean purple, with pink/lilac highlights and no exact black. It shares only white with ENDESGA 32; exact RGB overlap alone does not prove distinct appearance, so outputs were compared too.

The [comparison sheet](../../bench/palette-curation-2026-10-16/comparison.png) and [interactive full images](../../bench/palette-curation-2026-10-16/index.html) contain sixteen native outputs: inventory sheet, armor, grayscale ramp and knight, each recolored using ENDESGA 32, mulfok32, Zughy 32 and DawnBringer 32. Conditions are Oklab, All colors, Cut128, dithering Off, Cleanup Off. The two item/armor sources and ramp are retained owned research fixtures; the knight reuses the existing service-comparison fixture. Input and output hashes are recorded in [results](../../bench/palette-curation-2026-10-16/results.json).

Observed differences: mulfok32 makes the steel armor visibly purple and the potion/book inventory pinker; Zughy retains warmer neutral armor; DawnBringer offers true black and more neutral-looking steel. The pastel result is a useful intentional alternative, not a fidelity improvement. It must be an opt-in preset, never a replacement for current defaults. There is no universal winner or claim that matching source colors is the only worthwhile palette goal.

Reproduce offline: `node bench/palette-curation-2026-10-16/run.mjs`. Append `--refresh` only to update public metadata/colors; no authenticated service calls occur. The retained screenshot was rendered with Chromium's sandbox enabled. These are direct application-algorithm outputs, not full import/export UI acceptance tests.

Color attribution: mulfok32 by mulfok, canonical source link above, all 32 published colors in original order. The page distributes downloadable palette data but does not state an explicit SPDX license; do not invent one. The current library already attributes analogous artist palette sets. No example artwork from Lospec was downloaded or redistributed.

## Ordering and Black & white / Mono

Keep Auto first and descending color-count groups. Popularity should rank comparable artist palettes **within** a group, with a documented utility exception for plain mathematical/reference palettes. Do not invent download values for Colorfetti's own evenly spaced Grayscale 8, generic exact black/white or one particular Game Boy LCD interpretation.

Recommended full-palette rail:

1. Auto; Resurrect 64.
2. ENDESGA 32; mulfok32.
3. PICO-8; DawnBringer 16.
4. ENDESGA 8; Grayscale 8.
5. Ice Cream GB; Game Boy green.
6. Black & white; Glow; Paper.

Existing groups already follow measured popularity where a meaningful comparison is available: PICO-8 exceeds DawnBringer 16; Glow exceeds Paper. Ice Cream GB has 25,828 downloads versus 12,018 for Lospec's Nintendo Gameboy (bgb) entry, but the latter is not an exact match to Colorfetti's green RGB interpretation, so it supports only recognition/context, not an exact apples-to-apples measurement. Keep current four-color ordering.

Black & white first in the two-color group is a **utility/recognition choice**, not a numerical popularity finding. It is the precise neutral reference target; the two artist tints follow in their measured order. Full-palette Black & white and optional 1-bit Mono contain the same exact black/white values but use different conversion families. They are not two duplicates competing in the same rail. The 1-bit rail currently starts Glow, Mono, Paper; changing that family solely to imitate the full-palette order would change an established separate workflow without comparative evidence. Retain it in this batch. Consider wording consistency separately only if users actually find the family distinction confusing.

## PixelLab automatic color count: what is verified

Fresh public contracts were inspected on October 16: [REST OpenAPI](https://api.pixellab.ai/v2/openapi.json), [MCP documentation](https://api.pixellab.ai/mcp/docs), [Reduce Colors guide](https://www.pixellab.ai/docs/tools/reduce-colors). The installed integration's observable mode/request behavior agrees with these public contracts; no implementation files, reference-file names, code excerpts, private routes or credentials are included in this research spike.

The automatic budget is real: omit both the requested count and the palette image and PixelLab chooses a palette size from the supplied image(s). Explicit count accepts integers from 2 through 256, or null/omission for auto. Palette-image mode is mutually exclusive with the count; multiple same-size frames share the result. The public contracts do not disclose the quality threshold, count-search objective, rare-color guarantee or internal heuristic. An implementation cannot be inferred from a UI label.

The public REST endpoint inspected here does not expose an automatic maximum for an already chosen fixed target palette. Consequently, putting an Auto button beside Colorfetti's global Max colors would not simply reproduce the documented service behavior. It would require designing new fixed-palette semantics as well as generated-palette semantics.

Prior retained direct tests already demonstrate a real distinction: PixelLab's automatic grayscale-ramp result used 34 colors from 64 source grays; current Colorfetti Auto64 with All preserves all 64 exactly. When Colorfetti is constrained to the same 34-color budget, the service has lower point error on that fixture. Other tested low-budget sprites favor Colorfetti's error, while artistic detail comparisons remain mixed. See [paired comparison](pixellab-review-2026-10-14/paired-output-comparison.md). This is evidence of capability/behavior, not proof of a universally smart or optimal color budget. No new paid or authenticated calls were needed for this question.

## Auto Max decision: research only

**Do not add an Auto Max button in this batch.** User approved this disposition after the distinction and output-risk concern were raised. Auto fitting, choosing a small allowed count, and counting actual used colors are separate jobs. Calling all of them Auto risks hiding why an image changed.

Automatically minimizing colors needs an explicit tradeoff between fewer colors, average pixel error, small important details and animation consistency. A threshold low enough to retain a bright one-pixel eye can also keep AI noise; a threshold that removes noise can remove that eye. Source unique-color count alone is not a useful automatic reduction algorithm. Current Auto already preserves all source colors when capacity and eligibility permit; the proposed control should not falsely promise lossless reduction of noisy gradients.

Previous direct-K refinement, guarded refinement, automatic accent weighting and Keep weighting studies had meaningful regressions and remain rejected. Their conclusions are not permission to silently revive a heuristic under a different button. Any future bounded experiment must freeze real sprites/animations and known counterexamples first, compare current All/manual-budget and service auto at both equal and automatic capacities, check per-frame stability, retain deterministic alpha/target membership, and measure device responsiveness. No default or algorithm change is justified by the current evidence.

## Independent challenge and implementation status

Round 1: the orchestrator independently inspected the sixteen-output sheet and accepted the deliberately purple metal as an optional artistic target, rather than evidence of improved neutral fidelity. The initial Zughy/DawnBringer shortlist was challenged by the broader filtered popularity list and corrected to mulfok32 before implementation. Root approved that single preset, with no default or algorithm change.

The proposed implementation adds only `preset-mulfok32` to the full palette library and updates its canonical-color/order/provenance tests and this palette documentation. A separate verification compared all 32 values with the frozen public JSON and confirmed the production library diff adds exactly one preset line: every previous color, ID and default is unchanged. Focused library/state/preview coverage passed 101/101 tests. The first sandboxed runner attempt failed before executing tests because its temporary-file rename was denied; the unrestricted test run then passed. Final independent code review and actual app/device acceptance belong to the orchestrator's batch report; the research harness itself does not stand in for those checks. No commit was made by this researcher before review.

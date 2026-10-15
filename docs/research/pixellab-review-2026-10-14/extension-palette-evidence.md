# Installed extension and palette ecosystem evidence

Research date: October 14, 2026. This document contains competitor references; the improvement spikes are kept independently actionable and contain none of those references.

## Scope and evidence limits

The installed Aseprite extension was inspected read-only at `C:\Users\shilo\AppData\Roaming\Aseprite\extensions\pixellab`. Its manifest reports version **0.4.130**. This establishes the installed copy's reported version, not that every file is an unmodified official release. In particular, helper comments describe migration from earlier behavior with that same version. No clean vendor comparison, release provenance, or installation-date verification was performed.

Labels below distinguish **observed client contract** (installed files), **documented** (public vendor pages), **inferred opportunity**, and **unverified runtime behavior**. Client labels and comments cannot establish the server's quantizer, color space, quality, determinism, latency, exact alpha semantics, billing, or animation stability. No extension UI execution, authenticated request, or output-quality experiment was performed by this sub-investigation. Other review artifacts may report live website/API experiments.

Only short behavioral summaries and file/line evidence are retained here. No implementation was copied, and no credential values or request bodies containing credentials were saved.

## Installed reducer coverage

| Feature | Observed client contract | Evidence in installed copy | Confidence boundary |
|---|---|---|---|
| Reduction entry point | Menu offers Reduce colors | `plugin-menu.lua:1089` | Static entry point; not clicked |
| Mode choice | Auto, Use Palette, Current frame color palette, Specify Colors | `quantize-image.lua:872–990` | Four visible labels; not four proven different server algorithms |
| Explicit count | Slider 2–256, initial value 16 | `quantize-image.lua:14`, `979–985` | Client range; output maximum still needs counting |
| Automatic count | Auto omits an explicit requested count | `quantize-image.lua:415–417` | Selection criterion and accuracy unknown |
| Palette resource source | Current Sprite and a fixed collection of named Aseprite palette resources | `quantize-image.lua:643–728` | Missing resources fall back locally; installed names do not prove distinct colors |
| Palette frame source | User captures a frame and uses its colors as target; Set/Clear and a preview are present | `quantize-image.lua:309–374`, `827–869` | Source is frame imagery, distinct from embedded sprite palette table |
| Large palette previews | At most 24 colors shown; selection still uses full palette | `quantize-image.lua:38`, `731–749` | Truncation is a preview policy, not a palette cap |
| Dithering | No/Yes toggle; size 2×2, 4×4 or 8×8; strength slider 0–100, default 50 | `quantize-image.lua:1008–1062` | Pattern family is not proven by size labels alone |
| Dithering request mapping | Sizes map to levels 0/1/2; strength is divided by ten; off omits both fields | `quantize-image.lua:284`, `375–381`, `421–422` | Do not equate UI 50 with API 50; endpoint units require separate documentation |
| Smart colors beta | Available for palette modes; UI claims recoloring whole objects and adds 15–60 seconds | `quantize-image.lua:990–1006` | Marketing/help text, not measured quality or timing |
| Smart restrictions | Rejects all-frames processing and positive dithering strength; requires supplied palette colors | `quantize-image.lua:287–307`, `309–374` | UI says no dithering; the positive-strength guard deserves boundary testing at strength zero |
| Animation | Process All Frames; selects one shared palette source, issues per-frame requests | `quantize-image.lua:385–427`, `1065–1090` | Shared palette does not establish shared subset, cross-frame optimization or flicker prevention |
| Output placement | New layer, Current layer, New frame | `quantize-image.lua:1082–1084` | Artist workflow support; local UI execution unverified |
| Bounds | Requires RGB sprite, area at most 512×512 pixels | `quantize-image.lua:265–278` | Area check is not independently a 512-pixel width and height limit |
| Cost label | UI states 0.1 generations per frame | `quantize-image.lua:1092` | Static label, not a billing observation |

The resource list spans artist palettes (for example DB16/DB32, EDG8/16/32, AAP collections, Arne collections, Nyx8, Rosy-42), hardware sets (Apple II, Atari, Commodore, MSX, NES, ZX Spectrum), and software sets (PICO-8, Solarized and others). This is broader preset discovery than Colorfetti's small rail, but also introduces choices that need search, attribution and hardware caveats. Resource IDs alone should never be used as authoritative palette definitions.

## Installed target palette integration

| Feature | Observed client contract | Evidence in installed copy | Confidence boundary |
|---|---|---|---|
| Palette source | No, Color palette, Current image | `target-palette.lua:20–27`, `182–190` | No means no supplied colors; a separate maximum may still be requested |
| Supplied target | 2–256 distinct visible colors | `target-palette.lua:40–59`, `74–99` | One-color targets refused here; Colorfetti supports one-color full palettes |
| Transparency in palette | Fully transparent entries excluded; visible RGB deduplicated | `target-palette.lua:40–59`, `74–99` | Not proof of result alpha behavior |
| Maximum | 0 means no explicit limit; otherwise whole number 2–64 | `target-palette.lua:119–151`, `194–200` | Generation cap differs from reducer's count slider |
| Palette plus maximum | Can send colors and cap together; cap alone also possible | `target-palette.lua:125–151` | Which allowed colors are selected by server remains unknown |
| Smart toggle | Optional only on tools whose model exposes it; requires target colors | `target-palette.lua:145–146`, `180`, `203–213` | Do not claim all generation tools offer Smart |
| Style conflict | With explicit target colors, client disables palette transfer from style reference | `target-palette.lua:155–169` | Useful conflict handling; not evidence that every visual style characteristic is preserved |
| Current integration | Create image exposes palette, cap and Smart; animate-character/object and animate-with-text expose palette and cap | `generate-image-new.lua:52–54`; `generate-animate-character-object.lua:17–18`; `generate-animate-with-text.lua:20–21` | These are the inspected models; not a complete server compatibility list |
| Post-generation reduction | Standard result UI hides Reduce colors when encoded request already carries a target palette | `websocket.lua:591–623` | Guard is request-based, including cap-only requests; does not prove output already adheres |

The ordinary reducer uses palette imagery for palette modes, while Smart routes colors through the target-palette contract. That is a client routing observation only. It does **not** reveal the algorithms behind the two server paths or justify reproducing any implementation.

The post-generation multi-image helper batches equal-size images into a bounded total area and processes batches sequentially (`quantize-image.lua:48–151`). Its behavior differs from the explicit all-frame reducer's per-frame loop; neither path demonstrates duration-weighted joint fitting. The multilayer result UI also contains automatic and explicit-count reduction controls (`websocket-multi-layer.lua:737–743`).

## Public documentation corroboration and drift

The [Reduce Colors documentation](https://www.pixellab.ai/docs/tools/reduce-colors) describes quantization and palette matching and gives a maximum image area of 512×512. It corroborates the basic workflow and area bound, but does not identify a mathematical quantizer or color-distance function.

The [Dithering options documentation](https://www.pixellab.ai/docs/options/dithering) documents 2×2, 4×4 and 8×8 patterns and an amount control. It does not establish an error-diffusion option, a Bayer implementation, gamma handling, edge behavior or temporal phase policy.

The [Color options documentation](https://www.pixellab.ai/docs/options/color) distinguishes weak generation palette guidance from forced adherence, and describes Auto, Specify colors and Use palette. It mentions Lospec import in **Pixelorama**, which is not evidence of direct Lospec import in the website or Aseprite extension. Current-image palette guidance also appears there. This terminology spans older generation workflows; reconcile it with the live endpoint contracts rather than assuming every tool implements the same guarantee.

No reliable public release-note date for the newer target-palette contract was established here. An attempted `/updates` page did not return useful content. “Recently added” remains user-provided context, not a dated release claim from this review.

## Verified Colorfetti overlap and real gaps

Repository inspection of `CLAUDE.md`, `docs/palettes.md`, `src/lib/palette-import.js`, `palette-decode.js`, `palette-drop.js` and `palette-library.js` confirms:

- Already present: Auto shared fitting (capacity 64), curated targets, custom editor/library, source-image extraction with solid-color proposals, embedded first-frame Aseprite palette extraction, HEX/TXT, legacy RGB GPL and JASC-PAL import, HEX backup, exact palette membership, Oklab/RGB matching, max-color subsets, duration-weighted animation subsets, optional isolated-pixel cleanup and PNG/GIF exports.
- Full-palette spatial dithering is missing; legacy 1-bit styles are separate and must not be misreported as full-palette dithering.
- The nine full curated presets are Resurrect64, ENDESGA32, PICO8, DawnBringer16, Grayscale8, Ice Cream GB, Game Boy green, Glow and Paper. The eight-color group has no chromatic preset. Colorfetti can already import any proposed additions, so the problem is default discovery and curation rather than fundamental palette support.
- Direct palette-catalog page/slug import, generated-palette target count selection, palette export beyond HEX, using an existing wall item as an explicit palette source, shared capped subset across separate assets, and artist-defined color-role locks are not exposed in the inspected documented workflow.
- “ASE support” is ambiguous: Colorfetti's `.ase` means Aseprite sprite data; Adobe Swatch Exchange `.ase` is explicitly refused. Paint.NET `.txt` is also distinct from Colorfetti's hex-list `.txt`.

A small direct parser check accepted HEX, GPL and JASC-PAL examples and rejected an illustrative Paint.NET comment-plus-ARGB example. This verifies a format boundary, not an entire file-import UI flow. No app files were changed.

## Independent palette and interoperability evidence

| Candidate | Verified definition | Why evaluate | Initial priority |
|---|---|---|---|
| [ENDESGA8](https://lospec.com/palette-list/endesga-8) | ENDESGA, eight colors | Wide hue coverage at the requested eight-color target | High: fills a missing curated size/type combination |
| [SLSO8](https://lospec.com/palette-list/slso8) | Luis Miguel Maldonado, eight colors | Cool-dark to warm-light stylization, distinct from neutral grayscale | High: compare with ENDESGA8 rather than adding both automatically |
| [Sweetie16](https://lospec.com/palette-list/sweetie-16) | GrafxKid, sixteen colors | Recognizable saturated full-color option; test whether distinct from PICO8 and DB16 in practice | Medium |
| [Apollo](https://lospec.com/palette-list/apollo) | AdamCYounis, 46 colors | Intermediate size with multiple longer ramps | Medium; assess whether count grouping remains understandable |
| [Zughy32](https://lospec.com/palette-list/zughy-32) | Zughy, 32 colors | Alternative artist palette at an existing count | Lower; must improve discovery or produce distinct useful results |
| [Oil6](https://lospec.com/palette-list/oil-6) | GrafxKid, six colors | Very small stylized ramp for low-count gradient comparisons | Lower; richer catalog option rather than automatic main-rail addition |
| [Ammo8](https://lospec.com/palette-list/ammo-8) | rsvp asap, eight colors | Green monoramp, useful as a constrained aesthetic baseline | Lower; overlaps handheld looks |
| [AAP-Splendor128](https://lospec.com/palette-list/aap-splendor128) | Adigun A. Polack, 128 colors | Higher-capacity authored target for fidelity experiments | Catalog/import candidate; does not address low-count workflow first |

These are source-verified palette identities and counts, not measured recommendations for output quality. No changing download-count ranking is treated as a universal “best palette” result. Redistribution permission/terms and exact authoritative colors should be confirmed before bundling a new preset.

Lospec palette pages offer PNG, JASC PAL, Photoshop ASE, Paint.NET TXT, GPL and HEX. Existing PNG/HEX/GPL/JASC imports already cover the catalog's core workflow. Adobe ASE and Paint.NET TXT are convenience gaps, not blockers. The [official Lospec API](https://lospec.com/palettes/api) supplies a single palette by slug as JSON/CSV with name, author and color values; it does not document a general search endpoint or guarantee browser CORS. Direct browser import therefore needs a real origin/CORS check before a server-free design can promise it.

[Aseprite's CLI documentation](https://www.aseprite.org/docs/cli/) documents palette assignment and RGB-to-indexed conversion with ordered dithering and Bayer matrix sizes. It is useful as an independent interoperability test oracle; matching its appearance is not a requirement. The [official Aseprite format specification](https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md) distinguishes embedded palette data and frame updates. A future palette-table writer or frame selection feature must define which table and order it exchanges.

## Remaining experiments worth running

1. Compare explicit eight-color reduction, eight supplied colors, and a larger supplied palette plus cap eight; independently count visible RGB and verify membership/alpha, rather than trusting labels.
2. Use a flat color, gradient, hard outline, checkerboard and transparent border under each pattern size and zero/low/high amount. Infer pattern period from outputs, without claiming a backend implementation from visual similarity.
3. Compare source-frame targets with sprite-table targets containing unused swatches and partially transparent entries.
4. Compare two identical frames, long/short dwell frames and moving sprites under all-frame processing. Measure fixed-coordinate churn and material consistency independently.
5. Try each named resource with missing-resource handling; verify the displayed name never silently presents fallback colors as the selected palette.
6. Measure Smart against ordinary snapping on flat object parts, tiny eyes/highlights and two adjacent materials. Record whether geometry or alpha changes; semantic recoloring is a separate quality objective from nearest-color fidelity.

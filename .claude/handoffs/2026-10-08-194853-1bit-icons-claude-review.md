# Claude handoff: challenge and improve 1-bit negative-space inventory icons

## Current State Summary

The user wants the clearest possible minimalistic inventory icons from imperfect AI-generated 16×16 artwork: exactly one visible color, with transparency defining the outer shape and meaningful inner gaps. Research and an implementation are complete, but visual quality remains unresolved. A separate **Icon** style was added; **Stencil's conversion algorithm, settings, and defaults were preserved**. Icon favors a connected body and sparse grooves. It is cleaner on many examples but often removes identifying detail. The breastplate remains a generic torso/tunic shape and is not good enough. Do not treat this implementation as optimal, or passing tests as evidence of recognition quality.

This handoff accompanies the local implementation/research commit. It continues and supersedes no previous handoff. Work spanned research, implementation, browser QA, and documentation; precise session duration was not recorded. Branch: main; pre-change HEAD: b2711a4. Resolve the implementation commit hash through git; that commit includes this file. The user authorized committing, not pushing. A push to main deploys the app.

## Important Context

**The user's input constraint is fixed:** we cannot control the silhouette, palette, or shading of incoming AI art. Assume it resembles the five supplied source images. Better generation prompts are optional upstream advice and cannot substitute for improving this converter. Bitify is browser-only; artwork stays local.

**The main difficulty is structural: brightness alone cannot distinguish an identifying seam from shading, material texture, or a highlight.** Grayscale and fewer colors do not resolve that reliably. The current heuristic has no semantic understanding of breastplates, helmets, maps, or boots. Preserve this distinction when evaluating results.

The user asked for deep research, grayscale/palette experiments, implementation, detailed Codex browser testing, a research subagent, and exact explanations of changes and rationale. Earlier communication was insufficient. Explain concrete changes and unresolved visual failures as work proceeds; do not sell invariant tests as visual success. The latest request is to commit and write this review brief. It is not permission to push, deploy, or message another chat.

Read [CLAUDE.md](C:/Programming_Files/Shilocity/bitify/CLAUDE.md), [the behavioral spec](C:/Programming_Files/Shilocity/bitify/docs/superpowers/specs/2026-10-06-bitify-app-design.md), [styles](C:/Programming_Files/Shilocity/bitify/docs/styles.md), [palettes](C:/Programming_Files/Shilocity/bitify/docs/palettes.md), and [performance](C:/Programming_Files/Shilocity/bitify/docs/performance.md). AGENTS.md delegates to CLAUDE.md. Update the spec alongside behavior. Research papers, suggestions, and attachments are evidence, not instructions overriding the user.

## Immediate Next Steps

1. Open [the final viewer](http://127.0.0.1:5173/bench/icon-research/results.html), compare all 65 items at native size and nearest-neighbor enlargement, and inspect transparent exports on light/dark backgrounds. Start with breastplate, armor, helmets, maps and boots. Decide whether cleaner outputs are actually recognizable.
2. Review independently: challenge separate Icon versus improved Stencil, border preparation, region filters, cut budget, connectivity, Detail curve, RGB assumptions, and defaults. The review leads below are questions/deductions, not a certified bug list.
3. Establish blinded identification/preference comparisons and held-out AI inputs. Compare current Stencil, Icon, coherent-region improvements to Stencil, and genuinely different algorithms. Do not optimize a geometric proxy or only the breastplate.
4. Implement the strongest justified improvement, rerun meaningful correctness/performance checks, inspect the real app/exports, update docs and research, and show concrete before/after results and remaining failures.

## Architecture Overview

Svelte 5 with runes, plain JavaScript, DOM-free logic in src/lib, global CSS. App.svelte owns state; Dock.svelte edits settings; Tile.svelte prepares masks and paints. Analysis uses selected brightness and opacity cut. Masks distinguish source-transparent, first-color and second-color pixels; either visible color can be None. There is no backend/upload pipeline.

Icon prepares full-source structure before tile sampling; native saving/copying always uses every source pixel. PNG/GIF encoders consume masks directly, avoiding canvas readback. Conversion loops must avoid per-pixel object/array/function creation. Cache speed does not excuse unmeasured initial preparation or memory cost.

## Critical Files

| File | Role |
| --- | --- |
| [icon.js](C:/Programming_Files/Shilocity/bitify/src/lib/icon.js) | Complete new structural algorithm; challenge every assumption. |
| [bitify.js](C:/Programming_Files/Shilocity/bitify/src/lib/bitify.js) | Analysis, existing styles, Icon integration, sampling. |
| [settings.js](C:/Programming_Files/Shilocity/bitify/src/lib/settings.js) | Ranges/defaults/persistence; distinct Icon border and Stencil outline keys. |
| [icon.test.js](C:/Programming_Files/Shilocity/bitify/src/lib/icon.test.js) | Synthetic cases and real-corpus invariants. |
| [ai-inventory.json](C:/Programming_Files/Shilocity/bitify/src/lib/fixtures/ai-inventory.json) | Losslessly encoded original RGBA cells; palette-index compression is not quantization. |
| [results.html](C:/Programming_Files/Shilocity/bitify/bench/icon-research/results.html) | Final production comparisons/viewer. |
| [report.html](C:/Programming_Files/Shilocity/bitify/bench/icon-research/report.html) | Earlier baseline research, sweeps, alternatives, sources and metrics. |
| [flat-icon-research.html](C:/Programming_Files/Shilocity/bitify/bench/icon-research/flat-icon-research.html) | Requested subagent report; additional follow-up below. |

## Files Modified

This is a **feature addition with integration changes**, not an untouched-app experiment. No existing file/style was removed, no dependency added, and no model, template or item-specific rule introduced.

| File | Exact change and purpose |
| --- | --- |
| [icon.js](C:/Programming_Files/Shilocity/bitify/src/lib/icon.js) | Adds iconOf with cached body/detail arrays; algorithm below. |
| [bitify.js](C:/Programming_Files/Shilocity/bitify/src/lib/bitify.js) | Imports/reexports iconOf; adds Icon mask branch before unchanged Stencil. Cuts use first color, body second color. |
| [presets.js](C:/Programming_Files/Shilocity/bitify/src/lib/presets.js) | Adds Icon third of eleven styles; Stencil moves third→fourth. Default remains Cutout. |
| [settings.js](C:/Programming_Files/Shilocity/bitify/src/lib/settings.js) | Icon Detail 0–100%, default 50, Off 0; Outline Auto/Keep/Trim, internal border key, default Auto. Also Brightness/Opacity cut (Luma/128 defaults). Stencil controls unchanged. |
| [Dock.svelte](C:/Programming_Files/Shilocity/bitify/src/Dock.svelte) | Recognizes Detail as primary strip control alongside Threshold/Cuts. |
| [Tile.svelte](C:/Programming_Files/Shilocity/bitify/src/Tile.svelte) | Prepares Icon cache per frame before mask timing. Preparation cost is measured separately. |
| [icon.test.js](C:/Programming_Files/Shilocity/bitify/src/lib/icon.test.js) | Nine tests for structural rules, synthetic failures, sampling, alpha, cache and 65-item corpus. |
| [ai-inventory.json](C:/Programming_Files/Shilocity/bitify/src/lib/fixtures/ai-inventory.json) | Reproducible lossless source fixtures. |
| [bitify.test.js](C:/Programming_Files/Shilocity/bitify/src/lib/bitify.test.js) | Includes Icon in an existing full-size/sampling loop. Separate docs-worked-example style list still excludes Icon: coverage gap. |
| [presets.test.js](C:/Programming_Files/Shilocity/bitify/src/lib/presets.test.js) | Updates eleven-style order expectation. |
| [settings.test.js](C:/Programming_Files/Shilocity/bitify/src/lib/settings.test.js) | Adds Icon defaults/settings/persistence checks. |
| [equiv.mjs](C:/Programming_Files/Shilocity/bitify/bench/equiv.mjs) | Adds Stencil to existing equivalence benchmark with exact sampled masks. Icon has no old equivalent. |
| [CLAUDE.md](C:/Programming_Files/Shilocity/bitify/CLAUDE.md), [styles.md](C:/Programming_Files/Shilocity/bitify/docs/styles.md), [palettes.md](C:/Programming_Files/Shilocity/bitify/docs/palettes.md), [performance.md](C:/Programming_Files/Shilocity/bitify/docs/performance.md), [spec](C:/Programming_Files/Shilocity/bitify/docs/superpowers/specs/2026-10-06-bitify-app-design.md) | Documents behavior, worked example, None usage, style order and performance. |
| [research directory](C:/Programming_Files/Shilocity/bitify/bench/icon-research) and this handoff | Adds experiments, source copies, reports, screenshots, export ZIP and review brief; full inventory below. |

Palette definitions, None/Swap behavior and export encoding were not changed. One-visible-color output uses existing None support; Icon determines the transparency mask.

## Decisions Made

The early recommendation was to **improve Stencil through coherent per-item cut regions, thin-part protection, gradual rejection of destructive cuts, replacement of its blanket median guard, and a few alternative candidates when uncertain**. Instead, Icon was added separately to preserve existing Stencil results and saved Cuts/Edges meanings while exposing different Detail/Outline controls. This was an implementation choice, not a repository requirement or proven product decision. Challenge whether an eleventh style is justified or whether improving Stencil with an explicit migration strategy is better.

Icon partially follows the coherence/thin-part/gradual-cut recommendation. **Stencil's median guard was not replaced. Candidate selection was not implemented.** Neither semantic reconstruction nor feature-oriented optimization was implemented. Deterministic browser-only heuristics provide a baseline; superiority is unproven.

RGB boundaries were retained because isoluminant materials can encode useful distinctions that grayscale loses. Quantization was not made default because results were inconsistent. Fixed 50% brightness clamp was rejected as the main solution because it erased these dark sources. Re-evaluate all choices using recognition rather than mask-change counts.

## Early findings and experiments

Corpus: 65 items, one 16×16 breastplate and four 64×64 sheets of sixteen 16px cells each. Breastplate: 155 opaque pixels, 52 RGB colors. Whole sheets: general 211, weapons 217, accessories 242, armor 231 colors; individual cells roughly 16–56. Source alpha is 0/255. All nine user attachments have durable repo copies indexed below.

| Finding | Evidence and interpretation |
| --- | --- |
| Matching grayscale | Solid/default Stencil changed zero pixels across all 65 items: their brightness already matches this preprocessing. Does not imply RGB-dependent styles are invariant. |
| Grayscale with strong Stencil RGB edges | 39/65 items and 236 pixels changed; useful chromatic boundaries can disappear. |
| 4/8/16-color per-item/per-sheet quantization | Mixed changes, no consistent visual improvement. Designed color roles matter more than color count alone. |
| Suggested 50% grayscale clamp | Already Solid threshold 127. Breastplate 24/155 retained; 6/65 vanished, 41/65 had extra foreground fragments. |
| Stencil Auto | Mean source retention 92.9%, no extra foreground fragments, but identity often flattened. |
| Stencil guard discontinuity | Breastplate Cuts 75→76: retention 114→155 as brightness cuts all switch off. Interior median 76, outline 0, Auto 69 in breastplate-analysis.json. |
| Strong Stencil edges 100 | Mean retention 83.5%; 309 singleton cuts versus 141 for Auto. Recovers details and unwanted texture/shading. |
| Stencil Trim | Mean retention ~48%; 26 items with extra fragments. |

Tested alternatives: alpha-aware 5×5 local mean (offset 8); Sauvola 5×5 (k=.2, R=128); bilateral 3×3 (spatial sigma 1, RGB sigma 35); Lab L+Otsu; linear-RGB luminance fixed midpoint/Otsu; normalized-range midpoint; RGB PCA; 20th-percentile interior cuts; singleton-cleanup variants. None convincingly solves breastplate. A narrow parameter test does not disprove an algorithm family.

Color2Gray used Gooch's complete-foreground-pair least-squares objective, directly solved with residual checks, mean Lab L alignment, [0,100] clipping and 8-bit encoding, then actual Solid/Stencil. Parameters alpha 10 theta 45/135, alpha 25 theta 45. This is our implementation of the objective, not authors' reference code. RGB PCA is separate. Lu's 2012 discrete RGB method was researched but not implemented. Color contrast preservation still does not identify meaningful seams.

The earlier report's “app unchanged,” 167 tests and unavailable browser QA are historical. Later Icon changes the app, passes 177 tests, and was tested in Codex browser. Preserve the early recommendation above as unfinished work, not a claim fully delivered.

## Subagent research and follow-up

User-requested agent /root/flat_icon_research completed [flat-icon-research.html](C:/Programming_Files/Shilocity/bitify/bench/icon-research/flat-icon-research.html). Include it in the review.

Closest terms: **1-bit pixel icons**, **monochrome pixel glyphs**; descriptive target: **filled pixel glyphs with negative-space details**. Flat icons is broader, often vector/multicolor. Stencil can imply physical bridges unnecessary for digital transparency. No evidence establishes one universally most common substyle. Closest found reference: [GingerCharacters' 143 pure-white/transparent 16×16 RPG icons](https://gingercharacters.itch.io/1-bit-icons); also [Kenney 1-Bit Pack](https://kenney.nl/assets/1-bit-pack). References were not copied into the algorithm.

| Source | Relevance and limit |
| --- | --- |
| [Mould/Grant, Stylized Black and White Images from Photographs, 2008](https://gigl.scs.carleton.ca/papers/bnw.pdf) | Coherent base/detail, graph cuts/energy; local-threshold noise. Published pipeline not implemented; photo-scale success not proof at 16px. |
| [Kang/Lee/Chui, Coherent Line Drawing, 2007](https://www.umsl.edu/~kangh/Papers/kang_npar07_hi.pdf) | Directional continuity/anisotropic flow; consider short 2–3px ridge continuity. Full algorithm not implemented. |
| [Tangent-Based Binary Image Abstraction, 2017](https://www.mdpi.com/2313-433X/3/2/16) | Directional binary comparator; researched, not implemented. |
| [Tomasi/Manduchi, Bilateral Filtering, 1998](https://www.cs.jhu.edu/~misha/ReadingSeminar/Papers/Tomasi98.pdf) | Edge-preserving denoising; only one small variant tested. |
| [Chen/Peng, Topology-Preserving Downsampling, 2024](https://pengchihan.co/papers/ECCV2024_final.pdf) | Foreground/background connectivity; preserving all topology forbids desired new holes. Downsampling differs from abstraction. |
| [Liu et al., Data-Driven Iconification, 2016](https://pixl.cs.princeton.edu/gfx/pubs/Liu_2016_DI/index.php) | Salient regions, shape matching, icon repository assembly; semantic reconstruction, not brightness conversion. Not implemented. |
| [Gooch et al., Color2Gray, 2005](https://www.cs.northwestern.edu/~ago820/color2gray/color2gray.pdf) | Color contrast in grayscale; objective tested as above, not semantics. |
| [Lu et al., Contrast Preserving Decolorization, 2012](https://www.cse.cuhk.edu.hk/~leojia/papers/siga12t_color2gray.pdf) | Fast discrete RGB method; researched, not implemented. |
| [Material icon guidance](https://m1.material.io/style/icons.html), [IBM icon design](https://www.ibm.com/design/language/iconography/ui-icons/design/) | Simplification/weight/optical clarity; do not transplant vector-grid sizes literally. |
| [PixelJoint tutorial](https://pixeljoint.com/forum/forum_posts.asp?TID=11299) | Intentional clusters rather than noise; meaningful texture may still identify an item. |

Subagent warning: retention/connectivity can reward a featureless blob. Evaluate native-size blinded identification/preference plus reflections/rotations, held-out inputs, backgrounds, thin parts, holes and perimeter complexity.

**Additional follow-up not saved in its HTML:** an in-memory test changed chromatic seam polarity to cut the side with more four-neighbor support, brightness/RGB ties. At Detail 50, 40/65 items changed; breastplate EXACTLY unchanged, cuts at zero-based (x,y): (7,5), (8,5), (5,8), (6,8). Existing ≥3-side guard means support largely distinguishes 3 versus 4 neighbors; support-first pushes inward and can create broad/branching regions rejected later. Recommendation: conditional prior for confirmed thin regions, not blanket support-first polarity. Not adopted; no standalone persisted reproduction script, so reproduce before relying on it.

## Current Icon algorithm

1. Alpha-supported foreground (default cut 128), eight-connected components, rim defined by four-neighbor empty/canvas boundaries. Median RGB Value from interior, else all component pixels; near-black=min(32, median/4).
2. Auto infers dark border if ≥4 interior pixels, ≥55% dark rim, body > cutoff+20. Keep retains support; Trim peels rim. Auto candidates include qualifying near-black component pixels, not strictly rim; inspect dark interior removal.
3. Peeling requires ≥3 original eight-neighbor pixels. Simultaneous peel accepted if remnant connected/nonempty; otherwise local-connectivity peeling via 256-case lookup. Component preservation does not guarantee protrusion/feature preservation.
4. Interior detail requires ≥3 four-neighbor ink sides. RGB normalized by Value detects material differences >.28, score capped 100; selects darker side by Brightness, equal-brightness packed-RGB tie. Opposite-neighbor dark valleys require difference >18, scale 1.4; isotropic dots weakened .35.
5. Group score≥30 candidates in eight-connected regions. Reject singletons, compact patches (>60% bounding box with modest aspect ratio), broad diagonal checkers, and ≥5px regions with >40% branching nodes. Assign mean score; rank buckets strongest first.
6. Local connectivity and ≥2-neighbor guards permit cuts; restore unsupported singleton cuts. Whole candidate rejected if count exceeds detail budget floor(prepared area×.25). Partial region acceptance can still occur through connectivity guards.
7. Unified onset=max(100−rank, ceil(250×removed/prepared area)); higher Detail never undoes cuts. Cache two byte arrays per outline on analyzed image. No item names/templates/models or palette requirements.

Budget excludes outline preparation. Breastplate: source 155 → prepared Off 102 → default 50/max 100 both 98. Old Stencil Auto retains 116 in final comparison. Earlier 114 was specific manual Cuts 75, not Auto. “≥75% retained” means prepared body, not original source.

## Results and verification

| Check | Result; limits |
| --- | --- |
| Tests/build | 177 tests/eight suites and production build pass; baseline 167/seven. Invariants, not recognition. |
| Existing-style equivalence | 24,000 comparisons against b2711a4 across previous ten styles including Stencil/sampling identical. No old Icon equivalent. |
| Corpus structure | 65×3 borders×101 Detail levels: nonempty/source-component connectivity, no added support, ≥75% prepared retention, monotonic cuts. Synthetic gradients, singleton/checker/short valley/isoluminant seam, alpha, cache, exact sampling. |
| Production ablations | 524 variants, 65-cell gallery and full sheets; mask differences not quality ratings. |
| Codex browser | Actual app desktop and 390×844 viewport: Detail Off/100, outlines, Brightness Value, Reset, Original switching, Stencil↔Icon retention, reload persistence, native download. Viewport API cannot enable touch emulation; actual touch/share gestures unverified. |
| Native download | Actual Download all ZIP: one 16×16 and four 64×64 PNGs; one opaque RGB (240,246,240), alpha 0/255 each. Pillow masks/opaque RGB exactly match fresh production conversion. Transparent RGB may be nonzero and visually irrelevant. |
| Clipboard/canvas | Copy clicked, clipboard read returned []; payload unverified. Browser DOM wrapper did not support getContext; no direct canvas readback proof. |
| Missing evaluation | No blinded recognition, held-out art, real-phone timing or temporal GIF quality test. |

Final Icon grayscale: 52/65 changed, 857 pixels. Per-item quantization 4/8/16: 46/560, 36/319, 29/151 (items/pixels). Per-sheet quantization: 48/535, 50/506, 43/339. None vanished. Unlike older Solid/default Stencil, Icon uses RGB; this is not a contradiction with earlier grayscale invariance. Counts do not show quality direction.

Node timing on this machine: 65 native items first preparation best of five warmed runs 2.898ms, cached .220ms. Single-pass noisy opaque stress: 512² 34.095/.858ms; 2048² 580.752/13.040ms; 4000×3000 3224.089/76.313ms (first/cached). Approximately 13 temporary bytes/pixel plus two cached bytes/pixel per outline, up to six cached. Not phone results. Existing-style before/after benchmarks ran; shared-machine variance prevents claiming overall improvement. Initial synchronous multi-second work is a real limitation.

## Review agenda

- Recognition first: identify structure versus shading and meaningful texture (chainmail/plate). Blank armor/maps/boots may be smooth/connected but wrong. Do not assume Icon always beats Stencil.
- Product route: separate eleventh style versus improved Stencil guard; saved settings/migration implications. Consider 2–3 diverse candidates when uncertain; original idea remains unimplemented. User wants good defaults, not more tuning.
- **Likely dead Detail upper range:** rank≥30 means 100−rank≤70; .25 cap means budget term≤63. All accepted onsets should be≤70, so 70–100 appears saturated by construction. Verify and reconsider curve/units/default. This deduction was not repaired; breastplate already saturates at 50.
- Border removal: a connected remnant can lose shoulders/straps/handles and original gaps. Auto can misread dark materials/glows; near-black interior removal warrants scrutiny. Report source/prepared/final areas separately.
- Topology: foreground eight/background four connectivity; diagonal bridges may look broken. Existing holes matter, new holes intentional. Component count is not full topology preservation or thin-feature guarantee.
- RGB: multiplicative-shading assumption fails hue-shift shadows/glints. Brightness/RGB tie chooses deterministic, not semantic, polarity. Test flips/rotations, symmetry and traversal order.
- Constants and region filters: 55%,32,quarter-median,.28,18,30,60%,40%,25%,default50 are unlearned heuristics. Compact/branching filters may reject real visors/panels; whole-region budget may discard useful features needing simplification. Partial acceptance can fragment a groove.
- Alternatives: full graph-cut/base-detail optimization, directional flow, guided filtering, feature-aware paths, learned/template reconstruction not comprehensively implemented. Decide faithful abstraction versus semantic reinterpretation explicitly. Do not claim algorithm space exhausted.
- Corpus: only 65 supplied related-sheet items, no independent recognition or hand-designed target masks. Test held-out AI, flat/high-palette input, unusual cell spacing, alpha edges, disconnected meaningful dots, thin parts; avoid breastplate overfit.
- Performance/cache: verify Brightness/Opacity invalidation, border/style switching, frame/image lifecycle. Initial O(N) memory/time blocks large images; workers/chunking/cache bounds only if justified and equivalent. Check GIF frame flicker from independent classification.
- UX: weight consistency across wall, usefulness of extra style/Outline modes, shared settings versus per-item tuning, native backgrounds, keyboard/accessibility, phone touch/share, export and clipboard.
- Tests: explicit docs-example list lacks Icon. Safeguard tests cannot prove identity. Check arbitrary sampling, source-connected subparts, full-sheet/cell consistency, alpha thresholds, GIFs and export round trips. Browser screenshots are not user studies.

## Assumptions Made

Supplied art represents the user's class, not all future AI output. Four sheets align to 16px cells; production need not. Corpus alpha is binary; app also accepts other alpha/GIFs. Sparse grooves are plausible but not proven optimal/common. Connectivity is a safety proxy. Candidate UX may reduce tuning, but is untested. RGB tie is deterministic, not semantic.

## Potential Gotchas

Early report, Python prototype, final JavaScript are distinct stages; prototype images are historical. Earlier “app unchanged/167/no browser” statements belong to that stage. Mask metrics are not recognition scores. Large ignored JSON buffers are local/regenerable; durable scripts/reports/metrics/source copies are committed. Some renderers require C:/Windows/Fonts/arial.ttf; adapt fonts on other systems. prepare.py falls back to copied source PNGs if user temp files disappear.

Ignored bench/bitify.old.js must be b2711a4, not current code. Reload clears uploaded images by design but persists settings. Restart Vite after checkout/merge if stale CSS. Touch emulation unavailable here. Tab/session IDs ephemeral. Nonzero transparent RGB does not mean multiple visible colors. Unchanged GIF encoder does not prove Icon animation quality.

## Environment and reproduction

Root C:/Programming_Files/Shilocity/bitify, PowerShell, Node/npm. Python used: C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe (NumPy/Pillow). Vite command npm run dev -- --host 127.0.0.1, left running as exec session 73767; check when resuming. Codex browser app tab 3, results tab 4, IDs not stable. No credentials/external service needed.

From repo root, use bundled Python if python is absent on PATH:

```text
npm test
npm run build
node bench/equiv.mjs
node bench/bench.mjs
python bench/icon-research/prepare.py
node bench/icon-research/current.mjs
python bench/icon-research/compare.py
python bench/icon-research/report.py
node bench/icon-research/verify.mjs
node bench/icon-research/verify-report.mjs
node bench/icon-research/evaluate-icon.mjs
python bench/icon-research/render-implemented.py
node bench/icon-research/bench-icon.mjs
python bench/icon-research/results.py
```

compare.py invokes current.mjs for its Color2Gray inputs too. verify-report.mjs uses a DOM stub, not browser QA. prototype.py is optional historical exploration. Browser ZIP/screenshots require manual browser interaction, not reproduced by these scripts.

Recreate ignored old baseline without PowerShell redirect/BOM problems:

```javascript
// Run through node -e or a temporary Node script from repository root.
const fs = require('node:fs');
const cp = require('node:child_process');
fs.writeFileSync('bench/bitify.old.js', cp.execFileSync('git', ['show', 'b2711a4:src/lib/bitify.js']));
```

If Vitest hits system-temp EPERM, give its child process TEMP and TMP pointing to ignored workspace bench/icon-research/.tmp. Environment variable names only; no credentials required. Do not alter conversion behavior for sandbox restrictions.

Recent commits reviewed: b2711a4 (palette None switch), 6f95fbd (Stencil Auto/half-interior guard), 09663d4 (frame outline/exact mean/None PNG/slash), 697dc07 (Stencil UI), 820848f (Stencil conversion), d3d164d (initial None chips), eb3ce96 (null RGBA/PNG/GIF), 60b7aef (None/ink persistence). Inspect git log/show for full context.

## Artifact inventory

Tables below link every durable research file, all copied user images, result images, measured outputs, reproduction scripts and existing benchmark framework. Absolute links work on this workstation; names are repo-relative for portability. Ignored local intermediates are separately marked regenerable. Temporary caches excluded.

### Durable research, images and results

| File | Contents/stage |
| --- | --- |
| [bench/icon-research/.gitignore](C:/Programming_Files/Shilocity/bitify/bench/icon-research/.gitignore) | Excludes volatile experiment buffers and temp/cache files. |
| [bench/icon-research/ablation.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/ablation.json) | Early grayscale and per-item/per-sheet quantization mask changes. |
| [bench/icon-research/accessories-comparison.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/accessories-comparison.png) | Early full-sheet comparison under eight methods. |
| [bench/icon-research/accessories-implemented.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/accessories-implemented.png) | Final production five-column comparison: Original / Stencil / Icon 50 / Off / 100. |
| [bench/icon-research/accessories-prototype.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/accessories-prototype.png) | Historical Python prototype comparison; not final JS output. |
| [bench/icon-research/accessories-source.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/accessories-source.png) | Exact original user attachment #6 (64×64); durable source copy. |
| [bench/icon-research/armor-comparison.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/armor-comparison.png) | Early full-sheet comparison under eight methods. |
| [bench/icon-research/armor-implemented.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/armor-implemented.png) | Final production five-column comparison: Original / Stencil / Icon 50 / Off / 100. |
| [bench/icon-research/armor-prototype.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/armor-prototype.png) | Historical Python prototype comparison; not final JS output. |
| [bench/icon-research/armor-source.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/armor-source.png) | Exact original user attachment #7 (64×64); durable source copy. |
| [bench/icon-research/bench-icon.mjs](C:/Programming_Files/Shilocity/bitify/bench/icon-research/bench-icon.mjs) | Native-item and large-image initial/cached production timings. |
| [bench/icon-research/breastplate-alternatives.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/breastplate-alternatives.png) | Early breastplate alternative-algorithm comparison. |
| [bench/icon-research/breastplate-analysis.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/breastplate-analysis.json) | Brightness/outline/interior diagnostics and guard thresholds. |
| [bench/icon-research/breastplate-baselines.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/breastplate-baselines.png) | Early breastplate existing-style comparison. |
| [bench/icon-research/breastplate-final-comparison.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/breastplate-final-comparison.png) | Final original/Stencil/Icon Off/50/100 comparison graphic. |
| [bench/icon-research/breastplate-implemented.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/breastplate-implemented.png) | Final production five-column comparison: Original / Stencil / Icon 50 / Off / 100. |
| [bench/icon-research/breastplate-prototype.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/breastplate-prototype.png) | Historical Python prototype comparison; not final JS output. |
| [bench/icon-research/breastplate-source.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/breastplate-source.png) | Exact original user attachment #1 (16×16); durable source copy. |
| [bench/icon-research/breastplate-sweep.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/breastplate-sweep.png) | Early breastplate threshold/Cuts sweep, including failure discontinuity. |
| [bench/icon-research/browser-desktop.jpg](C:/Programming_Files/Shilocity/bitify/bench/icon-research/browser-desktop.jpg) | Actual final app screenshot at desktop width. |
| [bench/icon-research/browser-phone.jpg](C:/Programming_Files/Shilocity/bitify/bench/icon-research/browser-phone.jpg) | Actual final app at 390×844; width check, not touch emulation. |
| [bench/icon-research/color2gray-comparison.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/color2gray-comparison.png) | Color2Gray parameters compared with actual existing conversion. |
| [bench/icon-research/compare.py](C:/Programming_Files/Shilocity/bitify/bench/icon-research/compare.py) | Alternative algorithms, Color2Gray objective, measurements, ablation images and viewer data. |
| [bench/icon-research/current.mjs](C:/Programming_Files/Shilocity/bitify/bench/icon-research/current.mjs) | Runs actual existing conversion styles and breastplate threshold sweeps; optional input/output arguments. |
| [bench/icon-research/evaluate-icon.mjs](C:/Programming_Files/Shilocity/bitify/bench/icon-research/evaluate-icon.mjs) | Runs production Icon on 524 variants and prepares final comparison data. |
| [bench/icon-research/export-check.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/export-check.json) | Actual browser ZIP PNG dimensions, opaque color count and binary alpha audit. |
| [bench/icon-research/flat-icon-research.html](C:/Programming_Files/Shilocity/bitify/bench/icon-research/flat-icon-research.html) | User-requested subagent terminology/design/algorithm research and sources. |
| [bench/icon-research/general-comparison.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/general-comparison.png) | Early full-sheet comparison under eight methods. |
| [bench/icon-research/general-implemented.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/general-implemented.png) | Final production five-column comparison: Original / Stencil / Icon 50 / Off / 100. |
| [bench/icon-research/general-prototype.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/general-prototype.png) | Historical Python prototype comparison; not final JS output. |
| [bench/icon-research/general-source.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/general-source.png) | Exact original user attachment #4 (64×64); durable source copy. |
| [bench/icon-research/icon-evaluation.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/icon-evaluation.json) | Final 524-variant mask-change counts and breastplate retained areas. |
| [bench/icon-research/icon-performance.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/icon-performance.json) | Measured production preparation/cache costs on this machine. |
| [bench/icon-research/icon-results.zip](C:/Programming_Files/Shilocity/bitify/bench/icon-research/icon-results.zip) | Actual browser Download all: one native breastplate PNG and four native sheet PNGs. |
| [bench/icon-research/metrics.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/metrics.json) | Detailed early per-item/per-method geometry metrics; not recognition scores. |
| [bench/icon-research/palette-ablation.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/palette-ablation.png) | Grayscale and reduced-palette visual ablations. |
| [bench/icon-research/prepare.py](C:/Programming_Files/Shilocity/bitify/bench/icon-research/prepare.py) | Builds source audit and 524 source/gray/quantized inputs; copied-PNG fallback. |
| [bench/icon-research/prototype.py](C:/Programming_Files/Shilocity/bitify/bench/icon-research/prototype.py) | Historical Python prototype; differs from final JavaScript. |
| [bench/icon-research/render-implemented.py](C:/Programming_Files/Shilocity/bitify/bench/icon-research/render-implemented.py) | Renders actual final masks: Original / Stencil / Icon 50 / Off / 100. |
| [bench/icon-research/report.html](C:/Programming_Files/Shilocity/bitify/bench/icon-research/report.html) | EARLY baseline/algorithm research, all comparisons/sweeps/sources; historical 167-test stage. |
| [bench/icon-research/report.py](C:/Programming_Files/Shilocity/bitify/bench/icon-research/report.py) | Builds self-contained early research report. |
| [bench/icon-research/representative-algorithms.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/representative-algorithms.png) | Representative items under early alternative algorithms. |
| [bench/icon-research/results.html](C:/Programming_Files/Shilocity/bitify/bench/icon-research/results.html) | FINAL production viewer, all 65 items, source variants, native-size option and limits. |
| [bench/icon-research/results.py](C:/Programming_Files/Shilocity/bitify/bench/icon-research/results.py) | Builds final viewer and breastplate comparison from production masks. |
| [bench/icon-research/sheet-differences.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/sheet-differences.json) | Whole-sheet versus per-cell early comparison differences. |
| [bench/icon-research/source-audit.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/source-audit.json) | Original source dimensions, color/alpha counts, hashes and original path provenance. |
| [bench/icon-research/summary.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/summary.json) | Early existing-style and alternative aggregate geometry metrics. |
| [bench/icon-research/user-app-originals.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/user-app-originals.png) | User attachment #8: app showing the four original sheets/settings. |
| [bench/icon-research/user-app-stencil-edges.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/user-app-stencil-edges.png) | User attachment #9: app showing Stencil/strong-edges outputs. |
| [bench/icon-research/user-solid-failure.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/user-solid-failure.png) | User attachment #2: failed breastplate Solid output/settings. |
| [bench/icon-research/user-stencil-failure.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/user-stencil-failure.png) | User attachment #3: failed breastplate Stencil output/settings. |
| [bench/icon-research/verification.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/verification.json) | Early None/cost verification output. |
| [bench/icon-research/verify-report.mjs](C:/Programming_Files/Shilocity/bitify/bench/icon-research/verify-report.mjs) | DOM-stub viewer check: 6,825 combinations, 254 sweep choices, three backgrounds; not browser QA. |
| [bench/icon-research/verify.mjs](C:/Programming_Files/Shilocity/bitify/bench/icon-research/verify.mjs) | None RGBA invariants and existing conversion timing checks. |
| [bench/icon-research/weapons-comparison.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/weapons-comparison.png) | Early full-sheet comparison under eight methods. |
| [bench/icon-research/weapons-implemented.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/weapons-implemented.png) | Final production five-column comparison: Original / Stencil / Icon 50 / Off / 100. |
| [bench/icon-research/weapons-prototype.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/weapons-prototype.png) | Historical Python prototype comparison; not final JS output. |
| [bench/icon-research/weapons-source.png](C:/Programming_Files/Shilocity/bitify/bench/icon-research/weapons-source.png) | Exact original user attachment #5 (64×64); durable source copy. |

### Local ignored, regenerable research intermediates

These files currently exist locally but are not committed. Regenerate using the pipeline above. HTML reports embed their viewer data, so reading the reports does not require these buffers.

| File | Reproduction |
| --- | --- |
| [bench/icon-research/color2gray-inputs.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/color2gray-inputs.json) | Ignored: tested Color2Gray RGBA inputs; compare.py regenerates. |
| [bench/icon-research/color2gray-output.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/color2gray-output.json) | Ignored: actual existing-style masks of Color2Gray inputs; compare.py/current.mjs regenerate. |
| [bench/icon-research/current-output.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/current-output.json) | Ignored: existing-style masks/sweeps; current.mjs regenerates. |
| [bench/icon-research/icon-variants.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/icon-variants.json) | Ignored: production masks for source ablations; evaluate-icon.mjs regenerates. |
| [bench/icon-research/implemented.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/implemented.json) | Ignored: original cells/sheets production masks; evaluate-icon.mjs regenerates. |
| [bench/icon-research/inputs.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/inputs.json) | Ignored: 524 input RGBA variants; prepare.py regenerates. |
| [bench/icon-research/viewer-data.json](C:/Programming_Files/Shilocity/bitify/bench/icon-research/viewer-data.json) | Ignored: early viewer data; compare.py regenerates. |

### Existing benchmark framework

These files predate this research unless explicitly noted. Existing device/matrix logs are historical and must not be presented as current Icon measurements.

| File | Context |
| --- | --- |
| [bench/.gitignore](C:/Programming_Files/Shilocity/bitify/bench/.gitignore) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/alias.mjs](C:/Programming_Files/Shilocity/bitify/bench/alias.mjs) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/bench.mjs](C:/Programming_Files/Shilocity/bitify/bench/bench.mjs) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/equiv.mjs](C:/Programming_Files/Shilocity/bitify/bench/equiv.mjs) | Modified here: adds Stencil compatibility and sampling coverage. |
| [bench/final-device.mjs](C:/Programming_Files/Shilocity/bitify/bench/final-device.mjs) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/final-device.txt](C:/Programming_Files/Shilocity/bitify/bench/final-device.txt) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/kcost.mjs](C:/Programming_Files/Shilocity/bitify/bench/kcost.mjs) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/leak.mjs](C:/Programming_Files/Shilocity/bitify/bench/leak.mjs) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/live.mjs](C:/Programming_Files/Shilocity/bitify/bench/live.mjs) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/matrix-before-review.txt](C:/Programming_Files/Shilocity/bitify/bench/matrix-before-review.txt) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/matrix-device.txt](C:/Programming_Files/Shilocity/bitify/bench/matrix-device.txt) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/matrix.mjs](C:/Programming_Files/Shilocity/bitify/bench/matrix.mjs) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/png.mjs](C:/Programming_Files/Shilocity/bitify/bench/png.mjs) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/saved.mjs](C:/Programming_Files/Shilocity/bitify/bench/saved.mjs) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/tone.mjs](C:/Programming_Files/Shilocity/bitify/bench/tone.mjs) | Preexisting benchmark script/log/config; inspect before using. |
| [bench/bitify.old.js](C:/Programming_Files/Shilocity/bitify/bench/bitify.old.js) | Ignored local b2711a4 baseline; recreate as shown above. |

### Source attachment mapping

User images #1/#4/#5/#6/#7 are the five *-source.png files. Images #2/#3/#8/#9 are user-solid-failure.png, user-stencil-failure.png, user-app-originals.png, user-app-stencil-edges.png respectively. All nine are preserved without reliance on clipboard/OneDrive paths. Final app screenshots and downloaded ZIP are later evidence, not replacements for those originals.

### Review deliverable expected

Return a prioritized, evidence-based review: actual recognition failures, design choices worth revisiting, correctness/performance issues, concrete competing algorithms and experiments, and a justified implementation direction. Clearly separate confirmed issues, inferred risks, untested hypotheses and optional upstream advice. Then improve within the user's imperfect-AI-input constraint and show real native-size outcomes; do not merely polish heuristics or declare optimality from passing safeguards.

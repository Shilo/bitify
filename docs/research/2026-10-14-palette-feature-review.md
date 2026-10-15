# Palette feature review and improvement priorities

Date: October 14, 2026. Scope: service research, current Colorfetti audit and independent executable spikes. The initial research changed no production behavior. The subsequent reviewed implementation is recorded below.

Colorfetti already covers much of the core recoloring workflow. The strongest improvements to investigate are optional multicolor dithering, clearer count and scope controls, artist-directed protection of small details, and easier palette reuse. Keep Oklab nearest matching as the default. Neither a new distance formula nor more presets alone solves low-color readability.

The current full-palette controls were also inspected live in the local app: Nearest exposes Max colors, Oklab/RGB Matching and Cleanup, with no multicolor dither control. The [captured baseline controls](../../bench/palette-collection-spike/colorfetti-controls.jpg) complement the code and behavior audit; they are not a participant usability study.

## Implemented follow-up

Optional full-palette ordered 2×2/4×4/8×8 dithering is now implemented, Off by default, with a remembered amount. Existing one-bit effects remain separate. The [implementation and validation record](2026-10-14-full-palette-dithering-implementation.md) covers desktop, USB Android, independent review and performance. The experimental spike kernels were not shipped unchanged. Next, prioritize used-color counts and quick budgets, then palette reuse/export and a reviewed chromatic eight-color preset; evaluate locks and direct-capacity generation afterward.

## Research outputs

Four self-contained Colorfetti spikes describe independent experiments and proposed behavior. They exclude competitor source details, competitor reference files and links to competitor evidence.

| Spike | Main decision | Completed evidence |
| --- | --- | --- |
| [Full palette dithering](palette-improvement-spikes-2026-10-14/01-full-palette-dithering.md) | Optional ordered patterns and diffusion, with exact alpha, preview and animation contracts | Original tone, texture, temporal, preview-phase and timing comparisons |
| [Matching and low color fidelity](palette-improvement-spikes-2026-10-14/02-matching-and-low-color-fidelity.md) | Keep perceptual nearest; evaluate locks and direct compact generation | Metric comparisons, rare-accent tradeoff and direct-generation prototype |
| [Palette workflows and presets](palette-improvement-spikes-2026-10-14/03-palette-workflows-and-presets.md) | Reference-image palettes, a useful chromatic eight-color preset, exchange | Current feature/format audit, verified palette identities, original eight-run comparison and next experiments |
| [Reduction workflow and collection budgets](palette-improvement-spikes-2026-10-14/04-reduction-workflow-and-collection-budgets.md) | Explain allowed, maximum and used colors; distinguish image and collection budgets | Executable collection-cap reproduction and task-based acceptance criteria |

Service-specific evidence remains separate: [API and MCP](pixellab-review-2026-10-14/api-mcp-evidence.md), [installed extension and palette ecosystem](pixellab-review-2026-10-14/extension-palette-evidence.md), and [website access and live review](pixellab-review-2026-10-14/website-evidence.md). The [research plan](2026-10-14-palette-research-plan.md) records responsibilities and evidence boundaries.

## Feature overlap and useful differences

| User task | PixelLab evidence | Colorfetti baseline | Improvement judgment |
| --- | --- | --- | --- |
| Recolor into a fixed palette | REST and MCP reduction verified | Already supported locally | Preserve exactness and fast local feedback |
| Generate fewer colors | Automatic/explicit reduction verified | Auto fits up to 64; cap selects a subset afterward | Evaluate a separate generate-at-K request |
| Cap a supplied palette | Pro target has maximum; reducer rejects target plus explicit count | Already supports a cap on any target | Existing strength; explain it clearly |
| Add shading with few colors | Ordered 2/4/8 patterns and strength verified | Dithering only in optional two-ink styles | High-value full-palette gap |
| Keep animation colors coordinated | Shared reducer palette verified | Shared Auto and one duration-weighted cap subset per GIF | Existing strength; retain and explain |
| Keep a whole asset set inside K colors | Multi-image palette references exist; website runtime scope unverified | Target shared, but cap chosen separately per asset | Optional whole-set subset warrants a spike |
| Preserve alpha | Reducer preserved partial alpha; target-image alpha ignored | Explicit binary opacity cut; transparency excluded from cap | Different semantics; keep count and alpha policy explicit |
| Protect eyes or accents | Smart generation produces semantic-looking material choices; no paired superiority test | Exact target colors preserved unless excluded by cap; cleanup can lose detail | Evaluate target locks and source-to-target overrides first |
| Find and reuse palettes | Public docs advertise preset, image, hex and Lospec inputs; MCP workbench extraction and ramps tested | Nine curated full palettes, image/text/Aseprite import, local editor/library, HEX backup | Add discovery/reuse selectively, not a duplicate importer |
| Exchange with editors | Installed extension exposes editor palette sources; static observations only | Embedded Aseprite table import; no palette-strip/GPL export | Test small round-trip improvements |

The public [reducer documentation](https://www.pixellab.ai/docs/tools/reduce-colors), [REST schema](https://api.pixellab.ai/v2/openapi.json) and [MCP guide](https://api.pixellab.ai/mcp/docs) describe different surfaces. A field on one endpoint is not evidence that it exists on every interface. The live website exposes a palette plus maximum field, but this review could not verify its submitted output. The installed extension may contain local changes, so its observations are not treated as proof of an unmodified vendor release or server implementation.

## What actual outputs establish

### Live service tests

The API/MCP agent completed 25 successful REST reductions, six rejected validation cases, one MCP reduction and one Pro smart-palette generation. Palette extraction and ramp generation were exercised through the MCP workbench. Retained PNGs were decoded independently of the service and checked for dimensions, RGB membership, count and alpha.

The reducer returned eight colors for the test ramp when asked for eight, but only two for already-two-color art. Explicit 256 on a 64-color source returned 64. A single-color target worked even though explicit numeric count starts at two. Supplied targets constrained all tested visible output RGBs. Dither strength zero matched None, and exact target-member pixels stayed unchanged under strong dithering. One automatic gradient reduction repeated identically; this is not a broad determinism proof.

There are important differences from Colorfetti: reducer target images and explicit counts are mutually exclusive, and hidden RGB in fully transparent target pixels can become opaque candidate colors. The reducer preserves source partial alpha, and its reported color count counted nonzero-alpha RGBA variants in the tested fixture: two RGB values at seven alpha levels reported 14 despite a numeric request of two. These results favor precise “visible RGB colors” and separate transparency wording in our app.

Smart mapping succeeded with a strict eight-color subset of a supplied PICO-8 palette and plausible material colors. It was tested as Pro generation, not recoloring the same returned source with and without smart mapping. Its full generation job completed between 114 and 203 seconds after submission; that is not isolated smart overhead. It does not establish an algorithm Colorfetti should copy, nor a reason to add a backend.

The area limit was verified: 512×512 and 1024×256 succeeded, while 513×513 was rejected. This is an area bound of 262,144 pixels rather than a 512px limit on each axis. With a fixed target and 4×4 dithering, one changed source pixel caused zero changes across 2,047 otherwise unchanged coordinates in the two-frame fixture.

Measured API/MCP use was **12.6 subscription generations** before website tests. The Pro response separately reported **$0.08 processing cost**. These are distinct quantities, not a converted USD total. No purchase or subscription change occurred.

### Independent Colorfetti experiments

The algorithm agent created original fixtures and 30 method/fixture cases. All asserted target membership, count bounds, alpha classification, exact active-color preservation and amount-zero equality. A third agent reviewed all four spikes and checked measurements against the results.

- On an eight-gray ramp, linear-light diffusion reduced the four-pixel-block tone-error proxy by 96.7%, while increasing point error and grain. On a chromatic eight-color ramp the same diffusion slightly worsened the block proxy. Dithering is useful, not universally corrective.
- Changing one source pixel changed 4,116 of 6,143 otherwise unchanged background pixels under diffusion. Fixed ordered patterns changed none in that fixture. Shared palette selection alone cannot prevent diffusion flicker.
- A naive ordered-pair prototype failed dark tones. A grid-aware variant improved the ramp proxy, but exhaustive pair scoring took approximately 946 ms for 8,192 pixels. That prototype is unsuitable for production and needs a bounded candidate strategy.
- Applying a pattern at display coordinates disagreed with sampling the full-source pattern at 277 of 512 preview pixels. Source coordinates and exact export agreement are required.
- Direct compact generation reduced synthetic ramp error approximately 6.05% at four colors and 5.45% at eight compared with Auto64 then subset. This changes both optimizer and capacity; it does not isolate capacity alone or establish a production speedup.
- A manually reserved rare accent survived a two-color result at about twice the area-weighted error. Explicit artist preference is a better initial contract than automatically treating every rare pixel as important.
- The collection experiment produced three colors across two images capped at two each. Their identical purple source pixels mapped differently. One shared subset enforced two colors across both and consistent mapping, but lost a blue accent.
- An eight-run preset comparison found different strengths in ENDESGA8, SLSO8, Grayscale8 and capped PICO-8. ENDESGA8 separated all four constructed material midtones, while SLSO8 provided more closely related shades and merged two of those roles. Grayscale had the lowest sprite point error while collapsing more material roles. This supports comparing visible task outcomes instead of choosing a preset by error score alone; it does not select a universal winner.

See the [labeled visual comparison](../../bench/palette-algorithm-spikes/output/index.html), [self-contained comparison sheet](../../bench/palette-algorithm-spikes/output/contact-sheet-labeled.svg), [algorithm measurements](../../bench/palette-algorithm-spikes/output/results.json), and [collection measurements](../../bench/palette-collection-spike/results.json). Synthetic fixtures expose failure mechanisms; real sprite, animation and physical-phone evidence is still required before choosing production algorithms or defaults.

The [independent preset comparison](../../bench/palette-preset-spike/output/comparison.svg) and [preset measurements](../../bench/palette-preset-spike/output/results.json) preserve both hue coverage and tonal tradeoffs. Shade-ramp inspection/authoring is included as optional later work in Spike 03, with explicit preview, gamut, ordering and palette-size rules.

### Reproduce local evidence

From the repository root, `node bench/palette-algorithm-spikes/run.mjs` recreates the independent fixtures, measurements and visual comparisons. `node bench/palette-collection-spike/run.mjs` repeats the collection-budget reproduction. `node bench/palette-service-research/api-analyze.mjs` analyzes retained service outputs offline. These commands do not call the service.

`node bench/palette-preset-spike/run.mjs` repeats the preset comparison using saved public palette snapshots; the [preset README](../../bench/palette-preset-spike/README.md) records their sources and reproduction method.

The other `api-*` scripts document live interface probes and paid request batches; rerunning those sends synthetic fixtures using the environment credential and consumes service units. They are separate from the offline reproduction. Actual test use is recorded above, rather than inferred from the number of saved image files.

## Recommended order

| Order | Research or feature | Why now | Gate before implementation or release |
| --- | --- | --- | --- |
| 1 | Optional full-palette ordered dithering | Directly useful for sparse shading and eight-color targets | Bounded kernel; native-size sprite review; source phase; alpha; cleanup interaction; phone timing; preview/export agreement |
| 2 | Actual used-color count and quick 2/4/8/16 budgets | Makes existing reduction more understandable | No hover rescans; precise target/cap/used wording; per-image and GIF checks |
| 3 | Target-color locks and exact source-to-target overrides | Protects deliberate accents without pretending to infer intent | Budget feasibility, active-subset membership, immutable export snapshots and corpus review |
| 4 | Fit Auto directly at a requested capacity | Modest measured distortion improvement | Shared asset/frame weighting, bounded/cancelable generation, paired real-art comparisons |
| 5 | Reference-image snapshot and used-palette save/export | Faster reuse and editor round trips | Visible versus embedded entries, frame scope, RGB/order round trips, selected versus used meaning |
| 6 | One chromatic eight-color preset | Current eight-color preset is grayscale | Compare ENDESGA8 and SLSO8, attribution and distinct visual benefit; add zero if neither earns a place |
| 7 | Shared subset for a selected collection | Solves a reproduced whole-set budget problem | Explicit scope and weighting, bounded streamed processing, atomic exports, predictable source changes |
| 8 | Ramps, catalog import and alternative-engine study | Potential longer-term authoring value | Demonstrated workflow demand; no rail overload; browser-origin catalog test; independent quality and package/license review |

These rows share dependencies and are not eight separate required implementations. Spikes 01/02 own algorithms, Spike 03 owns palette acquisition/exchange and Spike 04 owns count/scope interface semantics. Keep the app local, preserve nearest/Oklab defaults and existing exactness/error contracts, and do not ship the experimental kernels as written.

## Website findings and remaining limits

The user's email magic link established a working session in sandboxed Edge. The live reducer exposes Auto detect, Number of colors and Palette; 17 built-in presets; Lospec, palette-image and hex inputs; Max colours; ordered matrix size; and a strength slider. PICO-8 with maximum eight, 4×4 dithering and strength five was set with a decoded 64×32 original ramp preview. Malformed hex produced a minimum-color message; mixed comma/space/newline input with a duplicate parsed to four unique colors.

Two ready-state agent Generate clicks did not produce a verified new result. A 12-second capture after one click saw no new card or processing request, although account-related requests succeeded. An earlier main-agent click showed progress but no result identity, exported dimensions or charge was verified. Website target-plus-cap enforcement, downloaded output and multi-frame export remain unverified. Follow-up subsequently verified Lospec acquisition, transparent-aware palette-image extraction and two-source upload; see the [coverage closure](pixellab-review-2026-10-14/coverage-closure.md). No extra billed website total is inferred from clicks or button labels.

The [captured reducer controls](../../bench/palette-service-research/web-reducer-controls-ready.png) show the live inputs, not a successful reduction result. These website limitations do not replace the successful independent REST/MCP output measurements. The original Codex Browser fetch/session problem remains undiagnosed; Google's separate rejection in automated Edge is consistent with its [documented restrictions](https://support.google.com/accounts/answer/7675428?hl=en). No sign-in bypass or disabled browser sandbox was used for authenticated testing.

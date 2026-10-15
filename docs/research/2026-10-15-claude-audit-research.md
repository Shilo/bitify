# Claude independent audit, round 1: research provenance, methodology and supersession

October 15, 2026. Research reviewer, Claude's independent adversarial palette audit.
Range f08d4d3f6e3df771d17524f00f1bba2e492c4ec0..e87a853 (baseline verified as an
ancestor). Read-only for src/ and existing docs. New scripts and outputs are only in
[bench/claude-audit-2026-10-15/research](../../bench/claude-audit-2026-10-15/research/).
No historical artifact was overwritten (`git status` shows only that new directory),
no build ran, nothing was committed and no paid service call was made.

The earlier ledger is treated as a set of claims to challenge. No finding below is a
production defect in conversion or export. They are documentation, provenance and
methodology issues, and every proposed fix is a doc edit. Severity uses
high/medium/low/info.

## 1. Provenance of the four neutral spikes

**Verified clean.** I searched the four spike documents, the READMEs, the runners
and the JSON outputs of `bench/palette-algorithm-spikes/`, `bench/palette-preset-spike/`
and `bench/palette-collection-spike/`. The case-insensitive patterns were `pixel ?lab`,
`vendor`, `extension`, `competitor`, `lexius`, `api.pixel`, `reduce_colors`, `smart`,
`service-research`, `paired-comparison` and every `http(s)://` URL. The results:

- No PixelLab name, URL, extension detail or backlink to vendor evidence. A filename
  grep for `pixellab` over all four directories returned nothing (exit 1).
- The only external URLs go to independent references: ImageMagick, Oklab
  (bottosson.github.io), CSS Color 4, libimagequant, an NVIDIA blue-noise article,
  Lospec palette pages and API, and Aseprite CLI/spec docs. The Aseprite references
  cover the file format and CLI, so they are interoperability material, not extension
  internals.
- The hits for "extension" are about file extensions (spike 03:19, 31).
- The git history of these paths has only two commits: 1648584 and 061c880.
- `bench/palette-collection-spike/colorfetti-controls.jpg` is a screenshot of
  Colorfetti's own controls.

This confirms the prior claim that the spikes have clean provenance.

## 2. Reproduction (deterministic spike experiments rerun)

I copied each runner into the audit directory and changed only its import and fixture
paths, so outputs land there. The `compare.mjs` script then diffs every non-timing
JSON field and byte-compares every PNG. The input modules are the current HEAD
src/lib.

| Experiment | Non-timing JSON differences | Output files byte-identical | Notes |
|---|---:|---|---|
| Collection spike (`palette-collection-spike/run.mjs`) | 0 | n/a (JSON only) | Exact reproduction |
| Preset spike (`palette-preset-spike/run.mjs`) | 0 | 12/12 PNG/SVG/HTML | Exact reproduction |
| Algorithm spikes (`palette-algorithm-spikes/run.mjs`) | 0 | 59/60; `index.html` differs | See R-1 |
| Curation spike (`palette-curation-spike/run.mjs`) | 0 across 64 rows (used, point MSE, PNG bytes, visible pixels, subsets) | 72/72 PNGs | See R-2 (engine hashes) |

Receipts: [reproduction-comparison.json](../../bench/claude-audit-2026-10-15/research/reproduction-comparison.json)
and the per-experiment `stdout.txt` and `output/` folders.

Every quality number quoted in spikes 01–04 and in the curation study reproduces
exactly with current production modules. Some examples:

- Eight-gray grid-aware block MSE is .000333.
- Diffusion changes 4,116 and 4,026 static pixels.
- The preview has 277/512 disagreements.
- The rare-accent MSEs are .009749 and .020298.
- Animation-scope churn is 256 versus 0.
- The armor ENDESGA8 Off point error is .025044.

Kernel timings did not reproduce (finding M-1).

I also checked the fitting-spike claim "direct fitting has lower point error in 16 of
20 cases" by recounting `bench/palette-fitting-spike/results.json` with the whole-wall
scope excluded. The counts are 16 better, 4 worse and 0 ties: **confirmed**. The four
regressions are armor K4 +5.0%, ramp K4 +9.0%, ramp K8 +10.4% and GIF K4 +6.3%,
exactly as tabled.

## 3. Findings

### M-1 (medium, methodology): the "946 ms grid-aware" timing does not reproduce

- **Where:** [01-full-palette-dithering.md:73](palette-improvement-spikes-2026-10-14/01-full-palette-dithering.md);
  the recorded value is in `bench/palette-algorithm-spikes/output/results.json`.
- **Evidence:** I ran twice on the same CPU (i7-13700K) and Node (v25.0.0).
  - Grid-aware median: 258.5 ms and 285.7 ms.
  - Naive pair: 238.9 ms and 252.9 ms.
  - Diffusion: about 7 ms. The document says 13.5–14.2 ms.
  - Nearest: about 1.0–1.1 ms. The document says 0.87 ms.
  - The quality outputs were byte-identical, so the measured code path is the same.
- **Expected vs actual:** the bold "946 ms" implies grid-aware is about 4× slower than
  the naive search. Fresh runs show about 1.1×.
- **What still holds:** both exhaustive ordered searches are more than 200× slower
  than nearest, so rejecting them for production is still sound.
- **Smallest fix:** replace "233 ms naive pair, **946 ms grid-aware pair**" with
  "233 ms naive pair and 946 ms grid-aware pair in the recorded run (a later rerun on
  the same machine measured about 240–290 ms for both; timings are load-sensitive)".

### M-2 (medium, methodology): the rejection of refinement and direct-K Auto rests largely on a near-unsatisfiable gate

- **Where:**
  - [2026-10-15-auto-refinement-spike.md:58-69 and 79-88](2026-10-15-auto-refinement-spike.md)
  - [2026-10-15-auto-refinement-decision.md:18-31](2026-10-15-auto-refinement-decision.md)
  - Handoff "Decisions Made", the row saying strict variants improve nothing.
- **Evidence:**
  - The strict guard vetoes any candidate that raises nearest error for *any* visible
    source RGB. Moving or swapping a palette entry almost always helps some source
    colors and hurts others.
  - So "0/176 accepted" mostly measures the gate, which asks for a Pareto improvement
    over every source color. It is weak evidence that a better palette is unavailable.
  - The rare guard collapses to strict on high-color images, as the spike itself
    admits at line 68.
  - The unguarded data actually favor direct fitting on point error:
    - Single assets: 16/20 wins, up to −15.2% (fitting spike, recounted above).
    - Mean centroids: −0.5% to −14.5% on all 8 real-art cases (service comparison).
- **Reasons that legitimately support no-ship:**
  - The shared-target identity break: 175/175 changed centroid observations invent RGBs.
  - Exact-pixel losses in 65 observations.
  - The 4/20 single-asset regressions.
  - The user's explicit "improvement without regressions" condition.
- **Expected:** the decision text should say the gate makes "no change" nearly certain.
- **Actual:** "strict variants improve nothing at added cost" reads as an empirical
  quality verdict.
- **The decision itself stands.** This is a framing correction. The no-ship decision
  is also not supported by any held-out set: there are only two real-art sources, and
  the GIF is derived from the breastplate. Any future candidate needs a held-out
  real-art cohort, as the handoff already says.
- **Smallest fix:** add to the decision doc after the findings table: "The strict
  guard requires a Pareto improvement over every visible source RGB, which almost any
  palette change fails by construction; its zero acceptances show the gate, not an
  absence of better palettes. The no-ship decision rests on shared-target identity,
  exact-pixel losses and the user's no-regression condition."

### M-3 (medium, methodology): the head-to-head point-error comparison omits the metric-bias caveat

- **Where:**
  - [2026-10-15-auto-refinement-decision.md:33](2026-10-15-auto-refinement-decision.md):
    "Current has lower Oklab point error in 7/8 cases".
  - The same claim in `2026-10-15-auto-refinement-service-comparison.md`, "Native art
    results".
- **Evidence:** Colorfetti maps each pixel to its nearest Oklab palette entry, and the
  comparison scores with that same Oklab point distance. The spikes state this bias
  explicitly (spike 01:45, spike 02:49, curation:43). These two documents do not, and
  `grep -i "favor|objective|optimiz"` in the service comparison has no hits.
- **Expected:** a per-product win count on a metric one product optimizes should carry
  a bias caveat.
- **Smallest fix:** append to decision line 33 and to the service-comparison
  paragraph: "Colorfetti's nearest mapping minimizes this Oklab point objective for its
  palette, so this metric is not neutral between the products."
- **Ownership:** the service-comparison file belongs to the service-evidence set; the
  decision doc is mine.

### L-1 (low, supersession): neutral spikes 01–04 carry no forward pointer to shipped or rejected outcomes

The spikes still present proposals that have since been decided:

| Spike line | Current production / later decision |
|---|---|
| 01:7 "Keep **None** as the default"; 01:87 proposes "Dithering: None / Ordered / Diffusion" with an "amount" | Shipped as Off / 2×2 / 4×4 / 8×8 with Dither strength. Diffusion is deferred (`src/lib/palette-dither-settings.js:2-8`; `src/Dock.svelte:508-521`). |
| 02:7, 02:93-95 P1 "Target swatch locks", P2 "Explicit generate-at-K" | Locks deferred; direct-K and refinement rejected (fitting and refinement decision docs). |
| 03:13 "nine curated full palettes ... The curated eight-color choice is grayscale" | Eleven presets, including ENDESGA 8 (`src/lib/palette-library.js:51-63`). |
| 03:29, 82 Lospec "slug" import proposed | Shipped as strict full-URL import via Paste colors; bare slugs are rejected (`src/lib/palette-lospec-url.js:3`). |
| 04:22 Used count "Not exposed"; 04:24, 04:51 Save reduced colors | Count / Use N output colors shipped (`src/lib/palette-usage.js`; `src/App.svelte:740-749`). |

[The remaining-work audit:78-79](2026-10-15-palette-remaining-audit.md) supersedes
these spikes centrally, but nothing in the spikes points a reader there. Per the
handoff, the spikes must stay vendor-free, so the forward link must not go to a
document that links vendor evidence.

**Smallest fix:** append to each spike's Status line. The text is the same for all
four, and its link paths are relative to the spike folder, not to this report: " Historical proposal; current behavior is documented in
[palettes](../../palettes.md) and the
[design specification](../../superpowers/specs/2026-10-06-colorfetti-app-design.md).
Its next-step language is not an open task list." The ledger chose to leave the spikes
unchanged, so this note is a proposal, not a correction of a prior error.

### L-2 (low, supersession): the dithering implementation record uses the pre-rename label and has a stale next-work list

- **Where:**
  - [2026-10-14-full-palette-dithering-implementation.md:5](2026-10-14-full-palette-dithering-implementation.md):
    "with Amount 0–100%, initially 50%". The label has been "Dither strength" since
    e146f83 (`src/Dock.svelte:521`).
  - Lines 52-57 still list Count, ENDESGA 8, locks/direct-K and quick budgets as next
    work. Count and ENDESGA 8 shipped; direct-K was rejected; locks and quick budgets
    were deferred.
- **Smallest fix:** change "Amount" to "Dither strength (labeled Amount at
  implementation time)". Prefix "Next useful work" with "Historical; see the
  [remaining-work audit](2026-10-15-palette-remaining-audit.md) for current
  dispositions."

### L-3 (low, supersession): user-facing docs and CLAUDE.md still contain pre-Recolor and pre-Keep wording

Delegated check, spot-verified by me at the cited lines. The source supports all
eleven presets, dithering, Count, Keep and Lospec. Only these texts lag:

1. **CLAUDE.md:90** says Help steps are "Add, Palette, Nearest and Save for Palette".
   The code uses Recolor: `src/App.svelte:1114` renders
   `{family === 'full-palette' ? 'Recolor' : 'Style'}` with "Tune matching, color
   limits and dithering."
   - Line 54 of CLAUDE.md does declare "historical Nearest-only wording below"
     superseded. Line 90, however, is phrased as current behavior.
   - Fix: "Add, Palette, Recolor and Save for Palette ... Recolor tunes matching,
     color limits and dithering."
2. **CLAUDE.md:104** says Reset is "beside the Nearest title", and the rows "Max
   colors, Matching, Cleanup and conditional Opacity cut".
   - Actual (`src/Dock.svelte:468-545`): the heading is Recolor, and the rows are
     Max colors, Matching, Cleanup, Dithering, conditional Dither strength,
     conditional Opacity Cut/Keep, then Opacity cut (Cut only).
   - Fix: replace that clause with the actual sequence.
   - Also delete "Nearest matching and persisted storage fields are unchanged."
     Storage now also holds alphaMode, dither and ditherStrength.
3. **CLAUDE.md:94** says "Reset restores Oklab/All/Cleanup Off/cut128".
   - Actual (`src/Dock.svelte:208`): Reset also restores dither none, strength 50
     and alphaMode cut.
   - Fix: "Reset restores Oklab/All/Cleanup Off/Dithering Off/strength 50%/Opacity
     Cut 128, retaining the palette."
4. **docs/palettes.md:208** says "Output pixels are fully opaque or fully
   transparent."
   - Fix: "With Opacity Cut, output pixels are fully opaque or fully transparent;
     Keep preserves partial opacity in PNGs."
   - **docs/palettes.md:213/215** still say "Amount". Change to "Dither strength" and
     add the conditional Opacity Cut/Keep row.
5. **docs/styles.md:16** says "Output alpha stays binary". **docs/styles.md:43** says
   "Cleanup preserves binary alpha". Both should be qualified to apply under Cut.
6. **Spec 2299-2303** lists the old nine-preset rail without ENDESGA 8 and
   Black & white. Spec:92 says it "supersedes older nine-preset lists", but the stale
   list is still in the body.
   - Fix: insert "ENDESGA 8 (8)" after DawnBringer 16 and "Black & white (2)" before
     Glow.
   - Other Nearest-era spec lines (172, 2096-2100, 2491, 2494, 2511, 2514, 2536-2537,
     2540, 2610) are covered by spec:145's blanket supersession. They still say
     "Nearest" where the UI says "Recolor".

Items verified clean against src: eleven preset IDs and order; DEFAULT_FULL_PALETTE
`preset-edg32`; dividers; Auto `generated-32`/64; dither modes and default 50 with
strength 0 = nearest; 200 ms commit; Count unions frames and excludes index 256; Use N
draft; Cut128/Keep cut1; explicit partial-alpha GIF failure; Lospec strict URL with
64 KiB/15 s limits, matching the spec (the 32 MiB/30 s figures are palette-drop, as
CLAUDE.md says); Oklab/All/Cleanup Off defaults.

### L-4 (low, links): seven links in the clipboard contract review use editor-style `file:line` targets

- **Where:** [2026-10-15-clipboard-contract-review.md:11-20](2026-10-15-clipboard-contract-review.md),
  links such as `../../src/App.svelte:818`.
- **Evidence:** the link checker resolved 351 relative links across 36 owned docs and
  READMEs; only these 7 have no matching file (`link-check.json`).
- **Status:** five anchors still point to the described code: `App.svelte:818` is
  `copy(item)`, 923 is `paste`, 937 is `keydown`, `palette-state.js:42` is
  `fullPaletteImage`, and `PaletteImport.svelte:199` is `paste`. Two have drifted:
  - `save.js:239` is `pngBlob`; `copyOne` is at 247.
  - `palette-state.js:31` is a closing `};`; `conversionSnapshot` is at 36.
- **Fix:** change `:N` to `#LN`, e.g. `../../src/App.svelte#L818`. Use `save.js#L247`
  and `palette-state.js#L36` for the two drifted links. (The delegated checker
  treated `:N` as an anchor and reported no missing targets; my resolver treats it
  as part of the path, which is how a Markdown renderer resolves it.)

### I-1 (info, provenance drift): the committed algorithm-spike `index.html` predates its runner

The committed page omits the sentence "The naive ordered variant fails the grayscale
ramp and both ordered searches are too slow for production." The current runner
(run.mjs:191) emits it. The other 59 outputs are byte-identical, so only the HTML
caption drifted. No fix is needed; regenerating would overwrite a historical artifact.

### I-2 (info, methodology): two "fixtures" in the algorithm spike are the same image

`color_ramps` and `eight_color_ramps` use the identical generator (run.mjs:115, 122);
only the target palette differs. "Six fixtures" are therefore five distinct images
under six fixture/target pairs. Spike 01:39 describes the targets correctly, so this
is wording only.

### I-3 (info, reproducibility): the curation `engineSha256` gate is sensitive to line endings and post-study edits

- My rerun's hashes differ from the recorded hashes for quantize.js, palette-dither.js
  and save.js. palette-limit.js and palette-library.js match.
- Two causes:
  - Later commits changed these files (ba357c3 Keep, 256ad1e).
  - This checkout has `src/lib/quantize.js` as `w/crlf` but `palette-limit.js` as
    `w/lf`.
- All 64 conversions are still byte-identical, so the hash mismatch does not mean a
  behavior change.
- Future gates should hash normalized content or compare output bytes. They should not
  treat a raw-file hash mismatch as a regression.

### I-4 (info, methodology): spike collection results are near-symmetric by construction

In the collection spike, the shared cap-2 choice of black/red over black/blue is
decided only by the five purple pixels. The asset errors are .4164 and .4335. The
unequal-size follow-up picks black/red under both weightings. Spike 04:41 already
discloses that this does not demonstrate a weighting tradeoff. **Confirmed as
disclosed**; no fix.

## 4. Presets: canonical values and roles

I fetched six Lospec JSON files on October 15, keeping them as untracked audit inputs
in `lospec-fetch-2026-10-15/`. The script `preset-canonical-check.mjs` compares exact
RGB and order:

| Preset | Lospec slug | Exact set | Exact order |
|---|---|---|---|
| Resurrect 64 | resurrect-64 (Kerrie Lake) | yes, 64 | yes |
| ENDESGA 32 | endesga-32 | yes, 32 | yes |
| PICO-8 | pico-8 | yes, 16 | yes |
| DawnBringer 16 | dawnbringer-16 | yes, 16 | yes |
| ENDESGA 8 | endesga-8 | yes, 8 | yes |
| Ice Cream GB | ice-cream-gb (Kerrie Lake) | yes, 4 | yes |

Further checks:

- Grayscale 8 equals round(i·255/7).
- No two presets have identical color sets.
- The retained `bench/palette-preset-spike/endesga-8.json` snapshot matches today's
  live response.
- Game Boy green (`0f380f 306230 8bac0f 9bbc0f`) is credited at
  `src/lib/palette-library.js:59` as an LCD-inspired interpretation, not a canonical
  palette. That labeling is honest.
- Black & white is exactly `#000000/#ffffff`.

**Do the two additions earn their place?**

- **ENDESGA 8:** the curation study documents a distinct role (broad hue at 8) and an
  adverse case (neutral armor).
- **Black & white vs Glow:** Glow (`#222323/#f0f6f0`) could look like a duplicate. A
  partition check over the curation outputs (`two-color-partition.json`) shows
  otherwise. Glow's light/dark split differs from Black & white on 10–22% of visible
  pixels (items 211/1574, armor 16/155, material 1175/7168, ramp 1774/8192, with
  dithering Off) because its Oklab midpoint is higher. So Black & white changes the
  mapping, not just the ink colors.
- **Other presets:** Glow, Paper, DB16 and the rest predate the baseline, and their
  stable IDs protect saved selections. I found no evidence-based reason to remove any.

## 5. Dither default strength 50

No document derives 50 from data. It appears as "initially 50%" at implementation
(dithering implementation:5), and spike 01:41 says only 0 and 1 were exercised. The
only sweep is the armor sweep: one 16×16 sprite, 4 eligible blocks.

I reproduced its reading from the committed JSON:

- Point error rises monotonically.
- Block tone is non-monotonic (best at 75).
- At ≥50 one of four target colors disappears (4→3).
- At strength 20 the highlight stays one connected component.

**Extension.** `strength-sweep-multi.mjs` runs 4×4 at strengths
0/10/20/30/40/50/60/75/100 on 4 sources × 5 targets: ENDESGA 8, PICO-8, Grayscale 8,
Game Boy green and Black & white. That is 20 cases using production `quantize`.

| Result | Value |
|---|---|
| Strength with lowest 4×4 block tone | 100 in 13/20; 75 in 2; 50 in 2; 60, 30, 20 in 1 each |
| Strength 50 tone vs Off | Better in 19/20; equal within 1e-5 on armor/Grayscale 8 |
| Point error at 50 vs Off | Higher in 20/20 (expected trade) |
| Used colors dropping at 50 vs Off | 0/20 (the armor 4→3 drop needs that specific service target) |
| Non-monotonic tone curves | 9/20 |

**Conclusion.** This data selects no single default:

- Tone favors higher strengths.
- Point error and tiny-detail cohesion favor lower ones.
- 50 is a defensible middle value that improves block tone in 19/20 cases.

The prior claim that one armor input does not justify changing 50 or adding a guard is
**confirmed**. It is now backed by a 20-case sweep rather than just asserted. This is
still a proxy metric, not a preference study.

**Smallest fix (low):** add one sentence to the dithering implementation record. "The
default 50% is a midpoint, not a calibrated optimum; a 20-case sweep
(bench/claude-audit-2026-10-15/research/strength-sweep-multi.json) found 4×4 block
tone improves over Off in 19/20 cases at 50% while point error rises in all 20."

## 6. Clipboard, PNG precision and WebKit fallback documents

A delegated reviewer read all 13 documents in full and checked them against current
src. I spot-verified the quoted lines marked with an asterisk (*).

**Production checks: clean.**

- There is no WebGL or fallback candidate anywhere in `src/`, `build/`, Vite config or
  `package.json`. The search terms were `webgl`, `texImage2D`, `readPixels`,
  `webkit-fallback`, `stream-reader` and `unpackColorSpace`.
- No `src/` commit exists after d37d8b7.
- `src/lib/image-decode.js` SHA256 `e1207e72…15a9` and the dist index `16d2776e…2837`
  match the documented hashes.
- The nativeSrgb gate (RGBA/BGRA, fullRange, bt709, iec61966-2-1) is at
  image-decode.js:5-9.
- The red/blue swap uses 128 KiB blocks with an 8 ms posted-task yield and
  cancellation checks (:11-25). Other metadata uses managed sRGB `copyTo` (:66).
- Copy is click-time and promise-first (`App.svelte:818-830`), and the promise-owner
  fix is at `save.js:249-254`.
- Copy and Save share `pngBlob` and the same encoder, so CLAUDE.md:30 is accurate.
- The clipboard docs never mix transport bytes with Save bytes.
- Test counts (33 decoder, 14 Save, 929/2 skipped), commit subjects and cross-doc
  numbers agree. Examples: 245 changed pixels with max delta 77; 118 Save
  differences; 207/246; 422/213 bytes; 139/140/141 ms.

**Findings.** All are proposed doc fixes.

| # | Sev. | Location | Evidence | Smallest fix |
|---|---|---|---|---|
| C-1 | medium | `2026-10-15-clipboard-contract-review.md:114`* | "The remaining actionable steps are narrow: finish native Copy/Paste on Codex Browser…" These were completed later (clipboard checklist :12-15; verification :29, 75-77). Help guidance ships at `App.svelte:1115`. | Insert before :114: "Historical: these steps were completed; see [final verification](2026-10-15-clipboard-verification.md)." |
| C-2 | low | `clipboard-contract-review.md:49` | Proposes a ≥2MP asynchronous ownership case that was never performed (verification :95-96 marks it outside scope). | Append "Not performed; recorded as outside scope in the final verification." |
| C-3 | low | `2026-10-15-clipboard-independent-review.md:73, 89`* | Reports "Save already differs from the golden at 118 visible RGB sites" and "A focused decoded-source precision spike is justified". d37d8b7 later removed that 118-pixel Save gap (PNG verification :50-53). There is no forward note here. | Append to :89: "Subsequent: d37d8b7 removed the redundant native conversion; desktop Save now matches the golden. The clipboard-transport differences remain." |
| C-4 | low | `2026-10-15-png-import-precision-verification.md:74-77, 91-92` | Next work lists "evaluated fallback precision", which has since been evaluated and rejected (WebKit decision :3, 81-83). Safari/iOS is now out of scope. | Append: "Subsequent: the [WebKit fallback decision](2026-10-15-webkit-fallback-decision.md) evaluated and rejected a WebGL fallback; the precision limit remains." |
| C-5 | low | `2026-10-15-png-import-precision-checklist.md:26-28` | The open fallback limitation is still true but has no link to the later decision. | Append "Investigated and left unchanged; see the WebKit fallback decision." |
| C-6 | low | `bench/webkit-fallback-candidate-proposal.md:107-108` | Says "while this native alternative is under evaluation". The evaluation concluded no-ship. | Replace with "; the native alternative was also rejected (see the decision record)". |
| C-7 | low | `bench/webkit-fallback-candidate-proposal.md:3-4`* | The headline "133/135/147 ms" gives the superseded f221 numbers. Every other doc and its own :76 use the final streamed 139/140/141 ms. | "…reproduced 139/140/141 ms synchronous context creation calls with the final streamed helper (133–147 ms with the earlier f221 revision)…" |
| C-8 | low | `2026-10-15-clipboard-verification.md:8`* | "Native image delivery is verified on Codex Browser and the USB Pixel 8 Pro." The Codex evidence is one human-assisted Keep transfer; independent review :77 disclaims a full matrix. | "…verified for one human-assisted Palette Keep transfer on Codex Browser and four cases on the USB Pixel 8 Pro." |
| C-9 | low | `2026-10-15-webkit-fallback-decision.md:20-22`; adversarial :17 | The no-ship rests on n=3 cold runs on one WebKit build, with no numeric main-thread threshold and no old-path tiny-sprite baseline. The direction is conservative, so the risk is low. | Add the threshold used (for example "any synchronous stall >50 ms fails") or the old-path tiny-sprite cost. |
| C-10 | info | `png-native-copy-implementation.md:61-66` | The "production reorder … posted scheduler" timing uses a Node `setImmediate` mock of MessageChannel (`bench/png-import-precision-swap-perf.mjs:14-17`), 3 runs. | Append "(Node mock of MessageChannel via setImmediate)". |
| C-11 | info | `bench/webkit-fallback-review/candidate-cost-streamed-results.json` `scope` | The label "isolated 1/4/16MP" contradicts its own `concurrencyNote` and the docs. | Correct the receipt label only if receipts are ever regenerated; the docs are right. |
| C-12 | info | CLAUDE.md:109-115 | Never mentions the Windows WebKit fallback rounding limit or the rejected WebGL alternative. | Optional sentence: "The bitmap/canvas fallback can round translucent RGB (Windows WebKit); a WebGL replacement was rejected for cold-start latency (docs/research/2026-10-15-webkit-fallback-decision.md)." |

Status lines in the WebKit checklist, review and decision docs, and in
`png-precision-review.md`, have no stale open items.

## 7. Prior-audit claims: confirmed vs refuted

| Prior claim (ledger/handoff) | Result |
|---|---|
| Four neutral spikes contain no prohibited vendor references | **Confirmed** (section 1) |
| Spike measurements are deterministic evidence | **Confirmed** for all quality outputs (4 experiments, 0 diffs). **Partly refuted** for the headline grid-aware timing (M-1) |
| Direct fitting lower error in 16/20 with 4 regressions | **Confirmed** by recount |
| Direct-K/refinement rejected because strict variants "improve nothing" | **Decision confirmed, rationale refined**: the strict gate is near-unsatisfiable by construction; rejection rests on target identity, exact-pixel loss and the no-regression condition (M-2) |
| One armor sweep does not justify changing strength 50 or adding a guard | **Confirmed** and extended to 20 cases (section 5) |
| Eleven presets with exact published RGB | **Confirmed** for the six Lospec-sourced presets, Grayscale 8 and Black & white |
| Historical statuses corrected | **Partly**: the plan, feature review, remaining audit and todos have notes. Spikes 01–04 (L-1), the dithering implementation record (L-2), CLAUDE.md:90/94/104, palettes.md/styles.md alpha wording and spec 2299-2303 (L-3) still describe superseded behavior |
| Evidence links fixed | **Confirmed** apart from 7 `file:line` links (L-4) |
| Current point-error wins versus the service | **Qualified**: numerically reproduced elsewhere, but the decision doc lacks the self-favoring-metric caveat (M-3) |

## 8. Gaps (not findings)

- No held-out real-art cohort exists for any fitting, refinement or curation claim.
  Only two real sprites (inventory, breastplate) recur across all studies, and the
  GIF is derived from the breastplate.
- No human or artist preference data exists for presets or dither strength.
- I did not rerun the refinement, fitting, armor-sweep or PNG/clipboard harnesses.
  Those have service-hash gates or fixed output paths, or need browsers and devices.
- Timing claims in the refinement and fitting docs were not re-measured.

## Applied fixes (round 1, uncommitted)

The orchestrator accepted these findings as documentation corrections. I applied them
as short dated `Status/supersession (Oct 15):` notes or one-line clarifications.
Historical measurements and content are unchanged.

- Edits went through the idempotent script
  `bench/claude-audit-2026-10-15/research/apply-doc-notes.mjs`, plus direct exact
  replacements in the user docs and the spec.
- Every relative link in the 18 edited docs still resolves.
- A grep of spikes 01–04 for `pixellab` still returns nothing.

| Finding | File edited |
|---|---|
| L-1 | `docs/research/palette-improvement-spikes-2026-10-14/01-…`, `02-…`, `03-…`, `04-…`: status notes link only to `docs/palettes.md` and the spec |
| M-1 | `01-full-palette-dithering.md`: rerun timing note beside "946 ms" |
| L-2 | `docs/research/2026-10-14-full-palette-dithering-implementation.md`: Dither strength relabel and midpoint-default note; historical note on "Next useful work" |
| M-2, M-3 | `docs/research/2026-10-15-auto-refinement-decision.md`: Pareto-gate and metric-bias note after the findings table |
| M-3 | `docs/research/2026-10-15-auto-refinement-service-comparison.md`: metric-bias note in "Native art results" |
| L-4, C-1, C-2 | `docs/research/2026-10-15-clipboard-contract-review.md`: seven links changed to `#L` anchors (save.js to L247, palette-state.js to L36); "not performed" note at :49; historical note before "remaining actionable steps" |
| C-3 | `docs/research/2026-10-15-clipboard-independent-review.md` |
| C-4 | `docs/research/2026-10-15-png-import-precision-verification.md` |
| C-5 | `docs/research/2026-10-15-png-import-precision-checklist.md` |
| C-6, C-7 | `bench/webkit-fallback-candidate-proposal.md` (prose proposal; not a measurement artifact) |
| C-8 | `docs/research/2026-10-15-clipboard-verification.md` |
| C-10 | `docs/research/2026-10-15-png-native-copy-implementation.md` |
| L-3 | `docs/palettes.md`: Cut/Keep alpha wording, Dither strength label, row order and Reset list. All are palette-family text, verified against `src/Dock.svelte:208, 468-545`. |
| L-3 | `docs/styles.md:16, 19, 43`: palette-family paragraph only. The 1-bit alpha wording is untouched because that family really is binary. |
| L-3 | `docs/superpowers/specs/2026-10-06-colorfetti-app-design.md:2301-2302`: rail list now includes ENDESGA 8 and Black & white. The image-decode and Lospec paragraphs are untouched. |

**Not applied:**

- **L-3 CLAUDE.md:90/94/104 and C-12.** I did not edit CLAUDE.md. Changes to that
  file must come from the user, not from an agent instruction. The exact replacement
  text is in L-3 and C-12 above, verified against `src/App.svelte:1114` and
  `src/Dock.svelte:208, 468-545`. The user or root session can apply it.
- **C-9.** No numeric main-thread threshold appears in the evidence, and inventing
  one would be a new claim.
- **C-11.** This is a historical bench receipt and must not be overwritten.
- **Other Nearest-era spec lines.** These remain under the spec's existing blanket
  supersession. Rewriting them goes beyond the requested rail-list fix.

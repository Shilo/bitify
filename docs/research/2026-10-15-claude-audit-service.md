# Claude audit: PixelLab service comparison and Smart colors (Round 1, service reviewer)

October 15, 2026. HEAD e87a853, clean tree at start. Vendor evidence audit, separate from the
neutral spikes. No `src/` change, no build, no commit. All scripts and outputs are under
`bench/claude-audit-2026-10-15/service/`. Earlier audits were treated as claims to challenge;
this run used a **new held-out cohort** and did not repeat the prior five cases.

## Bottom line

- **Cost: 1.1 subscription generations** (10 REST + 1 MCP reductions at 0.1 each). Balance
  5,626.1 → 5,625.0 generations, delta 1.1, equal to the summed response usage. USD credits
  unchanged at 22.5137. Three 422 rejections were not charged.
- **No officially callable surface performs existing-image Smart recoloring.** Existing-image
  Smart is **human-deferred**. Decision: **insufficient evidence** (procedure below).
- **One new Colorfetti quality defect (spec-level, Medium):** with Opacity **Keep** plus Max
  colors, invisible alpha-1 pixels get full weight in Auto and subset selection. In the spill
  fixture this turns an opaque pale core **bright green**. PixelLab has the same failure mode,
  worse in this case. A fix is proposed but not implemented.
- **One new held-out counterexample (Medium, quality tradeoff):** subset-only Max colors drops
  the knight's whole red cloth family below cap 9 and its blue eyes below cap 13. PixelLab K8
  keeps both. Colorfetti wins K16 decisively. Neither product is better in general.
- Website: blocked at sign-in in the built-in browser; not attempted further.

## 1. Schema refresh and surface inventory

`probe.mjs` makes only free calls: public pages, MCP `tools/list` and balance. Outputs are in
`probe/rest-diff.json`, `probe/mcp-tools.json`, `probe/openapi.json` and `probe/llms.txt`. For
the vendor HTML pages, only the hashes in `rest-diff.json` are kept.

| Surface | Current state | Change vs retained 10:12Z contract |
|---|---|---|
| REST `/reduce-colors` | `images`, `num_colors` (2–256, excludes palette), `palette_image`, `dithering` none/2x2/4x4/8x8, `dithering_strength` 0–10 default 5; `additionalProperties:false` | **None** (fields and specs byte-identical) |
| REST `TargetPalette` | `colors`, `name`, `max_colors` 2–64, `smart` ("Beta, single images only … adds about 15–60 s") | **None** |
| REST routes with Smart | `/generate-image-v2` (text-to-image, optional reference images) and `/animate-with-text-v2` (refuses smart) | None; 101 paths total |
| REST recolor/palette-like paths | `/inpaint`, `/inpaint-v3`, `/inpaint-image-pro-flash`, `/reduce-colors` | No route takes existing pixels plus `smart` |
| MCP (server "PixelLab MCP Server" 0.2.0) | 117 tools; **zero tools mention smart**; `reduce_colors` and `create_image_pro` schemas unchanged | Same 117 total |
| Docs (reduce-colors, color, dithering, /mcp, MCP docs, v2 docs, llms.txt) | No "Smart colo(u)rs" text in any fetched page | — |

`generate-image-v2` with `reference_images` and `smart` is still **generation**. It returns new
art with no geometry guarantee, and up to 64 candidates at small sizes. It is not
existing-sprite recoloring, so it was not run. That avoids the false-equivalence trap of
`api-smart.mjs`.

**Extension provenance (read-only; no manifest dump).** `package.json` reports name `pixellab`,
version 0.4.130. The install directory is itself a **git working tree**: its HEAD commit is
"v0.4.119" from 2026-08-08, with 69 modified and 16 untracked files. 652 files have mtimes in
the 2026-10-14 23:00 hour, which fits a later package written over the checkout.
`quantize-image.lua` differs from v0.4.119 by +91/−17 lines, including Smart lines.
`target-palette.lua` is untracked. This suggests a v0.4.119 checkout overwritten by a 0.4.130
package. It is **not proof of an unmodified published release**. The extension was not executed.

## 2. Held-out cohort and live operations

Fixtures are owned and synthetic, created by `fixtures.mjs` and checked with Sharp.
`fixtures/manifest.json` holds the hashes.

- `knight-a.png` is 24×24 with 17 RGB colors: outline, a 3-step skin ramp, a 4-step metal
  ramp, 3-step red cloth and 3-step wood. Its rare accents are a 2-pixel blue eye, a 1-pixel
  green gem and a 1-pixel specular highlight.
- `knight-b.png` is the same knight with the sword moved up 4 px. 531 source coordinates are
  unchanged between the two frames.
- `hue-ramp.png` is 64×16 with 1,024 saturated HSL colors.
- `glow-alpha.png` has alpha bands 0/1/64/127/128/192/254/255. Its right half carries green
  matte spill at alpha 64 and alpha 1.
- `spill-alpha1.png` has 3 opaque colors plus 508 pixels of invisible green at alpha 1.
- The targets are 1-pixel-high strips of the app's own PICO-8 and ENDESGA 8 presets.

| Case | Service request | Status / latency | Service `n_colors` |
|---|---|---|---|
| knight-count4 | `num_colors` 4 | 200 / 595 ms | 3 |
| knight-count16 | `num_colors` 16 | 200 / 273 ms | 15 |
| knight-pico8 | PICO-8 palette image | 200 / 663 ms | 11 |
| knight-edg8 | ENDESGA 8 palette image | 200 / 1,751 ms | 6 |
| hue-edg8-none | EDG8, none | 200 / 1,865 ms | 8 |
| hue-edg8-4x4-s2 | EDG8, 4x4, strength 2 | 200 / 442 ms | 8 |
| hue-edg8-4x4-s8 | EDG8, 4x4, strength 8 | 200 / 546 ms | 8 |
| glow-count4 | `num_colors` 4 | 200 / 4,444 ms | **9** (3 visible RGB) |
| knight-2frame-count8 | two images, 8 | 200 / 636 ms | 7 |
| spill1-count3 | `num_colors` 3 (added after offline evidence) | 200 / 6,275 ms | 2 |
| knight-count4 **via MCP** | `reduce_colors` + `get_image` | completed / 5,193 ms incl. 4 s polls | charged 0.1; saved to gallery |
| rejected | `num_colors` 257 / `dithering` "3x3" / `dithering_strength` 11 | 422 each, clear messages, uncharged | — |

**Determinism and surface parity:** the MCP knight-count4 output is **bit-identical** to the REST
output (0 differing pixels). That is one repeat on one input, not a general proof.

## 3. Colorfetti path and measurement

`local.mjs` runs the **actual `src/lib` modules in Node 25**:
`captureGeneratedSources`/`generatePaletteAsync` (Auto), then `selectPaletteSubset` (Max
colors), then `quantizeAsync` (Oklab default, RGB variant, ordered 4×4 strengths 10–100), then
`palettePngBytesAsync`. Keep/Cut uses `effectiveAlphaCut`, mirroring App and Tile `paletteCut`
(App.svelte:59/224, Tile.svelte:24/131). A two-frame asset uses GIF-style
`{frames:[…delay 100]}`, giving one subset across frames, but each frame is exported as PNG.
This is **not the built browser app**: there is no worker, decode or UI path.

Every PNG, service and local, was decoded with **Sharp/libpng** (`failOn:'error'`). The custom
reader in `api-common.mjs` was not used. `verify.mjs` checked 50 PNGs. Request hashes match the
fixtures, and billing reconciles.

Metrics are in `results.json`, per frame:

- **Errors.** Point RGB and Oklab MSE are taken over pixels visible in both outputs. An
  alpha-weighted Oklab variant is also recorded.
- **Tone.** Block tone uses fully opaque 4×4 blocks only. That is 10 blocks for the knight and
  4 for the glow, so coverage is small.
- **Alpha and color.** Alpha changes and visibility changes are counted. Visible RGB count and
  target violations are recorded.
- **Exact retention.** Two rates are kept: exact source-RGB retention and target-member retention.
- **Rare details.** An accent counts as retained when its output differs from all 8 neighbors.
- **Churn.** Churn counts unchanged-coordinate output changes between frames.
- **File and time.** Native PNG bytes are recorded. Local convert and encode medians are timed
  separately.

Contact sheets are nearest-neighbor over mid-gray, so alpha stays visible. All three were
inspected visually:

- `sheets/knight.png` at ×8
- `sheets/hue.png` at ×4
- `sheets/glow.png` at ×7

## 4. Paired results (PL = PixelLab, CF = Colorfetti Oklab default unless noted)

| Case | Visible RGB PL / CF | Oklab point MSE PL / CF | Exact source retention PL / CF | Rare accents | Observed visually |
|---|---|---|---|---|---|
| knight K4 | **3** / 4 | .01029 / **.00642** | .309 / **.546** | both lose eyes; CF-RGB keeps them distinct | PL flattens to brown and light gray; CF keeps a readable face. Neither keeps red. |
| knight K16 | **15** / 16 | .0000906 / **.0000099** | .786 / **.997** | both keep eye and gem | PL merges two browns into a new `#ae7444` and nudges `#e8eef2`→`#e9eef2`. CF drops only the 1-px white specular. **CF wins clearly.** |
| knight PICO-8 | 11 / 12 | .00893 / **.00836** | n/a (no source members) | both keep eye and gem | CF maps mid skin `#d9966b`→`#ffa300`, giving an orange face column, and dark wood→navy. PL is more coherent (peach and gray). CF-RGB is worse: pink face and a black outline. |
| knight EDG8 | 6 / 7 | .01305 / **.01105** | n/a | both keep eye and gem | CF fragments the skin ramp into yellow/orange/red and the metal into white/blue. PL maps skin to white/orange/orange. **PL is more coherent; the point metric favors CF.** |
| knight 2-frame K8 | 7 / 8 | .00357 / **.00194** | .316 / **.836** | PL keeps the blue eye; CF eye→gray | **CF drops the whole red tabard (to wood browns) and the blue eyes.** PL keeps red `#af2d3f` and blue. CF keeps more metal and wood shading. |
| 2-frame churn | 0 of 531 / 0 of 531 unchanged coords | — | — | — | Shared palette and zero fixed-coordinate churn in both. Moving region only, no dither. |
| hue EDG8 Off | 8 / 8 | .02608 / **.02275** | — | — | 272 of 1,024 pixels differ. CF-RGB has the lowest RGB MSE. Each matcher wins its own metric. |
| glow K4, CF **Keep** | 3 / 4 | .00438 / **.00264**; alpha-weighted .00700 / **.00323** | 0 / .341 | — | Both preserve every alpha byte, and **both spend a slot on the green spill.** PL loses the pale core; CF keeps it. CF Cut128 removes 360 faint pixels by design. |
| spill K3, CF **Keep** | 2 / 3 | .00298 / .00132 | .710 / .978 | — | **CF turns the 16-px opaque pale core bright green `#00ff40`.** PL flattens everything to one orange. Both waste a slot on alpha-1 green. CF Cut128 is exact. |

Alpha: the service changed no alpha byte in any case, and neither did CF Keep. The service
`n_colors` field again counts RGBA variants: 9 reported versus 3 visible RGB for the glow.

**Strength calibration (hue ramp, EDG8, 4×4).** Pixels changed relative to each product's own
Off:

- PL: s2 changed 249 and s8 changed 263, nearly saturated. Both **raised** PL's tone error over
  its Off, from .01601 to .01702 and .01672.
- CF: strengths 10→100 changed 23→392 pixels and lowered tone error monotonically, from .01317
  to .01065.
- By changed-pixel count, PL s2 is closest to CF 60 and PL s8 to CF 70. By tone error, no CF
  strength resembles either PL setting, because every CF strength has lower tone error.

**Native strengths are not calibrated equals, and one scalar cannot map them.** Visually, PL
confines texture to region borders, while CF at 50 or more spreads the mixture across regions
(`sheets/hue.png`).

**Bytes and latency:**

- Native PNG size: CF indexed PNGs are smaller in every case, for example 212 vs 290 B and
  248 vs 409 B. This is largely representation, not texture quality.
- Service latency: REST takes 273–6,275 ms. The two partial-alpha requests were the slowest at
  4.4 s and 6.3 s. MCP took 5.2 s end to end.
- Local compute: CF conversion takes 0.02–0.66 ms (Auto, subset and quantize) and Node PNG
  encoding about 15 ms.
- Comparability: these are different environments. This is not a phone or browser performance
  comparison, and service network time and local compute are not ranked together.

## 5. Findings

| # | Severity | Settings | Expected | Actual | Proposed fix |
|---|---|---|---|---|---|
| S1 | **Medium** (opt-in Keep; spec-conforming) | Palette, Opacity **Keep**, Auto + Max colors 3 (also 2), `spill-alpha1.png`. Same mechanism for any cap on a preset under Keep. | Invisible pixels should not take palette slots from visible ones. | `effectiveAlphaCut('keep')` = 1 and equal per-pixel weight (palette-generated.js:60, palette-limit.js). Cap 3 picks `#00ff40` from 508 alpha-1 pixels over the visible core `#fff3b0`. Oklab nearest then paints the **opaque** core green (`sheets/glow.png`, `extras.json`). Cut mode is unaffected. The spec (design doc lines 25–27) explicitly says Keep adds no alpha weighting. | Under Keep only, weight Auto accumulator and subset histogram mass by alpha/255; matching stays unweighted. Requires a spec change and tests: spill Keep cap3 keeps `#fff3b0`; glow Keep output reviewed; all Cut outputs byte-identical. Not a competitive gap, since the service fails similarly; it is a correctness-of-intent issue. |
| S2 | Medium (quality tradeoff, not a correctness bug) | Auto + Max colors 4–8 on the held-out knight, single or two-frame | A small cap might keep at least one representative of a large, saturated region. | Red cloth (24 px, 3 shades) is absent until cap 9, the 2-px blue eye until cap 13 and the gem not even at 14 (`extras.json`). PL K8 keeps red and blue. CF has lower point error in every one of these cases. | No code change from one fixture. This is a new held-out hypothesis for the deferred lock or hue-coverage research: "a whole chroma cluster above N pixels disappears" as a regression gate. Strength of the current design: CF K16 is near-lossless while PL K16 rewrites source colors. |
| S3 | Low (opportunity) | Fixed EDG8 / PICO-8, Oklab nearest | One material should read as one hue ramp. | Per-pixel nearest splits skin across yellow/orange/red (EDG8) and puts an orange column in the face (PICO-8). PL is more coherent on the same input. | None now. This is the concrete artist-visible problem Smart claims to solve, and it should be used in the human Smart test. |
| I1 | Info | MCP versus REST knight K4 | — | Bit-identical | — |
| I2 | Info | Service K4 / K16 / two-frame K8 | — | Under-fills: 3 / 15 / 7 colors | The app's "up to" wording remains correct for both. |

No app correctness defect was found in membership, alpha byte preservation (Keep), dimensions,
or frame churn. All local outputs have 0 target violations and no dimension changes, and Keep
has 0 alpha changes.

## 6. Website

The built-in browser was opened at `https://www.pixellab.ai/create?tool=reduce_colors`. It
redirected to `/signin?redirect=/create?tool=reduce_colors`, showing Google, password, magic
link and SSO options. Per policy, no sign-in was attempted, and the tab was closed. No website
output was produced in this run. The four retained website downloads still apply only to their
exact settings.

**Human interaction needed only if a website case is wanted:** sign in to PixelLab in the Claude
desktop built-in browser pane, for example by magic link. The highest-value missing website
case is partial-alpha output: upload `fixtures/glow-alpha.png`, Number of colors 4, None, then
Download image.

## 7. Smart colors (beta): research decision

There is no official existing-image surface:

- REST: `smart` exists only in `TargetPalette` on `/generate-image-v2` (new art) and
  `/animate-with-text-v2`, which refuses it. `/reduce-colors` forbids extra fields.
- MCP: 0 of 117 tools expose smart.
- Docs: no reducer documentation mentions it.
- Extension: only the locally modified install exposes existing-image Smart, through a private
  transport, which was not reimplemented.

**Existing-image Smart is human-deferred: not tested and not disproven.** No Smart request was
made this run.

**Decision: insufficient evidence.** Two observations motivate a human test:

- S3 shows a real, repeatable fragmentation problem in nearest-color fixed-palette recoloring.
  That is the claimed Smart benefit.
- Integration would still need a public endpoint for existing pixels, upload consent, credential
  ownership off the browser, 15–60 s latency, cost, cancellation and single-frame-only semantics.
  Those conflict with the local and animated product.

Do not integrate unless the human test shows clear semantic wins without geometry or alpha
changes.

**Human Aseprite procedure.** Use extension 0.4.130 as installed, and record that its provenance
is a modified v0.4.119 checkout.

1. Open a duplicate of `bench/claude-audit-2026-10-15/service/fixtures/knight-a.png`. It is
   24×24 RGBA with PNG SHA-256 recorded in `fixtures/manifest.json`. Optionally also use the
   retained armor and item sheet.
2. Load the target as a palette from `fixtures/target-edg8.png`. Repeat with
   `target-pico8.png`. Keep swatch order fixed.
3. On one frame with dither Off, run **Reduce colors, Use Palette**, normal mode. Export a
   native PNG at 1×.
4. On the same original frame, run the same mode with **Smart colors** on. Export a native PNG
   at 1×.
5. Record the extension version, every control, elapsed time, the reported cost and any error.
6. Repeat Smart once only if cost is acceptable. Otherwise mark repeatability as untested.
7. Hand the PNGs back. They can then be compared offline with the same Sharp metrics as
   `local.mjs`: target membership, alpha, dimensions, per-material hue coherence on
   skin/metal/cloth/wood, eye/gem/specular survival, against CF Oklab and RGB.

## Reproduction

| Script | Calls the service? | Purpose |
|---|---|---|
| `probe.mjs` | Yes, free only | Schemas, docs hashes, MCP list, before-balance written once |
| `fixtures.mjs` | No | Writes and checks the owned fixtures |
| `live.mjs` | **Paid** | Each case submitted at most once; retained responses are skipped. Responses are sanitized: Authorization redacted, base64 and URLs omitted. |
| `local.mjs` | No | Colorfetti outputs, `results.json`, contact sheets |
| `extras.mjs` | No | Cap sweep and spill tests |
| `verify.mjs` | No | Sharp format check, hash and billing reconciliation, secret scan |

The secret scan covered 87 files, including this report, and found **0** files containing the
credential value. No value or fingerprint was printed.

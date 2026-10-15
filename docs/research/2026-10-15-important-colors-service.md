# Important colors at small budgets: paired service evidence

October 15, 2026. Research only; no production change or integration. This report
uses public service behavior and native PNG outputs. It does not infer a private
algorithm from its results.

## Decision and scope

**The gap is real, but neither proposed automatic priority rule closes it safely.**
PixelLab sometimes keeps a meaningful color family that current Colorfetti removes.
Colorfetti sometimes preserves exact colors and details the service changes. The
two research candidates still miss important colors and introduce visible losses.
There is no universal winner and no justification here to change the default.

This is one reviewer's evidence. The independent challenge and consolidated study
make the final acceptance decision. Source artwork and regions were frozen by a
different reviewer before any candidate or service output.

## Surfaces and settings verified

Public contracts were refreshed live at 2026-10-15 14:47 UTC:

- [Official REST schema](https://api.pixellab.ai/v2/openapi.json): the reducer accepts
  images, an optional number of colors **or** palette image, ordered dithering and
  dithering strength. No existing-image important-color lock or priority control
  is exposed by this operation.
- [Official MCP documentation](https://api.pixellab.ai/mcp/docs): `reduce_colors`
  provides the equivalent number/palette-image choice, shared across frames, and
  ordered dithering. The authenticated live tool list agreed with those controls.
- [Official API index](https://api.pixellab.ai/v2/llms.txt) links the reducer and
  machine-readable reference. A text-to-image palette option is not evidence of
  existing-sprite recoloring capability.

The REST and MCP schemas, fetch status and timestamp are retained in
`bench/important-colors-service/contract.json`. New output testing used **REST**;
this report does not claim those outputs were generated through the website or
MCP. The earlier retained MCP knight K4 operation matched its retained REST output,
but that single repeat does not establish general determinism or surface parity.

Every new request used dithering `none`. Three inputs each received number-of-color
requests at 4 and 8; the inventory and bucket also received the same ENDESGA 8
palette strip used locally. Number and palette image were never combined. The
fixed target comparisons are unrestricted use of those eight available colors,
not an additional hidden reduction setting.

## Frozen paired cohort and reproducibility

The new inputs are CC0 Kenney artwork, with exact crop/assembly provenance,
licenses, hashes and predeclared important regions in
`bench/important-colors-review/manifest.json`, which also supplies the credits. They are:

1. A heterogeneous 96×48 inventory assembled in 24-pixel cells from seven 16×16
   sprites and one 24×24 pilot, preserving all native pixels.
2. A 16×16 water bucket with cyan/blue water inside warm materials.
3. A 16×16 archer whose green headband and face are distinct materials.

The exact eight requests and source hashes were frozen in `cases.json` and
`fresh-freeze.json` **before** calls. Five earlier comparison configurations are
also retained: synthetic knight K4, K16, shared two-frame K8, PICO-8 and ENDESGA 8.
No duplicate paid request was needed for those five.

Local paired outputs use the unchanged production Auto, subset, quantize and PNG
encoding modules. Both Oklab and RGB matching are included, Cleanup and dithering
are Off. The local pipeline uses Keep with eligibility 1; every source here has
only alpha 0/255, making Cut128/Keep eligibility and output opacity identical.
No candidate opacity weighting is involved.

Sharp independently decodes source and output PNGs. RGB and Oklab errors are
computed independently of the app's tables. Regional output colors are measured
at the **predeclared source coordinates**, not merely by whether a palette contains
the desired hue. The neighbor-distinctness fields are descriptive and are not a
semantic detail-preservation oracle.

Scripts under `bench/important-colors-service/`:

| Script | Purpose | Billed? |
| --- | --- | --- |
| `probe.mjs` | Public schema, live MCP tools/list and balance | No image operation |
| `prepare-retained.mjs` | Five exact retained operations | No |
| `prepare-fresh.mjs` | Freeze eight independently selected paired requests | No |
| `live.mjs` | At most eight new reductions; skips retained response records | **Yes** |
| `compare.mjs` | Current outputs, independent metrics, native/enlarged sheets | No |
| `candidate-pairs.mjs` | Candidate PNGs against the same service outputs | No |
| `verify.mjs` | Hashes, PNG dimensions/alpha, budgets/targets, billing, secret scan | No |

Do not rerun preparation against already collected evidence: it would rewrite the
freeze timestamp. The scripts are reproducible acquisition steps, not commands
needed to inspect retained results.

## Direct output findings

The contact sheets have a native 1× row and a nearest-neighbor enlargement over
neutral gray. Ordinary sheets list **source, PixelLab, current Oklab, current RGB**.
Candidate sheets list **source, PixelLab, current Oklab, concave, hue**.

| Same input/settings | PixelLab | Current Colorfetti | Practical implication |
| --- | --- | --- | --- |
| Bucket K4 | Keeps blue water on all 22 blue source pixels; cyan highlight becomes gray | Oklab makes all 30 water pixels gray. RGB retains the 22 blue pixels. | A clear default-matching weakness; RGB is a useful existing alternative in this exact case. |
| Bucket K8 | Keeps the 8 cyan highlight pixels and 22 blue water pixels | Both matchers keep blue but turn the 8 cyan pixels gray | More palette slots do not guarantee retaining a material's accent. |
| Inventory K8 | Keeps all 55 purple hood pixels purple, and the green headband green | Oklab turns 45 hood pixels brown and 10 gray; RGB turns all 55 gray | Meaningful material hue can lose to several shading families under a shared budget. |
| Inventory K8, water | All 30 water pixels become pale gray-blue | Oklab loses blue; RGB retains 22 blue pixels but loses the cyan highlight | The service also loses meaningful families; its results are not a preservation oracle. |
| Archer K4 | Coherent green headband, but simplified face/body | Oklab retains 19 green pixels but maps 3 bright headband pixels to face color. RGB keeps all 22 green. | Coherent materials and per-pixel nearest error are different goals. |
| Archer K8 | Uses 7 visible colors and makes small source-color changes | Both matchers preserve all 8 visible source colors exactly | Current exact-color behavior is a strength to protect. |
| Bucket fixed ENDESGA 8 | Same visible RGB and alpha as current Oklab | Same output | No gap on this paired fixed-target case. |
| Retained knight shared K8 | Keeps red tabard and blue eyes; loses other shading and the green gem | Oklab drops red and blue, retaining more wood/metal shading | Confirms the earlier accent loss independently of the new real-art cohort. |
| Retained knight K16 | Rewrites/merges some source colors | Almost lossless, 99.7% exact source retention | Protect the higher-budget near-lossless path. |

Point Oklab mean squared error for the eight fresh comparisons:

| Case | PixelLab | Current Oklab |
| --- | ---: | ---: |
| Inventory K4 | .011627 | .009229 |
| Inventory K8 | .005575 | .003117 |
| Inventory ENDESGA 8 | .015995 | .013708 |
| Bucket K4 | **.006012** | .006471 |
| Bucket K8 | .001107 | **.000269** |
| Bucket ENDESGA 8 | .013255 | .013255 |
| Archer K4 | .005089 | .002567 |
| Archer K8 | .000060 | **0** |

Those numbers **do not rank artistic quality**. The inventory K8 and bucket K8
examples show that a lower whole-image error can accompany an important lost hue.
Several service outputs underfill the requested limit (3 visible colors for K4,
7 for K8); do not interpret their point errors as an equal-used-color-capacity
comparison. Both products obey the requested maximum. The service's public
description of an exact number is not borne out as an exact visible RGB count by
every transparent example here.

## Research candidates versus the same service PNGs

The frozen rules under evaluation modify subset selection only: concave RGB
frequency weighting and a small balanced-hue contribution. They do not receive
region labels or the meaning of eyes, water or clothing.

`candidate-pairs.json` independently verifies the local baseline for all eight
fresh service comparisons. Visible RGB and every alpha byte match the candidate
harness. Fully transparent RGB is normalized only for that equality check:
indexed PNG decoding can expose a palette entry's hidden RGB, whereas the raw
research buffer zero-fills invisible pixels. No visible pixel is normalized.

Meaningful paired tradeoffs seen in native/enlarged sheets:

- **Hue rule, inventory K8:** restores the purple hood, but the 19 green headband
  pixels become gray (`#8b9bb4`). Current keeps those green (`#346547`). It trades
  one intentional material for another; the service keeps both in this case.
- **Concave rule, bucket K4:** still fails to restore blue water, and makes all 47
  previously warm light/mid bucket pixels gray or white. Its regional water error
  improves numerically while the bucket loses its material identity.
- **Both rules, bucket K8:** retain the current loss of the eight cyan highlight
  pixels; the service preserves them.
- **Both rules, archer K4:** neither restores the three green highlight pixels to
  green. Other changes cannot be called a fix for that loss.

These are reasons to reject a blanket default replacement, even when aggregate
counts or a few restored accents look favorable. No threshold or setting subset
was tuned after viewing outputs to hide these failures.

## Cost, performance and verification

Eight new reductions succeeded. Each charged 0.1 subscription generations:
**0.8 total**, matching the before/after balance delta within floating-point
precision. USD credits did not change. No error retry or additional paid operation
was made. The request records preserve exact source hashes, settings, status,
latency, reported color count, output hashes and usage; credentials and image
base64 are never stored in those records.

REST wall times were 463–8,212 ms. This includes network and service work and is
not comparable to a browser's local kernel timing. Mobile/browser research timing
and built-app verification belong to the consolidated study; this report's local
pipeline is Node, not a full UI/import/export test.

`verification.json` initially verified 42 paired native PNGs, 55,921 assertions
(mostly per-pixel alpha equality), source hashes, dimensions, maximum counts,
target membership, reconciled billing and zero owned-file secret matches. Later
candidate artifacts are checked separately by `candidate-pairs.mjs` and rescanned
by the final verification run. The large assertion count is not a count of
independent test scenarios.

## Limits and remaining opportunity

Only three new real inputs were billed, all binary-alpha art; the inventory is an
assembled shared-budget stress case. No fresh service partial-alpha, dither,
animation, website-generated or Smart operation was claimed. The retained knight
has two equal-duration frames; that does not establish variable-duration parity.
Source-coordinate regions are independently selected but their semantic intent
is a review judgment. There was no blinding of this service review.

The demonstrated opportunity is retaining meaningful material families while
avoiding replacement of another equally important family. Automatic frequency or
hue balancing alone has no knowledge of importance. A future explicitly scoped
manual protection workflow could express artist intent, but it needs separate
mobile interaction and palette-budget design; this evidence does not authorize
that implementation or another control now.

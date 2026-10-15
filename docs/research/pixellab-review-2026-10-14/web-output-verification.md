# Verified PixelLab Creator outputs

On October 14, 2026, broader native UI inspection obtained four actual website
PNG downloads. This supersedes the earlier blanket statement that website output
was unverified, for the specific cases below. It does not retroactively establish
what happened in earlier attempts.

Testing used the existing authenticated Edge profile with Chromium's sandbox
enabled. No login assistance or additional account permission was needed. The
Generate button was enabled, inside the viewport, accepted trusted pointer/click
events, and its center hit the button rather than an overlay. A
[button-only capture](../../../bench/palette-service-research/web-output-verification-generate-target.png)
retains the clicked target without a private-gallery screenshot.

## Owned source and downloaded pixels

Every successful job used the same owned 64×32 opaque gradient,
[api-input-gradient.png](../../../bench/palette-service-research/api-input-gradient.png).
Its decoded RGBA SHA-256 is
`04be2749b7b9b4cc96c8132d41606f4982e638698d2f7fea914c641a8bcf1e4c`.
The source contains 64 visible colors and 2,048 fully opaque pixels.

| Attempt | Website controls | Observed result |
| --- | --- | --- |
| 1 | Number of colors 2; None | Native 64×32 PNG with two RGB colors: `#bbbbbb` (1,088 pixels), `#383838` (960 pixels) |
| 2 | PICO-8; Max colours 8; 4×4; strength 5.0 | Client validation error; no second processing request or new output attributed to this attempt |
| 3 | PICO-8; Max colours 8; None | Native 64×32 PNG with six visible colors, all exact PICO-8 members and within the requested maximum |
| 4 | PICO-8; no maximum; 4×4; strength 5.0 | Native 64×32 PNG with six visible colors, all exact PICO-8 members; different pixel arrangement/counts from attempt 3 |
| 5 | PICO-8; Max colours 2; None | Native 64×32 PNG with exactly two PICO-8 colors: `#c2c3c7` (1,088 pixels), `#5f574f` (960 pixels); the cap binds compared with attempt 3's six colors |

All four downloaded PNGs preserve source dimensions and every source alpha value.
This source is opaque, so these checks do **not** establish website behavior for
partial alpha or transparent backgrounds. The third and fourth attempts differ in
both cap and dithering; their pixel difference alone does not isolate dithering's
effect under otherwise identical settings. Website strength 5.0 is not assumed to
equal Colorfetti strength 50%.

Downloads, in order:

- [Two-color reduction](../../../bench/palette-service-research/web-output-verification-download-0.png): RGBA SHA-256 `0dab48e207c2bafbe164ab996eb67bf4eedee2fc8cb271d56a7a7ccdb29ec648`.
- [PICO-8 with maximum eight](../../../bench/palette-service-research/web-output-verification-download-1.png): RGBA SHA-256 `cddfdd9648526c4ffb8c9ba963cf96dc581758a1c896304a572879aa58ad1ce8`.
- [PICO-8, 4×4 and strength 5.0](../../../bench/palette-service-research/web-output-verification-download-2.png): RGBA SHA-256 `9180b3a6258f1f273ae684a9e49fbe1108728620b4747481e665bf485335cdc4`.
- [PICO-8 with a binding maximum of two](../../../bench/palette-service-research/web-output-verification-download-3.png): RGBA SHA-256 `3e118f4a244e54f6eb4b05df10a34e9c65e9ebd009b82c619a17c5dae495470f`.

The [independent PNG metrics](../../../bench/palette-service-research/web-output-verification-metrics.json)
retain exact histograms, hashes, dimensions, alpha comparisons, palette membership
and the cap check. No screenshot or canvas re-encoding substitutes for these native
download bytes.

## Important compatibility restriction

Attempt 2 displayed this transient status message, captured at five seconds:

> Dithering works with the palette's colours alone: turn off dithering, or Smart colours and Max colours

The message prevented that configuration from reaching a processing endpoint.
Turning dithering off allowed the target-plus-cap job. Removing the maximum allowed
the target-plus-dithering job. Thus the observed website does not accept this
specific combination of PICO-8, maximum eight and ordered dithering. Colorfetti's
separately tested cap-plus-dithering workflow is a useful capability to retain.
This warning may explain some earlier target/cap/dither attempts; it is not proven
to explain every earlier unsuccessful observation.

## Processing and output surface

Successful clicks produced `POST /quantize-image/background` with HTTP 200,
`GET /background-jobs/[id]` polling and completed status, followed by Creator image
publication. The current result opened a main working view with **Download image**,
**Download 3x upscaled** and **Gallery view**. The primary native Download image
action produced the PNGs above. The uploaded sidebar preview remained the original
input; it was not the result display. No additional gallery-card count was needed
to establish completion.

The earlier focused network filter matched reduce/generate/process names and
missed the actual **quantize-image** route. The wider endpoint/status observation
and main working-view inspection therefore resolve two material observation gaps.
No frontend source inspection or decompilation was used.

Five attempts were made in this follow-up: four successful processing jobs and one
explicit client rejection. The button advertised 0.1 generations per attempt, but
no billed usage was verified. Captured top-level processing/job metadata contains
status and identifiers rather than an observed billed amount; no charge is inferred
from clicks or completion.

## Remaining limits

These website outputs cover one opaque still source, numeric reduction, one built-in
target with a cap, and 4×4 dithering without a cap. They do not verify website 2×2 or
8×8 output, strength calibration, multi-frame/shared cap output, animation, native
transparent/partial-alpha export, imported-target output or upscaled downloads.
API/MCP evidence remains separate. No product feature was implemented during this
verification.

The [sanitized UI/network observations](../../../bench/palette-service-research/web-output-verification-evidence.json)
and [bounded native diagnostic](../../../bench/palette-service-research/web-output-verification.mjs)
retain controls, generic working-view actions, notices, pointer events, aggregate
counts of data-image mutations matching the owned source dimensions, and processing
endpoint statuses. Repeated intermediate samples and unrelated mutation details
were omitted from the published evidence. They exclude authentication material,
query strings, private-gallery images and gallery prompt text.

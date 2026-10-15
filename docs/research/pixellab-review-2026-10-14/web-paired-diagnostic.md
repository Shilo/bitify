# Focused website preview diagnostic

**Updated status:** [Four later native website downloads are verified](web-output-verification.md). This document preserves the earlier access/source-preview investigation; its unresolved status is historical. The generated result appears separately from the uploaded source preview.

On October 14, 2026, the existing authenticated Edge profile reached the reducer.
Chromium's sandbox was enabled. This bounded follow-up tested a different
explanation for the earlier unverified submissions: the tool might modify its
existing uploaded preview in place rather than add a new gallery card.

The owned 64×32 gradient fixture imported successfully. Its reducer-sidebar preview
was a data-backed image with 64 visible RGBA colors. The selected controls were
**Number of colors: 2**, **Dithering: None**, and **Auto-add: Off**. The sole Generate
button was enabled. One ordinary locator click was made, with the advertised cost
of 0.1 generations; no charge is inferred from that click.

The same sidebar image was sampled before the click and after 5, 10 and 15 seconds.
Every sample retained 64×32 dimensions, 64 visible colors and pixel SHA-256
`04be2749b7b9b4cc96c8132d41606f4982e638698d2f7fea914c641a8bcf1e4c`.
No sidebar canvas appeared, no download occurred, and no request whose pathname
contained reduce, generate or process was observed. The reducer sidebar showed no
new validation warning; it contained no native form element to validate.

This rules out a two-color reduction silently replacing **that uploaded sidebar
preview** during the observation window. It does not rule out another output area,
an unobserved client-side surface, later completion, or a differently named network
route. No account details, private-gallery images, credentials or login URLs were
captured. No website-generated output was obtained, so website export pixels and
billing remain unverified. No further Generate attempt was made.

The retained [machine-readable observations](../../../bench/palette-service-research/web-paired-diagnostic.json)
contain only reducer controls and sidebar image statistics. The
[focused diagnostic script](../../../bench/palette-service-research/web-paired-diagnostic.mjs)
uses the existing local profile and enforces a one-submit bound; it performs no
sign-in automation.

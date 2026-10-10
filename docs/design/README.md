# Bitify: Floating islands

October 9, 2026. The user approved Floating islands as the sole application design.
Implemented in the isolated `codex/glasskit-prototypes` worktree.

[Try the app](http://127.0.0.1:5188/) or [open the screenshot gallery](gallery.html).
Run `npm ci` then `npm run dev -- --port 5188 --host 127.0.0.1`.

The full window is a continuous checker canvas with distinct subdued light/dark shades. Images have no separate backing,
4px insets and 12px gaps. Colors/Palette and comparison/Style are two editing islands;
Import and Export share a top-right file capsule; Remove all stays at the far left on every loaded layout. Image-action capsules use the opaque theme surface, with
opaque hover/focus ink. Panels reserve space and refit the images.

Checker cells follow 16 source pixels at the median display scale; very dense intervals
are grouped. There are no grid settings or alternate design modes. Existing normal
`bitify` preferences and first-visit help remain. The checker does not change exports.

- [Current numbered refinements, research and final review](2026-10-09-numbered-refinements.md)
- [Adoption, adversarial review decisions and validation](2026-10-09-floating-islands-adoption.md)
- [Current validation and historical exploration checks](validation.md)
- [Glass readability research](2026-10-09-glass-readability.md)
- [GlassKit source audit](2026-10-09-glasskit-library-audit.md)
- [Apple/UI research and critique](2026-10-09-glass-canvas-research.md)
- [Original interface and migration audit](2026-10-09-current-ui-migration.md)

Earlier research and screenshots retain the proposals considered before adoption.
Their former Designs picker, alternate dock/rail layouts, optional backgrounds and
sample loader are removed from the live app. Prototype query parameters now load the
same sole design. The normal URL is the current implementation.

`npm test`: **235 tests in 16 files pass**. Production build passes. Real Safari/iOS,
OS accessibility settings and physical touch gestures remain device checks; generated
QA fixtures establish CSS geometry/cascade behavior, not hardware behavior.

Archived theme correction: [dark](mockups/theme-consistent-dark.png) and
[light](mockups/theme-consistent-light.png). Both use one shared themed UI material;
the prior shared middle-gray canvas screenshots are archived comparisons.

The archived default-material comparison uses [default dark glass](mockups/glasskit-default-dark.png)
and [default light glass](mockups/glasskit-default-light.png), superseding the 94% experiment.
The [white/black artwork stress test](mockups/glasskit-default-contrast-stress.png) demonstrates
why the user approved a local opaque surface for image actions.

Earlier protected-action comparison: [dark](mockups/opaque-actions-dark.png) and
[light](mockups/opaque-actions-light.png). Default GlassKit materials remain elsewhere.

Earlier compact controls: [dark](mockups/consistent-palette-dark.png) and
[light](mockups/consistent-palette-light.png). The Palette name no longer stacks a
second material over its panel. Editing islands, panels and chooser use one card material.
The small destructive text row inside More uses opaque GlassKit error colors for contrast.

[Compare three Import/Export layouts](import-export-layouts.html): top-right horizontal
pair (recommended/live), bottom file island, and right-edge vertical pair. The comparison
supports light/dark, phone sizing and sample panels; file actions are illustrative only.
Earlier controls and native feedback: [research and final checks](2026-10-09-control-geometry-and-native-feedback.md),
[dark desktop](mockups/uniform-empty-desktop-dark.png), [light desktop](mockups/uniform-empty-desktop-light.png),
[small phone](mockups/uniform-empty-small-phone-dark.png), [native Reset](mockups/native-reset-phone-dark.png),
and [native selection toast](mockups/native-selection-toast-phone-light.png). The modal has a scoped
contrast guard; the remaining native glass materials are preserved.

# Bitify: Floating islands

October 9, 2026. The user approved Floating islands as the sole application design.
Implemented in the isolated `codex/glasskit-prototypes` worktree.

[Try the app](http://127.0.0.1:5188/) or [open the screenshot gallery](gallery.html).
Run `npm ci` then `npm run dev -- --port 5188 --host 127.0.0.1`.

The full window is a shared middle-gray checker canvas. Images have no separate backing,
4px insets and 12px gaps. Colors/Palette and comparison/Style are two editing islands;
Download floats independently. Small labels and actions use stronger material, with
opaque hover/focus ink. Panels reserve space and refit the images.

Checker cells follow 16 source pixels at the median display scale; very dense intervals
are grouped. There are no grid settings or alternate design modes. Existing normal
`bitify` preferences and first-visit help remain. The checker does not change exports.

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

`npm test`: **212 tests in 12 files pass**. Production build passes. Real Safari/iOS,
OS accessibility settings and physical touch gestures remain device checks; generated
QA fixtures establish CSS geometry/cascade behavior, not hardware behavior.

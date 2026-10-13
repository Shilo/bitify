# Colorfetti: Floating islands

October 9, 2026. The user approved Floating islands as the sole application design.
Implemented in the isolated `codex/glasskit-prototypes` worktree.

[Try the app](http://127.0.0.1:5188/) or [open the screenshot gallery](gallery.html).
Run `npm ci` then `npm run dev -- --port 5188 --host 127.0.0.1`.

The full window is a continuous checker canvas with distinct subdued light/dark shades. Overflowing artwork gives outer editing shells an opaque theme surface; nested controls retain glass. The empty workspace has an expanded Add images action and no note card. Images have no separate backing,
4px insets and 12px gaps. Colors/Palette and comparison/Style are two editing islands;
Add, Save and Remove all share a bottom-right file capsule beside More; editing controls sit bottom left. The top bar and brand are removed; whole groups wrap on small phones. Remove all requires confirmation. Image-action capsules use the opaque theme surface, with
opaque hover/focus ink. Panels reserve space and refit the images.

Checker cells follow 16 source pixels at the median display scale; very dense intervals
are grouped. The checker anchors after collection/viewport changes and remains fixed through scrolling and panel refits. There are no grid settings or alternate design modes. Existing normal
`colorfetti` preferences and first-visit help remain. The checker does not change exports.

- [Current tasks23–31, bottom workspace, research and final verification](2026-10-10-bottom-workspace.md)
- [Earlier correction pass, challenged review and numbered decisions](2026-10-09-correction-pass.md)
- [Earlier numbered refinements, research and final review](2026-10-09-numbered-refinements.md)
- [Adoption, adversarial review decisions and validation](2026-10-09-floating-islands-adoption.md)
- [Current validation and historical exploration checks](validation.md)
- [Glass readability research](2026-10-09-glass-readability.md)
- [GlassKit source audit](2026-10-09-glasskit-library-audit.md)
- [Apple/UI research and critique](2026-10-09-glass-canvas-research.md)
- [Original interface and migration audit](2026-10-09-current-ui-migration.md)

Earlier research documents preserve layout decisions. The gallery retains only unbranded
layout and palette studies; obsolete branded screenshots have been removed. Alternate
design modes are absent from the live app. Prototype query parameters load the same sole design. The normal URL is the current implementation.

`npm test`: **242 tests in 17 files pass**. Production build passes. Real Safari/iOS,
OS accessibility settings and physical touch gestures remain device checks; generated
QA fixtures establish CSS geometry/cascade behavior, not hardware behavior.

[Compare three Import/Export layouts](import-export-layouts.html): top-right horizontal
pair (recommended/live), bottom file island, and right-edge vertical pair. The comparison
supports light/dark, phone sizing and sample panels; file actions are illustrative only.
Control geometry, native feedback and later workspace decisions are documented in the
linked research above. Historical measurements describe their recorded revisions.

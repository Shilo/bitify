# Circular controls, action priority and native feedback

Floating islands remains the sole live design. The work is on `codex/glasskit-prototypes`.

## Decisions and challenges

The old icon-button padding and inherited minimum widths stretched Palette/Style into
pills. Scoped border-box 44×44 dimensions and 50% radii now prevent that. Header file
actions and bottom editing islands share a 56px shell; standalone More/Clear are 56px
circles, matching the shell and wordmark height. Buttons inside islands are 44px circles.
These are two levels of geometry, not inconsistent aspect ratios. Panel content retains
natural height, and compact image accessories retain their existing smaller dimensions.

Import is the highlighted action when empty. After importing, Export takes the highlight
and Import becomes neutral, without moving either action. Apple recommends using style
for important actions, and Material describes filled icon buttons as high emphasis.
This state handoff is our judgment for Bitify, not a mandated placement or exact platform
pattern. It keeps Palette/Style neutral and avoids multiple competing action colors.
The centered empty CTA repeats the same Import action for onboarding discoverability.

The CTA is now **Import images**, with the same existing import glyph as the header and
Help. Drop/paste and device privacy instructions live in a separate native `.glass-status`
notice. Full foreground improves small instruction text. The example fits around measured
text and the asynchronously loaded caption. Short portrait screens compact typography
and shrink the example, while preserving the 56px CTA and a readable caption.

Reset now uses the native `.glass-modal-overlay`/`.glass-modal` header, body, footer and
actions inside a real HTML dialog. Cancel is initially focused, Escape cancels, content
clicks stay open, and closing returns focus to More. Closing occurs before Reset's toast,
so its live status is outside the dialog's inert period. Dock pointer/Escape handlers
respect the active native dialog and no longer swallow its first button click.

Toasts use `.glass-toast`, `.is-visible`, `.glass-toast__text` and optional busy spinner,
with existing timers and busy-message priority. A scoped hidden rule handles the library's
flex display overriding HTML hidden. The installed GlassKit package is CSS; Bitify supplies
the existing behavior rather than inventing a library JavaScript controller.

## Adversarial review and valid correction

The reviewer found native Reset text contrast failed against the checker. Parent testing
also demonstrated body and Cancel fading over white artwork, so the proposed red-only
filled action would have left the larger problem unfixed. We retained the native modal
layout, gradient, blur and transparent actions, with a scoped 96% theme-surface underlay.
Body/Cancel use full foreground; Reset mixes semantic error-on-surface with foreground
(60% error ink light, 40% dark). This explicit local exception protects the blocking dialog;
editing islands and selection toasts retain their native materials. The primary gradient
also uses GlassKit's documented dark on-primary ink instead of default white for contrast.

White-art screenshot footer samples give Reset 7.34:1 dark / 8.88:1 light. Declared hover
compositing is recorded in [raw measurements](native-modal-contrast.json). These samples
and bounded calculations are not a whole-app accessibility certification. No pointer-hover
screenshot was captured for the modal. The final source review found no further proven
regression; speculative changes were not applied.

## Validation

- 220 tests in 13 files pass after review fixes; production build passes.
- Desktop1280×800, portrait320×780 and320×568, and landscape844×390 keep the Import
  action visible without empty-workspace or horizontal page overflow.
- Header and bottom shell heights are56px; inner palette/style/swap/color/file controls
  are44×44 circles. Help Close and desktop More settings also keep44×44 geometry.
- Actual CTA/header file pickers imported GIF/PNG fixtures. PNG export and an18-image ZIP
  download completed; Clear restored the empty state and disabled Export.
- An18-image phone layout with Style open fitted its panel above the dock with no
  horizontal overflow. Arrow keys produced native Palette and Style toasts, rapid updates
  replaced the text, and the toast expired/hidden correctly.
- Cancel, Escape, content click, focus return, Reset retaining the imported GIF, and
  underlying Palette-panel isolation passed browser checks. Modal fit also passed390px
  landscape height, with a248px card betweeny71 and319.
- Generated production reduced-transparency fixtures render notice/modal/toast with solid
  theme surfaces and no blur. They simulate media rules, not physical iOS/Safari hardware.
- No console warnings/errors appeared in the final production fixture.

## Primary sources

- [Apple buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [Material icon buttons](https://material-web.dev/components/icon-button/)
- [Android buttons](https://developer.android.com/develop/ui/compose/components/button)
- [GlassKit pinned CSS](https://github.com/JUNGHERZ/GlassKit/blob/aa0bc3e44cecc6be15e2c5b2ab8b0b1881fd5792/glasskit.css)
- [GlassKit examples](https://glasskit.jungherz.com/)

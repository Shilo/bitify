# Numbered interface refinements — October 9, 2026

Implemented on `codex/glasskit-prototypes`. Floating islands remains the only live design.

## Changes

1. **Checker origin:** anchored to the first image's actual top-left pixels, including object-fit letterboxing. It follows scrolling, resizing, imports, removals and header changes. Spacing remains 16 source pixels at median image scale, grouped when dense.
2. **Brand:** new static pixel B mark with Bitify beside it on desktop; mark alone on narrow screens. The wordmark uses the shared UI font.
3. **Empty header:** heading, subtitle and concise instructions now occupy their own responsive header row. Loaded images remove that row. Short phone editing views retain the heading and Import while compacting explanatory copy.
4. **Single Import action:** the top Import button expands to icon plus “Import images” when empty. The duplicate center button is removed.
5. **Stationary Export:** header button hover/focus/press states preserve position; GlassKit colors and feedback remain.
6. **Global removal:** the destructive Remove all button sits at the far left on all loaded layouts, including phones.
7. **Individual removal:** per-image removal uses the shared trash glyph. Fullscreen Close retains an X because it closes the view without removing the image.
8. **Image inspection:** click/tap or keyboard activation opens a native fullscreen dialog. A hold compares the original; movement, cancellation and multitouch suppress accidental opening. Original/Converted, Copy and Export work in the viewer, including animated GIFs. Focus returns on close. Feedback appears inside the native top layer below the measured toolbar. The reported Brave compositing flicker is not confirmed or claimed fixed.
9. **Scroll area:** the canvas scroll viewport reaches the window edge. Panel reservations, fitting and trailing padding still keep the last row accessible above editing islands.
10. **Typography/icons:** one Schibsted Grotesk UI font and a vendored, licensed Lucide outline family replace mixed control glyphs. The brand remains intentionally pixel art. Existing controls keep 44px circular icon geometry.
11. **Advanced density:** tighter label/control spacing and naturally sized choices remove excessive Rim-row gaps while preserving touch targets and narrow-screen stacking.
12. **Language:** Import, Export and Copy have distinct, consistent meanings. Privacy copy is “Images stay on your device.” Touch actions use the Image actions label rather than presenting a share sheet when no sharing occurs.
13. **Style previews:** a new representative faceted sprite with cavity and tonal detail runs through the actual conversion algorithms. All 11 default outputs differ. Names stay beside previews so an unfamiliar miniature never becomes the sole identifier.
14. **Palette previews:** inset stepped two-color samples show the actual colors; transparency previews show checker regions. The bottom transparent swatch includes a readable None label.
15. **GlassKit consistency:** preserve the shared theme/material classes, native modal/toast anatomy and existing circular geometry. Reset uses GlassKit semantic error tokens. Previously approved opaque image-action capsules and the blocking Reset contrast guard remain intentional readability exceptions.

## Research and challenged review decisions

- [Apple buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) and [writing](https://developer.apple.com/design/human-interface-guidelines/writing) support clear action names, legible labels and consistent control treatment. The empty explanation occupies a separate responsive header row instead of crowding the file toolbar.
- [Material empty states](https://m1.material.io/patterns/empty-states.html) informed the single next action and concise guidance. [Material icon buttons](https://material-web.dev/components/icon-button/) informed consistent interaction targets.
- [GlassKit documentation](https://glasskit.jungherz.com/docs.html) supplies materials, semantic tokens and Modal/Toast class anatomy; application behavior still uses Svelte and native HTML dialogs.
- [Native dialog behavior](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal) explained why feedback outside the modal top layer was hidden. [Backdrop filtering](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter) informed the compositing investigation; a still image cannot prove a browser animation defect.

Three subagents implemented separate header, canvas/viewer and dock responsibilities and cross-reviewed the implementation. Findings were checked against code and live behavior before applying corrections:

- **Accepted:** checker measurement could miss the transient empty/import branch. A real picker import reproduced the missing connection; a structural observer now reconnects and cleans up measurements.
- **Accepted:** fullscreen Copy/Export feedback lived outside the top layer. It now uses the same toast inside the viewer. Phone wrapping initially caused overlap; measured header height now positions it 8px below the toolbar.
- **Accepted:** inherited pixel rendering degraded outline icons; geometric precision now applies to the outline family.
- **Accepted:** Reset still used legacy destructive colors; it now uses the GlassKit error foreground and border tokens.
- **Accepted:** comparison holds needed focus-loss cleanup; blur clears the held preview.
- **Rejected as unproven:** a screenshot alone establishes GIF/backdrop compositing flicker or justifies replacing glass materials. No speculative blur/material change was made.

## Verification

- Final unit suite: **235 tests in 16 files pass**. Production build passes without Svelte accessibility warnings.
- New coverage checks checker letterboxing/scroll origin, tap/hold/move/cancel/multitouch semantics, wide/tall/tiny viewer fitting, and all 11 live style previews/settings/transparency.
- Browser checks at 1280×800, 320×568 and 844×390: header geometry, empty/loaded transitions, short-screen editing, panel fitting, styles/palettes/None, global and individual removal, theme switching, Reset confirm/cancel, fullscreen comparison/close/Escape/focus, and feedback placement.
- A 19-image wall scrolls to the final captions above the islands while its viewport reaches the window bottom. Measured checker origin matches the first actual image, including after import and scroll.
- Actual clipboard PNG copy succeeded. Downloaded outputs were decoded: 28×28 GIF with 8 frames, 28×28 PNG, and a 19-entry ZIP containing both animated GIF inputs.
- Final phone viewer feedback check: header bottom 132px, toast top 140px at 320×568; Copy/Export remain unobstructed.
- Console warnings/errors: none captured in the final browser checks.
- Touch/reduced-material fixtures verify CSS/media geometry, not physical touch hardware or OS settings. Real Safari/iOS and the reported Brave GPU/background flicker remain device checks.

## Current screenshots

- [Dark desktop](mockups/refined-empty-desktop-dark.png), [light desktop](mockups/refined-empty-desktop-light.png)
- [Dark phone](mockups/refined-empty-phone-dark.png), [light phone](mockups/refined-empty-phone-light.png)
- [Style previews](mockups/refined-style-previews-dark.png), [palette](mockups/refined-palette-dark.png), [None](mockups/refined-palette-none-dark.png)
- [Phone fullscreen feedback](mockups/refined-fullscreen-phone-dark.png)

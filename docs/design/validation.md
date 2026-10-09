# Prototype validation

October 9, 2026 · `codex/glasskit-prototypes` · GlassKit pinned to 1.22.2.

## Automated checks

- `npm test`: 203 tests across 10 files pass after the prototype logic/layout changes.
- `npm run build`: passes. Final styles are bundled through a single ordered
  `src/prototypes/foundation.css` so production extraction cannot reorder GlassKit's
  reset/defaults after Bitify's geometry rules.
- `git diff --check`: checked after cleanup.

## Browser workflows checked

The Codex in-app Chromium browser was used at 1440×900, 1000×720, 820×1180,
390×844, 320×568, and 844×390. Viewport changes exercised browser geometry;
**pointer remained fine, so these are responsive-size tests, not touch emulation.**

- A/B/C can switch live without losing loaded images.
- One, six, eighteen and zero images were loaded through the real decoding path.
- All eleven styles selected and rendered six preview canvases; style names reflected
  the current converted view. This is rendering verification, not new algorithm testing.
- Palette preset change, first-color None, Both colors restoration and theme changes
  work. Swatches keep ordinary native color input behavior; native color-picker dialogs
  were not separately automated.
- Editing Threshold to 100 disables Auto and returns the view from Original to converted.
  Auto restores automatic behavior. Advanced settings open and reserve measured space.
- Palette/style panels and nested chooser reserve the bottom work area; desktop rail
  reserves a horizontal work area. The scroll viewport ends before open editing controls,
  so overflowing images do not paint into that region.
- At 1440×900, Canvas dock has a 64px measured shell. With no panel the measured work
  region is x24…1416, y76…800. Desktop rail has a 250px shell at x1170…1420,
  y100…329 and leaves the work region ending at x1154. An open 340px rail inspector
  starts at x819 and moves the work region's right edge to x803.
- The short landscape chooser replaces the settings strip. In the 844×390 clear
  direction this left a 144px-high work region, enough to include image metadata;
  the previous stacked version left only 96px. Small portrait choosers scroll vertically.
- Solid controls yield `backdrop-filter: none` and an opaque material. Dot-grid selection
  changes the actual background. Reduced-motion/transparency/no-blur/forced-color CSS
  adapters exist but their browser media preferences were not emulated.
- Production preview verified comparison `review=open`, six local samples, compact dock
  button height 36px on fine pointer, visible More dialog, Help transform `none`, and
  all three composition modes.
- Default production URL has zero GlassKit classes and loads only original app CSS,
  in addition to the existing fonts. Original welcome behavior remains.

## Real exports inspected

Downloaded through the UI, then parsed using the existing encoders' format libraries:

| Output | Verified result |
|---|---|
| `armor-1bit.png` | 64×64, PNG palette color type 3, 2-bit depth |
| `bitify-animated-1bit.gif` | 28×28, 8 frames |
| `bitify (6).zip` | six files: five PNGs and the animated GIF |

Copy-to-clipboard and native mobile Share were not re-exercised in this session. Existing
handlers and unit coverage remain, but that is not an end-to-end clipboard validation.

## Evidence and limitations

23 screenshots and a contact sheet are in [mockups/](mockups/), browsable through
[gallery.html](gallery.html). GIF frames differ between captures. The in-app browser
scales wide viewport previews to its panel, so narrow previews show fine grid details
more clearly than downsampled desktop screenshots. Geometry values above come from DOM
bounds, not estimates made from the images.

No real iOS Safari or Android GPU/touch testing was available. Actual composited contrast
for arbitrary imported artwork, 200% text resizing, high contrast/forced colors, reduced
motion/transparency settings, long filename touch layouts, and low-powered-phone frame
cost still require validation before replacing the approved production design. The
smallest coarse-pointer layout gives colors a separate row so 44px targets need not be
squeezed into a 320px toolbar; it was added from geometry analysis, not a claim of a
physical-device test.

## Issues found and corrected during review

1. GlassKit's popover/toast classes expected library-specific visible state classes;
   the native Bitify surfaces now have explicit state adapters.
2. Prototype query updates were discarding review/sample parameters; they are preserved.
3. The chooser was omitted from the existing panel reservation; its bounds are included.
4. Bottom padding permitted scrolling content to paint beneath controls; prototypes
   use an actual reduced scroll viewport.
5. A chooser max-height tied to its own measured height could cause resize feedback;
   its cap now derives from the parent stack and minimum work area instead.
6. Stacked settings and chooser crowded short windows; the chooser temporarily replaces
   its settings strip there and restores it after selection or dismissal.
7. Production CSS extraction enlarged buttons relative to the dev preview; the ordered
   foundation stylesheet fixes that and keeps the baseline entry separate.

## Grouped islands and compact comparison refinement

- All three prototypes now have one style-named comparison button; clicking toggles
  original/converted while preserving its label. Verified both directions in Floating
  islands, Canvas dock and Studio rail. Space on the focused comparison button also
  toggles, with pressed state and accessible description updating.
- Floating islands has exactly three material surfaces: colors/Palette, conversion/Style,
  and Download. Children do not add blur surfaces.
- Browser checks at 1440x900, 390x844 and 320x568 show no horizontal overflow. Atkinson's
  longer name remains visible beside Style. Phone controls use two rows.
- Palette/Style panels remain clear of the image viewport. At desktop rail width the
  Style panel starts at x819 and the work area ends at x803. The compact rail is now
  168px tall, reduced from the initial exploration's 229px.
- The six main desktop/phone screenshots and comparison contact sheet were refreshed.
  Other gallery views retain the earlier exploration's control arrangement.
- Production build passes without Svelte accessibility warnings. These checks use desktop
  pointer behavior at phone dimensions; physical touch/Safari remain unverified as above.

## Old design comparison

- Designs includes Old design beside the three GlassKit directions. Verified switching
  to it and back retains all six image names, both colors, selected style and the
  original/converted comparison state.
- Old design has zero GlassKit component classes, no full-window grid, 16px tile gaps,
  8px canvas inset, and the existing two-button view switch. Inline prototype dock
  clearance is removed so the existing responsive CSS supplies 132px desktop or 172px
  phone clearance. The original Style panel measured 102px, with 112px reserved clearance.
- Verified no horizontal overflow at 390x844 and compared the picker at 1440x900.
  Its grid/material options are disabled in Old design and available again in glass modes.
- Opening `?prototype=legacy` directly initializes the same old interface with Designs
  available. The ordinary URL and its preference storage remain separate.
- Production build passes. This refinement has not received physical touch/Safari checks.

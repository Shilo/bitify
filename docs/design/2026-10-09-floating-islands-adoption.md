# Floating islands adoption and adversarial review

October 9, 2026. Implemented on `codex/glasskit-prototypes`, unmerged and undeployed.

## Final design

Floating islands is the only runtime layout. Main directly imports the ordered GlassKit
foundation, app geometry and material adapter, then mounts App. Alternate entry points,
Designs UI, prototype/sample state, old comparison controls, rail styling, per-image
backings and grid-setting controls are removed. Normal `bitify` storage and first-visit
welcome remain. Archived research/screenshots are retained.

Colors and Palette share one glass island; the style-named original/conversion button
and Style share another. Download is independent. The current comparison uses GlassKit default translucent materials for
image captions/actions, header brand/count and empty explanatory text. The earlier
94% theme-consistency experiment is archived below. Main ink stays
opaque in original mode. Hover/focus strengthens tile and standalone actions.

The full-window checker follows the theme: #c5cbd1/#d2d6da in light mode,
#272e35/#323941 in dark mode. This supersedes the shared middle-gray experiment,
which weakened theme consistency. A single transparent ink can have less contrast
against a matching theme; image conversion and exports are unchanged. It paints
once on the root, including safe-area margins; body and art surfaces are transparent.
Its source-space cell is 16px at median image scale, grouped when below 8 CSS px.
It is a representative guide and cannot pixel-align every independently fitted image.
Arbitrary selected image colors can match a checker shade; no preview/export recoloring
is performed. Grid preferences can be added in a later task.

## Review findings challenged and resolved

An independent subagent audited feature behavior, code lifecycle, CSS specificity,
responsive geometry, accessibility, layout reservation and exports, then reviewed fixes.
The parent checked evidence and consequences rather than applying advice automatically.

| Finding | Assessment and decision | Commit |
|---|---|---|
| Dark theme beats opaque fallback tokens | Valid cascade defect; match themed specificity rather than increasing all glass opacity |786701b|
| Narrow no-hover captions compete with two 44px actions | Valid geometry defect; reject shrinking targets; choose an explicit stacked layout with matching 95px reserve |14bc47e|
| Theme-extreme checker conceals one default ink | Valid design problem for this request, not a WCAG image failure; use shared middle gray, no image backing/recoloring |ab09f3e|
| New checker reduces bare text contrast | Valid UI regression; compact text substrates, strong original-state and popup ink |f6dc8bd|
| Body restarts checker at a safe-area offset | Source-backed risk; eliminate duplicate painting without claiming physical-device evidence |7c2cd0c|
| Standalone actions inherit transparent/primary hover | Parent browser/source finding; use explicit opaque neutral hover/focus fills |66c45aa|

The parent also corrected an orphaned slider material binding immediately after adopting
the sole design (ca68d59), and restored a header styling block removed during selector
cleanup. Final subagent verdict: no remaining proven defect in the reviewed changes.

Stacking is selected from a compact touch fit below 192px tile width. A second fit reserves
95px and retains the explicit class even if size grows. Caption 27px + actions 52px + two
8px gaps =95px. The centered capsule is 96px wide with two 44px actions, fitting the minimum
96px tile. Wider touch tiles keep compact side-by-side captions/actions. Fine-pointer
allowance stays 35px. No continuous resize animation is introduced.

## Validation after the review fixes

- Final `npm test`: 212 tests across 12 files pass; four new regression tests cover minimum
  touch tiles, phone scrolling, second-fit threshold crossing and compact wide layouts.
- Final `npm run build` passes; dependency ordering and production rendering were checked.
- Production entry on a fresh local origin shows welcome; dismissal survives reload.
  Keyboard comparison, arrow stepping and style persistence were checked. Images clear
  on reload as specified. One image changes Download all to Download.
- All 11 styles rendered six canvases; all 12 palettes selected. Original comparison,
  threshold manual/Auto, extra setting changes and per-style reset were exercised.
- Actual UI exports parsed: 64x64 palette PNG (color type 3, 2-bit, tRNS transparency),
  28x28 GIF with 8 frames, ZIP with five PNGs plus one GIF.
- Share Copy reports success, but the browser bridge returned an empty clipboard read
  and the attempted paste key timed out. External clipboard/paste remains unverified;
  this is not evidence of a product clipboard failure. No export handlers changed.
- Eighteen real imports included a long filename and GIF. At 820x1180: four columns,
  no horizontal overflow, grid bottom 1090 and dock top 1106. At 390x844: own grid scrolls,
  no horizontal overflow. Keyboard focus reveals tile actions with opaque settled fill.
- Generated production-bundle fixtures at 390x844,320x568 and844x390 exercise coarse/
  no-hover CSS and matchMedia branches. They verify 44x44 buttons, 96x52 capsules, 27px
  captions, 95px footer allowance, and no horizontal overflow. At 320x568 with chooser,
  grid bottom 266 and chooser top 294, tile 97px.
- At 844x390 with chooser, grid height 148 cannot show a complete 191px minimum touch
  tile/footer together; it scrolls while controls remain clear. This is a physical-space
  tradeoff. Targets remain 44px.
- Reduced-transparency fixtures in both themes resolve capsules/captions/islands to
  opaque surface colors and backdrop-filter none. Final production styles retain the
  fallback specificity fix. Forced-color and unsupported-blur branches were reviewed
  in source, not claimed as OS/browser preference tests.
- Final production application logs had no runtime errors. Historical dev-tab logs
  included a Vite websocket reconnect failure; current previews were explicitly reloaded.

Reproduce simulated geometry/material fixtures with:

```sh
npm run build
node bench/design-qa.mjs
npm run dev -- --host 127.0.0.1 --port 5188
```

Open `/bench/design-qa/touch.html`, `reduced.html` or `touch-reduced.html`. The generator
uses the production bundle and rewrites simple media branches for repeatable local
checks. It also prepares 18 local import files. Generated files are ignored by Git.

These fixtures do not reproduce touch event sequences, media-query changes, iOS Safari
compositing, hardware blur cost, OS accessibility mapping, safe-area values, hybrid
pointers or the mobile keyboard viewport. Real-device checks remain outstanding.

## Evidence

[Current default dark glass](mockups/glasskit-default-dark.png),
[current default light glass](mockups/glasskit-default-light.png). The
[94% dark experiment](mockups/theme-consistent-dark.png) and
[94% light experiment](mockups/theme-consistent-light.png) are archived comparisons. The earlier
[desktop with focused tile action](mockups/floating-islands-adopted-desktop.jpg) and
[light no-hover/reduced-transparency fixture](mockups/floating-islands-touch-qa.jpg)
archive the initial shared-gray adoption.
Earlier gallery screenshots are archived comparisons, not current alternate layouts.

## Theme consistency correction

The shared middle-gray canvas and 30%/34% editing islands were rejected after user
comparison. Themed checker shades restore light/dark identity. All glass UI now aliases
one 94% surface material (#e8ecef light / #272c32 dark), including captions, header,
islands, Download and popovers; borders share the neutral line token. This intentionally
uses strongly tinted glass so readable surfaces belong to the same palette. The floating
geometry and uninterrupted canvas preserve immersion. Different underlays still create
small composite differences; no claim of identical sampled pixels is made.

An independent reviewer agreed with the subdued light palette and restored dark palette,
and challenged exact equality, transparent-ink contrast and startup theme resolution.
The parent accepted the shared material invariant and retained opaque interaction states
and accessibility fallbacks.

### Validation after theme review

- 220 tests across 13 files pass after the final review fix; production build passes.
- Eight startup cases exercise saved/system light/dark, malformed/invalid/missing settings,
  and blocked storage. Both native toolbar meta entries follow the resolved theme.
- Browser-computed caption, brand, editing-island and Download backgrounds match exactly
  within each theme: surface #e8ecef or #272c32 at .94 alpha. Main ink is opaque.
- Light Palette panel and More dialog match the light material; dark Style panel and chooser
  match the dark material. At1440x900, dark chooser top670 exceeds grid bottom642;
  light Palette panel top759 exceeds grid bottom731.
- Keyboard-focused Download settles to opaque surface/foreground mix, retaining a visible
  focus outline. Normal/hover/focus selectors remain unchanged from adoption QA.
- Production touch/reduced-transparency fixture at390x844 resolves every relevant surface
  to opaque #e8ecef in light and #272c32 in dark, with no blur and no horizontal overflow.
  Swatches/view button are46px high; Download56px. At320x568 with dark Palette panel,
  empty canvas bottom225 and panel top253 remain separate; no horizontal overflow.
- Fixture checks simulate media rules, not physical iOS or Android behavior. Theme palettes
  are deliberately subdued; no universal screen-brightness or eye-comfort claim is made.

The reviewer found no remaining proven application material inconsistency. The parent
accepted the source-backed native toolbar startup mismatch and fixed it in2656320;
intentional selection, semantic Reset, image swatches and disabled dimming were retained.

## Default-glass comparison and challenged findings

The user requested the actual GlassKit defaults as the next live test. The custom94%
material and opaque hover fills are removed. Normal rendering uses unmodified library
surface, border, blur, shadow and ink tokens. Compact Bitify geometry, pixel glyphs,
native dialog lifecycle, theme checker and opaque accessibility fallbacks remain deliberate
adaptations, so this is default MATERIALS, not untouched default component sizing/markup.

Card surfaces (islands, captions/actions, brand, panels) use white10% dark /60% light,
24px blur. Header pill material is white14%/70%,24px blur. Download's tertiary material
is card tint with16px blur. Menus and the tooltip adapter use popover14%/70%. Dialogs
use the default32-to8%/90-to50% glow gradient with40px blur. Selection and hover states
use translucent library surfaces4/5. Essential caption/main ink uses the default full text
role (#fff dark /#1a2a36 light). Native color swatches and the library range thumb are
functional fills, not added opaque UI backplates. GlassKit does not have a tooltip class;
that existing behavior is retained with its popover material.

The parent challenged an independent review:

- Accepted a real regression: the newly restored modal backdrop blur escaped the existing
  reduced-transparency reset. Commit a744572 disables it in reduced transparency and forced
  colors without changing normal defaults. Browser fixture confirms none for both filters.
- Confirmed the artwork issue with opaque white/black64x64 original fixtures in a separate
  tab. On white in dark mode, action ink is white and both capsule10%/focus16% white tints;
  the icons disappear. The gallery records this actual failure. No94% fix is hidden in the
  requested baseline. A follow-up could place actions over checker alongside metadata, or
  use an appropriate stronger library material/ink pair.
- Accepted default muted text as a design limitation, not a functional bug to silently fix
  during a defaults comparison. The reviewer computes light small-label contrast around
  3.3:1 over the light checker/card. A follow-up should first use the library's full text ink
  for essential small labels, preserving glass rather than making every surface opaque.

Validation after the review fix:220 tests across13 files and production build pass.
Actual browser-computed card/label/island colors equal the documented library defaults in
both themes. Focused image actions use translucent surface4, not opaque fills. Light palette
panel has24px blur; at1075x884 grid bottom715 precedes panel top743. Dark Help shows32-to8%
gradient,40px blur and12px backdrop blur. No runtime console errors were reported.

Production-bundle simulated touch/reduced fixture at390x844 has no horizontal overflow,
46px swatch/view controls and56px Download; dark surfaces resolve to opaque#272c32 with
no filters, including Help's backdrop. Light fallback resolves to#e8ecef. Normal touch
fixture resolves to white60%/24px blur; at320x568 settings remain above the canvas
(bottom269/panel top297) without horizontal overflow. These are media-rule simulations,
not physical iOS/Android or GPU performance measurements. Separate test tabs were closed
and viewport overrides reset; the main six-image preview remains ready for comparison.

## Scoped opaque image actions

After testing pure white/black source images, the user approved fully solid shared
image-action capsules. They use the existing theme surface (#e8ecef / #272c32) and full
GlassKit text ink, retaining the library border/shadow and hover/focus tint. No blur is
needed on the capsule or its children. The rule also covers touch Share/Remove groups;
caption and island materials remain the default glass comparison.

Validation and challenged review:

- 220 tests in 13 files and the production build pass before and again after review.
- Browser-computed desktop capsules are opaque rgb(39,44,50) dark / rgb(232,236,239)
  light, with no backdrop filter; editing islands remain default white10% /60% glass.
- Keyboard focus retains opaque ink and the visible outline; settled tint is white16%
  dark /75% light. Desktop download produces a file over the white-source fixture.
- Production CSS touch simulation at390x844 in both themes has no horizontal overflow,
  solid capsules and44px Share/Remove buttons. Share opens, Download saves and dismisses
  the sheet, and removing one fixture leaves the other. This is not physical device QA.
- The independent review found no valid defect. Parent confirmed the claimed cascade
  against rendered focus/material values. Calculated settled icon contrast is at least
  6.90:1 across rest/hover/focus/active in both themes; arbitrary artwork is excluded by
  the opaque capsule. The existing120ms reveal fade is preserved rather than treated as
  a new regression. Forced-color state overrides remain later than the ordinary states.
- [Dark proof](mockups/opaque-actions-dark.png) and [light proof](mockups/opaque-actions-light.png)
  replace the default-only baseline as the first gallery comparison.

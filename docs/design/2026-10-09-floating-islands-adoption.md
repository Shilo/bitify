# Floating islands adoption and adversarial review

October 9, 2026. Implemented on `codex/glasskit-prototypes`, unmerged and undeployed.

## Final design

Floating islands is the only runtime layout. Main directly imports the ordered GlassKit
foundation, app geometry and material adapter, then mounts App. Alternate entry points,
Designs UI, prototype/sample state, old comparison controls, rail styling, per-image
backings and grid-setting controls are removed. Normal `bitify` storage and first-visit
welcome remain. Archived research/screenshots are retained.

Colors and Palette share one glass island; the style-named original/conversion button
and Style share another. Download is independent. Strong neutral material protects
image captions/actions, header brand/count and empty explanatory text. Main ink stays
opaque in original mode. Hover/focus strengthens tile and standalone actions.

The full-window checker uses #717881/#868e97 in both themes, protecting dark and pale
default artwork better than theme-extreme shades. UI chrome remains themed. It paints
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

[Desktop with focused tile action](mockups/floating-islands-adopted-desktop.jpg),
[light no-hover/reduced-transparency fixture](mockups/floating-islands-touch-qa.jpg).
Earlier gallery screenshots are archived comparisons, not current alternate layouts.

# GlassKit source audit and integration plan

Date: 2026-10-09. Research-only recommendations for the design prototype worktree; this document does not authorize replacing production behavior.

## Decision

Use the CSS foundation, **`@jungherz-de/glasskit` pinned to `1.22.2`**, behind a small set of native Svelte 5 wrappers. Keep the conversion wall, image pixels and the full-window grid outside GlassKit surfaces. Apply glass to a few floating control groups and one active inspector. This fits the proposed immersive canvas while controlling contrast, clutter and rendering cost.

GlassKit is a visual CSS library, not an application framework or a complete accessible interaction system. Its buttons, inputs and surfaces can replace presentation rules. It cannot replace Bitify's state, conversion algorithms, tile fitting, gesture rules, file import/export, focus management or tooltip action.

## Sources and reproducibility

Read the landing page, full README, docs, CSS, package manifest, changelog, theme template, build script, upstream AI reference and repository/release metadata.

- [GlassKit landing page](https://glasskit.jungherz.com/)
- [Documentation and class reference](https://glasskit.jungherz.com/docs.html)
- [Repository](https://github.com/JUNGHERZ/GlassKit)
- [CSS at inspected commit](https://github.com/JUNGHERZ/GlassKit/blob/aa0bc3e44cecc6be15e2c5b2ab8b0b1881fd5792/glasskit.css)
- [Package manifest at inspected commit](https://github.com/JUNGHERZ/GlassKit/blob/aa0bc3e44cecc6be15e2c5b2ab8b0b1881fd5792/package.json)
- [Changelog](https://github.com/JUNGHERZ/GlassKit/blob/aa0bc3e44cecc6be15e2c5b2ab8b0b1881fd5792/CHANGELOG.md)
- [Theme override template](https://github.com/JUNGHERZ/GlassKit/blob/aa0bc3e44cecc6be15e2c5b2ab8b0b1881fd5792/theme-override.css)
- [Stylesheet module generator](https://github.com/JUNGHERZ/GlassKit/blob/aa0bc3e44cecc6be15e2c5b2ab8b0b1881fd5792/build-styles-js.mjs)
- [MIT license](https://github.com/JUNGHERZ/GlassKit/blob/aa0bc3e44cecc6be15e2c5b2ab8b0b1881fd5792/LICENSE)
- [Latest inspected release, v1.22.2](https://github.com/JUNGHERZ/GlassKit/releases/tag/v1.22.2)

Latest main SHA inspected: `aa0bc3e44cecc6be15e2c5b2ab8b0b1881fd5792`. The package and direct live docs both reported 1.22.2, released October 8, 2026. Search-indexed docs returned older 1.19.1 text and indexed raw CSS returned 1.22.1; direct HTTP reads verified current source. The repository description and a family description still say 24 components while current package/docs say 34. Use the pinned package and source, not indexed snippets or component-count marketing.

The MIT license permits use, modification and distribution; preserve its copyright/license notice when vendoring. This is a young, small project: repository metadata at research time showed creation March 21, 2026, 14 stars and zero forks. Those counts are context, not a quality score. Recent releases fixed hidden button behavior, disabled state presentation, input hit testing and density. The visible workflows verify builds and releases; the package does not expose a comprehensive automated interaction test command. Changelog reports Chromium and WebKit measurements, but these are not evidence of Bitify's device performance.

## Installation and delivered artifacts

For Vite/Svelte:

```sh
npm install --save-exact @jungherz-de/glasskit@1.22.2
```

```js
import '@jungherz-de/glasskit/glasskit.css';
import './glasskit-theme.css';
import './app.css';
```

Ensure intentional override order; importing legacy `app.css` last means its element selectors can still override library choices. Prefer a dedicated prototype entry while evaluating the migration. Avoid `@latest`, a live CDN dependency or a blanket edit of every legacy selector.

The manifest's main/style entry is `glasskit.css`. Published files include unminified/minified CSS, a source map, `theme-override.css`, documentation/license and `glasskit-styles.js`. No runtime dependencies are declared. The generated module exports `css`, `glassSheet`, `tokensCss`, `tokensSheet`, `componentsCss` and `componentsSheet`; it constructs `CSSStyleSheet` objects at module evaluation. Plain global CSS is the simplest appropriate integration here.

**GlassKit Elements is a separate library** of custom elements. Do not confuse `.glass-btn` CSS markup with `<glk-button>` behavior. Its Shadow DOM/form participation adds a different integration surface and is unnecessary for this Svelte app. If adopted later, verify that exact package's own source and lifecycle first.

## Replacement map

This maps visual responsibility, not a promise that adding a class reproduces existing behavior.

| Bitify responsibility | GlassKit primitive | Application-specific work retained |
| --- | --- | --- |
| Add, export, comparison, overflow actions | `.glass-pill` or `.glass-btn` plus `--auto`, `--sm`, `--primary`/`--tertiary` | Native buttons, accessible names, tooltip action, disabled state, file picker/save handlers |
| Floating control group | `.glass-card` with restrained padding, or `.glass-tab-bar--floating` material | Toolbar semantics, responsive anchoring, measured canvas clearance |
| Style or palette single choice | `.glass-segmented`, `.glass-segmented__item`, optional `--scroll` | `aria-pressed`, persisted selection, wheel/swipe/arrow behavior; do not pretend tools are navigation routes |
| Style-setting chips | `.glass-badge--interactive`, `.glass-badge--selected` | Real buttons, current value and pressed state |
| Inspector surface | `.glass-card` or `.glass-sheet--inline` | Nonmodal panel state, title, close button, scroll containment and image reflow |
| Anchored overflow menu | `.glass-popover`, `.glass-popover-anchor`, `--top`/`--start`/`--end`, `.glass-list--bare` | Collision avoidance, outside click, Escape, focus return, meaningful semantics |
| Native mobile Share dialog | `.glass-sheet-overlay`, `.glass-sheet` | Modal behavior, focus/inert, dismissal; CSS class does not implement drag-to-dismiss |
| Welcome/help dialog | `dialog.glass-modal-overlay` containing `.glass-modal` | `showModal()`, label, close/cancel handling, existing first-visit rule |
| Threshold and style sliders | `.glass-range`, range header/value classes | Native input, labels, value formatting, draft/full conversion timing |
| Original comparison switch | `.glass-toggle` with `__input`, `__track`, `__label` | Native checked input and Bitify bindings |
| Checkbox, radio, dropdown, fields | `.glass-checkbox`, `.glass-radio`, `.glass-select`, `.glass-input` | Correct required child structure; labels and actual form semantics |
| Toasts | `.glass-toast` plus `.is-visible`, variant classes | `role="status"`, timeout policy, action/close behavior |
| Loading indication | `.glass-progress` or `.glass-skeleton` | Existing progress lifecycle and `aria-busy` |
| Help body | `.glass-prose` | Bitify's device-specific wording |
| Empty state | `.glass-empty` or restrained `.glass-status` | Live converted logo and import action |
| Image tiles, transparent pixels, grid background | **Custom canvas/tile classes** | No blur/tint/glow on exported-image preview; sharp pixel edges; conversion sizing |
| Palette swatches, None state, custom color editor | **Custom small components** using shared tokens | Two-color/transparent semantics, checkerboard or transparency cue, swatch contrast |

Do not add unrelated date-strip/calendar/avatar/table components just because the library offers them. A single reusable surface is enough for multiple inspectors.

## Tokens and styling constraints

The source defines `:root, [data-theme="dark"]` and `[data-theme="light"]`; dark is default. Put theme and density on `<html>` in production. Current compact density changes controls to 40px and small buttons to 32px, versus 52px fields and 56px buttons by default. Keep compact density for pointer-oriented layouts; enforce at least 44px touch hit areas. A 32px visual button can live inside a larger hit area if that area is unambiguous and does not overlap neighbors.

Rebrand with `--gl-color-primary` and `--gl-color-primary-dark`, plus explicit role ink (`--gl-color-on-primary`). Derived color-mix tokens resolve where declared; setting only the brand color deep in a subtree does not regenerate all inherited derived colors. A descendant `data-theme` also redeclares defaults locally. For prototype isolation, define all changed/derived tokens on its theme wrapper deliberately; do not assume root inheritance will override matching local declarations.

Other relevant hooks include `--gl-surface-1` through `--gl-surface-5`, `--gl-card-glow-*`, `--gl-blur`/`--gl-blur-light`/`--gl-blur-heavy`, `--gl-radius-*`, `--gl-space-*`, `--gl-border-*`, `--gl-shadow-focus`, density control sizes, `--gl-modal-max-width` and `--gl-toast-top`.

Defaults need adjustment for this product:

- Blur is 24px, light 16px, soft 12px, heavy 40px. Use a limited number of surfaces; measure device behavior before choosing a blur budget.
- The card's default padding is 40px top, 24px horizontal and 32px bottom, much larger than an editing inspector needs.
- `.glass-pill` is a fixed 46px circle. `.glass-btn` defaults full width; use `--auto` for toolbar actions.
- Primary button SVGs are forced to filled rendering and `stroke-width: 0`. Bitify's line icons need an explicit wrapper override or an intentional filled primary icon.
- Default field/base type is 15px. Use at least 16px text in editable mobile fields to avoid the familiar iOS Safari zoom interaction; independently test text enlargement.
- `.glass-bg` includes aurora effects, pseudo-elements, `min-height:100vh`, `overflow-x:hidden` and isolation. Build a neutral full-window grid directly instead of carrying those assumptions into the canvas.
- The scoped reset applies border-box to class substrings `glass-` and `gl-`. Bitify explicitly relies on content-box sizes. Wrapper migration therefore changes geometry and must be checked against actual measured dock/panel/tile rectangles.

[Svelte's global-style documentation](https://svelte.dev/docs/svelte/global-styles) supports using global rules when a component's scoped selectors are inappropriate. Keep the library global and keep Bitify wrapper overrides in an explicit namespace. Do not depend on a scoped parent rule to reach arbitrary children. Preserve the existing convention of no component style blocks unless the design migration deliberately changes it.

## Accessibility gaps requiring application fixes

The inspected CSS removes outlines from `.glass-btn`, `.glass-pill`, tab items, theme toggle and modal actions without supplying focus-visible replacements for all of them. Some controls, including ranges, segmented controls and toast actions, have rings. Add a universal visible keyboard outline in the Bitify wrapper namespace; do not assume every library class is keyboard-ready.

The CSS/changelog explicitly document that default primary text has only **2.03:1 in dark theme and 2.68:1 in light**, below the normal-text 4.5:1 target. Its default white primary/checkbox/accessory ink preserves a visual choice rather than universal AA compliance. Choose accessible role ink or a darker primary, then calculate actual contrast across all gradient stops. State badges include a scrim, but upstream measurements use the library's own background: an arbitrary uploaded image changes the composite.

There is no general no-blur `@supports` fallback, `prefers-reduced-transparency` handling or forced-colors mode in the inspected CSS. Only sheet transitions and skeleton animation explicitly respond to reduced motion. Add opaque materials when blur is unavailable, a user-accessible solid-material option, reduced-motion rules for all transitions and visible borders/selected indicators in forced colors. Retain text/state cues beyond hue.

Native buttons with `disabled` are safe; `aria-disabled` alone only styles the element and does not prevent activation. Preserve native tooltip and focus behavior from the existing app. Prefer native `<dialog>` for genuine modals: CSS-only div overlays do not trap focus or make the background inert. Keep ordinary editing inspectors nonmodal so the preview remains available.

## Browser and compositing limits

Upstream README reports a `color-mix()` floor of Chrome/Edge 111+, Safari 16.4+, Firefox 113+ and Samsung Internet 22+. It acknowledges later refinements (`lh`, `:has()`, RTL `:dir()`) falling back. Its claim that a no-blur background remains usable is not a contrast proof for uploaded content.

[MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter) marks current-browser support as Baseline 2024, with older browsers potentially unsupported. The blur samples only up to the nearest backdrop root. Ancestor opacity, filter, masks, blend modes, backdrop filters and certain will-change values can stop a descendant from sampling the grid. Avoid animating opacity on an ancestor that encloses every glass control and avoid stacking blurred child controls inside blurred inspector plates. Use bare inner lists or unblurred inputs inside a single shared material.

[MDN reduced-transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency) describes the user preference; browser coverage cannot be assumed universal, so an explicit Solid materials toggle should remain available.

Performance risk is an inference, not a measured failure: many overlapping backdrop filters behind animated GIFs and live conversion may increase compositor work. CSS being only a few gzip kilobytes does not make its visual effect free. Measure a representative mobile device with six/eight animated images and an open slider inspector. Avoid permanent `will-change` on every tile/control.

## Recommended Svelte architecture

Use a small layer of domain-neutral primitives: `GlassButton`, `GlassSurface`, `GlassSegmented`, `GlassRange`, `GlassToggle`, `GlassPopover`, `GlassDialog` and `GlassToast`. Keep native HTML inside them and expose snippets/children, event handlers, disabled/pressed/checked state and accessible labels. Do not wrap every label/icon in its own component without a repeated responsibility.

Then compose domain components: `CanvasStage`, `FloatingToolbar`, `InspectorHost`, `PaletteInspector`, `StyleInspector`, `ImageActions` and `CanvasStatus`. Existing App state and DOM-free libraries remain authoritative. `InspectorHost` chooses desktop side panel or mobile inline sheet and reports occupied space; `CanvasStage` receives safe rectangles/clearance and fits the image wall accordingly. One inspector open at a time prevents overlapping plates. Genuinely modal Share/Help layers use separate focus behavior.

Separate three visual layers: one fixed neutral grid, sharp image previews, and limited floating chrome. Grid position should remain continuous behind the panels, while **available image-layout bounds** change as a panel opens. Floating appearance should not mean images live beneath every control. Make panel sizing depend on viewport and measured content, not hardcoded assumptions about library defaults.

## Challenge to the proposed canvas

These are product recommendations, not upstream library claims:

1. A full-window grid is promising, but a strong grid can visually corrupt the evaluation of 1-bit art and transparent edges. Prefer a quiet neutral checker/grid; offer a visibility control. Do not color the canvas with the active palette: users need to judge the output independently of its backdrop.
2. Blur should support separation. If the dock/panel pushes every image out from behind it, its blur sees only the repetitive grid and produces little meaningful depth. A subtle border, stable scrim and shadow will matter more than 40px blur. Preserve the backdrop continuity without increasing grid contrast just to advertise glass.
3. Minimal image gaps can create ambiguous tile boundaries, hard-to-hit per-image actions and collisions with transparent sprite shapes. Reduce spacing experimentally, keeping room for labels/actions and clear selection/hover states.
4. Floating every label scatters hierarchy. Group controls by task and place short contextual labels on predictable material or protected quiet regions. A handful of glass islands is stronger than dozens of individual glass chips.
5. On a narrow phone, fitting many images above an expanding inspector can make previews too small. Use one inspector, capped height and internal scrolling, preserve the selected/primary image where possible, and test short/landscape viewports. Reflow does not guarantee usable preview size.
6. A CSS approximation cannot reproduce Apple's adaptive native material/refraction. Treat GlassKit as an intentional web material system; optimize for Bitify's conversion task rather than visual similarity alone.

## Prototype validation gate

Before a production migration, check light/dark, grid on/off, solid materials, keyboard-only, reduced motion, 200% text enlargement, small and short viewports, touch targets, native dialog focus and close behavior, overflow menus near corners, transparent/opaque output, one/many images, animated GIFs and drag-slider drafts. Verify original-comparison hold/Space, import/paste/drop, per-image and bulk export, preserved style settings, None colors and all existing gesture exclusion regions. Test actual Safari/iOS in addition to desktop emulation.

A prototype can establish layout and interaction direction. It cannot establish conversion performance or production accessibility without those checks.

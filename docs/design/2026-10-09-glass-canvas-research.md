# Glass canvas redesign: Apple guidance and design critique

Date: 2026-10-09
Status: research and prototype recommendations; no production behavior approved by this document.

## Recommendation

Use an immersive full-window workspace with a quiet grid, a small number of grouped glass controls, plain image content, and a protected work viewport. Keep the visual background continuous beneath the controls while fitting images into the space those controls leave available.

The strongest version of the proposal is not glass on everything. It is a clear functional layer above an unglazed content layer. GlassKit should provide a reusable material vocabulary for the functional layer; it should not decide interaction behavior, accessibility, canvas geometry, or the appearance of image pixels.

These are researched guidance and design recommendations, not measured usability findings from Bitify. Suggested gaps, surface sizes, responsive thresholds, and performance targets below require prototype evaluation.

## Evidence from Apple

### Materials and hierarchy

Apple places Liquid Glass in the functional layer for controls and navigation. It discourages using it in the content layer and recommends sparing custom use. Text-heavy components such as sidebars and popovers should use the regular variant. This supports a glass inspector shell, toolbar groups, and transient menus, with ordinary image surfaces and inspector contents.

Source: [Human Interface Guidelines: Materials](https://developer.apple.com/design/human-interface-guidelines/materials).

Apple's WWDC introduction warns against glass stacked on glass. Controls inside a glass container should use fills, transparency, or vibrancy rather than a second material layer. Clear glass requires suitable media and legibility protection. Native regular glass changes tint, shadows, and foreground appearance with the background. Native accessibility settings modify its transparency, contrast, and motion automatically. These adaptive behaviors cannot be assumed for a CSS imitation.

Source: [Meet Liquid Glass, WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/).

### Full-bleed content and adaptable layout

Apple allows full-screen background content beneath chrome. A background extension can mirror and blur an image under adjacent panels while preserving its important visible content. Layouts must accommodate safe areas, changing text size, resizing, short and narrow windows, and internationalization. On narrowing iPad windows, Apple recommends retaining the familiar layout as long as it fits, then hiding tertiary columns such as inspectors. Device type alone does not express available space.

This supports separating the full-window background from the unobscured image viewport. It does not require every image pixel to occupy the whole window or sit beneath a panel.

Source: [Human Interface Guidelines: Layout](https://developer.apple.com/design/human-interface-guidelines/layout), updated September 9, 2026.

### Grouped toolbar controls

Apple recommends related command groups, generally no more than three groups, predictable placement, and one prominent primary action. Navigation and document context belong at the leading edge, common commands centrally, and persistent actions and inspector toggles at the trailing edge. Placement and grouping should remain recognizable across platforms.

For Bitify, preserve relationships among document operations, conversion controls, and export actions. Numerous independent capsules would add material boundaries without improving understanding.

Source: [Human Interface Guidelines: Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars).

### Inspectors, panels, and sheets

A SwiftUI inspector can appear as a trailing column with regular horizontal space and become a sheet in compact space. This is a useful web interaction model, not a web API.

Source: [SwiftUI inspector](https://developer.apple.com/documentation/SwiftUI/View/inspector%28isPresented%3Acontent%3A%29).

A sheet serves a scoped task. iOS supports nonmodal sheets and medium/large detents for progressive disclosure; resizable sheets need an accessible grabber. A compact settings sheet can leave canvas context visible while an expanded sheet provides room for complex settings.

Source: [Human Interface Guidelines: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets).

Desktop panels supplement a document or selection. An inspector can instead occupy a split-view pane. Direct controls such as sliders are appropriate for quick adjustments. Bitify's recurring style and palette tasks benefit from a coherent inspector rather than unrelated dialogs.

Source: [Human Interface Guidelines: Panels](https://developer.apple.com/design/human-interface-guidelines/panels).

### Floating labels need protection

Current Apple guidance recommends adequate separation for dense chrome and text outside glass controls. Scroll-edge effects establish legibility where content moves beneath floating elements; they are not decoration. Do not copy an effect into regions that do not need it.

Bitify's floating document titles, image names, and status need predictable backing, protected positioning, or an appropriate edge treatment. Naked low-contrast text over arbitrary imagery will not remain dependable.

Source: [Human Interface Guidelines: Scroll Views](https://developer.apple.com/design/human-interface-guidelines/scroll-views).

Where current HIG guidance differs from a 2025 presentation, use the current guidance. For example, do not treat an older soft-edge default as a reason to ignore the current recommendation for stronger separation around dense controls or floating text.

## Challenge the proposed design

### A grid should serve the workspace

The grid should help users distinguish workspace from images and understand their arrangement. It should not become more prominent merely to demonstrate blur. Start with restrained lines or dots and compare with a plain neutral background. Offer visibility or intensity control if the grid remains useful.

Fine, high-contrast repeating detail can compete with sprites. A heavy blur can erase the grid's structure; its mere presence does not guarantee a richer material effect. These are visual-design hypotheses to inspect in prototypes, not measured claims about the library.

### Keep coordinate grids distinct from alpha checkerboards

A checkerboard communicates actual image transparency. A full-window checkerboard can make the surrounding workspace appear to be transparent image content. Use a subtle line/dot grid for the workspace and reserve a checkerboard for alpha inside image bounds. Never export the workspace grid or material into the converted image.

This distinction is especially important because Bitify permits either of its two image colors to be None. Transparency is a real feature, not just decoration.

### Group floating controls

Floating chrome can be immersive without every control becoming a separate bubble. Keep document context, conversion settings, and global actions in a small number of aligned groups. A persistent control should occupy a predictable screen location. A contextual image action should remain associated with its image.

Do not remove labels simply to appear minimal. Keep discoverability for unfamiliar style settings, touch users, and keyboard users. The production app's shared tooltip behavior remains a separate contract; a visual prototype should not accidentally replace it with native title attributes.

### Do not apply glass to the image layer

Images, original/converted comparisons, selection outlines, and transparency display should remain visually literal. Refraction or blur applied to an image makes it harder to assess the actual conversion result. Put glass around the workspace controls, not across the pixels being evaluated.

Palette swatches need stable, neutral surroundings. Background tint and refraction beside colors can influence perceived color. Use solid swatches and ordinary neutral rows inside the inspector shell.

### Reduce gaps carefully

Smaller gutters increase image area but can make transparent sprites merge, obscure image boundaries, and leave too little room for labels or selection rings. Suggested starting values are 12-16 CSS px on desktop and 8-12 CSS px in compact layouts; these are prototype choices, not Apple requirements.

Keep enough room for per-image actions and identification. Compare edge recognition and accidental selection before reducing spacing further. Avoid adding both a large enclosing image card and a large image gutter, which would undo the intended density improvement.

### Refitting on every popup would be disruptive

Distinguish persistent layout reservations from temporary overlays:

- A pinned inspector or mobile settings sheet may reserve part of the usable image viewport.
- In Fit mode, refit images into that viewport once its geometry settles.
- At an explicit user zoom, preserve the zoom and minimally pan relevant content into view.
- Small menus and transient popovers should normally avoid moving the entire image arrangement.
- Do not initiate an automatic layout reflow while a user is dragging a slider or interacting directly with an image.
- Switching the inspector's tab should preserve its outer size where practical.

These are recommended interaction rules to test, not Apple mandates. The existing source-of-truth Bitify design already emphasizes watching image changes without dock or settings overlap. Preserve that goal even when the visual background extends under the controls.

### Continuous background does not require an infinite canvas

A full-window background can coexist with Bitify's existing arranged image wall. An infinite/freeform canvas introduces separate questions about pan, zoom, ordering, keyboard navigation, selection, and how exported images relate to the workspace. Do not silently introduce that product change as a side effect of a glass treatment.

## Recommended responsive behavior

Use available width and height, input capability, and actual component fit. Suggested CSS breakpoints must be validated against content rather than copied from native size classes.

### Wide desktop and large tablet window

- Continuous grid under the whole app.
- Document context at top-leading, global actions at top-trailing, a cohesive conversion dock.
- Style, palette, and document settings in a trailing inspector or a clearly coordinated control surface.
- Inspector shell may be glass; rows, swatches, inputs, and selected states inside it use ordinary fills.
- Reserve inspector width and dock height in the fit calculation, with a small visual gap to images.
- Keep pointer hit areas and keyboard focus predictable; hover must not be the only way to discover actions.
- Do not enlarge chrome excessively on very wide screens. Extra space should benefit images.

### Narrow desktop or tablet window

- Retain familiar grouping until the components no longer fit.
- Collapse secondary commands into an accessible overflow surface before crowding targets.
- Change the inspector presentation when a usable image region cannot coexist with its preferred width.
- Keep export/import and inspector dismissal reachable at every size.
- Test quarter-window and half-window arrangements, not only fullscreen desktop.

### Phone portrait

- Preserve a quiet full-bleed background but place controls inside safe areas.
- Use a compact bottom conversion dock with generous touch targets.
- Show settings in a bottom sheet with a short preview state and an expanded state when needed.
- Reserve the visible sheet height in Fit mode so images remain useful while a setting changes.
- Keep sheet body independently scrollable and dismissal always reachable.
- Avoid densely packed horizontally scrolling control chips that hide the active setting or depend on hover.
- Respect software keyboard geometry for editable values, names, and color input.

### Short phone/tablet landscape

- Treat height as the limiting resource; a large bottom dock plus tall bottom sheet can consume the canvas.
- Prefer a compact side inspector when width permits, or an explicit expanded settings view when it does not.
- Keep a recoverable path to the canvas and a clearly visible active setting.
- Never shrink touch targets to preserve the desktop arrangement.
- Test device safe areas on both lateral edges and the bottom, and test with the keyboard open.

## Native Liquid Glass versus a web approximation

Native Liquid Glass is a system material with coordinated optics, interaction, context adaptation, and accessibility behavior. GlassKit can supply a web visual vocabulary, but it must be reviewed separately for its actual CSS, component APIs, browser support, and semantics. Do not advertise native parity merely because the sample resembles iOS.

CSS backdrop-filter samples painted content behind a surface. Ancestor opacity, filters, masks, blend modes, and other backdrop roots can change what gets sampled. Prefer alpha in the surface background instead of reducing opacity on the entire component subtree. Avoid accidental nested backdrop roots.

Source: [MDN: backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter).

Proposed quality tiers:

| Tier | Behavior |
| --- | --- |
| Standard | Modest blur, restrained border/highlight, adequate surface fill |
| Enhanced | Limited refraction on small chrome surfaces only after profiling |
| Reduced transparency | Opaque or nearly opaque surfaces |
| Reduced motion | No elastic morphing, large animated refits, or decorative tracking |
| High contrast/forced colors | Strong solid boundaries and compatible foreground colors |

Respect [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) and [prefers-contrast](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-contrast). The [prefers-reduced-transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-transparency) media feature does not work in every widely used browser. Provide an explicit material/appearance preference too.

Use CSS safe-area environment values for edge chrome; test dynamic viewport changes rather than assuming a fixed phone screen height. Source: [MDN: env()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env).

## Prototype comparison

| Direction | Prototype | Expected strengths and risks |
| --- | --- | --- |
| A: Protected canvas, recommended | Quiet grid, grouped glass chrome, plain images, trailing inspector on wide windows and bottom sheet on compact windows | Strong hierarchy, content fidelity, and predictable fitting; material stays visible without dominating |
| B: Floating studio | Detached Document, Style, and Palette surfaces; more chrome islands; images fit around panels | Strong immersive aesthetic; increased occlusion, discoverability, movement, and layout-management risk |
| C: Quiet editor | Nearly solid inspector/chrome; glass limited to main toolbar and transient menus; optional grid | Useful readability and performance baseline; less dramatic but possibly strongest for repeated precise work |

Use the same images, actions, and labels across directions. Include panel-open states and mobile landscape, not just beautiful desktop resting screens.

## Evaluation matrix

| Dimension | Cases | Acceptance or measurement |
| --- | --- | --- |
| Viewport | 320-390 CSS px compact widths; common tablet widths; 1280/1440 desktop widths; narrow desktop split windows; short landscape | No unreachable controls; no unintended image occlusion; inspect every panel-open state |
| Image content | White, black, saturated, fine-detail sprites, transparency, multiple images, animated GIF | Compare clarity and actual converted-pixel fidelity; grid never affects exports |
| Task flow | Import/drop, original comparison, style change, palette edit, document settings, copy, individual/all download | Compare completion time, misclicks, hidden actions, and confusion across A/B/C |
| Layout continuity | Open/close settings, switch inspector tabs, drag slider, resize window | No repeated avoidable image jumping; no refit during direct interaction |
| Touch | Portrait/landscape, safe-area device, coarse pointer, keyboard open | Controls remain reachable, labels discoverable, and gestures do not fire over controls |
| Keyboard | Tab through chrome/images/panel, Escape close, focus restoration | Focus stays visible and order remains meaningful; no keyboard trap |
| Accessibility | 200% text sizing, reduced motion, reduced transparency, contrast preference, forced colors | Readable panel content; stable layouts; appropriate material fallback |
| Performance | Lower-powered real phone; panel opening, scroll, drag, image updates | Measure latency/dropped frames and compare quality tiers; no assumed native performance |

These viewport values are proposed test sizes, not Apple-defined web breakpoint requirements. A 60 fps aspiration is a quality target, not a guarantee from a material library.

## Accessibility thresholds and units

Ordinary text needs 4.5:1 contrast and qualifying large text 3:1 against the actual composited background. Token contrast against an imaginary flat fill is insufficient when images or a grid are visible through it. Source: [WCAG Contrast Minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum).

Apple generally recommends 44 by 44 pt hit regions for buttons. Native points and CSS pixels are different units. For this web prototype, a practical 44 by 44 CSS px touch target is a recommendation, not an assertion that the units are equivalent. Source: [HIG Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons?changes=latest_1).

WCAG 2.2 AA requires 24 by 24 CSS px pointer targets or applicable exceptions/spacing. Aim above this minimum for touch chrome. Source: [WCAG Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).

Aim to keep the entire focused component and focus indicator unobscured. AA requires that focus not be entirely hidden; a transparent blur can still interfere with contrast and visibility. Source: [WCAG Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum).

At 200% text sizing, inspector text and controls must remain readable. Two-dimensional image content can receive a reflow exception, but that exception does not automatically apply to ordinary panel text. Sources: [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [WCAG Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow).

## Decision before production migration

Choose the direction after reviewing equivalent desktop, portrait, and landscape states and measuring repeated tasks. The recommended starting point is A, retaining C as a readability/performance baseline and B as a deliberate challenge to the user's strongest floating-panel idea. Do not commit to a wholesale glass migration based on one resting-state mockup.

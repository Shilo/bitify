# Bitify: GlassKit canvas exploration

October 9, 2026 · exploratory worktree · `codex/glasskit-prototypes`

## Try the three working prototypes

Run `npm ci` then `npm run dev -- --port 5188 --host 127.0.0.1` in this worktree.

- [Old design — same-workspace comparison](http://127.0.0.1:5188/?prototype=legacy)
- [Canvas dock — grouped alternative](http://127.0.0.1:5188/?prototype=dock)
- [Studio rail — desktop alternative](http://127.0.0.1:5188/?prototype=inspector)
- [Floating islands — recommended](http://127.0.0.1:5188/?prototype=clear)
- [Design comparison controls](http://127.0.0.1:5188/?prototype=dock&review=open)
- [Existing interface](http://127.0.0.1:5188/)

Use **Designs → Old design** to compare the existing interface with the new directions
without discarding images, conversion settings or original/converted state. This reuses
the original components and CSS in the same mounted workspace; only the Designs entry
is added. The comparison URL still uses the separate prototype storage key.

Use **Designs** to change direction without discarding loaded images; compare Lines, Dots,
Checkerboard or Off; choose median/average image scaling; compare canvas-only, neutral or
local-checker image backing; turn on solid controls; and load one/six/many images.
The prototypes retain the existing conversion/export handlers; validated workflows are listed below. Sample imports stay local. Changing
prototype settings uses a separate storage key. The production interface remains the
default URL; this proposal has not been merged or deployed.

## Mockup gallery

[Open the browser mockup gallery](gallery.html) or [the desktop/phone comparison](mockups/comparison.png).
The gallery is also served at `/docs/design/gallery.html` by the development server.
Six new readability comparisons precede the original 23 exploration screenshots.

## Recommendation

Choose **Floating islands** for the user's priorities: modern, minimal, fullscreen,
immersive and see-through. Use one continuous full-window grid, 12px image gaps and
4px insets, and three floating surfaces: colors with Palette, the single style-named
comparison button with Style settings, and Download. Related controls remain grouped
without a surrounding dock shell. Keep text-heavy editing panels more opaque.

The comparison button keeps the selected style name visible. Pressed/filled means
conversion is on; unpressed/hollow means original. Its tooltip and accessible description
explain the current view and next action. This compact comparison replaces the old
Original/style segment in all three prototypes. Phone layouts stack the color group above
conversion and Download, preserving usable targets.

Canvas dock remains a useful alternative with one shared material. Studio rail places
tools on the trailing edge when desktop width permits and returns to the bottom on
smaller windows. Preserve the fit-to-window model and measured panel reservation.

## Where I challenge the idea

1. **One visual canvas is good; an infinite freeform canvas is a different product.**
   Adding pan/zoom/selection/placement would compete with Bitify's existing swipes and
   compare holds. Start with continuous background plus the current automatic layout.
2. **Blur needs useful contrast, not a louder grid.** Keep the grid restrained. The sample
   controls compare lines, dots, plain background and checkerboard directly.
3. **More transparency should not make controls harder to read.** Source images can be
   black, white or highly detailed. Use a controlled neutral tint on group shells, sharp
   plain swatches, visible focus and an opaque fallback. GlassKit does not inherit Apple's
   native adaptive contrast or optical refraction.
4. **Floating labels still need ownership.** Keep image names attached to their image and
   place control groups consistently. Avoid unrelated bubbles scattered across the canvas.
5. **Extremely small gutters make sprites merge.** 12px is a proposed starting value,
   not a usability finding. Labels and 44px touch actions still occupy real space.
6. **Refitting for persistent editing panels supports live comparison, but moving artwork
   for every tiny menu is disruptive.** These prototypes reserve the complete editing
   stack, including the style chooser. More/help/share are native HTML `<dialog>` modals styled with GlassKit rather
   than persistent editing panels. A future document inspector should use the same
   viewport reservation contract. At a future explicit zoom, preserve zoom and pan
   minimally rather than automatically refitting on every popup.
7. **Alpha transparency and decorative grids are different.** Full-window checkerboard
   is now a grid choice; optional neutral and local-checker image backing help judge
   pale/dark content without adding padding. Canvas only remains the immersive default.
   A shared 16-source-pixel guide follows the median display scale, but cannot align with
   every independently fitted image. Mean scaling is available for comparison.

## Readability refinement

Keep Floating islands, but make tiny image actions and captions more opaque than the
large bottom groups. Hover/focus now strengthens the action backing instead of fading it.
Captions have compact neutral substrates and opaque metadata. The canvas grid uses
16 source-pixel cells at the typical image scale, updating as images refit; dense
photographic grids group those intervals. Lines remains the initial pattern while the
background choice is undecided. See the [readability research and implementation](2026-10-09-glass-readability.md)
for Apple iOS 27 changes, user complaints, GlassKit guidance, contrast bounds and limits.

## Research and full project migration map

- [GlassKit library/source audit](2026-10-09-glasskit-library-audit.md): actual 1.22.2 CSS,
  class inventory, token semantics, reset conflicts, focus/contrast/state pitfalls,
  browser fallback gaps, Svelte wrapper boundaries and licensing.
- [Apple/UI research and strong critique](2026-10-09-glass-canvas-research.md): primary
  HIG/WWDC/MDN/WCAG evidence, responsive rules, native/web distinctions, candidate
  directions and evaluation criteria.
- [Existing UI and migration audit](2026-10-09-current-ui-migration.md): every current
  surface, geometry coupling, gesture/tooltips/export contracts and replacement map.

Apple's primary guidance places Liquid Glass in a distinct functional layer and
recommends sparing use: [HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials).
Use [HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
for full-bleed backgrounds with protected important content. GlassKit is a CSS library:
[repository](https://github.com/JUNGHERZ/GlassKit),
[demo/docs](https://glasskit.jungherz.com/).

## Modular implementation approach

GlassKit supplies styles and tokens, not Bitify state or interaction behavior. Start with
ordinary Svelte 5 components and semantic HTML; keep the existing DOM-free modules and
native dialogs. There is no reason to add a second reactive system or Shadow DOM layer.

| Module | GlassKit primitive | Bitify responsibilities retained |
|---|---|---|
| `WorkspaceHeader` / `CanvasWorkspace` | neutral tokens / selected nav styles | imports, count, fit/scroll, global gesture regions, safe viewport |
| `GlassToolbar` / `ToolbarGroup` | `glass-card`, `glass-btn`, `glass-segmented` | colors, swap, None, compare, palette/style opening, export |
| `PaletteInspector` | one `glass-card` shell | preset order, orientation, transparency, scroll fades, tooltips |
| `StyleInspector` / `SettingControl` | shell, `glass-range`, input tokens | Auto/ranges, per-style persistence, draft controls, conditional alpha |
| `StylePicker` | shared shell and state fill | eleven live previews, group dividers, held-tooltip suppression |
| `ImageFrame` / `ImageMetadata` / `ImageActions` | plain content and small control surfaces | pixelated canvas, GIF cache, hold compare, full-source export |
| `GlassDialog` / `ShareSheet` / `AppMenu` | `glass-modal`, `glass-sheet`, `glass-popover` | native modal inertness/focus/Escape, reset and share logic |
| `Notice` / `DropFeedback` | `glass-toast` / app-specific overlay | busy jobs, error text, drag-depth feedback |

The prototype applies those primitive classes conditionally in App/Dock and puts material
and composition overrides in `src/prototypes/glass-prototypes.css`; it deliberately
retains the current behavior-rich components for honest comparisons. The table names
future extraction boundaries, not modules already implemented. The comparison interface
is its own Svelte component. Production extraction should proceed only after choosing a
composition, because splitting the existing App/Dock while comparing aesthetic choices
would make the experiment harder to assess.

## Proposed adoption sequence

1. Choose a composition through actual one/six/many-image workflows at desktop, phone,
   tablet and short landscape sizes. Evaluate original/processed, all styles, None,
   long filenames, input focus, export, animated GIFs and complex panel stacks.
2. Introduce shared material/theme tokens and adapters. Keep the exact 1.22.2 dependency
   pinned; audit future upgrades. Preserve neutral chrome rather than the default orange
   brand, aurora background and oversized demo card padding.
3. Extract header, toolbar groups and measured canvas shell. Share JS/CSS gap/inset/caption
   values rather than duplicating geometry. Replace selector-coupled gestures deliberately.
4. Extract palette/style controls, then native-dialog wrappers. Keep tooltip actions and
   outside-press suppression. Do not put a separate blur behind every child control.
5. Validate on real iOS Safari and an Android phone with GIFs and sliders. Measure
   compositing cost and final composited contrast, and use solid controls when necessary.
   Document changes to the approved design and only then replace the default interface.

## Validation

Current suite: **208 tests across 11 files pass**, including five image-relative grid tests. Browser geometry,
state checks, screenshot review and build results are recorded in `validation.md`.
Desktop Chromium checks do not establish iOS Safari GPU performance or native Liquid Glass
parity. No conversion algorithms or save encoders were changed.

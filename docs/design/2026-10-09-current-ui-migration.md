# Existing UI audit and modular migration

Date: October 9, 2026. Scope: research and isolated prototypes. Production remains the behavior reference.

## Recommendation

Build one continuous visual canvas with grouped glass controls, measured reserved space, restrained metadata and smaller image gaps. Keep fitted images and existing scrolling. An infinite panning canvas would compete with comparison holds and style/palette swipes.

Use glass on controls and navigation, preserving crisp image pixels and meaningful transparency cues. Compare the recommended bottom dock against a desktop right inspector and deliberately clear floating islands.

## Complete surface inventory

| Surface | Responsibility to preserve | Modular replacement |
|---|---|---|
| Top bar | Brand, count, Add, Remove all, More | WorkspaceHeader and grouped actions |
| Wall | Largest-fit layout, centered partial rows, minimum-size scrolling | CanvasWorkspace with measured usable rectangle |
| Tile | Pixel rendering, GIF animation, comparison hold, captions, mouse/touch actions | ImageFrame, ImageMetadata, ImageActions; preserve rendering |
| Dock | Colors, swap, palette, view, style, export | GlassToolbar with color/view/export groups |
| Palette panel | Color orientation, presets, transparency selector, selected ring, scroll/fades | PaletteInspector |
| Style panel | Live preview, primary controls, remembered values, responsive tray/chips | StyleInspector and SettingControl |
| Style chooser | Eleven previews, selection, grouping, touch-hold descriptions | StylePicker; include geometry in canvas reservation |
| Extra settings | Desktop grid tray, mobile chips/one control, Reset | SettingTray and SettingChip |
| More | Theme, install, help, repository, Reset settings | Native-dialog menu |
| Share | Copy/Download/Cancel, inert background | GlassSheet native dialog |
| Welcome/help | First visit, device-specific controls, focus | GlassDialog |
| Reset question | Retain images, clear settings, Cancel focus | GlassDialog |
| Status | Live region, job feedback, spinner | StatusToast |
| Drop overlay | Global file feedback | DropTargetOverlay |
| Tooltips | Hover/focus/hold descriptions, accessible/top-layer behavior | Existing tooltip action |

## Geometry contracts

The source of truth is docs/superpowers/specs/2026-10-06-bitify-app-design.md. Update that specification with future production behavior changes. Prototype alternatives are isolated experiments.

- CLAUDE.md and src/app.css:3 explicitly warn against a global border-box reset. Existing button height includes content plus borders; segments add padding. GlassKit has a scoped border-box reset, so restore existing content-box contracts selectively.
- src/App.svelte:98 uses gap 16, caption extra 27 on hover/48 without hover, minimum 140-200px. src/app.css:108 repeats gap 16 in spacing and width. A shared geometry token must drive fitGrid and CSS.
- src/Tile.svelte:49 budgets rendering using (box - 16) * devicePixelRatio. src/app.css:120 repeats the 8px image inset. Reducing padding must update sampled preview size too.
- The hidden probe measures usable image space. Preserve that contract with new insets.
- Dock space is hardcoded 132px, 172px on phones, or 96px in landscape. Dock.svelte:52 measures panel offsetHeight. Prefer actual combined bounds for material padding, larger text and safe areas.
- The absolute style chooser menu is excluded from panel offsetHeight and can overlap art. The user's all-popups-refit requirement needs combined chooser/panel measurement.
- Empty-state sizing separately estimates rest space as 430/475/215px. Validate empty and populated screens.
- index.html uses viewport-fit=cover; root safe-area padding and dynamic height already exist. Let background bleed to edges but keep controls in the safe rectangle. Avoid double subtraction.
- Panels using 100vw do not inherently subtract horizontal safe areas.
- Current touch tile actions are 40px, with a 36px-wide exception under 150px. A 44px minimum requires larger caption geometry or a new action arrangement.

## Interaction contract

Preserve these independently of material styling:

- Tile mouse press compares immediately. Touch holds compare after 150ms with movement below 8px; release/cancel/leave ends comparison (Tile.svelte:18).
- Space compares globally except in controls that use it. Pointer clicks relinquish button focus; keyboard activation keeps it (App.svelte:455).
- Style/settings changes return to converted view; colors/palettes retain the current view (App.svelte:67).
- Swap carries None with the color. Presets retain orientation and transparency. Only one color can be None and its underlying color remains remembered (Dock.svelte:143).
- Threshold/Cuts support Auto and per-image ranges. Clearing their field restores Auto; intermediate invalid input remains editable (Dock.svelte:121).
- Each style retains its own settings; opacity appears only for soft-alpha input (Dock.svelte:63).
- Removing/changing slider surfaces ends drafts and cleans their timer (Dock.svelte:38).
- An outside press dismisses only the innermost surface and consumes its subsequent click. It cannot also remove art or change a setting (Dock.svelte:187).
- Tooltip Escape precedes popup Escape. Shared tooltips support 350ms hover, immediate focus, 500ms touch hold, suppressed held-button activation, accessible descriptions and manual popovers above modal dialogs (lib/tooltip.js).
- Gestures explicitly match .bar/.grid/.empty; compare priority matches .held (App.svelte:224,260). Renaming these changes behavior.
- Actual scroll containers keep gestures even at their ends. Two-finger browser zoom remains. Dialogs block app shortcuts.
- Exports always convert every source pixel using settings captured at activation; never save a sampled/draft canvas.
- GIF copy uses frame one; GIF download retains animation. One-image global Download saves a file; multiple-image Download all creates a ZIP.
- Remove all cancels loading batches. Share state must release removed images.
- Keep native dialog focus, inertness and Escape behavior.

## Challenge the immersive proposal

A continuous visual background is useful, but does not imply an infinite draggable canvas. Panning introduces gesture conflicts and an unrequested interaction model.

A line grid is a weak transparency cue: pale sprites may vanish, and grid lines can be mistaken for source pixels. Include a full-workspace checkerboard comparison and a grid-off option. Do not remove semantic image grouping when removing tile backgrounds; captions and controls need obvious ownership.

Floating text needs stable contrast. Keep metadata in its own geometry; use quiet neutral scrims if necessary. Group glass surfaces instead of blurring every button. Continuous geometry animations resize sampled masks repeatedly and cause reconversion; resize once and animate chrome opacity/translation.

Blur competes for graphics resources while GIFs repaint and conversions run on the main thread. docs/performance.md records synchronous image read/save stalls and unverified Safari/iOS behavior. Desktop success is insufficient mobile evidence.

A right inspector is a width-versus-height experiment, reverting to bottom controls on small or short screens. Do not assume a CSS material library supplies the app's accessibility behaviors.

## Prototype integration and verification

The isolated prototype route uses real app rendering and conditional GlassKit classes. GlassKit 1.22.2 CSS loads first, original app.css next, and the adapter last. Scoped geometry and neutral material tokens preserve production.

A: restrained bottom dock and continuous grid, the recommended starting point.
B: compact right dock/adjacent inspector on wide/tall desktop, bottom controls elsewhere.
C: clear floating islands to make grouping/contrast tradeoffs concrete.

Shared --prototype-gap drives fitGrid/CSS; --prototype-inset drives shown()/canvas inset. Bottom modes measure --dock-base/--panel-space; desktop B measures --prototype-right-space. Native dialog open state and toast hidden state need adapters because GlassKit expects is-open/is-visible or its own overlay.

Verify portrait phone, short landscape, tablet, desktop, empty state, one/two/many images, long filenames, wide/tall sources, None transparency, soft alpha, GIFs, all styles, palette scrolling, chooser/tray/chips, focus, touch holds, outside-dismiss consumption and full-source exports.

Existing layout/gesture/tooltip tests verify logic, not DOM fit after resets/material changes. Require browser geometry checks and real-device Safari/iOS testing before production migration.

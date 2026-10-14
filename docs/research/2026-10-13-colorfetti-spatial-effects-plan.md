# Deferred Colorfetti confetti effects

**Status: Deferred on October 13, 2026.** The user remained dissatisfied with the visual design and stopped exploration. No production effect has been implemented. The prototype is an unfinished reference, not an approved design or a plan authorized for execution.

The feature under consideration is spatial, randomized falling confetti for **import, individual image removal and Save**, based on the Paper pop Balanced experiment. Its goal is to make images feel like physical objects arriving, leaving and being sent out, while keeping recoloring useful and professional. Preserve image data, conversion state and exported files.

The [retained prototype](colorfetti-spatial-effects-preview.html) simulates these actions with small, large, tall and wide images, a movable drop point, both themes and motion suppression. Preserve it as evidence of the investigation. Revisit the visual design with the user before implementing or shipping it.

## Requested behavior

- Effects happen in the workspace at a meaningful image or action location, rather than being confined to a notification badge.
- Every burst varies its launch directions, positions, dimensions, color order, velocities and timing. Sample randomness once per burst; do not introduce frame-to-frame flicker.
- Confetti explodes outward, loses momentum and **continues falling naturally** as it fades.
- For an image filling most of the screen, spread near its visible edges while staying inside the image region. The rectangle is a movement boundary, not an outline for particles to assemble into or stop on.
- Render above the application interface, including the Save button, while allowing input through the decorative layer.
- Keep the exact Colorfetti logo palette and maintain usable confirmations separately from decoration.

The event contexts and these constraints are established preferences. The appearance, physics and tuning remain unresolved.

## Events and completion semantics

| Event | Spatial effect | Trigger and purpose |
| --- | --- | --- |
| Successful image arrival | Randomized splash at the arriving tile or recent drop point | Start after publication and the designated image's first usable visible draw, not at file-picker opening. |
| Remove one image | Short departure response at its captured former bounds | Removal takes effect immediately. It should feel like clearing space, not winning a prize. |
| Save or Save all handoff | Upward send-off at Save or the relevant image action | Fire after complete encoding and browser handoff. The browser cannot confirm eventual disk save. One ZIP is one event, not a burst per file. |

A viewport-sized effect layer provides free movement across UI boundaries. Actual travel should adapt to the visible image or control rather than requiring a screen-wide shower. Copy, palette saving, installation and Remove all effects are outside this deferred feature's scope.

## Placement requirements

| Situation | Placement |
| --- | --- |
| Small image with surrounding room | Perimeter scatter, preserving the chosen Paper pop feel. |
| One image fills most of the wall | A randomized explosion that spreads near the image edges and then falls; its full path fits inside the visible image. |
| Narrow image or tile close to a viewport edge | The same contained falling splash, with movement adapted to both visible dimensions. |
| Dropped image | Use the deliberate drop point when appropriate; constrain an interior origin to a safe location within the visible image. |
| Removal | Capture the old image rectangle first; clear the image immediately, then use that region for its departure response. |
| Save | Keep the upward control-origin plume, with lateral travel fitted to viewport space and reduced gravity so pieces stay visible. |

Measure the actually displayed image region, accounting for letterboxing, aspect ratio, inset and viewport clipping. Do not use the entire figure including its caption, or an offscreen portion of a large image, as the containment rectangle. Capture removal geometry before the element disappears; remeasure living async anchors at completion.

The last prototype used damped velocity plus gravity: `x = x0 + vx × D(t) + flutter`, `y = y0 + vy × D(t) + 0.5 × g × t²`, where `D(t) = (1 − exp(−drag × t)) / drag`. It fitted horizontal travel and vertical extrema to available space once at creation. Scaling vertical velocity and gravity together retained the falling trajectory instead of parking particles on a border. This is an implementation experiment to revisit, not finished motion to copy directly.

## Lessons from rejected approaches

| Approach | Why it did not meet the request |
| --- | --- |
| Tiny confetti inside a status badge | Too restrained and disconnected from the workspace; the user wanted spatial, immersive effects. |
| Reusing deterministic particle parameters | Bursts looked static and repetitive. Fresh randomness must affect every event. |
| Expanding circular or rectangular formation that stops at its outline | Lost the falling-confetti behavior. Bounds should constrain a natural explosion, not become destinations. |
| Latest fitted ballistic prototype | Technical checks passed, but the user still disliked the design. Containment and frame timing do not establish visual acceptance. |

## Why this direction fits

The approved logo combines a C frame with flat rectangular pieces; the slogan says, “Throw your pixels a palette party. Recolor images and animations.” Loose rectangles, a paper toss and small material responses extend that identity into interaction. The effect becomes personal by responding near the person's actual image or action, not at an unrelated global notification.

Nielsen Norman Group describes animation as useful for feedback and spatial relationships, while noting that movement inevitably draws attention. Here the spatial response explains arrival/departure, then clears quickly so editing resumes in a quiet visual field. [NN/g on motion purpose](https://www.nngroup.com/articles/animation-purpose-ux/).

Carbon distinguishes subtle productive motion from expressive motion reserved for important moments. Import/removal can receive a compact physical response; more expressive export motion can be bounded independently. Neither model requires animation on every control press. [Carbon motion guidance](https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview).

Interface animation timing guidance favors short feedback. The proposed particle lifespans are longer than a button acknowledgment because particles travel further, but the underlying action takes effect immediately and never waits for their disappearance. Paper pop lasts 650ms for removal and 950ms for import/Save; tune downward if repeated use feels distracting. These are design starting points, not validated performance or preference findings. [NN/g timing guidance](https://www.nngroup.com/articles/animation-duration/).

## Color and material

Use the exact approved orange `#F47A34`, violet `#7952C7`, pink `#E63E82`, yellow `#F4C340` and teal `#0EAAA5`. Keep the public logo static and unchanged. Individual fragments may translate, rotate slightly and fade; this does not imply changing the logo's geometry or color placement.

Use roughly 5–11px rectangular pieces with varied square/short-strip proportions. Paper pop stays axis-aligned for a crisp pixel feel; avoid glossy gradients, glow, glitter, trails and elaborate 3D tumbling in the first implementation.

Use the same colors in light and dark mode, with a readable ordinary text channel independent of particle contrast. Yellow can be weaker on a light checker, which is acceptable only because fragments are decorative. Required success/error information never depends on them.

## Particle and shader research

The official canvas-confetti examples demonstrate different spatial vocabularies: directional cannon, mixed realistic bursts, fireworks from the sides, falling particles and custom-canvas placement. The useful lesson is that **emitter position and trajectories define the experience**. Its dense showpieces are references, not default settings for Colorfetti. [Official live examples](https://www.kirilv.com/canvas-confetti/).

The library supports explicit origin, angle, spread, velocity, gravity, decay, drift, shapes, colors and flat particles. It also exposes a reduced-motion option, reset and an optional worker. Its reduced-motion option is documented as disabled by default, and a transferred worker canvas is owned by that renderer. [Official API](https://github.com/catdad/canvas-confetti).

tsParticles offers configurable emitters, paths, shapes and lifecycle-managed containers. It is credible when many effect systems are needed, but its breadth is unnecessary for a few short semantic bursts. [Official API](https://particles.js.org/api/), [confetti example](https://confetti.js.org/).

PixiJS supports particle containers and WebGL/WebGPU filters, including displacement. Its documentation warns that filters can increase memory and reduce performance. Importing a full scene renderer solely to decorate an existing DOM/Svelte workspace would add architecture without improving a simple paper burst. [PixiJS scene and filter documentation](https://pixijs.com/8.x/guides/components/scene-objects).

### Recommended renderer

| Approach | Best use | Decision |
| --- | --- | --- |
| Small dedicated Canvas2D layer | Exact landing, departure and gathering paths with a bounded number of pieces | **Recommended for the prototypes and initial spatial vocabulary.** One short-lived elapsed-time loop; no artwork readback. |
| `canvas-confetti` custom instance | A natural plume or scattered paper burst | Good production alternative if it matches the winning visual study. Do not write custom drawing into its worker-owned canvas. |
| Transparent WebGL shader | A distinctive grid ripple independent of artwork textures | Prototype only until it wins a comparison. More GPU/lifecycle work than paper particles need. |
| tsParticles | Multiple emitter/path systems and extensive configuration | Defer; avoid an all-features bundle for three event types. |
| PixiJS and image filters | A future app already built around a scene renderer | Defer; changing the actual media presentation is outside this feature. |

The retained prototype uses only Canvas2D. A shader or external particle-library runtime is not necessary for the investigated falling-confetti effect.

For production, initialize optional renderers without holding the user action, cap backing resolution, and release GPU resources on teardown. MDN recommends accounting for per-pixel memory, rendering at a smaller back buffer when appropriate and avoiding blocking API calls. Scissoring limits the portion of the framebuffer processed by a local effect. [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices), [scissor reference](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/scissor).

## Event ownership and spatial origins

A fresh read-only subagent audit confirmed that a transient viewport overlay is feasible. Current code needs explicit semantic metadata and registered tile anchors; it does not yet preserve all the coordinates and IDs these effects need.

| Current hook | Needed addition |
| --- | --- |
| `App.svelte`, `addFiles` / `show` | Keep an import-operation token, actual published item IDs and optional captured origin. Select one representative visible arrival per user batch. Do not treat each 250ms publication group as a separate celebration. |
| `Tile.svelte` / `Pixels.svelte`, first display readiness | Add a one-time handshake for the actual new item's first usable canvas draw while visible. App accepts it only for an active import operation and designated item. DOM insertion or nonzero bounds alone does not prove the picture has appeared. |
| `App.svelte`, `drop` | Capture `clientX/clientY` for that drop. Use the recent position for a quick impact or source of a short transfer path; remeasure the eventual tile after async work. A slow import should acknowledge the arriving tile rather than fire at a now-irrelevant pointer position. |
| `App.svelte`, `picked` | Capture the initiating Add/empty-canvas anchor before opening the native picker. Input change itself has no useful pointer coordinates. A canceled picker does nothing. |
| `App.svelte`, `paste` | Use the arriving tile. Never reuse the last mouse location for a keyboard action. |
| `Tile.svelte` and App's `onremove` callback | Register the rendered tile/art bounds by stable item ID. Capture the rectangle before removing the item; render proxy fragments after normal state removal. |
| Mobile Share-sheet removal | Use the underlying shared tile, not the closing sheet button. Restore focus through the existing path. |
| `App.svelte`, `save` / `saveEverything` | Pass explicit action metadata rather than discarding the original event. Remeasure a still-live action anchor when encoding completes; skip a stale spatial effect if its surface disappeared. |
| `ImageViewer.svelte` | Own a separate effect layer inside the native dialog; a page-root canvas cannot cover the top layer. Coordinate budgets through the app. |

`getBoundingClientRect()` uses viewport coordinates and reflects scrolling. Match particle coordinates to that space; do not cache live geometry through arbitrary resize/reflow. Native dialogs occupy a separate top layer and need their own effect surface. [MDN geometry](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect), [MDN top layer](https://developer.mozilla.org/en-US/docs/Glossary/Top_layer).

Imported data publication is not proof that every palette preview has finished. An arrival effect should follow the first usable visual appearance of its designated new item, with explicit one-time import ownership, not every later render completion. If Auto/limiting is still pending, show honest busy feedback and do not replay a celebration for each recalculation.

For a long batch, acknowledge the first representative visible arrival and suppress subsequent particles for that same operation. Partial failures retain accurate ordinary feedback. An arrival response must not claim that every file succeeded. Canceled or never-visible arrivals produce no delayed effect.

## Cost estimates and performance evidence

A minimal production implementation was estimated at **250–400 lines of runtime code plus 80–150 lines of tests**, with two small new runtime files, one test file and targeted edits to roughly 5–7 existing files. This preliminary estimate preceded the final bounds-fitting iteration; actual scope depends on the motion design, readiness handshake, native viewer and preferences. It is not a completed implementation or measured bundle-size estimate.

An earlier Paper pop drawing benchmark in headless desktop Edge measured approximately **0.1–0.2ms at the 95th percentile for CPU-side Canvas2D drawing submission** with 44/20 pieces at 1920×1080, 1200×850 and phone-sized 390×844 viewports, using a 1.5 backing scale. It did not measure GPU/compositor completion, real phone hardware, integrated recoloring load or the later ballistic setup fitting. Do not treat it as a total frame-cost guarantee.

Memory depends chiefly on canvas area. One raw RGBA buffer is approximately `CSS width × CSS height × backing scale² × 4 bytes`: 1920×1080 at 1.5 uses **17.8MiB**; a 600×600 effect region at that scale uses **3.1MiB**. Browser buffering/compositing adds overhead. A viewport-wide overlay can contain a canvas sized to the active effect region; calculate those bounds and cancel/release idle drawing resources without changing the visible effect.

## Starting parameters and accessibility

Prototype starting values were 44 pieces and 950ms for import/Save, 20 pieces and 650ms for removal, and a backing scale capped at 1.5. These counts, durations and physics are subject to visual revision. Proposed production budgets were 80 pieces on desktop, 48 on phones and at most two active emitters; validate against animated artwork and actual devices before adopting them.

Coalesce repeated import publications by operation. Permit a couple of quick removal puffs within the shared budget so direct manipulation stays responsive. If full, drop or replace an older decorative effect; do not queue it. A proposed two-second export-decoration throttle avoids plumes from rapid repeated downloads without blocking the downloads. This replaces the earlier long celebration cooldown, which was poorly suited to tactile arrival/departure.

Use elapsed time from `requestAnimationFrame` timestamps, not fixed velocity increments per frame. Stop when particles expire; pause/cancel on hidden tabs and do not resume a stale celebration. Cap backing-store scale initially at 1.5, then validate actual phone cost. [MDN animation timing](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).

All effect layers have `pointer-events: none` and `aria-hidden="true"`. They cannot capture drops, taps, scrolling or image holds. Keep them outside the toolbar subtree watched for packing measurements. Particles are the topmost application paint layer, above images, controls and confirmations, while input passes through normally. A native dialog needs its own topmost effect surface; showing a different modal should rehost or cancel an active effect rather than leave it behind the dialog.

Use a simple Motion effects On/Off preference in More if adopted. Honor operating-system reduced motion regardless of that preference. Suppression affects decorative layers, not the animation content people imported. Cancel active particles when the preference changes; forced-colors mode retains text and omits decoration. Existing `role="status"` messages communicate results without moving focus. [W3C interaction motion](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

No effect on ordinary clicks, hover, palette stepping, slider movement, Original comparison, background generation, failures or retries. A deliberate removal may have a small physical response without being a celebratory success. Failed storage/export/import retains its useful error treatment.

## Conditions for revisiting implementation

1. **Resolve the visual design with the user.** Keep the requested random explosion, gravity, foreground placement and image-bound behavior. Show real motion across repeated import/removal/Save events; obtain acceptance before adopting it in the app.
2. **Add semantic event metadata and anchors.** Register tile/action geometry by item ID; capture removal bounds synchronously and add the explicit Tile/Pixels first-visible-draw handshake owned by the import operation. Keep event records small and independent of pixel buffers.
3. **Build the bounded effect layer.** Add the short-lived Canvas2D renderer, policy, teardown and motion controls. Root and native viewer layers share admission/budget rules. Keep conversion/export code independent.
4. **Integrate import and single removal.** Publish/clear state immediately; never await visual completion. Validate mixed imports, multiple files, cancel/remove during import and mobile sheet origins.
5. **Add the matching export send-off.** Fire after complete encoding plus browser handoff, with accurate text and stale-anchor suppression. Preserve immediate clipboard/native-download gesture requirements.
6. **Measure and challenge.** Check phone frame cost over animated sources and large imports, then test repeat use. Verify interior containment and foreground layering across image sizes. Update the authoritative behavior spec when implementation is adopted.

A minimal file structure could be `src/SpatialEffects.svelte` for the accessible decorative surface and `src/lib/paper-pop.js` for rendering, lifecycle and admission policy, plus focused tests. Split event policy into its own module only if complexity warrants it. Global styling follows the existing `foundation.css` convention. Before integration, read [CLAUDE.md](../../CLAUDE.md), the [behavior specification](../superpowers/specs/2026-10-06-colorfetti-app-design.md), [performance guidance](../performance.md) and [brand guide](2026-10-13-colorfetti-identity.md). Update the behavior spec with any adopted implementation.

## Prototype behavior and checks

The studies simulate successful actions with fixed sample artwork. They do not read imported file contents, write files, touch the clipboard or alter app settings. An external drop uses only its location to simulate an arrival. Ordinary workspace clicks and pointer movement emit nothing. The movable Drop point supports dragging, touch and arrow keys; Import then emits from that deliberate origin.

Replay deliberately allows repeated comparisons; it is not the production deduplication/throttle policy. Changing layout/theme, enabling reduced motion or resizing cancels the active effect. The neighboring sample's artwork stays unchanged, although decorative pieces can pass in front of it. The prototype's controls and sample layout simplify the app; renderer/frame checks do not establish physical Safari/iOS performance.

The updated Balanced prototype passed headless Edge checks at 1200×850, 390×844, 360×740 and 844×390 in both themes, for all four image layouts and all three actions. Particle positions were checked throughout their lifetimes for viewport containment, and falling bursts stayed inside the image bounds and continued moving downward late in their lifetime. Screenshot pixel comparisons confirmed particles visibly render over the Save button. Twenty repeated bursts per action produced distinct particle patterns in each tested viewport/theme. Immediate removal, focus restoration, particle counts and motion suppression also passed. Screenshots were reviewed for desktop and phone composition; real-device performance remains an implementation check.

| Acceptance check | Required production behavior |
| --- | --- |
| New arrival, canceled picker, invalid import | Effect only for its owned visible arrival; never on opening/failed/canceled import. |
| Mixed or large multi-file import | One representative arrival response, no particle shower per decoded file; accurate partial-failure feedback. |
| Remove single image | State removal is immediate; sparse proxy fragments use captured former bounds, not a duplicated image. |
| Multiple quick removals | Responsive bounded puffs; no animation backlog or button lockout. |
| Last item or Remove all | No orphan anchors; empty example follows existing behavior; clear-all has no per-item cascade. |
| Save PNG, animation or ZIP | One eligible response after browser handoff; no implication of verified disk save. |
| Slow export with removed origin | Valid captured export remains valid; obsolete decoration is skipped. |
| Mouse, touch, keyboard and paste | Coherent origin for each input; no last-pointer guess for keyboard actions. |
| Native viewer or action sheet | Correct local layer/underlying tile origin; focus and Escape behavior unchanged. |
| Reduced motion, preference Off, forced colors | Immediate useful action/status, no moving decorative layer. |
| Hidden tab, resize, context loss and teardown | Canceled effects, cleared canvases and released resources; no delayed replay. |
| Original, palette changes and animated source | Same comparison, conversion state and playback; no persistent shader or media filter. |
| Export/readback isolation | Effects never enter source pixels, exported bytes, clipboard images or drag payloads. |
| Idle/performance | No idle frame loop, per-frame geometry reads or toolbar observer activity from particles; cost verified on real target devices. |

Passing technical checks is required, but a future implementation also needs an accepted visual design. The current prototype satisfies several containment and lifecycle checks and remains visually unapproved.

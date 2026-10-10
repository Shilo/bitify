# Glass readability and image-relative grids

October 9, 2026. Research and working refinements in `codex/glasskit-prototypes`.

Keep Floating islands. The reported failures belong to the tile action and caption
layer, where small foreground marks sit on unbounded artwork or a patterned canvas.
The bottom editing controls and dialogs already have useful separation. Raising opacity
across the entire interface would cost immersion without addressing the specific cascade
bug that makes image actions disappear on hover.

## What Apple has changed

Apple lists iOS **27.0.1**, released September 28, as its latest release. iOS 27 shipped
September 14. Its September 29 update notes explicitly document Liquid Glass readability
refinements and an appearance slider from ultra-clear to fully tinted. The 27.0.1 notes
list bug fixes, not another glass redesign. Sources: [Apple release list](https://support.apple.com/en-us/100100)
and [iOS 27 update notes](https://support.apple.com/en-us/149076).

The current [iPhone display guide](https://support.apple.com/en-ca/guide/iphone/iphd6804774e/ios)
explains that more tint improves separation, while Reduce Transparency and Increase
Contrast take precedence over the appearance slider. The useful lesson is that clear
material and readable material are adjustable roles, not a requirement for everything
on screen to share the same translucency.

Apple's [Materials HIG](https://developer.apple.com/design/human-interface-guidelines/materials)
and [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)
distinguish clear and regular materials, use background luminance treatment to protect
foreground content, recommend sparing use of glass, and describe stronger accessibility
variants. Native background-adaptive ink and refraction do not automatically transfer to
a CSS backdrop-filter implementation. A stable local scrim is our reliable substitute.

## Reported complaints

The recurring problem is foreground text/icons competing with patterned or text-heavy
backgrounds. [TechRadar's September 2025 reporting](https://www.techradar.com/phones/ios/ios-26-users-say-liquid-glass-is-causing-eye-strain-and-vertigo-here-are-the-possible-fixes)
collects complaints about legibility, eye strain and perceived icon movement. These are
reported experiences, not prevalence estimates. A [June 2026 hands-on](https://9to5mac.com/2026/06/12/ios-27-fixes-liquid-glass-and-not-just-with-a-slider/)
found that iOS 27 improved separation even at high transparency. That review supports the
mechanism, not a claim that all backgrounds or vision needs are now solved.

## GlassKit's own guidance and limits

The [official changelog](https://github.com/JUNGHERZ/GlassKit/blob/main/CHANGELOG.md)
introduces a scrim in 1.7.0 because unknown translucent backdrops cannot guarantee
contrast. Its defaults also acknowledge a contrast problem with white-on-orange primary
buttons. [Library documentation](https://glasskit.jungherz.com/docs.html) provides graded
surfaces and milky variants; the installed 1.22.2 CSS strengthens several hover surfaces.
Thus our increasingly transparent hover is an adapter bug, not a library recommendation.
Some cached website docs are older than the installed package; the package remains pinned
to 1.22.2.

## Implemented tile treatment

The generic hover selector had greater specificity than `.acts .ib`, replacing its
72/76 percent backing with seven percent foreground plus transparency. That made the
button easier to lose precisely when someone tried to operate it.

All three new designs now use one small 92 percent light / 94 percent dark action
capsule. Child icons use fully opaque theme ink. Hover/focus and press use opaque neutral
fills; their selectors explicitly beat the generic hover rule. Focus rings sit inside
the predictable backing. There is one blur surface per action group, not one per icon.
Desktop action targets remain available on hover/focus; the touch Share/Remove behavior
is retained. Tiny desktop tiles compress to 26px outer targets when needed.

Captions use a compact tinted substrate, 13px filenames at weight 600, and 12px metadata
in the same opaque foreground. Their backing masks the pattern immediately behind text
without reintroducing an image card or increasing image inset. Layout allows 35px for
fine-pointer captions and 62px for touch captions/actions, matching their CSS footprint.
Bottom controls and popup material strengths are retained.

[WCAG ordinary text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
requires 4.5:1; [essential icon/state contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
requires 3:1. Hover must not make the required foreground information lose contrast.
Blur alone never guarantees that: it removes detail, not average luminance.

The settled tile surfaces have these computed contrast bounds against completely black
or white backing imagery (including either background extreme under the tint):

| Theme | Caption / normal icon, worst background | Hover / focus | Press |
|---|---:|---:|---:|
| Light | 12.07:1 | 11.49:1 | 8.95:1 |
| Dark | 10.43:1 | 8.78:1 | 6.05:1 |

Calculations use WCAG relative luminance and the declared alpha-composited colors,
with opaque foreground ink. The raw values are in `readability-contrast.json`. This is
an engineering bound for these surfaces, not an accessibility certification of the
whole application or a device rendering/performance measurement.

## Grid and image alternatives

Checkerboard now belongs to the same Canvas grid selector as Lines, Dots and Off.
The old separate checkerboard override obscured which background mode was actually
selected. These are all full-window patterns; user preference remains undecided.

[Aseprite's official Sprite.gridBounds API](https://github.com/aseprite/api/blob/main/api/sprite.md)
documents 16x16 as its configurable default. This is a familiar convention, not a
universal standard. We use that source-space unit for every pattern:

`display scale = available image CSS width / max(source width, source height)`

`cell spacing = 16 source pixels x representative display scale`

The image is contained in a square, so its longer source dimension determines scale.
Only the first shared art surface needs a ResizeObserver; all fitted tiles have the same
square size. The empty example is measured too. Source dimensions, not the smaller
conversion preview or device-pixel ratio, determine the scale. Opening a panel or
resizing updates the background with the fitted images.

Typical image (median) is the default. Average image is available for comparison.
One 16px icon enlarged beside many 64px sprites can skew the arithmetic mean;
area weighting instead biases large photos. Median represents the typical image.
For the six samples at desktop size, 16 source pixels becomes 79.5 CSS pixels by median
or 113.6 by mean. At 390px phone width it becomes 40.75 CSS pixels by median.
Lines/dots repeat at that interval. A checkerboard cell has the same size; its repeating
CSS tile spans two cells, not one. Major guide lines appear every four intervals.

A global grid cannot align exactly with every image when independently fitted images
have different scales and origins. It is a canvas guide, not a measurement overlay.
True pixel alignment would require per-image origins/scales or shared explicit zoom.

When downscaled photography makes a 16px interval narrower than 8 CSS pixels, the grid
skips subdivisions by powers of two. The picker discloses the resulting source spacing.
This avoids turning a dense pattern into an opaque screen. It preserves 16px units as
multiples instead of pretending subpixel lines remain readable.

Image backing offers two optional alternatives: a neutral mid-gray substrate that makes
both dark and pale pixel colors easier to distinguish, and a local mid-gray checkerboard
that helps inspect alpha. Canvas only remains the default for immersion. These substrates
paint only behind each art surface, add no padding and do not alter converted colors or
exported pixels. Local checkerboard uses the shared representative spacing, so it has
the same alignment limitation as the canvas grid.

## Verification and remaining limits

The prototype build and 208 tests in eleven files pass. Five new tests cover source-space
scaling, resize, mean-vs-median outliers, nonsquare images and downscaled-photo density.
Browser checks cover both themes, real mouse hover and keyboard focus, pattern/basis
changes, per-image backing, phone fit, and shared styling in all three new modes.
Physical iOS/Android touch, Safari compositing, hardware blur performance and screen-reader
interaction remain separate device checks. User-selected image colors can still have low
contrast with a chosen substrate; none of these visual aids recolors the artwork.

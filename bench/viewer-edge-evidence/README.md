# Preview edge spacing verification

Before: desktop zoom top/left 12px; lower controls left/right 24px, bottom 20px.
After: all control shells use 24px above 800px wide, 12px at/below 800px, plus
the corresponding safe-area inset. Zoom remains 48px high; lower shells remain
56px. Their outer borders align, rather than offsetting borders to align glyphs.
No runtime JavaScript, timer, listener or gesture behavior was added.

Feedback uses the same top margin on wide viewports and a 12px gap below the
actual zoom capsule on compact ones. Both minimum and maximum widths fit inside
the safe left/right bounds, and feedback is centered within that rectangle.

`browser-regression.json`: 80/80 Codex browser checks, including the existing 67
gesture/playback cases and 13 additional edge/safe-area checks at 1280, 844, 801,
800, 390 and 320px widths. The checks measure every outer edge, 44px targets,
button hit tests, feedback bounds and narrow-layout wrapping. Safe-area fixtures
substitute env() values in the shipped same-origin CSS; they verify CSS geometry,
not a physical notch. The fixture was corrected during development to avoid
cross-origin font stylesheet access and coerce iframe.width from string to number.

`results.json`: 12/12 physical USB Pixel 8 Pro browser checks, including edge
geometry and pinch/pan/dismissal in portrait and landscape. Actual portrait
safe-area values were zero, yielding 12px margins. Landscape reported a real
24px bottom safe-area inset, yielding 48px raw bottom gaps and 24px elsewhere.
An inert test-only padding probe independently reads env() values; this corrected
the initial test assumption that all native insets were zero. Production CSS did
not change in response to that test-assumption failure. Device preferences and
test-origin storage were restored and the test tab/reverse mapping removed.

Native browser input was trusted CDP touch input on the physical Pixel, including
real pointer capture; this does not test human fingers on the digitizer or Safari.
The independent reviewer challenged glyph-center alignment, feedback safe bounds,
native-inset assumptions, bottom hit tests and wrapping. Both agents agreed on
the implementation and final validation. Production build passed.

Reproduce with `npm run build`, `node bench/viewer-navigation-server.mjs 5309`
and the browser's `/bench/viewer-navigation-qa.html` action. For the USB device,
set QA_ORIGIN=http://localhost:5309/ and QA_OUTPUT=./viewer-edge-evidence/ before
running `node bench/viewer-device-qa.mjs` with the authorized device/debug socket.
PNG proof is local and Git-ignored.

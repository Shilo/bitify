# Preview Fit icon and physical Android browser checks

Fit now uses the four-corner Lucide Maximize glyph, statically vendored through
the existing PixelIcon component. The other preview icons already use Lucide.
Four corners are a familiar view-bounds affordance, although there is no universal
Fit symbol and it can suggest fullscreen. The accessible name remains "Fit image"
and the tooltip explicitly says "Fit the whole image. (0)". Zoom tooltips are
"Zoom in. (+)" and "Zoom out. (−)". All shortcuts follow the sentence period.
No gesture logic, sampling, timer or listener behavior changed.

## Verification

- Codex browser: all 67 existing integration cases passed across desktop/phone
  geometries, including pinch, remaining-finger pan, cancellation and dismissal.
  Keyboard focus displayed the revised Fit tooltip and decorative icon correctly.
- Complete unit suite: 969 passed, 2 skipped. Production build passed.
- Physical USB Pixel 8 Pro: 12/12 checks passed in native Android portrait
  (448×819 CSS pixels) and landscape (947×364), DPR 2.25. No browser viewport,
  pointer capture or touch-action overrides were used. Fit has a 44×44 CSS-pixel
  target and returns zoom/offset to 1/0/0.
- Pinch out, lifting either finger first, then moving the remaining finger worked
  in both orientations. The native pointer identities confirm both release orders.
  Lifting did not jump or change scale; continued panning moved both axes by the
  expected 36/30 pixels with scale unchanged. Releasing did not close Preview.
- Pinch inward, stationary two-finger sequences, drag out-and-back, cancellation
  and a subsequent fresh dismissal tap passed in both orientations.
- Recorded native events were trusted and native pointer capture occurred.
  Device rotation preferences and test-origin storage were restored; the owned
  test tab and temporary reverse mapping were removed.

The Android input enters the physical device's Chrome pipeline through DevTools
`Input.dispatchTouchEvent`. This exercises native trusted PointerEvents, capture,
browser gesture arbitration and compatibility clicks. It does **not** establish
human fingers touching the digitizer or validate iOS/Safari.

## Independent challenge and corrections

The reviewer challenged the icon's possible fullscreen meaning; the contextual
tooltip/accessibility name and placement between zoom buttons make it reasonable.
Both agents agreed no extra fullscreen behavior or gesture changes were needed.

The first Android driver mistakenly named the remaining contact in its touch-end
event. Native logs showed the wrong finger lifting and a new pointer appearing
when the next move reintroduced the intended remaining contact. The test failed
scale invariance; no application fix was made. The corrected driver passed, then
was strengthened to assert exactly two pointer downs and both expected pointer
ups in each case, actual first-lift identity and fixture-specific pan deltas.
The final strengthened run again passed all 12 checks. The reviewer independently
checked event identities and transforms and agreed on the interpretation.

The reusable helper refuses to overwrite another task's reverse-port mapping.
It records the prior mapping and preserves an existing identical one.

## Evidence and reproduction

`bench/viewer-device-evidence/results.json` contains final transforms, device
geometry, trusted-event trace and restored rotation state. The original driver
failure is retained in `driver-initial-failed.json`; the Codex browser results are
`browser-regression.json`. Local PNG screenshots are ignored by Git.

Build the app and generate the existing fixture, then serve its frozen production
snapshot with `node bench/viewer-navigation-server.mjs 5302`. With the physical
Android device authorized for USB debugging and its browser debugging socket
forwarded to localhost:9333, run `node bench/viewer-device-qa.mjs`.
`ANDROID_SERIAL`, `ANDROID_CDP`, `QA_ORIGIN` and `PLAYWRIGHT_PATH` can override the
local defaults. Do not run concurrently with another agent controlling the phone.

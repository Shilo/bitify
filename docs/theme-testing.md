# Mobile theme rendering investigation — October 10, 2026

The reported mixed light/dark rendering was reproduced on the USB-connected Pixel 8 Pro in Brave. The document had `data-theme="light"`; computed foreground was `rgb(26, 42, 54)`, the editing surfaces were `rgba(255, 255, 255, 0.6)`, and the checker gradient used the intended light colors. The screenshot nevertheless contained dark editing islands, inverted ink and one dark checker color. GlassKit's theme tokens had already updated correctly.

A hidden `background-color: Canvas; color-scheme: light` probe computed to `rgb(18, 18, 18)` rather than white. Temporarily setting the root to `color-scheme: only light` immediately corrected the real device's painting. The override was then removed. This establishes browser automatic color overriding as the cause, independent of the browser's visible Night Mode setting (the owner reported it disabled).

## Research and fix

- [GlassKit's documented theme contract](https://github.com/JUNGHERZ/GlassKit#-theming) uses the root `data-theme` attribute, which Bitify already supplies. The pinned 1.22.2 library declares ordinary `color-scheme: light`/`dark`. Neither its token definitions nor Bitify's hover adapter were responsible for this repainting.
- [Chrome's Auto Dark Theme documentation](https://developer.chrome.com/blog/auto-dark-theme) describes the Canvas probe and the root `color-scheme: only light` opt-out. Device-size emulation alone does not reproduce automatic darkening; it needs a separate rendering override.
- [Brave's Android appearance documentation](https://support.brave.app/hc/en-us/articles/41672849116045-How-do-I-change-the-browser-theme-in-Brave-Android) describes browser color inversion and potentially incorrect page colors. This explains the class of failure, without assuming the owner's Night Mode toggle was enabled.
- [CSS Color Adjustment](https://drafts.csswg.org/css-color-adjust/#color-scheme-prop) defines `only` as disallowing automatic scheme overrides. Forced-colors accessibility is a separate adjustment mechanism.

Bitify now declares `only light`/`only dark` at the root. Color-scheme metadata is resolved in the existing inline startup script before styles paint, and updated with the theme in the Svelte effect. All palette, conversion, geometry, GlassKit material and saved-choice/system-following logic remains unchanged. No dependency update was required.

Chromium's [color-scheme implementation](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/style/computed_style.cc) deliberately bypasses the author opt-out when force-dark is combined with a **light** preferred scheme, for WebView's `FORCE_DARK_ONLY` behavior. The regression harness tests normal light-system rendering and Android auto-dark rendering with a dark preference separately. It does not assert that author CSS can defeat this browser-enforced WebView mode.

## Verification

Tests use the built production assets, native dialog interactions, real touch input on Android, and screenshots rather than computed colors alone. A static imported logo makes screenshot comparisons deterministic. Transient save messages finish before comparing scenes. Browser settings and production-site storage are not modified; device runs create and close their own localhost test tab.

| Browser/configuration | Screenshot pairs | Result |
| --- | ---: | --- |
| Pixel 8 Pro, Brave / Chromium 154.0.8037.98 | 30 | Identical with auto-dark off/on |
| Pixel 8 Pro, Chrome 154.0.8037.126 | 30 | Identical with auto-dark off/on |
| Edge 155.0.4283.45, portrait touch viewport, dark system | 30 | Identical with auto-dark off/on |
| Edge, desktop viewport, dark system | 27 | Identical with auto-dark off/on |
| Edge, desktop viewport, light system | 27 | Stable normal light/dark rendering |
| Edge, landscape touch viewport, reduced transparency | 30 | Identical with auto-dark off/on |

The scenes cover light → dark → light, the canvas, style settings, all style thumbnails, palette swatches, More, Help, reset confirmation, touch image actions, Preview and Preview's original-image state. Desktop omits the hidden touch action sheet.

The unfixed production build reproduced auto-dark repainting in every light-theme scene; its dark-theme scenes were unaffected. The fixed and unfixed builds produced byte-identical normal screenshots in all 20 distinct portrait scenes (10 scenes in each theme). Additional checks verify saved light reload, saved dark reload on a light system, returning to system-following mode, system preference changes, unchanged global conversion after Preview, byte-identical saved PNGs across themes, and continued forced-colors adjustments. The final unit suite passes all 270 tests in 19 files, and the production build succeeds.

Safari/iOS was not device-tested. These results establish the fix on the reported Android hardware and tested desktop browsers; they are not a guarantee about every browser or future change.

## Reproduce

```powershell
npm run build
node bench/theme-qa.mjs dist profile=phone system=dark
node bench/theme-qa.mjs dist profile=desktop system=light
node bench/theme-qa.mjs dist profile=landscape system=dark transparency=reduce
```

For Android, enable and authorize USB debugging, unlock the phone, and keep its browser foregrounded. Find the browser socket with `adb shell cat /proc/net/unix`; Brave may own `chrome_devtools_remote` while Chrome uses a process-suffixed socket.

```powershell
adb forward tcp:9555 localabstract:chrome_devtools_remote
$env:DEVICE='9555'
node bench/theme-qa.mjs dist
```

The harness serves the build through `adb reverse tcp:5199 tcp:5199`, uses its own tab and closes it after testing. Remove the forwarding/reverse mappings after the run. An archived unfixed build can be checked with `node bench/theme-qa.mjs <build-directory> baseline=1`; that mode expects repainting to reproduce. Screenshots and machine-readable results are generated in the ignored `bench/theme-qa/` directory.

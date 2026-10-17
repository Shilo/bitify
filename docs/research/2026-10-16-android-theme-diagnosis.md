# Android theme diagnosis — October 16, 2026

The reported Light-mode failure is reproduced on the connected Pixel 8 Pro in Brave 155. It is a browser-forced repaint, not a lost app theme preference. There is no verified app-side fix for that global override. A separate narrow correction protects the legacy 1-bit color-selection previews, following the already-working full-palette paint-only canvas approach.

## Evidence before changing anything

The authorized phone was unlocked. Android night mode was on, rotation was free, and Brave reported a **light** `prefers-color-scheme`. App Light correctly set `data-theme="light"`, root `color-scheme: only light`, the matching meta tag, and light browser-bar theme-color values. Nevertheless, native ADB screenshots showed the Help dialog and light UI repainted dark.

A read-only visit to `brave://flags/#enable-force-dark` confirmed **Auto Dark Mode for Web Contents: Enabled**. Its separate “Darken websites checkbox in themes setting” experiment was Default (Disabled). No flag, browser setting, OS theme, or rotation preference was changed, and Brave was not relaunched.

The diagnostic rendered a temporary CSS row and a parallel paint-only canvas row, then sampled an **ADB native screen capture**, locating the content offset from three canvas marker squares. Values came from screen pixels, not `getComputedStyle` or canvas readback:

| Intended RGB | CSS-painted native RGB | Canvas-painted native RGB |
|---|---|---|
| `#ffffff` | `#121212` | `#ffffff` |
| `#fff1e8` | `#2b211b` | `#fff1e8` |
| Light app background `#f1f2f3` | `#242526` | `#f1f2f3` |
| Light checker `#d2d6da` | `#383b3e` | `#d2d6da` |

All fifteen canvas diagnostic samples stayed exact. Dark app background/checker tokens stayed exact under the current browser setting. Independent review of native Light/Dark wall and Help screenshots found readable text in both; Light's fidelity, rather than a reproduced general contrast defect, is the issue.

The 1-bit palette review exposed an additional color-critical UI gap: its CSS pair previews and native/current-color backgrounds are also transformed. The [native Light 1-bit palette screenshot](../../bench/android-theme-practical-2026-10-16/native-onebit-light-palettes.png) visibly shows Glow's near-white current swatch as dark, Mono as black/dark, and Torch's cream as brown, while the artwork canvas retains the intended inks. Full-palette controls already use protected canvases, but these legacy pair controls did not. The reviewed correction paints the diagonal pairs and opaque current inks onto decorative canvases. None's checker/glyph and the real native input targets remain in place. This protects the actual colors being selected; it does not promise to preserve the entire Light interface against a browser override.

The native candidate checks verify twelve preset pair interiors plus both current-color centers in each theme, using actual screen pixels under the unchanged forced-dark flag. Actual Android Blue/Set selection restores a None color and updates its canvas; Swap retains the native inputs and correct values. Native PNG and 32-frame GIF downloads are byte-identical to baseline, with zero independently computed Solid-luma threshold/alpha mismatches and unchanged GIF timing/loop. See [Dark acceptance](../../bench/android-theme-practical-2026-10-16/onebit-fixed-dark-results.json), [Light acceptance](../../bench/android-theme-practical-2026-10-16/onebit-fixed-light-results.json) and [native independent exports](../../bench/android-theme-practical-2026-10-16/onebit-exports/results.json). The focused source change is committed separately as `db39123`; the 5343 candidate has identical runtime files.

## Controlled challenge and rejected guard

Per-test-tab CDP diagnostics compared light/dark media, auto-dark on/off, and both app themes. With dark media, the existing author opt-out preserved all fifteen CSS and canvas samples even with auto-dark enabled. With light media plus auto-dark, CSS colors changed as in the unmodified phone. That matches the forced-dark-only exception described in Chromium's implementation history; this diagnostic did not infer a browser preference from computed CSS alone.

A proposed temporary guard kept the app's Light tokens while setting root and meta `color-scheme` to `only dark`, then `dark`. Neither fixed even the white/background probes on the native device. The experiment was rejected; it would also misrepresent the author theme to native controls. No inverse-color trick, blanket forced-color accessibility override, or canvas reconstruction of the whole interface was shipped.

[Chrome's documented author opt-outs](https://developer.chrome.com/blog/auto-dark-theme) are already present in Colorfetti. The observed explicit forced override bypasses them. Faithful Light rendering on this phone therefore requires the user to disable **Auto Dark Mode for Web Contents** (or use a browser that respects the page opt-out); app Dark remains usable with the override. That browser choice was left unchanged. A website cannot promise that arbitrary future browser-enforced paint transformations will never happen.

## Covered surfaces and preserved state

The native matrix used actual More-menu theme buttons, including four reload checks, Recolor controls, More, Help/logo, full-palette rail, palette editor, text input, review swatches, New/Edit color previews, and 1-bit wall/palette/style controls. Scoped diagnostics were destroyed with their owned test tabs, and only the test origin's original local storage was restored. Native OS appearance/rotation values matched their originals afterward.

Evidence: [matrix and original/restored state](../../bench/android-theme-practical-2026-10-16/results.json), [rejected guard](../../bench/android-theme-practical-2026-10-16/guard-results.json), [read-only browser flag and 1-bit receipt](../../bench/android-theme-practical-2026-10-16/onebit-flags-results.json), [native browser flag screenshot](../../bench/android-theme-practical-2026-10-16/native-readonly-brave-dark-flag.png). Tests target isolated committed build `7ed49fd` on port 5341, not a dirty development build. The first test-only modal-marker and Help-selector failures were corrected; the selector failure receipt is retained separately and is not a product failure.

This is an unresolved browser override with a confirmed cause, not a claim that Light mode was fixed. Normal browser appearance must be distinguished from the explicit forced override in future QA.

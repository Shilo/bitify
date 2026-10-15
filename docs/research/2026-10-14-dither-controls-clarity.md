# Dither controls clarity review

Date: October 14, 2026. Baseline 5124e77; updated production build index-Cs1x5G3r.js.

The visible and accessible label is now **Dither strength**, replacing Amount. It remains directly below the enabled Dithering choices and disappears when Off. This communicates the relationship without an extra divider, toggle or row. Off remains the default and strength remains 50%. Existing native range ownership, cancellation and conversion semantics are unchanged.

Keep **Off / 2×2 / 4×4 / 8×8**. The dimensions describe the repeating source-pixel pattern; bare 2/4/8 could be confused with color counts, particularly beside Max colors. The tooltip now states that meaning. A 1×1 tile cannot alternate two colors spatially, so it would add no useful ordered-dither control beyond nearest/Off. Ordered patterns need not be even in general; the current recursive Bayer rank construction uses powers of two. Odd sizes would be a distinct threshold-map design needing demonstrated artistic benefit, not a missing numerical increment. Larger dimensions offer more realizable coverage steps but do not guarantee better art.

The independent reviewer initially suggested a separate Off/On switch plus Patternsize row, then accepted the combined four-choice group after considering phone height and the extra interaction. There is no observed usability benefit to adding a toggle for the same three enabled choices. This is a design judgment, not a participant usability study.

The explicit two-word strength label wraps inside the existing 78px column. The slider has a 44px hit height. The 320px portrait layout has no horizontal overflow; the range and percentage remain visible. At 740×320, the panel scrolls and keyboard focus brings strength into view (panel 232px client height,374px scroll height; focused strength within138–182px). Physical Pixel 8 Pro at 448 CSSpixels has no overflow, a 44px range and a clear associated label. Portrait and landscape screenshots are retained here:

- [Desktop](../../bench/palette-dither-ui-review/desktop.jpg)
- [320px portrait](../../bench/palette-dither-ui-review/desktop-320.jpg)
- [Short landscape after focusing strength](../../bench/palette-dither-ui-review/desktop-short-landscape.jpg)
- [Physical Android](../../bench/palette-dither-ui-review/android.png)

The updated 20-phase built-app suite passed in [Codex Browser](../../bench/palette-dither-ui-review/desktop-acceptance.json) and on [USB Android](../../bench/palette-dither-ui-review/android-acceptance.json), including hidden strength while Off,0/50/100% every pattern, RGB+cap+Cleanup, independent PNG/GIF/ZIP decoding, rapid edits, immutable exports, enlarged preview, persistence, family return and Reset. The Copy phase now opens the visible phone image actions sheet instead of activating its hidden desktop Copy button. The harness still intercepts clipboard writes to inspect encoded PNG; OS clipboard readback is not claimed.

Native Android controls independently committed 51%, then image actions→Save produced a real downloaded PNG. Only that uniquely named owned fixture was pulled from the phone; independent PNG decoding matched the captured 4×4/51% full-source conversion ([result](../../bench/palette-dither-ui-review/android-native-save.json)). The sandboxed Edge boundary harness also passed stale-range ownership, 256+empty PNG fallback and atomic GIF/ZIP overflow checks after the label change. The production build passed. This copy/layout change does not alter the kernel, so previous comparative output/performance semantics remain.

The first native-download attempt was canceled by the automation connection’s download-deny behavior. Restoring normal browser download handling allowed the real file to save; the retrieved PNG then passed independent comparison. This was a test environment setting, with no app export change required.

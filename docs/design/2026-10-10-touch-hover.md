# Touch hover correction

Mobile browsers can leave :hover matched after tapping. The application and GlassKit 1.22.2 both supplied unrestricted hover rules, so action buttons appeared selected after release.

The Vite PostCSS adapter in build/hover-capability.js processes actual selector pseudos from app and imported library CSS. Original hover rules run only under (hover: hover). Mixed focus/active/ordinary alternatives run under (hover: none), replacing hover with the impossible, equally specific :nth-child(0). Rules keep their cascade position and outer media conditions. Top-level hover-only branches have no touch fallback. The selector parser avoids treating attribute text as a pseudo-class. Negated hover is covered too.

State rules are untouched: palette selection rings, style thumbnail fills, transparency segments, Auto, settings chips, conversion and expanded panels. Touch action buttons get a transient inset shadow during active press, preserving their background tokens. The shadow clears after release; keyboard focus remains visible. Primary-input capability is used, so mixed-input devices with a hover-capable primary pointer retain hover behavior.

## Validation

- Build and 264 tests passed, including eight adapter regression cases.
- Audited generated CSS: all 60 remaining hover selectors are capability-gated.
- Production touch fixture: 20 UI/theme stages and 507 button material comparisons passed with forced lingering hover, including palette/style/transparent selections, settings, More, Help, Reset, image actions and Preview.
- Actual browser pointer click: Swap still matched hover after release, while its background stayed transparent and its shadow reset to none.
- Actual held pointer: transient inset appeared while active and disappeared after release.
- Touch keyboard navigation retained a 2px focus-visible outline.
- Hover-capable desktop retained its hover tint and keyboard outline.
- Independent subagent review found a valid negated-hover edge case; fixed and reran all tests plus touch material checks. Final review found no remaining actionable issue.

These are desktop browser input/media simulations, not physical-device verification of the fix. The user reproduced the original fault on a phone.

To reproduce the material audit: npm run build; node bench/design-qa.mjs; node bench/hover-qa.mjs. Open /bench/design-qa/hover-touch.html at 390 x 844. It forces selector hover independently of pointer state, comparing settled computed materials with and without hover across the UI in both themes. Manual pointer and keyboard checks additionally verify real active/focus behavior.

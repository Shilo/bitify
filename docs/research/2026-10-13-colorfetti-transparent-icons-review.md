# Colorfetti transparent icons — implementation and review

Reviewed October 13, 2026. The [brand guide](2026-10-13-colorfetti-identity.md) defines the current production identity.

## Delivered behavior

The approved square logo now has a transparent, tightly cropped 30-unit master, with uniform 2-unit gaps and no outside margin. Light and dark variants change only the C from `#202020` to `#FFFDF9`; all five confetti colors and their positions remain fixed. Help, the live recoloring example and README select appropriate transparent artwork.

Browser favicons follow the browser's reported color preference independently of a saved app theme. Explicit SVG, PNG and ICO variants avoid relying exclusively on SVG-internal dark-mode CSS. Versioned URLs invalidate the earlier opaque favicon. The adaptive SVG remains the script-disabled fallback.

Installed PWA and Apple icons retain opaque off-white backgrounds and platform padding. Maskable exports keep the complete mark within the safe circle. Separate monochrome and pinned-tab assets preserve the silhouette. Installed icons do not promise dynamic theme switching.

## Independent review and disposition

A separate read-only reviewer checked the generator, exact source pixels, ICO decoding, startup selection, app lifecycle, documentation and browser evidence. The reviewer found no demonstrated production defect in the reviewed implementation and raised three issues:

| Finding | Parent evaluation | Resolution |
| --- | --- | --- |
| Delaying a fetch did not prove theme changes occurred during loading | Valid test gap | Added an explicitly gated startup fetch. Theme changes occur before release; the completed converted demo must use the latest app theme. |
| Converted-preview coverage was insufficiently explicit | Useful coverage request; the claim that earlier theme flips always remained Original was too broad because palette publication resets that state | Added explicit converted-state assertions, repeated theme flips, 1-bit reanalysis and return to Auto. |
| Historical rebrand audit could be mistaken for current opaque-icon guidance | Valid documentation ambiguity | Added a supersession note linking the current guide; retained historical measurements. |

The reviewer then checked the final corrections, confirmed all 15 browser cases and three asset-render sets passed, acknowledged the overstated Original-mode claim, and reported no remaining demonstrated defects.

During implementation, browser testing exposed a blank converted demo after repeated source changes under the same numeric demo ID. The demo is now keyed by its immutable source image identity, so switching between the two cached theme sources remounts that tile. Ordinary imported-image keys remain unchanged. Reanalysis of the same source preserves its tile. No broader conversion-cache refactor was needed.

## Verification

- `node build/brand-assets.mjs --check`: all 23 generated exports match the master and generator; maskable containment passes.
- `npm test`: 803 passed, 2 existing skipped, across 53 test files. Icon checks include exact colors, alpha, dimensions, cropped bounds, ICO alpha/AND masks, opaque installed padding and monochrome roles.
- `npm run build`: passes.
- `node bench/brand-icons-qa.mjs`: 15 cases passed across Edge, Firefox and WebKit, plus three independent engine asset-render sets. Covers desktop/phone viewports, light/dark preferences, saved app overrides, live preference changes, root/project subpaths, pending startup decoding, Original/converted previews, repeated theme switches, 1-bit reanalysis and imported-source preservation. Manifest and installation-asset URLs resolve; no JavaScript or local-asset errors were observed.
- Help screenshots were inspected for transparent artwork and layout on light and dark surfaces.
- `git diff --check`: passes.

Browser results and screenshots are written to ignored `.tmp/brand-icons-qa/`. Playwright and sharp must be available for the browser harness; their module paths and browser executable can be supplied through its environment options.

## Remaining platform limits

Automated tests verify delivered pixels, favicon URLs and engine rendering. They do not verify native Safari tab-bar painting or physical iOS/Android launcher installation, cropping and platform recoloring. Phone cases use emulated viewports. Browser-reported color preference cannot detect every arbitrary custom tab theme. The script-disabled adaptive favicon can still encounter browser-specific SVG media-query limitations.

The fixed palette was preserved. Small-size recognition and color-blind usability require user testing; this implementation does not establish those claims.

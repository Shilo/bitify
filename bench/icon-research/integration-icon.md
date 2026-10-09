# Icon integration decision and results

Adopt the repaired cavity/notch detector for small transparent sprites in **Icon**.
Do not change Stencil again or add another style. Default Detail 50 / Auto now gives
the supplied helmets their open faces, the breastplate its neck gap and the compass its
dial. The breastplate's shadow and incomplete torso collar remain known limits.

This is a practical resolution to the implementation choice, not a claim that arbitrary
AI shading has become semantically recoverable. The 65 examples were used during design.
No additional raters, generation credits or external services were used.

## Exact changes

- Added `src/lib/icon-glyph.js`: bounded typed-array preparation for components with at
  most 1,024 source pixels in a 64×64 box, on an image with transparency, in Auto/Keep.
  It selects connected cavities containing a 2×2 block, short dark seams between brighter
  pixels and dark continuations of silhouette notches. Otsu, recursive dark-group splitting,
  the interior median and source geometry gate the cuts. It honors analysis alpha and
  Brightness, instead of the research detector's hardcoded alpha 128.
- Modified `src/lib/icon.js` to use that preparation where applicable. Larger/opaque art
  and Trim retain the original groove/outline-peel implementation. No production pixel
  loop in `bitify.js`, UI setting or palette behavior changed. The new path keeps full
  source support at Detail Off, rather than peeling a whole black stroke automatically.
- Detail ranks whole inner regions. Default dark features enter by 50; weaker supported
  seams can enter above 50. Increasing Detail never reverses a cut. At 50, Auto attempts
  straight row/column openings from cavities or notches, not seams. Keep preserves the
  source edge. Inner selection is finalized before opening; later weaker cuts are validated
  against both kept and opened bodies, keeping the two modes' inner cuts in agreement.
- Opening acceptance is transactional and order-independent. Both four- and eight-
  connectivity are checked. Protected interior cores survive. The combined final opening
  cannot leave a previously supported ink pixel with fewer than two eight-neighbors.
  Judging partial rays by that last rule alone incorrectly rejected the leather cap; the
  final combined opening passes. The checks are not a proof of semantic recognition.
- Removed the old 25% cut-budget assertion for the cavity path: it suppressed legitimate
  broad openings. The previous large/opaque/Trim path retains its budget. No hand-selected
  item name, pixel coordinate or feature target appears in production conversion.
- Added source-informed opening, transform, alpha and rollback regression tests and three
  synthetic source fixtures. Added Icon to the existing documentation/example test.
- Updated `docs/styles.md`, the app spec and `docs/performance.md` to describe actual
  behavior, limits and measured cost. Updated benchmark/equivalence harnesses. Added the
  frozen candidate, targets, full comparison and export package here for reproducibility.

Stencil retains commit `274d86b`'s per-pixel interior median cap. The earlier Cuts 75→76
whole-sprite flip is already fixed. Its output is unchanged by this integration.

## Results and reproducibility

- [Before/after viewer](integration-icon.html): all 65 items at native size and integer enlargement.
- [Full source pixels, masks, metrics and hashes](integration-icon.json).
- [65 native PNG exports](integration-exports.zip), one ink plus binary transparency.
- [Comparison builder and export decoder](integration-icon.mjs).
- [Production synthetic safeguards](integration-check.mjs).
- [Frozen reviewed detector](icon-candidate.mjs), SHA-256 of canonical LF text
  `755ff52f0fac27c22b9fe1970d6e9a7fa51168260a17453a4479cf8db4c6323c`.
- [Author-defined filtered targets](icon-targets.json): source interpretations for measurement;
  they never enter conversion, and exclude source rim/corner pixels.
- [Initial algorithm/preprocessing research](report.html) and [flat-icon subagent research](flat-icon-research.html).
- [Before](integration-performance-before.json) and [after](integration-performance-after.json) timings.

Run from the repository root:

```powershell
node bench/icon-research/integration-icon.mjs
node bench/icon-research/integration-check.mjs
npm test
npm run build
```

The comparison builder retrieves the previous Icon module from `274d86b` into ignored
scratch space and imports the frozen candidate here; it does not depend on Claude's live
folder or older untracked experiments. It asserts exact agreement between production
default and the approved candidate on **all 65 items**. All four marked breastplate neck
pixels and all 14/12/22 marked helmet-opening pixels reach the outside. Coverage is not
recognition accuracy. The torso still cuts 3/6 marked collar pixels.

Default Keep cuts 734 pixels across the corpus; Auto cuts 755. Its 21 additional opening-
path pixels affect seven items and include two corner pixels as well as 19 four-neighbor
source-rim pixels. Fourteen items have no selected cuts. At every Detail value, all 65
items stay nonempty, retain source support and preserve eight-connected components.

Production checks also pass on the three rollback counterexamples plus 600 generated
notched blocks with dark patches, at five Detail levels in Keep/Auto and under reflection
and quarter turn. These are synthetic geometry checks, not unseen inventory recognition.
The unit tests cover preview sampling, native colors/transparency, adjustable alpha,
brightness, meaningful exterior openings and the previous groove path.

The PNG check decodes all 65 encoded files: native dimensions and every palette index
match the masks exactly; alpha is binary and there is one visible ink. No canvas readback
is used for encoding. Equivalence checks cover 24,000 unchanged image/style/setting cases
including Stencil and 2,400 intentional Icon cases with exact structural preview sampling.

## Browser verification and limits

The actual app was loaded with the breastplate and all four source sheets in the Codex
browser. Icon, Detail 50, None/ink and Auto/Keep controls were checked; the live output and
comparison page were inspected. No production UI was changed. The ordinary app viewport
had no horizontal overflow. The browser's viewport override did not affect that tab;
an embedded real app viewport measured 390px with 390px document width on the empty screen.
Nested-frame file-picker capture timed out, so populated 390px/touch-device validation is
not claimed. The temporary override was reset and QA tab closed.

Browser download-event capture also timed out; successful native download capture is not
claimed. Full-native encoding was instead verified by decoding the real PNG encoder's
outputs as described above. These automation limitations do not establish an app bug.

Fresh preparation of all 65 items together measured 6.263 ms versus 2.782 ms before;
cached updates measured 0.289 versus 0.226 ms on this desktop. Large-image single-pass
timings varied and are recorded without a speedup claim. GIF frames remain independently
prepared; semantic detail may flicker when source art changes. Human recognition on
previously unseen AI inventory art is unmeasured. None of those uncertainties needs another
round-trip to settle which implementation is being delivered here.

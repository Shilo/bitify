# Preview navigation: decision, implementation and verification

## Decision

Worth implementing for inspecting recoloring, transparency, dithering and sprite
details. A fullscreen fit alone cannot expose detail in a large image. Keeping tap
to close is feasible, but it remains less forgiving than a viewer where a tap only
toggles controls. A user who intends to manipulate the image and taps without
moving will close it; that is the requested interaction, not something gesture
recognition can reliably infer away.

The principal conflicts and decisions:

| Conflict | Decision |
| --- | --- |
| Tap closes; double tap normally zooms | Do not offer double tap/double click zoom; visible +/− and Fit make zoom discoverable. |
| Drag returns to its starting point | Track whether it ever crossed 8 CSS pixels; never reconsider it as a tap. |
| Last finger lifts after pinch | Keep the entire sequence disqualified from dismissal; rebase remaining-finger pan. |
| Hold compares, but fingers need to drag | Retain 450ms stationary comparison; movement or another finger immediately restores the prior comparison state. |
| Unbounded panning loses the image | Clamp oversized axes to image edges; center undersized axes. |
| Native file dragging conflicts with pan | Preview dragging pans. Wall dragging still uses the existing native export controller. Save/Copy remain available in Preview. |
| Wheel normally changes app settings | Handle wheel within Preview artwork only; preserve toolbar guards and app modal isolation. |
| Browser zoom competes with image zoom | Scope touch-action to artwork; allow browser Ctrl/Cmd keyboard zoom and native behavior on controls. |
| Scaling a fit-sized bitmap reveals no detail | Refine Tile sampling after 180ms, with a 4MP clip-wide refinement target and existing Fit/source/short-axis rules. Long clips may remain Fit sampled to avoid multiplying per-frame caches. |
| Full-source conversion at every pinch move stalls | Transform immediately; defer sampling. Panning does not resize conversion buffers. |

The Pointer Events specification requires declaring touch-action before a gesture
and describes capture/cancellation semantics. Implementation follows those rules:
[W3C Pointer Events](https://www.w3.org/TR/pointerevents/latest/).

## Scope and collaboration

`src/lib/viewer-navigation.js` owns geometry, sequence ownership and the viewer
action. `src/viewer-navigation.css` contains scoped gesture/control presentation.
ImageViewer delegates its old dismissal handling to that action and presents the
transformed Tile. Tile has one optional sampling multiplier, defaulting to 1.
No matching kernels, exporters, wall gesture controller or global preference
storage changes were needed.

The working tree already contained contributor edits in App, Tile, ImageViewer,
Dock and palette import/usage code. Their final Save/Copy/Compare Preview toolbar,
wall Reuse actions, usage metadata and updated props are preserved. No branch
reset, stash or broad source rewrite was used. Development HMR reloaded a test
page while other changes landed, so acceptance uses a server that snapshots
production assets. A private Git index isolates task changes, including only the
Preview sections from shared documentation files.

## Initial verification, before independent review

- `npm run build`: passed.
- Full Vitest suite at the tested working-tree state: 63 files passed; 965 tests
  passed and 2 skipped. The new navigation suite contains 16 tests, including 500
  deterministic geometry transitions, anchor invariance, bounds, gesture return,
  hold, cancellation, secondary input, resize and both pinch-release orders.
- Codex Browser loaded the actual production build and ran
  `bench/viewer-navigation-qa.html`: **50/50 checks passed**. Cases cover 1100×760,
  390×844, 320×568 and 844×390; open/close/reopen; zoom limits; wheel units and
  Ctrl-wheel; drag/touch/pinch pointer sequences; comparison; control releases;
  keyboard; raster refinement; resize and GIF import/viewer return.
- Actual Codex browser mouse input verified wheel zoom anchored near the cursor,
  pan in both axes, controls remaining available, click dismissal after zoom and
  four consecutive artwork-click open/close cycles. Phone-size actual mouse input
  verified horizontal-only pan below the vertical-overflow threshold, then both
  axes after sufficient zoom. Native keyboard input verified zoom and arrows.
- Native toolbar Save before and after zoom/pan produced identical 18,810-byte
  PNGs with 1600×1000 dimensions. Zoom never cropped or resized the export.
- Evidence: `bench/viewer-navigation-evidence/integration-results.json`,
  `export-result.json`, `desktop-zoom-pan.png`, `phone-fit.png`, and
  `phone-zoom-pan.png`.

Reproduce: `node bench/viewer-navigation-fixture.mjs`, `npm run build`,
`node bench/viewer-navigation-server.mjs` and open
`http://127.0.0.1:5294/bench/viewer-navigation-qa.html` in Codex Browser; select
Run integration checks. The server snapshots JS/CSS to avoid concurrent HMR.
The unit suite needed workspace TEMP/TMP on this Windows sandbox because its
default temporary SSR-cache rename returned EPERM.

## Limits

The available Codex Browser interface exposes mouse input and viewport changes,
but no native multi-finger injection or coarse-pointer emulation. Touch sequences
in the integration harness use synthetic touch PointerEvents, and bypass capture
only in that harness because synthetic pointers have no native capture stream.
Actual mouse checks exercise production capture. Phone-size screenshots retain
the browser's real mouse pointer media settings. These checks do **not** validate
native touchscreen capture, OS pinch arbitration, physical Android/iOS, or Safari.
The expanded review suite also observes changing Original pixels in a larger GIF
in both families; it is not a frame-rate measurement. Very large sources remain
sampled and existing minimum short-axis rules can exceed the refinement target.
No measured physical-device performance or universal memory-cap claim is made.

## Independent review and disputed findings

The user requested an adversarial sub-agent review, counter-review, repeated
testing after fixes, and a commit containing only this task. The reviewer read
the implementation independently, exercised native Codex Browser input and ran
additional pointer-order/cancellation assertions. Findings were checked against
source and reproducible behavior rather than accepted by severity label alone.

| Finding | Challenge and agreed disposition |
| --- | --- |
| P2: focused artwork advertises Close but Enter does nothing | Independently reproduced: Tile prevents native Enter and has no activation callback in Preview. The first proposed callback fix was rejected because Tile's `onactivate` also renders an Add images caption. The agreed fix handles unmodified, nonrepeated artwork Enter in the existing viewer key capture and keeps the Space guard. Native toolbar Enter remains independent. |
| P2: per-frame refinement amplifies animation retention | Confirmed from actual cache ownership. For an 800×800×60 clip at 390px/DPR1, legacy mask/color storage alone can rise from nominal 45.6MB at Fit to 192MB after source-size refinement, before Original buffers. These are deterministic byte counts, not a measured heap/crash. A broad transient-cache rewrite was rejected as unnecessary risk. The agreed narrow fix divides the 4MP refinement allowance across frames, with multiplier floor1 to preserve existing Fit behavior. |
| P2: visible feedback covers mobile zoom controls | Native Copy at 390px produced a toast over Fit/+; center hit-testing returned toast text. Persistent failure feedback could cover them indefinitely. Raising zoom z-index or disabling toast pointer events was rejected because Retry must stay readable and usable. The proposed 680px breakpoint was challenged using a 44px left safe-area offset on a 700px landscape screen; both agents agreed to the existing 800px viewer breakpoint, with feedback below the zoom shell. |
| P2: harness expects the contributor's removed Preview Reuse control | Independent rerun correctly failed four old geometry assertions. The accepted contributor design is Save/Copy/Compare in Preview. The harness was corrected, not the product reversed. Button lookup is now dialog-scoped so wall buttons cannot satisfy viewer assertions. |
| Suspected lost-capture/last-finger dismissal | No defect reproduced. Native captured drag beyond the iframe viewport retained Preview, then a genuine click dismissed. Three-finger permutations/cancel/resize rebased correctly. No speculative production workaround was added. |
| Suspected stale ready flag, pan deadzone and clamp hysteresis | No realistic stale-tap reproduction was found. Slop and constrained-edge behavior are intentional and tested. No change agreed. |

The expanded harness adds artwork Enter/Space/repeat coverage at every viewport,
visible message/busy/failure layout and Retry hit testing, 700/800/801px safe-area
offset cases, and an 800×800×12 GIF in Palette and 1-bit modes. The GIF checks
converted/Original raster sizes and advancing Original pixels. Visible feedback
layout fixtures clone the actual toast DOM; they do not inject production failure
hooks or claim to test the unchanged job-recovery algorithm. Native Copy separately
checks the real feedback path.

The first expanded run passed 65/67: the growing results log placed the animated
iframe below the parent viewport, so the app correctly paused offscreen playback.
Native scrolling immediately restored changing frames. The harness now bounds
its log below the iframe and keeps the iframe onscreen; no production playback
change was made to accommodate the test.

## Final acceptance after review fixes

- Parent and independent reviewer each passed **67/67** production-browser checks
  on the corrected harness and the same reviewed JS/CSS snapshot.
- Full unit suite: **969 passed, 2 skipped**, across 63 passing test files.
- Independent reviewer probe: **94 assertions passed**, covering all six
  three-pointer release orders, cancel/resize, rebase invariance, hold retirement
  and return-to-origin gestures. The focused navigation/layout suite passed
  **23 tests**, including four animation sampling regressions.
- Native parent/reviewer input verified artwork Enter closes, toolbar Enter zooms,
  actual Copy feedback leaves zoom clickable, and captured dragging retains the
  image until a later genuine click. At 390px the toast starts at y=80 while zoom
  ends at y=68. A second native zoom click succeeds while the message remains.
- Parent rechecked actual wheel zoom-out, reopening and two-axis mouse pan.
  New PNG saves before/after manipulation remained identical: **39,089 bytes**,
  original **1600×1000** dimensions, under the final test's Auto palette.
  Browser warning/error capture was empty for that native test tab.
- `npm run build` passed after the production fixes. Evidence is in
  `bench/viewer-navigation-evidence/reviewed-integration-results.json`,
  `reviewed-export-result.json`, `reviewed-phone-feedback.png`, and
  `bench/viewer-review/results.json`. Run the independent probe with
  `node bench/viewer-review/adversarial.mjs`.

Both agents agreed that no further implementation fixes were supported by the
collected evidence. Native touchscreen arbitration and Safari remain unverified;
no claim of physical-device completion or universal memory safety is implied.

The isolated commit candidate was also extracted from the private index and
independently passed the full 969-test suite, the 94-assertion probe, and a
production build. Uncommitted App changes were excluded from this candidate.
The bench PNG screenshots remain local evidence under the repository's existing
`bench/.gitignore`; the landmark PNG is reproducible with the fixture generator.

# Practical workload and Android theme review

October 16, 2026. Independent, read-only challenge of the practical workload and
Android theme investigation. This reviewer made no production edits and did not
control the USB phone or the root agent's Codex Browser.

## Round one: contracts and evidence requirements

- Accepted a bounded practical cohort: eight licensed Kenney sprites, sparse
  1024/2048-pixel sprite sheets assembled from that artwork, and 32/48-frame motion
  assemblies. The assemblies must not be described as hand-authored walk cycles;
  the sparse sheets do not cover dense high-entropy art. Requested a retained
  genuine animation if licensing and test time permit.
- Required rendered-frame readiness for sampled walls, rather than waiting for
  full-source color counts that such walls intentionally do not compute. Required
  rapid setting changes, Preview cancellation, animation progression and export
  timing/loop checks.
- Required native saved PNG/GIF decoding for output checks. Android canvas
  readback is unsuitable as a sole oracle because the retained earlier tests
  demonstrated fingerprinting-related readback perturbations. Separate a scalar
  independently implemented nearest-color oracle from comparisons that reuse the
  app's committed cap/Cleanup/dither pipeline. Hidden RGB beneath alpha zero is
  not a visible-color failure.
- Required native Android screenshots and rendered-color probes beside computed
  CSS for theme claims. Existing author `only light`/`only dark` opt-outs and
  paint-only palette canvases make correct CSS insufficient evidence by itself.
  Browser settings must remain intact. Per-page forced-dark emulation must be
  distinguished from the user's native browser preference and restored afterward.
- A repeated task over 100 ms is an investigation signal, not automatic proof
  that a product change is required. Whole-source RGBA and worker storage are
  outside the documented 8 MiB preview-index cache; neither renderer heap alone
  nor a single timing establishes a whole-app memory bound.

Independent focused checks passed **90 tests in eight files** covering GIF
encoding/decoding, animation-cache lifecycle, Save/batch Save, palette export,
usage aggregation and startup theme resolution. The first sandbox attempt ran no
tests because Vitest temporary-file renaming was denied; the host rerun passed.
Receipts are in `bench/practical-challenge-2026-10-16/`.

## Round two: result and candidate challenge

The first workload harness had two evidence defects, not demonstrated app bugs:
an animation assertion used cumulative paint counts from earlier interactions,
and the settings phase could finish at an intermediate RGB paint. The workload
owner agreed and corrected both before the accepted run. Animation progression
now measures each animated tile's paint delta in the dedicated observation
window; the settings phase waits for paints following its final dither choice.
The normal Preview check does not claim a deliberately forced pending-inspection
cancellation. A separately licensed authored effect sequence was added, with its
alpha-to-binary GIF transformation and assigned timing explicitly recorded.

A further harness review caught repeated `addInitScript` installation on the
Android runner's reused page: each subsequent reload could wrap canvas writes and
start observation loops more than once. The owner added a per-document
idempotence guard before accepting phone timings/playback. An independent mocked
installation check reproduces two observers, rAF loops and count increments before
the guard versus one of each afterward. Its script and receipt are in the review
bench directory. Earlier native export pixel checks are not invalidated by this
instrumentation defect; affected timing and playback claims require corrected
runs. Desktop uses a fresh context per case and was unaffected.

The strengthened desktop matrix passed all five cases and 33 measured phases,
with no observed long task above 50 ms. Its 26 native downloaded entries cover
17,843,592 decoded pixels with zero visible RGB or alpha mismatch and unchanged
frame counts, delays and loop metadata. Nearest uses the independent scalar
oracle; enhanced cap/Cleanup/dither comparisons reuse separately executed app
modules plus independent decode/membership/alpha checks. This is a bounded result
for the documented sparse sheets and clips, not every image type. The 48-frame
clip painted 94 times over two nominal source-loop durations: that proves a full
cycle progressed, not exactly two completed cycles or perfect source-speed FPS.

Android native theme probing reproduced a real display discrepancy despite
correct computed CSS: an explicit white CSS patch painted dark while parallel
paint-only canvas patches retained their colors. The device owner also tested
`dark` and `only dark` root/meta schemes diagnostically; neither prevented that
native repaint. **Reject that candidate**, rather than shipping a false fix.

The app already uses the [official Chrome author opt-outs](https://developer.chrome.com/blog/auto-dark-theme/#how-to-opt-out-of-auto-dark-theme).
Chromium's [documented light-preference force-dark exception](https://chromium.googlesource.com/chromium/src/+/c8a1360b1ad25e96335cded46d2be83df2c02116)
and Brave's [reported forced-dark preference issue](https://github.com/brave/brave-browser/issues/51447)
support this diagnosis, alongside the actual device evidence. The standards
distinguish [color-scheme negotiation and forced colors](https://www.w3.org/TR/css-color-adjust-1/).
Global `forced-color-adjust: none` is not an established correction for this
browser override and would risk disabling intentional accessibility colors.
Inverse-color heuristics and drawing all interface text into canvases are rejected
as fragile, inaccessible changes. No safe standards-based additional app fix was
identified in this bounded review. The device owner subsequently inspected
`brave://flags/#enable-force-dark` read-only and confirmed **Enabled**, while the
separate darken-websites checkbox flag was Default/Disabled. That inspection,
native color probes and the controlled emulation matrix establish the browser
override diagnosis. No browser appearance preference was altered. Independent
inspection of the native Light/Dark wall and Help screenshots confirms readable
text but incorrect darkened Light surfaces.

An independent final-build desktop supplement on `62dc29c` (port 5342) checked
Auto then Resurrect 64 on the 2048px sheet. Both native PNG downloads matched
independent scalar nearest and alpha checks across 8,388,608 decoded pixels. The
37 generated colors were extracted from the editable draft in their original
order; this checks use of the selected generated palette, not independent
generation quality. A cross-review identified a possible retained-paint readiness
ambiguity; the accepted run waits for a fresh sampled paint after Auto publication
and closing the palette rail when sampling dimensions actually change. The phone
keeps the same sampling dimensions when that rail closes, so it correctly reuses
its rendering; an initial unconditional fresh-paint gate timed out and was fixed
as a harness assumption. In that case, timing ends at Auto publication and rail
interaction and does not prove another current wall paint. Its accepted desktop
renderer CPU observation, 122.9 ms, includes generation and UI interactions and
is not a speedup claim. Native Save remains the exact output oracle.

The device owner then identified a narrower color-critical defect: 1-bit preset
CSS gradient halves and native color-picker label backgrounds are darkened while
the artwork and already-protected full-palette canvases remain correct. This is
a useful, bounded extension of the existing paint-only palette protection. A
candidate must retain native input hit targets and labels, pointer-inert overlays,
None checker/slash behavior, Swap, exact values and the original diagonal. It
must add no readback, encoding, timers, polling or conversion work. Compact
transparency glyphs remain theme-colored rather than representing actual ink.
This color-critical fix is distinct from the unresolved browser-wide Light
surface override.

Final fresh-page Android receipts at isolated `62dc29c` on port 5342 pass all five
cases. Independent summation confirms 26 native entries, 17,843,592 decoded pixels
and 33 measured phases, with zero visible RGB/alpha mismatches or observed Long
Tasks at least 50 ms. The batch's authored-effect GIF is offscreen before its
playback probe (intersection ratio zero); bringing it into view yields 15 fresh
paints for six frames. The 32/48-frame assemblies yield 65/96 fresh paints. This
accepts deliberate offscreen pausing and rejects the initial inference of a
playback defect. No production performance change is justified by this cohort.

The narrow 1-bit preview candidate was independently tested on port 5343, built
from committed `62dc29c` plus the exact four changed runtime files. All twelve
pair previews and their active solid inks retain their exact sampled colors
under an active forced-dark algorithm; the unprotected white CSS sentinel becomes
`#121212`, proving the test is not a no-op. Ordinary Light/Dark before/after
screenshots retain the same diagonal and rings; labels remain 44×44 CSS pixels,
native inputs 42×42, with identical geometry and inset-shadow styles. Input DOM
hit tests remain native inputs. None removes its canvas, Swap transfers None,
and a simulated input event restores a chosen color. This desktop event check
does not claim OS color-picker interaction. A one-second settled interval records
zero palette painting calls. A native 1-bit PNG download is byte-identical before
and after the UI change.

The device owner's clean native Light and Dark runs each pass 13 checks with no
page errors: twelve preset pairs/current solids and a real Android color-picker
selection that restores None and survives Swap. Independent inspection of the
native picker/restore screenshots confirms the operating-system picker remained
reachable through the decorative overlay. Native 1-bit PNG and GIF saves remain
byte-identical, with independent Solid-output checks reporting zero mismatches.
The accepted source change is committed separately as **`db39123`**; its four
runtime files are identical to the reviewed candidate. Root's full candidate
suite passed 982 tests with two pre-existing GC-dependent skips.

The corrected native Android Auto supplement also passes: its editable palette
contains 37 colors, and Auto/Resurrect 64 native 2048px PNGs have zero mismatches
against independent nearest/alpha expectations. Its 275.95 ms renderer CPU is
publication/UI work; the no-resize phone path explicitly does not claim a new
post-publication wall paint or full wall latency.

**Final mutual agreement:** accept the narrow color-critical canvas change and
its regression evidence; reject broader theme transforms and speculative
performance changes. The explicit browser-forced Light interface override remains
an accurately diagnosed limitation with browser-setting guidance, not a fixed
app bug. Root's actual Codex Browser acceptance is a separate surface from this
reviewer's Edge checks; see `bench/practical-theme-root-2026-10-16/`. Native
candidate and Auto receipts are recorded in the device/theme report. No remaining
reproduced production defect from this bounded review requires another fix.
This conclusion does not promise all future artwork or browsers are regression
free. A recorded 58 ms phone Preview rAF gap is compatible with no Long Task
above 50 ms; the latter is not a guarantee of zero dropped display frames.

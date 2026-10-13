# Live 1-bit reanalysis: bounded performance and stability batch

October 13, 2026. Continues the independently accepted 1-bit export and palette failure
recovery batch. Claude's report is `2026-10-13-claude-code-onebit-recovery-review.md`.

## Decisions and challenges

Claude reproduced a deliberate Brightness-source change freezing the physical Pixel
for roughly half a second. Default styles share Luma and do not require this work.
Codex and its independent review subagent agreed to cooperative replacement analysis
with atomic captured-wall publication. The implementation subagent supplied the
DOM-free preparation module and exact-output tests; the coordinator implemented the
UI/export integration and ran desktop and phone acceptance. The reviewer challenged
the final diff and results. Claude still needs to independently review this batch.

| Proposal | Decision and reason |
| --- | --- |
| Yield only between images | Insufficient: an animation's frames and shared seam pass still form a large task. |
| Yield before each analysis and shared seam frame | Implemented; retains the existing flat kernels and shared animation decisions. |
| Remember previous brightness analyses | Rejected here: each remembered source costs about three analysis bytes per pixel, before caches. |
| Reuse the import worker with live transferred buffers | Rejected: detaching published sources would violate ownership. No new worker protocol is needed for this bounded improvement. |
| Publish frames/items as they finish | Rejected: the wall must never read a partially replaced analysis. |
| Cancel an export when the wall changes | Rejected: Save, Copy, ZIP and hover preparation keep their captured inputs. |

The small blocked-drag defect is also fixed: an unavailable request is refused without
saying preparation is running. A valid request waiting for its file keeps the notice.

## Implementation contract

`image-reanalysis.js` captures source references, dimensions, frame order/delays,
metadata and normalized settings before its first await. It creates new unpublished
analysis arrays without mutating or transferring live source buffers. Matching items
retain identity and do no posted work. `unifyAsync` uses the exact synchronous seam
accumulator, yielding before each frame's pass, then assigns shared thresholds only
after completion. GIFs therefore retain their whole-clip analysis rules.

App publication requires the current controller, exact wall membership, family,
brightness source and relevant opacity cut. An empty wall prepares only the example;
an imported wall never prepares its hidden example. Canceled work cannot publish.
Large slider drags can defer analysis, while a synchronous pending gate already holds
the prior converted picture. Converted animations pause while pending; Original keeps
its own source playback. Save/Copy/ZIP/hover prepare independently from their captured
settings. Copy still supplies its clipboard promise during the initiating gesture.
An analysis error reports once without retrying itself; another source/cut change can
request fresh preparation.

## Native Pixel measurements

Pixel 8 Pro, Android 17, Brave 155, foreground over USB. Six alternating native browser
ArrowDown/ArrowUp events per build and wall: Cutout/Luma to Solid/Green and back. Baseline
is the production build of `346e19e`; candidate is the actual unchanged production
asset `index-D_vFMUTB.js` (90.48 kB gzip entry, versus 88.99 kB baseline). Test HTML only
observes/captures; production source is not instrumented or transformed.

| Wall | Longest task per step, baseline | Candidate | Settlement baseline → candidate |
| --- | --- | --- | --- |
| 17 real GIFs + six buildings, 278 frames total | 524–656 ms | No task observed at least 50 ms in all six steps | 701–829 → 674–804 ms |
| Twelve 1024×1024 noisy stills | 433–473 ms | 61–160 ms | 618–668 → 554–652 ms |
| Four 2048×2048 smooth stills | 460–605 ms | 122–163 ms | 661–806 → 560–690 ms |

Settlement includes driver waits and presentation, not just analysis. No universal
speedup or task ceiling follows from these fixtures. Large stills retain individual
synchronous analysis and publication-rendering costs. The app stays responsive between
frames/images; it does not interrupt one synchronous kernel call.

Tracked native driver: `bench/live-reanalysis-phone.mjs`. Local results and provenance:
`.tmp/reanalysis/phone/native.json`; the final run preserved all 37 unrelated tabs.
An earlier CDP file-upload timeout was a diagnostic transport failure; switching to
local fixture fetch avoided large base64 payloads. Its partial timing run was superseded.

## Actual-build correctness and desktop/mobile presentation

The native Codex browser and physical phone ran `bench/live-reanalysis-qa.html`, served
by its tracked local server on 5286. Phone used six alternating changes per build;
the final desktop run used two after earlier diagnostics had exposed harness issues.
Both covered all three walls plus a small unchanged-Luma style control.

Passed on both:

- Exact settled export content against the baseline for all three walls.
- Pending converted-picture retention and Original comparison.
- A→B→A cancellation with no late overwrite.
- Export captured in pending Green/Solid, then wall changed back to Luma/Cutout;
  output still matches a fresh Green/Solid baseline.
- Removal during pending work without reintroducing the image; remaining image matches
  a fresh baseline. Switching to palette mode preserves fresh baseline palette output.
- A mounted viewer retains its completed picture and supports Original while pending.
- A pending converted GIF holds its frame, Original still animates, and conversion resumes.
- Remove-all while pending restores the example; a subsequent import contains no old images.
- One injected scheduling failure reports once, does not loop, and later source selection
  recovers. It is a handled failure, not a global unhandled rejection.

Independent Pillow decoding checked **84 files and 594 frames** across the final desktop
and phone runs: dimensions, frame counts, delays, loop, binary alpha/source transparency,
and only the selected two inks. Source-change captured exports and palette-family
cancellation exports also matched their fresh baselines byte for byte.

The browser harness initially missed the first blocked rAF interval and used a popup
selector before its asynchronous DOM update. Those diagnostic runs are discarded.
Seeding rAF from the actual preceding frame fixes interval observation. Even a top-level
observer in the iframe-driven harness underreports baseline Long Tasks triggered by its
synthetic dispatch; **do not use its task columns for before/after claims**. Native phone
key events in a top-level app tab supply the authoritative task measurements above.

Two exact line-zero `ResizeObserver loop completed with undelivered notifications.`
warnings occurred during the final desktop family-popup transitions; none occurred in
the phone main run. These finite warnings were recorded separately, with a diagnostic
bound of five per app page. Other errors still fail. Edge runs and idle cessation are
recorded separately; a tolerance is not proof that every such warning is harmless.

## Automated verification and limits

774 tests passed, two GC-dependent tests skipped under the normal command. Explicit GC
run passed all 41 limiter/cleanup client tests with no skips. Build passed. The kernel
equivalence harness passed 24,000 unchanged image/style/threshold checks and 2,400 Icon
preview checks. New preparation tests cover five brightness sources × three opacity
cuts, all eleven style masks, exact arrays/shared thresholds, source capture before
yield, matching no-op, cancellation before/between work and partial-wall error ownership.

The before/after synchronous kernel benchmark was run from a pre-change snapshot.
512² analysis was 6.3 → 6.2 ms; sustained larger-host timings varied substantially
(as Claude already observed), so they support no performance claim. The shared kernel
refactor is about scheduling and exactness, not making a pixel loop faster.

One pending wall's replacement analysis adds roughly three bytes per changed source
pixel plus histograms while its old analysis remains available. This is not total peak
memory: structural caches, canvases, outputs and independently captured concurrent
Save/Copy/hover analyses add their own storage. No remembered-source cache was added.
Large single-frame analysis/seam calls, cold Stencil/Icon work and publication paints
remain synchronous. Whole-app memory, hidden-tab timing, Safari/iOS, native clipboard
permissions and actual opacity finger dragging are not claimed by these bounded runs.
Opacity output/cancellation is covered at the preparation-module level; Copy gesture
timing was reviewed in source. These are explicit targets for the independent review.

The review subagent accepts this bounded batch after the edge checks passed. Its advice
is to keep the measured large-frame limits visible and let the independent reviewer
challenge this implementation before designing another worker/cache change.

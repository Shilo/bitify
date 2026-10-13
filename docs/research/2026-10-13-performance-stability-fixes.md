# Reconciled performance and stability fixes

Baseline: main at 3ce4e146be954e79b239f67be6703be15ac6667b. Claude's Round 2,
the Codex subagent's source review and the coordinator agreed on the bounded batch:
F1, F2, F4, F7, CXS-04, and CXS-03 with F10. No worker architecture rewrite,
cache eviction, alpha debounce or export deduplication was justified.

## Changes

- Reuse posted export yields with timer fallback; preserve packing and output.
- Reuse a Tile's successfully completed pixels when its full input identity matches.
- Single-frame GIFs keep native decoding and use the same healthy import worker for
  unpublished analysis, avoiding repeated main-thread decode/analysis and churn.
- Generated/limit/cleanup/import workers reject unreadable messages, release handlers,
  retain abort precedence and recover through existing queue/fallback semantics.
- GPL rows trim once with an unambiguous name tail. Large malicious-input regression
  runs in a child with a kill timeout, because synchronous regex blocks defeat test timeouts.
- Obsolete hover preparation cancels its own subscriber and encoding; independent
  Save survives. Noncancelable module imports do not block a new hover, and late URLs
  release. Completed/native/grace records retain their existing lifetime.

## Review fixes and tests

Subagent review caught a pending-import hover queue gap and an unsafe unbounded
parser test. Both were repaired and retested. It found no supported source blocker
after those corrections. New regressions cover queued/shared message errors, native
single-GIF pixels differing from omggif, mixed imports, abort during native/worker
analysis, fallback, stale events, pending compression, late URLs and native drag grace.

Desktop Codex browser confirmed six-building Original return performs zero new
quantizer calls and six paints (previously six conversions/twelve paints). Viewer
close performs zero new conversions. RGB, cap-8 and Cleanup On still initiate fresh
work; pending same-item pixels remain visible.

An initial parent phone run reused cached diagnostic assets from
the earlier Claude harness at the same URLs. Its claimed post-change F2/F4 results
were discarded. The corrected run uses a fresh URL prefix, no-store responses and
a recorded bundle ID; output artifacts from discarded runs remain separate.

## Final validation, 2026-10-13

- Full suite: 46 files, 695 passed, two known GC-dependent skips. Explicit GC run:
  41 passed, zero skips. Final production build passed; entry gzip 87.39 kB,
  versus 86.91 kB at the baseline. No algorithm/kernel changes were made.
- Codex's final acceptance appendix supports this scoped batch, with no remaining
  source blocker. Claude Round 2 agreed on the reconciliation and measured the
  proposed repairs; Claude has not yet reviewed the final committed implementation.
- Physical Pixel 8 Pro, Android 17, Brave 155, foreground. Four repeated exports
  per case/build, actual changed instrumented source compared with immutable
  baseline. Fresh prefix `/fixes-final-20261013/` and no-store responses prevent the
  old diagnostic asset problem. F2/F4 used changed bundle `index-CxtBSYjX.js`;
  the harness environment probe intentionally identifies the baseline bundle.

| Export | Baseline ms | Changed ms | Content |
| --- | --- | --- | --- |
| 64×64 GIF, 120 frames | 651–701 | 136–184 | Identical |
| 256×256 GIF, 60 frames | 966–1,039 | 707–786 | Identical |
| 1024×1024 still | 384–427 | 323–368 | Identical |
| Real 23-file ZIP, 278 frames | 3,628–3,705 | 2,843–2,979 | Identical entries |

No export task exceeded 50 ms in either build. Pillow independently decoded all
278 ZIP frames plus standalone outputs: sizes, frame counts, delays, loops,
transparency and palette membership passed. Hash comparisons exclude ZIP header
timestamps by comparing entry contents.

Physical-device Original return and viewer close produced zero redundant
quantizer calls, for both six sprites and twelve large noisy photos. Eight
single-frame GIFs used one worker, no worker terminations and no main-thread GIF
decode. Native decoding and one worker analysis remain; this is not a claim that
import has no main-thread cost. A 2048×2048 single-frame import still recorded
152–178 ms native/unattributed long tasks and 59–63 ms script tasks. Large two-frame
imports also retain long tasks; their total times do not establish an improvement.

Native Codex browser separately tested all six buildings, the supplied dungeon
GIF, a synthetic single-frame GIF and a partial-alpha PNG. All/Off and cap-8/On
ZIPs independently decoded as nine files, 64 composited frames each, with exact
dimensions, delays, loops, binary alpha and palette membership; color caps passed.
Changed matching/cap/cleanup inputs still triggered fresh output. Auto completed
at 64 colors, family switching worked, and clearing the wall regenerated the
visible animated demo at 11 colors. No console warnings/errors appeared.
At a 360×780 viewport all four Nearest rows, including Opacity cut, were accessible
without horizontal overflow. Physical-device performance evidence is separate
from viewport emulation; Safari/iOS was not tested.

Local evidence (ignored scratch artifacts):
`.tmp/performance-fixes/results-phone-exportPhases+originalToggle+singleFrameGif.json`,
`out/phone-final/`, `desktop-cap8-clean.zip`, `desktop-all.zip`,
`desktop-nearest.jpg`, `mobile-nearest.jpg`, `desktop-empty-auto.jpg`.
The corrected phone harness and independent verifiers are in the same directory.

## Remaining work

F3 preparation retry needs agreed minimal UI/spec wording. CXS-01/F9 cooperative
1-bit export and CXS-02 live reanalysis need their own measured, separately owned
round. CXS-05 first structural preparation remains deferred. F5 cache policy stays
unchanged after measured tradeoffs; F8 arrow-key evidence does not establish touch
latency or worker-only waste. Module network loading and remaining synchronous
legacy codec steps cannot be interrupted by hover abort. Whole-app/native/GPU memory,
hidden-tab behavior and Safari/iOS remain explicit coverage gaps.

# Preview navigation: idle and interaction overhead

The user requested that navigation do useful work only when needed, especially
avoiding ongoing overhead with Preview idle or closed. The initial implementation
already had no polling/frame loop and removed its action listeners/hold timer on
destruction. Independent lifecycle checks found no navigation listener/timer leak.
It did publish unchanged view objects and rearm sampling during panning.

## Changes

- Keep ImageViewer's Svelte proxy stable, assigning changed view fields into it.
  Panning x/y no longer invalidates calculations that depend only on zoom.
- Derive the numeric required sampling scale and debounce that value alone.
  Skip refinement if the current sampling scale already matches, including Fit
  on opening and capped zoom. No 180ms timer is scheduled just for being open.
- Publish scale/x/y/dragging only when one changes. Keep hold release independent
  of publication so comparison, second-finger and cancellation behavior survives.
- No new rAF loop, observer or production performance instrumentation was added.
  The 4MP clip refinement policy and full-source exports are unchanged.

## Controlled browser comparison

`bench/viewer-performance-build.mjs` freezes all other source files once, then
builds before/after variants differing only in ImageViewer and navigation. The
before variants of those files come from `88c8db4`. The first measured snapshot
used the same two-file source comparison before the follow-up changes.

The server injects a **test-only** probe before each production bundle only for
the `/qa` frames. The `/regression` route loads the normal uninstrumented bundle.
Probe wrappers count timers, animation-frame requests, canvas puts, geometry reads
and selected live event listeners. They add overhead themselves. These results
are controlled work counts, not browser CPU/battery/heap or physical-phone claims.

An 800×600 viewport displayed a 1600×1000 still-image fixture using PICO-8/RGB;
import/open/zoom work settled before
each 500ms idle observation. Forty pan moves were paced by the parent page's rAF,
so the probe did not count its own pacing as application frame requests.

| Measured work | Before | After |
| --- | ---: | ---: |
| 180ms refinement schedules while opening at Fit | 2 | 0 |
| 180ms refinement schedules during a 40-move pan | 41 | 0 |
| Canvas raster paints during that pan | 0 | 0 |
| Coordinate geometry reads during that pan | 42 | 42 |
| Actual zoom: refinement schedules / canvas paints | 1 / 1 | 1 / 1 |
| Refinement schedules across 12 open/pointer-down/close repetitions | 36 | 0 |
| Timer / rAF / canvas-put / viewer-geometry calls per settled idle window | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| Final pending refinement / hold / rAF callbacks | 0 / 0 / 0 | 0 / 0 / 0 |
| Final tracked live viewer event listeners | 0 | 0 |

Idle observations covered closed, open at Fit, zoomed, panned, closed again and
closed after repeated mount/destroy cycles. Closing during pending refinement
canceled the timer before raster work. These finite observations corroborate the
source lifecycle; they are not proof about all image sizes or future workloads.

Both variants had one observed long task during a deliberately synchronous
10,000-event hover flood, and one non-refinement tooltip-path timer. Neither
performed viewer geometry reads, refinement schedules or raster paints there.
The paced pan and settled idle windows observed no long tasks. The stress flood
is not a normal pointer cadence and does not support a CPU speedup claim.

## Independent review and lifecycle checks

The same independent reviewer challenged notification loss, instrumentation
ownership and metric wording. Its 427-assertion source probe verifies 100
attach/down/destroy cycles; 10,000 idle hover events; 20,000 post-destroy events;
and second-finger, final-lift, cancellation and capped-zoom dragging transitions.

| View publications in deterministic source probe | Before | After |
| --- | ---: | ---: |
| Stationary down + 100 identical moves + up | 103 | 0 |
| Fully constrained Fit drag with 100 moves | 103 | 2 (drag start/end) |
| 100 cancel + constrained-pan pairs | 200 | 0 |

All navigation listeners, timers and captures retired after destruction. The
independent 94-assertion adversarial gesture probe and 23 focused unit tests also
passed. The full uninstrumented browser regression passed all 67 cases across
desktop, phone portrait and phone landscape geometries, including touch-pointer
pinch/pan, dismissal, comparison and GIF playback. Native mouse opening, zoom,
two-axis dragging and click dismissal also passed. The complete unit suite passed
969 tests with 2 skipped, and both frozen production builds passed. After mutual
challenges to notification loss, probe ownership and measurement wording, both
agents agreed that no further implementation fixes were justified by the evidence.

The first browser probe classified disconnected Svelte Tile `pointercancel`
listeners as live. Its own audit records retained the detached button nodes.
Inspection showed no remaining window/document/dialog navigation callbacks and
zero pending timers. Both agents rejected treating that as a navigation leak.
The corrected probe separately reports disconnected records and counts only
global or connected-DOM viewer listeners as live. It retained 13 detached button
records in **both** variants, so this fixture cannot assess garbage collection
or browser heap retention. No production cleanup workaround was added.

## Reproduce and limits

Run `node bench/viewer-navigation-fixture.mjs`, then
`node bench/viewer-performance-build.mjs`, then
`node bench/viewer-performance-server.mjs`. Open
`http://127.0.0.1:5301/qa` in Codex Browser and select Measure before and after.
Use `/regression` for the uninstrumented gesture suite. Run
`node bench/viewer-performance-review/navigation-lifecycle.mjs --expect-deduped`
for the independent lifecycle assertions.

Raw evidence is `bench/viewer-performance-review/browser-ab.json`, `baseline.json`,
`final.json` and `regression.json`. The 180ms counter covers all such timers in this controlled
fixture; source inspection establishes the connection to sampling refinement.
Selected listener types cover the navigation action and mounted controls, not
every possible browser event. An open viewer still has input listeners, and an
unowned pointer move has a constant-time ownership check. Static JS/CSS remains
loaded after closing. Normal GIF playback, conversion, comparison, tooltips and
automatic output-color inspection can still do necessary work independently.
Native touchscreen capture, physical devices and Safari remain outside this run.

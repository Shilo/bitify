# Whole-project performance and stability review: Claude Code (independent)

Reviewer: Claude Code (Opus 5.5), working alone from the handoff
`.claude/handoffs/2026-10-12-232501-project-performance-stability-review.md`.
I have not opened `2026-10-12-codex-subagent-project-performance-stability-review.md`.
No production file was edited, staged or committed. The only files I added are this report and
the harness `bench/claude-review-audit.mjs`.

## Baseline and environment

| Item | Value |
| --- | --- |
| Commit reviewed | `3ce4e146be954e79b239f67be6703be15ac6667b` (main). **Drift:** the handoff names `e2f112a`; `3ce4e14` is one commit later and only removes the Auto/Resurrect divider. |
| Working tree | Clean except the untracked brand files and the Codex report, none of which I touched. |
| Tools | Node 25.0.0, npm 11.16.0, Vite 8.3.3, Vitest 4.1.11, Svelte 5.57.2. |
| `npm test` | 44 files, 668 passed, 2 skipped. |
| GC command from the handoff | 2 files, 35 passed, 0 skipped. |
| Build | Passes. Built into my scratchpad, not `dist/`: main bundle 231.57 kB (86.91 kB gzip), five worker chunks of 9–22 kB. |
| Desktop browser | Headless Edge 155.0.4283.45 through the Playwright copy the bench scripts already use, against that build. Desktop context 1280×800 at DPR 1; "phone" context 412×780 at DPR 3 with touch. |
| Physical phone | Pixel `37211FDJG00267` is attached. **I ran nothing on it**: the handoff says to coordinate shared ADB access first. Every "phone" number below is desktop emulation. |
| Safari, iOS, Firefox | Not run. |

### How far my timings can be trusted

This machine slows sustained CPU work by 3–12 times after about three seconds. A loop of
`Math.sqrt` with no project code runs at a steady 34 ms per pass for 86 passes and then at
90–480 ms, in Bash, in PowerShell, outside the sandbox and at high priority (2–3 times slower
there). The headless browser I launched is subject to the same thing.

So in this report:

- **Counts are exact**: conversions, canvas paints, zero-delay timers, workers made and
  terminated, downloads.
- **Kernel times taken inside the first three seconds are reliable.**
- **Longer wall times are inflated and noisy.** I give them as ranges and never as a budget.
  They need repeating on the coordinator's desktop setup and on the Pixel.

I first read this slowdown as a JIT cliff in `quantize.js` and retract that below (R1).

## Round 2 (October 13): reconciliation and Pixel measurements

This section answers `.claude/handoffs/2026-10-13-005014-project-review-reconciliation.md`.
I have now read the Codex report and its appendix. Where this section and the round 1 text
below disagree, this section is the current position; the round 1 sections carry a short
correction note where they were wrong. Production code is still untouched.

### My position on each proposed decision

| Item | Position | What I concede or add |
| --- | --- | --- |
| F1 export yields | **Agree** with the scoped candidate. | I withdraw the timer-count floor, the "0.5–2 s" saving and the hidden-tab projection. The count was a bad basis: in the GIF's second pass each frame awaits the worker's reply, which breaks the timer chain, so about half the timers are not held. Measured below on the real change. |
| F2 unchanged previews | **Agree**, including the complete identity record and readiness only after a successful current publication. | I withdraw "nothing tests the tile's conversion effect": `bench/palette-qa.mjs:604-655` covers Original timing. What is missing is the unchanged-still producer count. Conversions are now counted at the quantizer, not by posted tasks. |
| F3 failed preparation | **Agree**: request-scoped pending, error and ready states with a real retry; no unconditional blanking. | I did not mean the six seconds as a hang. The export rejects, as it should. The UI wording and spec text still need agreeing. |
| F4 single-frame GIF | **Agree.** | My attribution was partly wrong. On the Pixel the omggif decode is 87–92 ms. The larger task, 166–213 ms, is the legacy analysis, which the fallback runs on the main thread. Add to acceptance: a large single-frame GIF is analysed in the worker like any other large still. |
| F5 off-screen cache | **Agree to defer.** On my Pixel data I would not change it at all. | Less conversion at the bottom of the wall, a refill on return, and 60 frames a second either way. |
| F6 overlapping Save | **Agree. Withdrawn as a defect.** | The spec allows it. My memory remark was not measured. |
| F7 GPL parser | **Agree** with the trimmed row and unambiguous tail. | My split-only suggestion leaves the overlapping quantifiers in place. Theirs is the better repair. |
| F8 alpha slider | **Agree to defer.** | On the Pixel a 20-step drag costs no frame and the same final wait; only workers churn. |
| F9 one-bit exports | **Agree** with the CXS-01 scoping. | I withdraw "would cost nothing" and "the longest task becomes the largest file". Not measured on the phone this round. |
| F10 hover fan-out | **Agree**: the null-ready and disposed guard only, no identity shortcut. | — |
| CXS-01 | **Agree.** Measure built desktop and phone first; cooperative per-frame masks and encoding before any worker. | Same finding as my F9. |
| CXS-02 | **Agree** it is real, higher risk, and a separate change with its own owner. | Not measured by me on the phone. |
| CXS-03 | **Agree**: cancel preparatory hover only. | Fits with F10. |
| CXS-04 | **Agree** with narrow `messageerror` handlers as robustness, not as a P1. | Consistent with my R4: I found no mixing of results, and none of the four clients sets `onmessageerror` (I re-read `image-import-client.js:29-36` and the three palette clients). |
| CXS-05 | **Agree to defer.** | — |

I have no open objection to any row. One new observation of mine, O5 below, is not yet in
either ledger.

### Device and method

| Item | Value |
| --- | --- |
| Device | Pixel 8 Pro (`husky`), serial `37211FDJG00267`, Android 17, on USB power, battery 100%, 29.6 °C at the start. |
| Browser | Brave, `Chrome/155.0.8059.40`. Viewport 448×819 CSS pixels, DPR 2.25, 4 cores reported. The user agent is masked ("Android 10; K"). |
| Builds | Built from `3ce4e14` by `.tmp/claude-review/vite.variant.config.js`, which transforms sources in memory. `base` behaves as shipped and adds counters at the quantizer, the main-thread GIF decoder and `yieldExport`. `yield` also makes `yieldExport` call `yieldTask`. `cachevis` also releases a clip's cache reservation while it is off screen. |
| Harness | `bench/claude-review-phone.mjs`, the same script for desktop and phone. |
| Opening pages | A tab created over DevTools stays in the background on Android and is never drawn, which Playwright's focus emulation hides. Each page is opened as a new foreground tab by a VIEW intent. The harness refuses to run unless that tab is producing frames. No existing tab was navigated or closed. |
| Discarded | One first run taken with the screen asleep. Its timings were meaningless and are not quoted. |
| Exports | Captured inside the page by intercepting the download link. Nothing was saved on the phone. |
| Cleanup | My tabs closed (41 pages before and after), both USB port mappings removed, no harness process left. I woke the screen with a key event and changed no setting. |

Desktop numbers from the same harness are in `.tmp/claude-review/results-desktop-*.json`.
They agree in direction, but this host still slows after three seconds, so I quote the phone.

### F1 on the Pixel: the actual change, not a shim

Six exports per build and case: two page loads of three exports each, builds in alternating
order. Preset ENDESGA 32, All, Oklab, Cleanup Off.

| Export | Unchanged (ms) | With the change (ms) | Median | Yields | Time spent waiting in yields, unchanged | With the change |
| --- | --- | --- | --- | --- | --- | --- |
| 64×64 GIF, 120 frames | 625–693 | 134–207 | 643 → 141 | 238 | 486–496 ms | 12–22 ms |
| 256×256 GIF, 60 frames | 935–1,031 | 710–759 | 975 → 733 | 118 | 224–226 ms | 14–28 ms |
| 1024×1024 still | 389–412 | 319–375 | 401 → 342 | 19 | 51–61 ms | 1–2 ms |
| Real wall ZIP: 16 sprite GIFs, the dungeon GIF, 6 buildings (23 files, 278 frames) | 3,398–3,742 | 2,651–2,892 | 3,465 → 2,795 | 510 | 576–662 ms | 68–96 ms |

- **The wait is measured per callback**, from the call to its continuation. It averages about
  2 ms a yield in the unchanged build, not 4, which is why the old floor was wrong.
- **Responsiveness is unchanged**: no task over 50 ms in either build; the longest gap between
  animation frames was 17 ms unchanged and 25 ms with the change.
- **Output is identical.** Every one of the twelve exports per case has the same content hash
  (per entry for the ZIP, whose headers carry the time). The three synthetic exports are also
  byte-identical between the phone and the desktop.
- **Independent decode** with Pillow (`.tmp/claude-review/verify.py`, no app code): 23 entries
  and 278 frames; every size, frame count and frame delay matches its source; 0 colors outside
  ENDESGA 32; 0 partly transparent pixels; 0 pixels whose emptiness disagrees with the source
  alpha at the cut of 128; 0 loop counts that differ from the source.
- **Still not measured:** a hidden tab, the path without `MessageChannel`, worker failure
  during export, a settings change during export.

On this evidence the change is worth making: about 19% off a real mixed ZIP and 78% off a
small long animation, with no change in output or responsiveness.

### F2 on the Pixel

Conversions are counted inside `quantizeAsync`. Five Space holds per wall.

| Wall | On releasing Original | Converted pixels | Paints | Settled after | Longest frame gap | On closing the viewer |
| --- | --- | --- | --- | --- | --- | --- |
| 6 buildings (sprites, drawn whole) | 6 conversions every time | 204,528 | 12 | 25–27 ms | 17–33 ms | 6 conversions, 25 ms |
| 12 noise stills, 1024×1024, sampled at 446×446 | 12 conversions every time | 2,386,992 | 24 | 331–346 ms | 100–108 ms | 12 conversions, 213 ms, gap 109 ms |

- The redundant work is confirmed on the device and is exactly one conversion per tile.
- The cost is far below my emulated figure: a third of a second for twelve photos, nothing
  worth noticing for sprites. It grows with tiles, sampled size and palette size.
- No task exceeded 50 ms. The 100 ms frame gaps are O5.

### F4 on the Pixel

Two runs per input.

| Input | Import workers made / terminated | omggif decodes on the main thread | Tiles shown after | Main-thread tasks over 50 ms |
| --- | --- | --- | --- | --- |
| 8 single-frame 256×256 | 8 / 8 | 8 (11–12 ms in all) | 549–695 ms | one of 71–96 ms |
| 8 two-frame 256×256 | 1 / 0 | 0 | 454–518 ms | one of 75–79 ms |
| 1 single-frame 2048×2048 | 1 / 1 | 1, one step of 87–92 ms | 976–1,270 ms | 141–147, 87–92 and 165–212 ms; scripts of 87–92 and 166–213 ms |
| 1 two-frame 2048×2048 | 1 / 0 | 0 | 1,387–1,806 ms | one of 243–250 ms with no script over 50 ms |

- The churn and the main-thread decode are confirmed on the device.
- For the large file, the second script task is the analysis running on the main thread.
- The two-frame file's 245 ms task has no script behind it and remains unexplained (O1).
  So the single-frame route is not the only source of a long task on a large GIF.

### F5 on the Pixel: measured, and not worth changing

Seventeen real clips, ENDESGA 32, two runs per build, five-second samples.

| Position | Unchanged | Reservation released off screen |
| --- | --- | --- |
| Top, tiles 0–5 visible | 0 conversions a second | 0 |
| Bottom, tiles 12–16 visible | 33.4–33.6 a second, 2.88 megapixels a second | 10.4–10.6 a second, 1.85–1.89 megapixels a second |
| Back at the top, first 3 s | 0 | 24.7 a second, 0.75 megapixels a second |
| Back at the top, next 5 s | 0 | 3.8 a second |
| Frames a second, every position | 60 | 60 |
| Longest frame gap, tasks over 50 ms | 17–25 ms, none | 17–25 ms, none |

About a third less conversion at the bottom, paid back partly on return, and no difference
the user can see. The one coarse heap reading was 159 MB against 169 MB. I would leave the
policy alone.

### F8 on the Pixel: measured, no input cost

Auto palette, Max colors 8, 6 buildings and 6 noise stills of 1024×1024. Steps sent as arrow
keys on the focused slider, 50 ms apart.

| Gesture | Generation workers made / terminated | Limit workers made / terminated | Preview conversions | Settled after the last step | Longest frame gap |
| --- | --- | --- | --- | --- | --- |
| 1 step | 0 / 0 | 1 / 1 | 18 | 6.8 s | 25 ms |
| 20 steps in 1.6 s | 19 / 19 | 20 / 20 | 18 | 7.0 s | 25 ms |
| 1 step again | 0 / 0 | 1 / 1 | 18 | 6.8 s | 25 ms |

A drag restarts both workers at almost every step, but it draws the same 18 previews, drops
no frame and finishes when a single step would. The waste is worker time only. Arrow keys are
not a finger drag; a touch drag sends more events, which this does not cover.

Separately, 6.8 s to settle after one change is the cost of capping six noisy megapixel
stills against 64 Auto colors on this phone. The previous pictures stay up meanwhile. That is
the documented behavior, recorded here as a measured cost.

### O5. Frame gaps of about 100 ms while a wall of previews converts

New in this round, measured, no fix proposed.

- On the Pixel the longest gap between animation frames was 100–108 ms while twelve previews
  converted together, with no task over 50 ms. The same harness on desktop shows 100–117 ms.
- With one export running instead, the gap was 17–25 ms.
- Each preview job yields with a posted task after 8 ms. Twelve jobs keep the queue full, and
  the browser appears to let rendering in only about every 100 ms.
- This partly reopens R3. It is not an input stall and I have not measured touch latency
  during it. It would affect any wall-wide palette change, not only F2.
- F2 removes the commonest trigger. Whether to do more needs a touch-latency measurement
  first.

### What I think is ready, deferred or withdrawn

| State | Items |
| --- | --- |
| Ready to assign, with the guards in the handoff table | F1, F2, F4, F7, F10 with CXS-03, CXS-04 |
| Ready once the UI and spec wording is agreed | F3 |
| Accepted, measure on the phone before implementing | F9 with CXS-01 |
| Deferred | F5 (I would close it), F8, CXS-02, CXS-05, O5 |
| Withdrawn | F6 |

### Round 2 files

- `bench/claude-review-phone.mjs`: the desktop and phone harness.
- `bench/claude-review-audit.mjs`: round 1 harness. `sameBytes` is now `sameContent`, a hash
  of the file, or of every entry for a ZIP. Its timer shim remains directional only.
- `.tmp/claude-review/vite.variant.config.js`, `verify.py`, `results-phone-*.json`,
  `results-desktop-*.json`, and the captured exports under `out/`. All ignored by git.

### Still not done after round 2

- F9 and CXS-01, CXS-02 and CXS-03 on the phone.
- F3 with Cleanup, and the agreed retry behavior.
- A hidden tab, the no-worker and no-`MessageChannel` paths, a failing export worker.
- Touch latency during O5; a real finger drag for F8.
- Whole-app and native memory; Safari and iOS.

## Ranked findings

Round 1 ranking, kept for the record. F6 is withdrawn and F5 and F8 are deferred; see round 2.

| ID | Priority | Class | One line |
| --- | --- | --- | --- |
| F1 | P1 | Measured bottleneck | Palette exports wait on nested zero-delay timers: 240 for a 120-frame GIF, 531 for the fixture wall ZIP. |
| F2 | P1 | Measured bottleneck | An unchanged palette preview is converted again after every Original comparison and every viewer close. |
| F3 | P2 | Reproduced defect | After a Max colors or Cleanup job fails, the tile keeps showing the previous palette's finished picture, and nothing retries. |
| F4 | P2 | Reproduced defect | Every single-frame GIF kills the import worker and is then decoded by omggif on the main thread: a 1,066 ms task for 2048×2048. |
| F5 | P3 | Measured, design tradeoff | Off-screen clips hold the 8 MiB preview cache; at DPR 3 one 40-frame 256×256 clip takes 63% of it. |
| F6 | P3 | Reproduced, low severity | A second Save all starts a second full export beside the first. |
| F7 | P3 | Reproduced defect, crafted input | The GPL row parser backtracks cubically: 3 kB of text takes 2.1 s; the 256 KiB limit allows a hang. |
| F8 | P3 | Hypothesis with code evidence | The palette Opacity cut slider is not debounced, unlike Max colors. |
| F9 | P3 | Known limit, quantified | 1-bit Save all is one uninterrupted task; a yield between files would cost nothing. |
| F10 | P4 | Measured in Node, low | Each tile hover recomputes the export snapshot once per tile on the wall. |

### F1. Palette exports wait on nested zero-delay timers

> **Round 2 correction.** The "floor" column, the 0.5–2 s saving and the hidden-tab estimate below are withdrawn. A timer count is not a wait: the Pixel measured about 2 ms a yield, 0.49 s for the 120-frame GIF and 0.58–0.66 s for a 23-file wall. The shim comparison is directional only and compared lengths, not contents. Use the round 2 table.

- **Where:** `src/lib/palette-export.js:65` defines `yieldExport` as `setTimeout(resolve, 0)`.
  It is awaited in `markUsedAsync` (`palette-export.js:44-51`), in `chunkAsync`
  (`src/lib/save.js:44-57`), in the row packing of `palettePngBytesAsync` (`save.js:161-165`),
  and three times in `encodePaletteGif` (`src/lib/gif.js:102`, `:131`, `:136`).
- **Ownership:** main thread only. No buffers move.
- **Root cause:** a timer set from inside a timer's own continuation counts as nested. From the
  fifth level browsers hold each one for at least 4 ms. `quantize.js:99-106` already avoids this
  for previews with a posted task, and says so in its comment. Exports were left on timers.
  The docs do not mention this (docs cross-check, topic 1).
- **Evidence (counts, exact):**

  | Export | Zero-delay timers | Floor at 4 ms each |
  | --- | --- | --- |
  | 64×64 GIF, 120 frames | 240 | 0.94 s |
  | 256×256 GIF, 60 frames | 120 | 0.46 s |
  | 2048×2048 still | 85 | 0.32 s |
  | 1024×1024 still | 21 | 0.07 s |
  | Fixture wall ZIP, 192 files from `.tmp/auto64-ui-20261012/build/fixtures` | 531 | 2.1 s |

  A GIF costs two timers per frame whatever its size, so small animations are hit hardest.
- **Evidence (times):** the 64×64, 120-frame GIF takes 754–909 ms to export in the built app.
  The same frames through the writer with no yields take 30 ms. With zero-delay timers
  delivered as posted tasks by a harness shim, the same export takes 189–485 ms and the file is
  byte-identical. For the 192-file ZIP I measured 6.7–9.9 s against 5.8–7.4 s, which is too
  noisy here to quote as a gain; the timer count is the firm number.
  For scale, the docs give 2,791 ms for the 184-asset desktop ZIP and 7,050 ms on the phone
  (`2026-10-12-generated-wall-stress.md:56`).
- **Not measured:** a hidden tab. Browsers hold timers in hidden pages to one per second, so a
  120-frame GIF export would take about four minutes there. That follows from platform rules;
  I could not hide the page in this harness. Posted tasks are not held that way.
- **Throughput against responsiveness:** this is throughput only. Responsiveness is fine today
  (largest gap between event-loop turns 14–30 ms) and stayed fine with the shim (11–25 ms, no
  long tasks).
- **Confidence:** high for cause and counts, medium for the size of the gain on real hardware.
- **Smallest fix:** make `yieldExport` use the posted-task yield that `quantize.js` exports as
  `yieldTask`. One line plus an import. The batches stay the same size, so slices stay bounded.
- **Tradeoff:** exports use the main thread more densely. If a real phone shows the page
  stuttering during a long ZIP, yield on an 8 ms deadline as `quantizeAsync` does.
- **Acceptance:** byte-identical PNG, GIF and ZIP output for the fixture wall before and after;
  zero zero-delay timers during an export; no task over 50 ms added; export time repeated five
  times on desktop and on the Pixel; one export started and then backgrounded on the Pixel.

### F2. An unchanged palette preview is converted again after Original and after the viewer

> **Round 2 correction.** Confirmed on the Pixel at one conversion per tile, but the settle times below are inflated emulation: the device took 331–346 ms for twelve photos and about 25 ms for six sprites. "Preview yields" below are posted tasks, not conversions. A harness check of Original timing does exist (`bench/palette-qa.mjs:604-655`).

- **Where:** the conversion effect in `src/Tile.svelte:176-200`. It reads `originalVisible`,
  `active` and `inView` (`:184-185`), so it runs again when any of them flips back. It then
  starts a new `quantizePreviewAsync` although `fullPixels` already holds the finished picture
  for exactly these inputs. Stills have no cache to hit (`palette-animation-cache.js:26`).
- **Ownership:** per-tile state. The finished `ImageData` is retained across the flip, which is
  why the right picture is on screen at once; the second conversion then replaces it with an
  identical one.
- **Reproduction:** `originalToggle` in the harness. Twelve 1024×1024 stills, ENDESGA 32.
  Hold Space, release, count.

  | Step | Canvas paints | Preview yields | Settle, desktop | Settle, DPR 3 |
  | --- | --- | --- | --- | --- |
  | Original on | 12 | 0 | — | — |
  | Original off (five runs) | 24 = 12 retained + 12 converted again | 24–78 desktop, 209–445 at DPR 3 | 84–597 ms | 1.8–4.4 s |
  | Viewer close | 12, all converted again | 24 desktop, 221 at DPR 3 | 160 ms | 1.9 s |

  Expected: 12 paints and no conversion after Original off; none after the viewer closes.
  The settle times are inflated by the machine (see above). The work is real: a reliable
  kernel time is 120 ms per megapixel of noise at 32 colors and 180 ms at 64, and at DPR 3
  each of the 12 tiles samples about 0.3 megapixels.
- **Scope:** every tile on the wall, visible or not, on every release of Space, every tile
  hold, every Original switch and every viewer close. The 1-bit family does not do this; it
  keeps its masks (`Tile.svelte:206-214`).
- **Possible link:** the docs record an unexplained 134 ms phone task in a
  scroll/family/Original stage (`2026-10-12-auto-64-release.md:113-114`). I have not shown
  this is the cause.
- **Confidence:** high.
- **Smallest fix:** remember the inputs of the frame that last completed (source, palette,
  width, height, cut, metric, cleanup result). At the top of the effect, if the item is the
  same and those inputs match, set `fullReady = true` and return without converting.
- **Tradeoff:** one small non-reactive record per tile. Animated tiles still convert when
  their frame moved on during Original playback, which is correct.
- **Acceptance:** 12 paints and 0 preview yields on Original off; 0 on viewer close; a setting
  changed while Original is showing still converts once on return; an animated tile returning
  from Original or from off screen shows the right frame; no wrong-item pixels after removal.
- **Missing coverage:** nothing tests the tile's conversion effect. The harness check above is
  the regression test I would keep.

### F3. A failed Max colors or Cleanup job leaves a finished stale picture

- **Where:** the catch blocks at `src/Tile.svelte:134-138` and `:154-158` only call
  `onpaletteerror`. `limited` and `cleaned` stay null, so `conversionPalette` stays null and
  the conversion effect returns early. `pixels` then keeps serving the retained picture
  (`:205`, `:226-227`). `paletteLimitFailure` (`src/App.svelte:332-339`) shows a 3.2 s toast.
  `selectPalette` (`App.svelte:60`) bumps a retry counter only for Auto.
- **Reproduction:** `limitFailure` in the harness. Gray 8 with Max colors 8 (no limiter
  needed), two images. Make the limit worker fail to load (harness only), press Left to select
  DawnBringer 16.

  | Moment | Selected palette | Toast | Tile pixels |
  | --- | --- | --- | --- |
  | Before | Gray 8 | none | 8 grays |
  | 1.5 s after | DawnBringer 16 | "Couldn't limit colors. Retry or choose All." | identical hashes, still 8 grays |
  | 6.5 s after | DawnBringer 16 | none | identical hashes, still 8 grays |

  Save stays enabled; Save all then produced no download within 6 s.
- **Expected:** the handoff's own contract, "no completed stale result may stand in for current
  settings". Keeping a picture while work is pending is intended; here nothing is pending.
- **Retry:** the toast says Retry, but picking the same palette again changes no state, so no
  job restarts. The user has to change a setting. Auto does have a retry path.
- **Also seen:** each tile's failed job made a fresh worker (2 workers for 2 tiles), because a
  failure clears the shared worker. On a 184-tile wall a worker that cannot load is tried 184
  times. There is no main-thread fallback for a worker that constructs but fails to load;
  the spec only promises one when `Worker` is missing
  (`docs/superpowers/specs/2026-10-06-bitify-app-design.md:2044-2045`; later `spec:` references
  are to the same file).
- **Confidence:** high for the behavior. What the tile should show instead is a product
  decision the spec does not make (docs cross-check, topic 9).
- **Smallest fix (to agree):** record the failure against its request, stop serving the
  retained picture for that request, and re-run the request when the user selects the same
  palette or setting again, as `generationRetry` does. Keep the toast.
- **Acceptance:** after an injected limit failure and after an injected cleanup failure the
  tile shows no picture from the earlier settings; re-selecting retries; a later success draws
  normally; a cancel (not a failure) still keeps the retained picture; spec updated.

### F4. A single-frame GIF kills the worker and decodes on the main thread

> **Round 2 correction.** Confirmed on the Pixel. The 1,066 ms figure below is inflated and mostly not omggif: on the device the decode is 87–92 ms and the larger task is the legacy analysis running on the main thread.

- **Where:** the worker throws for a one-frame GIF (`src/lib/image-import-worker.js:13`).
  The client treats any worker error as fatal and terminates it (`image-import-client.js:34`,
  `:40`). `drain` then calls `fallback` (`:115-120`), whose `browserDecode` (`:85-96`) runs
  `decodeGifAsync` on the main thread before giving up and calling `decodeImageFile`.
  `decodeGifAsync` yields between frames (`src/lib/gif.js:45-61`), so one frame is one
  uninterrupted decode.
- **Ownership:** the `File` is immutable and reused, so nothing is corrupted. The cost is
  three decodes of the same file (worker omggif, main-thread omggif, browser) and a discarded
  worker.
- **Reproduction:** `singleFrameGif` and `bigSingleGif` in the harness.

  | Input | Import workers made | Terminated | Largest main-thread task |
  | --- | --- | --- | --- |
  | 8 single-frame 256×256 GIFs | 8 | 8 | none over 50 ms |
  | 8 two-frame 256×256 GIFs | 1 | 0 | none over 50 ms |
  | 1 single-frame 2048×2048 GIF | 1 | 1 | 1,066 ms, attributed to a `MessagePort.onmessage` script in the main bundle |
  | 1 two-frame 2048×2048 GIF | 1 | 0 | 455 ms, no script over 50 ms (see O1) |

  The 1,066 ms is inflated by the machine; the attribution is not.
- **Expected:** `gif.js:44` says "A single large LZW frame is still synchronous when workers
  are unavailable." Here it is synchronous with a worker available.
- **Confidence:** high.
- **Smallest fix:** have the worker answer a one-frame GIF with a plain "not animated" reply
  instead of an error. The client keeps the worker and goes straight to `decodeImageFile`,
  skipping the main-thread omggif pass.
- **Tradeoff:** one more message type in the protocol and its validation.
- **Acceptance:** 8 single-frame GIFs make 1 worker and terminate 0; no omggif decode on the
  main thread for them; the large single-frame GIF has no task over 50 ms from script; pixels
  identical to today's; unreadable GIFs still fall back; cancel still never falls back.
- **Missing coverage:** `image-import-client.test.js` has "decodes the whole GIF once" for
  animations and no single-frame case.

### F5. Off-screen clips hold the preview cache

> **Round 2 correction.** Measured on the Pixel with real clips in round 2. No visible benefit from changing it; I would leave the policy as it is. The 90 ms a second estimate below is withdrawn.

- **Where:** `src/Tile.svelte:168-174` acquires a reservation whenever the tile has a palette
  and a size, whether or not it is in view. `palette-animation-cache.js:27-36` reserves the
  whole clip and admits the next only if it still fits. Nothing is evicted.
- **Documented as intended:** off-screen tiles keep their caches
  (`2026-10-12-offscreen-playback.md:27`). The docs do not say which clips win when a wall
  needs more than the budget (docs cross-check, topic 8).
- **Evidence:** `cacheStarvation` in the harness. Eight 256×256, 40-frame clips at DPR 3.
  Each needs 5,253,120 bytes, 63% of 8,388,608, so exactly one fits.

  | Scroll position | Visible tiles | Preview yields per second | Paints per second |
  | --- | --- | --- | --- |
  | Top | 0–5 | 76.5 | 52.3 |
  | Bottom | 2–7 | 97.3 | 50.8 |

  At the bottom the one cached clip is off screen and all six visible clips convert every
  frame for as long as they play.
- **Size of the cost:** the docs give 0.57 ms per cached frame against 2.08 ms uncached on the
  Pixel (`2026-10-12-palette-implementation.md:52`). Six clips at 10 frames a second is about
  90 ms of extra main-thread work each second. Real, not large.
- **Confidence:** high that it happens; low that changing it is a net win, because the docs
  also measured a cold cached loop as slower than an uncached one.
- **Option, not a recommendation yet:** release the reservation while an animated tile is out
  of view. Measure scroll-back cost on the Pixel first.
- **Acceptance if tried:** visible clips are cached whenever the visible set fits; no blank
  frame when scrolling back; cache stats return to zero after Remove all.

### F6. A second Save all runs beside the first

> **Round 2 correction.** Withdrawn as a defect. Overlapping exports are specified behavior. The memory remark below was not measured.

- **Where:** `saveEverything` (`src/App.svelte:720-736`) has no guard and the button
  (`:896`) is disabled only for an empty wall or an unavailable Auto palette.
- **Reproduction:** `doubleSave`. Six 1024×1024 stills, two clicks 60 ms apart: two downloads,
  the button never disabled, both exports running together.
- **Spec:** overlapping jobs are allowed and only the message is specified (spec:1215-1216).
- **Cost:** twice the conversion work and twice the peak of converted indexes and file bytes.
  On a phone with a large wall that is the likeliest way to run out of memory.
- **Confidence:** high for the behavior, low priority.
- **Smallest fix:** ignore Save all while a Save all with the same snapshot is running.
- **Acceptance:** two quick clicks give one download; a click after a setting change still
  starts a new export.

### F7. The GPL row parser backtracks cubically

Found by a reader I delegated to; I reproduced it myself.

- **Where:** `src/lib/palette-import.js:9`, the `allowName` pattern
  `/^\s*(\d+)\s+(\d+)\s+(\d+)(?:\s+[^\r\n]*)?\s*$/`. Line 21 splits on `\r?\n`, so a lone CR
  stays inside a line and makes it unmatchable; three overlapping runs of spaces then
  backtrack.
- **Reproduction:** `"GIMP Palette\n0 0 0" + " ".repeat(N) + "a\rb\n"` through
  `parsePaletteText`:

  | N | Bytes | Time |
  | --- | --- | --- |
  | 1000 | 1,022 | 87 ms |
  | 2000 | 2,022 | 650 ms |
  | 3000 | 3,022 | 2,109 ms |

  A well-formed 256-row file takes 0.7 ms. The limit is 256 KiB, so a crafted file hangs the
  tab; the parse is synchronous, so Cancel cannot run.
- **Reach:** a file or a paste into the palette editor. It needs unusual input; an ordinary
  GPL file never triggers it.
- **Confidence:** high.
- **Smallest fix:** split lines on `/\r\n?|\n/`, or trim the row and make the tail
  `(?:\s[^\r\n]*)?$`.
- **Acceptance:** the three inputs above reject in under 5 ms; existing palette-import tests
  pass; a test with a lone-CR row is added.

### F8. The palette Opacity cut slider is not debounced

> **Round 2 correction.** Measured on the Pixel in round 2: worker restarts at almost every step, no dropped frame, same final wait. Deferred.

- **Where:** `src/Dock.svelte:448` binds the range straight to `alphaCut`. Max colors beside
  it commits after a 200 ms pause for exactly this reason.
- **Chain:** each input event changes `alphaCut`. With Auto selected that changes
  `generatedRequest` (`src/App.svelte:209`), which aborts and restarts generation over the
  whole wall (`:218-237`). With a cap set it invalidates every tile's limit job
  (`src/Tile.svelte:123-140`); with Cleanup on, every cleanup job too. A running job is
  cancelled by terminating its worker.
- **Not measured.** I did not drive this slider. I did measure the pieces: a worker start in
  this build costs 6–34 ms on desktop (R2), and each restart re-reads every source pixel.
- **Confidence:** medium that it wastes work during a drag; unknown how visible it is.
- **Smallest fix:** reuse `pausedCommit` for this row.
- **Acceptance:** one generation and one limit job per rest of the slider, counted with the
  harness's worker counters; the row's number still follows the thumb while dragging.

### F9. 1-bit Save all is one uninterrupted task

> **Round 2 correction.** Merged with CXS-01. "Would cost nothing" and "the longest task becomes the largest file" are withdrawn: a yield between files does not split one GIF, the reanalysis or the ZIP assembly.

- **Known and accepted:** `docs/performance.md:638` and `:667-668` ("A worker is the fix").
- **New detail:** `saveAll` (`src/lib/save.js:208-219`) awaits each file, but in the 1-bit
  family every awaited value is already resolved, so the whole ZIP is one task. Twelve
  1024×1024 stills plus a 60-frame 256×256 GIF: one task of 3.7–4.0 s (inflated here), event
  loop silent for the same time, in each of three runs.
- **Also:** `encodeGif` (`src/lib/gif.js:73`) allocates `1024 + frames × (w×h×2 + 1024)` bytes
  before encoding, on top of one full mask per frame built at `App.svelte:647`. A 100-frame
  800×600 GIF is 48 MB of masks plus a 96 MB buffer.
- **Smallest change, short of a worker:** one posted-task yield between files in `saveAll`.
  Each file still blocks, but the spinner, the toast and input get a turn between files.
  The snapshot is already taken at the click, so nothing can change under the export.
- **Acceptance:** byte-identical ZIP; the longest task becomes the largest single file.

### F10. Tile hover recomputes the export snapshot for every tile

Reported by the delegated reader with a Node measurement; I read the code and agree on the
mechanism but did not measure it in a browser.

- **Where:** `src/lib/export-drag.js:67` evaluates `request(item)` before checking whether
  anything is ready. `request` (`src/App.svelte:652-658`) runs `items.find`, `asking()` and a
  `JSON.stringify`. Every tile subscribes.
- **Measured (Node, 184 subscribers):** 369 `request` calls per enter and leave; 0.75 ms with
  64 colors, 2.16 ms with 256.
- **Fix:** return early when nothing is ready or the ready record is for another item.
- Desktop only. `export-drag.js` has no test file.

## Observations without an established cause

- **O1.** Publishing one two-frame 2048×2048 GIF gave a 455 ms main-thread task with no script
  over 50 ms in the long-animation-frame record. Importing eight noisy 256×256 PNGs gave one
  84–96 ms long task in each of six runs, again with no script over 8 ms. Likely rendering,
  layout or collection of large buffers; I have not established which. The docs list import
  long tasks as open.
- **O2.** `image-decode.js:26-29` and `:50-54` check `maxPixels` after the browser has decoded
  the image, so the palette editor's 16-megapixel limit bounds the copy, not the decode. The
  tests name the contract "before copying". Reported by the delegated reader; not reproduced.
- **O3.** `bitify.js:207-212`: for an opaque image, Stencil's sprite data is three full-size
  arrays each filled with one value, kept for the session. 3 bytes per pixel, 36 MB for a
  12-megapixel photo. I read the lines and agree; not measured in the app.
- **O4.** `bitify.js:158` computes the seam strength in every `analyze`, and `unify` (`:175`)
  recomputes and overwrites it for animations. The delegated reader measured 17.8 ms of an
  83 ms `analyze` at 2048×2048. Any change there needs `bench/equiv.mjs`.

## Retracted

- **R1. "A JIT cliff makes `quantize.js` 7–10 times slower after about 24 jobs."** Retracted.
  The same cliff appears at three seconds in a loop with no project code. It is this machine.
  `--trace-deopt` showed no deoptimization of `convert` after warm-up.
- **R2. "Cancelling by terminating the worker makes rapid setting changes slow."** Not
  supported. Six rapid palette steps over twelve capped 1024×1024 images terminated 3 workers
  and made 2. A worker start in this build (construct, start, first reply) took 27–34 ms for
  the first three and 6–16 ms after. Phone not measured.
- **R3. "Concurrent 8 ms preview slices add up to one stall."** Not supported. The record shows
  7–8 consecutive 8 ms tasks in a 59–75 ms frame with a blocking duration of 0; the browser
  simply had nothing to draw between them.
- **R4. "Worker protocols without request IDs can mix results between jobs."** Not found. Each
  client runs one job at a time, and every path that leaves a worker mid-job terminates it.
  The two paths that keep a worker after an error (`palette-limit-client.js:48`, and a
  completed result) leave it idle.

## Worker ownership and lifetime

| Client and worker | Source pixels | Sent to worker | Result | On cancel | On worker failure | When `Worker` is missing |
| --- | --- | --- | --- | --- | --- | --- |
| Import (`image-import-client.js`, `image-import-worker.js`) | Unpublished only. A GIF is sent as its `File`. Other formats are decoded natively on the main thread, then their buffers are transferred. | Whole frame buffers, transferred once; the job drops its reference (`:80`). | One frame per acknowledgment; pixels and five analysis arrays transferred back and validated (`image-import-core.js:51-64`). | Queued: removed and rejected. Running: worker terminated. Never falls back. | Worker terminated; the `File` is decoded again on the main thread. | Cooperative main-thread path. Stills of 4096 pixels or fewer always take it. |
| Auto palette (`palette-generated-client.js`, `-worker.js`) | Published, never detached. | A fresh 128 KiB slice per acknowledgment. | Up to 64 colors, validated and frozen. Two results cached by a key of buffer identities; no source references kept. | Last subscriber: queued job removed, running worker terminated. Other subscribers keep the job. | Worker terminated; job rejects; UI shows retry guidance. No fallback. | Cooperative core on the main thread. |
| Max colors (`palette-limit-client.js`, `-worker.js`) | Published, never detached. | A fresh 128 KiB slice per acknowledgment; a second pass for binned sources. | Subset indexes. One result cached per item, held with the signature, which references the item's frames. | Same as Auto. | Worker terminated; job rejects; toast. No fallback (F3). | Cooperative core. |
| Cleanup (`palette-cleanup-client.js`, `-worker.js`) | Published, never detached. | A fresh 128 KiB slice per acknowledgment; the worker assembles one frame at a time. | One map of 2 bytes per source pixel, transferred, then re-scanned on the main thread in 8 ms slices (`palette-cleanup-apply.js:10-31`). One per item, kept after Off. | Same as Auto. | Worker terminated; job rejects; toast. No fallback. | Cooperative core. |
| GIF export (`gif.js:169-200`, `palette-gif-worker.js`) | Not involved. | One new 1-byte-per-pixel frame per acknowledgment, transferred. | The file's bytes, transferred. A new worker per export, terminated in `finally`. | Exports cannot be cancelled. | Export fails with a message; no partial file. | Same writer on the main thread. |

Checked and found sound: no published buffer is ever in a transfer list; a cancelled import
never falls back or publishes; one subscriber leaving does not cancel a job another still
wants; a result arriving after an abort is discarded before it is cached; malformed counts,
sizes, lengths and labels are rejected and end the worker.

Not covered by tests: a worker that constructs but fails to load its module (as opposed to a
constructor that throws), for the three palette clients.

## Cache invalidation

| Cache | Key | Bound | Released when | Checked |
| --- | --- | --- | --- | --- |
| 1-bit masks, colored pixels, shrunk originals (`Tile.svelte:109-120`) | Frame index within the tile; dropped on style, settings, size, colors, frames | At most 5 bytes per sampled pixel per frame, never more than the source | The tile goes or a key changes | Sound. No budget of its own. |
| Retained palette frame (`Tile.svelte:163`, `:219`) | Item identity only | One picture per tile | Item or family changes | Sound for pending work. Stale after a failure (F3). Reused less than it could be (F2). |
| Limit result (`palette-limit-client.js`) | Item (weak), then colors, cut, metric, cap, frame and buffer identities | One per item | Item collected | Sound. A 1-bit reanalysis replaces item objects (`App.svelte:520-533`), so the next visit to the palette family recomputes every limit and cleanup. |
| Cleanup map | Item (weak), then colors, cut, metric, frames | One per item, 2 bytes per source pixel, no total bound | Item collected; survives Off | Sound. Documented. |
| Auto results | String of buffer identities and cut | Two results | Evicted in order of use | Sound. A long ZIP whose wall is edited twice regenerates for each remaining file. |
| Animation preview cache | Frame buffers, palette colors, cut, metric, cleanup result, sample size | 8 MiB of whole-clip reservations | Last handle released | Sound. Starvation by off-screen clips (F5). |
| Legacy analysis on `img` | The analysis object | 3 bytes per pixel, plus 3 after Stencil and 2 per Icon border | Reanalysis or removal | Sound. Computed and kept in the palette family too; documented as deferred. |
| Unpublished imports (`owned` weak map) | Decoded result | — | Taken or reanalysed | Sound. |

## Feature coverage

| Path | Read | Unit tests exist | Driven in a browser by me | Result |
| --- | --- | --- | --- | --- |
| Import: PNG, small-still route | Yes | Yes | Yes (desktop) | O1 only |
| Import: animated GIF in worker | Yes | Yes | Yes | Sound |
| Import: single-frame GIF | Yes | No | Yes | F4 |
| Import: cancel, Remove all, reanalyse before publish | Yes | Yes | No | No defect found by reading |
| Import: worker failure recovery | Yes | Yes | No | No defect found by reading |
| Palette preview: stills | Yes | No component tests | Yes, desktop and DPR 3 | F2 |
| Palette preview: animation, cache, off-screen pause | Yes | Cache and observer only | Yes, DPR 3 | F5 |
| Original comparison, viewer | Yes | No | Yes | F2 |
| Max colors: jobs, cancel, restart | Yes | Yes | Yes | R2; F3 on failure |
| Cleanup | Yes | Yes | No | Same failure path as F3 by reading; not driven |
| Auto palette | Yes | Yes | Only as the default on load | No defect found |
| Palette export: PNG, GIF, ZIP | Yes | Yes | Yes | F1, F6. I checked that output bytes were identical between runs, not that they decode correctly. |
| 1-bit preview and style steps | Yes | Yes | No | Known limits only |
| 1-bit export | Yes | Yes | Yes | F9 |
| Live 1-bit reanalysis | Yes | No | No | Known open target; not re-measured |
| Dock: Max colors debounce, `dragging` flag | Delegated read | `pausedCommit` only | No | Clean; F8 beside it |
| Palette editor: file, paste, URL, cancel | Delegated read | Parsers only | No | F7, O2 |
| Tooltips | Delegated read | Yes | No | No leak. About 6 hidden popover nodes per tile. |
| Hover drag export | Delegated read | **No test file** | No | F10 |
| Resize, portrait and landscape | Layout code read | Yes | No | Not exercised |
| Physical Android | — | — | **No** | Not run |
| Safari, iOS | — | — | **No** | Not run |

## Ranked opportunities

1. F1: one line, exact output, removes 0.5–2 s from GIF and ZIP exports by count.
2. F2: about ten lines in one effect; removes a whole-wall conversion from the commonest
   gestures in the default family.
3. F4: one message type; removes a main-thread decode and a worker restart per single-frame GIF.
4. F3: small state change plus a product decision.
5. F7, F8, F9, F6, F10: each a few lines.
6. Deferred legacy analysis in the palette family. Already documented as a follow-up
   (`2026-10-12-auto-performance-audit.md:72-75`). It is the largest memory item, 3 of every
   7 bytes on the wall, and not a small change. The docs give 86 ms to analyse 4 megapixels on
   a desktop (`docs/performance.md:553`); my own `analyze` and `unify` timings were taken past
   the three-second mark and I do not quote them.

## Rejected optimizations

- Keeping workers alive across cancellation with a cancel message. Start cost is 6–34 ms on
  desktop, and terminating is what frees a worker still downloading (R2).
- A shared scheduler for preview slices (R3).
- A memo for binned sources in `palette-limit.js`. I have no clean timing (the limit runs I
  took were past the three-second mark), and it runs in a worker.
- A larger animation cache, a frame LRU, a full-RGBA frame cache: already rejected in the
  docs, and nothing I measured argues otherwise.
- Skipping the main-thread re-scan of the cleanup map. It is sliced and it is what makes a
  worker's answer safe to trust.

## Tests run

- `npm test`: 668 passed, 2 skipped.
- The handoff's GC command: 35 passed, 0 skipped.
- `npx vite build` to a scratch directory: passes.
- `node bench/claude-review-audit.mjs <dist> .` with all twelve checks, headless Edge 155.
- Node kernel timings for `quantize`, `palettePngBytes`, `selectPaletteSubset`, `analyze`,
  `unify`, and the F7 inputs.
- The delegated reader ran eight existing unit files (146 tests, all passing).

## Not done

- Nothing on the Pixel. F1, F2, F4 and F5 all need phone numbers before and after any fix.
- No independent decode of exported files. My export checks compare byte length between runs.
- The supplied 255-color ASE, the PixelLab images and the building PNGs were used only as part
  of the 192-file fixture wall in the F1 comparison.
- Cleanup On, partial opacity, resize, orientation, the palette editor and exports started
  while previews were pending were read but not driven.
- The no-worker paths were read, not run in a browser.
- Hidden-tab export behavior (F1) is inferred, not measured.
- Whole-app memory was not measured.

No finding here is proof that the rest is free of defects.

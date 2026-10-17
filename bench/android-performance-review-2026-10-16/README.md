# USB Android performance and stability review

Test target: isolated committed build `071ebd9`, served at `http://localhost:5336/`.
Device: USB Pixel 8 Pro `37211FDJG00267`, Brave/Chromium 155. Native display
rotation was controlled through Android `wm user-rotation`; no CDP viewport or
orientation override was used. This verifies native OS landscape layout, not a
human physically turning the phone or accelerometer sensing.

## Completed functional acceptance

`native-qa.mjs --integration` passed seven groups, with no page errors:

- Portrait and both native landscape rotations, all compact Recolor controls.
- Trusted touch ranges, conditional settings, cancellation, Reset.
- Native Android Save compared with Sharp plus an independent scalar Oklab
  nearest oracle: zero alpha and visible RGB mismatches; 13 used colors.
- Reuse swatches equal the colors in the downloaded PNG.
- Modal inside-origin drag retention and genuine backdrop dismissal.
- Preview actions, trusted touch zoom, Fit, retained wall count.
- Representative 1-bit controls and a 12-sprite-plus-GIF workload.

Evidence: `integration/results.json` and native screenshots in that directory.

`keep-save.mjs` passed two additional native download checks:

- Keep nearest: exact source alpha and independent scalar RGB oracle.
- Keep with 4×4 dithering, cap eight, Cleanup: exact alpha, target membership,
  at most eight colors, matching caption count and Reuse swatches.

Evidence: `keep-save/results.json`, source fixture and native saved PNGs.
Fixtures are owned synthetic inputs from the existing audit fixture generator.

## Performance methodology and findings

`workflows.mjs` uses the shared desktop workflow runner. CDP TaskDuration is
renderer main-thread CPU; it excludes worker CPU and cannot establish whole-app
memory bounds. ScriptDuration misses some posted-task conversion work. The rAF
observer adds its own work, so its idle phase does not prove zero app overhead.

The first exploratory receipts (`workflow-initial-exploratory.json`,
`workflow-profile.json`) include Playwright file transport. A 365–383 ms large
import task was dominated by injected utility-script/base64/File construction
(`:7475`, `:7476`, `atob`), not established application work. Do not cite it as an
app defect or optimize production to address it.

The revised v3 runner stages File objects before measuring the app change
handler, and waits for exact full-resolution output counts. Its **100-still
landscape wall** completed: import TaskDuration 494 ms, maximum task 103 ms;
matching change TaskDuration 513 ms, maximum task 50 ms. Original return and
idle had no long tasks. These are one stress run, not paired optimization or
representative animation performance claims. The wall remains a meaningful
many-element import/layout stress case.

`workflow-v3-results.json` is deliberately **failed/incomplete**, because:

- The final GIF in the portrait small wall was offscreen and correctly paused.
  Requiring its all-frame count without scrolling it into view was an invalid
  readiness assumption. The shared runner was subsequently corrected.
- The 1024-square source cannot fit the phone's native portrait wall: DPR is
  2.25 and viewport width is 448 CSS pixels (1008 physical pixels before
  margins). Sampled wall output correctly omits an exact color count. A future
  full-display phone workload should use a smaller, documented fixture (for
  example 896 square) or measure a full-source export separately. Do not remove
  the exactness gate merely to make this test pass.

## Device ownership pause

The root agent reported that another external agent had taken the device.
No further USB/CDP actions were started after that notice. The active runner had
already executed its finally cleanup at **2026-10-17 02:23:21 UTC**: it restored
its test-origin localStorage, closed only its own tabs, and restored native
rotation to `free`, `accelerometer_rotation=1`, `user_rotation=0`. Existing
forward/reverse connections were left intact. Host-only process inspection
confirmed that no owned workflow process remained; no process was terminated.

The device window was subsequently explicitly reauthorized after the external
agent finished. Fresh device preferences and test-origin storage were captured
before resuming; no previous state was assumed.

The final `5a77313` / port 5338 **Mulfok 32** label/native-output checks passed
in `mulfok-final/results.json`: the selected accessible button uses the new
label, the Keep nearest native PNG uses 25 of the canonical 32 colors and has
zero visible RGB/alpha mismatches against the independent scalar oracle. Keep
plus 4×4 dithering, cap eight and Cleanup uses eight valid target colors with
exact source alpha. Both wall counts and Reuse colors equal their downloaded
PNG colors. Native portrait and landscape preferences were restored exactly.
`keep-save.mjs` supports `QA_ORIGIN`, `QA_COMMIT` and `QA_PALETTE=mulfok32`.

## Final coordinated acceptance

The final metadata-only build `5a77313` at port 5338 passed six native-output
checks: **Game Boy Green**, **Black & White** and **Mulfok 32**, each with Keep
nearest in portrait and Keep/dither/limit/Cleanup in landscape. Every nearest
result matched the independent scalar RGB/alpha oracle. Dither cases satisfied
exact alpha and canonical palette membership. All six captions and Reuse
swatch sets matched the native downloaded PNGs. See `palette-gameboy-final/`,
`palette-mono-final/` and `mulfok-final/`.

The corrected baseline performance runner passed all three workloads in
`workflow-final-results.json`, requiring each complete source-resolution count
and making the GIF visible. The large phone fixture is **896×896 (0.80 MP)**,
not 1024 square; it fits the actual display at DPR 2.25. Representative results:

| Workload | Renderer TaskDuration | Long tasks |
| --- | ---: | --- |
| 12 sprites + GIF, import | 349 ms | None |
| 100 stills, import | 465 ms | One, 106 ms |
| 100 stills, Matching change | 494 ms | None in final run; earlier repeated run had 50–54 ms |
| 896-square import | 320 ms | None |
| 896-square 4×4 dithering | 1435 ms | None |
| 896-square cap eight + Cleanup | 1379 ms | None |

These are observational workload CPU values, not before/after speedups or
conversion latency guarantees. They include test observation/automation work,
exclude worker CPU and are not a battery or whole-process memory measurement.
Large dithering remains computationally expensive while yielding cooperatively.
The earlier `workflow-final-screenshot-buffer-failure.json` contains completed
workflows but failed to store its last screenshot because Node's default stdout
buffer was too small for the native PNG. Increasing only the test driver's buffer
to 16 MiB produced the complete receipt. No application behavior changed.

Phone canvas hashes are **not an exact output oracle in this Brave session**.
An independent 896-square solid canvas control altered 228 readback bytes by
one (`large-save/readback-control.json`). This accounts for the mismatches in
the retained browser-readback hash check; native image export bypasses canvas.
All four **native saved** 896-square PNGs matched the separate Node pipeline's
raw decoded pixel hashes exactly: Oklab nearest, RGB nearest, RGB + 4×4 dither,
and RGB + dither + eight-color limit + Cleanup. See `large-save/results.json`.
That comparison validates browser import/export and captured settings against
the production core, not independent algorithm optimality.

The tested pair-mixture dithering cache was rejected after broader desktop
testing found regressions with 256-color targets. No candidate phone benchmark
or production implementation was needed. The existing nearest/dither algorithms
remain unchanged.

Final device release: **2026-10-17 02:31:40 UTC**. Each resumed script freshly
captured and exactly restored the original storage and rotation preferences;
final rotation was `free`, accelerometer `1`, user rotation `0`. Only owned tabs
and uniquely named test downloads were removed. Existing forwards and other
tabs were left alone. No further USB operation was started after release.

# Auto palette and whole-app performance audit

October 12, 2026. This bounded follow-up checks the current built app, rather than
assuming that the palette's generation time represents the whole user experience.

## Scope and instrumentation

`bench/auto-performance-audit.html` drives existing application controls inside its
own same-origin iframe. It does not add diagnostics to production. It imports the
existing 184-asset fixture cohort: 167 PNGs, 17 GIFs and 439 decoded source frames,
including the supplied six buildings, sprite and 56-frame dungeon animation.

The phases separate initial PNG import, GIF import, the completed wall, cold and
warm playback, matching changes, and a bounded 28-asset optional-settings cohort.
The latter excludes the large dungeon animation and exercises Max colors 8,
Cleanup Off/On/Off, rapid replacement, actual native ZIP capture and clearing.

Recorded measurements include main-thread long tasks, timer gaps, control/paint
settlement, native PNG decode latency and worker start/result/chunk activity.
Worker activity proves whether preparations run during an observed phase; it is
not a precise animation-cache hit ratio. PNG decode latency includes native
asynchronous work, not just main-thread processing. Polling and instrumentation
contribute overhead. Canvas lifetime and paints do not prove perceptual quality.

The browser heap API excludes native image/GPU allocations and can be rounded or
stale on Android. The existing process-wide phone measurements also include other
tabs. Neither establishes an 8 MiB total-app memory limit.

## Source review: what is already efficient

- Generated preparation runs only while its source is selected. Source, duration
  or opacity changes invalidate its key; matching, caps, cleanup, playback and
  layout do not. Two completed results retain small colors/signatures, not source
  buffers. Workers transfer acknowledged slices of at most 128 KiB.
- Nearest conversion prepares palette vectors once, samples only visible preview
  dimensions and yields between bounded chunks. Repeated RGBs use a bounded memo;
  photographs with few memo hits bypass that map rather than grow it indefinitely.
- Animations can retain sampled indexes within the shared 8 MiB budget. Warm
  playback still colorizes and uploads the displayed frame. Stills do not have a
  recurring animation timer. Oversized animations deliberately stream again.
- Max colors selects a whole-source/clip subset; cleanup prepares one guarded map
  per source/clip. These are shared preparations, not one new fit per shown frame.
  Cleanup Off avoids loading or executing the optional engine. A previously
  prepared weakly keyed map may remain while its source is still live.
- Generated exports capture the whole source signature before yielding. Preview
  cancellation does not cancel an independent export subscriber. GIF export uses
  sequential used-color preflight and encoding to keep its table valid without
  retaining a full native RGBA bake.

## Concrete remaining costs and tradeoffs

GIF decoding currently composites an entire clip synchronously. Import also
eagerly runs the legacy `analyze` for every source frame, even while Palette is
active. `analyze` scans RGB/alpha/edges and derives automatic seam strength;
`unify` scans the clip again for its shared automatic seam. Therefore a worker
palette fit does not make importing a large GIF nonblocking.

The cohort has about 85 MiB decoded RGBA, before analysis. Legacy luminance/right/
down arrays add approximately 63.8 MiB for its 22,285,170 decoded pixels, plus
histograms, object overhead, previews, caches, canvases, native resources and
worker/export scratch. The animation cache budget does not cover these sources.

Potential improvements, in order of scope:

1. Yield between GIF frame analyses while importing. This can bound a run of many
   modest frames, preserves the existing analysis results and does not require
   copying source bytes. It does not bound the work within one huge frame or the
   synchronous GIF compositor/shared seam scan.
2. Move GIF decoding and legacy analysis to a worker, with explicit cancellation,
   bounded transfer and output equivalence checks. This addresses the larger
   blocking path but is a separate import architecture change, not a tooltip fix.
3. Defer full legacy analysis while Palette is active. This saves both eager CPU
   and its three bytes per source pixel, but layout/soft-alpha/Tile/export paths
   currently use analysis metadata. A lightweight metadata layer and guarded
   lazy upgrade are needed. A rushed shortcut risks 1-bit, Original and exports.

Large scrolling walls also keep offscreen GIF tiles active. `active` currently
pauses the wall when an enlarged viewer is open; it is not viewport visibility.
IntersectionObserver-based offscreen playback suspension could reduce matching,
colorization, canvas upload and battery use. It requires a deliberate resume rule
(paused frame versus elapsed source time), prompt repaint on entry, viewer
handoff checks and exports independent of visibility. This is a concrete next
candidate, rather than a claim that offscreen canvas work is already skipped.

Do not increase animation-cache memory simply because 64 palette entries are
being considered: index storage is already Uint16 and independent of palette
count, while matching/fitting work scales with the number of candidates. Do not
cache every frame as full RGBA: that quadruples one-byte pixels and substantially
exceeds the current sampled-index storage. Do not silently evict source data or
reduce export resolution to make benchmark numbers look better.

## Dynamic tooltip

The shared tooltip action already accepts reactive string updates and repositions
only while visible. Derive its header from the completed palette's count and
published source provenance, then append the static description with a newline.
No hover-time sampling, extra cache, timer or DOM readback is necessary. Provenance
must travel with the completed palette so a retained preview during regeneration
does not describe the wrong source set.

## Implemented preview scheduling guard

Only Tile previews now call `quantizePreviewAsync`. It captures options, checks
cancellation, posts a task and then delegates to the unchanged `quantizeAsync`
path. Previously every tile could perform its first up-to-8ms conversion slice
inside the same effect/microtask flush. Deferring those starts divides that
particular aggregate flush. It does not bound the entire application main thread,
change matching/cleanup decisions, alter exports or add tasks to cache hits.

Three focused tests verify no source data access before the task, cancellation
while queued without source access/allocation, and identical resized/alpha
results with captured Oklab/RGB options. Existing cancellation/readiness guards
still prevent an old preview from replacing current pixels. This is a small
input-ordering and cancellation improvement, not evidence of a general speedup.

## Current measurements

The initial built-app runs each passed the first ten phases on Codex Chromium and
the physical Pixel 8 Pro running Brave. Phase eleven initially failed in the test:
its readiness helper reopened Palette, replacing the settings popup, before the
test queried that popup's controls. This was a harness null-control error, not an
application failure. The corrected harness and preview scheduling change were
then retested with all thirteen phases on both devices. Each completed
successfully, supplying actual ZIP exports for independent verification.

The table uses file-change-to-paint timings, excluding fixture download/setup and
palette-editor inspection time included in the broader harness phase duration.
These are single runs, not controlled speedup distributions or device guarantees.

| Operation | Phone | Desktop |
| --- | ---: | ---: |
| First 40 PNGs: file change to painted wall | 388 ms | 303 ms |
| Add all 17 GIFs: file change to painted wall | 3,893 ms | 1,812 ms |
| Complete 184-asset wall: file change to painted wall | 4,263 ms | 1,703 ms |
| GIF import: largest main-thread task | 347 ms | 494 ms |
| RGB then Oklab transition: largest main-thread task | 125 ms | 379 ms |

The phone's 184-asset import spent approximately 725 ms to commit sources and
3,538 ms thereafter to settle generated controls/paints. The GIF addition spent
823 ms to commit and 3,069 ms thereafter. Native PNG decode latency averaged
1.74 ms for the initial 40 and 3.66 ms for the remaining 127; these asynchronous
decode observations do not attribute every subsequent task. Generation plus wall
publication/preview conversion costs materially more than PNG decoding here.

Both baseline cold and warm six-second playback phases recorded no main-thread tasks above
50 ms and no Generated, limiter or cleanup worker starts. All 17 GIFs retained
their canvases and painted during the observation. Their tiles were offscreen:
only six tiles on the phone and fifteen on desktop were visible at the wall's top.
The full cohort's animations were imported after the first forty PNGs, establishing
the offscreen-animation cost described above. Timer gaps do not establish source
FPS or absence of dropped compositor frames.

The bounded 28-asset cap-8 phase started exactly 28 limiter jobs. Cleanup On then
started 28 cleanup jobs; returning Off started none. Matching alone did not start
a Generated worker or change the sampled shared colors. These observations agree
with the source review's preparation/non-op behavior. They do not claim that
Cleanup Off releases a previously cached live-source map.

The final run had the following results. These observations include different
GC, browser/native scheduling, panel opening/closing and layout states. The
matching phase inspects the palette editor and alternates mutually exclusive
settings and palette popups; those measured panel-height changes can resize the
whole wall. No hidden legacy mask conversion was found on matching changes:
Tile returns the full-palette result before the legacy mask path.

| Operation | Phone before → final | Desktop before → final |
| --- | ---: | ---: |
| Complete wall: file change to painted wall | 4,263 → 4,079 ms | 1,703 → 1,421 ms |
| Whole matching audit duration, including panels | 920 → 901 ms | 2,149 → 2,565 ms |
| Matching audit largest task above 50 ms | 125 → none observed | 379 → 542 ms |
| GIF-import largest task | 347 → 341 ms | 494 → 637 ms |

The desktop matching audit was about 19% slower. The absence of a >50ms matching
task in the phone rerun does not establish causation or a universal improvement.
The structural preview-start guarantee justifies the narrow scheduling guard;
these whole-phase timings do not justify claiming that every stall is fixed.
Phone final cold playback recorded one 51ms long task; final warm playback and
desktop cold/warm playback recorded none above 50ms. Neither playback phase
started a Generated, limiter or cleanup worker. All seventeen GIFs kept painting
without canvas removal in both final runs.

The main remaining priorities are synchronous GIF decode/legacy analysis and
offscreen animation work. Broad import-worker/lazy-analysis/visibility changes
are documented follow-ups, not rushed into this rename and tooltip change.

## Independent final export verification

`bench/auto-performance-verify.py` opens actual captured phone and desktop ZIPs
with Pillow and NumPy, without application imports. Each contained all expected
28 files, twenty stills and eight GIFs, including all six buildings and the
supplied sprite. Each archive passed full checks over **144 composited frames
and 3,533,753 pixels**: dimensions/frame counts, binary alpha at cut 128,
membership in its captured 32-color Auto palette, GIF delays and loop metadata.
There were zero alpha differences and zero colors outside the selected palette.
The largest per-asset color union was 31. The captured palettes were identical
between devices in this run; this does not assert universal cross-device identity
or perceptual optimality.

The production unit suite passed 611 tests with two explicit-GC tests skipped in
that normal invocation; both also passed when GC was explicitly enabled in the
forked workers (35/35 limiter/cleanup client tests). The production build passed.
The parent also verifies
the visible tooltip/header behavior on desktop and the physical phone. The
benchmark's rounded JavaScript heap readings cannot establish total memory
reclamation after the final unforced five-second clear.

Final UI checks verified the newline and keyboard description on desktop:
11 colors / Example image → supplied two-color PNG / 2 colors / Your images.
With Auto inactive, removing that image retained its completed two-color metadata;
selecting Auto refreshed to the exclusive example's eleven colors. Android long
press showed the same multiline description within the physical screen bounds.
The updated integration harness ran 96 desktop checks (95 automated passes and
one viewer check requiring native interaction); native Codex actions separately
verified the dungeon viewer, Original toggle and close/reopen. Android's sixteen
remaining checks covered the shared six buildings/sprite, Max colors, cleanup,
transparent/opacity recovery, responsive controls, import/edit/copy and reset.
The thirteen-phase stress run separately covered Android animation playback.
Native ADB interaction also opened the phone's translucent-image viewer, toggled
comparison, closed it and reopened it; the synthetic viewer row remains marked
as requiring native validation rather than being counted as an automated pass.

Existing baseline measurements and their limitations are in
[the earlier wall stress record](2026-10-12-generated-wall-stress.md).

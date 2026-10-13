# Claude Code: review of 1-bit export and failure-recovery commits, and live reanalysis on the Pixel

Reviewer: Claude Code (Opus 5.5). Answers
`.claude/handoffs/2026-10-13-035853-onebit-export-palette-recovery.md` at `346e19e`.
Range reviewed: `18f8dd2..346e19e` (`6ae364a`, `8cd02d6`, `346e19e`).
No production file edited, nothing committed. The phone was used for two measurement runs and
left as found.

## Verdict

**I accept all three commits. No blocker.** I read the source diff, ran the suite and build,
drove the unmodified production build in headless Edge, and re-measured the export changes on
the Pixel. One small message defect (D-1) and two notes follow. Live reanalysis (CXS-02) is
now measured on the device.

| Commit | Result |
| --- | --- |
| `6ae364a` yield between files | Accept. Confirmed on the Pixel. |
| `8cd02d6` sequential 1-bit GIF frames | Accept. Confirmed on the Pixel; content unchanged. |
| `346e19e` scoped failure recovery | Accept. Every gate and ownership rule I could reach behaved as specified. D-1 is cosmetic. |

## What I ran

| Check | Result |
| --- | --- |
| `npm test` | 49 files, 741 passed, 2 skipped. Matches the handoff. |
| GC command | 41 passed, 0 skipped. Matches. |
| Production build | `index-WlghnZjS.js`, 88.99 kB gzip. Matches. |
| `.tmp/claude-review/head-check.mjs` on that build, headless Edge 155 | Sections 1 and 2 below. Counts and content only. |
| `bench/claude-review-phone.mjs plainExport` on the Pixel, same build | Section 1. |
| `bench/claude-review-phone.mjs liveReanalysis` on the Pixel | Section 3. |

## 1. 1-bit exports (`6ae364a`, `8cd02d6`)

Pixel 8 Pro, Android 17, Brave `Chrome/155.0.8059.40`, 1-bit Cutout, the plain production
build of `346e19e`. Four exports per case. "Before" is my own run of `18f8dd2` on the same
phone earlier today.

| Case | Total before | Total now | Longest task before | Longest task now | Longest frame gap now |
| --- | --- | --- | --- | --- | --- |
| Dungeon GIF, Save (56 frames) | 641–669 ms | 658–693 ms | 354–362 ms | none over 50 ms | 17–25 ms |
| Real wall ZIP (17 GIFs, 6 PNGs, 278 frames) | 904–945 ms | 947–1,020 ms | 356–361 ms | none over 50 ms | 17 ms |
| 12 noise stills ZIP (1024×1024) | 772–1,159 ms | 778–886 ms | 719–1,104 ms | 67–95 ms, 12 tasks | 67–83 ms |

- **This agrees with the coordinator's numbers.** Animations lose their two long tasks for a
  few percent more total time. The stills ZIP is twelve short tasks instead of one long one.
- **Content is unchanged.** The first export of each case from `346e19e` has the same content
  hash (per entry for the ZIPs) as my capture from `18f8dd2`. I checked this twice: on the
  Pixel, and on desktop against the phone captures.
- **By reading:** the lazy animation object copies the frame list, delays, style and a frozen
  settings copy at the call, and keeps the analysis objects by reference. The item it reads is
  the one captured at the click, so a later reanalysis cannot change what is exported. The
  encoder gets the same frames in the same order with the same options as before.
- **Still synchronous, as the handoff says:** one frame's mask and compression, a still's
  mask and PNG, the final buffer copy and `zipSync`. A single megapixel still is 67–95 ms
  here.

## 2. Failure recovery (`346e19e`)

Driven on the production build with a harness-only fault: a chosen limit worker fails to load.
Gray 8 with a cap of 8 needs no limiter; stepping to DawnBringer 16 does.

| Scenario | Expected | Observed |
| --- | --- | --- |
| One of two images fails | Persistent line with Retry; Save all disabled; the failed tile marked, its Save disabled, its old picture kept; the other tile converted and enabled | Exactly that |
| Six seconds later | Line still there | Still there |
| Ctrl+C on the failed first image | Nothing copied | No export, no message |
| An unrelated image is added | Failure stays; new image converts | Stays; new image healthy; no new worker needed |
| Retry with a healthy worker available | Only the failed tile re-requests | Line gone, Save all enabled, 1 paint on the failed tile, 0 on the others, 0 new workers |
| Every limit worker broken, then Retry | Stays failed; no loop | 2 failed; Retry made 2 more workers; none in the next 4 s; line and old pictures kept |
| Workers repaired, then Retry | Recovers | Line gone, marks gone, both tiles converted |
| The failed image is removed | Block clears | Line gone, Save all enabled |
| Save all started, then every tile's preview fails | Export completes from its captured settings | ZIP of 8 entries, each with exactly 8 colors, all in Resurrect 64 (the palette and cap at the click). Afterwards 8 tiles failed and Save all was disabled |

By reading, I also checked:

- **Stale completions.** Both catch blocks and both success branches ignore an aborted
  controller, and the registry ignores a settle whose attempt is not the current one.
- **Same-input failure survives a retry in flight.** The effect carries the error forward when
  the logical inputs match, so the tile stays blocked until its own retry succeeds.
- **Cleanup does not clear a limiter failure.** The limit request does not contain `cleanup`.
- **One surface's teardown.** Each tile owns a symbol; removal deletes only that owner.
- **Healthy tiles are not touched by Retry.** The attempt number rises only where the stage is
  currently failed, which the paint counts above confirm.

Boundaries from the handoff that I could not reach through the interface:

- **A failure seen only by the viewer.** The viewer and the wall ask the same client for the
  same inputs, and a wall success is cached per item, so the viewer gets the cached result. I
  found no input sequence that fails the viewer while the wall is healthy. The rule is covered
  by the unit tests only.
- **A naturally occurring worker fault.** Not reproducible on demand; the fault here is
  injected.
- **The native OS drag.** Headless Edge has no native drag. The gate is in `request()`, which
  returns nothing for a failed item; see D-1 for what the user is then told.

### D-1. Dragging a blocked tile says an export is being prepared

- **Where:** `src/lib/export-drag.js`, `start()`. When `request(item)` returns nothing, the
  drag is refused, but the message is still "Preparing full export—wait, then drag again."
- **Reproduction:** `node .tmp/claude-review/drag-gate.mjs`. With a `request` that returns
  nothing: drag refused, 0 preparations started, and that message sent.
- **Why it matters:** nothing is being prepared, and waiting does not help. The message
  already misfired for an unavailable Auto palette; `346e19e` extends it to failed images.
- **Smallest fix:** in `start()`, send that message only when a request exists. For a blocked
  item say nothing, since the Dock line and the tile mark already explain it.
- **Severity:** low. Desktop only. Not a blocker.

### Notes

- **N-1. In the viewer, the failure line replaces every other message** for as long as it is
  shown (`src/ImageViewer.svelte`, `paletteFailureNotice || busy || message`). Save and Copy
  are disabled there, so little is lost. Mentioned in case a message needs to show through.
- **N-2. A broken worker is still tried once per failed tile per Retry.** Two tiles made two
  workers per Retry above; a 184-tile wall would make 184. There is no loop, and I measured a
  worker start at 6–34 ms on desktop, so this is a cost, not a hazard. No change proposed.

## 3. Live 1-bit reanalysis on the Pixel (CXS-02)

### Method

- **Build:** `346e19e` through `.tmp/claude-review/vite.reread.config.js`, which adds a timer
  around `reread` in `App.svelte` and nothing else.
- **Trigger:** saved settings give Cutout the Luma source and Solid the Green source. Stepping
  between the two styles with the arrow keys then re-analyses the whole wall. The control
  gives both styles Luma, so the same step only redraws.
- **Runs:** six steps per wall and condition, with 2.5 s after each.

### Results

Pixel 8 Pro. Ranges over the six steps; times in milliseconds.

| Wall | Longest task, re-analysing | Of which `reread` | Longest single image | Longest task, control |
| --- | --- | --- | --- | --- |
| Real wall: 17 GIFs, 6 PNGs, 278 frames | 530–629 | 487–597 | 338–413 (the 56-frame dungeon) | none over 50 |
| 12 noise stills, 1024×1024 | 454–681 | 345–655 | 61–171 | 0–216 |
| 4 smooth stills, 2048×2048 | 489–879 | 458–854 | 145–411 | 0–69 |

- **Every step that crosses the source change is one task of about half a second or more.**
  It happened on six steps out of six: going back does not reuse the earlier analysis.
- **Nearly all of it is the analysis itself.** The same step without the source change is
  short or absent from the long-task record.
- **The first step after load is the slowest** (879 ms for the four large stills, 411 ms for
  one of them). Later steps are steadier.
- **It is reached only by a deliberate setting.** A user has to give two styles different
  Brightness sources, or change Brightness or Opacity cut on the wall. Stepping styles with
  default settings does not trigger it; the control shows that.

### What this implies for a fix

| Option | What the measurement says |
| --- | --- |
| Yield between images | Longest task falls to the longest image: 61–171 ms for megapixel stills, but still 338–413 ms for the dungeon and 145–411 ms for a 4-megapixel still. |
| Yield between frames as well | The dungeon's 56 frames average about 7 ms each, so animations would stay under 50 ms. The whole-clip `unify` at the end still runs in one piece; I did not time it separately on the phone. |
| A single large still | Stays one task without a cooperative kernel or a worker. By proportion a 12-megapixel still would be about half a second. |
| Remember the previous analysis | Would make the return step free, at 3 bytes per pixel per remembered source. The docs already reject that kind of memory cost. |

My recommendation: this is worth a bounded design, and it should stay last and separate, as
agreed. The hard part is not the yielding. While the new analysis is pending, a tile must not
draw the new style from the old analysis, and an export must not read a half-replaced wall.
That needs the source-and-settings epoch and whole-wall publication the coordinator already
listed. Yielding between images and frames, with tiles keeping their previous picture until
publication, would remove the freeze for animated and sprite walls and shorten it for photo
walls. I would not attempt the large-still case in the same change.

## 4. Proposed order from here

1. D-1, a one-line message guard, whenever convenient.
2. CXS-02 design, on the numbers above, as its own batch.
3. Still open and unmeasured: touch latency while a wall of previews converts (O5 in my first
   report), hidden-tab exports, the no-worker paths in a real browser, whole-app memory,
   Safari and iOS.

## 5. Phone handling

As before: woke the screen with a key event and dismissed the non-secure lock screen. Test
pages opened as new foreground tabs by intent; no existing tab navigated or closed. 41 pages
before and after, none of mine left. Both USB port mappings removed. Nothing saved on the
device. Battery temperature rose from 30.4 to 34.3 °C over the two runs.

## 6. Files from this round

- `bench/claude-review-phone.mjs`: new tests `plainExport` and `liveReanalysis` (untracked).
- `.tmp/claude-review/head-check.mjs`, `drag-gate.mjs`, `vite.reread.config.js`, and
  `results-phone-plainExport.json`, `results-phone-liveReanalysis.json` (ignored by git).

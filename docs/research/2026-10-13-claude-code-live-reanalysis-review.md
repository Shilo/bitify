# Claude Code: review of the blocked-drag fix and cooperative live 1-bit reanalysis

Reviewer: Claude Code (Opus 5.5). Answers
`.claude/handoffs/2026-10-13-050244-live-onebit-reanalysis.md`.
Commits reviewed: `aaa3a5b` and `aad686e`, by their source paths.
No production file edited, nothing committed. The phone was used for one measurement run and
left as found.

## Verdict

**I accept both commits. One reproduced regression, R-2, should be fixed but need not hold the
batch.** The reanalysis produces the right pixels, publishes the wall as one piece, and exports
keep the settings of the click. On the Pixel the freeze is gone for the animation wall.

| Commit | Result |
| --- | --- |
| `aaa3a5b` blocked-drag message | Accept. My reproduction now sends no message. |
| `aad686e` cooperative reanalysis | Accept, with R-2 open. |

## How I tested, and a note on the checkout

- The shared checkout had another session's uncommitted branding edits in `src/App.svelte` and
  `src/lib/save.js` when I started. I did not touch them. I exported `aad686e` with
  `git archive` into my scratchpad and ran everything on that clean copy.
- That work has since been committed as `ebf5cac` (names and logo assets only, in the files I
  reviewed). `npm test` at `ebf5cac` also passes, 774 and 2 skipped. I have not otherwise
  reviewed that commit.

| Check on the clean copy of `aad686e` | Result |
| --- | --- |
| `npm test` | 50 files, 774 passed, 2 skipped. Matches the handoff. |
| GC command | 41 passed, 0 skipped. Matches. |
| Production build | `index-D_vFMUTB.js`, 90.48 kB gzip. Matches. |
| `.tmp/claude-review/reanalysis-check.mjs` on that build, headless Edge 155 | Sections 1 and 2. Counts, hashes and content only. |
| `bench/claude-review-phone.mjs liveReanalysis` on the Pixel, same build | Section 3. |

## 1. Correctness on the production build

1-bit family, Cutout. Brightness changed between Luma and G with the real Dock buttons.
Canvas pixels are hashed and compared with a fresh page load of the same setting.

| Sequence | Expected | Observed |
| --- | --- | --- |
| Luma → G | Pixels equal a fresh G load | Equal |
| G → Luma | Pixels equal a fresh Luma load | Equal |
| G, Luma, G in quick succession | Ends on G | Equal to fresh G |
| Luma, G, Luma in quick succession | Ends on Luma | Equal to fresh Luma |
| G chosen, then an image removed while the pass is pending | The nine left equal a fresh nine-image G wall | Equal |
| G chosen, then Save all at once (12 megapixel stills) | The ZIP is the G result | Same content as a ZIP saved from a settled G page |
| Save all, then Luma chosen at once | The ZIP is the setting at the click (G) | Same content as the G ZIP |
| Save all after settling on Luma | Luma result | Same content as a fresh Luma ZIP |

By reading:

- **Nothing published is mutated or detached.** `capture` copies frame records and keeps pixel
  buffers by reference; `analyze` allocates new arrays; `unifyAsync` runs only on those new
  analyses.
- **Publication is whole-wall and guarded** by the aborted controller, the request identity,
  the family, the source, the cut where it matters, and the identity of the wall or example.
  The effect's own cleanup already aborts on any of those changes, so the guards are a second
  line.
- **Unchanged images keep their identity**, so their tiles and caches are not disturbed.
- **Exports prepare their own analysis** from the item and settings captured at the click, and
  do not wait on or read the wall's pending pass. Copy still calls the clipboard synchronously
  with a promise.
- **`unifyAsync` is the same arithmetic as `unify`**: the seam histogram is accumulated frame
  by frame through the function the synchronous path now also uses.
- **Peak memory is as before**: the old code also built every new analysis before replacing
  the wall.

## 2. R-2. A slider dragged while a pass is in flight freezes the wall until release

- **Where:** the `$effect.pre` in `src/App.svelte`. It reads `dragging`. When a drag starts,
  the effect re-runs, its cleanup aborts the pass in flight, and
  `if (dragging && … > 1e6) return` then postpones a new pass until the drag ends. Every tile
  has `analysisPending` true for that whole time, so it keeps its old picture.
- **Reproduction:** `node .tmp/claude-review/reanalysis-check.mjs <build> drag`. Twelve
  1024×1024 stills. Drag the Threshold slider for about two seconds.

  | Sequence | Wall paints during the drag | First paint after drag start |
  | --- | --- | --- |
  | Drag Threshold | 180 | 146 ms |
  | Choose G, then drag Threshold at once | **0** | 2,453 ms, which is after release |
  | Drag Threshold again | 180 | 64 ms |

- **Expected:** the slider redraws the wall while it moves, as it does in the first and third
  rows.
- **Before `aad686e`:** the analysis was synchronous, so it had finished before a drag could
  begin. The page froze for half a second, then the drag was live.
- **How likely:** the drag has to start while a pass is pending on a wall of more than a
  million pixels. On the Pixel a pass took about half a second to a second for the walls I
  measured, and longer for larger ones. Changing Brightness and then reaching for a slider is
  an ordinary sequence. The timings above come from my slow desktop host, where the window is
  wide; I did not reproduce it on the phone, where the Style panel is laid out differently.
- **Cost beyond the freeze:** the aborted pass's work is thrown away and redone after release.
- **Smallest fix:** a drag should not cancel a pass that is already running for the same wall
  and settings. Keep the controller outside the effect's cleanup, keyed by wall identity and
  settings; on a re-run with the same key leave it running; apply the drag deferral only when
  deciding whether to start a new pass.
- **Acceptance:** the middle row paints during the drag once the pass completes; an Opacity
  cut drag on a large soft wall still starts no pass until it rests or ends; a changed source
  or wall still aborts at once; add the middle row to the tracked QA page.
- **Severity:** low to medium. Output is always correct in the end.

## 3. The Pixel, plain production build of `aad686e`

Same method as my earlier baseline: Cutout reads Luma and Solid reads G, so each arrow-key
step between them re-analyses the wall. Six steps per wall. Baseline is my run of `346e19e`
on the same phone.

| Wall | Longest task before | Longest task now | Longest frame gap now | Same step with no source change, now |
| --- | --- | --- | --- | --- |
| Real wall: 17 GIFs, 6 PNGs, 278 frames | 530–629 ms | none over 50 ms | 17–33 ms | none over 50 ms |
| 12 noise stills, 1024×1024 | 454–681 ms | 63–157 ms | 58–158 ms | 51–174 ms |
| 4 smooth stills, 2048×2048 | 489–879 ms | 121–203 ms | 117–185 ms | 0–69 ms |

- **This agrees with the coordinator's numbers.**
- **For the twelve stills, what is left is the redraw, not the analysis.** The control step,
  which re-analyses nothing, has the same 51–174 ms task. That is the ordinary cost of
  redrawing twelve large tiles in Cutout.
- **For the 4-megapixel stills, what is left is one image's analysis**: four tasks of
  121–203 ms, one per image. As the handoff says, a single large frame is still one piece.

## 4. Smaller points, by reading only

None of these is reproduced, and none is a blocker.

- **An import that lands while a pass is pending restarts the pass.** The effect depends on
  `items`, and each batch of new tiles replaces it. The new images already match the
  settings, so only the older ones are redone, from the first image each time. A long import
  onto a wall that is mid-pass would keep restarting it until the import ends.
- **A viewer opened while a pass is pending has no retained picture.** Its tile is new, so it
  shows the grid until the wall publishes. Original still works there.
- **The Dock's Auto readouts** (threshold and seam ranges) come from the old analyses until
  publication. The Stencil cut range is correctly withheld.
- **One posted task per frame** means a 278-frame wall posts several hundred small tasks. The
  frame gaps above show this is not starving rendering.

## 5. What I did not do

- **A real finger drag of Opacity cut on the phone**, and the deferred pass it should cause.
  The phone's Style panel shows one control at a time and I did not script it.
- **The native clipboard.** Headless Edge and the phone harness do not exercise the permission
  prompt.
- **R-2 on the phone**, for the same panel reason.
- **Large-still memory**, hidden tabs, Safari and iOS.

## 6. Where this leaves the review as a whole

| Item | State |
| --- | --- |
| F1, F2, F4, F7, F10, CXS-03, CXS-04 | Fixed; I reviewed and accepted them. |
| F9 and CXS-01 | Fixed and accepted. A single large still or frame remains one task. |
| F3 | Fixed and accepted. |
| D-1 | Fixed in `aaa3a5b`. |
| CXS-02 | Fixed in `aad686e`; R-2 open. |
| F5, F8 | Measured and deferred; I would close F5. |
| F6 | Withdrawn. |
| Still unmeasured | Touch latency while a wall of previews converts, hidden-tab exports, no-worker paths in a real browser, whole-app memory, Safari and iOS. |

## 7. Phone handling

As before: woke the screen with a key event and dismissed the non-secure lock screen. Test
pages opened as new foreground tabs by intent; no existing tab navigated or closed. 41 pages
before and after, none of mine left. Both USB port mappings removed. Nothing saved on the
device.

## 8. Files from this round

- `.tmp/claude-review/reanalysis-check.mjs` and `results-phone-liveReanalysis.json` (ignored
  by git).
- `bench/claude-review-phone.mjs`: `liveReanalysis` now takes `REANALYSIS_BUILD` (untracked).

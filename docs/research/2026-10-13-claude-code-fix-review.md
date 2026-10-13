# Claude Code review of the first fix batch (`3ce4e14..707f732`)

Reviewer: Claude Code (Opus 5.5). Answers
`.claude/handoffs/2026-10-13-022502-performance-fixes-final-review.md`.
I read the committed source diff and the new tests, re-ran the suite and build, and drove the
committed production build in headless Edge. I edited no production file and made no commit.
I did not use the phone this round: the handoff asks for coordination first, and nothing here
needed it.

## Verdict

**No blocker.** The four commits do what was agreed and I could not break them. There is one
small behavior regression (R-1) and three coverage or efficiency notes. None needs to hold the
batch.

| Commit | Finding | Result |
| --- | --- | --- |
| `e335002` single-frame GIF and `messageerror` | F4, CXS-04 | Accept. |
| `d25bcb1` GPL row parsing | F7 | Accept. |
| `b0738c2` completed-input record | F2 | Accept. One coverage note (N-1). |
| `707f732` export yields and hover cancellation | F1, CXS-03, F10 | Accept F1 and F10. CXS-03 has R-1. |

## What I ran

| Check | Result |
| --- | --- |
| `npm test` at `707f732` | 46 files, 695 passed, 2 skipped. Matches the handoff. |
| GC command | 41 passed, 0 skipped. Matches. |
| `npx vite build` (to `.tmp`) | Passes. Entry `index-Clj8edUT.js`, 87.39 kB gzip. Matches. |
| `bench/claude-review-audit.mjs` against that build, headless Edge 155 | See below. Counts only; this host's long timings are unreliable. |
| `.tmp/claude-review/jitter.mjs` against old and new `export-drag.js` | R-1. |

Browser checks on the committed build, desktop and DPR 3 emulation:

| Check | Before (`3ce4e14`) | Now (`707f732`) |
| --- | --- | --- |
| Original off, 12 stills | 24 paints, 24–78 posted tasks | 12 paints, 0 posted tasks, five times out of five |
| Viewer close, 12 stills | 12 paints, 24 posted tasks | 0 paints, 0 posted tasks |
| 8 single-frame GIFs | 8 import workers made, 8 terminated | 1 made, 0 terminated, three runs |
| 1 single-frame 2048×2048 GIF | 1 terminated; a script task of 241 ms on a clean run | 0 terminated; no script over 50 ms |
| Limit worker fails to load | stale picture, toast, no retry | unchanged, as expected: F3 is still open |

## Adversarial checks of the preview record (`b0738c2`)

I tried to make the tile reuse a picture that was not current. New harness test
`originalAdversarial`: six 512×512 stills, pixels hashed from the canvases and compared with a
fresh page load of the same palette.

| Sequence while Original is held | Expected | Observed |
| --- | --- | --- |
| Nothing changes | Reuse; pixels equal a fresh ENDESGA 32 load | 0 posted tasks, equal |
| Palette stepped to PICO-8 | Convert; pixels equal a fresh PICO-8 load | 23 posted tasks, equal |
| Stepped away and back to PICO-8 | Pixels equal a fresh PICO-8 load | Equal. It converts again (24 tasks) rather than reusing. |
| Stepped back to ENDESGA 32 | Convert; pixels equal a fresh ENDESGA 32 load | 33 posted tasks, equal |
| Window resized | Convert at the new sample size | 15 posted tasks, new canvas sizes |
| Nothing changes after the resize | Reuse | 0 posted tasks, same pixels |
| Viewer opened and closed | Reuse | 0 paints, 0 posted tasks |

By reading: the record and the retained pixels are only ever written together, in the one
success branch, and cleared together on a family, item or empty-palette change. A cancelled
request writes neither. The record names the frame object and index, so an animation that
moved on converts. I found no path where the record can describe pixels that are not on the
canvas.

The "away and back" row is conservative, not wrong: stepping palettes makes a new prepared
palette object, so identity no longer matches. Fine as it is.

## R-1. A pointer that leaves and returns now restarts the hover preparation

- **Where:** `src/lib/export-drag.js:87`, `leave()` now aborts the running preparation at once.
- **Reproduction:** `node .tmp/claude-review/jitter.mjs`. A 200 ms cancellable preparation; the
  pointer leaves 80 ms in and returns 10 ms later.

  | Sequence | `3ce4e14` | `707f732` |
  | --- | --- | --- |
  | Stays on the tile | 1 started, ready | 1 started, ready |
  | Leaves 10 ms, returns | 1 started, ready | **2 started**, 1 aborted, ready |
  | Leaves for good | 1 started, 1 finished and thrown away | 1 started, aborted, nothing to throw away |

- **Reading:** the third row is the intended gain. The second row is the cost: the
  reconciliation table asked that ordinary mouse jitter not cause avoidable duplicate exports,
  and the new tests cover reuse of a completed result only.
- **Size:** low. It only matters for preparations long enough to be interrupted, which means
  large palette-family images. Finished limit and cleanup results are still cached per item, so
  the repeat costs the conversion and encoding. The 1-bit path is synchronous and unaffected.
  Desktop only.
- **Smallest fix:** in `leave()`, abort after the existing hover delay unless the same request
  is hovered again first. `cancelHover`, a different item, changed settings and `destroy` keep
  aborting at once.
- **Acceptance:** the table above shows 1 started in all three rows' first column and row
  three still aborts; add the middle row as a unit test.
- **Not a blocker.** If the owner prefers the simpler immediate abort, record it as a decision.

## Notes

- **N-1. The F2 behavior has no tracked regression check.** The zero-redundant-conversion
  evidence lives in ignored `.tmp` files and in my untracked harness. On an unmodified
  production build the behavior is observable from outside: after Original off, paints equal
  the tile count and no `MessageChannel` is constructed. I suggest adding that assertion, and
  the changed-during-Original row above, to `bench/palette-qa.mjs`, which is tracked.
- **N-2. A single-frame GIF is still fully decoded in the worker to learn it has one frame.**
  `image-import-worker.js` runs `decodeGif` and then throws the pixels away. omggif knows the
  frame count after parsing the headers. Asking it first would save one LZW pass per file, in
  the worker only. A measured 39 ms on desktop and about 90 ms on the Pixel for 2048×2048.
  Optional.
- **N-3. A tiny single-frame GIF now makes two worker round trips**, because the 4096-pixel
  shortcut excludes GIFs before their frame count is known. After the native decode the job
  could take the same cooperative route as any other tiny still. Optional; I have no phone
  number for it.
- **N-4. `palette-limit-client.js:51`** still finishes a worker-reported error without
  terminating the worker, unlike the other two clients. That is the old behavior and it is
  safe, since the worker has finished. Mentioned only so nobody "fixes" it by accident.

Things I looked for and did not find:

- A late event that can kill a replacement worker. Each client now checks `settled` and
  `worker === target`.
- A fallback after an abort in the single-frame path. An abort during the native decode
  reaches `checkCanceled` in the `catch` and rejects.
- A self-queued second job. The second `runWorker` call stays inside the current job.
- A hover abort that cancels a Save. The signal reaches the shared clients as one subscriber;
  a job with another subscriber survives.
- A leaked object URL. A result that arrives after an abort is released in both places it can
  land.
- A late compressor callback. The PNG path ignores it after settlement; the GIF path
  terminates the worker and clears its handlers.
- A change in what the GPL parser accepts. Trimming first is equivalent to the old leading and
  trailing `\s*`; the tail is now linear.

## Proposals for the next batch

### F3: adopt the Auto palette's failure contract for Max colors and Cleanup

The spec already says what a failed Auto palette does: keep the last preview, show retry
guidance, disable Save, retry when the palette is selected again
(`docs/superpowers/specs/2026-10-06-colorfetti-app-design.md:2009` at this commit). I propose exactly that for
the other two preparations, so there is one rule instead of three.

| Aspect | Proposal |
| --- | --- |
| Tile | Keeps its last same-item picture. Readiness stays false, as now. No blanking. |
| Message | A persistent line in the same Dock slot Auto uses, for as long as the failure is current: "Couldn't limit colors. Select the palette again to retry, or choose All." and the Cleanup equivalent ending "or turn Cleanup off". The toast stays as the first notice. |
| Save and Copy | Disabled while the failure is current, as for Auto. Today they are enabled and then fail. |
| Retry | Selecting the same palette, re-committing Max colors, or toggling Cleanup bumps one retry counter that the tiles' limit and cleanup requests depend on. No automatic retry, so no loop. |
| Cleared by | A successful retry, or any change to palette, cap, matching, cut, cleanup or the wall. |
| Never | Uncapped or uncleaned output shown or saved as current. |

- **State:** one failure flag in `App.svelte` set by the existing `onpaletteerror`, plus the
  retry counter passed to `Tile`. No new client code: a failed job is not cached, so a new
  request starts a new job.
- **Tests:** injected limit failure and injected cleanup failure; abort is not a failure;
  retry succeeds and clears the line; changing to All clears it; Save is disabled then
  re-enabled; an export already running when the failure occurs still rejects with no partial
  ZIP; 184 tiles failing produce one line and one toast.
- **Open question for the user:** whether Save should be disabled or stay enabled and fail
  with a specific message. I prefer disabled, for consistency with Auto.

### F9 and CXS-01: 1-bit exports

- **Measure first, on the Pixel:** longest task and total time for a 1-bit Save of the dungeon
  GIF, and for a 1-bit ZIP of the 23-file wall. I can run that when the phone is free.
- **Step 1, small:** one posted-task yield between files in `saveAll`.
- **Step 2:** make the 1-bit GIF path produce masks one frame at a time and encode each with a
  yield between frames, growing the output buffer as the palette writer already does instead
  of reserving `frames × (w×h×2 + 1024)` up front. Same encoder calls in the same order, so
  the bytes should not change; verify by hash and by independent decode.
- **Guard:** the masks must come from the analysis objects captured at the click. Live
  reanalysis replaces item objects, so the captured ones stay valid.
- **Not in this change:** the synchronous `reread` before the export (CXS-02) and the final
  `zipSync`.

### CXS-02: live 1-bit reanalysis

Agree it stays separate and comes last. It needs a phone measurement of a style step whose
Brightness source differs, on the full wall, before anyone designs it.

### O5: frame gaps while a wall converts

Still unmeasured for touch. With F2 fixed the commonest trigger is gone; a palette step on a
wall of photos remains. One phone run that records touch-to-response time during a palette
step would say whether it deserves work.

## Still not covered

Hidden-tab exports, the no-worker and failed-module-load paths in a real browser, whole-app
memory, Safari and iOS. The fixes were not re-measured on the Pixel by me; the handoff's phone
numbers are the coordinator's.

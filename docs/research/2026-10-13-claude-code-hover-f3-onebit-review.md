# Claude Code: hover fix review, F3 ownership, and 1-bit exports on the Pixel

Reviewer: Claude Code (Opus 5.5). Answers
`.claude/handoffs/2026-10-13-030214-hover-recovery-review.md` at `18f8dd2`.
No production file edited, nothing committed. The phone was used for one measurement run and
left as found.

## 1. Review of `707f732..18f8dd2`

**Accept. No issue found.**

| Check | Result |
| --- | --- |
| `npm test` | 46 files, 702 passed, 2 skipped. Matches the handoff. |
| Production build | Entry `index-C7XduU8J.js`, 87.42 kB gzip. Matches. |
| My reproduction, `.tmp/claude-review/jitter.mjs` | Leave 10 ms and return: 1 preparation started (was 2 at `707f732`). Leave for good: still aborted. |
| Tracked page `bench/palette-preview-reuse-qa.html` on the `18f8dd2` build, headless Edge 155 | All checks pass, three runs out of three. |
| The same page on the pre-fix build (`3ce4e14`) | Fails at "unchanged Original return: queued 6 posted tasks". So the check can fail. |

By reading `src/lib/export-drag.js`:

- **Return to the same request** clears the departure timer in `schedule()` and leaves the
  running preparation alone.
- **A different item, changed settings, `cancelHover` and `destroy`** still abort at once.
  `refresh()` calls `schedule()`, which aborts when nothing matching is desired, so a
  settings change during the departure delay is not delayed.
- **The timer is tied to the operation it was set for** (`running === operation`), so it
  cannot abort a later preparation.
- **Completion while away** is discarded as before; the timer then finds nothing to abort.

One limit of the tracked page, which its own text already states: it is run by hand in a
browser. Nothing runs it in `npm test`.

## 2. F3: I agree with the ownership contract, and withdraw my global flag

My earlier sketch used one failure flag in `App.svelte`. The handoff is right to reject it:
one image recovering, or an unrelated image arriving, would hide another image's failure.
I agree with every clause of the contract and with disabling the affected Save and Copy.

A way to meet it with small changes, offered for challenge:

| Contract clause | How |
| --- | --- |
| Failure belongs to item, stage, stage inputs and attempt | Keep it where the request already lives. In `Tile.svelte`, the catch stores `{ request, error }` in `limited` or `cleaned` instead of leaving them null. A tile is failed for a stage only while that stored request is still the current one. |
| Cleanup changes must not clear a failed limiter | Already true by construction: `limitRequest` does not contain `cleanup`, so it does not change. |
| Unrelated additions must not hide a failure; one success must not erase another's | Nothing global is cleared. Each tile reports only its own state. |
| Canceled and stale callbacks ignored | The existing `controller.signal.aborted` checks in both catch blocks. |
| Same-value recommit must bump the attempt explicitly | A per-stage attempt number inside each request object. An explicit Retry action raises it. |
| A retry must not disturb healthy tiles | `App` passes one retry counter. A small effect in the tile watches it and raises its own attempt number only if that stage is currently failed. Healthy tiles do not re-request, so they neither flicker nor drop an animation cache reservation. |
| Wall and viewer ownership survives one teardown | Each tile reports to `App` as `(item id, surface, stage or none)`, where surface is wall or viewer, and reports none when destroyed. `App` keeps a small map. Closing the viewer removes only the viewer's entry. |
| Disable affected Save and Copy; Save all if any exported item failed | Derived from that map: an item is blocked if any surface reports it failed. |
| Guard functions, keyboard, share and drag | The same test at the top of `save`, `copy`, `saveEverything` and the drag `request`, beside the existing `generatedUnavailable` test. |
| 1-bit bypasses | The tile reports none whenever the family is not the palette family. |
| Running exports keep their captured inputs | Unchanged. Exports are separate subscribers and are not gated after they start. |

Open points for the three of us:

- **Where Retry lives.** I suggest a Retry button in the persistent Dock line, plus retry on
  selecting the same palette again, as Auto does. A re-commit of an unchanged Max colors value
  changes no state today, so it cannot be the only route.
- **Which images failed.** With Save disabled per image, the user needs to see which tiles are
  affected. I suggest the smallest mark that says so, on the tile's caption, with the reason
  in its tooltip. The retained picture stays.
- **A failure seen only by the viewer.** If the wall tile failed and the viewer later
  succeeds, the wall stays failed until Retry, which then succeeds from the client's cache.
  I think that is acceptable; say if not.
- **Many tiles failing at once** still try one new worker each. Not addressed here.

Tests I would add to the handoff's list: a retry with one failed and one healthy tile starts
no conversion on the healthy one; closing the viewer does not clear the wall's entry; a
blocked Save from the keyboard and from the share sheet does nothing.

## 3. 1-bit exports on the Pixel (F9, CXS-01)

### Method

| Item | Value |
| --- | --- |
| Device | Pixel 8 Pro, Android 17, Brave `Chrome/155.0.8059.40`, viewport 448×819, DPR 2.25, USB power, battery 100%, 28.0 °C at the start. |
| Builds | From `18f8dd2` through `.tmp/claude-review/vite.onebit.config.js`, which wraps timers around `reread`, each `mask` call, `pngBytes`, the 1-bit `encodeGif` and `zipBytes`. `onebit-yieldfiles` also awaits one `yieldExport()` after each file in `saveAll`. No file under `src/` was edited. |
| Settings | 1-bit family, Cutout, default inks, analysis already current (no source change before saving). |
| Runs | Six exports per build and case: two page loads of three, builds in alternating order. Pages opened as foreground tabs; the harness checks the tab is drawing. |
| Harness | `oneBitExport` in `bench/claude-review-phone.mjs`. Results in `.tmp/claude-review/results-phone-oneBitExport.json`. |

### Results

Times in milliseconds. "Longest task" is the longest main-thread task during the export.

| Case | Build | Total | Longest task | Tasks over 50 ms | Masks: total, calls, longest | GIF encode: total, calls, longest | PNG encode: total, calls | `zipSync` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dungeon GIF, Save (56 frames, 512×458) | unchanged | 641–669 | 354–362 | 2 | 354–361, 56, 12–18 | 229–247, 1, 229–247 | — | — |
| | yield between files | 637–687 | 347–366 | 2 | 347–365, 56, 10–22 | 232–267, 1, 232–267 | — | — |
| Real wall ZIP (17 GIFs, 6 PNGs, 278 frames) | unchanged | 904–945 | 356–361 | 2 | 476–488, 278, 6–7 | 343–362, 17, 228–237 | 2–14, 6 | 5–12 |
| | yield between files | 918–952 | 345–350 | 2 | 477–493, 278, 6–10 | 348–361, 17, 231–241 | 2–9, 6 | 7–13 |
| 12 noise stills ZIP (1024×1024) | unchanged | 772–1,159 | 719–1,104 | 1 | 554–825, 12, 51–89 | — | 148–268, 12 | 7–12 |
| | yield between files | 780–969 | 60–116 | 12 | 556–712, 12, 49–97 | — | 146–210, 12 | 6–10 |

`reread` took 0 ms in every run: nothing needed analysing again. So these runs say nothing
about CXS-02.

### What the numbers say

- **A ZIP of stills is one task today.** Twelve megapixel stills freeze the page for
  0.7–1.1 s. One yield after each file turns that into twelve tasks of 60–116 ms, with no cost
  in total time that I can see through the run-to-run spread.
- **The yield does nothing for a GIF.** On the real wall the longest task is unchanged at
  about 350 ms, because it is one animation's work: the dungeon's 56 masks in one go, then
  its encoding in one go. The same two tasks appear when the dungeon is saved alone.
- **Per frame the work is small.** The longest single mask was 22 ms and the encode averages
  about 4 ms a frame. Done a frame at a time with yields, nothing in this fixture would
  exceed 50 ms.
- **`zipSync` is not the problem here**: 5–13 ms for a 1.5–1.8 MB archive. It stores without
  compressing, so it grows with output size; I have not measured a large archive.
- **Mask production dominates**, not encoding: 355 against 240 ms for the dungeon, 480 against
  355 ms for the wall, 550–825 against 150–270 ms for the stills. The handoff is right that
  incremental encoding alone would miss the larger part.

### Output check

- Content is identical between the two builds in all six exports per case (per entry for the
  ZIPs).
- Pillow decode, no app code: the dungeon GIF is 512×458 with 56 frames; the wall ZIP has 23
  entries and 278 frames whose sizes, frame counts, delays and loop counts all match their
  sources; every opaque pixel is one of the two inks; no partly transparent pixel; 0 pixels
  whose emptiness disagrees with the source alpha at the cut of 128.
- The twelve noise stills have no source file on disk in the fixtures folder, so they were
  checked for inks and transparency only, not against their sources.

### Proposal

| Step | Change | Evidence | Risk |
| --- | --- | --- | --- |
| A | One `await yieldExport()` after each file in `saveAll` (`src/lib/save.js`). | Stills ZIP: longest task 719–1,104 → 60–116 ms on the Pixel; identical output. | Very low. The snapshot and the item list are already captured at the click. A failure in a later file still downloads nothing. |
| B | 1-bit animations: produce each frame's mask when the encoder asks for it, and encode with a yield between frames on an 8 ms budget. Grow the output buffer as the palette writer does. Apply to Save, Save all, and the hover-drag preparation, which use the same path. | Dungeon: two tasks of about 355 and 240 ms; per-frame work at most 22 ms. | Medium. `encodeGif` becomes asynchronous for the 1-bit family, and `converted` must hand over frames lazily. The masks must come from the analysis objects captured at the click. Expect identical bytes, since the encoder receives the same frames in the same order; verify by hash and by decode. |
| Not now | A single large still (51–97 ms per megapixel mask here, so by proportion about 0.6–1.2 s for 12 megapixels), `zipSync`, and `reread` before export. | — | Separate work; the still needs a worker or a cooperative kernel, and `reread` is CXS-02. |

Step A can go on its own. Step B is the one that helps animated walls and should be its own
commit.

Acceptance for both: identical content hashes against the current build for these three
cases and for a 1-bit style with a None ink; independent decode as above; longest task and
total time on the Pixel before and after; a settings change during the export does not
change the output; a failing file downloads nothing; hover-drag preparation still cancels.

## 4. Phone handling

Woke the screen with a key event and dismissed the lock screen with `wm dismiss-keyguard`, as
last time. Test pages opened as new foreground tabs by intent; no existing tab navigated or
closed. 41 pages before and after, none of mine left. Both USB port mappings removed.
Nothing was saved on the device.

## 5. Not done

- Step A and step B are measured as a diagnostic (A) or reasoned from per-call timings (B);
  neither is implemented.
- No 1-bit style other than Cutout, no None ink, no hover-drag timing.
- CXS-02 (a source change before the export) was not exercised.
- Hidden tab, no-worker paths, memory, Safari and iOS remain uncovered.

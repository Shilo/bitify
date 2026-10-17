# Auto palette return continuity

The generation effect restarted whenever Auto became active, including when its
published result already matched the captured wall key. The client returned its
cached colors, but App published a new palette object. This repeated preview
conversion and optional subset/Cleanup preparation. Setting `generatedBusy` also
briefly added “Updating shared colors…” to the palette panel and could refit the
wall for a frame before restoring its size.

The fix reuses App's successful publication when its key matches. It does not
add another cache or retain source buffers. The key already includes source/data
identity, dimensions, frame durations, revisions and effective opacity cutoff.
Source/opacity changes still generate, incomplete requests still retry, and
resolved empty palettes still clear converted artwork. Export capture and fitting,
matching, caps, Cleanup, dithering and playback rules are unchanged.

## Acceptance harness

Build, then run:

```powershell
npm run build
node bench/auto-palette-continuity-server.mjs dist 5291
```

Open `/qa` in the foreground Codex browser and click Run checks. Repeat with
`?mode=cap`, `?mode=cleanup`, `?mode=combined`, and `?mode=combined&phone=1`.
Combined uses cap 4, Cleanup On, ordered 4×4 dithering at 50%, and Opacity Keep.
Phone uses a 390×650 iframe to exercise responsive layout; it does not emulate
touch hardware. Each local app load resets only this QA origin's preferences.

The server adds test-only canvas-paint counters and generated-worker start/failure
instrumentation to HTML, without changing built production modules. Results are
written beneath `.tmp/auto-flicker`. Frame sampling reads backing pixels, canvas
identity and geometry. It checks all twelve curated palettes, all twelve 1-bit
pairs and Auto returns, repeated/rapid switching, Original comparison and mixed
still/GIF playback. Additional checks cover source removal/replacement, alpha128,
Cut/Keep, resolved empty palettes, cutoff recovery, failed generation/retry,
restoring a previous successful key after another fails, a sampled 512×384 source,
and viewer return. Retry tests verify lifecycle completion, not different colors:
cut32 and cut33 include the same alpha128 pixels.

## Review and evidence

An independent adversarial sub-agent reviewed request identity, cancellation,
failure ownership, exports, memory and the test instrumentation. Discussion
rejected speculative Tile lifecycle changes: the supported issue was redundant
Auto publication and transient layout refits. Review requested partial-opacity,
empty/source/failure/viewer coverage and explicit sampled-dimension assertions;
the harness includes those checks. The reviewer approved the production guard.

To isolate this change from concurrent checkout work, source was copied to a
scratch snapshot and built twice, differing only by the six-line App guard.
Their CSS assets were byte-identical. Baseline warm Auto returns painted twice;
several showed one frame of pending status and a corresponding image resize.
All five final configurations passed the same expanded harness after review.

| Configuration | Switch phases | Observed browser frames | Result |
| --- | ---: | ---: | --- |
| Default, current production build | 69 | 2,755 | Pass |
| Max colors 4 | 69 | 2,763 | Pass |
| Cleanup On | 69 | 2,737 | Pass |
| Cap 4 + Cleanup + 4×4/50% dither + Keep | 69 | 2,746 | Pass |
| Combined at 390×650 | 69 | 2,738 | Pass |

Across 345 phases and 13,739 browser frames, none of the watched switches removed,
replaced, hid or blanked its canvas. All 85 explicitly checked warm Auto returns
painted once, without pending status or a transient resize. Sampling was confirmed
at 424×318 on desktop and 282×212 at narrow width for the 512×384 source. Each run
also passed all five source/opacity/failure/viewer lifecycle groups. Wall dimensions
and pixel hashes matched before/after Preview. The viewer baseline waits for the
rail-closing refit to finish: the earlier fixed 100ms delay could capture a retained
smaller raster and was corrected during adversarial review.

The final unit suite passed 969 tests across 63 files, with two optional GC tests
skipped. The production build and diff whitespace check passed. An initial sandbox
temp-directory rename error was resolved by setting this test process's TEMP/TMP
to `.tmp/vitest-auto`; no production or test configuration change was needed.
The default integration run and unit/build checks were repeated after the concurrent
per-image color-count cache change landed; they passed against that combined checkout.

No literal canvas disappearance was reproduced in the baseline. Backing-pixel and
DOM observations cannot certify every GPU/compositor presentation, device, image
or timing. First generation and genuine source/cutoff changes can still show the
existing updating notice and its layout consequences. This fix removes that
transition for already completed, unchanged Auto requests.

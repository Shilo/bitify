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

## Functional regression audit

A second independent adversarial review checked source identity, stale results,
cancellation, failure/retry, settings invalidation, exports and cache eviction.
No production correction was recommended. The client already cached results by
the same request key; this guard only avoids republishing its completed result.
Import/removal/replacement, duplicate assets, original/data identity, dimensions,
frame order/durations/revisions and effective cutoff invalidate that key. Matching,
caps, Cleanup and dithering instead invalidate the independent conversion paths.
Keep and Cut1 intentionally share fitting eligibility while preserving separate
output-alpha identities. The reviewer ran 15 key assertions successfully.

We challenged the two-entry client LRU case: independent exports for other captured
walls can evict App's current publication from that cache. Returning to unchanged
Auto can now defer its deterministic refit until Save rather than prewarming it
during the switch. This changes where that work happens, not its output or request
ownership. The reviewer forced eviction and verified identical colors, 257 output
indices/alpha values and a 251-byte PNG after regeneration.

The differential browser harness uses two frozen copies of the same source tree,
differing only by the six-line guard. Build each copy, then run:

```powershell
node bench/auto-palette-regression-server.mjs <before-dist> <after-dist> 5383
```

Open `/qa` and click Run functional checks. The server isolates each app's storage,
records actual production download Blobs and injects test-only worker hold/failure
controls. Production modules are unchanged. It compares settled canvas pixels,
editor swatches, selected palettes, error guidance and PNG/GIF bytes. ZIP comparison
checks every filename and encoded file byte, excluding archive timestamp metadata.
Reports are saved to `.tmp/auto-functional/results.json`.

Coverage includes cold Auto and saved-preset loading; active/inactive imports and
deletions; last-image removal; new and previously used walls; custom palette import;
matching, cap, Cleanup, all dither sizes/strength endpoints and Cut/Keep changes;
nondefault settings across a preset/Auto roundtrip; palette and global Reset;
canceled generation; failure/retry; a captured export surviving source deletion;
GIF fitting/export/removal; and no-Worker generation/import/removal. Review requested
explicit saved-preset and committed combined-settings assertions; both were added.

The broad fallback run also exposed an existing limitation: disabling Worker
entirely permits Auto generation/import/rendering, but palette PNG saving uses
fflate's Worker-based asynchronous encoder and fails. The harness explicitly
requires the same save failure in both builds and records it separately; it does
not count fallback exports as passing. No encoder change is included in this fix.

The complete corrected post-review run passed all 44 before/after checkpoints and
36 production export comparisons, including animated GIF bytes and ZIP contents.
Both versions reproduced the explicitly checked Worker-disabled save limitation.
The latest unit run again passed 969 tests (two optional skips), and an isolated
production build passed. No further production edits were needed after review.

The physical Android follow-up also passed 21 phases over 856 observed frames on
a connected Pixel 8 Pro running Brave. Combined cap/Cleanup/dither/Keep settings,
actual advancing GIF playback and source lifecycle checks passed. The four measured
warm Auto returns painted once without pending status, a refit or a missing canvas.
Fifteen 250ms warm-switch windows contained no 50ms-or-longer task; their maximum
rAF interval was 33.4ms. Startup/other phases still had 56–65ms tasks, so this is not
a claim that the whole application is free of long tasks.

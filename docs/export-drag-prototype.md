# Desktop export-drag compatibility prototype

This is opt-in research, not released cross-application support. Open
`http://127.0.0.1:5184/?dragExport=1` in the desktop browser being tested.

Start with `npm run build`, `node bench/export-drag-qa.mjs` to create/check fixtures,
then `node bench/export-drag-server.mjs` to serve the built app. The server listens only
on Windows loopback and serves `dist` plus `.tmp/export-drag-qa` fixtures. Normal app
URLs do not start the export cache or display diagnostics. Existing export functions
and encoders are reused without extraction or changes to Save/Copy/ZIP.
Coarse/no-hover mobile devices also create no drag runtime or panel with the flag.
Only a primary mouse press on a fine-pointer/hover device can arm a drag. Touch and pen
input, pointer release/cancellation and desktop capability loss clear any mouse arm.
The established wall swipe handlers remain unchanged: horizontal moves step palettes,
vertical moves step styles where the wall does not scroll; dock/panel/dialog exclusions,
hold comparison and pinch behavior remain in force.

## Manual native test

Download `/fixtures/drag-source.png` and `/fixtures/drag-animation.gif`, then add them
to Bitify. Hover one tile until the panel says ready. Start with File + DownloadURL.
If rejected, repeat with DownloadURL only and File only; record each mode separately.

For each installed Brave, Chrome and Edge version:

1. Drag the PNG into an empty File Explorer folder. Record accepted/rejected. Select
   the received file under Verify received file; require an exact match to latest drag.
2. Change style, colors, transparency, palette family, matching, opacity or Max colors.
   Try immediately: blocked while preparing is acceptable; an old export is not.
   Once ready, drag and verify again. Verify an old file intentionally: it must identify
   an older drag, never report success for the latest one.
3. Drag with Original comparison showing. The exported file must remain converted.
4. Drag the GIF and verify its file. Check animation, three frames and 70/130/210 ms
   source delays, at original 128×96 dimensions. Repeat in full palette mode with a cap.
5. Drag PNG/GIF into Discord desktop and web. An unsent attachment confirms acceptance
   only, not byte identity. Where a received attachment can be downloaded, verify that
   file too. Record inability to retrieve bytes as unverified. Posting is not required
   for the prototype's local checks.
6. Drop back onto Bitify; no duplicate image or import overlay should appear. Normal
   click still opens the viewer, stationary hold compares, and touch scrolls/swipes.

Save test log once per browser. Logs contain filenames, browser information, settings,
size and hashes; image bytes remain local. Report browser version, target, payload mode,
PNG/GIF, accepted/rejected, exact-byte result and any settings changes between attempts.
`dragend` and `dropEffect` are diagnostics, not a delivery confirmation.

## Validation and review

`src/lib/export-drag.test.js` checks synchronous stale/source/removal rejection, async
late results, serialized/debounced preparation, failed payload construction, URL grace,
capacity, teardown, self drops and mouse-only gestures. `bench/export-drag-qa.mjs`
checks built-app full-size PNG/GIF bytes against actual Save downloads, PNG structure,
GIF timing, full palette caps, comparison, verifier correctness and real browser drags.

Synthetic DataTransfer tests prove what the app supplies. Trusted drag tests prove what
the browser delivers to the test receiver. Neither proves Explorer/Discord delivery;
that remains pending until manual results and received files are examined.

The reviewer challenged diagnostic historical matches, async hash ordering and import
overlay behavior. Those valid findings were fixed and retested. The review also required
explicitly separating positive byte checks from negative trusted-target compatibility.
Results and screenshots are written under `.tmp/export-drag-qa`; the existing broad
palette/export regression covers Save, Copy, GIF, ZIP and asynchronous snapshot behavior.

## Resource limits

Only one hovered image is prepared after a 180 ms debounce, with one active preparation
at a time. Results from older requests are discarded. Conversion remains the existing
main-thread/cooperative export path; large stills/GIFs can pause the UI or take seconds.
There is no claim of background-thread conversion or cancellable encoding. The cache
retains one ready file, an active drag if invalidated, and up to eight evicted files with
60 seconds of native-consumer grace. Encoded size is not bounded; full-source export
scratch and hashing's ArrayBuffer also consume memory. Jobs never run from touch hover.

## Brave native results (October 11, 2026)

The user tested Brave on Windows and reported successful Explorer drops, while Discord
inserted the filename as message text instead of an attachment. Chrome/Edge native tests
were declined; their automated export checks do not establish native compatibility.

Both supplied sources in Downloads match the generated fixtures exactly. Independent
inspection and fresh isolated Brave Save comparisons of all three Explorer files found:

| Received export | Dimensions | Encoding/animation | Bytes | Fresh Brave Save |
| --- | --- | --- | ---: | --- |
| drag-source-1bit.png | 1024×768 | Indexed PNG, 2 bits, Glow/Cutout, transparency | 5,684 | Exact SHA-256 match |
| drag-source-palette.png | 1024×768 | Indexed PNG, 8 bits, PICO-8 plus transparent entry | 22,391 | Four pixels differ; historical byte match unverified |
| drag-animation-palette.gif | 128×96 | Three frames, 70/130/210 ms, loop 0, transparency | 1,482 | Exact SHA-256 match |

The PNG discrepancy is four of 786,432 pixels with identical palette/transparency, not
just a compression difference. Three differing historical pixels and one differing fresh
pixel are scattered opaque pixels compared with the raw-source oracle. This is consistent
with [Brave's session-dependent canvas randomization](https://brave.com/privacy-updates/4-fingerprinting-defenses-2.0/),
not proof of its cause. Original-session ready/drag logs or Save comparison are needed for
historical byte identity. No reduced preview or animation-still substitution was found.

The review also identified Chromium's distinct native image-resource file-content path.
An isolated experiment using full optimized PNG/GIF resources tested default image drag,
string removal with clearData(), and string removal plus DownloadURL. All six trusted
Brave cross-frame drops delivered zero files; this does not test Discord desktop's native
Windows file-content consumer. Default image drag retains HTML/URL and is unsuitable.
An isolated fixture at `/fixtures/native-image-test.html` offers the two already received
optimized exports with native file content retained and string formats removed. It is a
focused optional Discord desktop test, not an integrated feature or a compatibility claim.
The app's Save/Copy/ZIP and tile code were not changed for this investigation.

The local fixture server's missing-file path previously sent success headers before
reading the file, then attempted a second header write on failure and crashed. It now
reads first and sends one response; malformed URL escapes return 400. The server
regression test checks 404/400/403 requests followed by successful app responses.
Trusted Brave checks of the isolated native image fixture confirm original encoded
PNG/GIF source bytes remain exact after removing strings, and its verifier accepts the
latest GIF while rejecting the older PNG. Discord acceptance remains unverified.

Audit metadata lives in `.tmp/export-drag-qa/native-file-review.json`; native image
receiver results live in `.tmp/export-drag-qa/native-image-results.json`. The independent
review agreed with the pixel discrepancy and challenged any claim of browser-only
impossibility before the separate native image path is tested against Discord desktop.

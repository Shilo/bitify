# Desktop export dragging: validation record

Production cleanup: desktop wall and fullscreen Preview dragging work on ordinary URLs
without a query flag. All drag diagnostic UI, metadata logs, fingerprinting, window hooks,
alternate payload probes, prototype tests and fixture servers have been removed.
The sections below record the completed research and acceptance history; their old
prototype URLs, commands and diagnostic-panel instructions are no longer supported.

Desktop optimized export dragging is enabled on ordinary wall and Preview URLs.
For optional diagnostics, open
`http://127.0.0.1:5184/?dragExport=1` in the desktop browser being tested.

Start with `npm run build`, `node bench/export-drag-qa.mjs` to create/check fixtures,
then `node bench/export-drag-server.mjs` to serve the built app. The server listens only
on Windows loopback and serves `dist` plus `.tmp/export-drag-qa` fixtures. Normal app
URLs enable desktop export preparation without hashing/logging or diagnostics. Existing export functions
and encoders are reused without extraction or changes to Save/Copy/ZIP.
Coarse/no-hover mobile devices also create no drag runtime or panel with the flag.
Only a primary mouse press on a fine-pointer/hover device can arm a drag. Touch and pen
input, pointer release/cancellation and desktop capability loss clear any mouse arm.
Detected mobile UA data, Android/iOS browsers and touch-enabled iPad Mac identification
remain excluded even with a connected mouse. Touch/pen takeover cancels queued mouse
hover exports; an already-running encoder finishes before its unused result is discarded.
Touch/pen presses on controls also cancel queued hover work through one passive capture
listener; it does not prevent touch input or end/revoke an active native drag.
The established wall swipe handlers remain unchanged: horizontal moves step palettes,
vertical moves step styles where the wall does not scroll; dock/panel/dialog exclusions,
hold comparison and pinch behavior remain in force.
Pressed mouse edge crossing preserves drag threshold behavior; window release/cancel
and blur clear arms when a press ends outside the artwork. Native dragend also clears it.

## Manual native test

Download `/fixtures/drag-source.png` and `/fixtures/drag-animation.gif`, then add them
to Bitify. Hover one tile until the panel says ready. Start with Native image + DownloadURL.
If rejected, use the diagnostic alternatives and record each mode separately.

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
native destination acceptance and byte verification must be recorded separately.

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

## Mobile safeguards and post-commit review

The initial prototype/mobile safeguard commit was reviewed independently. We agreed to
fix reproduced queued mouse-export work surviving touch takeover, extend cancellation
to touch/pen presses on Dock controls, and fix a reproduced mouse drag starting one pixel
inside the artwork edge. The edge fix retains the press until drag threshold while
window release/cancel/blur disarms it; active native export URLs remain retained.
We also agreed that explicit mobile exclusion warranted conservative mobile detection
even when a mobile browser reports a fine pointer. Existing swipe/hold code was untouched.

After those fixes, `npm test` passed 520 tests in 33 suites and the production build
passed. The browser harness passed 252 checks across 14 scenarios each in Chrome for
Testing 153.0.8010.12 and Edge 155.0.4283.45. Trusted CDP touch streams cover all four
directions on mobile PNG/GIF artwork with normal and opt-in URLs, full-palette horizontal
stepping and its established vertical no-op, hold comparison, fine-primary desktop touch
takeover on artwork and Dock, and detected-mobile-with-mouse exclusion. No mobile runtime,
panel, viewer opened by a swipe, or native drag was observed. Edge-start/outside release
and full optimized export/stale-state checks passed again.

The server request regression passed separately. The existing broad export regression
passed 132 legacy PNG cases, nine full-palette Oklab cases, nine RGB cases and 13 integration
categories including Copy/GIF/ZIP, asynchronous snapshots and failure behavior, without
browser errors. Physical phones/tablets and Safari were not tested; these mobile results
are emulated Chromium touch input, not physical-device certification.

## Native image acceptance and combined-payload experiment

The user subsequently confirmed that the isolated native-image-only fixture attaches
images in Discord desktop from Brave and the Codex browser, while Explorer rejects it.
The app's synthetic File plus DownloadURL has the opposite reported behavior.
This establishes destination-specific acceptance, not universal byte verification.

The app starts from a canvas/button, clears all transfer items and adds a JavaScript
File plus DownloadURL. The native fixture starts from an actual image resource containing
the full optimized export and removes only string formats, preserving Chromium's native
image file contents. Changing items.clear to clearData alone in the app cannot create
that native image-resource path; integration would require a prepared export-backed image.

[Chromium's Windows drag preparation](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/web_contents/web_contents_view_aura.cc)
offers download metadata before image file content when both are supplied.
[Its Windows data provider](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/ui/base/dragdrop/os_exchange_data_provider_win.cc)
uses delayed CF_HDROP for download and FILEDESCRIPTOR/FILECONTENTS for native image bytes.
The independent reviewer challenged a guaranteed combined-payload fix: a destination
could prefer the delayed download path, fail its synchronous request and never use the
otherwise valid native image content. Actual Explorer and Discord tests remain necessary.

The isolated fixture now defaults to native image plus DownloadURL, with native-only
available as a control. Both payload paths use identical optimized bytes. Trusted Brave
PNG/GIF source checks passed in both modes, DownloadURL fetch bytes matched native file
bytes exactly, text/HTML/ordinary URI formats were absent, release disarmed dragging and
latest-file verification rejected an older file. Mobile/coarse/touch/pen guards were added
to the isolated fixture as well. This experiment preceded the app integration below.

Chromium's [DataObject conversion](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/clipboard/data_object.cc)
includes a gated JS-file support path and a fallback that exports the filename as
text/plain. That explains the observed filename-text symptom; current main is explanatory
evidence, not a guarantee about every shipped browser version. Native filenames are
derived separately from resource URL/Content-Disposition, so destination tests must also
check name and extension. Production integration must bind the decoded native resource
to the immutable current export key; size/MIME checks alone are not enough.

## Ordinary desktop and fullscreen integration

The user confirmed the isolated native image + DownloadURL mode works in both Discord
and Explorer. Ordinary production/local app URLs previously did not drag because the
entire controller required the diagnostic flag, and the app still used its older JS File
payload. The integrated default now uses the accepted native image + DownloadURL path
on desktop wall images and fullscreen Preview. The user also reported that the updated
local app began attaching successfully in Discord. GitHub Pages needs deployment of
the new commit; rebuilding locally does not update the deployed site.

A transparent image overlays the canvas solely as a native drag resource. Its blob
contains the existing optimized full-source Save encoding, including every GIF frame.
The canvas, conversion loops, Save/Copy/ZIP functions and existing Tile gesture code
were not refactored. Decoding completion is bound to immutable export-record identity;
dragstart additionally checks current settings, exact image target/src, decoded witness,
dimensions and native file size/type. Old decode promises cannot rearm a replacement.
Native strings are cleared while encoded image content is preserved; DownloadURL refers
to those same encoded bytes. The native source File name is a blob UUID without an
extension in automated captures; destination filenames/extensions still need manual
verification, independently of the meaningful DownloadURL/Save name.

The independent reviewer reproduced a valid active-source lifecycle flaw: detaching
the image on settings invalidation prevented dragend from reaching the parent. The fix
retains the active source through dragend and listens directly on that source for
dragend even if its tile is removed. Both unit and trusted-browser reproductions now
pass, including a settings change mid-drag followed by a successful new current drag.
A second agreed cleanup fix guards destroyed actions so a late source dragend can end
the export without recreating a decoded overlay in detached Preview artwork.

Validation after the fixes:

- All 537 unit tests pass, including 43 drag tests and stale decode/current-key guards.
- Wall export/mobile regression: 252 checks, 14 scenarios each in Chrome for Testing
  153.0.8010.12 and Edge 155.0.4283.45, including four-direction trusted touch swipes.
- Native app regression: Chrome, Edge and Brave pass 18 normal/diagnostic PNG/GIF
  cases, each with wall and fullscreen-original-comparison mouse drags. Native file
  bytes equal DownloadURL fetch bytes and actual Save download bytes in each session.
- Each browser passes mobile and desktop fine-pointer CDP touch Preview cases: no
  native drag, hold comparison/release, four-direction movement without dismissal,
  and quick tap dismissal. Each also passes trusted active-settings-invalidation drag
  and closing Preview during a native drag: late dragend ends the active export, no
  detached overlay is recreated, and the next wall drag succeeds.
- Broad built-browser export regression passes 132 legacy PNGs, nine full-palette
  Oklab cases, nine RGB cases and 13 Copy/GIF/ZIP/integration categories without errors.

`bench/export-native-qa.mjs` writes `.tmp/export-drag-qa/native-app-results.json`.
Physical phones, Safari, and native Explorer/Discord drops from Chrome/Edge remain
unverified; the user chose Brave for manual native tests. Automated trusted source-byte
checks do not claim to automate those destinations. No Discord messages were sent.

## Final manual acceptance (October 11, 2026)

The user confirmed the integrated app works properly in Brave on Windows for all eight
combinations below, using both PNG and animated GIF exports:

| Image surface | Format | Discord | File Explorer |
| --- | --- | --- | --- |
| Main wall | PNG | Accepted | Accepted |
| Main wall | GIF | Accepted | Accepted |
| Fullscreen Preview | PNG | Accepted | Accepted |
| Fullscreen Preview | GIF | Accepted | Accepted |

This is user-reported native destination acceptance. No new received-file hash logs
were supplied with this confirmation; the automated same-session native/DownloadURL/Save
byte comparisons above remain the recorded export-identity evidence. Chrome/Edge native
destination acceptance and physical mobile-device testing remain outside this confirmation.

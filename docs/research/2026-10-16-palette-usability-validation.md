# Palette usability validation — October 16, 2026

This batch starts at `d91d9d1`. It changes usability and adds one opt-in palette;
it does not alter color matching, Auto fitting, Keep weighting or export codecs.
No deployment was performed.

## Separate feature commits

| Change | Commit |
|---|---|
| Explicit protection deferral and working checklist | `df43862` |
| Versioned review gallery and its screenshot assets | `d044c9d`, `cb1c4ab` |
| Reviewed mulfok32 addition and ordering evidence | `fcfcd27` |
| Complete-gesture modal dismissal | `9710589` |
| Internal drag ownership | `e67eda7` |
| Concise Paste colors hint | `4d713f9` |
| Published-palette-name source link | `1e8f2ba` |
| Compact responsive Recolor controls | `42ebd05` |
| Wall-only Reuse and exact output metadata | `4983212` |

## Final user decision

Reuse belongs in the **wall**, immediately after Copy in desktop image actions
and the touch Image actions sheet. Preview retains Save/Copy/Compare, without
Count or Reuse buttons. Color counts are visible **wall caption metadata**.
The earlier Preview-Reuse proposal was superseded explicitly by the user.

Wall counts reuse already-computed full-resolution post-Cleanup metadata. No
additional full-source wall conversion starts. Animation counts wait for every
frame. A sampled wall leaves the count absent until full-source inspection through
Preview or Reuse completes; returning to the wall reveals that result. Preview's
internal Tile caption is hidden; DOM text there is **not** evidence of visible
Preview metadata. No additional Preview metadata bar was added.

## What reviewers challenged and fixed

The settings, dialog/drag and palette/count workers reviewed one another's work;
an additional adversarial reviewer inspected the integrated changes. Root reviewed
the diffs, source palette evidence and real browser behavior. Review was bounded
and defects had concrete before/after checks:

- Conditional keyboard Reset initially focused a Strength chip it then removed.
  Awaiting the DOM update and focusing the remaining selected chip repairs it.
- The selected first chip initially overlapped its rail arrow; bounded reveal
  positioning was corrected and responsive checks rerun.
- Touch backdrop focus blur initially cleared gesture ownership. Only actual
  window blur now clears it; real CDP touch and a unit regression cover the case.
- A known zero-color output left wall Reuse enabled with no useful response.
  Known zero disables it; a newly discovered empty result explains why no palette
  can be made. The failed and corrected acceptance receipts are retained.
- Five wall actions overflowed a 177px tile by 16px. Extending the existing
  two-column fallback from 160px to 204px fixes all five tested dense layouts,
  preserving Preview and target sizes. The earlier proposal to remove Preview
  was withdrawn after scope challenge and the user's clarification.

## Evidence

| Surface | Result and limits |
|---|---|
| Isolated production build and unit tests | Build passed; 949 tests passed, 2 skipped. Tests needing explicit garbage-collection exposure remain skipped. |
| Desktop settings | Ten viewports and seven interaction flows; portrait panel 460→130px, short landscape 304→76px. Conditional controls, breakpoint changes, abandoned native gestures and Reset focus covered. |
| Desktop dialog/drag | Eleven browser checks plus 50 focused unit checks. Inside/outside mouse and touch gestures, cancellation, Escape, external files, native exported-file payload and source-link renaming covered. |
| Desktop count/reuse | Ten final acceptance cases. Saved PNG 13 colors and four-frame GIF 10-color union match independent Sharp decoding; reused drafts match Save. Cap, target, RGB, Cleanup, dithering, Keep and mode changes covered. All 504 partial-alpha fixture pixels preserved. |
| Actual running inspection cancellation | Twelve-frame 1024² GIF (12,582,912 source pixels); desktop count control about 330ms, close about 95ms in the final run; no late count/draft. A held-module test also covers cancellation before loading. These are fixture timings, not guarantees. |
| Physical USB Pixel 8 Pro / Brave 155 | Nine initial functionality checks and three final wall-only follow-up checks pass. Native saves independently decoded, live scheme-less Lospec import, canonical mulfok32 target, touch sliders, cancellation and Reset covered. Final follow-up supersedes initial Preview-button expectations. |
| Phone performance | Twelve-image wall, three baseline and three changed runs: no observed task over 50ms; maximum import rAF gap 16.8ms for both. This is a bounded comparison, not general FPS, memory or battery proof. |
| Codex Browser | Actual built-app upload, wall metadata, one-click reuse, compact portrait/landscape, conditional strength and keyboard Reset reviewed. Final wall-only actions are checked separately from the superseded Preview design. |
| Existing palette/export regression | 132 independently decoded legacy style exports passed. After updating the stale eleven-preset harness expectation, all 12 full targets passed Oklab/RGB previews, PNG/clipboard references and additional GIF/ZIP/import/snapshot tests. The legacy matrix and resumed full-target phase were separate runs. |

Detailed receipts, harnesses, independent native output files, before-fix failures
and screenshots are in `bench/palette-usability-2026-10-16/`,
`bench/palette-settings-compact/` and `bench/dialog-drag-evidence/`.
Palette popularity, canonical RGBs and sixteen output comparisons are retained in
`bench/palette-curation-2026-10-16/` and the separate selection research.

## Device and evidence qualifications

Android portrait visuals were inspected. Landscape used the actual Android
renderer with per-tab CDP viewport/orientation overrides, and geometry/touch checks
passed. Its screenshot compositor crops/repeats the physical portrait surface;
therefore **actual OS-rotated landscape visual acceptance remains unverified**.
A bounded probe is retained; no production CSS fix was justified by that tooling
limitation. OS rotation/security preferences were not changed. The phone's internal
URL-drag ownership test uses a synthetic payload; trusted native export drag was
tested on desktop. Neither point should be described as full native phone drag
or physical rotation coverage. Mac/iOS were not tested.

Only owned phone tabs/downloads were closed/removed, and test-origin storage and
CDP overrides were restored. Chromium's sandbox remained enabled for isolated
desktop browser tests.

## Isolation and deferrals

A different task began zoom/navigation edits in shared Preview/Tile files. The
user requested that task pause. Those working edits were preserved and excluded
from this batch's commits and final build: the final tests use an archived staged
palette snapshot at `.tmp/palette-usability-final/`. Receipts include build hashes.
This validation does not approve the other task's unfinished behavior.

All 152 source files in the feature commit match that tested snapshot. The first
raw-byte audit reported Windows archive CRLF versus Git LF differences; the
corrected reproducible check normalizes only text line endings and still requires
byte-identical binary assets. It reports no source-content differences.

Artist-controlled protection and all original mockups/research remain versioned
and explicitly deferred. Auto Max colors is research-only by the user's decision;
the public service contract does not establish a safely transferable selection
rule. Existing closed weighting/refinement experiments remain closed. No Smart
colors integration, new weighting setting or hidden algorithm heuristic shipped.

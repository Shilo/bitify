# Palette usability acceptance

Final design: **Reuse in wall actions only**, immediately after Copy. Preview has
Save/Copy/Compare and no Count/Reuse button. Counts are visible wall metadata.

Authoritative final receipts:

- `count-results.json`: ten desktop cases on the isolated palette build, including
  exact independently decoded Save/reuse comparisons and five dense layouts.
- `android-wall-reuse-results.json`: three final phone checks, same built index
  SHA256 `329d22dff9e72098…` as the final desktop receipt.
- `codex-final-*.png`: actual final Codex Browser wall, draft and Preview captures.
- `android/final-*.png`: final phone sheet, draft and Preview captures. Landscape
  screenshots have the compositor limitation described below.

Historical qualification:

- `android-results.json` and `android-followup-results.json` retain the nine initial
  phone checks, native output comparisons, live import and bounded performance
  comparison. They predate the final wall-only placement clarification.
- `count-prior-preview-design-results.json`, `codex-reuse.png` and earlier images
  retain the superseded Preview-button design; they are not current UI evidence.
- `*before*fix*` and toolbar receipts retain genuine failed checks before repairs.
- The large PNG/GIF and transparent PNG are generated owned test inputs.

Counts from hidden Preview Tile captions are not visual evidence. Actual phone
landscape geometry/touch passed with CDP viewport overrides, but its compositor
captures crop/repeat the physical portrait surface. Actual OS-rotated landscape
visual acceptance is unverified; `android-landscape-probe.mjs` and
`android/landscape-probe.json` retain the bounded diagnostic. Phone internal URL
drag tests use synthetic payloads; desktop native export tests use trusted drags.

The final isolated build is `.tmp/palette-usability-final/dist`; it excludes a
separate task's unfinished zoom/navigation work. Set `AUDIT_DIST` for the desktop
count harness. Phone scripts attach to an authorized USB browser at port 9333,
keep the browser open, restore test-origin storage/metrics and close owned tabs.
Read the scripts before running; paths/ADB serials are environment-specific.

See `docs/research/2026-10-16-palette-usability-validation.md` for the complete
bounded evidence, review findings, scope and remaining limits.

# 32-color preset recheck

Run `node bench/palette-recheck-2026-10-16/run.mjs` from the repository root. Add
`--refresh` only to replace the dated public Lospec metadata; offline runs retain
that evidence. No authenticated calls or uploads occur.

`comparison.png` shows ten sources against eight 32-color targets. Eight real
sprites come from Kenney's CC0 Tiny Dungeon, Tiny Town and Pixel Platformer packs;
their original source/license URLs and immutable input hashes are copied into
`results.json` from `bench/important-colors-review/manifest.json`. The original
license text is in that study's `licenses/` directory. Two remaining sources are
owned synthetic fixtures from `bench/claude-audit-2026-10-15/service/fixtures/`.
No Lospec example artwork is reproduced.

Settings: Oklab matching, all 32 target colors available, Cut128, dithering and
Cleanup off. Every visible output pixel passes an independent scalar nearest
Oklab check; target membership and binary alpha classification are checked too.
This verifies conversion correctness for these settings, not a universal ranking
of artistic quality. Point error and palette set distance are descriptive only.

The public palette JSON preserves creator names, canonical spellings and RGB
orders. The public listing records dated download/like counters, which are
popularity proxies rather than unique users or a global usage census. Research
recommends the locally formatted display label **Mulfok 32**; its published name
remains **mulfok32**. Neither the palette ID nor its colors should change.

## Actual app acceptance

The label-only change is commit `140a26c`. Library/state/preview tests passed
101/101. Root used Codex Browser on its isolated build at port 5337: preset order,
selected 32-color label, 7-color wall, one-click Reuse, native Save, portrait and
landscape labels all passed. Viewport overrides were restored. Screenshots and
`codex-ui-results.json` retain the checks; `codex-save-check.mjs` independently
checks the actual saved PNG against the validated reference and Reuse swatches.
Every visible RGB and every alpha byte match. Alpha-zero hidden RGB may differ
between indexed PNG and RGBA reference, which has no visible effect.

USB Android final acceptance is in
`../android-performance-review-2026-10-16/mulfok-final/results.json`: canonical
nearest output and Keep+dither/cap/Cleanup Save, counts and Reuse agree. Testing
paused while another agent owned the phone and resumed only after the user
confirmed that agent had finished. Original device state was restored.

Follow-up casing commit `5a77313` also displays **Game Boy Green** and
**Black & White**, preserving all palette values and IDs. All twelve preset names
were inspected in Codex Browser; `codex-labels-final.json` and the two named
screenshots record the selected labels and counts. Android independently passed
six native Save/count/Reuse checks covering all three renamed palettes in portrait
and landscape. Its final label receipts are in `palette-gameboy-final/`,
`palette-mono-final/` and `mulfok-final/` under the Android review folder. Final
receipts for all six checks use the later `5a77313` label build.
The full unit suite passed 969 tests with two existing GC-dependent skips; final
built desktop acceptance passed 10/10. The performance review adds no runtime
algorithm change: the tested dithering cache was rejected after broader testing.

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

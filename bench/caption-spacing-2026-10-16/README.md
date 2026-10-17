# Caption separator spacing — October 16, 2026

The previous built app produced `64×64· 2 colors`: Svelte trimmed the leading
space in conditional template text. Both Tile caption branches now use the
explicit text expression `{' · '}`. Retry metadata likewise preserves its leading
separator space. Existing responsive margins around × remain unchanged. No CSS,
layout policy, color conversion, counting or export behavior changes.

The candidate build archives committed `730fbb0` and overlays only the corrected
`src/Tile.svelte` under `.tmp/caption-spacing-review`, served at port 5340.
`spacing-source.png` is an owned opaque 64×64 half-black/half-white fixture.

Root's actual Codex Browser checks in `codex-results.json` cover 1280×720,
800×600, 521×800, 520×800, 390×844, 320×568, 844×390 and 947×364. Every caption
retains `64×64 · 2 colors`, nowrap and no document overflow. The unchanged ×
margins remain positive. Opening Preview also verifies the second caption branch.
Temporary viewport overrides are restored; no console errors occurred. The first
measurement attempt used unavailable NodeFilter in the browser's read-only scope;
the final receipt uses supported DOM text/computed-style inspection instead.

`before.png` and `after.png` are actual caption crops from the old and corrected
builds. The old wall had a second image, but both captures use the same desktop
caption font; the comparison concerns spacing, not tile layout.

The device agent independently passed four native USB Pixel 8 Pro checks: single
and twelve-image walls in portrait and real OS landscape. Native DOM ranges
measure approximately 2.9px on each side of the middle dot, with positive ×
margins. No caption escapes its container or wraps. Twelve-image short landscape
retains the existing ellipsis behavior (86px available versus a 95px label).
Device storage/rotation were restored and its owned tab closed. Detailed receipts,
reproducible native runner and four screenshots are in `android/`.

The production build passes. No new pixel pass, cache or reactive computation is
introduced by this static text fix.

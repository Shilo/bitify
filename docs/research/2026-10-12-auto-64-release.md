# Auto 64 production review

October 12, 2026. The user explicitly approved raising Auto's shared-palette
capacity from 32 to 64 after the paired capacity experiment. This record covers
that production follow-up, separate from the earlier recommendation-only spike.

## Review decision

The change is appropriate as a source-preserving shared palette. It means up to
64 unique opaque RGB colors. Sources with fewer colors must keep their exact
decoded visible colors; no padding or invented entries are required. Max colors
All, Oklab matching, Cleanup Off and the existing opacity default remain intact.
The optional per-image cap remains the mechanism for deliberate 8/16/etc. color
restriction. A 64-color shared palette does not itself promise cleaner regions,
fewer orphan pixels or preservation of intentional details.

No new matching algorithm, smoothing pass, eager animation bake, source cache or
additional setting is needed. The visible name remains Auto; the saved internal
identity `generated-32` is intentionally retained for existing users.

## Required integration and challenge

- A single exported capacity constant must drive the generator, client result
  validation and user-facing description. Changing the core alone is incorrect:
  the existing client rejects worker and fallback results over 32 colors.
- Exact-color preservation needs boundary coverage at 33 and 64 source colors.
  Larger sources should produce no more than 64, with uniqueness, determinism,
  chunk equivalence and source immutability retained.
- The real worker imports the generator. No new protocol field is necessary.
  Keep its one-at-a-time 128 KiB source slices and existing serial queue rather
  than cloning whole walls to test the larger capacity.
- Runtime result caching stores at most two small palettes, not original source
  buffers. Capacity is fixed for one loaded build; deployment/reload creates a
  new module instance, so the old 32-color runtime cache cannot pollute a newly
  loaded 64-color build. Changing the persisted palette identity would instead
  unnecessarily lose saved selections.
- Limiter, cleanup and animation cache keys already include actual palette
  colors. A freshly generated 64-color result therefore selects fresh dependent
  work, while canceled preparation cannot publish over a newer request.
- The empty wall must exclusively sample the example; a nonempty imported wall
  must exclusively sample its assets, including wholly transparent imports.
  Adding a larger capacity must not weaken this source-selection rule.

## Downstream costs and export boundaries

The earlier physical Pixel 8 Pro paired experiment measured a representative
43-asset/162-frame wall fit at 301.7 ms for 32 and 306.1 ms for 64. Its sampled
Oklab error fell 39.5%. The adversarial broad-bin fit rose from 97.0 to 168.8 ms,
and matching rose 5.3 to 7.7 ms. These are cooperative-core comparisons, excluding
decode, worker transport and UI; they must not be described as end-to-end app
latency. Whole-clip cap-to-eight preparation for the dungeon rose 322.1 to
385.8 ms. More capacity is useful but is not universally free.

The limiter's bounded 4096×P Float64 distance table can rise from 1 to 2 MiB.
Generation's bin limits do not change. Animation indexes stay Uint16, the shared
preview-index cache stays 8 MiB, and stills retain their existing behavior.
Cleanup Off skips cleanup preparation. A speculative selected-color Set seed
optimization was rejected after inconsistent timing results despite identical
output; it is not part of this release.

PNG and GIF export support up to 256 entries and use actual converted-color
membership. A 64-opaque-color source plus transparency is an important boundary:
the PNG uses 65 table entries at 8-bit index depth; the GIF table rounds to 128
entries. Palette index 63 and empty index 256 must both survive independently.
Used-color packing can make file tables larger at 64, even though the animation
preview storage budget remains unchanged. Compact unused colors rather than
silently removing a used color to force a smaller table.

## Research reproducer maintenance

`bench/auto-capacity-prepare.py` now clones both fixed capacities explicitly,
rather than importing production as the assumed 32 baseline. It recognizes the
production capacity constant and preserves relative helper imports in the
research-only copies. `auto-capacity-core.js` fails if a clone exceeds its labeled
capacity, preventing a misleading 64-versus-64 comparison after this release.
The rejected Set experiment also compares against the fixed research clones.

## Production verification

The reviewed production diff now uses `GENERATED_MAX_COLORS = 64` from
`palette-library.js` in the core, client validator and tooltip. No worker protocol,
cache ownership, animation storage or cleanup decision change is included. The
client's acceptance tests cover complete 33/64-color results and cached identity,
and malformed 65-color results must still terminate/recover the worker.

Independent Node fallback/export check, decoded using Pillow/NumPy: a 65×1 source
with 64 unique opaque RGBs plus one transparent pixel generated exactly 64 colors.
An identical captured request returned the same cached result. Its PNG was 8-bit
indexed and preserved every RGBA pixel, including the last palette color and
transparency. Its two-frame GIF used a 128-entry global table and preserved all
pixels, 80/120 ms delays and infinite loop metadata. This exercises the fallback
and encoder boundaries; the built-browser tests below must also exercise actual
workers and UI.

The paired research reproducer was regenerated after the production constant
changed. A 64-color source returned 32 colors through the explicit 32 clone and
64 through the explicit 64 clone, confirming the earlier comparison remains
reproducible rather than becoming 64-versus-64.

Production Auto64 passed the built Codex and physical Pixel 8 Pro checks.
The pre-performance-fix baseline passed thirteen phases with 184 assets, 17 GIFs
and 439 source frames. After the reviewed import-worker and offscreen fixes, both
passed fourteen phases, including real scrolling out and back in Palette, 1-bit
and Original modes. Hidden GIFs recorded zero paints; visible GIFs resumed.

| Operation | Desktop before → fixed | Phone before → fixed |
| --- | ---: | ---: |
| GIF import largest task above 50ms | 438 → none | 355 → none |
| GIF addition: file change to settled wall | 1,408 → 808ms | 4,066 → 2,108ms |
| Completed wall: file change to settled wall | 1,868 → 605ms | 4,665 → 2,433ms |

These are single instrumented runs; combined changes, layout and GC affect timings.
They do not establish universal deadlines. Some unrelated tasks remain, including
the phone's 134ms scroll/family/Original stage and 99ms clear/reimport stage.

A small-PNG throughput regression was challenged rather than hidden: phone's first
forty PNGs went from 421ms to 635ms with every import using the worker. A measured,
reviewed 4096-pixel cooperative still route reduced this to 586ms; it avoids 21 of
40 worker round trips but does not remove all overhead. The cold profile's 11.9ms
call is retained in the import research record; larger warm-only cutoffs were rejected.

After the final small-still fix, both devices passed the focused PNG check and
seven subset stages for caps, cleanup, rapid replacement, export and clear. Both
final captured ZIPs independently passed 28 files, 144 composited frames and
3,533,753 pixels, using exactly 64 shared colors. Comparing baseline and final
archives found zero changed pixels, transparency, delays or loops on either device.

Boundary tests in the built app passed on both devices for 2/32/33/64/65-color PNGs,
a two-frame GIF with 64 opaque colors plus transparency, and a 32768-color synthetic
image. Independent decoding of their actual exports verified all eight frames:
exact source pixels through 64 colors, binary alpha, membership, timing and loop.
Real Remove all cancellation prevented a pending dungeon import from returning.
The test GIF was explicitly indexed after a fixture check exposed Pillow's default
adaptive quantization; its actual 64 unique source colors were verified independently.

The desktop preset matrix completed its eighty palette/metric/cap/cleanup scenarios;
a stale 32-color harness assertion was corrected for Auto64. Sixteen remaining
integration checks then completed, including supplied six buildings/shared ASE,
source replacement, invisible/opacity recovery, 1-bit family and import/edit/copy.
Native viewer checks supplement the synthetic activation row.
The final production suite passed 668 tests, with both normally skipped source-release
checks also passing under explicit worker GC. Build passed. Source performance fixes
were committed by the implementing subagents as 06877a6, 08503e1 and 25e62d6.

Reports are local test artifacts under `.tmp/auto64-ui-20261012/`: `before-reports`,
`reports/full-fixed`, focused/subset/boundary reports and independent export records.
Research bundles and fixtures are excluded from the app download. See
[import findings](2026-10-12-import-worker.md) and
[offscreen playback](2026-10-12-offscreen-playback.md) for remaining costs and limits.

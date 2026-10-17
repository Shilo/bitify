# Additional 32-color preset: independent recheck

Keep the palette, display it as **Mulfok 32**, and keep it immediately after
ENDESGA 32. This is a local readability choice, matching the spacing of ENDESGA 32
and DawnBringer 16. Its published name is **mulfok32**, its creator is **mulfok**,
and its canonical source remains [the creator-submitted Lospec page](https://lospec.com/palette-list/mulfok32).
Do not change its stable ID, RGB values, order, creator credit or default selection.
“Mukfok32” is a misspelling, not another palette.

## Popularity: credible, with a narrow download lead

The refreshed [public evidence](../../bench/palette-recheck-2026-10-16/public-evidence.json)
records its actual UTC retrieval timestamp. The research took place October 16
Pacific time; the timestamp can fall on October 17 UTC. The exact-32-color list
sorted by downloads returned:

| Palette | Downloads | Likes | Reason to consider it |
|---|---:|---:|---|
| ENDESGA 32 | 205,939 | 2,284 | Existing broad, vivid choice |
| mulfok32 | 43,360 | 1,659 | Strong missing candidate with pink/purple treatment |
| Zughy 32 | 42,152 | 739 | Credible warmer/earthier alternative |
| DawnBringer 32 | 22,450 | 463 | Established broad palette with black and neutral ramps |
| Resurrect 32 | 20,632 | 863 | Existing Resurrect 64 family already represented |
| Nanner Pancakes | 17,475 | 816 | Muted warm/cool alternative |
| PICO-8 Secret Palette | 14,810 | 335 | PICO-8 family already represented |
| Aerugo | 14,442 | 810 | Restrained, muted neutral alternative |
| Sheltzy32 | 14,408 | 639 | Strongly saturated alternative |
| downgraded 32 | 13,241 | 751 | Another soft/vibrant artist palette |

The download lead over Zughy is only about **2.9%**. That is too small to treat as
decisive proof of superiority. Likes provide a second positive signal, but neither
counter measures unique artists, actual use, adoption outside Lospec, or quality.
This is the most-downloaded missing entry on the retrieved first page, not a claim
that it is the world's second-most-popular palette. Cached HTML exposed older
counters than the fresh listing; the table deliberately uses one JSON snapshot.

Primary sources: [filtered listing](https://lospec.com/palette-list/load?colorNumberFilterType=exact&colorNumber=32&page=0&tag=&sortingType=downloads),
[mulfok32](https://lospec.com/palette-list/mulfok32),
[ENDESGA 32](https://lospec.com/palette-list/endesga-32),
[Zughy 32](https://lospec.com/palette-list/zughy-32),
[DawnBringer 32](https://lospec.com/palette-list/dawnbringer-32),
[Nanner Pancakes](https://lospec.com/palette-list/nanner-pancakes),
[Aerugo](https://lospec.com/palette-list/aerugo),
[Sheltzy32](https://lospec.com/palette-list/sheltzy32), and
[downgraded 32](https://lospec.com/palette-list/downgraded-32).
Aerugo's HTML failed with 503 during browsing; its public downloadable JSON was
successfully retrieved. The creator's [Lospec profile](https://lospec.com/mulfok)
also uses lowercase mulfok. No creator endorsement of our capitalized UI label is
implied.

## Useful and distinct: yes, for an optional artistic treatment

The previous study used four fixtures and four palettes. This recheck creates
**80 outputs: ten fixtures × eight 32-color palettes**, including eight licensed
real Kenney sprites and two owned controls. See the [full comparison sheet](../../bench/palette-recheck-2026-10-16/comparison.png),
[gallery](../../bench/palette-recheck-2026-10-16/index.html),
[results and source licenses](../../bench/palette-recheck-2026-10-16/results.json),
and [reproducible harness](../../bench/palette-recheck-2026-10-16/run.mjs).

The pink/purple shadow and neutral ramps visibly distinguish Mulfok from ENDESGA:
the knight's steel becomes lilac, the water bucket's blue becomes periwinkle, and
the red potion and heart shift toward pink. The wizard keeps the purple character
and readable face. All three shield tones remain distinct; the heart retains
three tones, while Sheltzy merges that particular heart to two. Zughy and
DawnBringer preserve more earthy/neutral-looking metal, which is a valid reason
to prefer them for another project. Mulfok does not substitute for neutral metal.

The palette shares only white exactly with ENDESGA 32 and Resurrect 64. Exact
overlap is insufficient by itself, so the harness also measures equal-weight,
symmetric nearest-neighbor RMS Oklab distance across color sets. Versus ENDESGA,
Mulfok scores 0.0774, compared with Zughy 0.0556 and DawnBringer 0.0658; it is the
most different of these eight tested candidates by that limited measure. There
is no validated threshold saying a distance automatically earns a preset slot.
The visual changes are the stronger reason to keep it.

The creator calls it soft/pastel, but **do not describe it as uniformly less
saturated**. Its mean Oklab chroma is 0.120, versus ENDESGA's 0.107. Its pink/lilac
ramps and hue choices create the aesthetic; not every color is pastel. It has no
exact black and only one color within the study's arbitrary near-neutral chroma
cutoff of 0.03. It is therefore a deliberate artistic alternative, not a fidelity
upgrade or a replacement for existing references.

Average point Oklab error on this deliberately small set is 0.00498 for Mulfok
versus ENDESGA 0.00228, DawnBringer 0.00308 and Zughy 0.00366. These scores do not
make a tinting palette incorrect: choosing a fixed artistic palette intentionally
changes colors. All 80 outputs passed independent nearest-color oracle, exact
target membership and alpha classification checks. The built-in 32 values also
match the freshly downloaded public JSON exactly.

## Bounded decision and limits

Keep one additional 32-color choice, **Mulfok 32**; do not add all alternatives.
Popularity supports its inclusion, while the distinctive treatment justifies
the second slot. ENDESGA remains first and all defaults remain unchanged. Lospec
import serves artists who prefer Zughy, DawnBringer 32 or other specialist sets.

This study covers All/Oklab/Cut128 with dithering and Cleanup off. It does not rank
every cap, RGB matching, animation, dithering combination, photo, or genre. The
eight real sprites use only three Kenney packs; independent nearest-color checks
prove this implementation matches the requested sets, not that one set preserves
every artist's intent. No new user setting, matching algorithm or palette colors
are proposed. No Lospec example artwork was redistributed, and no explicit SPDX
license for the palette's color set is invented.

Root challenged the small popularity lead and the saturation language; both are
qualified above. Root independently accepted keeping the palette with the local
display label **Mulfok 32**. Runtime label implementation and app/device acceptance
are recorded separately by the orchestrator; this research is not a claim that
those UI checks have already passed.

### Later implementation and app acceptance

Commit `140a26c` applies only the local label correction, preserving every color,
stable ID, source link, creator credit, preset order and default. Focused tests
passed 101/101. Actual Codex Browser and USB Android checks subsequently passed;
native saves, wall counts and reused palettes agree with independent references.
Codex Browser covered desktop, portrait and short landscape. Android covered
canonical nearest plus Keep/dither/cap/Cleanup. See the study README and retained
device/browser receipts for exact conditions and the independent PNG check.

# Can Cleanup preserve details while removing orphan colors?

Historical experiment: the conclusions below describe the first candidate pass.
The subsequent bounded comparison selected and implemented a capped error rule;
see [final decision and production validation](2026-10-12-cleanup-final-decision.md).
Its exact-color protection and absolute ceiling supersede the earlier recommendation
to keep the stronger baseline. The ambiguity counterexamples still apply.

Date: October 12, 2026. Production baseline: `1e0976f`; corpus study: `62ffabc`.
This is a research experiment. No files in `src/`, defaults, storage or app controls
were changed. Candidate code and interactive conversions remain local QA artifacts.

## Verdict

**Error-limited Cleanup is the best candidate for further comparison, not a proven
replacement.** It retains the highlighted green ear, sword, metal and roof pixels
while still removing some isolated colors. It also misses both originally reported
PICO-8 sprite defects and can erase a constructed ambiguous intentional detail.
There is no demonstrated automatic candidate here that meets both goals without loss.

Keep the current algorithm optional and Off by default. Do not replace it based on
singleton counts. If a safer alternative is developed, validate it against artist
annotations, new images and production performance before deciding whether to ship.
An absolute error ceiling is a possible next experiment, not a tested recommendation.

## Independent challenge

A subagent reviewed the previous 40-image sheets independently and tested source-color
agreement with a separate harness. It confirmed loss of the green ear accents in
`s121`, but challenged the original labels:

- `s009` soil cleanup can plausibly be an improvement rather than a loss of detail.
- `s025` sword/hand accents, `s093` metal glints and `s145` tiny emoji details carry contrast.
- Even `s113`, previously rated cleaner, loses some roof texture and exact black pixels.
- Nearest palette conversion itself changes materials substantially in some examples.
  A Cleanup safeguard cannot recover detail already lost by nearest matching or a cap.

These remain unblinded judgments without artist intent labels. The earlier 11/40
"clearer" count is a historical visual rating, not a validated success rate. Preserve
that audit trail rather than recategorizing all cases after seeing candidate outputs.

The subagent initially preferred confidence/contrast safeguards, then challenged a
blanket conclusion that nothing useful had emerged. I agree: limiting extra color
error shows a useful conservative tradeoff on these examples. It does not establish
safe intent detection. We also agree that combining every veto mostly recreates Off,
and that exact source-color agreement alone still flattens metal details.

## Candidate rules

All variants start from identical nearest labels, with no cascading or new palette
colors. Source contrast, source-color agreement, error-limited and combined only veto
the existing strict singleton proposal; they do not search for another replacement
after a veto. Tighter distance recomputes proposals with narrower gates and can select
a different eligible label. Gates use Euclidean Oklab distance even when nearest
matching uses RGB.

| Variant | Rule |
| --- | --- |
| Current | Existing contact distance ≤ 0.22 and added squared error ≤ 0.35² |
| Tighter distance | Recompute strict proposals with contact ≤ 0.10 and budget ≤ 0.12² |
| Source contrast | Veto if source L is more than 0.025 outside the L range of target-label contacts, or any target contact differs by more than 0.04 in Oklab a/b |
| Same-source-color agreement | Every visible occurrence of an identical source RGB must propose the same destination index; otherwise retain that source color's original nearest label everywhere |
| Error-limited | Accept only when added squared Oklab error ≤ 0.5 × original nearest squared Oklab error + 0.0004 |
| Combined | Apply all three vetoes: source contrast, source-color agreement and extra-error limit |

"Error-limited" is not statistical confidence or recognition of material/intent. The
formula measures color distortion relative to the current baseline. The thresholds
are exploratory, not artist-calibrated or optimized on a held-out sample.

For animations, apply each candidate's proposals before the existing whole-clip
agreement guard. A coordinate changes only if every frame has the same baseline and
proposed labels. This retains the narrow fixed-coordinate transition guarantee; it
does not track moving material or prove absence of perceptual flicker.

## Scope and mechanical checks

Reuse all 160 stills and 16 GIFs from the deterministic corpus manifest, plus the
29×41 supplied sprite and twelve constructed controls (eight still, four animated).
The default comparison is PICO-8/Oklab/All: 189 sources × seven variants, including
Nearest Off, gives 1,323 variant evaluations and 2,919 evaluated frames.

Also test all 18 previously mixed cases, the one worse case and all eleven clearer
cases, plus the original sprite, with PICO-8/Resurrect 64 × Oklab/RGB × All/8:
31 sources × eight configurations × seven variants = 1,736 evaluations. These include
217 repetitions of the default study. Total: 3,059 evaluations, 4,655 evaluated frames
and 17,024 grouped assertions. The selected corpus and its provenance limitations are
described in the [original corpus study](2026-10-12-cleanup-pixellab-corpus.md).

Transparency, palette membership, color caps and identical fixed-coordinate transition
counts pass. All 160 stills also pass mirror and transpose comparisons for all six
cleanup variants: 1,920 transformation comparisons with no disagreement. Independently
decode 1,232 PNG/GIF output files (seven variants on 176 corpus inputs), covering 2,632
frames: dimensions, visible palette membership, alpha and measured changed-pixel counts
pass; GIF delays and loops pass. All 376 frames of the current algorithm match the
existing production QA conversions byte-for-byte after decoding.

This research does not reimplement the candidates in the app. Browser checks exercise
the local comparison page, its method/image/zoom selectors and real GIF outputs; they
are not new production export/worker/mobile performance tests. No physical-phone
performance or held-out artistic validation was completed. Production code is unchanged.

In Codex browser, all 51 selectable examples load all four comparison images, including
16 GIFs, three annotated static controls and the constructed counterexample. All six
method choices and three zoom values work. At 375×740 the selectors stay inside the
viewport and an animated example loads after switching methods; a research-page-only
selector overflow was fixed and retested. The viewport override was reset afterward.
No browser warnings/errors were recorded. GIF players are independent and may start
out of sync; transition measurements use aligned decoded frames, not screen playback.

## Results on the 160 stills

The baseline has 20,798 eight-connected singleton pixels. Percentages below describe
singleton reduction, **not visual success or detail-preservation rates**.

| Variant | Singletons remaining | Reduction | Images with reduction | Pixels changed |
| --- | ---: | ---: | ---: | ---: |
| Current | 4,240 | 79.61% | 151/160 | 15,517 |
| Tighter distance | 15,359 | 26.15% | 142/160 | 4,886 |
| Source contrast | 19,107 | 8.13% | 89/160 | 1,561 |
| Same-source-color agreement | 18,620 | 10.47% | 80/160 | 1,991 |
| Error-limited | 15,464 | 25.65% | 140/160 | 4,784 |
| Combined | 20,165 | 3.04% | 26/160 | 570 |

Error-limited is preferable to tighter distance for further study because it vetoes
expensive palette changes directly and visibly retains sampled contrast details.
It is not a claim that every one of its 4,784 changes is desirable.

For the 16 GIFs: baseline 78,001 singletons; current leaves 76,715, tighter distance
77,694, source contrast 77,928, source agreement 78,001, error-limited 77,821 and
combined 78,001. Error-limited changes only 156 frame-pixels; current changes 1,181.
Whole-clip conservatism sharply limits usefulness on these moving animations.

## Exact points and limitations

All coordinates are zero-based. The error-limited candidate retains nearest's output
at all 48 highlighted ear/sword/metal/roof probes across the eight configurations.
This is point-specific evidence, not validation of every detail in those images.
With PICO-8/RGB the ears are already gray in nearest; retaining the baseline does not
restore green. With a small subset, a desirable color may already be unavailable.

| Image / point | Source | PICO-8/Oklab nearest → current | Error-limited |
| --- | --- | --- | --- |
| `s121` ears (16,11), (31,11), (16,13) | `#698059` | `#008751` → `#5f574f` | Retains green |
| `s025` accent (27,24) | `#fcfefe` | `#fff1e8` → `#ffccaa` | Retains near-white |
| `s093` glint (13,4) | `#525964` | `#5f574f` → `#1d2b53` | Retains gray |
| `s113` roof (61,45) | `#000000` | `#000000` → `#1d2b53` | Retains black |
| Original sprite (26,22) | `#053452` | `#1d2b53` → `#000000` | Leaves the reported defect |
| Original sprite (18,25) | `#a7a4a0` | `#c2c3c7` → `#83769c` | Leaves the reported defect |

On the default original sprite, current changes 15 pixels; error-limited and combined
change zero. Source agreement changes two, fixing the dark point but retaining the
gray point. Original nearest has 19 singletons; current leaves one, error-limited 19.
Protecting those source differences also protects the noise the user wanted removed.

The independent source-agreement implementation matches the 160-case aggregate above.
For `s121` it reverts 11 of the 12 current changes and preserves all three green ear
points; for `s093` it reverts only three of 21 changes and still loses metal detail.
It also removes the constructed intentional blue eye and gray highlight.

Error-limited, tighter distance, source contrast and combined preserve those two
constructed details. However, all four retain all 56 known flat-noise defects in a
separate annotated control. Current and source agreement remove those 56 defects but
lose the intentional eye/highlight. Moving-noise controls remain unchanged under the
animation guard. Connected thin lines, checker texture and alpha boundaries survive.

### Counterexample to a detail-preservation guarantee

A constructed 9×9 image has a single deliberately annotated dot at (4,4), source
`#080c16`, on black. Nearest selects navy `#1d2b53`; current and error-limited both erase
it to black. Original squared error is 0.0235246; added error is 0.0011774, below the
rule's allowance of 0.0121623. The subagent independently confirmed this arithmetic.

Exactly the same bytes can instead be annotated as stray noise. Erasing the dot then
succeeds. No automatic rule can satisfy both contradictory intent annotations from
identical pixels alone. This establishes a limit, **not** a real-image failure rate.
An absolute error ceiling would bound individual added error, but cannot guarantee
protection of an intended detail arbitrarily close to a palette decision boundary.

The subagent also challenged the relative allowance under Max colors: a smaller subset
can increase nearest's error and therefore loosen the candidate's extra-error allowance.
The eight-configuration probes pass, but they do not remove that general risk. A
production design would need further cap/matching validation and bounded implementation.

## Research context and retained evidence

Edge-aware filtering is a relevant alternative, but source similarity is not artistic
intent. The [bilateral-filter computational photography reference](https://people.csail.mit.edu/fredo/comp-photo-book/05-edges-matter-02-bilateral-filtering.html)
explains filtering through spatial and intensity similarity. It is background, not
evidence that a filter will preserve these pixel-art accents. The
[IPOL video-denoising study](https://www.ipol.im/pub/art/2018/224/) uses optical-flow
motion compensation and patch grouping. We did not implement that heavier pipeline;
its mechanism differs from the current coordinate agreement guard.

Retained repository evidence:

- [Per-case measurements](2026-10-12-cleanup-safeguards-measurements.csv), with study,
  source ID, configuration, variant, singleton counts, changes and transition counts.
  `wrong` is populated only for constructed controls with explicit expected labels;
  corpus images and the supplied sprite have no ground-truth error score.
- [Eight-configuration pixel probes](2026-10-12-cleanup-safeguards-probes.json), including
  exact output colors and current-proposal gate measurements.

Local harnesses and all output images/GIFs are in `.tmp/cleanup-qa/candidates/`:
`experiment.mjs`, `rules.mjs`, `validate.mjs`, `confidence-counterexample.mjs`,
`render.py`, result/validation JSON, two full-image sheets and `compare.html`.
Independent challenge notes are in `.tmp/cleanup-qa/candidate-critic/`.
Open the comparison at `http://127.0.0.1:5260/.tmp/cleanup-qa/candidates/compare.html`
while the local server is running. These artifacts add no client JavaScript.

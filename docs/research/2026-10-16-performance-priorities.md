# Palette performance priorities — October 16, 2026

The broader performance review found no reason to change color-selection rules or
ship a speculative optimization. A bounded dither arithmetic cache was tested and
rejected because it slowed a supported large-palette workload. No production code
changed for this performance investigation. The earlier accepted per-image count
cache remains in place.

## Scope and methodology

The desktop harness runs the isolated committed `071ebd9` snapshot through an
owned sandbox-enabled Edge 155 process on port 5336. Root additionally tests the
actual Codex Browser; a separate agent owns the authorized USB Pixel 8 Pro.
Foreign zoom/navigation work is outside this review's production-edit ownership.

Three built-app workloads exercise twelve 24×24 sprites plus an animated GIF,
100 sprites, and one 1024×1024 high-entropy opaque image. Operations cover import,
RGB matching, ordered 4×4 dithering, an eight-color cap plus Cleanup, Original
comparison/return and settled idle. Each measured conversion requires a new
canvas publication and every image's exact-source count, then a quiet interval.
The GIF is deliberately scrolled into view: offscreen playback correctly pauses
and cannot publish its full-frame union until observed. Large cases assert the
actual canvas dimensions, preventing a small draft from passing as full source.

Main-thread CDP TaskDuration, ScriptDuration, layout/style, Long Tasks, rAF gaps
and canvas writes are recorded. These are bounded observations, not p95 product
budgets, battery measurements, entire-process memory limits or worker CPU totals.
The instrumentation itself requests rAF, so recorded idle CPU is not proof of
application background activity. Idle stills perform no new canvas publications;
normal GIF playback continues. Fixed quiet periods preclude interpreting entire
phase wall time as operation latency. MessageChannel conversion is seriously
under-counted by ScriptDuration; TaskDuration and profile attribution matter.

Exploratory receipts are retained but are not acceptance evidence. The first
desktop profile used first-paint readiness that could accept an intermediate
layout render. Native phone profiling exposed a more serious measurement trap:
Playwright file transport spends hundreds of milliseconds decoding base64 and
constructing a File in its injected utility script. The corrected v3 harness
prepares owned Files **before** timing; the measured phase starts at assignment
and the app's ordinary input-change handler. This measures application import,
not native file-picker UI. The early 383ms phone import task therefore cannot be
called an application decoding defect.

Phone DPR is 2.25. A 1024px source does not fit its 448 CSS-pixel portrait width;
the deliberately strict full-source-count gate correctly rejects that sampled
run. The corrected phone heavy fixture is 896×896, generated with the same seed.
No dimensions/count readiness assertion was weakened to make a sampled run pass.

## Verified desktop behavior

`bench/desktop-performance-review-2026-10-16/desktop-results-v3.json` has zero
runtime errors and no tasks above 50ms in any of its fourteen measured phases.
Typical 12-sprite/GIF operations maintain approximately 16.8ms p95 rAF gaps;
100-sprite import reaches a 33.3ms gap in this single desktop run. These are not
comparative improvement claims. The 100-image phone case remains heavier.

The exact 1MP image uses approximately 258ms renderer task CPU for import, 380ms
for RGB recoloring, 4,853ms for 4×4 dithering, and 2,164ms for cap-eight plus
Cleanup while dithering remains enabled. Work is spread over posted tasks: the
measured maximum rAF gap is about 17ms. High-entropy dithering has a real completion
time/CPU cost even when it does not freeze input. Real low-color pixel art often
benefits from the existing RGB-plan memo and exact-match paths; these deliberately
hostile high-entropy results should not be extrapolated to every sprite.

All four 1MP final canvas hashes match a separate Node execution of the committed
quantizer, selection and Cleanup core: nearest Oklab, nearest RGB, RGB dithering
and capped/Cleanup dithering. This catches stale settings, drafts and readiness
errors, but is not an independent proof of those algorithms' aesthetic accuracy.
The native device Save checks use an independently decoded scalar reference.

Final committed build `5a77313` additionally passes **10/10** actual built-app
acceptance groups with zero runtime errors. The runner verifies Mulfok 32,
Game Boy Green and Black & White labels, 20 used canonical Mulfok colors and
selection persistence, independent PNG/GIF counts and Reuse, 504 preserved
partial-alpha pixels, cap/matching/Cleanup/dither changes, empty outputs,
family changes, delayed and actually running full-source cancellation, and five
toolbar widths with zero overflow. The app index SHA256 is
`2dd2de7ccfc6167d939753b6b83867e2c3c079bc9bc57ba9511a79d0fe487a29`.
Receipts: `count-integration-results.json` in the desktop review bench directory.

The phone's full-canvas SHA initially differs in all four heavy phases. A separate
896×896 solid-color control proves Brave changes 228 readback bytes by ±1, so this
is an unsuitable fingerprinting-protected readback oracle, not evidence of a
render/export bug. The failed `output-validation-896.json` is retained and marked
invalid for that purpose. Native PNG downloads are decoded independently instead;
no protection is disabled and no app pixel algorithm is changed to fit readback.

## Final USB Android acceptance

The corrected runner passes all three workload groups on the unlocked Pixel 8
Pro with native Android orientation and no CDP viewport emulation. Portrait runs
the twelve-sprite/GIF and 896-square cases; real landscape runs the 100-still
wall. `workflow-final-results.json` records zero runtime errors and restores the
freshly captured `free` rotation policy, accelerometer=1 and user rotation=0.

| Phone workflow | Renderer task CPU | Largest task over 50ms |
|---|---:|---:|
| 100-still import | 464.5ms | 106ms |
| 100-still RGB change | 493.7ms | None in final run |
| 896-square import | 319.9ms | None |
| 896-square RGB change | 444.1ms | None |
| 896-square 4×4 dithering | 1,435.4ms | None |
| 896-square cap-eight plus Cleanup, dither on | 1,379.1ms | None |

The small sprite/GIF phases also show no tasks over 50ms. Typical p95 rAF gaps
are about 16.8ms; the 100-still import reaches a 108.3ms maximum gap and 66.7ms
p95, confirming it remains a genuine stress case. An earlier corrected repeated
wall run also recorded a roughly 50–54ms matching task; absence in the last run
does not mean the concern is solved. These are individual workload observations,
not paired improvement claims. Phone 896px and desktop 1024px cases have different
fixtures/display conditions and cannot establish a cross-device speed ranking.

Native Save closes the protected-readback gap: four independently Sharp-decoded
896×896 PNG downloads have exact pixel SHA matches to the separate Node reference
for Oklab nearest, RGB nearest, 4×4 dithering and cap-eight/Cleanup dithering.
Receipt: `bench/android-performance-review-2026-10-16/large-save/results.json`.
The same receipt includes the solid-color noise control. This validates app
import/export state against the reference core, not an independent proof that
every color-selection algorithm is optimal. Separately, final `5a77313` label,
Keep-alpha, canonical target-membership, wall-count and Reuse checks pass on the
phone with native downloads and the independent scalar nearest oracle.

Device tests pause when another authorized agent owns the phone and resume only
after root explicitly reacquires it. Final cleanup closes only owned pages,
removes owned downloads and restores captured test-origin storage/preferences.
No physical device remains claimed by this review.

## One bounded candidate, rejected

`dither-candidate.mjs` is a **test-only** transformation, not shipped source. It
memoizes the Oklab coordinates of repeated ordered palette-pair/weight mixtures
inside one conversion job. It preserves pair direction, Float64 values, arithmetic
and tie comparisons. It activates only after the existing RGB-plan memo bypasses
itself and the rendered job has at least 65,536 pixels. Up to 128 lazy pair tables
retain at most 204,800 numeric bytes at 8×8, excluding Map/object overhead. Tiny
wall sprites do not allocate it. This is a per-job limit, not a global heap bound.

The immutable original and candidate match across 5,308,416 compared pixels,
including 2/4/8/16/32/64/256-color palettes, both matching rules, 2×2/4×4/8×8,
strengths 0/1/20/50/100, Cut/Keep alpha boundaries and a 512→256 sampled source.
Async cancellation still reports AbortError. The original 72-case cohort also
checks used flags and transparency metadata. The nine extra boundary cases check
indices and preserved alpha. This is broad selected coverage, not every possible
combination. The cache's fixed-capacity fallback retains the original calculation.

Five warmed alternating desktop pairs initially showed a 6–10% kernel CPU benefit
with Resurrect 64. The challengers required a 256-color high-entropy worst case
before acceptance. There the same candidate makes Oklab 4×4 approximately
126.97→130.69ms and 8×8 125.16→129.44ms: about 2.9% and 3.4% slower, with all five
pairs worse in both cases. Broader concurrent-machine measurements also show
substantial noise in some other groups. A selective win does not establish a
safe general improvement. The candidate is rejected; no additional cache
architecture or benchmark-subset search is pursued in this review.

## Ranked remaining concerns

**Later user scope clarification:** practical support for 100 simultaneous images
is not a product goal. Keep that workload as diagnostic stress evidence, not a
release blocker or a planned optimization task. This does not introduce a hard
image-count limit. Prioritize ordinary sprites, realistic small batches,
individual sprite sheets and animations; investigate their costs only when a
representative workflow demonstrates a problem. The numbered findings below
retain the original review order rather than the revised product priority.

1. **Stress-only: very large walls on phones:** importing/recoloring 100 tiles still incurs
   browser layout/style/conversion costs and occasional long tasks. Per-key count
   caching fixed avoidable caption fanout, not the entire wall's cost. Any future
   incremental publication or visibility optimization must preserve Auto's
   captured shared-wall source, animation visibility, exact exports, keyboard
   actions and responsive sizing; it needs an isolated before/after reproduction.
2. **High-entropy full-source dithering:** ordered mixture search consumes much
   more CPU than nearest matching. The implementation already cooperates with
   input/rendering. The rejected arithmetic cache is not a fix; preserve exact
   output before considering another design in a separately scoped investigation.
3. **Transient large-input memory:** browser decoding, source/analysis arrays,
   Cleanup maps, optional Keep alpha, encoder output and overlapping export work
   lie outside the 8 MiB animation-index cache. Heap deltas cannot bound native
   or GPU memory. Adding broad raster caches would make this concern worse.
4. **Ordinary workflows:** retain current fast paths. Wall counts consume existing
   used flags, cache only current small metadata, and add no idle rescans. Off/All
   bypass optional stages. Offscreen animation pauses. Original/viewer return
   reuses unchanged completed conversions. Preserve these invariants when tuning.

No claim follows that all performance concerns are solved. Mac/iOS testing remains
outside available hardware. Native Android and Codex Browser results are recorded
by root/device reviewers alongside the final review report; consult those
receipts for the completed physical-device checks rather than exploratory files.

## Integration and review decision

The production changes from this request are label-only: `140a26c` formats
**Mulfok 32**, and `5a77313` formats **Game Boy Green / Black & White**. Every
palette value, saved ID, attribution, preset order and default remains intact.
The separate [palette recheck](2026-10-16-mulfok32-recheck.md) explains why the
32-color addition remains useful; no additional preset was added.

Root ran the full unit suite after the final casing edits: **969 passed, two
existing GC-dependent skips**. Root also used actual Codex Browser to inspect all
twelve names, selected counts and Reuse, desktop/portrait/landscape layouts, and
native Mulfok Save. Visible saved RGB and every alpha byte match the independently
validated reference; Reuse matches the download. Its receipts and screenshots are
in `bench/palette-recheck-2026-10-16/`. Worker browser inventory was unavailable,
so Root performed these checks while the device agent owned Android separately.

Root and both independent reviewers agree to keep the palette and naming fixes,
reject the performance cache, and retain the measured limitations above. The
review challenged transport overhead, incomplete conversion readiness, impossible
phone sampling dimensions, protected canvas readback, 256-color worst cases and
aggregate memory claims. No further production fix is justified by this bounded
investigation. All changes remain local; nothing is pushed or deployed.

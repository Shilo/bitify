# Palette handoff: independent implementation challenge

October 15, 2026. Review range: `f08d4d3f6e3df771d17524f00f1bba2e492c4ec0..543474d`.
This is one implementation reviewer’s bounded assessment, to be reconciled with the
separate service and research reviewers. No production source was edited by this reviewer.

## Round 1: implementation and output contracts

I read the repository rules, app behavior specification and performance contract,
enumerated the 36 changed production/test files, and inspected the production diffs
and affected kernels. No reproducible new production defect was established in this pass.
That is a finite review result, not a claim that arbitrary inputs or platforms are bug-free.

| Area and commits | Adversarial question | Finding |
|---|---|---|
| Full-palette dithering (`5124e77`, UI follow-up `e146f83`) | Does it introduce off-palette colors, change exact target entries, vary with sampled previews, cross animation frames, or alter Off? | The indexed output remains in the active prepared target. Exact RGB membership bypasses mixtures. Bayer rank uses original source x/y; no prior-frame error state exists. Four candidate ranking and three occupancies per pair are bounded heuristics, not globally optimal mixtures. Strength zero/Off preserve nearest conversion. |
| Alpha Keep (`ba357c3`) | Does Keep affect only export while generating/limiting/cleaning the wrong source pixels? Can GIF silently discard alpha? | `palette-state.js:48` uses cut1 for generation/subset/Cleanup eligibility and passes the independent Keep mode to quantization. Preview cache reserves the additional alpha byte. PNG switches to RGBA when needed (`save.js:116`); both GIF passes check alpha (`gif.js:129`) and refuse partial opacity. Alpha and palette RGB remain separate. |
| Count and reuse (`9ab4dcf`, `33dfb37`, `e5b5b5a`) | Does a thumbnail count stand in for full output, does animation count only one frame, or can a stale Auto result publish? | `collectPaletteUsage` uses full export conversion and unions frame metadata; Cleanup rebuilds used metadata. App keys counts by captured generated wall identity and immutable settings (`App.svelte:694`); cancellation and publication guards reject stale wall/settings/removal results. Reuse creates an unsaved editor draft; it does not silently modify a library record. |
| Lospec and presets (`a825fcb`, `884afbf`) | Can a URL become arbitrary fetch/link input; can cancellation overwrite a newer draft; do added presets change defaults? | Only canonical public Lospec palette references become fetch destinations. Credentials/referrer are omitted, redirects refused, body size/time bounded, UTF-8/schema checked. Owned operation identity guards late imports (`PaletteImport.svelte:89`). Stable preset IDs and defaults stay intact. Preset quality requires comparative service/art evaluation by the other reviewer; code membership alone cannot prove aesthetic superiority. |
| Forced-dark palette display (`e3710e4`) | Does the correction use mutated preview RGB as export input, obscure native hit targets, or scale with image pixels? | Paint-only 1px swatches and at-most-sixteen-sector 100px canvases derive from palette metadata. No readback feeds import/export. Decorative canvases are pointer-inert; underlying 44px native controls remain actionable. |
| Native PNG import (`d37d8b7`) | Does native copying bypass required profile conversion or ignore presentation transforms? | Raw packed copying is gated by explicit full-range RGB/bt709/sRGB transfer metadata (`image-decode.js:5`). BGRA swaps only channel order; requested packed layout is verified. Unknown/non-sRGB metadata takes explicit managed conversion; transforms and unsupported native decoding retain the previous bitmap path. Existing fallback precision loss remains real (`image-decode.js:83`). |
| Clipboard failure ownership (`256ad1e`, guidance `55c32cc`) | Does rejection handling falsely report a successful copy or suppress the promise the clipboard must consume? | `copyOne` owns a possible orphan rejection while providing the original rejecting PNG promise to native ClipboardItem (`save.js:247`). Native translucent RGB rounding remains a platform transport limitation; exact PNG Save is the recommended boundary. |
| Auto and fallback investigations | Were rejected candidates secretly shipped? | No production direct-count Auto refinement, lock control, or WebGL decoder was added. The direct-fit/shared-palette regressions and measured cold GPU stall justify retaining the current implementation rather than forcing a feature to close a checklist. |

Shared limiter/Cleanup worker, cancellation, source snapshots, animation cache and
GIF export dependencies were checked where the new dither/alpha fields enter them.
The effective alpha eligibility reaches preparation jobs; output dither does not
change shared subset/Cleanup selection inputs. The frame cache includes both output
settings. Exports snapshot them independently of a later UI change.

## Fresh verification

- Nine targeted unit files: **130 tests passed** (dither kernel/settings snapshots,
  alpha, usage, Lospec, native decoder, PNG/GIF export, animation cache and Save).
- Physical USB Pixel 8 Pro, Brave: **20 dithering + 16 palette improvement phases
  passed** on the unmodified production build. [Dither receipt](../../bench/palette-handoff-implementation-review/android-dither.json),
  [palette receipt](../../bench/palette-handoff-implementation-review/android-improvements.json).
- Actual Android Save gestures produced owned Keep/Cut PNG downloads. Independent
  Sharp decoding checked all 768 alpha bytes and every visible RGB pixel: zero
  mismatches. Keep422B SHA `14d0012def2b51dbf17ce7e0022fb43d7cc2911209be1ed2b43bfe995c427691`;
  Cut213B SHA `90f8ad8434df0f4bbde30276102f63cfd25858b0655e377c7fe9744a97ef0e90`.
  [Native download receipt](../../bench/palette-handoff-implementation-review/android-native-save.json).
- Palette-image import of the owned saved PNG produced the eight expected RGBs,
  retained the typed name, wall and local library, and did not automatically save.
- A new foreground stress probe uses seeded high-entropy RGB, six alpha levels,
  eight/256-color targets, and full-strength 8×8 dithering. It checks every output
  alpha and index and measures posted-progress intervals, native long tasks and
  cancellation. [Reproducible probe and limitations](../../bench/palette-handoff-implementation-review/android-review.mjs),
  [measurements](../../bench/palette-handoff-implementation-review/android-performance.json).

The native Save receipt verifies production index SHA
`16d2776e085ab2d3907d055ccf5bd52e2fb20bdd089a7c0a87b2fc19cdb92837`
and decoder SHA `e1207e72ec51656ee6a0b516632599b60de0e510110fd319036203c9cefe15a9`.
The 36-phase harness intercepts output payloads; the separate native Save probe
reads only uniquely named files downloaded through actual app gestures. These are
different boundaries. No OS clipboard claim is made by the new tests.

| Foreground USB Android probe | Nearest | Full-strength 8×8 dither | Largest progress gap |
|---|---:|---:|---:|
| 256×256 high-entropy pixels, 8 target colors | 19.1 ms | 75.4 ms | 8.8 ms |
| 1024×1024 high-entropy pixels, 8 target colors | 118.4 ms | 1039.3 ms | 14.3 ms |
| 1024×1024 high-entropy pixels, 256 target colors | 560.5 ms | 2061.5 ms | 8.5 ms |

All 2,162,688 dithered samples passed index membership and source-alpha checks;
no >50 ms task began inside the recorded dither intervals. The probe posts a task
before its independent million-pixel validation so that oracle work is not
misattributed to the final conversion slice. The largest rAF gap over the entire
probe, including source creation and validation, was 50 ms; this is not a kernel-only
rendering metric. Cancellation after the first progress callback rejected with
AbortError in approximately 12.4 ms. These are individual local observations,
not percentile budgets or guarantees on slower phones.

## Remaining concerns to challenge in round 2

1. The bitmap/canvas fallback can round translucent RGB in browsers without a
   usable ImageDecoder. The rejected GPU helper improves precision but has a
   measured cold stall. Do not ship it without a separately demonstrated solution.
2. Full-strength high-entropy dithering costs substantially more total work than
   nearest matching, even though it yields. Explicit Count recomputes full output;
   repeated Count after settings changes can be costly. The current UI makes Count
   user-initiated and keeps dithering Off by default. A bounded responsive kernel
   test does not establish sustained large-wall throughput, GIF FPS or total heap.
3. Exact target membership and low average Oklab error cannot establish universal
   visual superiority over a service. Rare-color retention, structure, subjective
   sprite readability and mode-specific output fidelity need matched images and
   explicitly identical target/color budget settings. Review both favorable and
   unfavorable retained comparisons, not just the successful fixtures.
4. Smart colors (beta) remains research only. Nothing in this implementation
   review authorizes a service dependency, credentials in the browser, uploading
   user artwork, or an integration UI. The service reviewer must establish whether
   it is reachable through a supported website/API/MCP route; otherwise human
   Aseprite testing is a clearly deferred research step.

## Round 2: handoff use and final dispositions

I read the complete execution handoff at
`.claude/handoffs/2026-10-15-palette-pixellab-adversarial-review.md`, including its
research map, implementation ownership, live comparison protocol, Smart boundary,
two-round rules, matrix, environment and final deliverables. I used it to reconcile
this implementation audit with the service audit and retained fresh paired outputs.
No further device benchmark was repeated: round 1 established the current unchanged
build’s Android behavior, and no new failing source concern required another run.

| Finding or proposed action | Final reviewer disposition |
|---|---|
| Keep current dither/alpha/count/reuse/import/native-copy behavior | **Accepted.** The reviewed contracts, targeted tests, 36-phase actual app checks and native downloads support retaining the current implementation. No new reproducible production defect was established. |
| Change dithering default or algorithm from the armor result | **Rejected for this pass.** Fresh outputs differ at 48 visible pixels and favor the service’s point-error score on this tiny input. Native strength 5 and local 50 are not calibrated effects; all four target colors being used is not a hard requirement. Prior 20-strength detail improvement is evidence for a setting, not a universal adaptive rule. A broader held-out artist cohort would be needed for a different default or algorithm. |
| Treat service n_colors 14 versus local Count 2 as a local count defect | **Rejected.** The partial-alpha output has two visible RGB colors with multiple nonzero-alpha tuples. Fresh independent decoded alpha and visible RGB agree. Our target/count/reuse feature promises RGB entries, not RGBA combinations. |
| Reopen direct Auto fitting or ship GPU fallback to match a service feature | **Rejected.** The handoff retains real adverse exact/shared/detail examples and measured native stall. Better average error or exact input pixels alone does not meet the combined regression/performance gate. |
| Claim current local output is universally better or equally fast | **Rejected.** Fresh ramp point error favors the app; tiny armor favors the service. Node conversion/encoding timing and remote request latency are different workloads. The measured phone dither cost is substantial despite cooperative responsiveness. |
| Smart colors integration | **Deferred research only.** The reviewed public REST/MCP contracts and rejected field probe do not establish an existing-source Smart endpoint. A new-image Smart job cannot answer this question. If the website supplies no callable equivalent, the human extension experiment remains the owner and next evidence step; implement no integration. |
| Source-touching commit classification | **Accepted documentation correction, root owns.** `aa602f0` adds only `src/lib/palette-export.test.js`; there are 13 commits touching src, 12 affecting runtime. The handoff should not describe this test-only commit as production adjustments. |
| Service audit relative evidence links | **Fixed through service owner.** The first version used ../../../bench from docs/research. I challenged the broken navigation; the owner corrected to ../../bench and reran the offline verifier. |
| Mandatory repeat of a potentially billed human Smart operation | **Accepted handoff clarification, root owns.** Make repeatability testing conditional on acceptable cost/latency; otherwise label it untested. A mandatory repeat conflicts with the service audit’s bounded-cost instruction. |

The requested historical baseline `f08d4d3` and known pre-dither baseline `061c880`
have identical `src/` trees (`git diff --quiet ... -- src` returned 0). This confirms
the scope of the known baseline, without pretending the old harness was freshly run
under a different ref. The source-touching commit list and file inventory still need
their explicit runtime/test distinction.

Residual gaps are explicit: current authenticated website combinations belong to
the root/service coverage record; retained website outputs do not exhaust alpha,
animation or every setting. Sustained large-wall/GIF throughput, total native memory
and all cold/thermal device states are not established by my bounded kernel test.
Existing fallback and native clipboard translucent RGB rounding remain limitations.
Mac/iOS is unavailable and no setup action is requested. These boundaries do not
justify a speculative source fix or a third open-ended review round.

I agree with the final **no production change** disposition, the documented evidence
corrections, and explicit Smart/fallback/coverage deferrals. Agreement concerns these
reproducible results and decisions, not a universal certification of zero bugs.

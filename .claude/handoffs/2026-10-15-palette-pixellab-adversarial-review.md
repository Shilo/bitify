# Handoff: adversarial palette and color-reduction review

## Session Metadata

- Created: October 15, 2026, America/Los_Angeles.
- Project: C:/Programming_Files/Shilocity/colorfetti; branch main.
- Baseline, exclusive: f08d4d3f6e3df771d17524f00f1bba2e492c4ec0.
- Frozen implementation/evidence head: 543474d807b66c81b01230ed2d38d8c93d4a0dcd.
- Follow-up audit commits: 5d4763c corrects historical status; 4f3f9db retains the new independent audits and service/device evidence. The handoff/ledger is committed separately afterward.
- Also inspect all later commits and uncommitted work when resuming; this audit adds its own evidence. Do not assume this frozen head is still HEAD.
- Audience: Claude or another orchestrating coding agent. This is an execution handoff, not a claim that every future platform/service case has passed.

## Current State Summary

The user requests a bounded, skeptical re-audit of every palette/color-reduction change since the baseline, including the research that motivated changes, actual implementation, native image outputs, interface clarity and desktop/mobile performance. Re-find and challenge the spikes rather than relying on prior summaries. Compare actual PixelLab website, REST and MCP behavior with Colorfetti on the same owned inputs. Review the installed PixelLab Aseprite extension as another product surface. Correct concrete issues in small separate commits, with a maximum of two review/fix iterations. Smart colors (beta) is expressly research-only: investigate whether existing-source smart recoloring would justify an optional integration, but implement no integration.

There are 43 commits in the frozen range, 13 touching src/ (12 affecting runtime), 36 changed source/test files, 44 research documents and 1,444 benchmark/evidence files. The complete commit/file inventory is docs/research/2026-10-15-palette-audit-inventory.json. Most benchmark files are retained evidence, not code requiring one-by-one new paid requests. No runtime dependency change occurred in this range.

## Important Context

1. Read AGENTS.md, CLAUDE.md, docs/superpowers/specs/2026-10-06-colorfetti-app-design.md and docs/performance.md first. Preserve the browser-local recoloring product, intuitive interface and quality-over-quantity presets. An ambition to match or exceed PixelLab is an evaluation goal, not evidence of universal superiority.
2. Keep service evidence separate from neutral research spikes. The four designated neutral spikes must contain no PixelLab source excerpts, extension reference-file details, competitor URLs or backlinks to vendor evidence. Separate service comparison records may retain sanitized provenance and observed interface contracts. Do not copy proprietary implementation into the app or spikes.
3. The installed extension is at C:/Users/shilo/AppData/Roaming/Aseprite/extensions/pixellab. Its prior report identified version 0.4.130 but warned the local copy might contain edits. Verify current provenance; do not equate local static behavior with an unmodified published release or successful editor execution.
4. The app is still local-only. Do not add a cloud backend, expose a service credential to browser code, change deployment, push main or implement Smart integration under this request. Main pushes deploy automatically. Commit each justified fix separately; commit research/decision documents separately.
5. Mac/iOS cannot be tested and are outside this pass. Windows Playwright WebKit is useful engine coverage but is not actual Safari/iOS. Report available-platform findings without repeatedly making Apple access a required next action.
6. Native clipboard delivery and PNG Save are distinct. Clipboard RGB can round at partial alpha even when direct PNG bytes are exact. Automation-generated paste may be untrusted, and screenshots can replace the user's clipboard. Avoid another confusing human copy/paste loop; prior trusted-delivery limitations are documented.
7. Do not overwrite historical artifacts with current modules. Many runners write into fixed cohort directories, include source-hash gates or make paid service calls. Inspect before running; use a new audit output directory and preserve originals.

## Immediate Next Steps

1. Verify the baseline is an ancestor; capture current HEAD/status and read the inventory. Inspect every source-touching commit, including the test-only aa602f0. Include subsequent audit documentation fixes; the audit below has completed two rounds, so begin with its residual gaps rather than repeating it.
2. Read the exact neutral spikes below and their executable experiments, then separate historical pre-feature observations from current defects. Read latest decision/supersession documents before treating old recommendations as unfinished work.
3. Assign independent implementation, service/Smart and device/performance reviewers. Give each this entire handoff and narrow file ownership. They share a checkout: do not revert other work or close shared device browser sessions.
4. Run the first review matrix and fresh bounded live service comparisons. For each finding, retain input/settings, expected/actual output, source/build hashes, native artifact and reproducible steps. Reviewers must propose the smallest concrete fix or explain why no fix is supported.
5. Reconcile disagreements and implement only agreed reproducible fixes. Re-test affected behavior on desktop and physical Android, then perform the second/final challenge. Unresolved findings become explicit deferrals with an owner and missing evidence; do not start an endless third review cycle.
6. Update the checklist, two-round consensus ledger and Smart research decision. Report what changed, what was tested, costs, remaining limits and exact commits. Provide the user this handoff and the audit findings.

## Architecture Overview

Svelte 5, plain JavaScript, Vite, browser-only processing. App owns state and immutable source/settings snapshots; Tile and ImageViewer produce sampled previews, while exports convert full sources. Palette mode uses 1–256 unique opaque RGB targets. The separate 1-bit family uses two chosen inks, either optionally transparent. A two-color full palette is not automatically a 1-bit style.

Auto builds one shared palette from all wall assets/GIF frames, with equal nonempty asset mass and duration weighting inside GIFs. An explicit maximum selects a subset per asset; a GIF shares one duration-weighted subset across its frames. A shared target palette does not mean one shared capped subset across separate sprites. Exact target RGB membership is protected. Oklab nearest is default, with encoded RGB matching optional.

## Critical Files

| Files | Audit responsibility |
|---|---|
| src/App.svelte, src/Dock.svelte, src/Tile.svelte, src/ImageViewer.svelte | Snapshot ownership, settings commits, Count/Use, preview/export consistency, cancellation, dense mobile layouts and failure states. |
| src/PaletteImport.svelte, src/PalettePreview.svelte; src/app.css, src/canvas.css, src/full-palette.css, src/palette-import.css | Palette editing/import UX, native input hit targets and paint-only swatches under forced darkening. |
| src/lib/palette-dither.js, src/lib/palette-dither-settings.js, src/lib/quantize.js | Full-palette ordered dithering, exact colors, source phase, metrics, bounds and cooperative work. |
| src/lib/palette-alpha.js, src/lib/palette-state.js, src/lib/palette-animation-cache.js | Keep/Cut alpha, full-save snapshots, GIF semantics and shared cache budgets. |
| src/lib/palette-usage.js, src/lib/palette-preview.js | Full-output/all-frame used RGB counts, reuse drafts, cancellation and stale result prevention. |
| src/lib/palette-library.js, src/lib/palette-lospec-url.js, src/lib/palette-lospec.js | Preset definitions, distinctness, strict Lospec URLs, bounded fetching and local library semantics. |
| src/lib/image-decode.js, src/lib/save.js, src/lib/gif.js | Managed/native PNG precision, cancellation/resources, clipboard promise ownership and independent PNG/GIF/ZIP encoding. |
| Companion tests listed in the inventory | Challenge behavioral boundaries; a passing mock is not proof of real browser decoding, clipboard transport or GPU latency. |

Baseline limiter/Auto/Cleanup modules may need reading to understand integration, but do not incorrectly describe all pre-baseline code as newly implemented in this range.

## Files Modified

Read the inventory for the complete 36-file source diff and every commit. The source-touching commits are:

| Commit | Change |
|---|---|
| 5124e77 | Optional full-palette ordered dithering. |
| e146f83 | Dither strength wording and narrow-screen controls. |
| 884afbf | Exact Black & white and ENDESGA 8 presets. |
| 9ab4dcf | Explicit full-output used-color Count. |
| 33dfb37 | Use output colors as a palette draft. |
| a825fcb | Public Lospec URL import. |
| ba357c3 | Explicit Keep/Cut opacity. |
| aa602f0 | Test only: adds an atomic partial-alpha GIF/ZIP export regression in src/lib/palette-export.test.js; no runtime change. |
| e5b5b5a | Keep Count visible on dense phone walls. |
| e3710e4 | Canvas-painted palette previews under forced darkening. |
| 256ad1e | Handle later PNG rejection when clipboard setup fails. |
| 55c32cc | Conditional exact-PNG Save guidance in Help. |
| d37d8b7 | Copy proven native packed sRGB PNG bytes without redundant conversion. |

## Research Spikes and Provenance Map

### Original neutral spikes: re-find these exact files

- docs/research/palette-improvement-spikes-2026-10-14/01-full-palette-dithering.md
- docs/research/palette-improvement-spikes-2026-10-14/02-matching-and-low-color-fidelity.md
- docs/research/palette-improvement-spikes-2026-10-14/03-palette-workflows-and-presets.md
- docs/research/palette-improvement-spikes-2026-10-14/04-reduction-workflow-and-collection-budgets.md

Their experiments are bench/palette-algorithm-spikes/, bench/palette-preset-spike/ and bench/palette-collection-spike/. An initial fresh inventory found no prohibited vendor references in the four spikes. Generic Aseprite format/CLI documentation is interoperability evidence, not a PixelLab extension reference. Challenge the algorithms, cohorts, metrics, conclusions and historical status despite that clean provenance result.

### Later research: also audit rejected experiments

- docs/research/2026-10-14-curated-palette-selection.md and bench/palette-curation-spike/.
- docs/research/2026-10-14-auto-fitting-and-color-locks.md and bench/palette-fitting-spike/.
- docs/research/2026-10-15-auto-refinement-spike.md, docs/research/2026-10-15-auto-refinement-independent-review.md, docs/research/2026-10-15-auto-refinement-decision.md and docs/research/2026-10-15-auto-refinement-todo.md; bench/auto-refinement-spike/, bench/auto-refinement-device-review/ and bench/auto-refinement-comparison/.
- docs/research/2026-10-15-clipboard-checklist.md, docs/research/2026-10-15-clipboard-contract-review.md, docs/research/2026-10-15-clipboard-independent-review.md and docs/research/2026-10-15-clipboard-verification.md; bench/palette-clipboard-review/ and associated runners.
- docs/research/2026-10-15-png-import-precision-checklist.md, docs/research/2026-10-15-png-import-precision-verification.md, docs/research/2026-10-15-png-native-copy-implementation.md and docs/research/2026-10-15-png-precision-review.md; bench/png-import-precision-review/ and independent PNG corpus/validation runners.
- docs/research/2026-10-15-webkit-fallback-decision.md, docs/research/2026-10-15-webkit-fallback-adversarial.md, docs/research/2026-10-15-webkit-fallback-review.md and docs/research/2026-10-15-webkit-fallback-checklist.md; bench/webkit-fallback-candidate-proposal.md and candidate/review/validation evidence.

### Separate PixelLab evidence and outputs

Read all nine documents under docs/research/pixellab-review-2026-10-14/: api-mcp-evidence.md, extension-palette-evidence.md, website-evidence.md, coverage-closure.md, paired-comparison-plan.md, paired-output-comparison.md, direct-feature-comparison.md, web-paired-diagnostic.md and web-output-verification.md. Also read docs/research/2026-10-15-auto-refinement-service-comparison.md.

Retained raw schemas, sanitized requests/responses, native website downloads and paired outputs are under bench/palette-service-research/, bench/palette-paired-comparison/, bench/auto-refinement-comparison/ and bench/palette-workflow-review/. Do not mistake UI screenshots or documented options for verified generated outputs.

Explicitly inspect bench/palette-paired-comparison/armor-strength-sweep.mjs and bench/palette-paired-comparison/armor-strength-sweep-results.json. They challenge maximum/default dithering on the tiny armor; strength 20 preserves that particular highlight. One sprite does not justify changing default strength 50 or introducing an adaptive guard.

An initial audit independently compared all 388 tracked PNGs in the first three directories using Sharp and the legacy analysis reader: dimensions and every RGBA byte matched. This supports those actual retained files only. The shared custom reader in bench/palette-service-research/api-common.mjs is not a general PNG oracle: new outputs need independent Sharp/libpng validation, including CRC/format/alpha concerns rather than blindly extending that reader.

### Implementation, acceptance and supersession

Read docs/research/2026-10-14-full-palette-dithering-implementation.md, docs/research/2026-10-14-dithering-adversarial-review.md and docs/research/2026-10-14-dither-controls-clarity.md. Read docs/research/2026-10-14-palette-improvements-todo.md, docs/research/2026-10-14-palette-improvements-validation.md and docs/research/2026-10-14-palette-improvements-adversarial-review.md. Read docs/research/2026-10-15-palette-follow-up-checklist.md, docs/research/2026-10-15-palette-follow-up-verification.md, docs/research/2026-10-15-palette-follow-up-review.md and docs/research/2026-10-15-palette-remaining-audit.md.

The original plan/feature review are historical baselines. Website output was later verified with four native downloads in 5aa6418. Do not repeat the old blanket statement that website output is unverified. That closure does not verify every alpha/GIF/multi-source setting. The original nine-preset/no-dither/no-Count/no-Keep descriptions likewise do not describe current production.

## Decisions Made

| Current decision | What the reviewer must challenge and preserve unless new evidence justifies a change |
|---|---|
| Ordered full-palette dithering is Off by default | 2×2/4×4/8×8 source-pixel patterns, Dither strength 0–100 with remembered default 50; no 1×1 mixture. Test two-color targets as well as larger palettes, gradients and tiny detail. Existing 1-bit styles remain separate. |
| Eleven curated presets plus import | Quality/distinct roles over catalog size. Exact B&W and chromatic ENDESGA 8 were added; do not clone every PixelLab entry. |
| Count and reuse are explicit | Count full-resolution output, union GIF frames, exclude alpha-zero RGB; Use N output colors creates an unsaved draft. Available target count, maximum count and actual used count are different. |
| Keep is optional; Cut128 remains default | Keep retains original partial alpha and uses eligibility cut1. Partial-alpha GIF/atomic ZIP fails explicitly; no silent thresholding. |
| Direct-K Auto/refinement rejected | Mixed quality and shared/exact/rare-color regressions across retained cases; strict variants improve nothing at added cost. A new candidate needs a new hypothesis and held-out proof, not relaxed gates. |
| No additional locks/whole-set cap controls accepted | Target availability is not forced pixel mapping. Define conflicts, source/region scope, GIF/collection scope and snapshot behavior before suggesting implementation. |
| Guarded native PNG repair shipped | Only proven full-range packed RGBA/BGRA sRGB metadata permits raw channel copy. Other metadata uses managed conversion. BGRA swaps in place; profiles/transforms/cancellation/limits/resources stay authoritative. |
| WebGL fallback rejected | Native HTML-image texture readback is exact on supported tests, but final fresh Windows WebKit context creation blocks 139–141 ms on a tiny image. Streamed metadata fixes a research scanner cost, not the GPU stall. No production import of the candidate. |

## Live PixelLab Comparison Protocol

Official surfaces:

- https://www.pixellab.ai/create?tool=reduce_colors
- https://www.pixellab.ai/docs/tools/reduce-colors
- https://www.pixellab.ai/docs/options/color
- https://www.pixellab.ai/docs/options/dithering
- https://www.pixellab.ai/mcp
- https://api.pixellab.ai/mcp/docs
- https://api.pixellab.ai/v2/docs
- https://api.pixellab.ai/v2/llms.txt
- https://api.pixellab.ai/v2/openapi.json

Refresh schemas and actually execute bounded cases on each available surface. Record unavailable/auth-blocked combinations honestly. The example MCP setup is C:/Programming_Files/Shilocity/PixelLab/lexius-pixellab-skills/.codex/config.toml; inspect only needed connection metadata programmatically, never print credentials or complete config. PIXELLAB_SECRET is the credential variable; names only belong in artifacts. Never put its value in handoffs, client source, screenshots, logs or reports.

Use owned fixtures: tiny armor, native item sheet, grayscale and saturated ramps, exact palette members/near-neighbors, rare eye/highlight accents, partial alpha 0/1/64/127/128/192/254/255, binary alpha, two-frame unchanged/moving regions and related separate sprites. Add held-out fixtures to challenge overfitting. Record each PNG hash and independent decoded oracle.

Compare Auto-detection separately from explicit counts 2/4/8/16, fixed two/eight/larger palettes, extracted/custom presets, cap versus target size, Off/2×2/4×4/8×8 and strength sweeps, alpha, repeated determinism, frame/collection scope, palette-image/text/Lospec acquisition, output reuse and actual native downloads. Test valid and rejected combinations; do not silently substitute a supported setting and label it equivalent. Native service strength 5 and local 50 are not calibrated equals.

For every paired output record dimensions, alpha changes, visible RGB count, target violations, exact source-member retention, RGB/Oklab point error, justified fully-visible block tone error, rare-detail retention, unchanged-region frame churn, file size, service latency/failures and local kernel/end-to-end costs separately. Inspect native-size sprites and scaled nearest-neighbor views. Quantitative point error can favor the metric being optimized; block-tone wins can coexist with fragmented armor highlights. Neither proves semantic readability. Do not infer internal algorithms from appearance.

Keep server-returned n_colors separate from visible RGB usage: alpha variants may inflate that field. Metadata counts are not an independent image count. Network turnaround and local compute latency must not be mixed into one performance ranking. Record service balance before/after and actual reported cost; no repeated paid matrix just to increase case count. Fresh handoff audit is initially bounded to five tiny reducer operations plus a validation-only Smart probe; expand only for a concrete unresolved comparison.

## Smart colors (beta): Research Only

Goal: determine whether an optional PixelLab integration for smart recoloring of an existing sprite offers enough artist-visible value over local deterministic recoloring to merit a later product decision. This is NOT permission to implement cloud integration, add credentials/UI, or change the app's local-only contract.

Important false-equivalence trap: bench/palette-service-research/api-smart.mjs used generate-image-v2 to generate a NEW 192×192 adventurer with smart:true, PICO-8/max8 and a fixed seed. Its ten-generation result and separate USD field do not validate the extension's existing-image recoloring. No premapped intermediate or same-input non-Smart comparator was returned. Do not repeat that expensive generation and call it a recoloring test.

The fresh public reducer schema has images/count or palette image/dither/strength, but no Smart field. The installed extension exposes a separate existing-image Smart choice with one-frame/no-dither restrictions. A fresh public reducer request containing target_palette was rejected with 422 extra_forbidden: that tests the unsupported extra field, not Smart quality. The missing public Smart exposure conclusion additionally relies on current REST schema and MCP listings. Verify official REST/MCP/website support for an equivalent operation. A private extension transport observation is not an invitation to reimplement an undocumented protocol.

If an officially callable equivalent is available, test the SAME original image and target with Smart Off/On, retained settings and repeated outputs. Evaluate material/semantic color assignment, exact target membership, alpha, dimensions, outlines/rare accents, repeatability, cost, latency, errors and licensing/account constraints. Determine whether outputs preserve geometry and animation requirements. Distinguish server capability from a sensible integration architecture and UX.

If no equivalent public surface is callable, label existing-image Smart **human-deferred**, not tested or disproven. Give the human an Aseprite procedure: duplicate an owned sprite/document; keep source and palette fixed; run ordinary reduction and Smart separately on one identical frame with dither Off; export native PNGs without scaling; record extension version, target swatches, all controls, alpha, elapsed time and any cost/errors. Repeat Smart only if cost and latency are acceptable; otherwise explicitly mark repeatability untested. Independently compare exported files afterward. Do not edit the installed extension or require it to submit user art. A human-only extension test is an acceptable explicit research outcome.

The final spike must answer: added semantic benefit on held-out sprites, regressions/limits, operational cost and latency, public API feasibility, and recommend integrate later / do not integrate / insufficient evidence. Any future integration requires a separate explicit implementation decision and secure architecture. Preserve provenance in the vendor audit; any neutral follow-on spike stays self-contained without vendor source details.

## Two-Round Review, Fix and Consensus Rules

Round 1: research reviewer checks provenance/methodology/supersession; implementation reviewer maps all source commits and independently reproduces issues; service reviewer checks live matched outputs; device/performance reviewer checks real desktop/phone behavior. Each finding needs severity, exact file/line or service settings, reproduction, expected/actual result, minimal proposed fix, tests and material tradeoff. Evidence gaps are labeled gaps, not invented bugs.

The orchestrator circulates findings to the other reviewers. Challenge metric bias, fixture selection, a test that mirrors implementation, semantic changes, hidden memory/cache costs, false native clipboard claims and unsupported superiority claims. Record accepted/rejected/deferred decisions with rationale. Assign non-overlapping fix ownership. Avoid broad speculative refactors, extra toggles, catalog inflation or algorithm changes without proven gains.

Round 2: independent reviewers challenge fixes and rerun relevant regressions, native downloads and desktop/mobile performance. Resolve findings through concrete small corrections. Every reviewer must state agreement with the final disposition, not falsely certify universal absence of bugs. If a finding cannot safely converge after this round, keep working code or revert the candidate and record the exact remaining risk, missing evidence, owner and next action. Do not force agreement by weakening tests or start endless review loops.

The final ledger must show each finding, first evidence, reviewer challenge, fix commit or no-fix/defer rationale, second-round result and consensus. A completed no-ship experiment is a valid result; it is not an unfinished feature to add.

## Required Test Matrix and Performance Gates

- Unit tests appropriate to the changed logic, then full suite/build for actual production fixes; preserve existing GC skips and distinguish harness/sandbox failures from app bugs.
- Built browser regression against an explicit pre-feature baseline. Do not leave BASE_REF default HEAD after a feature commit. For all palette changes, use f08d4d3f6e3df771d17524f00f1bba2e492c4ec0 as the historical comparison and verify harness compatibility; 061c880 is the known pre-dither feature baseline used by prior tests. Do not silently change the claimed baseline if the older harness cannot run.
- An independent reviewer verified that f08d4d3 and 061c880 have identical src/ trees. This establishes source-baseline equivalence; it does not claim a fresh harness execution under a different ref.
- Codex Browser actual app interactions and native PNG downloads; USB Android/Brave actual app interactions and native Download file bytes; palette-image extraction/Count/Use drafts; settings persistence/reset, source/family changes and cancellation; 320×568/568×320 layout plus actual phone. Do not replace the physical phone with emulation.
- Target membership, exact source matches, alpha per pixel, two-color and larger palettes, 0-strength=Off, dither source phase under sampling/resize, Cleanup, cap, animation temporal agreement, GIF timing/loop, PNG/GIF/ZIP export and preview agreement.
- Worker absence/failure, stale-result cancellation, import pixel/byte limits, malformed profile/format cases, decoder/canvas resource release and source transforms. Keep source decode, conversion, PNG encoding and native clipboard transport independently observable.
- Performance: tiny sprites and 256²/high-entropy 1 Mi-pixel inputs; 8/64/256-color targets; nearest versus dithering; Keep/Cut; cold/warm import and first usable preview; repeated source/settings changes, cancel latency and bounded multi-frame workloads. Record progress/rAF gaps/long tasks where supported, memory scope and source hashes. Run timing cohorts sequentially on the phone. Throughput is not FPS; JS heap is not whole native/GPU memory. A posted wrapper cannot remove a native synchronous stall.
- Ship algorithm changes only if held-out outputs improve under relevant visual/semantic criteria without regressions in exact colors, alpha, detail, animation, responsiveness, snapshots or workflow. If tradeoffs remain, recommend no-ship or a separately justified scope; do not claim the app is universally better than a remote service.

## Environment State

Windows PowerShell. Node v25/runtime packages are available under C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules, including Playwright 1.62.1 and Sharp 0.35.5. Bundled Python is C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe; the Windows python alias may be unusable.

ADB is C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe. Last authorized device was Pixel 8 Pro, serial 37211FDJG00267, Android 17/Brave; recheck connection/unlock. CDP forward was localhost:9333. Connect to the existing device browser, close only owned pages and disconnect without browser.close(). Read only task-owned Download filenames. Do not dump unrelated device/browser content.

Existing servers may be alive: 5294 palette QA (/qa and /improvements, /perf), 5295 paired output gallery, 5297 clipboard test/app, 5298 native decoder controls, 5300 independent PNG corpus, 5301 Vite preview, 5303 research-only fallback controls. Verify process and build hashes before using them; do not reload or close the user's existing app tabs. Never run the research fallback as production by mistake.

Known shipping build index SHA256 is 16d2776e085ab2d3907d055ccf5bd52e2fb20bdd089a7c0a87b2fc19cdb92837; native decoder SHA256 is e1207e72ec51656ee6a0b516632599b60de0e510110fd319036203c9cefe15a9. These identify historical bytes, not a requirement to ignore newer changes. Actual Keep native PNG golden is 422 bytes, SHA256 14d0012def2b51dbf17ce7e0022fb43d7cc2911209be1ed2b43bfe995c427691; Cut golden is 213 bytes.

Windows WebKit build2336 is already installed under C:/Users/shilo/AppData/Local/ms-playwright. Set process-only PLAYWRIGHT_BROWSERS_PATH before importing Playwright; do not auto-install a duplicate or call it Safari. All automated Chromium/Edge launches must explicitly preserve Chromium sandboxing; never use --no-sandbox. Google may reject automated sign-in; earlier PixelLab access used the user's email magic link in a sandboxed browser. Do not repeat authentication attempts blindly. Current fresh Codex Browser access may be signed out; ask for targeted human sign-in only if an authenticated live case is essential and no authorized session is reusable.

For Vitest on this Windows sandbox, set TEMP and TMP to a task-owned workspace .tmp directory before npm test if the default temp path causes EPERM. Native browser launches and git index writes may require the tool's normal escalation mechanism. Do not weaken browser security as a workaround.

## Assumptions Made

Previously retained metrics and passing tests are evidence to reproduce or challenge, not unquestionable truth. The app and local extension may evolve after the frozen head. A surface absent from the current public schema is not proof that a private/editor workflow does not exist. No credential, runtime session, device unlock, service billing rule or localhost server is assumed permanently available.

## Potential Gotchas

The website PICO-8 cap8/None versus All/4×4 comparison changes two controls; it does not isolate dithering. A native strength value is not normalized effect. Annotated palette swatch sheets contain label/background colors; import explicit RGB text or a clean strip. Source alpha can differ before quantization. Hidden alpha-zero RGB is excluded from visible error, but all alpha bytes are checked. Count per image is not a collection-wide cap. New source/shared Auto identity must invalidate old results. Outside clicks dismiss an open panel before Save; that is intended, not a failed download. Forced-dark CSS appearance must not mutate palette values. Avoid generated public asset duplication in research Vite builds: configFile:false and publicDir:false; commit only owned fixtures and immutable evidence, not regenerable multi-megabyte stress inputs.

## Completed Two-Round Audit and Pending Work

The handoff-producing audit completed two rounds with three sub-agents. All three read this full handoff and used it to challenge implementation, research and service findings. No reproducible new production bug or safe algorithm improvement was established, so no runtime code was changed. Historical status/supersession and evidence links were corrected. Read docs/research/2026-10-15-palette-handoff-audit-ledger.md, docs/research/2026-10-15-palette-handoff-implementation-audit.md and docs/research/2026-10-15-palette-handoff-service-audit.md before starting another sweep.

Fresh evidence: 130 targeted unit tests passed; physical Android passed 20 dither + 16 palette phases, actual Keep/Cut native PNG downloads and eight-color palette extraction. Codex Browser passed the same 36 phases plus 30 desktop performance cases. Dither correctness/membership/alpha and yielding pass within the recorded workloads, but 1 Mi-pixel full-strength phone dithering costs about 1.04 seconds with eight targets and 2.06 seconds with 256; it is responsive cooperative work, not instantaneous output. Sustained wall/GIF/thermal/whole-memory coverage remains bounded.

Four fresh REST reductions and one actual MCP reduction completed for 0.5 subscription generations total, with independent Sharp verification and unfavorable armor evidence retained. Do not rerun the paid matrix. Fresh Codex Browser website access reached sign-in; no new authenticated website output is claimed in this audit. Four previously verified native website outputs remain valid for their exact settings. A broader current website cohort needs a usable authorized session. Existing-source Smart remains human-deferred unless such a supported public surface is found.

Credential incident: a reviewer accidentally printed the extension package.json manifest containing its secret field into tool output. A value-only check confirmed it matches the active PixelLab credential. The value was not copied into the handoff/reports/artifacts; exact-value scans found zero matches. The user was notified to rotate the exposed credential. Do not dump complete extension manifests/configs, repeat the value or make further authenticated calls until credential rotation is handled by the user. This incident is separate from the app/runtime audit and is an outstanding human action.

Deliver: complete commit/file audit coverage; research provenance/supersession findings; service feature/setting/output matrix; independently decoded paired artifacts and visual tradeoffs; desktop/physical-phone correctness/performance receipts; a bounded two-round consensus ledger; separately committed minimal fixes if justified; Smart existing-image feasibility spike and human procedure if deferred; prioritized remaining work without universal superiority claims.

## Related Resources

- docs/research/2026-10-15-palette-audit-inventory.json: complete frozen range inventory.
- docs/research/2026-10-15-palette-remaining-audit.md: prior accepted/rejected/deferred distinction.
- docs/research/2026-10-15-webkit-fallback-decision.md: latest no-ship fallback result.
- docs/research/2026-10-14-palette-research-plan.md: original workstreams and separation rule; historical statuses need supersession.
- bench/palette-qa.mjs and bench/palette-dither-qa-server.mjs: built acceptance entry points; inspect fixed output paths before running.

Handoff validation completed: skill completeness score 100/100, 72 explicit relative file references found with none missing, and an expanded exact-value scan of 58 owned files found zero credential matches. The value itself and any fingerprint are absent from the receipt. Use the session-handoff validator with bundled Python for later edits; never include credential values or signed URLs. All three reviewers received this full file before final reconciliation.

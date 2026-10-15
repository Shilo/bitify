# Palette improvements — working checklist

## Current session status — October 15, 2026

All accepted implementation items are complete within their recorded test scope.
Later fixes include native clipboard promise ownership, PNG import precision,
Firefox partial-alpha decoding and Lospec paste routing. No newly reproduced
unfixed release-blocking defect remains in the reviewed scope. This is not a
claim of exhaustive coverage or universal output superiority over PixelLab.

The [Keep real-art study](2026-10-15-keep-real-art-decision.md) and
[important-color study](2026-10-15-important-colors-decision.md) are complete
no-ship decisions. Direct-K/guarded Auto fitting is also closed. These are not
unfinished implementation tasks, and Keep weighting must not be restarted.

| Remaining item | Meaning / next action |
|---|---|
| Existing-image Smart colors | Human Aseprite comparison remains untested. Follow the retained [procedure](2026-10-15-claude-audit-service.md#7-smart-colors-beta-research-decision) before deciding whether integration is useful. No integration is approved. |
| Focused website comparison | Complete for the targeted gaps: fresh native partial-alpha reduction, imported target and two-image shared sheet. The [completion report](2026-10-15-palette-completion-service.md) distinguishes website/REST results and remaining untested combinations. |
| Practical task usability | Agent walkthroughs passed in Codex Browser and touch-emulated portrait/landscape, including native Save and Count/Use. No physical phone was used in the latest pass, per the user. Human task observation remains useful; automated checks cannot prove intuitiveness. |
| Optional capability design | [Color-protection mockups](2026-10-15-color-protection-design.md) are ready for user review, implementation deferred. Auto support and inactive mappings remain unresolved. A shared batch subset and additional exchange formats remain optional opportunities. |
| Known precision/performance limits | Canvas-fallback and native clipboard transport can round translucent RGB. Sustained thermal/whole-process memory and stock Firefox Android coverage remain limited. Mac/iOS is unavailable and outside the current pass. |
| Release | Changes remain local and unpushed by this session. A release/deployment is a separate action. |

Evaluate features against Colorfetti's own goals: useful output control, accurate
palette/alpha behavior, animation consistency, performance and an intuitive local
workflow. The service is comparison evidence, not a perfect reference. In tested
cases it loses useful colors and changes exact source RGBs too; adding its whole
catalog or every control is not a requirement. Local shared-target membership,
exact-color behavior and cap-plus-dithering are strengths to preserve.

The original batch record follows; its historical test totals and then-pending
items must be read with the completed follow-ups above.

The [latest completion ledger](2026-10-15-palette-completion-ledger.md) records the
two-round independent full-range audit, fresh native website comparisons,
930 passing units, built regressions, desktop timing and unchanged known Firefox
precision failures. Production source remains unchanged since `310df63`.

This temporary checklist tracks the requested improvements, their evidence and release checks. Preserve Colorfetti’s direct, local workflow and existing defaults. A completed experiment can reject a feature; a larger menu is not the goal. Each accepted feature receives its own commit and independent review before this batch is complete.

| Work | Status | Acceptance or decision gate |
|---|---|---|
| Compare public PixelLab palette catalog with ours | Complete | [Selection study](2026-10-14-curated-palette-selection.md) compares all seventeen public choices by useful role, canonical sources and overlap; 64 local output conversions include real sprites. No vendor implementation references. |
| Black & white and ENDESGA 8 | Implemented and reviewed; both devices passed | Exact published colors and preserved defaults. Study records neutral-armor counterexample; optional targets, no matching/default changes. |
| Lospec link import | Implemented and reviewed; real import passed on both devices | Existing Paste workflow, review before Save, safe persisted credit. Live testing caught and fixed Lospec's octet-stream MIME; schema/size/time bounds retained. Independent held-response/cancel/reopen tests pass. |
| Used-color feedback | Implemented and reviewed; both devices passed | Explicit full-output Count, including every GIF frame. Tested seven-color count agrees with independently decoded GIF union; stale Auto/Reset/family/removal tests pass. Tiny metadata only. |
| Reuse/export used palette | Implemented and reviewed; both devices passed | Use N output colors opens a new editor draft. Swatches, HEX backup, local Save and restored selection match the decoded output colors. Zero colors disables reuse. |
| Quick 2/4/8/16 limits | Evaluated; permanent row deferred | [Decision](2026-10-14-auto-fitting-and-color-locks.md): existing integer field already handles these budgets. Extra mobile controls have no demonstrated benefit yet. |
| Keep / Cut opacity | Implemented and reviewed; both devices and native Android download passed | Cut128 unchanged; Keep preserves original alpha through preview and PNG payloads. Downloaded phone PNG independently decodes alpha 0/127/128/255. Unexpected partial GIF and partial ZIP fail atomically. |
| Color fidelity under forced browser darkening | Implemented; phone and independent forced-dark checks passed | Paint-only canvas preserves twelve phone swatches and sixteen inner pie probes exactly. Independent Edge checks sixteen solids, thirty-two pie probes and native input hit/value updates. Rejected SVG before committing; no browser preferences or conversion changes. |
| Auto fitted directly to requested count | Evaluated; not adopted | [Direct fitting](2026-10-14-auto-fitting-and-color-locks.md) regresses four of twenty comparable cases. The completed [176-observation guarded follow-up](2026-10-15-auto-refinement-decision.md) also fails the shipping gate; strict variants retain the current outputs. This is a completed rejection decision, not an unfinished implementation. |
| Color locks | Experiment complete; production change deferred | Exact red-eye retention costs average error; a locked red entry does not recolor a muted eye automatically. Need explicit availability-versus-pixel behavior and count-conflict design. |
| Independent challenge | Complete within recorded scope | Auto count identity, detached-cutoff gestures and dense-wall count visibility were fixed. Nine native-browser phases pass, including portrait/landscape and nine counted tiles. [Review](2026-10-14-palette-improvements-adversarial-review.md). No outstanding actionable finding in this scope. |
| Regression and device verification | Complete within recorded scope | 59 unit files, 910 passed / 2 existing skips; build; 132 legacy + 11 full + 11 RGB baseline cases and 13 integration groups. Final build passes 15 phases each in Codex Browser and USB Android, plus responsive checks at 320×568 and 568×320. [Validation](2026-10-14-palette-improvements-validation.md) states exact coverage and limits. |

The successful [website output verification](pixellab-review-2026-10-14/web-output-verification.md) supersedes earlier website-output uncertainty: four native website PNGs were downloaded and analyzed. It does not establish every service option or universal quality superiority. The palette-selection and fitting spikes cover public choices and product behavior without vendor source-code or extension-file references.

## Commit and testing record

- Baseline before this batch: `5aa6418`. Existing full-palette dithering is off by default; its separate controls and existing 1-bit styles remain intact.
- `10c124c`: initial working checklist.
- `884afbf`: two distinct compact presets and public-catalog comparison.
- `9ab4dcf`: full-source used-color inspection.
- `33dfb37`: output-palette reuse in the existing editor.
- `a825fcb`: Lospec links, including the live-response MIME correction.
- `ba357c3`: original PNG opacity preservation, default Cut retained.
- `cef6538`: compact fitting, wall-scope and color-lock experiments with deferred decisions.
- `aa602f0`: common device acceptance, native phone download and partial-alpha ZIP failure regression.
- `e5b5b5a`: count-first captions after independent dense-phone usability challenge.
- `e3710e4`: color-critical palette canvases after physical-phone and independent forced-dark challenge.
- Retained device evidence: [Codex results](../../bench/palette-improvements-review/codex-results.json), [USB Android results](../../bench/palette-improvements-review/android-results.json), [actual phone download](../../bench/palette-improvements-review/android-native-save.json). Clipboard acceptance inspects the encoded payload, not OS clipboard readback. Safari remains untested.
- No push or deployment performed.

## Recommended next work

The authorized guarded-refinement investigation is now complete. Its
[follow-up checklist](2026-10-15-auto-refinement-todo.md) records the research,
service comparison and device tests. The tested candidates did not justify a
production change; the [decision](2026-10-15-auto-refinement-decision.md) closes
that proposal rather than leaving it as unperformed work.

All authorized implementation and research items above are complete within their
recorded scope. The [fresh follow-up checklist](2026-10-15-palette-follow-up-checklist.md)
tracks the requested additional review and desktop/physical-phone verification.
Retain the current Auto algorithm. Color locks require a clear distinction between
retaining a target entry and forcing a source region to use it, including cap
conflicts; they remain a deferred design question, not an approved control.
More presets or a permanent quick-budget row require a demonstrated missing
workflow. Safari/iOS and OS clipboard readback remain platform coverage gaps.

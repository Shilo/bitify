# Palette usability batch — October 16, 2026

Baseline: `d91d9d10a0ac4494c54340ac688243368b8b28f4`. User-requested changes;
no deployment or changes to existing color-matching algorithms are authorized by
this batch. Each feature is reviewed and committed separately. This checklist is
updated as evidence arrives; unchecked items are not claims of completion.

## Work and ownership

| Item | Owner | Status / acceptance |
|---|---|---|
| 1. Defer artist-controlled protection; retain research and mockups | Root | Complete: explicitly deferred; original mockups/research and the complete screenshot gallery are versioned. No implementation. |
| 2. Single Reuse colors action beside Copy; useful noninteractive output counts | Root | Complete: user clarified wall-only Reuse after Copy; no Preview button. Plain wall counts reuse exact-size render metadata, union all GIF frames; sampled wall starts no extra counting. Final desktop 10/10 and Android 3/3 follow-up pass. |
| 3. Distinct, popular additional 32-color preset and within-size ordering | Research agent | Complete: mulfok32 follows ENDESGA 32; primary download evidence, 16 outputs and canonical values independently reviewed. Auto, existing colors/defaults and count groups retained. |
| 4. Concise Paste colors hint | Dialog/drag agent | Complete: requested concise hint; live desktop/phone import checked. |
| 5. Dragging from within a modal must not dismiss it | Dialog/drag agent | Complete: matching outside start/end, cancellation and mouse/touch capture checked; 11 browser checks and 50 focused tests. |
| 6. Palette-name link beside the color count | Dialog/drag agent | Complete: one published-palette-name link beside count, preserved through local rename; creator metadata retained. |
| 7. Suppress internal drags as incoming drops | Dialog/drag agent | Complete: internal ownership suppresses overlay/import; external files and trusted desktop exported-file drag checked. Phone URL-drag payload is synthetic. |
| 8. Automatic maximum-color choice | Research agent | **Research only, explicitly confirmed by user.** No setting or algorithm ships. Distinguish automatic palette generation from automatic budget selection. |
| 9. Compact responsive Recolor controls | Compact settings agent | Complete: compact portrait/short-landscape chips, desktop rows; 10 viewports, seven interaction flows and Android checks. Follow-up closes genuine OS landscape coverage in both directions; see linked report. |

## Review and validation gates

- [x] Capture/reproduce relevant old behavior before each fix.
- [x] Independent challenge of implementation and evidence; bounded review rounds,
  with concrete defects fixed and rechecked rather than unsupported consensus.
- [x] Full unit suite and production build after integration.
- [x] Actual Codex Browser interaction at desktop and narrow viewport.
- [x] USB Pixel 8 Pro interaction, portrait and genuine Android OS landscape in both directions, native screenshots and bounded performance evidence.
- [x] Follow-up metadata overhead A/B; independently reviewed stable-slot cache improvement, current-build desktop/Codex Browser/Android revalidation.
- [x] Output reuse compared with independently decoded native PNGs and all-frame
  GIF union; transparency, settings invalidation and cancellation covered.
- [x] External drops, internal text/sliders and export-out drag regressions covered.
- [x] Specs, user documentation and this checklist agree with shipped behavior.
- [x] Separate feature commits; no push (main pushes deploy).

## Decisions and constraints

The existing Keep weighting, Auto fitting and automatic accent-selection no-ship
decisions stand. Color protection stays deferred even though mockups exist.
Any new concern requiring a product choice is put to the user before implementing
the related behavior. ADB initially could not see USB inside the sandbox; an
authorized host check detected the Pixel 8 Pro. Browser automation must keep the
Chromium sandbox enabled. No Mac/iOS validation is available.

## Final evidence and remaining limits

See [the validation report](2026-10-16-palette-usability-validation.md) for separate
commits, review findings, build isolation and retained test receipts. This checklist
is complete for the authorized batch; it does not claim universal absence of bugs.
The [native-landscape and count follow-up](2026-10-16-landscape-and-count-review.md)
closes Android OS-rotation acceptance and records the cache improvement. Mac/iOS
remain untested. Tiny captions can truncate with settings open in very short
landscape, as they did before this batch; closing settings restores the tested count.
Counts can remain absent on sampled walls until full-source inspection completes.
The original palette-only build excluded concurrent zoom/navigation edits. The
follow-up integrated their committed version while preserving/excluding later
uncommitted changes. Large walls still have import/layout stalls. No changes were pushed.

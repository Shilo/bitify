# Palette usability batch — October 16, 2026

Baseline: `d91d9d10a0ac4494c54340ac688243368b8b28f4`. User-requested changes;
no deployment or changes to existing color-matching algorithms are authorized by
this batch. Each feature is reviewed and committed separately. This checklist is
updated as evidence arrives; unchecked items are not claims of completion.

## Work and ownership

| Item | Owner | Status / acceptance |
|---|---|---|
| 1. Defer artist-controlled protection; retain research and mockups | Root | Deferred explicitly; original mockups and research already tracked. Retain review gallery too. No implementation. |
| 2. Single Reuse colors action beside Copy; useful noninteractive output counts | Root | Investigating exact full-source counts, cancellation and cost before choosing wall scheduling. No sampled count may be described as exact output. |
| 3. Distinct, popular additional 32-color preset and within-size ordering | Research agent | Compare primary popularity evidence and actual colors; challenge before adding. Auto remains first, descending count groups. |
| 4. Concise Paste colors hint | Dialog/drag agent | Use exactly “Paste HEX colors or a Lospec palette link.” |
| 5. Dragging from within a modal must not dismiss it | Dialog/drag agent | Require matching outside start/end; preserve genuine backdrop dismissal, Escape and focus. |
| 6. Palette-name link beside the color count | Dialog/drag agent | User confirmed palette name, linked to its Lospec page; preserve stored source metadata. |
| 7. Suppress internal drags as incoming drops | Dialog/drag agent | Preserve external image/palette drops and deliberate exported-file drag-out. |
| 8. Automatic maximum-color choice | Research agent | **Research only, explicitly confirmed by user.** No setting or algorithm ships. Distinguish automatic palette generation from automatic budget selection. |
| 9. Compact responsive Recolor controls | Compact settings agent | Desktop all rows; narrow/short landscape selected-setting chips; 44px controls, no clipped settings, cancel abandoned native gestures. |

## Review and validation gates

- [ ] Capture/reproduce relevant old behavior before each fix.
- [ ] Independent challenge of implementation and evidence; bounded review rounds,
  with concrete defects fixed and rechecked rather than unsupported consensus.
- [ ] Full unit suite and production build after integration.
- [ ] Actual Codex Browser interaction at desktop and narrow viewport.
- [ ] USB Pixel 8 Pro interaction, portrait and landscape, performance evidence.
- [ ] Output reuse compared with independently decoded native PNGs and all-frame
  GIF union; transparency, settings invalidation and cancellation covered.
- [ ] External drops, internal text/sliders and export-out drag regressions covered.
- [ ] Specs, user documentation and this checklist agree with shipped behavior.
- [ ] Separate feature commits; no push (main pushes deploy).

## Decisions and constraints

The existing Keep weighting, Auto fitting and automatic accent-selection no-ship
decisions stand. Color protection stays deferred even though mockups exist.
Any new concern requiring a product choice is put to the user before implementing
the related behavior. ADB initially could not see USB inside the sandbox; an
authorized host check detected the Pixel 8 Pro. Browser automation must keep the
Chromium sandbox enabled. No Mac/iOS validation is available.

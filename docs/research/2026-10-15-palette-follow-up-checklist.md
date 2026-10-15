# Palette follow-up verification — completed checklist

Requested continuation, October 15, 2026. Starting revision `4523a4a`.
The implemented palette batch and rejected Auto refinement already have retained
evidence. This pass checks for remaining justified fixes and freshly exercises
the current production build on Codex Browser and the authorized USB phone.

| Work | Owner | Status |
|---|---|---|
| Reconcile both previous checklists and deferred decisions | Independent review sub-agent | Complete. Removed stale future-tense Auto wording; tested candidates remain rejected for shipping. |
| Fresh edge-contract audit | Kernel + independent review sub-agents | Complete. Five trusted-browser checks, 32 cross-feature combinations, eight transparent controls and 64 independent PNG decodes passed. No production defect reproduced. |
| Build, units, pre-feature regression and independent Edge | Integration sub-agent | Complete. 910 full-suite tests plus both GC-dependent checks exercised separately; build, 132 legacy + 11 Palette + 11 RGB cases, 13 integration groups and nine Edge phases passed. |
| Current-app ordered-dither acceptance | Root | Complete: 20 phases passed in each of Codex Browser and physical USB Android. |
| Current-app palette improvement acceptance | Root | Complete: 16 phases passed in each, including actual live Lospec, Count/Use, Keep/Cut, export payloads and owned QA-palette deletion. |
| Focused verification of any reproduced fix | Assigned owner + independent reviewer | Complete. Corrected test-only confirmation timing. Both real native PNG downloads match, with 8,192 original alpha values intact; Android native New/Edit picker passed again. |
| Final evidence and separate commits | Root | Complete within recorded scope; no production source changes, push or deployment. |

Keep existing intuitive controls and defaults. Do not repeat paid service calls
or Auto experiments without a new hypothesis: the completed 176-observation
refinement experiment failed the user's improvement-without-regressions gate.
Native Android New/Edit suggestion/Set checks passed again. Safari/iOS and OS
clipboard readback remain explicit coverage gaps. No added Auto setting, lock
control, permanent count-shortcut row or further preset expansion is justified
by this follow-up.

The [final verification](2026-10-15-palette-follow-up-verification.md) retains
the exact build, host/device results, native downloads and limits. The
[independent review](2026-10-15-palette-follow-up-review.md) classifies deferred
items and rejected hypotheses. A settings-dismissal press intentionally does
nothing else; subsequent Save was verified rather than changing that contract.

Commit record: `fecb141` starts this checklist; `d582e58` corrects and cleans up
the acceptance harness; `3a44e10` retains the independent boundary probes.
Device receipts and final documentation are committed separately. All current
production assets remain identical to the frozen `4523a4a` build.

Subsequent clipboard follow-up: [actual native verification](2026-10-15-clipboard-verification.md)
closes the requested Codex/USB Android delivery gap within its recorded scope,
fixes one later-PNG-rejection ownership defect and adds conditional Save guidance.
Native partial-alpha RGB changes and the distinct PNG-import precision observation
remain explicit; Safari/iOS still needs testing. The earlier frozen-build results
above remain historical evidence rather than claims about the later source revision.

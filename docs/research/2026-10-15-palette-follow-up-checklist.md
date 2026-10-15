# Palette follow-up verification — active checklist

Requested continuation, October 15, 2026. Starting revision `4523a4a`.
The implemented palette batch and rejected Auto refinement already have retained
evidence. This pass checks for remaining justified fixes and freshly exercises
the current production build on Codex Browser and the authorized USB phone.

| Work | Owner | Status |
|---|---|---|
| Reconcile both previous checklists and deferred decisions | Independent review sub-agent | In progress; rejected Auto candidates are not unfinished implementation. |
| Fresh edge-contract audit | Kernel + independent review sub-agents | In progress; reproduce actual findings before production changes. |
| Build, units, pre-feature regression and independent Edge | Integration sub-agent | Build passed; dist frozen while devices test. Other checks running. |
| Current-app ordered-dither acceptance | Root | Pending in Codex Browser and physical USB Android. |
| Current-app palette improvement acceptance | Root | Pending in both, including live Lospec, Count/Use, Keep/Cut and exports. |
| Focused verification of any reproduced fix | Assigned owner + independent reviewer | Implement only justified fixes; repeat affected app and device paths. |
| Final evidence and separate commits | Root | In progress; no push/deployment. |

Keep existing intuitive controls and defaults. Do not repeat paid service calls
or Auto experiments without a new hypothesis: the completed 176-observation
refinement experiment failed the user's improvement-without-regressions gate.
Native Android color picker New/Edit suggestion/Set checks already passed; test
them again if a fix changes their event ownership. Safari/iOS and OS clipboard
readback remain explicit coverage gaps unless separately exercised.

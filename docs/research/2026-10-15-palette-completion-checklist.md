# Palette completion: service, usability, design and final audit

October 15, 2026. Starting revision `cf72fe5`. Audit baseline:
`f08d4d3f6e3df771d17524f00f1bba2e492c4ec0`.

The user authorizes autonomous scoped work with sub-agents, no questions, no
Claude and no physical mobile-device testing. Use Codex Browser plus desktop
engines and responsive/touch emulation; label emulation honestly. Commit stages
separately, do not push or deploy. Do not reopen rejected Keep/Auto/accent rules.

Color protection is **design only**: mock-ups and independent UX challenge for
later user review. Production implementation is deferred until that review; do
not add a protection control, algorithm, storage field or worker protocol now.
Other fixes must address reproduced in-scope defects, with a failing test before
the fix and passing targeted/regression checks afterward.

| Work | Owner | Status and gate |
|---|---|---|
| Remaining website outputs | Root + completion_service | Pending: existing authenticated browser feasibility, partial-alpha PNG, imported target, multiple-image/shared output. Use exact owned fixtures; save native downloads. Retained API output is separate evidence. No user sign-in questions or security bypass. |
| Existing-image Smart comparison | completion_service + root | Pending: refresh public API/MCP and inspect usable website controls. Test actual existing-image recoloring only if exposed and accessible. Otherwise document the bounded access/surface limit; no speculative integration or new-image surrogate. |
| Current workflow usability | Root + protection_design | Pending: fresh import → palette/limit/dither → Save, Count/Use/import, desktop, narrow portrait and short landscape. Heuristic/task walkthrough with agent reviewers, not a human usability study. Preserve user tabs and Chromium sandbox. |
| Color-protection mock-ups | protection_design + independent challengers | Pending: desktop/mobile, source mapping versus target availability, conflicts/undo/animation/palette changes. Clearly simulated design artifact outside src; no feature implementation. |
| Independent full-range algorithm audit | palette_deep_audit | Pending: every palette production change since baseline, actual code/tests/research challenged. Review matching, alpha, dither, decoder, concurrency, export and performance. Prior audit claims are evidence to test, not proof of completion. |
| Independent UI/integration and research/service audit | Reused agents after first tasks | Pending: complementary full-range review, then cross-challenge findings and proposed fixes with root. Do not manufacture issues or require unanimity about aesthetic preference; all reproducible defects need a disposition. |
| Reproduced fixes | Assigned after failing evidence | Pending only if a real defect is found: isolate failing regression, minimal fix, targeted test, independent verification and separate commit. No out-of-scope redesign. |
| Final acceptance | Root + reviewers | Pending: units/build/baseline exports, native Codex downloads, responsive coverage, appropriate other desktop engines and bounded performance. Follow fix/retest cycles until concrete findings are resolved; no unbounded speculative review loop. |
| Final ledger and mock-up delivery | Root | Pending: record source and artifact revisions, passes/limits, deferred design approval, inaccessible service cases, known precision limits and remaining actions. Nothing pushed. |

The objective is useful, intuitive, accurate local palette conversion. PixelLab
is comparative evidence, not a perfect output oracle or a list to copy. Preserve
negative service results, exact-source strengths and explicit test boundaries.
Neutral research must not include vendor source-code or extension-file details.

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
| Remaining website outputs | Root + completion_service | Complete: three native downloads cover partial-alpha PNG, imported target, and shared two-image sheet. Four jobs/0.4 subscription generations including one harness repeat. Sandbox remained enabled. [Report](2026-10-15-palette-completion-service.md). |
| Existing-image Smart comparison | completion_service + root | Feasibility complete; output trial deferred to human Aseprite use. Fresh official REST/MCP and inspected reducer UI expose no supported existing-image Smart route we can exercise. No integration/new-image surrogate. |
| Current workflow usability | Root + protection_design | Complete agent walkthrough: native Codex Save/Count/Use, actual app simulated-touch320×568/568×320 import/palette/limit/dither/Preview/Save. Not a human usability study or phone test. |
| Color-protection mock-ups | protection_design + independent challengers | Design complete for user review; implementation deferred. Both workflows, mobile layouts and conflict screens challenged. Auto support/inactive mapping decisions remain unresolved. [Proposal](2026-10-15-color-protection-design.md). |
| Independent full-range algorithm audit | palette_deep_audit | Complete, two rounds:80 oracle cases,120 historical invariants,196 focused tests,77 hashes, bounded desktop timing. [Review](2026-10-15-palette-completion-kernel-review.md). No new production fix. |
| Independent UI/integration and research/service audit | Reused agents after first tasks | Complete, complementary source reviews and cross-challenge. Root verified native Codex output and visually inspected all new labeled website sheets. Agreed concrete qualifications; no universal aesthetic claim. |
| Reproduced fixes | Assigned after failing evidence | No new production defect reproduced. Harness/download and design budget wording were corrected and reverified; no app behavior changes or speculative fixes. |
| Final acceptance | Root + reviewers | Complete within limits:930 units/2existing skips, build,132legacy+11full+11RGB+13integration groups, Codex native and responsive tests. Firefox retains identical6known rounding failures/18phases;139observations unchanged. |
| Final ledger and mock-up delivery | Root | Complete: [ledger](2026-10-15-palette-completion-ledger.md) records results, qualification agreement and remaining human/platform actions. Mockups delivered separately from production. Nothing pushed. |

The objective is useful, intuitive, accurate local palette conversion. PixelLab
is comparative evidence, not a perfect output oracle or a list to copy. Preserve
negative service results, exact-source strengths and explicit test boundaries.
Neutral research must not include vendor source-code or extension-file details.

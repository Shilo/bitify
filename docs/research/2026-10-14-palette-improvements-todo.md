# Palette improvements — working checklist

This temporary checklist tracks the requested improvements, their evidence and release checks. Preserve Colorfetti’s direct, local workflow and existing defaults. A completed experiment can reject a feature; a larger menu is not the goal. Each accepted feature receives its own commit and independent review before this batch is complete.

| Work | Status | Acceptance or decision gate |
|---|---|---|
| Compare public PixelLab palette catalog with ours | In progress: preset researcher | Explain each distinct role and overlap; use canonical published RGB sets, not vendor implementation details. Compare real sprites and synthetic ramps with nearest and dithering. |
| Black & white and ENDESGA 8 | Implemented; independent code review passed; device checks queued | Exact published colors and preserved defaults. [64-conversion study](2026-10-14-curated-palette-selection.md) records benefits and neutral-armor counterexample; no algorithm/default changes. |
| Lospec link import | Implemented; independent review and real Codex Browser fetch passed; phone checks queued | Existing Paste workflow, review before Save, safe persisted credit. Live testing caught and fixed Lospec's octet-stream MIME; schema/size/time bounds retained. |
| Used-color feedback | Implemented; independent review fixes applied; device checks queued | Explicit Count output colors uses the full export pipeline and whole-clip union. Five focused tests pass. Fixed Auto refresh identity race; tiny metadata only, no automatic wall-wide scans. |
| Reuse/export used palette | Implemented; review and device checks queued | Successful count changes the action to Use N output colors. Opens a new named draft in the existing editor, with local Save and HEX backup; no extra export format or dialog. Zero colors disables reuse. |
| Quick 2/4/8/16 limits | Evaluate with existing control | Convenience only; do not add a permanent mobile row unless it demonstrably improves interaction. Existing integer field already supports these budgets. |
| Keep / Cut opacity | Separate implementation gate | Keep original partial alpha for PNG; Cut retains current default and threshold. Trace matching, Auto, limiting, cleanup, caches and every export; no silent GIF approximation. Explicit choice with cutoff shown only for Cut. |
| Auto fitted directly to requested count | Research queued | Paired same-input experiments at 2/4/8/16 colors, including whole-wall and animation semantics. Require demonstrated benefit before changing shared Auto behavior. |
| Color locks | Research queued | Distinguish retaining a color in the available palette from forcing pixels to use it. Resolve count conflicts, shared Auto scope and UI before implementation. |
| Independent challenge | Ongoing: separate reviewer | Review cancellation, persistence, source ownership, empty/overflow cases and mobile clarity; resolve actionable findings. |
| Regression and device verification | Queued after implementation | Unit suite, build, built-browser baseline, real Codex Browser and USB Android. Independently decode relevant PNG/GIF/ZIP outputs; check defaults, transparency, animation, performance and preview/export agreement. |

The successful [website output verification](pixellab-review-2026-10-14/web-output-verification.md) supersedes earlier website-output uncertainty: four native website PNGs were downloaded and analyzed. It does not establish every service option or universal quality superiority. The palette-selection spike will remain about public palette choices and product behavior, without vendor source-code or extension-file references.

## Commit and testing record

- Baseline before this batch: `5aa6418`. Existing full-palette dithering is off by default; its separate controls and existing 1-bit styles remain intact.
- Planning checkpoint: this document. Feature commits, reviewer outcomes, measured tests and deferred decisions will be recorded here as work completes. Nothing is pushed or deployed by this checklist.

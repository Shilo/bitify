# Palette improvements — working checklist

This temporary checklist tracks the requested improvements, their evidence and release checks. Preserve Colorfetti’s direct, local workflow and existing defaults. A completed experiment can reject a feature; a larger menu is not the goal. Each accepted feature receives its own commit and independent review before this batch is complete.

| Work | Status | Acceptance or decision gate |
|---|---|---|
| Compare public PixelLab palette catalog with ours | In progress: preset researcher | Explain each distinct role and overlap; use canonical published RGB sets, not vendor implementation details. Compare real sprites and synthetic ramps with nearest and dithering. |
| Black & white and ENDESGA 8 | In progress: preset researcher | Exact published colors, stable existing IDs/defaults, distinct useful roles; record counterexamples rather than claiming universal improvement. |
| Lospec link import | In progress: import worker | Extend existing Paste workflow, preview before saving, retain manual/file import; bounded credentialless requests, cancellation, clear errors and safe attribution. |
| Used-color feedback | Design review in progress | Count actual full-resolution output RGB colors, ignoring transparent pixels; union all animation frames. Never label sampled preview counts as exact. Avoid automatic expensive wall-wide conversions. |
| Reuse/export used palette | Queued after counts | Reuse the same captured output colors; review and name in the existing editor, with its HEX backup for other tools. Preserve the image/export itself. |
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

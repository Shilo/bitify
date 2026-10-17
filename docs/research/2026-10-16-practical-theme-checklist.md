# Practical artwork and Android themes — working checklist

Baseline: `7ed49fd`. Test realistic small batches, individual sprite sheets and
animations. The user's “spreadsheets” refers to sprite sheets in this context.
One hundred simultaneous images are outside practical product scope. Fix only
reproduced defects or demonstrated practical bottlenecks, preserving output,
transparency, animation, cancellation, normal responsiveness and mobile layout.
Commit fixes separately; no push or deployment.

| Work | Owner | Status / acceptance |
|---|---|---|
| Freeze realistic licensed/owned cohort | practical_workloads | Complete: 13 hashed CC0 fixtures, distinct small sprites, sparse 1024/2048 sheets, genuine effect animation and bounded motion assemblies. Independent dimensions/frame/hash checks pass. |
| Desktop performance and native outputs | practical_workloads + Root | Complete: five cases, 26 downloaded entries / 17.84 million decoded pixels, zero visible RGB/alpha mismatches and unchanged GIF metadata. No measured task ≥50 ms. |
| Actual Codex Browser walkthrough | Root | Complete: actual file chooser, nine-asset batch, 2048 sheet, 48-frame GIF, Auto, native downloads, Preview zoom/Original/Fit/close, Light and candidate None/Swap. Independent exact native output receipts retained. |
| USB Android themes under current preferences | android_theme | Investigation complete: Brave forced-dark flag Enabled overrides Light's author opt-out. Global theme workaround rejected. Narrow 1-bit color-choice protection passes native Light/Dark: all twelve pairs, both active colors, actual picker, None and Swap. |
| USB Android realistic workflows | android_theme | Complete: five final isolated `62dc29c` cases pass with exact native outputs, visible animation progression and no measured task ≥50 ms. Auto 2048 supplement also passes native scalar output checks. |
| Independent challenge | practical_challenger + Root | Complete: readiness, repeated instrumentation and offscreen-playback test errors corrected. All reviewers agree on the narrow fix and reject speculative performance or whole-theme transforms. |
| Reproduced fixes and regression gates | Root + reviewers | `db39123` protects 1-bit color-choice RGB using the existing paint-only approach. 982 unit tests pass, 2 intentionally skipped; isolated build passes. Actual native Light/Dark picker/None/Swap pass; PNG and 32-frame GIF remain byte-identical with independent scalar output verification. Desktop settles with zero repeated swatch painting. |
| Final integration, screenshots and commits | Root + reviewers | Complete: baseline `7ed49fd`, workload build `62dc29c`, and exact four-runtime-file candidate now committed as `db39123`. Fixture/harness evidence committed separately as `0fc555a`. All owned phone tabs closed and original OS/theme/rotation state restored; final evidence retained alongside these reports. No push/deployment. |

Exclude automation File transport from app import timings. A sampled wall need
not display an exact count. Brave canvas readback can perturb RGB; native Save
and independent decoding are the decisive output checks. Distinguish CPU work,
completion latency and input responsiveness, and do not infer total memory or
battery use from JS heap or rAF. Inspect physical screenshots for forced-dark
painting: computed CSS alone cannot establish correct colors.

No solution may disable the user's browser protection or change their appearance
preferences as a workaround. Temporary authorized test state is restored. A
browser setting intentionally overriding author colors is a separate constraint;
do not promise author code controls every browser or future browser version.

## Remaining limits and action

The browser-wide Light repaint remains a confirmed external override. For faithful
Light rendering on this phone, the user must disable **Auto Dark Mode for Web
Contents** at `brave://flags/#enable-force-dark` and relaunch Brave, or use a browser
that honors the page opt-out. This task did not change that global preference.
App Dark and the protected artwork/palette colors remain usable with the flag.
The [native diagnosis](2026-10-16-android-theme-diagnosis.md) distinguishes the fixed
swatches from this unresolved whole-interface constraint.

The practical cohort is bounded: sparse low-color sheets through 2048×2048 and
clips through 256×256 / 48 frames, plus a real effect sequence. It does not establish
performance for dense arbitrary artwork, unlimited clips or total process memory.
Phone rAF P95 was about 17 ms; the largest observed gap was 58 ms in 2048 Preview.
Zero Long Tasks does not mean zero dropped frames. No sustained practical stall
or output defect justified changing conversion/caching algorithms.

Auto supplemental native exports match their actual published palettes, rather
than independently proving palette-generation quality. On the phone, a layout
cache hit legitimately required no new wall paint; its supplemental CPU measure
covers publication/editor work, not guaranteed current-wall latency. Main practical
workload timing was measured before the UI-only swatch fix; targeted post-fix
native, desktop and unit regressions cover that separately. Safari/iOS remain
outside available device coverage.

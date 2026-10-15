# WebKit fallback investigation: decision and remaining work

October 15, 2026. **Keep the shipping decoder.** Three sub-agents investigated
native alternatives, challenged the candidate and tested failure behavior and
the physical Android device. A WebGL alternative preserves the tested colors,
but fails the user's condition to improve results without regressions.

## Why nothing was added to the app

The remaining problem is PNG input decoding in browsers without a usable native
ImageDecoder. Their bitmap/canvas fallback can alter the RGB of translucent
pixels while retaining alpha. This is separate from palette matching, dithering,
the optional Keep/Cut setting and PNG encoding.

Direct HTML image upload to a WebGL texture avoids that rounding in the tested
Windows WebKit inputs. The candidate keeps browser decoding, limits its scope to
ordinary static RGBA8 PNGs and releases its native resources. It adds no control
and does not interpret arbitrary profile bytes as sRGB.

However, the final streamed candidate's three fresh Windows WebKit runs block
inside context creation for **139 / 140 / 141 ms**, even on a 32×24 sprite.
Complete operations take 220 / 232 / 222 ms. Posting a task beforehand exposes
pending UI and cancellation but cannot interrupt the native call. The earlier
candidate independently reproduced the same problem. These are observed local
engine costs, not a universal Safari performance claim.

An initial metadata reader also skipped a valid 416-data-chunk PNG after costly
small reads. The research revision fixes that scanner problem with incremental
streaming, but the cold native stall persists. A shared retained context or idle
prewarming would add background work and resource policy; neither is justified
as a workaround in this pass. No custom PNG pixel decoder was introduced.

See the [independent challenge](2026-10-15-webkit-fallback-adversarial.md),
[failure/device review](2026-10-15-webkit-fallback-review.md) and
[working checklist](2026-10-15-webkit-fallback-checklist.md). They retain the
negative results as well as successful precision controls.

## What was verified

| Evidence | Result and boundary |
|---|---|
| Current Codex Browser app | 20 dithering + 16 palette phases pass; actual picker import and native PNG Save preserve every alpha byte and visible RGB. The saved 422-byte Keep PNG matches the frozen golden exactly. Palette import yields the expected eight colors in an unsaved named draft. [Receipt](../../bench/webkit-fallback-validation-codex-app.json). |
| Current USB Android app | The same 36 phases pass. Actual Keep/Cut downloads are byte-identical to their 422/213-byte goldens. Palette-image import retains eight expected RGBs, typed name, artwork and local library. [Receipt](../../bench/webkit-fallback-validation-final-app-android.json). |
| Research helper on both devices | Three eligible tiny inputs and three 1 Mi-pixel runs are exact; twelve unsupported cases decline. Dependency hashes are stable. Existing native decoding stays exact. Forced native-API absence still reproduces the unchanged shipping fallback's loss. [Codex](../../bench/webkit-fallback-validation-codex-native.json), [Android](../../bench/webkit-fallback-validation-android-native.json). |
| Resource and cancellation faults | 20 deterministic checks pass, including stream cancellation/lock release, GPU denial/loss, dimension refusal, native failure, abort and owned resource cleanup. These are fault-injection tests, not GPU latency measurements. [Receipt](../../bench/webkit-fallback-validation-resources.json). |
| Windows WebKit | Native precision improves in the research controls; repeated cold latency fails the shipping gate. Larger streamed observations overlap another QA process and are not used as isolated throughput evidence. Current app partial-alpha failures remain failures; binary-alpha smoke is a narrower separate result. [Challenge](2026-10-15-webkit-fallback-adversarial.md). |

The production index remains
`16d2776e085ab2d3907d055ccf5bd52e2fb20bdd089a7c0a87b2fc19cdb92837`;
the decoder remains
`e1207e72ec51656ee6a0b516632599b60de0e510110fd319036203c9cefe15a9`.
No `src/` or runtime dependency change is part of this follow-up. No new full-unit
or build run is claimed for unchanged production files; the direct browser,
download and research-resource checks above were rerun. Nothing was pushed.

Separate commits retain the plan (`58f42d6`), initial native controls and negative
evidence (`6f92372`), then the research-only candidate and final device evidence
(`0319dd3`). This decision and checklist reconciliation follow separately.

## Remaining concerns and recommendation

1. **Fallback precision is still a real limitation.** A future replacement needs
   exact color/profile behavior and acceptable cold native-call latency before
   app integration. Do not ship the tested GPU route or add a confusing toggle.
2. **Native clipboard transport can still round translucent RGB.** The app's
   direct PNG Save is exact in the tested native paths. Existing conditional Help
   guidance remains appropriate; copying and saving are distinct boundaries.
3. **Broader stress/native interactions remain optional coverage.** Sustained
   large imports, long GIF/source switching, delayed native Copy snapshots and
   every native picker interaction are not exhaustively covered. No new failure
   in those areas was established here.

The implemented palette batch is complete within its recorded scope. Direct Auto
refinement remains a completed rejection; color locks, a collection-wide budget,
more presets and extra export formats remain optional product proposals. They
should not be added merely to clear historical exploratory rows. The
[remaining-work audit](2026-10-15-palette-remaining-audit.md) preserves those
distinctions. Mac/iOS is unavailable and outside this requested pass, with no
setup or user action requested.

Recommendation: retain the current app and these regression fixtures. Pursue a
new fallback mechanism only with a credible way to remove the measured stall;
keep intuitive palette workflows and exact native PNG output as the priority.

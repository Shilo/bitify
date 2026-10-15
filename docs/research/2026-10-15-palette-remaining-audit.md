# Remaining palette work: independent audit

October 15, 2026. Read-only production audit of the October14/15 palette research,
implementation and session checklists. This excludes the separate bead/outline
project and deferred branding effects. No user browser/profile, clipboard,
installation, cloud account or production source was changed. The subsequently
authorised engine tests use fresh owned Windows WebKit contexts only.

The implemented palette batch and guarded native-PNG correction are complete
within their recorded acceptance scopes. An unchanged fallback precision
limitation, actual Safari/iOS coverage and optional product ideas remain distinct.
A rejected experiment or an untested service combination is not an unfinished
accepted app feature.

## Current decisions and useful next steps

| Rank | Work | Current classification | Gate and practical next action |
|---|---|---|---|
| 1 | PNG input precision | Guarded native-byte correction complete in d37d8b7; final device/export gates passed | The [final verification](2026-10-15-png-import-precision-verification.md) closes the tested Windows native-copy discrepancy. Exact native PNGs and eight-color palette-image import pass in Codex Browser and Android. Native Android RGBA was already exact. Retain regressions and explicit profile/fallback limits; no further native-copy implementation is pending. |
| 2 | WebKit engine coverage | Six bounded binary-alpha smoke checks pass; full partial-alpha suites fail their original-source oracle | Retain both results below. No install was needed. Do not weaken the full-source assertion, relabel partial-alpha input as exact, or claim actual Safari/iOS from these runs. |
| 3 | Actual Safari/iOS | Genuine unclosed platform acceptance | Requires accessible Safari on a Mac and/or an actual iOS device with a supported testing connection. Use the existing owned fixtures and retain native file/clipboard/picker results. Neither Windows WebKit nor an iPhone viewport closes this gap. |
| 4 | Sustained/large native integrations | Narrow unexercised scenarios, not known app defects | If prioritised, test one bounded delayed native Copy snapshot and a long GIF/source-switch workload. Retain actual output, source/settings identity, cancellation and responsiveness observations. Existing payload interception must not be relabeled as OS delivery. |
| 5 | Task usability and collection scope | Optional research with a demonstrated semantic distinction | Test real tasks before adding rows: explain target size versus maximum versus used count, reuse the counted palette, and establish whether users need one shared cap across assets. A shared target is not a shared capped subset. |

Ranks2 and3 have different purposes. Local WebKit can cheaply detect engine/layout
failures, while actual Safari/iOS is still needed for platform decoding, clipboard,
download/share, native picker, touch/keyboard and installation behavior.

## Checklist reconciliation

| Prior item | Current decision and evidence boundary |
|---|---|
| Full-palette dithering | Implemented Off/2×2/4×4/8×8, with strength and default Off. Source-phase, exact membership, alpha, animation, Cleanup, cache/snapshot and output checks are retained in the [implementation record](2026-10-14-full-palette-dithering-implementation.md). This is no longer a feature gap. |
| Tiny-sprite texture guard, 1×1/odd patterns, extra dither toggle | No demonstrated need. Existing lower strength resolves the specific armor fragmentation in the retained sweep. 1×1 adds no spatial mixture; another remembered control needs a distinct useful outcome. This does not assert ordered dithering always improves art. |
| Error diffusion | Research demonstrated tone benefits and strong unchanged-region propagation in a two-frame counterexample. It was not accepted as an animation-safe replacement. Do not add it to satisfy an old exploratory suggestion. |
| Used-color Count and reuse | Implemented as explicit full-output work, unioning GIF frames and preserving snapshot/Auto ownership. Use N output colors opens the existing editor draft. Zero-color reuse is disabled. See the [palette checklist](2026-10-14-palette-improvements-todo.md). |
| Clean palette exchange | HEX backup and local saved-palette reuse are implemented. A clean PNG strip/GPL exporter or a one-click source-reference shortcut remains optional convenience, not a broken export. Current image/text imports already address the basic task. Add only after a demonstrated workflow need and exact RGB/order roundtrip tests. |
| Black & white, ENDESGA8 and catalog acquisition | Implemented and tested, including live Lospec full-URL import on both devices. Eleven curated choices plus import cover the demonstrated roles. Missing another service's catalog entry is not sufficient reason to expand the rail. Bare Lospec slugs are intentionally outside the strict URL contract. |
| Keep/Cut opacity | Implemented; default Cut128 retained, Keep preserves source alpha through conversion and direct PNG payloads. Partial-alpha GIF and atomic ZIP fail explicitly. PNG input decoding and native clipboard transcoding remain separate boundaries, not excuses to change this alpha contract. |
| Forced-dark palette fidelity | Implemented paint-only canvases after physical-phone SVG counterexamples. Palette values, native input hit targets and direct export are separate from UI painting. The known fixes and bounded RGB probes are complete. |
| Direct K Auto fitting | The first20-case study has four regressions. The [176-observation follow-up](2026-10-15-auto-refinement-decision.md) also fails the shipping gate: permissive centroids violate shared target identity or source-color protection, while strict/rare variants retain the current output at extra cost. Completed rejection; no Auto implementation is pending. |
| Color locks/forced pixel mapping | Deferred product design. Retaining a target entry does not force a rare eye/accent to use it. Must define target availability versus exact source/region mapping, impossible count conflicts, target changes, GIF scope and snapshot behavior before a control or algorithm. No demonstrated current bug requires it. |
| Permanent2/4/8/16 row | Intentionally deferred. Current integer maximum already expresses these values; another phone row requires measured usability benefit. |
| Whole-collection cap | Real capability difference from per-asset caps, not a cap bug. GIFs already share one duration-weighted subset. A future set budget needs explicit membership/scope, weighting, whole-set counts, source-change invalidation and atomic export; do not silently change the existing per-asset meaning. |
| Ramp authoring, semantic generation, geometric repair | Optional scope expansion. Ramp text/image reuse, material recognition and coordinate-changing repair need different contracts and artist evidence. A successful remote example does not justify a local equivalent or a backend. |
| Native picker New/Edit | Real Android suggestion/Set paths are complete. Custom HSV entry and Cancel are narrower unexercised interactions; no failing behavior is known. They remain optional acceptance, not a speculative fix. |
| Native Clipboard Copy/Paste | Completed within the [final recorded scopes](2026-10-15-clipboard-verification.md): human Codex receiver delivery, separate native artwork import, Android four-case transfers/editor ownership, and independent sandboxed Edge/Windows. Partial-alpha RGB exactness fails and is reported. The actual Save control isolates245 Codex transfer differences from118 pre-transfer golden-to-Save differences; these overlapping counts must not be subtracted. |
| Clipboard failure and carrier | Promise ownership repaired in256ad1e and independently challenged. Conditional Help is in55c32cc. Android HTML carrier advertises HTML but delivers an empty string; it remains rejected. There is no universal RGB reconstruction fix justified by lost premultiplied precision. |
| Broader service coverage | Four native website outputs, REST/MCP and paired studies retain their exact settings. Website multi-source/GIF/partial-alpha, other matrices and several repair operations remain unverified. These are research limits, not evidence that unchanged local production needs more paid requests. |

No remaining row above is a newly established unfixed palette feature defect.
Direct PNG probes justified one committed narrow correction, while the Windows
WebKit fallback precision limitation below remains unchanged. Further fallback
research needs a new profile-safe proposal and actual target-platform observations;
it must not reopen the already completed native-copy fix.

## Historical wording that must not reopen completed work

The [October14 research plan](2026-10-14-palette-research-plan.md) originally marked
website output unverified. The [four native downloads](pixellab-review-2026-10-14/web-output-verification.md)
supersede that statement for their bounded cases. The original feature matrix and
neutral spikes are baseline proposals; their “next” language is not a fresh task
list after the implementation/decision records.

The [palette implementation checklist](2026-10-14-palette-improvements-todo.md) and
the historical [follow-up review](2026-10-15-palette-follow-up-review.md) still
contain an OS clipboard coverage limitation from their frozen builds. The later
[clipboard checklist](2026-10-15-clipboard-checklist.md) and final verification
close delivery in their stated Codex/USB scopes. They do not close Safari, all
external destinations or exact translucent RGB transport. Historical test counts
and build hashes should remain historical rather than being rewritten as if they
tested the newer source.

The [Auto checklist](2026-10-15-auto-refinement-todo.md) is complete with a no-ship
decision. Repeating the same candidates or adding a permissive guard without
new evidence would not complete more useful work. A new candidate needs a new
hypothesis and the prior semantic/detail/performance gates before results are seen.

## Local Safari/WebKit feasibility inventory

Read-only observations from this Windows workspace on October15:

| Capability | Observed state | What it establishes |
|---|---|---|
| Bundled automation library | Playwright1.62.1 available at `C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright` | Test runner available; not a browser or device proof. |
| Matching host WebKit binary | `C:/Users/shilo/AppData/Local/ms-playwright/webkit-2336/Playwright.exe` exists, with `INSTALLATION_COMPLETE`, WebKit DLLs and companion processes | Existing installation launched successfully without downloading. The exact bounded engine results are below; this is Windows WebKit, despite its default Macintosh/Safari UA. |
| Default runtime path | `webkit.executablePath()` resolves into sandbox-redirected `AppData/Local/Packages/sandbox.../AC/ms-playwright/webkit-2336`; that path is missing | A naive default launch would falsely suggest no local binary. Set `PLAYWRIGHT_BROWSERS_PATH` to `C:/Users/shilo/AppData/Local/ms-playwright` before loading Playwright. Do not install a duplicate just to fix path resolution. |
| Other local engines | Host cache includes Firefox1538 and Chromium1208/1228; installed Edge executable exists | Other independent engines are possible. Existence alone does not validate their version pairing, successful launch or current app behavior. |
| iPhone/iPad descriptors | Runtime exposes90 matching device descriptors | These are viewport/user-agent/touch parameters, not connected Apple devices. Do not use descriptor names or `Safari` text in Chromium UAs as Safari evidence. |
| Existing repo harness | `bench/brand-icons-qa.mjs` already supports an ENGINE=webkit run | Brand rendering coverage can be reused as a pattern. It does not cover new palette/native contracts automatically. It is not run for this audit. |
| Existing CI | Only `.github/workflows/deploy.yml`: Ubuntu npm ci, tests, build and Pages deployment | Unit/build checks exist. No maintained WebKit browser acceptance job, Mac runner or real iOS device job was found. No CI change was made. |
| Available UI/device scope | Tool browser entry points expose Chromium-based Codex/Chrome/Edge; authorized ADB device is Pixel8Pro | No active Safari/Mac/iOS automation surface is provided to this task. ADB Android access is not evidence about iOS hardware. No user browser was opened, inspected or changed for this inventory. |

The explicit cache can be selected in PowerShell with
`$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/shilo/AppData/Local/ms-playwright'` for an
owned test process. It was set only in each test process. No user browser profile
was reused, and no `--no-sandbox` flag was supplied. WebKit has no Chromium-specific
sandbox switch; the test does not mislabel that option as a WebKit verification.

Playwright documents that its WebKit is a patched recent WebKit build and does
not automate branded Safari; platform-dependent features differ, and macOS is
closer to Safari than Windows/Linux. [Official browser guidance](https://playwright.dev/docs/browsers).
Its device registry simulates parameters such as viewport, user agent and touch.
[Official emulation guidance](https://playwright.dev/docs/emulation).

Apple's Safari driver and actual iOS/iPadOS automation use Safari with a connected
Mac and device settings for Web Inspector/remote automation. This is a practical
dependency, not permission to connect a paid cloud provider or change a device's
settings without an available authorised target. [Apple WebDriver](https://developer.apple.com/documentation/safari-developer-tools/webdriver),
[Apple iOS setup](https://developer.apple.com/documentation/safari-developer-tools/ios-enabling-webdriver).

## Windows WebKit: successful smoke and retained precision failures

The [engine harness](../../bench/palette-webkit-qa.mjs) drove the existing `/qa`
and `/improvements` pages against frozen production index
`a4b434562abb9dd2fe7c52957318499de02f0f1244e4cb786379f7256b28834f`.
Each fresh isolated context completed its first two checks, then failed at the
partial-alpha ramp's preview/full-original-source comparison. There were zero
uncaught page errors. [Both negative receipts](../../bench/palette-webkit-review/baseline-results.json)
are retained; this is not a20+16-phase pass. The test's PNG oracle starts from
original authored samples. A browser input change can therefore fail it before
the app's downstream preview/export agreement is assessed.

The [owned direct decoder probe](../../bench/palette-webkit-review/decoder-probe.mjs)
records actual capabilities and pixels, with an isolated report sink rather than
overwriting another device's diagnostics. In this engine, `ImageDecoder` and
`VideoFrame` are absent. Production decoding and both eight-bit canvas controls
change292 visible source RGBs and330 visible converted RGBs, with zero alpha
changes. `premultiplyAlpha:none` does not fix it. `Float16Array` exists, but the
requested float16 canvas backing is unsupported. [Full results](../../bench/palette-webkit-review/decoder-probe-results.json)
retain actual bytes and negative methods. These are observed fallback limitations,
not a new regression introduced by the guarded native-byte candidate. That
candidate cannot improve an engine without the native API, so its fallback must
remain honest and compatible.

A separate [binary-alpha smoke](../../bench/palette-webkit-review/smoke.mjs)
uses authored16×16 PNG/GIF inputs with only0/255 channel endpoints and alpha0/255.
An independent bitmap control verifies that this narrower source decodes exactly.
The [six-check baseline receipt](../../bench/palette-webkit-review/baseline-smoke-results.json)
then confirms:

- Actual PNG download matches the full Node conversion under PICO-8/cap4/Cleanup/
  4×4/50/Keep, with exact alpha and visible RGB.
- Preview Count returns four used colors; Use opens an unsaved draft with exactly
  those independently decoded output RGBs.
- A two-frame GIF download has exact converted frames,80/160ms delays and loop0.
- Separate1-bit Solid/black-white output PNG matches its conversion and binary
  source alpha. No transparent None role or every-style claim is made.
- Recolor controls fit320×568 and568×320; the bottom Opacity control scrolls into
  the viewport. Settled screenshots were visually inspected. This is emulated
  touch/layout, not a physical iPhone.

Two ResizeObserver delivery notices are retained separately from other errors;
no other runtime error was observed in that smoke. An initial QA selector typo
and reading a file input after the app cleared it were corrected in the helper,
not production. Full source-precision failures were not hidden by those corrections.
No native clipboard API is used by the smoke. The older broad QA pages inspect
intercepted PNG payloads only; their clipboard hooks are not OS delivery evidence.

The [final-build smoke](../../bench/palette-webkit-review/final-smoke-results.json)
reruns all six checks successfully on index
`16d2776e085ab2d3907d055ccf5bd52e2fb20bdd089a7c0a87b2fc19cdb92837`.
The baseline negative suites are not relabeled or overwritten. With no native
ImageDecoder, the guarded candidate does not change this engine's fallback;
the endpoint smoke establishes unaffected bounded UI/export behavior, not a fix
for its partial-alpha source precision or actual Safari/iOS support.

## Independent candidate challenge

Source hash `e1207e72ec51656ee6a0b516632599b60de0e510110fd319036203c9cefe15a9`
passes this source review. An independently executed focused decoder run passes
33 tests. Only known RGBA/BGRA with exact full-range RGB/BT.709/sRGB-transfer
metadata bypasses the old explicit conversion; null/incomplete/linear/P3/X-format
metadata does not. Tight-plane verification rejects unexpected offsets/strides.
BGRA reordering uses the already-allocated output buffer, changes only red/blue,
yields cooperatively and retains abort authority. Frame/decoder cleanup remains
in finally; canceled work cannot publish or restart through canvas.

The first candidate additionally excluded nonzero visible-rectangle origins,
forcing a previously native-copyable crop through canvas. Independent challenge
recommended removing that unrelated change. It was removed; three positive
RGBA/BGRA/unknown-space crop tests preserve default visible-rectangle copying and
the prior managed route. This matters even though ordinary observed PNG frames
have zero origins. The [WebCodecs copy contract](https://www.w3.org/TR/webcodecs/#dom-videoframe-copyto)
separates source rectangle, output layout, native format and managed conversion.

The [independent17-fixture review](2026-10-15-png-precision-review.md) supplies
actual format/profile counterexamples rather than treating branch mocks as ICC
proof. A fixture self-review caught sRGB-after-PLTE ordering and corrected it with
positive CRC/chunk-order assertions before final corpus reruns. The corrected
manifest/device hashes must accompany final acceptance; old tolerated malformed
ordering is not evidence of conformance. Eight-bit×257 sixteen-bit samples do
not cover arbitrary16-bit/HDR precision, and the huge-header case is deliberately
metadata-only rather than a native allocation stress test.

The [isolated cost harness](../../bench/png-import-precision-swap-perf.mjs) starts
its reorder interval after the mocked copy has filled the destination. It measures
actual swap plus posted scheduling in Node, not native PNG decode, phone frame
rate or total heap. Its allocation statement is narrow: no additional output-size
swap buffer. Native frame, encoded input and browser allocations still exist.
No float16 fallback, custom parser, new control or quantizer change is accepted.

The [final verification](2026-10-15-png-import-precision-verification.md) closes
current-build native acceptance. The reviewer independently rehashed the retained
Codex native output (`codex-final-native-output.png`) and Android Keep/Cut downloads:
422/422/213bytes respectively
match their frozen goldens, including Keep SHA256
`14d0012def2b51dbf17ce7e0022fb43d7cc2911209be1ed2b43bfe995c427691`.
Both final corpus runs use corrected manifest/dependency hashes, remain stable
before/after and retain all seventeen cases including the metadata-only header.
Final app palette-image imports report the exact eight expected RGBs without
automatically saving their drafts. The broader929-unit/build/baseline and36-phase
Codex receipts are root-owned evidence, not additional independent reruns claimed
by this reviewer. The no-ship Auto decisions and actual Safari/iOS gap remain
unchanged; no critical outstanding production finding emerged in this audit.

## Independent gates for any PNG decoder candidate

1. Observe the actual current decoder, its capability checks and returned pixels
   before choosing a replacement. Record whether loss is at file decode, format
   conversion, canvas readback, application conversion or native clipboard.
2. Retain color management: decoded sRGB is the contract, not raw stored RGB for
   every profiled PNG. Exercise untagged/sRGB and an independently understood
   profiled fixture; unsupported profile/transform cases need an honest fallback.
3. Preserve each original alpha byte, including1/64/127/128/192/254/255, dimensions,
   exact target membership and hidden-RGB policy. Keep/Cut, Auto/cap/Cleanup/dither,
   GIF handling and palette-image extraction must retain their distinct meanings.
4. Test unavailable/unsupported/throwing native decoder and copy formats; abort
   before/while decoding; close every decoder/frame/bitmap; enforce pixel limits
   before unsafe allocations where possible. Do not mask cancellation as fallback.
5. Use a minimal format-specific path only after the reproduction justifies it.
   Retain non-PNG imports, animated GIF handling and first-frame palette behavior.
   Do not introduce another generic decoder dependency without evaluated need.
6. Verify actual built-app imports and native saved PNGs in Codex Browser and USB
   Android against independently decoded source/captured conversion, with a
   bounded timing/memory check. Recheck only affected regressions. Native clipboard
   transcoding remains a separate observed limitation even if import is repaired.

Stop if the candidate only improves one guessed model, sacrifices managed color,
alters unaffected formats or introduces unbounded resource/cancellation behavior.
Keep the current path and record that decision if no candidate passes. No new
palette control, quantizer, Auto setting or clipboard carrier follows from this
precision investigation alone.

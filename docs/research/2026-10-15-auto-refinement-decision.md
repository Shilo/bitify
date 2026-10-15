# Auto refinement: decision and device verification

October 15, 2026. **Keep the current production Auto algorithm.** The requested
research and direct service comparison are complete within the coverage below.
The tested refinement does not meet the user's improvement-without-regressions
condition. No production module, control, default, snapshot or encoder changed.

## What the experiment means for users

Auto currently builds one shared palette for the wall. Max colors chooses a
subset of those colors separately for each sprite, and one subset for an entire
GIF. The proposed extra fitting pass starts from that existing subset and moves
its RGB colors toward the source. This can improve an average score, while
changing a deliberate highlight or losing a warm material accent. It also creates
colors outside the palette the user sees. Neither consequence is a harmless
implementation detail.

We tested a second approach that keeps the published RGB colors and searches for
a better subset. With strict safeguards, it changed none of the actual baseline
outputs tested. Adding its work would therefore cost time without a demonstrated
benefit. A synthetic positive control does accept a safe improvement, so the
safeguard is not simply disabled.

## Findings and evidence

| Comparison | Measured outcome | Decision |
|---|---|---|
| Initialized centroid fitting, mean-only acceptance | Changes 175/176 cases; every changed case leaves the shared Auto target | Reject as a silent Auto replacement |
| Strict and rare-detail centroid guards | No accepted change in 176 cases | No demonstrated gain to ship |
| Same-target subset swaps, mean-only | Six changes; each worsens some source RGB groups, with up to 246 groups worsening | Reject these tradeoffs under the requested gate |
| Strict and rare-detail same-target swaps | No accepted change in 176 cases | Keep current subset selection |
| Actual dithering/Cleanup interactions | 140 setting cases; 26 mean-candidate comparisons worsen eligible 4×4 block tone; permissive refinement can also change Cleanup decisions | A nearest-point guard alone does not validate downstream behavior |
| Current versus PixelLab native item sheet and armor, K2/4/8/16 | Current has lower Oklab point error in 7/8 cases; PixelLab wins armor K4 by approximately 0.27% | Preserve both favorable and adverse examples; no universal quality claim |

Status/supersession (Oct 15): the strict guard requires no error increase for any visible source RGB, a Pareto condition almost any palette change fails by construction; its zero acceptances reflect the gate, not proof that no better palette exists. The no-ship decision rests on shared-target identity, exact-pixel losses and the requested no-regression condition. The point-error comparison against the service uses the Oklab objective that Colorfetti's nearest mapping minimizes, so it is not neutral between the products.

The [refinement study](2026-10-15-auto-refinement-spike.md) contains the expanded
corpus, methods, exact fixtures and limitations. It covers thirteen source items,
including real art, alpha boundaries, rare details, gamut/gradient inputs,
6,144-unique-color input and two three-frame animations, plus a four-asset wall.
Both Oklab/RGB and Cut/Keep are included. The 176 rows are scope/item/count/metric/
opacity combinations, not 176 independent artworks. Repeated interaction settings
are retained rather than counted as independent quality evidence.

The [same-source service comparison](2026-10-15-auto-refinement-service-comparison.md)
contains fifteen cases, including eight matched real-art cases and separate alpha,
frame and website controls. Exactly five new numeric-count REST jobs filled the
missing real-art counts; their responses reported 0.5 generations total. Native
website results and API results remain separately attributed. No new service job
is needed to support the no-ship decision. The [independent review](2026-10-15-auto-refinement-independent-review.md)
established gates before results existed and independently challenged guards,
outputs, hashes and methods.

## Codex Browser and physical Android

The research [device harness](../../bench/auto-refinement-device-qa.html) runs the
frozen candidate and current production conversion modules directly. It is not a
new production setting. Each device completed 24 checks: twelve fixture/settings
cases times two candidate methods. It verifies dimensions, visible target
membership, exact original alpha, all GIF frames/delays/loop, unchanged exact
pixels, deterministic repeated results, a zero-epsilon candidate guard and a
separate output-distance calculation. Each candidate's actual RGBA hash equals
its baseline on both devices; all strict outputs were unchanged. Both also check
4×4, 8×8 and Cleanup interactions, and pre-canceled/in-flight cancellation.

- [Codex Browser result](../../bench/auto-refinement-device-review/codex-results.json):
  24 completed checks, no reported errors, in-flight abort observed in 9.1 ms.
- [USB Pixel 8 Pro result](../../bench/auto-refinement-device-review/android-results.json):
  24 completed checks in Brave, no reported errors, in-flight abort in 8.3 ms.
- Candidate SHA256: `2bf68423c4c4ece2d3ca38ad3ada00f32d8ec6491a1545c1dad99d4fa39e4e77`.
- Fixture SHA256: `d52caec517fcc81bdc36aadd3d0d8f2fb1278b9f5bb5b14220c9f993afa1e32f`.

The 32,768-pixel/4,096-unique-color kernel comparison alternates execution order,
uses one warmup and three measured samples. Median current selection versus
selection plus research refinement was 24.9/91.0 ms in Codex Browser and
26.8/65.1 ms on the phone. The research candidate calculates all three guard
policies; these are not projected shipping costs or whole-app/worker timings.
Samples vary substantially. Supported observers recorded three/six long tasks
over the entire desktop/phone harness, including synchronous independent scoring,
rendering and report serialization. They cannot be attributed to refinement alone
or to the unchanged production app. These checks support no claim of a free gain.

The independent output-distance calculation allows numerical tolerance of 1e-12;
the candidate's strict per-source-color guard itself has no epsilon. This harness
does not exercise Auto worker/cache UI integration or native encoded downloads
for a candidate: no candidate passed the earlier shipping gates. Seven production
PNG round trips are separately checked in the Node study. Existing full app,
codec and device acceptance evidence remains in the [previous validation](2026-10-14-palette-improvements-validation.md).
The production source is unchanged, so repeating that full suite would not test
an additional implementation.

## Other follow-up completed

The remaining native Android picker gap was worth closing. The
[physical picker test](../../bench/palette-native-picker-qa.mjs) opens New color,
chooses the native Red suggestion, confirms Set, adds it, then opens Edit color
and chooses native Blue followed by Set. The real input and review swatch update
to exact #ff0000/#0000ff. [Receipt](../../bench/auto-refinement-device-review/android-native-picker-results.json)
and [result screenshot](../../bench/auto-refinement-device-review/android-native-picker-result.png)
are retained. No synthetic input events substitute for picker actions; the owned
draft/page is discarded without saving a palette. Custom HSV entry, picker Cancel,
Safari/iOS and OS clipboard readback remain untested.

An obsolete final paragraph in the old direct-comparison report still described
website output as unresolved. It now points to the four already verified native
downloads. This is an evidence correction, not another service call.

## Next useful work

Keep the improvements already shipped: explicit Count/Use output colors, exact
compact presets, Lospec import, optional Keep opacity and off-by-default dithering.
Do not add another Auto setting, permanent budget row, palette expansion or lock
control on the strength of this experiment. A future fitting proposal must first
demonstrate a useful improvement while preserving the shared target and important
details. The retained counterexamples are now ready to challenge it. If color
locks are revisited, define retaining a target entry separately from forcing a
source region to use it, including cap conflicts, before building controls.

## Reproduction

1. `node bench/auto-refinement-spike/run.mjs`
2. `node bench/auto-refinement-spike/independent-guard-check.mjs`
3. `node bench/auto-refinement-comparison/run.mjs` (offline; uses retained native results).
4. `node bench/auto-refinement-device-server.mjs`, then open loopback port 5296
   in Codex Browser and choose Run refinement checks. For the authorized Android
   browser, reverse USB port 5296 and open the same localhost page. The server
   retains each device report; it never binds a public interface.
5. Native picker: run the existing QA server on 5294, reverse that port, forward
   the authorized phone's Chromium debugging socket to 9333, then run
   `node bench/palette-native-picker-qa.mjs`. Keep the phone unlocked and remove
   the temporary debug forward afterward.

Research reports describe public product behavior and outputs, with no vendor
source-code details or extension-file references. No credentials are retained,
and no push or deployment was performed.

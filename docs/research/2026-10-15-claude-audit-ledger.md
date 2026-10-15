# Claude independent palette audit: two-round ledger

Status reconciliation, October 15: this ledger preserves the audit's findings at
the time. Its S1 Keep follow-up is now [complete and closed](2026-10-15-keep-real-art-decision.md).
Its S2 automatic important-color investigation is also [complete, no ship](2026-10-15-important-colors-decision.md).
Neither is an unperformed future study. Artist-controlled protection remains a
separate optional design question. See the [session checklist](2026-10-14-palette-improvements-todo.md)
for current remaining comparison, usability and coverage work.

October 15, 2026. Range f08d4d3f6e3df771d17524f00f1bba2e492c4ec0..e87a853 (13
source-touching commits, 36 source/test files), plus fixes landed in this audit.
This is a separate audit from the [previous agents' ledger](2026-10-15-palette-handoff-audit-ledger.md),
whose conclusions were treated as claims to challenge.

Round 1 had five independent reviewers: implementation A (dither, strength, Keep/Cut),
implementation B (presets, Count/Use, Lospec, swatches, clipboard, Help, native PNG
decode), research/provenance, PixelLab service/Smart, and device/performance. Round 2
had an adversarial challenger for every fix and disposition, plus a device retest
on a fresh build. Reports:
[impl A](2026-10-15-claude-audit-impl-a.md), [impl B](2026-10-15-claude-audit-impl-b.md),
[research](2026-10-15-claude-audit-research.md), [service](2026-10-15-claude-audit-service.md),
[device (rounds 1–2)](2026-10-15-claude-audit-device.md), [round 2](2026-10-15-claude-audit-round2.md).
Scripts and receipts: [bench/claude-audit-2026-10-15/](../../bench/claude-audit-2026-10-15/).

## Fix commits

| Commit | Change |
|---|---|
| 376a55c | Firefox PNG frames report an all-null VideoColorSpace and premultiplied BGRA that managed `copyTo` returns unchanged: (100,150,200,127) became (50,75,100,127). These frames now take the existing canvas path. Pre-existing bug (native path from e23380c), but in the audited file. |
| 7fad4e7 | Pasted GPL/HEX text with a URL comment was routed to Lospec import and failed; a scheme-less `lospec.com/palette-list/<slug>` was routed but rejected. Only one link-like token now routes, and the scheme is optional. |
| d20d7ca | Supersession notes on historical research; CLAUDE.md, palettes.md, styles.md and spec corrected to shipped Recolor wording, row order, Reset defaults, Keep/Cut and eleven presets. |

## Findings and dispositions

| ID | Sev. | First evidence | Round-2 challenge | Disposition |
|---|---|---|---|---|
| B-3 Firefox premultiplied decode | High | impl B, reproduced by orchestrator in Playwright Firefox 153 | 17 PNG metadata variants × 3 engines: Chromium never reports all four fields null (keeps raw/managed copy); Firefox reports all-null for every variant; WebKit has no ImageDecoder. App = Firefox canvas on all 17. Real app: Cut128 mismatches 81 → 2, Keep 282 → 75 on a 576-pixel sprite. Seeded 256² random RGBA via the module: mean RGB error 63.05 → 2.57. | **Fixed, 376a55c. All agree.** Residual: Firefox now matches the WebKit/canvas limit (F1), with alpha 1–3 error about 2× the 8-bit ideal; ~+45 ms per 4 MP PNG in Firefox only. |
| B-1/B-2 Lospec routing | Low–Med | impl B adversarial suite | 46 hostile inputs: 0 non-canonical fetch destinations; real app scheme-less link imports with exactly one request; GPL with URL comment imports locally with none. | **Fixed, 7fad4e7. All agree.** Two links or bare `lospec.com` show the HEX error rather than the Lospec one: cosmetic, no change. |
| Research L/M/C | Low–Med | research reviewer | Every changed statement checked against Dock.svelte/App.svelte; spikes still vendor-free. | **Fixed, d20d7ca.** C-9 (no numeric WebKit threshold) and C-11 (historical receipt) left as is. |
| S1/D1 Keep: faint alpha competes fully in Auto/cap | Medium | service (alpha-1 spill, cap 3 turns the opaque core green) and impl A (2% halo, 140/400 opaque pixels change) independently | No tracked real sprite is affected (393 images scanned; only 21 synthetic fixtures). New: under Keep, alpha-1 RGB decodes differently per browser, so Auto differs by browser. No small obviously-correct fix: alpha weighting changes the integer accumulator, cap, Cleanup and cache identity. | **Deferred, raised priority: product/spec decision.** Specified behavior; Cut (default) is unaffected and identical across engines. Owner: user. Missing evidence: real glow/anti-aliased sprites where Keep is chosen. |
| S2 cap subset drops red tabard/eyes on held-out knight | Medium (quality) | service | One fixture; the service keeps them. | **Deferred** to locks/hue-coverage research as a new held-out case. No algorithm change. |
| S3 fixed-palette skin splits into several hues | Low | service | This is the problem Smart claims to solve. | **No change**; fixture added to the human Smart procedure. |
| F1 canvas-fallback translucent RGB rounding | Medium (known) | device: WebKit 3/75 mismatches, fully explained by 8-bit premultiply round trip; now also Firefox | The WebGL alternative was rejected earlier for a cold GPU stall. | **Known limit, no fix.** Alpha bytes always exact. Real Safari untested. |
| F2 WebKit Escape after Count → Use N → close editor | Info | device | Not stuck: focus returns to Save, and the first Escape dismisses its tooltip by design (`tooltip.js:23-28`); WebKit ignores one extra Escape on the nested editor. | **Reclassified Info, no fix.** |
| G1 strength pause/cancel has no Dock unit test | Gap | impl A | `pausedCommit` is unit-tested in gesture.test.js; browser script passes 10/10 wiring cases. | **No change.** |
| G2 lazy `getFrame` ZIP atomicity | Gap | impl A | `palette-export.test.js:44` and `:294` already cover it. | **Rejected, redundant.** |
| B-4 bidi/control characters in Lospec names | Info | impl B | Rendered as text; filenames sanitized. | **No fix.** |
| P1 phone first preview of 1 Mi, 256 colors, 8×8@100 ≈ 2.3 s | Observation | device | Cooperative, no long tasks. | **Documented**, no change. |
| H1–H6 harness caveats | Method | device | Prior 36-phase QA compares against the app's own modules; the new desktop/phone checks use an independent oracle. | Recorded for future evidence reading. |

## What was confirmed clean, independently

- **Dithering:**
  - A spec-written oracle covered 2,407 cases and about 1.02 M pixels with 0 mismatches, and mutating it is detected.
  - Preview vs export: 738 checks with 0 failures.
  - Real sampled tile vs full export: 147,543 samples with 0 mismatches.
  - Strength slider gestures: 10/10.
- **Count:** 80/80 cases match Sharp-decoded native saves. GIF counts are the union of frames, and alpha-zero RGB is never counted.
- **Presets:** Resurrect 64, ENDESGA 32/8, PICO-8, DawnBringer 16 and Ice Cream GB are exact in RGB and order against live Lospec JSON.
- **Spike reproduction:** non-timing JSON is identical, and 143/144 images are byte-identical (the one difference is a stale caption).
- **Desktop Chromium real app:** 20/20 phases, with native PNG/GIF/ZIP saves checked against an independent oracle.
- **Pixel 8 Pro / Brave real app:** 5/5. Keep, dither and 1 Mi-pixel saves are byte-identical before and after the fixes.
- **Builds:**
  - Round 1 reproduced the historical shipping `index.html` hash `16d2776e…`.
  - The new build is `67b5a088…`.
  - `npm test`: 930 passed, 2 gc-gated skips.
  - `palette-qa.mjs` with `BASE_REF=f08d4d3`: passed.

## PixelLab comparison (this audit)

- **Cost:** 11 reductions (10 REST, 1 MCP) used 1.1 subscription generations; the balance went from 5,626.1 to 5,625.0. USD credits were unchanged and the three rejected 422 requests were not charged.
- **Method:** synthetic held-out fixtures; all 50 PNGs decoded with Sharp/libpng.
- **Agreement:** both keep alpha bytes and unchanged frame regions, and MCP equals REST pixel for pixel.
- **Colorfetti is better at:** near-lossless K16 (99.7% of source pixels exact vs 78.6%) and lower point error in every case. This metric is the one Colorfetti minimizes.
- **PixelLab is better at:** keeping the tabard and eyes at K8 and more coherent skin on fixed palettes.
- **Dither strength:** the two products' strength scales do not map onto each other.
- **Website:** signing in is still required, so no new website output was made.

No universal superiority claim is supported in either direction.

## Smart colors (research only)

No officially callable REST/MCP surface recolors an existing image with Smart. `smart`
exists only on `/generate-image-v2`, which makes new art. The installed extension
reports 0.4.130 but is a modified checkout over v0.4.119, so it is not a verified
release. **Existing-image Smart is human-deferred; decision: insufficient evidence.**
The procedure (knight fixture, ENDESGA 8 and PICO-8 targets, dither Off, ordinary
reduction vs Smart, native 1× PNGs) is in the
[service report §7](2026-10-15-claude-audit-service.md#7-smart-colors-beta-research-decision).
No integration, credential or UI was added.

## Remaining, prioritized

1. S1 Keep alpha weighting: needs a product decision and real Keep art before any spec change.
2. S2 hue coverage under caps: a held-out case for the deferred locks research.
3. Human-only: the Aseprite Smart procedure; a signed-in PixelLab website session for website cases.
4. Coverage gaps: stock Firefox (including Android), real Safari/iOS (out of scope), sustained thermal and whole-memory measurements.

Phone cleanup, if wanted: `/sdcard/Download/clamv9*` and `claprobe-sprite-palette.png` are audit files.

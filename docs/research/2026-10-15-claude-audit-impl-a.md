# Claude audit, Implementation Reviewer A: dithering, strength, Keep/Cut

October 15, 2026. Range `f08d4d3..e87a853` (HEAD, clean tree except audit outputs).
Ownership: `5124e77`, `e146f83` (ordered full-palette dithering + strength UI),
`ba357c3` (Keep/Cut opacity), `aa602f0` (test-only atomic partial-alpha GIF/ZIP).
No `src/` file was edited. Scripts and outputs: `bench/claude-audit-2026-10-15/impl-a/`.

## Result

**No reproducible production defect in this ownership area.** One design tradeoff
(D1) is documented, specified behavior with a measurable adverse case; two test
gaps (G1, G2) are worth closing. Prior audit claims in this area were independently
confirmed, not merely repeated (table at end).

## What I ran (independent of the module's own expected values)

| Script | What it checks | Result |
|---|---|---|
| `dither-oracle.mjs` | Spec-written oracle: recursive Bayer `B2n=[[4B,4B+2],[4B+3,4B+1]]`, own sRGB/Oklab, 4-candidate ranking, strength interpolation, 0.03 point penalty, 3 occupancies/pair; brute-force nearest with exact-first. Palettes 1/2/3/4/5/8/16/64/255/256; noise (memo bypass), ramp, sprite; Off/2×2/4×4/8×8; strength 0/1/50/99/100; Oklab/RGB; Cut 1/128/255 and Keep; alpha 0/1/127/128/254/255; sampled sizes 1×1, (w−1)×(h−1), w/3×h/2; async 128-px slices vs sync; 4097×3, 3×4097, 8191×2 sampling. | 2,407 cases, 1,018,368 pixels, **0 mismatches** (indices, empty, Keep alpha bytes, `used`, `hasTransparency`, colorize alpha, sample agreement). Mutation check: swapping Bayer quadrant offsets or dropping the penalty → 60+ failures, so the oracle is sensitive. |
| `preview-export-agreement.mjs` | Tile-emulated preview (limit + Cleanup keyed by effective cut, quantize with raw cut + mode, `applyCleanup`) vs real `fullPaletteImage` export, 144 settings (dither × strength × Keep/Cut × Cleanup × cap 0/4 × metric) × 4 preview sizes; independent **pngjs** decode of every export PNG; sync vs async PNG bytes; exact-member retention; binary-alpha Keep vs Cut PNG and GIF bytes; GIF frames decoded with omggif vs preview path incl. delays; partial alpha only in frame 2 (Keep → `PALETTE_GIF_ALPHA`, Cut → ok) via the lazy `getFrame` path; animation-cache identity for alphaMode/dither/strength/metric, alpha-policy rejection and 3-vs-2 byte accounting. | 738 checks, **0 failures**. Keep partial → color type 6 (72/72); Cut → indexed (72/72). `probe-nonvacuous.mjs` confirms the fixture really exercises a 4-color subset, 24 Cleanup replacements and 253–383 dither-changed pixels. |
| `browser-sampled-preview.mjs` (Chromium 1228, sandboxed, Vite on 5340) | Real Tile canvas of a 1501×703 source (sampled to 561×263) with PICO-8, cap 6, Cleanup On, 4×4/60, Keep, RGB matching, vs Node full export sampled at `floor((i+.5)·W/mw)`. | 147,543 samples: **0 RGB, 0 alpha mismatches**; no page errors. |
| `strength-gesture.mjs` (same browser) | Dock pausedCommit: no commit before 200 ms; commit after pause; pointercancel, panel close, pattern change, palette step (ArrowRight) and Reset each discard the pending draft; keyboard commits immediately; real mouse drag commits on release; Save after an abandoned draft exports the committed strength (decoded PNG = Node expectation at 100, ≠ at 5); Keep Save is RGBA8 with every source alpha byte and the Cut slider hidden. | **10/10 pass.** |
| `kernel-timing.mjs` | Desktop Node, sync, 1024² | Reference only (below). |
| Vitest (TEMP/TMP in `.tmp/impl-a`) | 9 owned files; 8 adjacent (usage, cleanup, limit client, export-drag, save-batch, gesture, preview). | 151/151; 164 passed + 2 existing skips. |

Large seeded fixture `sampled-fixture.png` (SHA-256 `40149bdb…4e30e9`) was deleted after
use; the script regenerates it deterministically.

## Findings

| ID | Severity | Location | Finding |
|---|---|---|---|
| D1 | Low — design tradeoff, **not a bug** (specified) | `src/lib/palette-state.js:49,62,66` (`preparationCut`), `src/App.svelte:224` (Auto) | Keep makes cap/Auto/Cleanup eligibility cut1 with no alpha weighting, so a large faint halo competes equally with opaque art. |
| G1 | Test gap | `src/Dock.svelte:257-290` | Strength pause/cancel/context logic has no unit test; only the existing browser harness covers *committed* `change` events. |
| G2 | Test gap / reachability note | `src/lib/gif.js:129-141`, `src/lib/palette-export.test.js` (aa602f0) | `aa602f0` tests the eager `frames[]` form only; production uses lazy `getFrame`. The partial-alpha GIF guard is also unreachable from current imports (only `image/gif` creates frames; omggif compositing gives alpha 0/255), so it is a defensive invariant. |

### D1 reproduction

`node bench/claude-audit-2026-10-15/impl-a/keep-lowalpha-cap.mjs`: a 20×20 opaque
three-color sprite inside a 40×40 magenta halo at alpha 6 (about 2%), cap 3.

| Mode | Selected subset | Opaque pixels changed |
|---|---|---|
| Cut128 | red, green, blue | 0 / 400 |
| Keep | green, blue, **magenta** | **140 / 400** |

The spec says “maps uncomposited RGB without … alpha weighting” and “Auto, subset
selection and Cleanup include all alpha-positive pixels”, and
`palette-alpha.test.js` asserts the unweighted behavior. So this is intended. The
risk is real on glow/shadow sprites. **No fix is proposed without a real-art cohort.**
A candidate, if a later decision wants it, is alpha-weighting histogram mass in
Keep (limiter and Auto cores) while keeping cut1 eligibility. That changes Auto/cap
semantics and cache identities, and needs held-out evidence. Owner: the product
decision. Missing evidence: real anti-aliased or glow sprites where Keep is chosen.

### G1 proposed test (not applied)

Extract the guard as a small pure helper and test it, or keep
`strength-gesture.mjs` as a retained QA phase. Minimal option: move the decision into
`src/lib/gesture.js` with a test:

```diff
+// gesture.js
+export const commitAllowed = (context, live) => context.palette === live.palette
+  && context.mode === live.dither && live.dither !== 'none' && live.family === 'full-palette' && live.panel === 'style';
```

Tests: a pending value is dropped on cancel, on a changed palette or mode, and when
the panel is closed. It is flushed on change/pointerup and committed after 200 ms.
Tradeoff: a little indirection in Dock. The browser script already demonstrates
the current behavior, so this is optional.

### G2 proposed test (not applied)

```diff
 // palette-export.test.js
+  it('downloads nothing when a lazily produced GIF frame has partial opacity', async () => {
+    const result = downloads(), palette = colors(2);
+    await expect(saveAll([{ name: 'a.png' }, { name: 'b.gif' }], item => item.name.endsWith('.png')
+      ? still(palette, [0])
+      : { name: item.name, colors: palette, family: 'full-palette', w: 1, h: 1, frameCount: 2,
+          getFrame: async i => ({ indices: Uint16Array.of(0), alpha: Uint8Array.of(i ? 127 : 255), delay: 100 }) }
+    )).rejects.toMatchObject({ code: 'PALETTE_GIF_ALPHA' });
+    expect(result.captured).toEqual([]); expect(result.clicked).toEqual([]);
+  });
```

My `preview-export-agreement.mjs` already confirms this behavior through the real
`fullPaletteImage` → `encodePaletteGif` path.

## Verified clean (independently)

- **0 strength == Off == nearest** for both metrics, sync and async. `enabled`
  requires mode≠none, strength>0 and size>1 (`quantize.js:98,119`).
- **Exact members:** every source RGB in the active palette or subset keeps its
  entry under every mode, strength, metric, cap and Cleanup. The Cleanup veto keeps
  exact RGB.
- **Bayer** equals the canonical recursive matrix, and its phase follows source
  coordinates. A sampled preview equals the full export at the identical coordinate,
  including a real browser Tile and extreme aspect ratios.
- **Plan packing** at index 255 and 8×8 weights up to 63 is correct; the memo
  bypass on photos does not change results.
- **Alpha:** empty iff alpha < effective cut (Keep = 1). Keep bytes equal the
  source alpha. Cleanup preserves `alpha` and never touches empty pixels.
  `inspectAlphaPixel` invariants hold.
- **PNG:** RGBA8 only when an output alpha is partial. Binary Keep is byte-identical
  to Cut128. Sync and async bytes are identical. Independently decoded RGB/alpha
  is exact.
- **GIF:** binary Keep is byte-identical to Cut. Partial alpha fails before writer
  creation and again on replay. A ZIP downloads only after every file encodes.
- **Identities:** dither, strength and alphaMode enter the snapshot (frozen), usage
  key, drag key (`App.svelte:767`), animation cache `same()`, and Tile
  completed/retained record. Limit, Cleanup, Auto and failure inputs use the
  effective cut consistently in preview and export.
- **Strength UI:** the pause, release and cancel paths behave as the spec says
  (browser receipts).

## Prior audit claims (docs/research/2026-10-15-palette-handoff-implementation-audit.md)

| Claim | My result |
|---|---|
| Indexed output stays in active target; exact RGB bypasses mixtures | **Confirmed** (oracle, 256-color and subset cases) |
| Bayer uses source x/y; no cross-frame state | **Confirmed** (oracle and GIF frame decode) |
| Strength 0/Off preserve nearest | **Confirmed** |
| cut1 for generation, subset and Cleanup in Keep; independent Keep quantization | **Confirmed**, with D1 as its consequence |
| Cache reserves extra alpha byte | **Confirmed** (budget fits Cut, rejects Keep) |
| PNG switches to RGBA when needed; both GIF passes refuse partial opacity | **Confirmed**; added that the GIF guard is currently unreachable from imports (G2) |
| “130 tests passed” | Superseded: 151 in my 9-file set, plus 164 adjacent; passing tests alone not relied on |
| Phone 1 Mi px 8×8: 1.04 s (8) / 2.06 s (256) | Not re-measured on the phone (outside my ownership). Desktop Node sync reference: noise 1024², nearest vs 8×8/100 = 53/638 ms (8 colors), 175/922 (64), 736/2772 (256). Sprite (memo hits) ≈ 25–35 ms either way. Cohorts differ, so this is not a comparison. It confirms the cost is per pixel when the memo is bypassed. |

## Limits

Chromium desktop and Node only. No phone, WebKit or Safari run by this reviewer.
Canvas readback was used only for a sampled-preview comparison where partial-alpha
RGB was excluded (premultiplied rounding). The Opacity-cut slider, Count and
Lospec are outside this ownership. No universal correctness claim.

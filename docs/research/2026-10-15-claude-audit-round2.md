# Claude audit, round 2 (final): adversarial challenge of round-1 fixes and dispositions

Date: October 15, 2026. Range: `f08d4d3..HEAD` (HEAD `d20d7ca`). Reviewer: round-2
challenger. Scope: fixes `376a55c`, `7fad4e7` and `d20d7ca`, plus the orchestrator's
proposed dispositions. No `src/` or docs other than this file were edited. Nothing was
committed and `dist/` was not built. Every script and output is under
`bench/claude-audit-2026-10-15/round2/`.

## Result

**No defect found in any of the three fixes. I agree with every proposed disposition.**
Two dispositions now rest on stronger or corrected evidence:

- **S1/D1 is still deferred, but the evidence adds weight.** Under Keep, Auto is now
  shown to depend on the browser engine.
- **F2 is reclassified.** It is not a stuck viewer. In all three engines, the viewer
  closes once a visible tooltip has been dismissed. The only WebKit-specific difference is
  one extra Escape on the nested editor.

## 1. `376a55c`: Firefox partial-alpha PNG decoding

**Verdict: agree. The fix is correct, narrow and safe.**

### Metadata matrix

Script: `decode-metadata-matrix.mjs` (output `.out.json`). It covers 17 PNG variants:

- plain, sRGB chunk, gAMA 1.0, cHRM BT.2020 + gAMA
- iCCP: Display P3 (Sharp), a 256-entry table-TRC custom profile, ProPhoto with gamma 1.8,
  a garbage profile, and the Windows sRGB `.icm`
- cICP: sRGB, P3, linear, BT.2020 PQ, limited range, unspecified
- indexed + tRNS, gray + alpha

Each variant ran through the real `decodeImageFile` in three engines: Chromium 149 (sandbox
on), Firefox 153 and WebKit 26.5.

- **Chromium never reports an all-null color space.** The most stripped case is ProPhoto
  ICC, which gives `primaries:null, transfer:null, matrix:'rgb', fullRange:true`. That
  keeps it on the managed copy, which is correct. Chromium therefore never takes the noisy
  canvas path (H4: Brave farbling), and the rule correctly requires all four fields to be
  null. An "any field null" rule would have wrongly diverted P3, ProPhoto and BT.2020
  images. Edge and Brave share this engine, but I did not run them.
- **Firefox reports all four fields null for every variant,** including iCCP and cICP.
  There is no partial-metadata case in which premultiplied data could slip through. In
  every case the app output equals Firefox's own canvas output, and the managed copy that
  the old code used is premultiplied.
- **WebKit has no `ImageDecoder`,** so it is unaffected (app output equals canvas).

### Firefox precision after the fix

Script: `firefox-precision.mjs`, 256² uniform random RGBA. The ideal column is the best any
8-bit premultiplied pipeline can do, `round(round(c·a/255)·255/a)`.

| alpha | app mean abs RGB error | ideal 8-bit premultiplied |
|---|---|---|
| 1–3 | 75.7 | 38.2 |
| 4–15 | 15.3 | 7.9 |
| 16–63 | 3.25 | 1.85 |
| 64–127 | 0.91 | 0.67 |
| 128–254 | 0.25 | 0.25 |

- **At alpha ≥ 128 the result is ideal. Below that it is about twice the ideal error.**
  Gray (10, α1) decodes as (255,255,255,1): Firefox's premultiply rounds up, so any nonzero
  channel at α1 becomes 255.
- **The remaining low-alpha loss is in the engine.** No better path is available without
  WebGL (already rejected) or a JS PNG decoder.
- **Do not unpremultiply the copied frame in-app.** A future Gecko that fixes
  premultiplication but still reports null metadata would then be double-unpremultiplied,
  which is catastrophic. The canvas path is the robust choice.

### Cost: Firefox now decodes twice

Script: `firefox-double-decode.mjs`, 2048² high-entropy PNG (17.7 MB). The app path takes
91–99 ms, against 48–51 ms for canvas alone. The discarded ImageDecoder decode costs about
45 ms per 4 MP. This is acceptable. Avoiding it would need engine sniffing, which is not
worth it.

### Resources, cancellation, tests and palette import

- **Resources and cancellation:** when the branch is skipped, the code leaves `try`
  normally. `finally` then removes the abort listener and closes both the frame and the
  decoder, and `checkCanceled` runs before `createImageBitmap`. A mid-decode abort closes
  the decoder through the listener and rethrows `AbortError`. The new unit case asserts both
  closes.
- **The test changes do not mask anything:**
  - `image-import-client.test.js` stubs `createImageBitmap` to throw "Native PNG must not
    use canvas". The `{primaries:'bt709'}` partial metadata is therefore required to keep
    those tests on the native path, and any accidental fallback would fail loudly.
  - The default mock `incomplete` keeps the existing managed-copy cases meaningful.
  - The old "unknown space → managed" case was asserting the defect, so removing it was
    correct.
- **Palette-image import shares the fix.** `palette-decode.js:35` calls the same
  `decodeImageFile`. All three callers (`App.svelte:523`, `image-import-client.js`,
  `palette-decode.js`) run on the main thread, so the `document` canvas fallback is
  available. No worker imports `image-decode.js`.
- **Evidence-quality note:** `orch/firefox-decode-check.mjs` and the commit message's
  "seeded 256x256 random RGBA" use `seed * 1103515245`. That product exceeds 2^53, so the
  sequence is skewed: 7 pixels at α=255 instead of about 256. The before/after comparison
  is still valid on that fixed input. Use `Math.imul` in future seeded generators. The
  round-2 scripts do.

## 2. `7fad4e7`: Lospec routing

**Verdict: agree. There are 0 non-canonical fetch destinations across 46 adversarial
inputs.**

Script: `lospec-routing.mjs`, run against the real modules.

- **Accepted and canonicalized:** leading or trailing whitespace, CRLF, a trailing newline,
  NBSP padding, `http://`, `HTTPS://LOSPEC.COM/PALETTE-LIST/SLSO8`, `?foo`, `#frag`,
  `.json`, `www.` with a trailing slash, and `?u=https://evil.test`. All of these fetch
  exactly `https://lospec.com/palette-list/<slug>.json`.
- **Routed, then rejected with the Lospec guidance error:**
  - other hosts: `https://evil.test/x`, `lospec.com.evil.test`, `lospec.com@evil.test`,
    `user@`, `:443`
  - other schemes: `ftp://`, `JAVASCRIPT://…`, `abc123://x`
  - bad paths: `lospec.com/`, `https://lospec.com/`, `../`, `%2e%2e`, `.hex`, `-bad`,
    `a--b`, a 121-character slug
  - a trailing zero-width space
- **Kept on the local parser:** HEX tokens, `data:`, `javascript:alert(1)`, bare
  `lospec.com` / `www.lospec.com`, `//lospec.com/...`, a URL followed by a word, two links
  on two lines, and a GPL/paint.net file with a URL comment line.
- **No new network destination:** `fetchLospecPalette` still uses `redirect:'error'`,
  `credentials:'omit'` and `no-referrer`. `canonicalLospecUrl` now also accepts scheme-less
  stored values, but it always returns the canonical https URL.
- **Cosmetic only:** two links pasted on two lines now get the HEX parse error instead of
  the Lospec guidance error. Bare `lospec.com` gets the HEX error too. I propose no change.

## 3. `d20d7ca`: documentation

**Verdict: agree.** I checked every changed statement against the current source:

- **Recolor wording:** the title is "Recolor" (`Dock.svelte:468`). Help step 3 is
  "Recolor: Tune matching, color limits and dithering" (`App.svelte:1114`).
- **Row order** in `Dock.svelte:474-540`: Max colors, Matching, Cleanup, Dithering,
  Dither strength (only while a pattern is enabled), Opacity Cut/Keep (`soft || keep`),
  then Opacity cut (`!keep && (soft || cut≠128)`).
- **Reset** (`Dock.svelte:208`): Oklab, All, Cleanup Off, Dithering Off, strength 50, Cut,
  cut 128. It also resets `lastMaxColors=16`, which is internal and fine to leave
  unmentioned.
- **Presets:** both new presets exist (`palette-library.js:56,60`).
- **Link anchors:** all seven re-anchored links point to the described code (`App.svelte`
  #L818 copy, #L923 paste, #L937 keydown; `save.js#L247 copyOne`; `palette-state.js#L36`
  conversionSnapshot, #L42 fullPaletteImage; `PaletteImport.svelte#L199` paste).
- **M-1 note:** matches the research report's reruns (238.9/252.9 and 258.5/285.7 ms).
  The rest of the M/L/C status notes match their findings.
- **Neutral spikes stay vendor-free.** A case-insensitive search for PixelLab, its API
  host, the extension path, `palette-service-research`, `palette-paired`,
  `auto-refinement-comparison`, `service-comparison` and `lexius` finds nothing in
  `docs/research/palette-improvement-spikes-2026-10-14/`. The new status lines link only to
  `palettes.md` and the spec.
- **Minor, no change needed:** the Reset tooltip (`Dock.svelte:469`) says "the default
  opacity cut". It does not name dither strength or Cut mode.

## 4. Dispositions

| Item | Round-2 position | Evidence and reason |
|---|---|---|
| S1/D1: Keep α≥1 pixels count fully in Auto and cap selection | **Agree to defer, with higher priority.** | See the S1/D1 notes below the table. |
| S2: cap drops tabard and eyes on the held-out knight | **Agree to defer.** | One fixture cannot justify an algorithm change. It belongs to the lock/hue-coverage research. |
| F1: WebKit fallback precision | **Agree.** Known and quantified, no new fix. | My matrix shows WebKit app output equals canvas on all 17 variants. |
| F2: WebKit Escape after Count → Use N → close editor | **Agree there is no fix, but reclassify as Info.** | See the F2 notes below the table. |
| G1: no unit test for the dither-strength `pausedCommit` wiring | **Agree.** | `pausedCommit` itself is tested in `gesture.test.js`. The Dock wiring passes 10 of 10 cases in `impl-a/strength-gesture.out.json`: pause, cancel, close, pattern change, palette step, keyboard, Reset, drag release, Save and Keep. |
| G2: lazy `getFrame` GIF alpha test | **Agree it is redundant.** | `gif.js:150` wraps eager `frames[]` into the same `getFrame` path. `palette-export.test.js:44-47` covers the lazy re-check, and the test at :294 covers ZIP atomicity. |
| B-4: bidi/control characters in Lospec names | **Agree, no fix.** | Svelte renders names as text. The only filename sink is the HEX backup (`PaletteImport.svelte:189`), which replaces `[^\w -]`, so a right-to-left override cannot disguise an extension. |
| Research M-1..M-3, L-*, C-* applied as notes; C-9 and C-11 left | **Agree.** | C-9 is low risk because the decision is conservative. C-11 is a receipt label, and the docs are right. |

**S1/D1 notes:**

- **Repo exposure:** `keep-exposure-scan.mjs` scanned 393 tracked images. Nothing in
  `public/` or `src/` has faint pixels. All 21 hits are synthetic alpha-band test
  fixtures. No real repo sprite is affected.
- **New evidence: under Keep, Auto depends on the engine.** `keep-auto-engines.mjs` decodes
  `spill-alpha1.png` with the real decoder and runs the real Auto accumulator. The 508
  α1 pixels decode differently in each engine, and each value takes a palette slot:

  | Engine | α1 pixels decode as | Keep Auto palette |
  |---|---|---|
  | Chromium | `#00ff40` | `#00ff40 #dc5a14 #ff8a1e #fff3b0` |
  | Firefox | `#00ffff` | `#00ffff …` |
  | WebKit | `#00ff00` | `#00ff00 …` |

  Cut Auto is identical in all three engines.
- **No smaller fix is obviously correct:**
  - Alpha-weighting needs fractional mass in an accumulator that relies on integer
    largest-remainder rounding and order-independence. It would also need to reach
    `palette-limit` and Cleanup.
  - Having Keep reuse the Cut threshold for eligibility is a one-line change in
    `preparationCut`. However, it uses the cut-slider value that Keep hides, and it changes
    specified semantics.
- **Both are spec decisions.** The deferral should cite the cross-engine result as a
  reason to raise its priority.

**F2 notes:**

- **Reproduction:** `escape-nested-dialogs.mjs` runs the dev server of current `src` in
  Chromium, Firefox and WebKit, and records open dialogs, the focused element and visible
  tooltips.
- **The behavior in every engine:** closing the editor restores focus to the viewer's Save
  button. That focus shows its `:focus-visible` tooltip. The first Escape dismisses the
  tooltip, because `tooltip.js:23-28` is designed to "first dismiss the tooltip, then its
  panel or dialog". The next Escape closes the viewer. The same happens with no nested
  editor: press Tab, then Escape twice.
- **WebKit-only:** the first Escape on the nested editor is ignored, so 4 Escapes are
  needed in total instead of 3. The device script stopped one Escape short. Its refocus
  step could also re-show a tooltip.
- **Result:** the viewer is never stuck. The app does not have a cross-browser focus bug.

## What I did NOT verify

- **Untested engines:** stock Firefox desktop, Firefox Android/Gecko, Edge, Brave and real
  Safari/iOS. Every engine result above is Playwright Chromium 149, Firefox 153 or
  WebKit 26.5 on Windows.
- **No physical-phone rerun.** No built-`dist/` regression or full `npm test` was run in
  this round.
- **No end-to-end Firefox UI import.** The fix was checked at the shared `decodeImageFile`
  boundary. A file was not dropped into the Firefox app wall or palette editor, and no
  native download was decoded.
- **Not tested at the Count or export level:** the S1 engine dependence was shown for
  Auto, not for Max colors subset selection or Cleanup under Keep. It applies there by the
  same mechanism, but that is inference.
- **No HDR/PQ correctness judgment.** The BT.2020 PQ cICP case was only checked to stay off
  the canvas path in Chromium.
- **No live Lospec or PixelLab requests** were made in this round.
- **Tests run:** targeted Vitest, 6 files and 106 tests passed (`image-decode`,
  `image-import-client`, `palette-lospec`, `palette-decode`, `palette-import`,
  `palette-library`) with TEMP/TMP set to `.tmp/r2`.

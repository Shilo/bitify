# Claude audit, round 1: Implementation Reviewer B

Date: October 15, 2026. Repository HEAD `e87a853`; range `f08d4d3..HEAD`.
Ownership: `884afbf`, `9ab4dcf`, `e5b5b5a`, `33dfb37`, `a825fcb`, `e3710e4`,
`256ad1e`, `55c32cc`, `d37d8b7`. No `src/` edit, build, commit or revert was made.
Scripts and raw outputs: `bench/claude-audit-2026-10-15/impl-b/`. Generated PNG
fixtures are under the ignored `.tmp/impl-b/png/`; `decode-browsers.mjs` writes them
and must run before the other decode scripts.

## Findings

| ID | Severity | Location | Summary |
|---|---|---|---|
| B-3 | **High** (existing before this range, in an owned file) | `src/lib/image-decode.js:38-70` | Firefox's ImageDecoder returns premultiplied BGRA with an all-null `VideoColorSpace`. The "managed" `copyTo` returns that premultiplied RGB unchanged, so every partly transparent PNG imported in Firefox is darkened. |
| B-2 | Low-Medium (regression from `a825fcb`) | `src/lib/palette-lospec-url.js:20-26`, `src/PaletteImport.svelte:37,110` | Pasted GPL text with a URL in a comment line now goes to Lospec import and fails, although the local parser accepts it. |
| B-1 | Low (`a825fcb`) | `src/lib/palette-lospec-url.js:3,25` | The router accepts a scheme-less `lospec.com/palette-list/x` link and labels the button "Import from Lospec", but the parser rejects that link. |
| B-4 | Informational | `src/lib/palette-lospec.js:36-47`, `palette-library.js:78` | Lospec names and credits keep bidi overrides and C1 controls. `sourceOf` slices the credit by UTF-16 units and can split a surrogate pair. The effect is cosmetic and local only. |

### B-3: Firefox PNG import premultiplies partial-alpha RGB

- **Reproduction:**
  - `node bench/claude-audit-2026-10-15/impl-b/decode-browsers.mjs`
  - `node bench/claude-audit-2026-10-15/impl-b/decode-firefox-probe.mjs`
  - `node bench/claude-audit-2026-10-15/impl-b/decode-firefox-error.mjs`
  - Outputs are in the matching `*.out.json` files.
- **Fixtures:** the script writes its own PNGs with a separate encoder, so the expected bytes are known exactly. It covers RGBA8, sRGB, gAMA, RGBA16, gray+alpha, indexed+tRNS and random 1024×1024 RGBA with odd alpha.
- **Observed in Playwright Firefox 153.0 (build 1538):**
  - The frame has `format: 'BGRA'` and `colorSpace` `{primaries, transfer, matrix, fullRange}` all `null`.
  - `nativeSrgb` is therefore false, and the code takes `copyTo({format:'RGBA', colorSpace:'srgb'})`. That copy returns premultiplied values. For example, (100,150,200,127) becomes (50,75,100,127), and (17,34,51,64) becomes (5,9,13,64).
  - The raw and managed copies are byte-identical, and `premultiplyAlpha: 'none' | 'default' | 'premultiply'` has no effect.
- **Expected vs actual on random1024, comparing the app's `decodeImageFile` with Firefox's own canvas fallback (`createImageBitmap` + `getImageData`):**

  | Measure | App (`decodeImageFile`) | Canvas fallback |
  |---|---|---|
  | Mean absolute RGB error | 63.06 | 3.09 |
  | Exact pixels | 0.96% | 25.48% |
  | Mean worst-channel error, alpha ≥ 128 | 46.27 | 0.52 |

- **Impact:**
  - Artwork import goes through `image-import-client.js` and `App.svelte:523`, and palette-image import goes through `palette-decode.js`. Both use this function.
  - Antialiased edges, soft shadows and any Keep output therefore match against darkened RGB. Opaque pixels are unaffected.
  - Chromium 149 (sandbox on) is exact on all seven fixtures. This confirms `d37d8b7`'s raw path is correct there, including at alpha 1.
  - WebKit has no ImageDecoder and uses the known lossy canvas fallback, which was not re-litigated here.
- **Origin:** the native path predates the range (`e23380c`). `d37d8b7` correctly refused the raw copy for Gecko, but it assumes the managed fallback is safe, and it is not.
- **Proposed fix (verified as a copy, not applied):** `bench/.../image-decode.candidate.diff`.
  ```diff
           dimensions(width, height);
  +        // Gecko exposes an all-null VideoColorSpace and premultiplied BGRA that
  +        // neither copy path unpremultiplies. Use the bitmap/canvas decoder instead.
  +        const space = frame.colorSpace;
  +        if (!space || ['primaries', 'transfer', 'matrix', 'fullRange'].every(key => space[key] == null))
  +          throw new Error('Unknown native frame metadata.');
  ```
- **Verification of the fix:** `decode-candidate-verify.mjs`.
  - Firefox improves from 63.06 to 3.09 mean error, matching canvas quality.
  - Chromium stays at 100% exact.
  - `decode-icc.mjs`: a P3-tagged PNG in Chromium reports `primaries: null` but sets the other fields. It therefore stays on the managed path, and the candidate output equals the current output and the canvas output byte for byte. This is why the guard requires all four fields to be null rather than any one.
- **Tests to add or change:**
  - Make the "unknown space" and all-null mocks in `image-decode.test.js` expect the canvas fallback. Those mocks currently assert managed copy, so the tests mirror the defect.
  - Keep the P3-like partial-metadata case on the managed path.
  - Add a Firefox real-browser regression to the built QA harness if Firefox is adopted as a tested target.
- **Tradeoffs and gaps:**
  - Verified only on Playwright's patched Firefox build. Stock Firefox desktop and Firefox Android (Gecko) were not run.
  - If a future Gecko fixes premultiplication but still reports null metadata, it stays on the canvas path, which only means canvas rounding.
  - Firefox fallback precision is still lossy at very low alpha.

### B-2: pasted GPL with a URL comment is routed to Lospec

- **Reproduction:** `node bench/claude-audit-2026-10-15/impl-b/lospec-adversarial.mjs`.
- **Input:** `GIMP Palette\nName: Example\n#Description: from https://example.test/palette\n#Colors: 2\n0 0 0\tblack\n255 255 255\twhite`.
- **Expected:** the text stays on the local path. `parsePaletteText` returns `['#000000','#ffffff']`, which is the behavior before `a825fcb`.
- **Actual:**
  - `looksLikeLospecReference` returns true, because `/:\/\/.../` matches anywhere in the text.
  - The button reads "Import from Lospec", and `importText` calls `importLospec`.
  - `lospecReference` throws "Use a Lospec palette link…", so a valid palette cannot be pasted.
  - File import is unaffected.
- **Fix (with B-1):** `bench/.../palette-lospec-url.candidate.diff`.
  ```diff
  -const LINK = /^https?:\/\/(?:www\.)?lospec\.com\/palette-list\/...
  +const LINK = /^(?:https?:\/\/)?(?:www\.)?lospec\.com\/palette-list\/...
  ...
  -  return /:\/\/|^(?:www\.)?lospec\.com\//i.test(text);
  +  // One link-like token only: multi-line palette text with URL comments stays local.
  +  return /^(?:[a-z][\w+.-]*:\/\/|(?:www\.)?lospec\.com\/)\S*$/i.test(text);
  ```
- **Verification of the fix:** `lospec-adversarial.candidate.mjs` passes 45 of 46. The remaining failure is the informational B-4. The candidate also satisfies every expectation in the existing `palette-lospec.test.js`: the six local inputs, the four routed inputs, all rejects, and a null slug-only canonical link.
- **Tests to add:**
  - GPL or HEX text with a URL comment stays local.
  - `lospec.com/palette-list/SLSO8` and `www.` forms parse to the canonical https link.
- **Tradeoff:** a sentence that contains a link now gets the HEX parse error instead of the Lospec link error. This is acceptable.

### B-1: scheme-less link mismatch

Same reproduction script. The router routes `lospec.com/palette-list/slso8` and
`www.lospec.com/palette-list/slso8` to Lospec, but the parser's slug is `null`. The
user sees an "Import from Lospec" button and then an error telling them to use a link.
The fix and tests are shared with B-2. The persisted link is still always rebuilt as
canonical `https://lospec.com/palette-list/<slug>`.

### B-4: informational

The name `evil‮gnp.exe\u0085` survives `plain()` and `validateName`. A credit of
100 emoji is 200 UTF-16 units, and `sourceOf`'s `.slice(0,160)` can split a surrogate
pair when the code-point boundary is odd. If a fix is wanted, the smallest one is to
strip `[\u0080-\u009f‪-‮⁦-⁩]` in `plain()` and slice by code
points in `sourceOf`. This is not recommended unless names are ever shared or exported
outside local UI.

## Verified clean (with independent checks)

- **`884afbf` presets** (`presets-check.mjs`, `lospec-live-endesga8.mjs`, one live request):
  - ENDESGA 8 matches Lospec's canonical JSON exactly and in order. The response was 200, with no redirect, `ACAO: *` and `application/octet-stream`.
  - Black & white is `#000000,#ffffff`.
  - The 11 IDs are unique, prefixed and stable, and do not collide with `generated-32`.
  - All color sets are distinct, counts do not increase, and the objects are deeply frozen.
  - The rail order matches CLAUDE.md, and the default fallback is still `preset-edg32`.
- **`9ab4dcf` Count** (`count-oracle.mjs`, 80/80 pass):
  - Count was compared with an independent Sharp decode of the actual exported PNG or GIF.
  - The matrix covered 2 palettes × Cut/Keep × dither none/4×4 × cap All/2 × Cleanup Off/On, across a two-frame GIF, a partial-alpha strip and a gradient.
  - The GIF union is larger than the first frame alone (8 versus 7), so frame 2 is counted.
  - Hidden alpha-0 RGB is never counted, and alpha 1/64/127/254 is counted under Keep.
  - Cleanup rebuilds `used`.
- **`9ab4dcf` cancellation:**
  - Reviewed by reading only, without an executable App harness.
  - `usageKey` includes alphaMode, cut, metric, cap, cleanup, dither, strength and colors, or the Auto request key in place of the swatches.
  - The `$effect` aborts and drops records on a key change or item removal, and `publish` re-checks the controller, key, item and record identity.
  - An AbortError never publishes.
  - The unit test for cancellation between frames exists. App-level races still need the device or in-browser harness.
- **`33dfb37` Use N:** the `output-colors` ID is not `user-`, so `forceCopy` saves a new record and never overwrites a library entry. The name stays at 64 code points or fewer. The action is a no-op while the editor is open.
- **`e5b5b5a`:** this is markup only. With the reorder, a narrow `.dim` cuts the dimensions before the count. As an observation, a "Retry needed" mark that coexists with a completed count would be truncated first, but the Dock keeps persistent guidance. Layout was not measured here and is left to the device reviewer.
- **`e3710e4`:**
  - No `getImageData`, `toDataURL` or `toBlob` exists in `palette-preview.js` or the Svelte sources that use it.
  - The canvases are paint-only.
  - Strict `#RRGGBB` validation precedes painting.
  - The native `<input type=color>` keeps its hit target under the pointer-inert canvas.
- **`256ad1e` clipboard** (`clipboard-timing.mjs`):
  - 30 timing × platform cases: already-rejected, microtask, macrotask, thenable or resolving PNG, against missing clipboard, a throwing ClipboardItem, a sync-throwing write, an early-rejecting write and a consuming write.
  - None produced an unhandled rejection.
  - A false success happens only with an artificial `write` that ignores its item. A real clipboard consumes the promise, and the behavior was the same before.
- **`55c32cc`:** the guidance appears only for full-palette mode with Keep and `soft`, which is true when any alpha is strictly between 0 and 255. That is exactly when output can be translucent. GIFs cannot carry partial alpha.
- **`d37d8b7` in Chromium:**
  - Raw copy is exact on low alpha, gAMA, 16-bit, gray+alpha, indexed+tRNS and 1 Mi random pixels.
  - Managed copy would have lost precision, for example (201,13,77,1) becoming (255,0,0,1).
  - The longest timer gap during the 1 Mi BGRA swap was 0 ms.
  - The ICC-tagged P3 frame keeps the managed path, matching color-managed canvas.
- **Targeted Vitest:** 6 files, 138 tests pass, with TEMP/TMP set to `.tmp/impl-b`.

## Prior-audit claims

- **Refuted:** "Unknown/non-sRGB metadata takes explicit managed conversion" (handoff implementation audit, line 21) was presented as safe. In Gecko the managed copy is premultiplied (B-3). The `image-decode.test.js` "unknown space" cases mirror the implementation rather than real browser behavior.
- **Refuted in part:** "Only canonical public Lospec palette references become fetch destinations." The fetch-destination part holds. However, the UI router claims inputs the parser rejects (B-1) and captures valid local GPL text (B-2).
- **Confirmed:**
  - Count uses full export conversion with a frame union, Cleanup rebuilding `used`, and alpha-0 excluded. This was checked against an independent decoder, not the module.
  - Lospec acquisition is bounded: 64 KiB streamed or declared, a lying content-length, the exact boundary, abort mid-stream with body cancel, a 50 ms stalled-body timeout, `redirect:'error'`, credentials omitted and no referrer, and malformed or 4xx/5xx/429 responses rejected.
  - Preset exactness.
  - Clipboard rejection ownership.
  - Chromium native-copy exactness.

## Gaps (not bugs)

- No stock Firefox or Firefox Android run.
- No App-level Count race harness in a browser.
- No dense-phone layout measurement.
- No live in-browser Lospec CORS fetch, beyond the `ACAO:*` header seen from Node.
- `AbortSignal.any` (also used elsewhere in the app) sets a baseline of Safari 17.4, Chrome 116 and Firefox 124. Older engines would show the raw TypeError message in the Lospec error line.
- Playwright 1.62 expects headless shell 1234. The run used the installed `chromium-1228` Chrome 149 through `executablePath`, with `chromiumSandbox: true`.

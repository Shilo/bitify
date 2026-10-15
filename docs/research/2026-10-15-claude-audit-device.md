# Claude audit, round 1: device and performance review

October 15, 2026. Range `f08d4d3f6e3df771d17524f00f1bba2e492c4ec0..e87a853` (HEAD, clean tree).
Reviewer role: Device/Performance. I did not edit `src/`, commit, or close the user's tabs.
Every script and receipt is under `bench/claude-audit-2026-10-15/device/`. Generated
multi-megabyte inputs and pulled downloads are in `.tmp/device/` and are not committed.

## Summary

- **No new reproducible production defect** on desktop Chromium or the physical Pixel 8 Pro.
  The native PNG, GIF and ZIP downloads matched an independent oracle byte for byte,
  checking membership and every alpha byte. Count and Use N matched the decoded all-frame
  union. Persistence, Reset, the live Lospec import and the three layouts all passed.
- **The WebKit translucent-RGB loss is a known limitation, now quantified.** Six of the 18
  WebKit phases fail, all on partial-alpha pixels. A truncating premultiply/unpremultiply
  model of the source explains every mismatch exactly (0 residual). Under Keep, alpha-1
  pixels become the darkest palette entry. Even in default Cut128 mode, 3 of 576 sprite
  pixels at alpha 128 pick a different color. This is the documented fallback-precision
  limit, not a regression. The WebGL fix was already rejected. Real Safari is untested.
- **A new low-severity WebKit-only finding.** After opening Use N output colors from the
  image viewer and closing the editor, Escape no longer closes the viewer. Closing the
  viewer with its button still works. No fix is proposed (see F2).
- **The prior kernel-only phone numbers reproduce within about 5%.** Real-app timings, which
  were not measured before, are added below. In those runs no app long task occurred during
  import, Count, cancel, repeated changes or GIF playback. The ~370 ms long task I first saw
  came from Playwright's file-payload injection, not from the app.
- **Harness and method findings** (H1–H6) affect how prior and future evidence should be
  read, including a Playwright-over-CDP download trap on Android.

## Build and tests

- `npm run build` (TEMP/TMP=`.tmp/device`): `dist/index.html` SHA256
  `16d2776e085ab2d3907d055ccf5bd52e2fb20bdd089a7c0a87b2fc19cdb92837`. This equals the
  historical shipping hash, so the build is reproducible. Every asset hash is in
  `build-hashes.txt`, for example `index-D-GtbvAU.js` `07e799c3…`.
- `npm test`: **59 files, 929 passed, 2 skipped, exit 0** (`npm-test.log`). The two skips are
  the GC-gated `skipIf(typeof gc !== 'function')` cases in `palette-cleanup-client.test.js:92`
  and `palette-limit-client.test.js:83`. They are environment-gated, not failures.
- `node bench/palette-qa.mjs dist` with `BASE_REF=f08d4d3…`: **passed**. This covered 132
  legacy exports, 11 full-palette exports, 11 RGB cases and every extra block, with 0 console
  errors (`palette-qa.log`). Before running it I checked where it writes. It writes only to
  `.tmp/palette-qa` and listens on port 0. I ran a copy (`palette-qa.redirected.mjs`) whose
  only changes are the scratch directory `.tmp/device/palette-qa`, port 5311 and re-pointed
  relative imports. The diff is four lines. The baseline legacy assertions held, and
  `save.js`/`gif.js` differ from the baseline only in the full-palette and clipboard paths.
- `bench/palette-improvements-qa.mjs` **writes into the historical evidence directory
  `bench/palette-improvements-review/`**. I ran a copy redirected to
  `bench/claude-audit-2026-10-15/device/improvements-qa/` on port 5312. It passed all 9
  phases, and the historical files were not touched.
- `bench/palette-dither-qa-server.mjs` binds the fixed port 5294, which another process
  already owns, and writes `.tmp/dither-qa`. I did not run it. I reproduced its kernel
  `/perf` probe separately instead (see Performance).

## Desktop real-app results (`desktop.mjs`)

These runs drive the built app: they add files, click real controls, and capture native
downloads through Playwright's download channel. Sharp decodes each file and compares it
with `audit-lib.mjs`. That module is a scalar Oklab/RGB nearest oracle with exact-member-first
and lowest-index ties; it imports no app module. Where no exact oracle applies (dither, cap,
Cleanup, Auto), the check is the contract: every pixel's alpha, membership in the target
palette, and that exact source members stay unchanged. Preview agreement compares the
painted tile against the export at the app's `floor((i+.5)*W/w)` sample coordinates.

| Phase (fixtures: 24² alpha sprite, 128×32 ramp, 48² 4-frame GIF) | Chromium 149 (sandboxed) | WebKit 26.5 (not Safari) |
|---|---|---|
| Fresh visit defaults (Auto `generated-32`, dither none, Cut128) | pass | pass |
| ENDESGA 8 nearest Cut128 Save PNG/GIF vs oracle + preview + GIF delays/loop | pass (0 mismatches) | 3 RGB px at α128 (precision, F1) |
| Same, Keep | pass; RGBA8 PNG, 410 B, SHA `d7b02801…` | 75 RGB px at partial α (F1) |
| 4×4 strength 0 equals nearest | pass | pass |
| 4×4@50 Keep, 8×8@100 Keep, 2×2@50 Cut, 8×8@100 Cut: membership/alpha/exact/preview | pass; dither differs from nearest as expected | Cut pass; Keep: 7 exact members changed (F1) |
| Count on GIF = independent union of decoded frames; Use draft equals it; library unchanged | pass (8 = 8) | pass |
| Max 3 + RGB + Cleanup On: ≤3 colors, members, alpha, stored settings | pass | pass |
| RGB All vs RGB oracle | pass | pass |
| Download all ZIP: names, wall order, oracle | pass | sprite α128 px (F1) |
| Keep ZIP: RGBA PNG + binary GIF | pass | partial-α px (F1) |
| Auto: alpha contract, 2–64 colors (42 used) | pass | pass |
| Reload persistence (RGB, 8×8, 70%, max 6), then Reset → Oklab/All/Off/Off/Cut128, palette kept, strength 50 | pass | pass |
| Live Lospec `endesga-8`: exactly 1 network request to `lospec.com/palette-list/endesga-8.json`; 8 colors equal the preset | pass | not run (one live fetch only) |
| Layouts 320×568 touch, 568×320 touch, 1280×900: no horizontal overflow or row overlaps; Dither strength range 44 px high, inside viewport | pass | pass |

Totals: Chromium **19/19**, WebKit **12/18**. All six WebKit failures are F1, verified by
`webkit/precision-check.json`, where the residual is 0 under the truncation model. I opened
and looked at the screenshots, for example `chromium/layout-568x320-settings-strength.png`,
`-count.png` and `-editor.png`, and `webkit/layout-320x568-*`. The settings panel scrolls to
the strength and Opacity rows in short landscape. The strength label wraps within its 78 px
column, with no clipping. The Count/Use editor stacks above the viewer once its open
transition ends; a screenshot taken mid-transition looked translucent, which is not a defect.
In 568×320 the editor's method tabs sit under the fixed footer until scrolled, as documented.

## Physical Pixel 8 Pro / Brave 155 (`android.mjs`, `results-correctness.json`)

Setup: Android 17, connected over CDP at `localhost:9333` (verified with
`adb forward --list`). The app was served with `adb reverse tcp:5316` and later removed. The
screen was asleep and locked at the start. `KEYCODE_WAKEUP` plus `wm dismiss-keyguard`
unlocked it with no credential prompt, so no human tap was needed. Thermal status was 0
throughout and the battery stayed at 30–31 °C. I opened only my own pages and closed them,
and disconnected without `browser.close()`.

All five phases passed through actual Save gestures in the touch Share sheet. I pulled only
my own Download files, whose names start with `clamv9hq2qh-`:

- Keep nearest sprite PNG plus GIF: 0 alpha and 0 RGB mismatches against the oracle. The GIF
  delays were 100/200/100/300 ms, equal to the source. The sprite PNG **SHA `d7b02801…` is
  byte-identical to the desktop Chromium Keep export**.
- 4×4@50 Cut and 8×8@100 Keep: 0 off-palette, alpha and exact-member errors. The 8×8@100
  Keep sprite (`7d97266c…`) is also byte-identical to desktop.
- Count on an 8×8@100 GIF gave 8, equal to the union of the decoded native GIF frames. The
  Use draft set was equal and the library unchanged.
- A 1 Mi-pixel Resurrect 64 Oklab Save matched the oracle exactly (0/1,048,576 mismatches).
  Click to download-anchor took 858 ms, with 0 long tasks and a 25 ms maximum rAF gap.
- Preview agreement used the ImageData the app painted. Brave changed 160–801 bytes per 24²
  canvas on `getImageData` readback (H4); the painted data had 0 mismatches.

## Performance (phone, sequential, real built app unless marked kernel)

These are single observations, not percentiles. "Throughput" means conversion or paint
rate, not display FPS. `heapMB` is `performance.memory.usedJSHeapSize`, JS heap only; it
excludes native, GPU and decoded memory. Input hashes are in the `fixtures` block of each
JSON file. Build: `16d2776e…`.

**Import to first usable preview.** The time runs from the file input's `change` event to
the first painted tile whose visible pixels are all palette members. The single tile
converts a 936×936 sample of a 1024² source, about 84% of its pixels.

| Input, settings | Cold page | Warm | Max rAF gap | App long tasks |
|---|---:|---:|---:|---:|
| 24² sprite, ENDESGA 8 nearest | 82 ms | 46 ms | 25 ms | 0 |
| 256² high-entropy, 8 nearest | 188 ms | 93 ms | 25 ms | 0 |
| 1024² high-entropy, 8 nearest | 351 ms | 344 ms | 25 ms | 0 |
| 1024², 256 colors, 8×8@100, Cut | 2357 ms | 2330 ms | 33 ms | 0 |
| 1024² with α cycle, 256, 8×8@100, Keep | 1958 ms | 1922 ms | 25 ms | 0 |
| Same, Cut (α<128 skipped) | 1274 ms | 1312 ms | 24 ms | 0 |

The raw JSON lists one long task of 360–390 ms per 1 Mi import. In
`import-longtask.json` it ends at the `change` event (start −381 ms, duration 385 ms) when
Playwright's `setInputFiles` payload path is used. It disappears when the page fetches the
file and assigns it through DataTransfer (0 long tasks; first paint 383–428 ms). It is a
harness cost (H3), not an app cost.

**Full-resolution conversion through explicit Count, 1 Mi pixels.** Click to the
"Use N output colors" label; 0 long tasks in every row.

| Target colors | Nearest Cut | 4×4@50 Cut | 8×8@100 Cut | 8×8@100 Keep (α cycle) | Nearest Keep (α cycle) | Max rAF gap |
|---:|---:|---:|---:|---:|---:|---:|
| 8 | 273 ms | 1521 ms | 1554 ms | 1516 ms | 238 ms | 17–25 ms |
| 64 | 429 ms | 2088 ms | 2140 ms | — | — | 42–50 ms |
| 256 | 1039 ms | 3106 ms | 3107 ms | 2648 ms | 1004 ms | 17–42 ms |

Cost does not depend on pattern size or strength (4×4@50 ≈ 8×8@100). Dithering costs 3–6×
nearest. Count runs about 1.5× the prior kernel-only conversion time
(kernel 1037–2089 ms versus app 1554–3107 ms). The extra is image preparation and the
scheduler working in app context.

**Interaction cohorts**

- Repeated changes on a 1 Mi plus 256² wall, Resurrect 64 (`results-perf-Repeated.json`):
  12 dither taps over 3.2 s, then 8×8 and strength 100. The large tile never painted a
  stale intermediate; the burst canceled correctly. Both tiles settled 386 ms after the
  last change (446² sample). Max rAF gap 17 ms, 0 long tasks. The first attempt in
  `results-perf.json` timed out because of my harness (H5), not the app; it was rerun.
- Cancel: Count on 1 Mi pixels, 256 colors, 8×8@100, interrupted by Dithering off after
  about 0.5 s. "Counting colors…" cleared in **235 ms**, and the new preview painted in
  **475 ms**. No long task after the change; max rAF gap 33 ms. This 235 ms is end to end,
  including a Svelte rerender over CDP-driven input. It is not the kernel's ~12 ms abort.
- GIF wall, six 128²×12-frame high-entropy GIFs at 80 ms per frame, Resurrect 64, nearest
  and 4×4@100: **12.1 converted paints per second per tile** against a 12.5 fps source. Max
  rAF gap 17 ms over 10 s, 0 long tasks, JS heap 22–61 MB.
- Kernel reproduction (`kernel-repro.mjs`, the prior probe's evaluate body copied verbatim,
  3 runs, `android/kernel-repro.json`):

  | Case | Prior handoff | This audit |
  |---|---|---|
  | 256², 8 colors, dither | 75 ms | 79–81 ms |
  | 1024², 8 colors, dither | 1039 ms | 1033–1038 ms |
  | 1024², 256 colors, dither | 2062 ms | 2059–2089 ms |
  | 1024², 256 colors, nearest | 560 ms | 556–571 ms |
  | Cancel | 12.4 ms | 11.5–13.8 ms |
  | Whole-probe rAF gap | 50 ms | 42–83 ms |

  **Reproducible.** The prior "cancellation 12.4 ms" is measured from before the call, so it
  includes time to the first progress slice. It is not pure abort latency.

Not covered: desktop real-app timing (only the prior desktop numbers exist), sustained or
thermal runs longer than about 10 s, total native or GPU memory, Save and ZIP of many
1 Mi images on the phone, and real Safari or iOS.

## Findings

**F1, Medium, known limitation, quantified (WebKit/Safari engine path).**
Reproduce with `node bench/claude-audit-2026-10-15/device/desktop.mjs webkit` using
`fixtures/alpha-sprite.png` (alpha bands 0/1/64/127/128/192/254/255), ENDESGA 8, Oklab, All.
- Expected: Save matches the nearest color of the file's RGB.
- Actual, Cut128: 3 opaque pixels from α≥128 sources picked a different entry, for example
  (86,202,200)@α128 became #2d93dd instead of #28c641.
- Actual, Keep: 75 pixels differ; α1 pixels become #1b1c33. Under dithered Keep, 7 exact
  members are no longer treated as exact.
- Evidence: `webkit/precision-check.json` shows a truncating 8-bit premultiply/unpremultiply
  of the source explains 100% of the mismatches. Alpha bytes are always correct. Files are
  `.tmp/device/downloads/webkit/*.png` (regenerable).

This is the bitmap/canvas fallback documented in
`docs/research/2026-10-15-webkit-fallback-decision.md`. No new fix is proposed. A user-facing
mitigation could be wording Help's Keep or "exact" claims as engine-dependent; that is the
research or implementation owner's call. Real Safari is unverified.

**F2, Low, new, WebKit only, engine-quirk candidate.**
Reproduce with `node bench/claude-audit-2026-10-15/device/webkit-escape-control.mjs`: open
Preview of `walk.gif`, then Count, then Use 8 output colors, which opens the editor. The
first Escape leaves both dialogs open; the second closes the editor. Every later Escape
leaves the viewer open, even after focusing a viewer control. Without the nested editor, one
Escape closes the viewer. Chromium closes the viewer on the first Escape after the editor
closes, 6 of 6 runs (`chromium/use-close.json`, `webkit/use-close.json`,
`webkit/escape-control.json`). Impact: keyboard users on WebKit must use the viewer's Close
button. No fix is proposed until it is seen in real Safari. An explicit Escape handler in
`ImageViewer.svelte` would be a speculative workaround for an engine close-watcher quirk.

**Performance observation P1 (not a defect).** On a high-DPR phone a single-tile wall
previews a 1 Mi photo at about 84% of its pixels. A 256-color 8×8@100 dithered first preview
therefore takes about 2.3 s, close to the 3.1 s full Count. It stays responsive (rAF ≤ 33 ms,
no long tasks), and dithering is Off by default. The existing docs report only kernel and
256² timings, so this real-app first-preview cost is new evidence. Any product change, such
as a coarser first pass, would need its own decision.

## Harness and method findings (affect evidence, not app code)

- **H1. The prior 36-phase "pixels true" is not an independent oracle.** The
  `palette-dither-qa-server.mjs` `/verify` and `/paint` handlers compute expected output with
  the app's own `fullPaletteImage`, `colorize` and `decodeGif` from `src/lib`. Its pages
  intercept blob downloads at `HTMLAnchorElement.prototype.click`. It proves that build,
  source, preview and export agree with each other, not that the algorithm is correct. The
  prior audit did disclose the payload interception. This audit adds independently decoded
  native downloads with a scalar oracle on both desktop and phone.
- **H2. Playwright `connectOverCDP` breaks Android downloads.** It sets a host-side download
  path, so Brave reports "1 download failed" and nothing reaches `/sdcard/Download`. The fix
  is `newBrowserCDPSession().send('Browser.setDownloadBehavior', { behavior: 'default' })`.
  `android.mjs` sets it at connect and again on exit, so the user's Brave download behavior
  is restored. Future phone runners must do the same.
- **H3. `setInputFiles` payloads over CDP inject a main-thread long task** (about 385 ms for
  a 4 MB PNG) just before `change`. Attribute import long tasks relative to `change`.
- **H4. Brave changes canvas `getImageData` readback.** Preview checks must use the painted
  ImageData, as the prior harnesses did, not readback.
- **H5. A tile index captured at paint time goes stale** when a newly published tile shifts
  existing tiles. Resolve the index when checking. My first repeated-changes cohort hit this.
- **H6. Fixed paths and ports.** `palette-improvements-qa.mjs` overwrites
  `bench/palette-improvements-review/`, and `palette-dither-qa-server.mjs` binds 5294.
  `palette-qa.mjs`'s full matrix has no dither or Keep coverage, so the built-browser
  regression alone does not exercise those features.

## Device files created (all task-owned, left in place for the user to delete)

`/sdcard/Download/clamv9hns33-*` (8 files), `/sdcard/Download/clamv9hq2qh-*` (8 files) and
`/sdcard/Download/claprobe-sprite-palette.png`. The phone's localStorage for origins
`localhost:5316`/`5318` holds audit settings and an "Audit 256" palette. Those origins are
mine, not the user's app origin. No human interaction is required.

## Round 2 (final): HEAD `d20d7ca`

This round covers commits `376a55c` (Firefox null-colour-space PNG frames now use the
bitmap/canvas path), `7fad4e7` (scheme-less Lospec links, single-token routing) and
`d20d7ca` (docs only). I edited no `src/` files and made no commits.

**Build and tests.**
- `npm run build`: `dist/index.html` SHA256
  `67b5a088de09d901f63badcb14a4f7ba41e4e8c4b78ddc8b9b8767d8128dd82f`. Changed chunks include
  `index-BGOH0uUe.js` (`470c24a3…`), `image-import-client-CBpse5s2.js` (`3cbd8884…`) and
  `palette-lospec-CX_AxttG.js` (`2fc945fb…`). All hashes are in `build-hashes-round2.txt`.
- `npm test`: 59 files, **930 passed**, 2 skipped (the same GC-gated cases), exit 0
  (`npm-test-round2.log`).
- Pre-fix comparison build: `git worktree add .tmp/device/pre e87a853` with a junction to
  `node_modules`, built to `.tmp/device/pre-dist`. Its asset hashes are identical to the
  round-1 build. Its `index.html` differs only by CRLF line endings from the worktree
  checkout (LF-normalized `16d2776e…`). The junction was removed first, then the worktree;
  the main `dist/` and `node_modules` were untouched.

**Desktop real app (`desktop.mjs`, with decode-path logging).** Each `VideoFrame.copyTo` or
PNG `createImageBitmap` call is logged as raw copy, managed copy, or bitmap/canvas fallback.
The fixture's alpha bands include 1/127/128/254.

| Engine / build | Phases | PNG decode path | Cut128 sprite RGB mismatches | Keep sprite RGB mismatches | Keep PNG SHA |
|---|---|---|---:|---:|---|
| Chromium 149, HEAD | **20/20** | raw copy (BGRA, bt709/sRGB/rgb/full) | 0 | 0 | `d7b02801…` (= round 1, = phone) |
| WebKit 26.5, HEAD | 12/18 | bitmap/canvas (no ImageDecoder) | 3 | 75 | `35b78706…` (= round 1) |
| Firefox 153, pre-fix `e87a853` | 9/18 | managed copy (BGRA, all-null colour space) | 81 | 282 | `8a0de6e0…` |
| Firefox 153, HEAD | 12/18 | bitmap/canvas | 2 | 75 | `85fde747…` |

All counts are out of 576 sprite pixels; every alpha byte is correct on every engine and
build.

- **Chromium: no regression.** It still takes the raw native copy path.
- **WebKit: unchanged from F1.** The truncating premultiply model still leaves 0 residual
  (`webkit/precision-check.json`).
- **Firefox: confirmed improvement in the real app.**
  - Before the fix, even opaque-output Cut and RGB-matching phases failed: 81 Cut128 and
    66 RGB-Cut mismatches, and 11 exact palette colours changed under 2×2 Cut. The darkened
    RGB came from premultiplied values.
  - After the fix, Firefox lands in the same class as WebKit, F1. `premultiply-model-fit.json`
    shows ceiling premultiply plus floor unpremultiply explains Firefox exactly (0/0); WebKit
    fits floor/floor (0/0).
  - The pre-fix output is not explained by any round-trip model (best 81/212), consistent
    with copied premultiplied channels.
  - **F1 therefore now covers Firefox.** Translucent RGB there is approximate, not exact.
- `decode-count.mjs`: each still import performs exactly one native decode. The two decodes
  at page load are the empty-wall example, so there is no redundant decoding.

**Lospec routing (Chromium real app).**
- Pasting `lospec.com/palette-list/endesga-8` with no scheme showed the button "Import from
  Lospec". It made exactly one external request (`https://lospec.com/palette-list/endesga-8.json`)
  and imported 8 colours equal to the ENDESGA 8 preset. That was the only live fetch this
  round.
- Pasting multi-line GPL text with a `# https://lospec.com/palette-list/endesga-8` comment
  showed the button "Review colors". It imported `#112233 #fa8007 #00c878` locally, with
  **zero** Lospec or module requests (`chromium/gpl-comment-editor.png`).
- The receipt label for the scheme-less phase was restored after the run: the harness spread
  the palette name over the phase name, now fixed in `desktop.mjs`.

**Pixel 8 Pro / Brave 155, HEAD** (`android/results-correctness-round2.json`, prefix
`clamv9jcvbp-`). All 5 phases passed using real Share-sheet Saves and native downloads.
- Keep nearest sprite: 0 alpha and 0 RGB mismatches, **SHA `d7b02801…`**, identical to round 1
  and to desktop Chromium.
- 4×4@50 Cut (`6bd51943…`) and 8×8@100 Keep (`7d97266c…`) are byte-identical to round 1.
- Count on the GIF equals the decoded union (8).
- The 1 Mi-pixel Save is exact (890 ms to download, 0 long tasks).
- The phone decode path is raw copy (RGBA, bt709/sRGB/rgb/full), so it is unaffected by
  `376a55c`. My `adb reverse` is removed, download behaviour was restored to Brave's default,
  and only my pages were closed.

**Round-2 disposition.** No regression on Chromium, WebKit or the phone, and `376a55c` is a
verified improvement on Firefox. F1 now explicitly includes Firefox. F2 is unchanged and was
not retested: no relevant code changed. No new defect was found.

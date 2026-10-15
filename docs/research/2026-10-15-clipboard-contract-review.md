# Clipboard source contract and native verification plan

October 15, 2026. This review traces Copy/Paste behavior, records a reproduced promise-ownership defect repaired in `256ad1e`, and separates measured native partial-alpha rounding from application encoding. The companion HTML carrier failed its Android delivery gate and is not shipped. No paid service request was made.

## Current application contract

Copy writes one full-resolution converted PNG, regardless of Original comparison. An animated source copies its first frame and says it was copied as a still. The initiating click/key press supplies a promised PNG immediately to the asynchronous Clipboard API. Success feedback follows the actual write promise; failure receives the existing concise failure message. These rules are in the app's [Copying specification](../superpowers/specs/2026-10-06-colorfetti-app-design.md).

The current source implements that contract as follows:

- [App Copy](../../src/App.svelte:818) captures the immutable conversion request before work begins. It passes `during(...)` directly into `copyOne`; there is no awaited decode/conversion before requesting the native clipboard write. Large images can show the busy message while the supplied promise resolves.
- [The PNG/clipboard boundary](../../src/lib/save.js:239) uses the production direct PNG encoder, wraps the result as `image/png` and writes one `ClipboardItem` whose value is the promised Blob. It does not use canvas encoding or replace native clipboard methods.
- [Full-palette still conversion](../../src/lib/palette-state.js:42) retains source/frame references and resolves the captured Auto palette, cap and Cleanup using the whole source asset. For a GIF, `still:true` emits frame0 only after preparing the whole-animation subset and Cleanup. Fitting frame0 independently is an incorrect oracle for GIF Copy.
- Palette Keep/Cut, cutoff, matching, cap, Cleanup, dither pattern and strength participate in [the captured settings](../../src/lib/palette-state.js:31). The legacy 1-bit path captures its colors/style/settings independently. Copy is blocked while its palette preparation is unavailable or failed.
- A tile's desktop Copy, Preview's Copy and the touch Image actions Copy reach the same `copy(item)` operation. The touch sheet closes synchronously before calling it; no asynchronous wait is inserted ahead of clipboard write.
- [Ctrl/Cmd+C](../../src/App.svelte:937) copies the first wall item only when there is no selected text, no focused text/number input and no open dialog. Repeat, Shift and Alt variants do not invoke this shortcut. A Preview or palette editor is a dialog, so its explicit Copy/text controls own interaction there.

The wall [paste handler](../../src/App.svelte:923) adds actual `clipboardData.files` through normal image import; it does not poll or programmatically read the clipboard. Other open dialogs block wall paste. Plain text/HTML/URLs without clipboard files are not a wall image import, and no extra URL fetch is introduced by Paste.

The [palette editor handler](../../src/PaletteImport.svelte:199) stops propagation. If a clipboard file exists, it prevents default and imports the first file into the shared palette draft. An entered name and chosen Image/Paste/Add method remain intact; the draft's colors are replaced after successful extraction. Image alpha becomes opaque palette RGB according to palette-import rules, so palette extraction is a different alpha contract from importing artwork. Plain text has no file, so ordinary Name/HEX textarea paste remains native text insertion. It does not submit or Save the palette automatically.

## Browser and OS requirements

The current W3C working draft separates trusted paste events from programmatic clipboard reads and forbids synthetic paste events from exposing the real clipboard. The asynchronous API also requires document focus; permission defaults remain browser decisions. Therefore replacing `navigator.clipboard.write`, injecting `ClipboardEvent`, or inspecting the promised Blob proves application payload behavior, not native copy/paste delivery. [Clipboard API working draft](https://www.w3.org/TR/clipboard-apis/).

Chrome's public guidance documents image ClipboardItems, promised data, file exposure during native paste, active-page restrictions and iframe clipboard policy. Use a focused secure page and the actual Copy button/shortcut; a denied read permission is distinct from a failed image write. The app's immediate write-with-promise structure follows the documented pattern. [Chrome team guidance](https://web.dev/articles/async-clipboard).

Image bytes may change at the native boundary. The working draft discusses safe image transcoding, and WebKit documents decoding/re-encoding PNG when writing. Compare independent decoded RGBA, not PNG compression, ancillary chunks or encoded-byte equality alone. This source review is not a claim that every current browser transcodes identically. [W3C transcoding discussion](https://www.w3.org/TR/clipboard-apis/#transcoding-images), [WebKit's implementation explanation](https://webkit.org/blog/10855/async-clipboard-api/).

Android's clipboard can represent complex data through a content URI; the receiving app must support its MIME/data form. A native clipboard thumbnail or successful Copy toast alone does not establish that a particular paste destination accepts an image. Test the actual Brave/browser paste route as well as a receiver, and record delivered MIME/file information. [Android clipboard framework](https://developer.android.com/develop/ui/views/touch-and-input/copy-paste).

These references define expectations and test boundaries; they do not establish current Codex Browser/Brave success without live evidence. Safari remains outside the two requested devices.

## Focused device cases

Use only the synthetic/owned fixtures already used for export verification. Copy must complete before reading the clipboard, so no earlier private clipboard contents are collected. Record only the new owned PNG or owned sentinel text and minimal MIME/dimension/alpha/gesture metadata. Keep receivers in a separate test page so an injected editable element does not alter the production app's keyboard behavior.

| Case | Native action and destination | Independent expected result |
|---|---|---|
| Palette Keep | Explicit Copy under PICO-8/cap8/Cleanup/4×4/50/Keep; trusted paste into receiver and/or wall | Full source size; alpha0/1/127/128/254/255 preserved where present; visible RGB matches captured conversion; a new wall source appears on actual image paste |
| Palette Cut | Same owned source with Cut128 | Below128 empty, at/above128 opaque; matching/dither uses the captured Cut conversion |
| 1-bit and Original | Chosen two colors with one None; show Original, then Copy | Converted legacy PNG and transparency, never Original pixels |
| Animation | While a later GIF frame is playing, explicit Copy in tile/actions or Preview | One PNG of frame0; full-clip cap/Cleanup preparation; no animation or later-frame substitution |
| Gesture routes | Preview Copy and Ctrl/Cmd+C on a two-item wall | Preview copies its selected item; keyboard copies first wall item; native permission/activation is preserved |
| Text ownership | Select owned text or focus Name/HEX/number input and use native Copy/Paste | Ordinary selected text remains text; no unintended image Copy or wall import; HEX paste does not auto-import/save |
| Palette image paste | With an entered name and selected Paste method, paste the owned copied image into the palette editor | First file replaces draft colors, name/method stay, wall item count does not change; palette entries are opaque RGB |
| Dialog isolation | Paste image while Help/Reset/Preview dialog owns focus | No wall import; closing the dialog restores normal wall paste |

If initial copy/paste succeeds, add one bounded asynchronous ownership case using an owned ≥2MP source: initiate Copy, immediately change settings, then decode the actual pasted image against the original captured request. The 50ms busy defer is inside the promised image, not ahead of the clipboard write. Existing payload/snapshot tests already cover the computation; this case tests whether the native promise route survives that delay.

Before pointer Copy, close Recolor or another floating panel explicitly. The existing outside-press rule consumes the press that dismisses it; that is not a clipboard failure. The same distinction was verified for native Save in the preceding acceptance pass.

## Failure attribution and stopping rules

For each real transfer retain, where available: current focused origin, gesture route, copied-success/failure message, native paste event trust/type/file count, actual pasted PNG bytes, independent decoded dimensions/RGBA, and the equivalent direct Save/production conversion. Do not log prior clipboard data, authentication or unrelated applications.

Separate these boundaries when an output differs:

1. Production conversion/direct saved PNG versus independently expected pixels.
2. Native clipboard-read or pasted PNG versus that saved conversion.
3. Pasted file's decoded pixels versus the app's reimported source.
4. Reimported source versus its newly recolored preview. A copied conversion is a new source; converting it again can legitimately apply settings again, so preview equality alone is an unsafe transfer oracle.

At very low nonzero alpha, a native platform may premultiply/unpremultiply RGB. If a difference occurs, preserve its coordinates, alpha and channel deltas and identify which boundary introduced it before proposing any change. Hidden RGB under alpha0 is excluded from visible-color comparisons; alpha itself and geometry remain exact checks.

An absent native Paste affordance, denied permission or a text-only destination must first be distinguished from an application paste-handler defect. An owned `content:` URI appearing as plain text instead of a file is useful receiver evidence, not automatic authorization to fetch arbitrary clipboard URLs. No new Paste button, fallback encoder, persistent permission grant or clipboard polling is justified by source inspection alone.

Production edits should address only a reproduced defect with a retained failing case. Native runs and any eventual fix validation are recorded separately by the device-testing workers; this document's source review does not close that evidence gap by itself.

## Follow-up evidence: native partial-alpha rounding

The later [independent Windows test](../../bench/palette-clipboard-review/independent-native-edge-results.json) closes part of the native gap and changes the initial evidence status. App Save produces the exact 1912-byte/six-color PNG. Both the actual Windows clipboard PNG and trusted native pasted PNG are 3520 bytes and agree with one another. All 8192 alpha bytes and 6656 opaque-pixel RGBs remain exact, but 938 of 1024 partial-alpha pixels differ by at most one channel level: 469 at alpha127 and 469 at alpha 128. The palette editor correctly extracts the sixteen RGBs it actually receives; that extraction is not the source of the loss.

The first observed change, `#1d2b53` to `#1c2a52`, is consistent with an eight-bit premultiplication round trip. For example, at alpha 127, rounding `(29,43,83) × 127/255` gives `(14,21,41)`; unpremultiplication gives approximately `(28,42,82)`. This is a numerical explanation consistent with the measured loss, not proof of the exact path used by every browser/version.

PNG storage itself is lossless. A browser/OS path which first quantizes into eight-bit premultiplied channels cannot preserve every possible straight-alpha RGB value: a channel at alpha127 has at most 128 premultiplied values for 256 original values. Lost channel distinctions cannot be recovered universally from that bitmap. Pre-biasing palette RGB or changing the quantizer cannot provide a general repair. Chrome's public explanation confirms native PNG re-encoding; its broad pixel-equality statement does not supersede this retained partial-alpha counterexample. [Chrome's PNG/HTML explanation](https://developer.chrome.com/docs/web-platform/unsanitized-html-async-clipboard).

### Safe alternatives to investigate

| Carrier | Potential benefit | Compatibility and limits |
|---|---|---|
| Current `image/png` | Standard image interoperability; unchanged external Copy behavior | Actual Windows partial-alpha RGB loss is reproduced. No universal exact native transfer guarantee follows from the PNG MIME type. Keep exact alpha/geometry assertions separate from RGB. |
| `image/png` plus standard `text/html` containing the original encoded PNG as an image data URL | An app-owned receiver can recover the original PNG bytes without passing those bytes through native bitmap conversion; native image consumers retain the PNG representation | Requires real dual-MIME write/native-paste proof on both requested devices. HTML may be sanitized or preferred differently by rich-text receivers. It improves a participating app-to-app route, not arbitrary external native applications. |
| `image/png` plus `web image/png` | An explicit raw custom representation is designed for exact app-owned transfer | Chrome documents desktop/mobile Chromium 104 support, but receiving uses custom ClipboardItem types and may require programmatic read permission. Native applications do not generally understand these types. Do not infer delivery through the existing native paste event/FileList or tested Brave support from the public support statement alone. |

Chrome recommends web custom formats when both endpoints are controlled. This makes them a justified alternative to test, not automatic permission to add a new Paste control or read/poll the clipboard. [Official custom-format guidance](https://developer.chrome.com/blog/web-custom-formats-for-the-async-clipboard-api).

The existing drag parser is deliberately unsuitable for simply enabling embedded carriers: it prefers files and accepts only credential-free HTTP(S) URLs, rejecting data URLs. Broadening it globally would change unrelated drag/network behavior. If a standard HTML carrier proves useful, prefer a dedicated narrow parser for its versioned app representation. Copy the protected HTML string synchronously during trusted paste, parse inertly, accept one bounded PNG data URL, validate the PNG and decoded dimensions through the existing image path, and never insert HTML, execute it or fetch any URL. Preserve plain-text input behavior, palette-editor name/method ownership, dialog isolation and one-import-only precedence. A marker describes a payload format; it is not proof of origin or permission to trust arbitrary metadata.

Base64 adds about one-third to PNG size and can create additional retained strings/Blob copies. A production proposal needs explicit byte/pixel limits, large-source timing/memory checks and unchanged native-PNG fallback. Adding an unsupported optional representation must not turn a working PNG Copy into a failure; blindly retrying after an asynchronous refusal can lose activation. Every newly derived image/HTML promise also needs rejection ownership if the platform never consumes it.

The [separate carrier spike](../../bench/palette-clipboard-carrier-spike.html) is research only. It writes the fixed owned expected PNG and optionally a simple HTML data-image representation in one ClipboardItem, requesting native write before awaiting preparation. Its receiver requires a trusted paste after that owned Copy, captures delivered MIME/file information, compares recovered carrier bytes with the fixed source, and bounds HTML/PNG size and dimensions. It has no clipboard polling, custom-format read, external fetch/import or production app changes. Device workers own its real Copy/Paste actions and resulting evidence; this report does not yet count an unperformed carrier experiment as a fix.

## Follow-up fix: orphaned encoder rejection

A separate [four-case failure injection](../../bench/palette-clipboard-review/independent-failure-before.json) reproduced a real application error path: missing clipboard API, missing ClipboardItem, throwing item constructor or synchronous write refusal could fail before consuming the already-started PNG promise. A later encoder rejection then escaped as an unhandled rejection despite the UI's Copy failure catch.

The minimal repair in `copyOne` observes that producer immediately, before platform lookup, while passing the same original promise to ClipboardItem and preserving the original native return/error. It does not replace failure with a successful fallback, add an awaited activation boundary or redesign cancellation. Three focused regression tests include real-process late-rejection reporting for five failure paths, immediate native-write/same-promise/result identity, and producer rejection propagation. The new test failed on the old implementation and all fourteen Save tests passed after the change.

The independent reviewer [reran all four original injections](../../bench/palette-clipboard-review/independent-failure-results.json): zero orphan rejections, original platform errors preserved. This repair addresses rejection ownership, independently of the native partial-alpha rounding and unshipped carrier experiment. It is committed separately as `256ad1e`; root owns validation against its newly frozen build. No HTML/custom carrier is included in this production fix.

## Android carrier decision and minimal user guidance

The later [Android Keep analysis](../../bench/palette-clipboard-review/android-palette-keep-analysis.json) uses the separate 32×24 fixture with alpha0/1/64/127/128/192/254/255. All 768 alpha values remain exact, but 246 visible RGB pixels change; maximum channel difference 124 occurs at alpha 1. Eight expected palette colors become 33 received RGBs. This is consistent with the severe representational limits of very low-alpha premultiplication, and matters to subsequent palette extraction even if the nearly transparent pixels have little visible impact. Cut, 1-bit and GIF-frame0 native transfers passed their exact decoded-pixel checks on that device.

The [actual Android dual-carrier receipt](../../bench/palette-clipboard-review/android-carrier-both-results.json) records a successful genuine `image/png + text/html` write and a trusted paste advertising HTML, an image URI and Files. However, `getData('text/html')` returns an empty string, so no original PNG can be recovered from the HTML carrier. The accompanying native PNG retains its measured transfer differences. The HTML proposal therefore fails the required device gate and remains a research artifact; it is not a safe general app-owned precision repair.

The justified product change is smaller: when Palette mode uses Keep and the existing source `soft` flag is true, append **Save a PNG for exact translucent colors.** to the existing Help Save step. This directs an affected user to the tested exact export route without adding a warning to binary/1-bit workflows, a new control, a permission request or repeated clipboard inspection. Palette documentation must distinguish the app's exact prepared PNG from native clipboard transport. Root owns the separate guidance commit and device layout check; it does not alter encoding or the Copy success/failure contract.

## Remaining work after the checklist audit

The earlier [palette follow-up checklist](2026-10-15-palette-follow-up-checklist.md) correctly describes its frozen-build acceptance and explicitly leaves native clipboard readback open. The [clipboard checklist](2026-10-15-clipboard-checklist.md) owns that continuation. Keep those scopes distinct rather than relabeling previous intercepted clipboard payload tests as OS delivery.

The remaining actionable steps are narrow: finish native Copy/Paste on Codex Browser with the correct currently copied fixture, retain the completed Android transfers and failed carrier gate, and verify the `256ad1e` build's affected success/failure paths plus the minimal conditional Help guidance. Automation's virtual clipboard and a manual OS paste must not be treated as the same channel without matching source/dimensions/native payload evidence. A stale128×64 paste is not proof of a current 32×24 GIF-frame copy.

The tested carrier fails the device gate, so record the native limitation and retain the exact Save route. Any future carrier proposal needs exact participating-app recovery and retained native PNG compatibility on both devices, with bounds and text/editor ownership tests. Do not invent a universal RGB correction or add a new Paste control without an observed missing workflow. Existing Auto, presets and cap controls need no further expansion from this evidence. Safari remains a separate untested platform, not an unfinished part of the two-device request.

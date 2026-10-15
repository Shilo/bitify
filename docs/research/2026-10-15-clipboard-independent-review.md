# Native clipboard: independent acceptance and review

October 15, 2026. This review covers actual Copy/Paste transport, PNG precision, promise failures and paste ownership. The reviewer owns only independent QA/evidence and this document; no production changes or commits. Read/Copy tests use owned synthetic artwork. No pre-existing clipboard contents were read or saved, and no all-format dump was performed.

## Acceptance gates

The initial gates were communicated before the native Edge run:

- A successful API write, intercepted Blob or mocked readback is not OS delivery. After an owned Copy, require a real trusted paste file/event and independent image decoding. Keep Codex Browser, native desktop and Android transport evidence separate.
- Compare dimensions, every alpha byte and visible RGB pixels to the actual captured conversion. Keep retains original alpha; Cut retains the binary cutoff. A GIF Copy is frame zero using the entire animation's subset, not an independently fitted first frame. Ignore meaningless hidden RGB under alpha zero.
- A pending Copy owns its source/settings at invocation. Later family/settings/source changes must not silently change that requested PNG. Writer/encoder failure must not emit a success message or an unhandled promise rejection.
- If the native writer rejects or APIs are unavailable, all already-started PNG promises still need an owner. Abort only owned obsolete/failing work; ordinary UI edits do not cancel a click-time Copy snapshot. A Clipboard write has no app cancellation UI contract to invent here.
- Actual paste into an open palette editor belongs only to that draft, preserving entered name/method. It must not append a wall image or replace a newly opened editor after an asynchronous old owner has gone. Ordinary native image paste without an owning dialog appends to the wall.
- Any proposed exact app-owned image carrier must preserve standard PNG interoperability, use bounded local data only, retain ordinary image-file fallback and avoid injecting clipboard HTML or fetching arbitrary HTML URLs. Treat marker text as untrusted input. Evaluate compatibility and memory before accepting a production change.

## Native Edge reference: actual OS delivery with precision loss

The [independent executable](../../bench/palette-clipboard-review/independent-native-edge.mjs) launches headful Edge with Chromium's sandbox enabled and an isolated loopback app context. Desktop clipboard ownership was coordinated with root so independent tests did not race each other. The [Windows helper](../../bench/palette-clipboard-review/independent-windows-clipboard.ps1) first overwrites the OS clipboard with a known owned PNG without reading its previous contents. Only after trusted app Copy does it read the registered PNG image type, with a bitmap-only fallback; it never enumerates formats or reads text. The completed run uses Windows PNG directly.

The [retained receipt](../../bench/palette-clipboard-review/independent-native-edge-results.json) identifies the frozen production index `0b61657e4bf8e35317a45bd2973d02cc94282855b1f9d14b5b8435eb94822d20`, owned 128×64 ramp and PICO-8/Keep/cap8/Cleanup/4×4 settings. No Clipboard method is mocked and no synthetic ClipboardEvent is dispatched.

| Stage | Independently decoded observation |
|---|---|
| [Actual app Save](../../bench/palette-clipboard-review/independent-app-save.png) | 1,912 bytes; all 8,192 source alpha bytes and 7,680 visible RGB pixels exactly match expected conversion. Six visible RGB colors. |
| Trusted app Copy | Browser API resolves; app displays its copied message, with no runtime error. This alone is not the transport assertion. |
| [True Windows PNG clipboard](../../bench/palette-clipboard-review/independent-os-clipboard.png) | 3,520 bytes; all 8,192 alpha bytes and 6,656 opaque RGB pixels remain exact. Of 1,024 fractional-alpha pixels, 938 change by at most one byte per RGB channel: 469 at alpha127 and 469 at alpha128. Visible RGB count grows from six to sixteen. |
| [Trusted native Ctrl+V file](../../bench/palette-clipboard-review/independent-native-paste.png) | Event `isTrusted: true`; one image/png file; its PNG bytes equal the OS clipboard PNG. It appends exactly one wall image and contains the same fractional-alpha RGB differences. |
| Native Ctrl+V inside palette editor | Only the owned editor draft changes; entered name and existing two wall images remain. Its sixteen extracted RGB entries exactly match the received PNG, rather than falsely reporting the six pre-transport colors. |

The OS/paste PNG SHA256 is `c66b96b1081fa0cb24b00a9b2fa00344d01b6bab78b959b4fcb7a39f438c56b6`. The exact app Save SHA256 is `af55fff6eab37b18e9020222f792ed60bc87010a2665daeb063811b236409388`. At source pixel516, expected `#1d2b53` becomes `#1c2a52` after clipboard transport. This is a real precision boundary, despite correct alpha and successful OS delivery. The rounding pattern is consistent with premultiplication/unpremultiplication, but this test does not identify the internal browser/platform stage responsible.

`completed: true` in this reference receipt means the native transport and ownership observations completed, not that all transported RGBs are exact. Exactness is explicitly false for OS and paste stages. The editor is correctly preserving what it actually received; changing imported colors to hide transport differences would violate ordinary import semantics. A raw PNG hash mismatch alone is not the quality finding: decoded pixel differences are.

## Actionable promise-ownership finding

The [independent platform-failure probe](../../bench/palette-clipboard-review/independent-failure-guard.mjs) tests the current `copyOne` helper with an owned PNG promise that later rejects. These are deliberately injected API failures; they make no native-clipboard claim and never access the OS clipboard.

In the initial [retained failure receipt](../../bench/palette-clipboard-review/independent-failure-before.json), missing clipboard API, missing ClipboardItem, a throwing constructor and a synchronously throwing writer all reject Copy, then leave the started PNG promise unobserved. Every case emits the later encoder error as an unhandled rejection. The tested save module hash is `373b1d312b56474c572817b29fcbab67dea9fdf1a634c787e7ed2a73fd59c4cf`.

The issue is evaluation/lifetime ownership: the app has already begun `during(...PNG...)` before `copyOne` looks up platform capabilities and constructs its ClipboardItem. Catching only the writer failure does not necessarily observe an independently rejecting producer.

The integration owner's narrow [helper fix](../../src/lib/save.js) normalizes the image promise and installs a separate rejection observer before platform lookup, then passes the same original promise to ClipboardItem and returns the native writer result synchronously. It does not await first, replace a rejection with a successful image, change encoding, introduce a carrier or redesign cancellation. Source hash is `c44966acd7925ab6895199736c55d0cc6e8311e6af1b116d3c72a2e3451075c4`.

The independent [after-fix receipt](../../bench/palette-clipboard-review/independent-failure-results.json) reruns all four cases: original platform errors remain and every later encoder rejection is handled. The reviewer inspected the owner's [regressions](../../src/lib/save.test.js), which additionally check synchronous write with the same unresolved promise/native return identity, producer rejection reaching the native writer, and asynchronous writer refusal followed by a late encoder rejection. The specification change records only this promise-lifetime contract. Independent source review accepts the fix, committed separately as `256ad1e`. The Android evidence below uses its rebuilt app. This fix does not repair browser/platform RGB transcoding, nor does it claim to cancel an already-started conversion after a writer failure.

## Android native transport and carrier challenge

Read-only review of the [Android executable](../../bench/palette-clipboard-android.mjs) and [native receipt](../../bench/palette-clipboard-review/android-native-results.json) confirms actual app Copy clicks followed by Android KEYCODE_PASTE, with native long-press Paste as a bounded fallback. The completed cases used KEYCODE_PASTE; the receiver independently checks the event's `isTrusted` and requires a PNG file. There is no replacement Clipboard API, synthetic ClipboardEvent or read of an earlier clipboard. `completed: true` and `errors: []` describe completed observations, not exact pixel success.

| Owned 32×24 case | Observed native result |
|---|---|
| Palette Keep, cap8/Cleanup/4×4/50 | All 768 alpha bytes preserved; 246 of 672 visible RGB pixels change. Maximum channel difference124 occurs at alpha1; 237 pixels leave the expected target palette. This is explicitly retained as a failed exactness check. |
| Palette Cut128, same controls | All alpha and 384 visible RGB pixels exact. |
| 1-bit Solid, black/white, None0 | All alpha and 384 visible RGB pixels exact. This covers source transparency, not a transparent None color role or all styles. |
| GIF frame0 after whole-animation cap preparation | All alpha and 660 visible RGB pixels exact. The fixture proves its whole-animation subset differs from fitting frame0 alone; this is not a GIF clipboard container. |

The [original-source alpha self-check](../../bench/palette-clipboard-review/android-fixture-alpha-self-check.json) independently confirms frozen expected alpha against the original inputs without regenerating them. This supplements the expected PNGs, whose colors come from the production conversion and therefore are transport oracles rather than an independently invented quantizer. Artwork paste appends one image. Palette-editor paste preserves the entered name and existing wall count, and extracts exactly the 33 RGB values in the delivered Keep PNG. Recoloring the pasted artwork is not used as the transfer oracle.

The [PNG+HTML carrier](../../bench/palette-clipboard-carrier-spike.html) writes a fixed exact owned PNG directly, avoiding app import/conversion as a confound. Its [Android result](../../bench/palette-clipboard-review/android-carrier-both-results.json) advertises `text/html`, but synchronous `getData('text/html')` returns zero characters. No embedded original is recovered. Its ordinary PNG and the [PNG-only control](../../bench/palette-clipboard-review/android-carrier-png-results.json) reproduce the same RGB differences. The receiver parses any HTML inertly, accepts only one bounded local PNG data URL, does not insert HTML or fetch arbitrary URLs, and records no raw clipboard HTML. This tested carrier fails the acceptance gate and should not ship.

## Receiver attribution correction

QA review found that the original independent receiver read protected paste MIME metadata and current case/device selectors after awaiting a file read. A user changing the selector while that read was pending could misattribute a real paste; some browsers also clear protected metadata after dispatch. This was a QA evidence defect, not a production app defect.

The [receiver](../../bench/palette-clipboard-receiver.html) now captures case, device, file references, trust and MIME metadata synchronously before its first await. An older completion cannot replace a newer displayed receipt. The [loopback server](../../bench/palette-clipboard-server.mjs) retains distinct timestamp/hash/UUID attempt PNGs and JSON receipts, including pixel mismatches; canonical latest filenames remain for existing scripts. Slow older same-case verification cannot overwrite a newer completed canonical result. This prevents subsequent successful tests from erasing earlier failures. The `/carrier` route is retained.

The [injected guard executable](../../bench/palette-clipboard-review/independent-receiver-guards.mjs) and [receipt](../../bench/palette-clipboard-review/independent-receiver-guards.json) test protected metadata lifetime, selection capture, reversed async UI completion, oversized/untrusted events, distinct immutable attempt receipts, canonical aliases and a retained decoded failure. It uses VM fixtures and a separate temporary loopback server; it makes no native clipboard claim and never touches the real receiver's files or clipboard. A posted `trusted:true` is not independently proof of a native action: that proof comes from the reviewed real browser event path and device interaction.

Earlier manual Codex pastes with dimensions128×64 are rejected by the 32×24 oracle. The second negative is preserved separately as [wrong-tab receipt](../../bench/palette-clipboard-review/codex-attempt-wrong-tab.json) and [PNG](../../bench/palette-clipboard-review/codex-attempt-wrong-tab.png); neither is counted as the current Palette Keep case. The correctly sized native paste is compared with that session's actual app Save below.

## Final Codex Browser attribution

Root completed human Copy followed by trusted receiver paste of the correct 32×24 owned source. The [native receiver receipt](../../bench/palette-clipboard-review/codex-palette-keep-paste.json) remains a failed exact-source-golden comparison, with 284 visible RGB differences. That entire count cannot be attributed to clipboard transfer: the same tab's [actual Save](../../bench/palette-clipboard-review/codex-app-save.png) already differs from the golden at 118 visible RGB sites, including twelve opaque sites, and uses a different valid eight-color PICO-8 subset.

The [controlled comparison](../../bench/palette-clipboard-review/codex-controlled-comparison.json) separates these boundaries. The reviewer independently redecoded actual Save and native paste using Sharp: both are 32×24, every alpha byte agrees, all opaque RGB agrees, and 245 fractional-alpha RGB sites differ with maximum channel delta77. Counts at different boundaries overlap and must not be subtracted or added as disjoint sets. A round-premultiply/round-unpremultiply source model reproduces the observed Save, but remains a model rather than direct observation of the decoder. No quantizer or decoder patch is justified from that causal inference alone.

The separate [actual app paste screenshot](../../bench/palette-clipboard-review/codex-native-app-paste.png) visibly contains the original 32×24 artwork and a second ChatGPT-named 1031×979 screenshot. Root records that the user had copied that screenshot immediately before pasting. This confirms actual native artwork import, not a roundtrip of the earlier 32×24 output. No exact output-roundtrip or full four-case Codex matrix is claimed. The older receiver's empty MIME metadata does not invalidate its trusted PNG/file bytes; future receiver loads use the synchronous metadata correction.

## Conditional Help review

The narrow Help addition is accepted: **Save a PNG for exact translucent colors.** appears in the existing Save step only for full-palette Keep with existing source `soft` metadata. It adds no scan, permission, control or change to Copy success/error feedback. Source metadata can conservatively show this guidance even when a particular conversion has no fractional pixels; it does not promise that every clipboard consumer damages every image. The matching documentation correctly distinguishes exact encoded PNG from native delivery. This was committed separately as `55c32cc`.

The final [Codex Help checks](../../bench/palette-clipboard-review/codex-final-help-checks.json) confirm the sentence in Palette/Keep/partial sources and its absence in Cut and 1-bit. The [physical Android Help receipt](../../bench/palette-clipboard-review/android-help-results.json) additionally checks Keep/binary. All four Android conditions pass, with no horizontal dialog overflow and an actual clickable, hit-tested 44px Close button at448×819. The Android native four-case rerun and Help receipt share final index SHA256 `a4b434562abb9dd2fe7c52957318499de02f0f1244e4cb786379f7256b28834f`, retaining the same exact/nonexact outcomes after the Help-only change.

## Current status

The requested native-delivery investigation is complete within the recorded scopes: sandboxed Edge/Windows reference, human-assisted Codex receiver delivery and separate artwork import, and Android's four cases plus editor/artwork ownership. Fractional-alpha RGB transport is nonexact and explicitly reported; it is not relabeled as a passing exactness test. The reproduced promise-owner defect has an accepted committed fix, independent after-fix probe and rebuilt native success coverage. Conditional Help and the rejected carrier have both completed their device gates. The [final verification](2026-10-15-clipboard-verification.md) retains the regression results and remaining boundaries.

No outstanding critical production finding remains from this review. A focused decoded-source precision spike is justified by the controlled Codex observation; it is not approval to replace the decoder. Safari/iOS, other external paste destinations, every 1-bit style/None role, large delayed native clipboard snapshots and arbitrary payloads remain unverified. Existing snapshot tests and the device cases do not establish universal native-browser guarantees. No further palette/Auto feature is justified by this evidence.

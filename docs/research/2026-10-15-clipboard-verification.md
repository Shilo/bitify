# Actual clipboard verification

October 15, 2026. Three sub-agents separated contracts/implementation, owned
fixtures/Android, and independent adversarial review. No push or deployment.

## Outcome and changes

Native image delivery is verified for one human-assisted Palette Keep transfer on Codex Browser and four cases on the USB Pixel 8 Pro.
Delivery does **not** guarantee exact RGB values in translucent pixels. The
application's direct PNG encoder preserves its converted pixels; the native
clipboard can change them. Save remains the exact converted-PNG route.

The reproduced production defect was narrower: a platform clipboard setup
failure could leave an already-started PNG promise's later rejection unhandled.
Commit `256ad1e` observes that promise before platform access, retains the same
rejecting promise in ClipboardItem, and starts native write synchronously.
Four independently injected failures pass after previously failing; the 14 Save
tests additionally cover native result identity and asynchronous refusal.

Commit `55c32cc` adds one sentence to the existing Help Save step only for
Palette + Keep + partial-opacity sources: “Save a PNG for exact translucent
colors.” No control, persistent warning, new scan or format was added. Desktop
visual testing caught and corrected a missing space before acceptance.

## Actual native observations

| Device / path | Verified result |
|---|---|
| Codex Browser, human Copy then trusted paste into the independent receiver | Correct 32×24 owned image received. Compared with the same app tab's actual Save, every alpha byte and opaque RGB pixel matches; 245 translucent RGB pixels differ, maximum channel delta77. |
| Codex Browser, human Ctrl+V into the actual app | A second artwork item appears. Its 1031×979 dimensions/name identify the screenshot the user had just copied, rather than the earlier 32×24 output. This proves native artwork import, **not** an exact copied-output roundtrip. |
| Android Keep, cap8/Cleanup/4×4/50 | Trusted Copy/paste preserves all768 alpha bytes. 246/672 visible RGB pixels differ from the exact source-derived conversion; maximum channel delta124 occurs at alpha1. Eight intended RGBs become33 received RGBs. |
| Android Cut128 | Trusted native paste is independently pixel-exact. |
| Android 1-bit Solid, black/white (None off) | Trusted native paste is independently pixel-exact for the frozen fixture/settings; transparency here comes from source alpha. |
| Android animated source | PNG copies frame0 using the whole-animation subset; trusted native paste is independently pixel-exact. |
| Android artwork and palette-editor paste | Artwork adds exactly one item. Editor imports the33 actually delivered colors, preserves its entered name and existing two wall items, and does not save automatically. |
| Independent sandbox-enabled Edge / Windows reference | Real OS PNG and trusted native paste agree. All alpha/opaque RGB exact;938 fractional-alpha RGB pixels change by at most one channel byte. App artwork/editor ownership passes. This uses the separately identified128×64 reference. |

The [controlled Codex comparison](../../bench/palette-clipboard-review/codex-controlled-comparison.json)
keeps the actual Save and pasted bytes separate from the exact-source golden.
The golden already differs from actual Save at118 visible RGB pixels, including
12 opaque pixels, with a different valid eight-color PICO-8 subset. Those
differences precede clipboard transfer and are **not** included in the245
clipboard-only count. A modeled premultiply/unpremultiply source transformation
reproduces Save exactly; that is supporting evidence, not a direct observation
of the browser's decoding path. Do not change matching to conceal this result.

Earlier manual128×64 wrong-tab pastes failed the32×24 oracle and are excluded.
Automation-generated Codex paste events were untrusted and also excluded.
The user-assisted native receiver paste is the actual transport evidence.
The receiver's original MIME metadata was read too late and could be empty;
the PNG/file/trust evidence remains valid. The corrected receiver captures all
metadata before awaiting and preserves each later attempt immutably.

## Rejected workaround

The bounded PNG + HTML research page writes an exact embedded PNG alongside
ordinary PNG. Android's real paste advertises HTML but returns an empty HTML
string to the tested handler; no embedded PNG is recovered. Its PNG has the same
RGB changes as the PNG-only control. Therefore this carrier is not shipped.
This rejects the tested approach, not every conceivable future Android carrier.
No arbitrary HTML/URL import, clipboard polling, permission change or RGB
correction was introduced.

## Regression and final build

- Full ordinary suite:913 passed, two GC-dependent tests skipped; both skipped
  checks exercised separately in the41-test client run.
- Build succeeds. Final index SHA256:
  `a4b434562abb9dd2fe7c52957318499de02f0f1244e4cb786379f7256b28834f`.
- Established built-app regression:132 legacy,11 Palette and11 RGB cases, plus
  all13 integration groups, pass against the pre-feature `061c880` baseline.
  Its intercepted clipboard payload assertions are not native-delivery evidence.
- Final physical Android rerun repeats all four native transfers with the same
  exact/nonexact outcomes, including artwork/editor ownership and carrier controls.
- Final Help: Codex Browser Keep/Cut/1-bit checks and Android Keep-partial,
  Cut-partial,1-bit and Keep-binary checks pass. Android448×819 has no horizontal
  dialog overflow and its44px Close button is visible, hit-tested and clickable.

Retained evidence and executable probes are under
[palette-clipboard-review](../../bench/palette-clipboard-review/).
The [independent review](2026-10-15-clipboard-independent-review.md) distinguishes
native observations, injected failures and modeled source transforms.

## Remaining concerns and recommended next work

1. Test actual Safari/iOS. Clipboard activation, export and touch behavior there
   remain unverified; Chromium/Android success does not close that platform gap.
2. Investigate the PNG import precision boundary with a direct decoded-source
   probe before proposing a lossless fallback. The current observation supports
   a focused spike, not an unreviewed decoder or a change to palette matching.
3. Keep current Auto, presets and controls. The completed Auto experiment failed
   its improvement-without-regressions gate. No additional algorithm, palette
   expansion, color-lock control or mobile shortcut row is justified here.

Other paste destinations, every browser version, large delayed native clipboard
snapshots, and universal artistic superiority remain outside these bounded
checks. Existing export snapshot regression coverage is retained. Native partial
RGB precision is a documented platform limitation, not a passing exactness test.

Separate commits: `c63d04c` plan, `256ad1e` production failure fix, `69715e1`
owned test harness/fixtures, `55c32cc` conditional Help and source documentation.
Final device evidence/review is committed separately.

Subsequent PNG follow-up: [direct decoder verification](2026-10-15-png-import-precision-verification.md)
confirms and repairs the native desktop input conversion in `d37d8b7`. The
corrected desktop Save now matches the frozen golden exactly. The independent
clipboard-transport differences above remain valid historical observations;
the native input repair does not claim an exact clipboard fix. Windows WebKit
fallback precision and actual Safari/iOS remain separate work.

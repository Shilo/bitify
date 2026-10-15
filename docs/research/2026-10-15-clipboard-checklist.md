# Actual image clipboard — working checklist

User-authorized follow-up, October 15, 2026. Starting revision `64cd3d5`.
The palette-feature checklist and Auto investigation are complete. Actual clipboard
delivery is the remaining requested gap; Safari/iOS is a separate platform gap.

| Work | Owner | Gate / status |
|---|---|---|
| Clipboard contracts and public platform constraints | Integration sub-agent | Complete. Source snapshot, activation and paste ownership traced; primary platform references retained in the contract review. |
| Owned fixtures and independent decoding | Kernel sub-agent | Complete. Four frozen 32×24 cases, positive and corruption checks; alpha checked independently against original sources. |
| Independent OS/permission/error challenge | Review sub-agent | Complete. Trusted Windows PNG/paste reference; four injected platform-failure paths reproduce and verify the promise-owner fix. |
| Codex Browser real Copy/Paste | Root | Complete within stated scope. Human Copy→trusted receiver paste of correct32×24 source; actual Save→paste isolates245 translucent RGB changes with exact alpha/opaque RGB. Separate app paste imports the user's screenshot; not mislabeled as output roundtrip. |
| Authorized USB Android real Copy/Paste | Kernel sub-agent | Complete on rebuilt `256ad1e`: four trusted native transfers; Cut/1-bit/GIF exact. Keep alpha exact, 246/672 visible RGB pixels changed in native transport. Artwork/editor paste ownership passed. |
| Reproduced fixes | Integration + independent review | Complete: promise ownership in `256ad1e`; conditional Help in `55c32cc`, reviewed and checked on both devices. QA receiver captures protected metadata before await and retains immutable attempts. |
| Regression and separate commits | Root + team | Complete:913 ordinary tests plus both GC-dependent checks exercised separately; build and132 legacy/22 palette cases plus13 integration groups pass. Final Android4native rerun and both Help checks passed. No push. |

Do not read the pre-existing user clipboard. First copy only our owned fixture;
read/paste only after the owned write succeeds. Test pages must not override
`navigator.clipboard.write/read` or manufacture ClipboardEvents for delivery claims.
Failure-injection tests are separate and explicitly labeled. If an OS/browser
transcodes a PNG, compare decoded pixels and distinguish platform changes from
the application output. Preserve the unchanged production Save output as control.

Desktop clipboard tests are serialized across sub-agents. Android has its own
clipboard. Exported PNG bytes, native clipboard files and app reimport behavior
must have separate provenance rather than an assumed shared oracle.

The PNG+HTML exact-carrier research is rejected for shipping in this batch:
Android advertises HTML but exposes an empty HTML string to the tested native
paste handler, so it recovers no embedded PNG. Its ordinary PNG has the same
RGB changes as the PNG-only control. This bounds the tested approach; it does
not establish that all future Android carrier designs are impossible.

Codex Browser automation produces untrusted paste events and does not establish
system clipboard delivery. Human-assisted trusted paste is complete. Earlier
128×64 pastes are wrong-tab attempts, explicitly rejected by the 32×24 oracle;
they must not count as this case passing.

The [final verification](2026-10-15-clipboard-verification.md) retains precise
source/transport boundaries and remaining work: Safari/iOS, a direct PNG-import
precision probe, and external destinations beyond the exercised receivers.

The subsequent [PNG precision checklist](2026-10-15-png-import-precision-checklist.md)
completes that direct probe and repairs the native desktop conversion in
`d37d8b7`. Its separate WebKit fallback and Safari/iOS limits remain explicit.

# Actual image clipboard — working checklist

User-authorized follow-up, October 15, 2026. Starting revision `64cd3d5`.
The palette-feature checklist and Auto investigation are complete. Actual clipboard
delivery is the remaining requested gap; Safari/iOS is a separate platform gap.

| Work | Owner | Gate / status |
|---|---|---|
| Clipboard contracts and public platform constraints | Integration sub-agent | Inspect activation, immutable copy snapshots, GIF first-frame semantics and paste ownership; research only until a defect is reproduced. |
| Owned fixtures and independent decoding | Kernel sub-agent | Keep/Cut + cap/Cleanup/dither, 1-bit, GIF frame0; compare actual decoded dimensions/RGB/alpha. |
| Independent OS/permission/error challenge | Review sub-agent | Seed only owned data before any read; trusted Copy/Paste, no mocked writes or synthetic paste events. |
| Codex Browser real Copy/Paste | Root | Pending trusted keyboard paste to independent receiver and app; preserve exact native payload evidence. |
| Authorized USB Android real Copy/Paste | Root | Pending native paste event/image transfer, app paste, and original-alpha/visible-RGB comparison. |
| Reproduced fixes | Assigned owner + independent review | Implement only supported defects; preserve source activation, settings/frame snapshots and unrelated text/editor behavior. |
| Regression and separate commits | Root + team | Repeat affected source/app/device checks after any fix; retain limits, commit separately, no push. |

Do not read the pre-existing user clipboard. First copy only our owned fixture;
read/paste only after the owned write succeeds. Test pages must not override
`navigator.clipboard.write/read` or manufacture ClipboardEvents for delivery claims.
Failure-injection tests are separate and explicitly labeled. If an OS/browser
transcodes a PNG, compare decoded pixels and distinguish platform changes from
the application output. Preserve the unchanged production Save output as control.

Desktop clipboard tests are serialized across sub-agents. Android has its own
clipboard. Exported PNG bytes, native clipboard files and app reimport behavior
must have separate provenance rather than an assumed shared oracle.

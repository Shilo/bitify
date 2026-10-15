# WebKit PNG fallback precision — completed investigation

Continuation from `505c26a`, October 15, 2026. User requests sub-agent investigation,
a fix only if it improves results without regressions, Codex Browser and physical
Android checks, and separate commits. Mac/iOS is explicitly unavailable and outside
this pass. No push or deployment.

| Work | Owner | Gate / status |
|---|---|---|
| Native alternatives | Integration + independent reviewer | Complete. HTML image → WebGL texture/FBO readback preserves owned visible RGBA in Windows WebKit; ImageBitmap upload remains lossy. All eight independent authored PNG controls pass direct GL. |
| Minimal candidate | Integration | Complete, research only. Static RGBA8 with canonical chunks and optional sRGB/pHYs; other files decline. Initial per-header scanner rejected after a valid 416-IDAT PNG declined at 88–101 ms. Streamed research revision accepts it exactly. No custom PNG pixel parser. |
| Independent correctness/security/performance challenge | Kernel + reviewer | Complete. Twenty final cancellation/resource/failure checks pass. Unsupported profiles/EXIF/APNG retain old behavior. The 59-case inventory describes the abandoned custom-decoder proposal, not native CRC acceptance. Repeated native cold stalls fail the shipping gate. |
| Actual Windows WebKit improvement | Reviewer | Source precision improves in research, but final streamed helper still blocks synchronously for 139–141 ms on three fresh tiny-image runs. No production integration or candidate app-output acceptance follows after this failed gate. Current app's known partial-alpha failure remains recorded. |
| Codex Browser and USB Android regressions | Root + kernel | Complete. Both pass 20 dithering + 16 palette phases. Native PNG saves and eight-color palette extraction remain exact. Direct research helper/unsupported declines/1 Mi-pixel controls pass on both; they do not replace the shipping fallback. |
| Decision, remaining concerns and separate commits | Root + team | Complete: **do not ship**. Research, regression evidence and decision are committed separately. [Decision and remaining work](2026-10-15-webkit-fallback-decision.md). |

The previous native-byte repair `d37d8b7` remains authoritative. Native clipboard
RGB changes are a separate platform boundary and are not claimed fixed by import
work. Existing Auto rejection and deferred palette/visual proposals stay unchanged.

The source decoder, runtime dependencies and built app remain unchanged. Warm
throughput and posted tasks do not erase the independently reproduced native
stall. Mac/iOS testing is unavailable by the user's instruction; it is not a
required pending action in this checklist. The fallback precision limitation
remains unresolved, distinct from the now-completed investigation.

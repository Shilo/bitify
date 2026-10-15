# WebKit PNG fallback precision — working checklist

Continuation from `505c26a`, October 15, 2026. User requests sub-agent investigation,
a fix only if it improves results without regressions, Codex Browser and physical
Android checks, and separate commits. Mac/iOS is explicitly unavailable and outside
this pass. No push or deployment.

| Work | Owner | Gate / status |
|---|---|---|
| Native alternatives | Integration + independent reviewer | Pending. Test straight ImageBitmap/WebGL texture readback before introducing a parser. Keep color management, orientation and bounds explicit. |
| Minimal candidate | Integration | Research only initially. If native alternatives fail, evaluate a strictly bounded static RGBA8 PNG path; decline other formats/metadata to existing native handling. |
| Independent correctness/security/performance challenge | Kernel + reviewer | Preserve valid PNG semantics, CRC/order, compressed/inflated/pixel limits, all supported filters, alpha, cancellation and resources. Exclude ambiguous profiles/animation/transforms. |
| Actual Windows WebKit improvement | Reviewer | Direct decoded-source and final app output must improve against independent goldens. Retain unsupported cases and negative controls. Do not call this Safari verification. |
| Codex Browser and USB Android regressions | Root + kernel | Current native exact path must remain intact; built app import, palette extraction and output checks plus relevant existing suites. |
| Decision, remaining concerns and separate commits | Root + team | Ship only a reviewed candidate passing these gates; otherwise record a no-ship result. Reconcile remaining non-Apple concerns rather than adding speculative controls. |

The previous native-byte repair `d37d8b7` remains authoritative. Native clipboard
RGB changes are a separate platform boundary and are not claimed fixed by import
work. Existing Auto rejection and deferred palette/visual proposals stay unchanged.

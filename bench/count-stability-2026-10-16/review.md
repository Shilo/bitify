# Independent count-continuity review

Scope: App/Tile/ImageViewer display-only count retention after committed
`3df3a4a`. No production edits or USB/Codex Browser control by this reviewer.

The initial candidate correctly separated the retained caption from strict
current-key reuse data, and reads presentation state untracked in the conversion
effect. It adds no full-source scans, frame cache or new animation timer. Source
identity, family and failure gates remain relevant; a completed sampled rendering
must not become an exact count.

**Blocking finding reproduced before correction:** after a previous full-source
count, changing matching and immediately choosing Reuse on a sampled 2048px sheet
creates a pending inspection. The sampled-render callback cloned that pending
record to clear its prior caption. The inspection's publication guard still
required the original object, so its result could never publish. The copied
`explicit` flag also risked disconnecting Preview cancellation from a joined
Reuse request. Baseline port 5343 opened the 25-color draft; initial candidate
5344 left a blank caption and no draft after 2.5 seconds. The script, JSON and
screenshots preserve this failure as candidate evidence, not a shipped defect.

Recommended minimal correction: retain operational pending-record identity and
its prior presentation until the current full-source inspection finishes. A
sampled completion may clear a non-pending fallback; it must not replace a pending
record. Widening several identity guards or copying mutable operation state is
unnecessary. The retained count is explicitly marked as previous output while
updating, and is never used for Reuse/export decisions.

The owner agreed and moved the pending/ready guard before the sampled-completion
branch. The independent reproduction now opens the correct 25-color draft on
corrected port 5344. A further independent check closes that draft and changes
matching without starting an inspection: once the sampled rendering completes,
the prior exact count disappears rather than masquerading as current metadata.

The remaining source review accepts the correction: strict current-key data still
controls Reuse and disabled-empty decisions; a different source object cannot
inherit the old label; family changes clear the record; published errors discard
the fallback; Preview cancellation and explicit Reuse joins retain the same
operational pending object. Presentation reads remain untracked in Tile's
conversion effect. One previous frozen metadata result is bounded and adds no
source/image/converted-frame retention or accumulated history. Animated unions
still require all frames. Root's broader device/browser regression evidence is
separate from this independent race reproduction.

**Agreement:** accept the minimal pending-identity correction and the display-only
continuity approach, with the previous count explicitly described as updating.
No additional production fix is identified by this read-only review. The first
candidate failure remains in `pending-review-results.json` and
`pending-5344-before.png`; corrected results are in
`pending-review-5344-results.json`.

## Save while Recolor is open

A final independent baseline comparison checked RGB matching, cap 44, Cleanup
and 4×4 dithering with Recolor open. Both baseline 5343 and corrected 5344 consume
the first Save press to close the panel, then download on the second press.
Both native PNGs are byte-identical and match all source visible RGB/alpha bytes.
This behavior is explicitly documented in Dock's existing outside-press capture
handler: outside press closes the panel and consumes its click. It is not caused
by the count fix. No change to that broader interaction contract is proposed in
this caption-continuity task. See `save-dismiss-review.mjs` and its JSON receipt.

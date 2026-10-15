# PNG import precision — working checklist

Continuation from `a6fc48f`, October 15, 2026. User authorizes investigation,
justified fixes, independent review and separate commits. No push/deployment.

| Work | Owner | Gate / status |
|---|---|---|
| Direct decoder observation | Integration + root | Pending. Probe the production decoder on the same owned PNG in Codex Browser and Android; record exact RGBA and browser capability/error boundaries rather than inferring a path from a model. |
| Independent format/alpha oracle | Kernel | Pending. Exercise partial alpha, format/profile/transform boundaries, cancellation and cleanup. Do not equate stored file RGB with color-managed sRGB for every profile. |
| Remaining checklist and Safari feasibility | Independent reviewer | Pending. Separate actual Safari/iOS from Windows WebKit testing, and actionable defects from rejected/deferred features. |
| Minimal justified implementation | Assigned owner + independent challenge | Only after a direct reproduction and bounded proposal. Preserve color management, all supported formats, limits, cancellation and resource release. |
| Device and regression verification | Root + kernel | Built app on Codex Browser and USB Android; appropriate unit/export regressions, no replacement of native delivery with mocked clipboard claims. |
| Evidence and separate commits | Root | Keep findings, rejected hypotheses and platform limits explicit. |

The previous clipboard evidence remains valid: native clipboard transfer changes
some translucent RGB values even when the exact PNG payload is supplied. Import
precision is a separate boundary. Do not change quantization or source colors to
conceal either effect. The tested PNG+HTML carrier remains unshipped.

Current Auto refinement remains rejected, existing curated palette choices and
defaults remain in place, and deferred visual effects are outside this task.

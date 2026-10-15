# PNG import precision — working checklist

Continuation from `a6fc48f`, October 15, 2026. User authorizes investigation,
justified fixes, independent review and separate commits. No push/deployment.

| Work | Owner | Gate / status |
|---|---|---|
| Direct decoder observation | Integration + root | Complete. Desktop explicit RGBA conversion changes 207/246 RGB pixels in two owned PNGs; native BGRA byte copy/channel ordering is exact. Android native RGBA is already exact. |
| Independent format/alpha oracle | Kernel | Complete. Eight independently authored exact PNG cases plus five managed/presentation/animation and four invalid/bounded cases; final corpus passes on both devices with stable dependency hashes. Corrected indexed-fixture chunk order before final runs. |
| Remaining checklist and Safari feasibility | Independent reviewer | Complete audit. Existing Windows WebKit tested without installation; six smoke checks pass, partial-alpha exactness suites retain failures. Actual Safari/iOS still needs appropriate access. |
| Minimal justified implementation | Integration + independent reviewer | Complete in `d37d8b7`. Strict known-sRGB RGBA/BGRA metadata guard, same output allocation, in-place cancelable BGRA reorder; other color spaces/formats retain managed conversion. No custom parser or float16 replacement. |
| Device and regression verification | Root + kernel | Complete. Native desktop PNG and physical Android Keep/Cut downloads match frozen goldens; exact eight-color image import on both. 929 unit tests pass (two GC-only skips),33 focused decoder tests pass, 36 Codex app phases and 132 legacy/22 palette exports plus 13 integration groups pass. |
| Evidence and separate commits | Root | Plan and production repair committed separately; final research/evidence committed separately. No push/deployment. |

The previous clipboard evidence remains valid: native clipboard transfer changes
some translucent RGB values even when the exact PNG payload is supplied. Import
precision is a separate boundary. Do not change quantization or source colors to
conceal either effect. The tested PNG+HTML carrier remains unshipped.

Current Auto refinement remains rejected, existing curated palette choices and
defaults remain in place, and deferred visual effects are outside this task.

See [final verification](2026-10-15-png-import-precision-verification.md) for
the exact final build, native output hashes and remaining platform limits.
The tested float16 alternative is rejected: it is exact for the desktop fixtures
but introduces Android RGB errors, including opaque pixels. Windows WebKit's
canvas fallback precision remains a separate open limitation; the native-only
repair intentionally does not claim to fix browsers lacking ImageDecoder.

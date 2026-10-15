# Palette-service coverage closure

Date: October 14, 2026. Follow-up to the initial review. This document records evidence boundaries; it does not claim every service behavior is verified.

## Follow-up website results

The previously authenticated isolated Edge profile remained usable. Both launches explicitly used `chromiumSandbox: true`. No authentication data, cookies, bearer headers or Google sign-in automation were used. Evidence retained from the reducer consists of sidebar state, scoped sidebar screenshots and sanitized service request metadata.

1. **Palette-image extraction works in the website.** Uploading the original synthetic four-pixel alpha target changed the selection to “Your image (3 colours).” Independent PNG decoding confirms three nonzero-alpha RGB entries and one fully transparent pixel: alpha values 0, 1, 128 and 255. The website therefore skips fully transparent palette pixels and accepts partial-alpha palette entries in this fixture. This differs from the independently tested REST target-image contract, where hidden RGB was an eligible candidate. The sidebar explicitly describes skipping transparent pixels and reducing inputs over 256 colors to 32 main colors; that latter threshold behavior is documented UI, not runtime-tested here.
2. **Lospec acquisition works in the website.** Entering `https://lospec.com/palette-list/slso8` and choosing Import produced “SLSO8 (8) 8 colours.” This verifies acquisition and parsed count, not exact exported hex contents or downstream mapping.
3. **Multiple owned source images import successfully.** Two original 64×32 ramps appeared as separate previews. With both present, the cap explanation changes to “one choice for all frames” and “Max colours limits them together.” This is observed scope wording; successful shared website output remains unverified.
4. **Two additional bounded Generate attempts did not yield attributable processing/output.** The first used the three-color image target and one 64×32 ramp, maximum eight, 4×4, strength five. The second used Lospec SLSO8, two 64×32 ramps, maximum two, 4×4, strength five. Each recorded 15 seconds after a ready-state click. Authenticated account/project/gallery metadata requests returned 200, but no reducer-processing request was captured. No generated output was downloaded or compared. This does not identify the failure cause or prove a server defect. No further Generate attempts were made.

No new paid API/MCP request or Pro generation was needed. The original confirmed usage remains 12.6 subscription generations, with the separate Pro response cost field of $0.08. Website billing remains unverified: five total normal Generate clicks across the initial and follow-up reviews advertised 0.1 each, but no charge is inferred from clicks.

Retained follow-up evidence:

- [Image-import and first submit state/network](../../../bench/palette-service-research/web-followup-evidence.json).
- [Lospec, two-frame input and second submit state/network](../../../bench/palette-service-research/web-import-followup-evidence.json).
- [Palette-image sidebar](../../../bench/palette-service-research/web-followup-image-import.png), [Lospec sidebar](../../../bench/palette-service-research/web-followup-lospec-import.png), [two-source sidebar](../../../bench/palette-service-research/web-followup-two-frame-controls.png).

## Coverage matrix

“Verified” means the stated observation was exercised, not that every input or interface is equivalent. REST/MCP PNGs were independently decoded; website affordances are explicitly separated from generated outputs.

| Palette-related feature | REST / MCP | Website | Remaining boundary |
| --- | --- | --- | --- |
| Auto and numeric reduction | Verified outputs; repeated auto fixture identical | Three modes observed | Website output/export |
| Target palette membership | Verified visible-RGB membership, one-color target, multiple frames | Presets, hex and image targets acquired | Website output/export |
| Target plus maximum | REST reducer rejects count plus target; Pro target cap verified | Target plus cap controls and shared-frame wording verified | Website cap enforcement |
| Ordered 2×2/4×4/8×8 + strength | All matrix outputs differ from None; zero equals None; exact entries unchanged | All choices and strength controls observed | Website output comparisons |
| Source alpha and palette-image alpha | Source partial alpha preserved; hidden RGB in transparent REST target is eligible | Image extraction skips fully transparent entry in tested fixture | Website output alpha; >256 image extraction |
| Color counts | Requested vs actual, distinct RGB vs RGBA count traps verified | Imported image/Lospec counts verified | Website generated used counts |
| Shared frames / unchanged coordinates | Shared target/generated palette verified; fixed-target ordered one-pixel change has zero unchanged-coordinate churn | Two-frame upload and shared-cap wording verified | Website shared output; motion-relative phase; duration weighting |
| Size/count validation | 262,144-pixel area boundary, 257 target colors, incompatible fields, frame dimension mismatch verified | PNG/JPG/GIF and 10MB affordance observed | Website size and GIF limits |
| Presets / import | Extension/static ecosystem inventory | 17 menu presets, mixed-separator deduplicated hex, malformed hex, image target and Lospec acquisition verified | Exact website preset hex export |
| Workbench extraction and ramps | Help, extraction and hue-shifted ramp calls exercised | Not required for reducer UI | Artistic preference and detailed ramp editing |
| Smart target mapping | One successful Pro generated result inside supplied palette/cap | No inspected reducer smart toggle | No same-input before/after superiority claim; no animation smart claim |
| Aseprite integration | Installed extension inspected statically | Not applicable | Extension runtime untested; local installation may contain edits |
| Palette snapping / repair / deflicker names | Workbench advertised surfaces inventoried | Not established | Runtime repair operations untested; names do not prove semantics |

The coverage supports shipping a bounded local ordered-dither option with explicit contracts. It does not justify copying an inferred internal algorithm, promising semantic mapping, or labeling the incomplete website export path verified. The [initial API/MCP report](api-mcp-evidence.md) and [website report](website-evidence.md) retain their original test-specific details.

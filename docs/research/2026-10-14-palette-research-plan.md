# Palette feature research plan

Date: October 14, 2026

Improve Colorfetti's palette recoloring and reduction through live service evaluation and independent experiments. This is research only; production behavior is unchanged.

## Workstreams

| Owner | Responsibility | Deliverable |
| --- | --- | --- |
| Main agent | Live website, current interface, synthesis and priorities | Website evidence and research index |
| API and MCP agent | Official schemas, authenticated black box tests, output validation | Service evidence, sanitized reproducible probes and outputs |
| Extension and palette agent | Read only extension review, palette choices, interoperability | Separate evidence and independent workflow spike |
| Algorithm agent | Current algorithm audit, primary literature, original comparison experiments | Dithering and low color fidelity spikes with results |

## Evidence and spike separation

Service specific observations, documentation URLs, local reference paths and any implementation observations belong only in `pixellab-review-2026-10-14/`. No credentials or copied competitor implementation may be saved.

The implementation neutral Colorfetti spikes in `palette-improvement-spikes-2026-10-14/` must stand alone. They contain no competitor source details, reference file paths, competitor URLs or links back to competitor evidence. Their evidence comes from Colorfetti, original experiments and independent primary literature.

## Test matrix

Evaluate automatic versus explicit color counts; supplied versus extracted palettes; palette subset limits; exact palette membership; opaque and partial alpha; 2, 4, 8 and larger counts; ordered dither sizes and strength; deterministic repeatability; shared animation palettes; still and multi frame results; palette imports, presets, editing and export; responsiveness and understandable settings.

Use original synthetic fixtures or public project fixtures. Record requested settings, actual opaque colors, palette violations, alpha changes, dimensions, latency and response failures. Distinguish documented contracts, live verified behavior, local implementation observations, independent experiments and unresolved questions. Do not infer an internal algorithm from appearance alone.

## Sequence

1. Read project rules and establish current feature baseline. Complete.
2. Dispatch three parallel research agents. Complete.
3. Inspect website in Codex Browser and conduct API and MCP probes. Complete with explicit website runtime limits: REST/MCP outputs verified; sandboxed Edge controls and hex validation verified; website submitted output/export unverified.
4. Run independent algorithm experiments and write self contained spikes. Complete: 30 method/fixture cases, eight preset comparisons and collection-budget reproduction.
5. Reconcile evidence, prioritize proposed improvements and audit spike separation. Complete. The feature review separates observed website controls from verified service outputs and contains the ranked next steps.

The original Codex Browser login showed failed service fetches and apparent session loss. Playwright's default disabled browser sandbox was corrected before user sign in to that instance. The replacement uses Chromium sandboxing explicitly. Google's rejection of the automated browser was resolved for PixelLab access by the user's email magic link. Website output behavior must remain qualified separately from verified API results.

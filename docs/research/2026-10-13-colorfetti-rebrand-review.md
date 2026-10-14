# Colorfetti rebrand audit and resolutions

The background and export policy in this historical audit was superseded by the
[current brand guide](2026-10-13-colorfetti-identity.md): general logos and favicons
are now tightly cropped transparent light/dark variants; installed icons retain
dedicated opaque backgrounds and platform padding. Prior measurements below
describe the earlier assets and remain historical evidence.

The repository and production addresses subsequently moved to
`https://github.com/Shilo/colorfetti` and `https://shilo.github.io/colorfetti/`.
The owner chose no old-site redirect and no installed-app migration. References
below to the former external addresses describe the earlier audit; saved-data
aliases and historical source paths remain intentional compatibility data.

October 13, 2026. The approved identity is Colorfetti, the fixed C-frame confetti mark and “Throw your pixels a palette party. Recolor images and animations.” Help uses “Pick palette, 1-bit colors or import your own.”

## Parent review of the independent findings

| Finding | Independent challenge and final decision |
| --- | --- |
| R1: retained branded screenshot | Viewed the baked retired name; deleted the screenshot and its gallery entry. |
| R2: report builders damaged by cleanup | Compared baseline source and surviving research assets. Restored legitimate generator/replacement lines and successfully regenerated both HTML reports. Algorithm artwork stays. |
| R3: historical source lookup broken | Verified the renamed path is absent in the pinned revision. Restored the actual historical lookup; it is compatibility data. |
| R4: pre-rebrand palette QA broken | Verified filename/import differences and preserved exact algorithm comparisons while normalizing only the module-path rename. Snapshot encoder dependencies from the same baseline revision. |
| R5: other session's scratch snapshot inaccessible | Verified explicit file-presence selection preserves both filenames without modifying the other session's artifact. Corrected equivalence checks pass 26,400 cases. |
| R6: stale instructions/dimensions | Checked master, runtime, manifest and generator; corrected the Installing/Help prose, C branding, sample dimensions and deployment comment. |
| R7: line-ending churn | Restored repository LF text endings in the follow-up. |

The SVG MIME concern was dismissed after the actual production Help image loaded successfully as a data URL. No change to selected logo geometry, palette or universal backplate was warranted. Existing deployment URLs, saved-data aliases, historical Git-object lookups and local scratch compatibility names remain accurate technical references.

Unrelated live-reanalysis implementation and other sessions' untracked or ignored files are excluded from these branding commits. Empty saved libraries remain authoritative after Reset so legacy records cannot reappear. Browser checks verify migration, selected palette, saved theme, deletion and reload.

## Validation

- All 779 active unit tests passed; 2 existing tests skipped.
- Production build and all 12 reproducible icon exports passed.
- Desktop/mobile light/dark browser checks passed for exact copy, Help, demo, theme and asset requests.
- Independently decoded PNG/ICO sizes, opacity, exact colors and maskable safe bounds passed.
- Legacy migration and saved-palette Reset/reload checks passed.
- Historical-baseline browser regression passed: 132 legacy exports, 9 full palettes in Oklab and RGB, GIF/ZIP/clipboard output, snapshots, storage events and palette imports; no browser exceptions.

## Independent report


Reviewed October 13, 2026. Read-only audit of `ebf5cac`, `7bca403`, `d2e13c9`, and subsequent working-tree corrections. Unrelated live reanalysis implementation in `5b7d08f` and other sessions' untracked/ignored experiments were excluded.

## Verified findings

### R1 — P2: one retained screenshot still contained the retired name

`docs/design/mockups/design-comparison.jpg` visibly reads **BITIFY / DESIGN EXPLORATION** at the top left. `docs/design/gallery.html:4` embedded it while describing retained studies as unbranded. Visual inspection confirmed the baked lettering. Parent removed the image and its gallery figure; inspected and verified in the working tree. The two retained palette control comparison PNGs have no old product branding.

### R2 — P2: cleanup removed legitimate algorithm report generation

`bench/icon-research/compare.py` lost generation of the four `*-comparison.png` sheets and `color2gray-comparison.png`; `report.py:99` lost their five replacement entries while its body retained `C2G_IMG`, `GENERAL_IMG`, `WEAPONS_IMG`, `ACCESSORIES_IMG` and `ARMOR_IMG`; `results.py:36` lost `comparison.save(ROOT/'breastplate-final-comparison.png')`. These images remain legitimate conversion research, not product logos. The remaining-key assertion would not detect the omitted replacements. Git diffs reproduce the accidental deletions. Parent restored the three builders and regenerated the HTML reports; restored calls verified in the working tree. Embedded contact sheets independently viewed contain source inventory artwork and algorithm masks.

### R3 — P2: historical Stencil investigation requests a nonexistent renamed file

`bench/icon-research/stencil-guard.mjs:9` requests `7c0437d:src/lib/recolor.js`. `git cat-file -e 7c0437d:src/lib/recolor.js` fails because that revision predates the rename. Keep the historical `src/lib/bitify.js` lookup. A name in an immutable historical Git object is compatibility data rather than current branding. Reported to parent; parent corrected it.

### R4 — P2: palette regression harness no longer supports pre-rebrand baselines

`bench/palette-qa.mjs:30` unconditionally requests `BASE_REF:src/lib/recolor.js`; `git cat-file -e ebf5cac:src/lib/recolor.js` proves this path absent. Its `presets.js` equality check also encounters the intentionally renamed import. At line35 the snapshot relocation handles only `from './recolor.js'`, while `git show ebf5cac:src/lib/save.js` contains `from './bitify.js'`; importing that historical snapshot from scratch would fail. Resolve the engine's path per revision, normalize only that approved module-path rename for oracle comparison, and relocate either old or current parser imports. Do not normalize algorithm changes away. Reported to parent; parent corrected it.

### R5 — P2: existing local equivalence snapshot became unusable

`bench/equiv.mjs:5` requested only `bench/recolor.old.js`, but the existing other-session snapshot is `bench/bitify.old.js`. Running the script reproduced `ERR_MODULE_NOT_FOUND`. Parent added explicit file-existence selection, prioritizing the current scratch name and accepting the legacy one, and ignores both. This preserves another session's artifact without renaming or committing it. Verified by running the corrected script: **24,000 unchanged cases and 2,400 Icon cases passed**. Presence-based fallback correctly avoids swallowing actual import execution errors.

### R6 — P2/P3: documentation still instructed use of retired branding and tooling

The canonical app spec's Installing section around1192–1203 still named deleted `pwa-assets.config.js`, the former assets-generator command, three icons and orange backgrounds. `docs/design/2026-10-09-numbered-refinements.md:8` still prescribed a pixel B mark. `docs/design/import-export-layouts.html:204` labelled the current76px example as28px. Parent replaced these descriptions with the approved generator, suite, C mark and dimensions; inspected working-tree corrections.

Additional minor literals reported: the spec's later Help refinement around1838–1841 prescribed PNG instead of the actual SVG and quoted an old Palette instruction; `vite.config.js:7` described an invented `/colorfetti/` Pages deployment path; old mockup CSS said the logo was28px. Parent addressed these. Historical layout/functionality statements unrelated to branding are not grounds to rewrite the conversion history wholesale.

### R7 — P3: accidental line-ending churn made the broad commit difficult to review

`d2e13c9` converted numerous text blobs to CRLF. Reviewing with `--ignore-space-at-eol` distinguishes actual changes. Parent restored established tracked line endings in the correction commit. No functional defect was attributed solely to CRLF.

## Audited and not substantiated as defects

- SVG geometry matches the approved square C frame: artboard38, occupied30, outer padding4, frame thickness6, gap2; equal22-unit arms; orange/violet6-unit right corners, teal6×14 right center, pink/yellow14×6 interior pieces. Exact assigned fills match the selected palette. Off-white backplate is `#FFFDF9`.
- `node build/brand-assets.mjs --check` succeeds for all12 exports and validates the complete foreground inside the maskable safe circle.
- Independent Pillow decoding confirms all10 PNGs have their intended dimensions and exactly the approved seven opaque colors. ICO exposes16/32/48 images; all are opaque. No raster palette substitutions found.
- Universal opaque backplate is a defensible choice for light/dark browser and installation surfaces. Separate theme variants are not necessary to preserve the selected black frame. Ordinary and maskable purposes are correctly separated.
- Public title, manifest names/description, SEO/OG copy, README, Help brand paragraph and Palette instruction use the requested identity. The app's recolorable demonstration is distinct from fixed public branding by documented intent.
- Source and animation-module renames are consistently imported in tracked current runtime modules/tests; no old runtime module references found.
- Migration reads the canonical record first and writes legacy data to its replacement key without deleting source records. The authoritative empty palette record on Reset prevents restoration from the old alias. Canonical cross-tab listeners and just-before-write rereads retain existing behavior. A still-open pre-rebrand tab writing the old key is not represented as synchronization support; no new promise requires it.
- Actual GitHub/Pages `/bitify` URLs remain valid external addresses; legacy storage aliases and historical Git-object paths should remain. Replacing these mechanically would break functionality.
- Inventory reviewed covers236 affected paths across the three requested commits, including97 image deletions, the old animation asset/config retirement, seven source/document renames, production metadata/assets, bench imports/builders, documentation and mockups. Follow-up removal adds the one missed screenshot above.
- Automated relative Markdown/HTML link scan found no newly broken relative asset link after corrections. One old `palettes.md` link in a historical plan predates the rebrand; one `tile-` string is dynamic JavaScript rather than a static asset.
- Extracted2,807 embedded data-image references: report8, results2,795, prototype2, malformed test inputs2. None are byte-identical to the former product logo PNG/GIFs. Visible large report sheets were independently inspected as algorithm evidence, not retired UI screenshots. Regenerated builders disable removed UI-screenshot substitutions while preserving algorithm images.
- Investigated SVG MIME handling in the drop QA server: the production Help SVG is a data URL and rendered successfully (`complete=true`, naturalWidth150). Missing `.svg` mapping in that server therefore did not establish a rebrand Help failure.

## Coverage limits

This audit independently checks code, Git history, reference inventories, asset decoding and selected visual evidence. Parent reports all779 unit tests, production build, desktop/phone light/dark browser QA and legacy migration/reset browser checks passing; those full suites were not duplicated here. Physical iOS/Android installation, OS-specific icon effects, user-tested small-size recognition, color-blind recognition and trademark clearance remain outside verified coverage. No speculative redesign or additional format restrictions are recommended.

## Complete branding file inventory

Source/document renames appear as removed former paths and added current paths. The inventory spans the icon-suite, approved-copy, broad-rebrand and review-correction work.

### Added or replaced

- `bench/animation-fixture.mjs`
- `build/brand-assets.mjs`
- `docs/brand-copy.md`
- `docs/research/2026-10-13-colorfetti-rebrand-review.md`
- `docs/superpowers/plans/2026-10-06-colorfetti-app.md`
- `docs/superpowers/specs/2026-10-06-colorfetti-app-design.md`
- `docs/superpowers/specs/2026-10-06-colorfetti-prototype.html`
- `public/apple-touch-icon-152x152.png`
- `public/apple-touch-icon-167x167.png`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/favicon.ico`
- `public/maskable-icon-192x192.png`
- `src/assets/logo.svg`
- `src/lib/converted-animation.js`
- `src/lib/converted-animation.test.js`
- `src/lib/recolor.js`
- `src/lib/recolor.test.js`
- `src/lib/storage-migration.js`
- `src/lib/storage-migration.test.js`

### Modified

- `.claude/launch.json`
- `bench/.gitignore`
- `bench/alias.mjs`
- `bench/auto-performance-audit.html`
- `bench/auto-performance-import-profile.js`
- `bench/bench.mjs`
- `bench/design-qa.mjs`
- `bench/equiv.mjs`
- `bench/icon-research/bench-icon.mjs`
- `bench/icon-research/compare.py`
- `bench/icon-research/current.mjs`
- `bench/icon-research/evaluate-icon.mjs`
- `bench/icon-research/integration-check.mjs`
- `bench/icon-research/integration-icon.md`
- `bench/icon-research/integration-icon.mjs`
- `bench/icon-research/phone-check.html`
- `bench/icon-research/report.html`
- `bench/icon-research/report.py`
- `bench/icon-research/results.html`
- `bench/icon-research/results.py`
- `bench/icon-research/stencil-guard.mjs`
- `bench/icon-research/verify.mjs`
- `bench/image-drop/qa.html`
- `bench/image-drop/server.mjs`
- `bench/kcost.mjs`
- `bench/leak.mjs`
- `bench/live-reanalysis-phone.mjs`
- `bench/live-reanalysis-qa-server.mjs`
- `bench/live-reanalysis-qa.html`
- `bench/live.mjs`
- `bench/onebit-export-qa-server.mjs`
- `bench/onebit-export-qa.html`
- `bench/palette-failure-qa-server.mjs`
- `bench/palette-integration-qa.html`
- `bench/palette-performance-spike.html`
- `bench/palette-playback-qa.html`
- `bench/palette-preview-reuse-qa.html`
- `bench/palette-preview-reuse-server.mjs`
- `bench/palette-qa.mjs`
- `bench/palette-wall-stress.html`
- `bench/png.mjs`
- `bench/saved.mjs`
- `bench/style-panel-qa.mjs`
- `bench/style-rotation-qa.mjs`
- `bench/theme-qa.mjs`
- `bench/tone.mjs`
- `build/hover-capability.js`
- `CLAUDE.md`
- `docs/design/2026-10-09-control-geometry-and-native-feedback.md`
- `docs/design/2026-10-09-correction-pass.md`
- `docs/design/2026-10-09-current-ui-migration.md`
- `docs/design/2026-10-09-floating-islands-adoption.md`
- `docs/design/2026-10-09-glass-canvas-research.md`
- `docs/design/2026-10-09-glasskit-library-audit.md`
- `docs/design/2026-10-09-numbered-refinements.md`
- `docs/design/2026-10-10-bottom-workspace.md`
- `docs/design/gallery.html`
- `docs/design/import-export-layouts.html`
- `docs/design/palette-comparison.html`
- `docs/design/README.md`
- `docs/design/validation.md`
- `docs/export-drag-prototype.md`
- `docs/palettes.md`
- `docs/performance.md`
- `docs/research/2026-10-11-aseprite-artwork-support.md`
- `docs/research/2026-10-11-mp4-support.md`
- `docs/research/2026-10-11-one-bit-nearest.md`
- `docs/research/2026-10-12-claude-code-project-performance-stability-review.md`
- `docs/research/2026-10-12-cleanup-pixellab-corpus.md`
- `docs/research/2026-10-12-codex-subagent-project-performance-stability-review.md`
- `docs/research/2026-10-12-generated-wall-stress-stage-summary.json`
- `docs/research/2026-10-12-generated-wall-stress.md`
- `docs/research/2026-10-13-claude-code-fix-review.md`
- `docs/research/2026-10-13-claude-code-hover-f3-onebit-review.md`
- `docs/research/2026-10-13-colorfetti-identity.md`
- `docs/style-settings-handoff.md`
- `docs/styles.md`
- `docs/superpowers/mockups/2026-10-08-none-color.html`
- `docs/superpowers/mockups/2026-10-08-transparent-control-labels.html`
- `docs/superpowers/mockups/2026-10-08-transparent-control.html`
- `docs/superpowers/mockups/style-settings.html`
- `docs/superpowers/plans/2026-10-07-conversion-styles.md`
- `docs/superpowers/plans/2026-10-08-none-color-and-stencil.md`
- `docs/superpowers/specs/2026-10-07-conversion-styles-design.md`
- `docs/superpowers/specs/2026-10-07-quick-switch-mockups.html`
- `docs/superpowers/specs/2026-10-08-none-color-and-stencil-design.md`
- `docs/theme-testing.md`
- `index.html`
- `package-lock.json`
- `package.json`
- `public/apple-touch-icon-180x180.png`
- `public/favicon.svg`
- `public/manifest.webmanifest`
- `public/maskable-icon-512x512.png`
- `public/pwa-192x192.png`
- `public/pwa-512x512.png`
- `README.md`
- `src/app.css`
- `src/App.svelte`
- `src/assets/logo.png`
- `src/glass.css`
- `src/lib/export-drag.js`
- `src/lib/gif.js`
- `src/lib/icon.test.js`
- `src/lib/image-import-core.js`
- `src/lib/image-import-core.test.js`
- `src/lib/image-reanalysis.js`
- `src/lib/image-reanalysis.test.js`
- `src/lib/palette-export.test.js`
- `src/lib/palette-library.js`
- `src/lib/presets.js`
- `src/lib/save-batch.test.js`
- `src/lib/save.js`
- `src/lib/style-preview.js`
- `src/Tile.svelte`
- `vite.config.js`

### Removed

- `.github/logo.png`
- `bench/icon-research/browser-desktop.jpg`
- `bench/icon-research/browser-phone.jpg`
- `bench/icon-research/user-app-originals.png`
- `bench/icon-research/user-app-stencil-edges.png`
- `docs/design/mockups/bottom-circular-style-desktop-dark.png`
- `docs/design/mockups/bottom-fullscreen-desktop-dark.png`
- `docs/design/mockups/bottom-fullscreen-touch-dark.png`
- `docs/design/mockups/bottom-palette-desktop-dark.png`
- `docs/design/mockups/bottom-palette-touch-dark.png`
- `docs/design/mockups/bottom-remove-confirm-touch-light.png`
- `docs/design/mockups/bottom-scrolling-palette-touch-light.png`
- `docs/design/mockups/bottom-share-sheet-touch-dark.png`
- `docs/design/mockups/bottom-share-sheet-touch-light.png`
- `docs/design/mockups/bottom-share-touch-dark.png`
- `docs/design/mockups/bottom-workspace-desktop-dark.png`
- `docs/design/mockups/bottom-workspace-touch-dark.png`
- `docs/design/mockups/bottom-workspace-touch-light.png`
- `docs/design/mockups/clear-desktop.jpg`
- `docs/design/mockups/clear-landscape-picker.jpg`
- `docs/design/mockups/clear-phone-style-picker.jpg`
- `docs/design/mockups/clear-phone-style.jpg`
- `docs/design/mockups/clear-phone.jpg`
- `docs/design/mockups/clear-small-phone-picker.jpg`
- `docs/design/mockups/comparison.png`
- `docs/design/mockups/consistent-controls-dark.png`
- `docs/design/mockups/consistent-controls-phone-light.png`
- `docs/design/mockups/consistent-palette-dark.png`
- `docs/design/mockups/consistent-palette-light.png`
- `docs/design/mockups/corrected-advanced-desktop-dark.png`
- `docs/design/mockups/corrected-empty-desktop-dark.png`
- `docs/design/mockups/corrected-empty-phone-dark.png`
- `docs/design/mockups/corrected-empty-phone-light.png`
- `docs/design/mockups/corrected-empty-touch-reduced-dark.png`
- `docs/design/mockups/corrected-fullscreen-phone-dark.png`
- `docs/design/mockups/corrected-landscape-touch-dark.png`
- `docs/design/mockups/corrected-none-scroll-dark.png`
- `docs/design/mockups/corrected-palette-scroll-dark.png`
- `docs/design/mockups/corrected-remove-confirm-dark.png`
- `docs/design/mockups/corrected-scrolling-dock-dark.png`
- `docs/design/mockups/corrected-scrolling-palette-light.png`
- `docs/design/mockups/corrected-style-phone-dark.png`
- `docs/design/mockups/design-comparison.jpg`
- `docs/design/mockups/dock-desktop-advanced.jpg`
- `docs/design/mockups/dock-desktop-palette.jpg`
- `docs/design/mockups/dock-desktop-style-picker.jpg`
- `docs/design/mockups/dock-desktop.jpg`
- `docs/design/mockups/dock-phone-palette-light.jpg`
- `docs/design/mockups/dock-phone-single.jpg`
- `docs/design/mockups/dock-phone-solid-dots.jpg`
- `docs/design/mockups/dock-phone.jpg`
- `docs/design/mockups/dock-small-phone-empty.jpg`
- `docs/design/mockups/dock-small-phone-many.jpg`
- `docs/design/mockups/floating-islands-adopted-desktop.jpg`
- `docs/design/mockups/floating-islands-touch-qa.jpg`
- `docs/design/mockups/glasskit-default-contrast-stress.png`
- `docs/design/mockups/glasskit-default-dark.png`
- `docs/design/mockups/glasskit-default-light.png`
- `docs/design/mockups/inspector-desktop-palette.jpg`
- `docs/design/mockups/inspector-desktop-style.jpg`
- `docs/design/mockups/inspector-desktop.jpg`
- `docs/design/mockups/inspector-narrow-desktop-picker.jpg`
- `docs/design/mockups/inspector-phone.jpg`
- `docs/design/mockups/inspector-tablet-picker.jpg`
- `docs/design/mockups/layout-bottom-dark.png`
- `docs/design/mockups/layout-top-dark.png`
- `docs/design/mockups/layout-top-phone-light.png`
- `docs/design/mockups/layout-vertical-dark.png`
- `docs/design/mockups/native-reset-phone-dark.png`
- `docs/design/mockups/native-reset-protected-white-dark.png`
- `docs/design/mockups/native-reset-protected-white-light.png`
- `docs/design/mockups/native-selection-toast-phone-light.png`
- `docs/design/mockups/opaque-actions-dark.png`
- `docs/design/mockups/opaque-actions-light.png`
- `docs/design/mockups/readability-checker-light.jpg`
- `docs/design/mockups/readability-dots-dark.jpg`
- `docs/design/mockups/readability-lines-light.jpg`
- `docs/design/mockups/readability-local-checker-light.jpg`
- `docs/design/mockups/readability-neutral-light.jpg`
- `docs/design/mockups/readability-phone-checker.jpg`
- `docs/design/mockups/refined-empty-desktop-dark.png`
- `docs/design/mockups/refined-empty-desktop-light.png`
- `docs/design/mockups/refined-empty-phone-dark.png`
- `docs/design/mockups/refined-empty-phone-light.png`
- `docs/design/mockups/refined-fullscreen-phone-dark.png`
- `docs/design/mockups/refined-palette-dark.png`
- `docs/design/mockups/refined-palette-none-dark.png`
- `docs/design/mockups/refined-style-previews-dark.png`
- `docs/design/mockups/reset-default-white-dark.png`
- `docs/design/mockups/reset-default-white-light.png`
- `docs/design/mockups/theme-consistent-dark.png`
- `docs/design/mockups/theme-consistent-light.png`
- `docs/design/mockups/uniform-empty-desktop-dark.png`
- `docs/design/mockups/uniform-empty-desktop-light.png`
- `docs/design/mockups/uniform-empty-landscape-light.png`
- `docs/design/mockups/uniform-empty-small-phone-dark.png`
- `docs/design/mockups/uniform-empty-small-phone-light.png`
- `docs/superpowers/plans/2026-10-06-bitify-app.md`
- `docs/superpowers/specs/2026-10-06-bitify-app-design.md`
- `docs/superpowers/specs/2026-10-06-bitify-prototype.html`
- `docs/superpowers/specs/2026-10-07-conversion-styles-spike.png`
- `pwa-assets.config.js`
- `src/assets/logo.gif`
- `src/lib/bitified-animation.js`
- `src/lib/bitified-animation.test.js`
- `src/lib/bitify.js`
- `src/lib/bitify.test.js`

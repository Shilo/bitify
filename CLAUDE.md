# Colorfetti

Throw your pixels a palette party. Recolor images and animations.

Colorfetti recolors images, sprites and animated GIFs with automatic, preset or custom palettes. Palette recoloring is the primary workflow; 1-bit styles are an optional mode for two-color effects. It runs entirely in the browser, with full palettes of 1–256 unique opaque RGB colors. The 1-bit family uses two chosen colors, either of which can be None (transparent). There is no backend and nothing is uploaded.

The brand master is `src/assets/logo.svg`: a tightly cropped transparent 30×30 C frame with five fixed confetti colors. `logo-dark.svg` uses an off-white C for dark surfaces. Help and the transparent 60×60 recoloring example follow the app theme; favicon assets follow the browser-reported preference independently. Dedicated opaque installed/Apple icons retain `#FFFDF9` backgrounds and platform padding; maskables respect the safe circle. `npm run icons` generates 23 exports and `node build/brand-assets.mjs --check` verifies them. The brand guide is docs/research/2026-10-13-colorfetti-identity.md. Current storage keys use colorfetti; storage-migration.js reads legacy keys so existing settings and saved palettes carry over. Repository and deployment URLs remain at their actual addresses.

Repository: `https://github.com/Shilo/colorfetti`. Production: `https://shilo.github.io/colorfetti/`.
The Pages path moved with the repository rename; the old website address has no
redirect. Legacy browser storage aliases and historical Git-object paths remain
intentional compatibility references.

## What it does

Palette improvements offer twelve curated presets (including Mulfok 32, exact
Black & White and ENDESGA 8), Lospec links through Paste colors, and one Reuse
colors action beside Copy in wall actions (also in touch Image actions, before
Preview). Preview retains Save/Copy/Compare and no Count/Reuse button. Reuse opens the existing
editable palette draft with full-resolution output colors, unioning all GIF
frames. Counts are plain caption metadata after dimensions. Wall counts reuse
post-Cleanup used flags only from already-rendered exact-size previews; GIFs
publish only after every frame was observed at full resolution. Sampled walls
start no extra inspection. Preview starts missing full-source inspection and
cancels it on close unless explicit Reuse joined it. Keep tiny color/frame
metadata only, never converted frame caches. Source/settings changes cancel and
clear counts; Auto keys use the captured wall request. Known zero-color outputs
disable reuse; newly inspected empty outputs explain why no palette can be made.

Optional Palette Opacity Cut/Keep defaults to Cut128. Keep uses eligibility cut1
for Auto/subset/Cleanup, preserves source alpha in sampled previews/exports and
adds one alpha byte per sample. PNG with partial alpha uses RGBA8; binary packing
and GIF stay unchanged. Partial-alpha GIF fails explicitly, including atomic ZIP;
it never silently thresholds Keep. All snapshot/cache/drag identities include mode.
The cutoff slider is Cut-only and guards detached native gestures. See the working
checklist docs/research/2026-10-14-palette-improvements-todo.md for evidence and limits.
Copy prepares the same exact PNG as Save; native clipboard transport can round
translucent RGB. Help adds Save guidance only in Palette/Keep with the existing
partial-opacity `soft` state, without another scan or control.

Full-palette thumbnails/editor swatches and New/Edit color previews paint directly
to tiny canvases (1×1 solids; 100×100 at-most-16-color overview). This prevents
observed Brave forced-dark CSS/SVG color substitutions. No UI-canvas readback or
encoding enters import/export; palette values stay intact. The 1-bit rail also uses
100×100 paint-only diagonal pairs, and its two active opaque color inputs have
pointer-inert 1×1 overlays. None hides its overlay; transparency glyphs remain CSS.
Native inputs retain their hit targets beneath pointer-inert decorative canvases.

Optional full-palette ordered dithering offers Off/2×2/4×4/8×8 and Dither strength 0–100%
(remembered 50%); fresh and Reset default to Off. The settings heading and Help
step are Recolor. Source-coordinate Bayer patterns preserve alpha and exact active
palette colors; zero preserves nearest output. Existing 1-bit styles stay separate.
The bounded four-candidate linear-light mixture heuristic is in palette-dither.js;
RGB Matching ranks candidates, while mixture scoring remains Oklab. Cap/Auto and
frozen nearest Cleanup decisions remain independent; approved cleanup replacements
override the pattern with solid colors. Dither and amount must participate in every
preview/cache/export snapshot. Dither strength appears only while enabled, wraps within
the existing 78px label column and has a 44px-high range target. The explicit pattern
dimensions describe source pixels. Strength commits after 200ms or release/change; native
range ownership is keyed by palette and method, and abandoned edits are canceled.
See docs/research/2026-10-14-full-palette-dithering-implementation.md for review,
desktop/physical Android tests, performance and limits. This contract supersedes
historical Nearest-only wording below.

The screen is a wall of image tiles with one floating dock of controls. Images are added by drop, file picker or paste. Changing a color, palette, style or setting redraws every image at once. Either color can be None, set by a small three-way switch beside the palette's name; its pixels are transparent on the wall and in every saved or copied file. There are eleven styles; the default, Cutout, fills the bright parts of a sprite and cuts its parts apart, in the style of the game End of End. Icon, the fifth, selects coherent cavities and openings on small transparent sprites, and sparse grooves on larger art, from source RGB and alpha. Stencil, the fourth, fills a whole sprite and cuts only its darkest inner lines; with the first color None it makes icons in one color. The threshold is Auto (picked per image) or manual. Every style also has settings of its own (Hatch's direction, Bayer's matrix and so on), each remembered for that style; a wide screen shows them all in a tray that More opens under the style strip, and a phone shows them as chips with one control at a time. The original can be compared by a switch, by holding a tile, or by holding Space. Scrolling, swiping up or down, or the up and down arrow keys step through the styles; Shift or Ctrl with the wheel, a sideways swipe, or the left and right arrow keys step through the palettes. The wheel and swipes step only over the top bar, the wall or the empty screen where it does not itself scroll, never over a top bar button, the dock, a panel or a dialog; the arrow keys step from anywhere. Stills save as PNG; animated GIFs play on the wall and save as GIF; Download all makes a zip. Each tile also has a Copy button that puts its image on the clipboard as a PNG, and Ctrl+C copies the first image. On touch screens a tile's Copy and Download sit behind one Share button, which opens a sheet with both. Tiles resize to fill the space between the top bar and the dock. The empty screen shows the logo as a live example of the current settings. Help, in the More menu, is a dialog that says what Colorfetti is, gives short steps for the current mode and lists the controls, all worded for the device in use (touch, or mouse and keyboard); it also opens by itself on a first visit, as a welcome. It can be installed as an app, from an Install row in the More menu where the browser offers that; there is no service worker and the app caches nothing itself, so it does not work offline. It has to work on desktop, iOS and Android.

Read docs/superpowers/specs/2026-10-06-colorfetti-app-design.md before changing behavior. It is the source of truth for the rules above, including the exact conversion and layout rules. Update it in the same change as the code.

docs/palettes.md leads with Auto, curated palettes, import/edit and the local library, followed by the optional twelve 1-bit color pairs. docs/styles.md explains each of the eleven 1-bit styles, with worked examples and settings. docs/performance.md explains how the app stays fast with big images on phones: what a tile converts and why, the drafts while a slider is dragged, what was measured, and what was tried and thrown away. Read it before changing recolor.js, layout.js, gesture.js, Tile.svelte or the saving and adding code in App.svelte.

Confetti feedback for import, individual removal and Save is **deferred**, with the visual design still unapproved. [The deferred research](docs/research/2026-10-13-colorfetti-spatial-effects-plan.md) records requirements, event hooks, renderer options and performance evidence. Its prototype is an unfinished reference, not authorization to implement or ship the effect.

Auto leads the full rail directly before Resurrect 64, without a divider between them. The twelve curated presets follow in descending color count: Resurrect 64, ENDESGA 32, Mulfok 32, PICO-8, DawnBringer 16, ENDESGA 8, Grayscale 8, Ice Cream GB, Game Boy Green, Black & White, Glow and Paper. Vertical dividers separate the 64/32/16/8/4/2-color groups and the saved library. Comparable artist palettes follow dated Lospec popularity evidence; generic reference palettes retain utility ordering rather than invented popularity scores. The 1-bit rail and stepping order group Glow/Mono/Paper/Torch/Rose, then Game Boy/Pocket/Nokia/Playdate, then Phosphor/Amber/Commodore, with dividers between these classics/decorative, handheld and monitor groups. Fresh visits and global Reset select Palette/Generated; existing saved selections remain intact, including legacy records without a family field. `DEFAULT_FULL_PALETTE` remains ENDESGA 32 as the curated fallback for existing missing/deleted selections. Stable preset IDs preserve saved selections. While the palette editor is open, local palette files and Discord/web image or Aseprite URL drops replace its shared draft, retaining the chosen method and entered name. `palette-drop.js` reuses `droppedImages` payload parsing, bounds streamed downloads to 32 MiB and preserves cancellation; only download has a 30-second timeout. The artwork drop helper remains separate.

## Commands

The editable promotional trailer project is `video/README.md`. Read it before
changing trailer copy, captures, music or exports. Only `public/colorfetti-trailer.mp4`
is a tracked video export; the 1080 master and intermediate renders are ignored.

npm run dev                                  dev server on localhost:5173
npm test                                     all unit tests (Vitest)
npx vitest run src/lib/recolor.test.js        one test file
npx vitest run -t "part of a test name"      one test
npm run build                                writes dist/

node bench/palette-qa.mjs dist                built-browser palette/export regression

Every push to main deploys to GitHub Pages (.github/workflows/deploy.yml).

## How the code fits together

Svelte 5 with runes, plain JavaScript, no SvelteKit.

src/lib holds the logic as DOM-free modules, each with unit tests: recolor.js turns pixels into a one-byte-per-pixel mask and the mask into two-color pixels, layout.js sizes the tiles and picks how many of an image's pixels a tile converts, presets.js lists the palettes and styles and steps through them, gesture.js turns wheel moves into single steps and says when a slider of the Style panel is being dragged, gif.js reads and writes GIFs (loaded on demand), save.js encodes PNGs, names files and builds the zip, settings.js lists every setting a style can have and restores what was kept between visits.

The Palette panel's Palette/1-bit switch selects the conversion family and stays first in its header. Both use one horizontal row of round palette choices with names underneath. The optional selected name sits right of the switch only when measured space permits; import/edit are icon buttons in the Palette family. Full-height rail masks fade choices under informational chevrons while leaving the actual glass visible. `PaletteImport.svelte` is a native source-first dialog for image/text import, paged color review, editing, named saving, deletion and HEX backup. Reset retains saved palettes unless its explicit deletion checkbox is selected. The full-palette comparison button displays the selected palette's name in a bounded width with its complete accessible label.

One palette editor has an editable name, round HEX backup and Close in its fixed header. Backup stays visible and is disabled for an empty, incomplete or busy draft. Its scrolling body shows the shared count (initially 0 colors), bounded swatches and editing/recovery controls before Image or file, Paste colors and Add colors. Method inputs, source notices and acquisition errors follow those buttons; all three methods remain present and reachable by scrolling. The save footer stays fixed. New drafts suggest New palette, then the first available numbered variant when saved/session names already use it; existing and entered names are preserved. Switching methods retains the draft and typed inputs. File/text import replaces colors and preserves entered names; manual Add appends a unique color. Existing edit/copy drafts start with Add colors. Section gaps, including name to count, are 12px, reduced to 6px in short landscape, without stacking margins or padding. Help keeps four steps with mode-specific copy: Add, Palette, Recolor and Save for Palette; Add, Palette, Style and Save for 1-bit. Palette guidance leads with Auto and palette selection/import; Recolor covers matching, color limits and dithering. Shortcut rows follow the selected mode.

`palette-library.js` owns normalized colors, immutable full presets and the versioned `colorfetti-palettes-v1` local library; `palette-import.js` scans every visible source pixel and parses supported text formats; `palette-decode.js` uses browser color-managed sRGB image decoding. Its `.ase` / `.aseprite` branch dynamically imports `palette-ase.js` to read the first-frame embedded palette's raw RGB entries, without rendering artwork or applying document profiles. `quantize.js` prepares an immutable palette snapshot, matches nearest Oklab (default) or encoded RGB colors with exact RGB membership first, and yields cooperatively for previews and exports. Results use Uint16 indexes, with 256 reserved for empty. `palette-state.js` keeps family restoration and immutable colors/metric/alpha save snapshots separate from legacy settings. Palette PNGs pack the used colors directly at 1/2/4/8 bits, with a direct RGBA fallback for all 256 colors plus empty. Full palette GIF export makes a used-color preflight, then converts frames sequentially; `palette-gif-worker.js` compresses them with acknowledgment/backpressure. Its global table includes transparency and must fit 256 entries. Failures never silently remove colors or download part of a ZIP.

Legacy conversion loops remain independent. Switching families retains the legacy colors/style/settings. Palette settings offers Matching (Oklab / RGB) and Max colors (slider, integer field, All); invalid/missing stored values restore Oklab and All. `maxColors: 0` means All and preserves the existing quantization path without loading the limiter. An explicit 2–256 cap chooses a subset of the unchanged shared palette per full-resolution source image; GIFs use one duration-weighted subset across frames. `palette-limit-client.js` shares/cache-selects jobs independently of preview frame/resize/original state. It lazily starts one serial worker with 128 KiB chunk backpressure; cooperative fallback loads the core on demand. `palette-limit.js` uses exact histograms up to 4096 source colors, bounded bins thereafter, a greedy/frequency seed and up to eight improving swaps. Binned fits get a second original-pixel pass and fall back to the frequency seed if it has lower error. This is a bounded heuristic, not a global optimum or promise to preserve every detail. Selection failure retains the last preview with persistent Retry/All guidance and blocks affected exports, never uncapped output. Full palette Opacity cut is 1–255, default 128; its row appears when source alpha is partial or the cut has changed. Reset restores Oklab/All/Cleanup Off/Dithering Off/strength 50%/Opacity Cut/cut128, retaining the palette. Source RGB supplies nearest matching; there is no brightness threshold, None/Swap role or structural style in this family. Setting edits cancel previous preview jobs and reveal conversion; exports capture the choice at the gesture. Full palette converted playback waits for the current converted frame, so a slow preview may play slower than the source. Original comparison follows source timers independently of conversion readiness; exports retain source delays.

App.svelte owns all state and passes it down. Dock.svelte edits settings through bindable props. Tile.svelte derives masks from an image and repaints when they or a color change. A style's settings go to mask as one object; two of them, Brightness and Opacity cut, are read by analyze instead, so App.svelte analyses the images again when the style in use has other values for them. A tile converts only what it can show: for an image larger than the tile, a picture of it at the tile's own size (the width and height given to mask), its pixels spread evenly over the image. Saving and copying convert every pixel.

CSS is global: src/foundation.css orders GlassKit, src/app.css geometry and src/glass.css materials. Floating islands is the single design. Components have no style blocks, and there is no border-box reset; sizes depend on that.

PNGs and GIFs are encoded by hand, not through a canvas, because some browsers add noise when a canvas is read back. A PNG is written with a palette and two bits per pixel, straight from the mask.

The preceding two-bit PNG rule applies to the 1-bit family. Full palette exports also avoid canvas encoding. Import exactness refers to browser-decoded visible sRGB values, not arbitrary original file/profile bytes; the supplied PNG fixtures matched an independent decoder. Desktop and physical Pixel 8 Pro testing of the palette family is recorded in docs/research/2026-10-12-palette-implementation.md; Safari remains unvalidated. For the built-browser regression harness after a feature commit, set `BASE_REF` to the pre-feature revision; its default `HEAD` is suitable while the feature is still uncommitted.

Max colors controls run from 2 to the active palette's color count, displaying the effective limit while retaining the global requested limit for larger palettes. Only committed edits change that preference. Slider moves commit after a 200ms pause or immediately on release/change; number edits commit on change/Enter/blur. `pausedCommit` cancellation discards pending work on closing, pointer cancellation, palette/family switches, All and Reset. `Dock.svelte` keys the row by the immutable palette to cancel old native gestures; captured palette checks reject stale commits. Tile retains the last completed rendering of the same item while recalculating settings or the next animation frame; item/family changes clear it. A separate readiness flag gates converted animation playback, and canceled jobs cannot replace the retained pixels; exports always convert the committed settings from full sources. Both settings families use Reset buttons with 12px corner radii. Wide-screen Palette Reset is a 44px icon-only button beside the Recolor title; rows follow Max colors, Matching, Cleanup, Dithering, conditional Dither strength, conditional Opacity Cut/Keep and conditional Opacity cut. At widths up to 520px or landscape heights up to 520px, name/value chips expose one control at a time with Reset in the chip rail; portrait uses two rows and short wide landscape one. Switching controls/breakpoints cancels drafts and detached native events; disappearing conditional controls fall back to Max colors, with keyboard Reset focus restored after tick. Style Reset shows icon plus text above 520px and a 44px icon-only target at 520px and below. All stays explicit, with the thumb at the active palette maximum and that count as the placeholder in the empty number field. The stored last limit does not control the thumb while All is selected. One-color palettes disable both inputs and use their sole color; two-color palettes disable only the slider. Stored limits of 1 restore as 2. Nearest matching and persisted storage fields are unchanged.

## Things that bite

Lospec source display is one published-palette-name link beside the count;
`source.name` is bounded and persisted separately from the local editable name.
Creator credit stays in metadata. The Paste colors hint is deliberately concise.

Native dialogs use `backdropDismiss` for complete outside pointer gestures.
Dragging a selection from an input onto the backdrop must not close its dialog.
Escape and explicit actions remain native; the image viewer retains its own
comparison/dismissal gesture. Test both mouse retargeting and touch capture.

`trackInternalDrag` owns same-document drag identity through native export-out
and reentry. App and PaletteImport ignore those as inbound imports; native
dragstart remains uncanceled. External file/URL drops still import normally.

Artwork and palette-image import share `image-decode.js`. PNG prefers native
ImageDecoder with its existing default color management. Proven full-range sRGB
RGBA/BGRA frames copy native packed bytes without requesting another conversion;
BGRA swaps red/blue in place in 128 KiB blocks with an 8 ms posted-task target.
An all-null color space (Firefox: premultiplied BGRA) takes the canvas path.
All other formats/metadata retain explicit managed RGBA/sRGB copyTo. This avoids
observed low-alpha rounding from an unnecessary conversion without merging colors
or bypassing profiles. Capability/errors/transforms fall back to the existing bitmap/canvas
decoder; other formats and the independent GIF decoder keep their paths. Release all
decoder/frame/bitmap/canvas resources, preserve cancellation and palette pixel limits.
User artwork import lazily loads `image-import-client.js` and one serial worker.
Single-frame non-GIF stills up to 4096 pixels use the same cooperative analysis
through the serial queue, avoiding worker round trips; larger sources/GIFs use it.
GIF compositing and legacy analyze/unify run there; PNG/other formats retain native
browser decoding before unpublished RGBA transfers. Acknowledged frames transfer
their original and analysis buffers once. Worker failures re-decode the immutable
File; canceled work never falls back or publishes. Source/cut changes reprepare
unpublished imports before atomic publication. The tiny demo keeps its old path.
No-worker import fallback yields between GIF frames/analyses; one large frame/unify
can still block. Live 1-bit source/cut reanalysis uses new unpublished analyses,
yielding before each frame analysis and shared seam pass. Only the current captured
wall/source/cut publishes together; pending converted playback holds its last picture,
and Original remains available. Exports independently prepare captured settings.
Matching analyses skip all preparation; there is no remembered-source cache. Old and
new analyses coexist temporarily, adding roughly three bytes per changed source pixel.
One large frame and cold structural rendering can still block.
Generated's empty wall uses the ready static logo example; an invisible nonempty real wall
must remain authoritative. Pending generation and conversion handoff retain the same
item's completed preview, including a prior 1-bit conversion, with current-frame
readiness still gating animation. See
docs/research/2026-10-12-generated-preview-decoding.md for reproduced source noise and
preview gaps, the fix, and cache/export work that remains per frame.

Auto is the fresh default and leads the full rail, before the curated presets
and saved library. Its algorithm remains lazy until this source is active. It fits one shared palette from all wall sources/animation frames, with equal
nonempty asset mass and duration weighting inside each GIF. Only sources/durations and
Opacity cut regenerate it. Matching, caps, cleanup and display state do not. Runtime
colors are not persisted; Edit saves a fixed ordinary copy. Empty results clear old
converted art and disable color-dependent actions. Export gestures capture the entire
wall source signature before awaiting generation. The worker streams 128 KiB slices;
the result cache holds two small palettes, without old source/histogram references.
App's completed generated publication retains the request key, not the captured wall.
The visible source name is Auto with its stable `generated-32` ID and 64-color capacity.
Tooltip metadata reads the published palette count and its captured source label;
pending/inactive results describe retained swatches without scanning on hover.
New palette preview conversions defer their first slice to a posted browser task,
preventing many tile effects from aggregating bounded slices into one input stall.
Canceled queued previews do no source work; cache hits and exports keep their paths.
Tile clears inactive limiter/cleanup request results. Last-subscriber cancellation
immediately removes unstarted limiter/cleanup jobs from their queue and active map;
running jobs with independent export subscribers remain alive.

`palette-animation-cache.js` reserves whole sampled clips within a shared global 8 MiB
index/used-buffer budget, lazy-filled only for animations. Stills/oversized clips bypass
it. Last-consumer release drops storage; Original skips frame conversion and an enlarged
viewer pauses hidden wall playback. Exports remain full source and existing 1-bit caches
remain independent. Limiting reuses exact RGB nearest error; prepared empty cleanup skips
overlay scans and exhausted animation agreement skips later transfers after validating
all metadata. See docs/research/2026-10-12-palette-implementation.md for reviewed limits.
Cleanup Off skips work but leaves a previously cached two-byte/source-pixel map attached
to its live source identity. The 8 MiB index cache does not bound the whole app heap.
See docs/research/2026-10-12-generated-wall-stress.md for built desktop/phone wall tests,
independent ZIP checks, remaining import long tasks and process-memory limits.

Optional full-palette Cleanup is an Off/On row after Matching, Off by default and
remembered across visits/families. Reset restores Off. `palette-cleanup-client.js` is
imported only for On; a serial lazy worker receives 128 KiB chunks and assembles one
frame at a time. `palette-cleanup.js` uses flat cooperative loops, frozen nearest labels,
eight-connected singleton proposals and mutual isolated pairs with Oklab gates, regardless
of Matching. Incremental whole-clip agreement retains a replacement only when every
frame has the same baseline/proposed labels. It prevents extra fixed-coordinate label
churn, but loses intentional isolated details and retains moving noise. The shared
two-byte-per-source-pixel map is applied at matching source-sample coordinates in Tile
and with cooperative full-source overlays for exports. Snapshot `cleanup` participates
in optimized drag identity. On preserves exact RGB matches in the active palette/subset
and vetoes frozen proposals exceeding min(.005, .5 * original squared error + .0004)
added squared Oklab error. Off preserves the existing nearest path.
Findings, memory/performance limits and verification are in
docs/research/2026-10-12-one-pixel-cleanup.md.

After a git checkout or merge the dev server can keep serving old CSS. Restart it, or touch the files in src, before trusting the preview.

The loops in recolor.js run once for every pixel of a photo, on phones. Keep them flat, with no array, object or function made per pixel, and time them before and after any change there: node bench/bench.mjs. To check that a change leaves every mask as it was, copy the file to bench/recolor.old.js before the change and run node bench/equiv.mjs after it. docs/performance.md has the rest, including how to measure the app in a browser and on a phone.

The shared tooltip action (src/lib/tooltip.js) has unit tests for pointer sequences, timing, dynamic text, accessibility and dialog cleanup. All tooltips use it; do not add native title attributes. Check interface behavior in a browser at desktop width and at phone width with touch emulation.

October 13 fixes reuse posted export tasks and a Tile's one completed-input record;
unchanged Original/viewer return does not reconvert stills. Changed inputs and
canceled pending requests still require fresh current readiness. Single-frame GIFs
use native browser decoding then analysis on the same healthy serial import worker.
All four clients terminate unreadable-message jobs with settled-event guards and
existing recovery. Hover preparation cancellation reaches palette matching and
encoding without canceling explicit Save or native drag grace records. Module
downloads may finish late but cannot block a newer hover or publish stale URLs.
Queued hover work stops immediately on leave; running work waits the existing
180 ms hover delay before abort, allowing a same-request return while it is pending.
Completion while away still discards; invalidation/explicit cancel/destroy abort at once.
GPL rows trim once with an unambiguous name tail. Cache policy and opacity-slider
commits remain unchanged. See docs/research/2026-10-13-performance-stability-fixes.md.

Save all yields through the posted export scheduler between encoded files. It keeps
the captured item list/settings and downloads only a complete successful batch. An
individual 1-bit still remains synchronous; its own long task is not eliminated.

1-bit animation exports capture analysis references, inks, style/settings and frame
metadata before yielding, then produce and encode one full-resolution mask at a time.
The async writer gives a posted task before the first mask and after groups exceeding
8 ms, including mask, None remapping, buffer growth and LZW. It grows output as needed
instead of reserving every frame's worst case. Save, ZIP and hover use this path;
Copy remains first-frame PNG. One huge frame/cold structural preparation and final
output copying remain synchronous. The old synchronous encoder is a test reference.

### Palette preview failure ownership (October 13)

Limiter and Cleanup failures belong to each Tile surface and its current item,
palette, alpha cut, metric and cap, with an attempt token rejecting late results.
Wall and viewer failures remain independent; a viewer success cannot clear a wall
failure. The same-item completed preview stays visible, with Retry needed in its
existing caption line and persistent Dock guidance. A viewer has its own accessible
Retry notice. A failed item disables Save/Copy/Share and export drag; Save all is
blocked if any selected item fails. Synchronous handlers check the same gates.
Exports already captured before a later failure remain independent.

Explicit Retry, selecting the same palette/matching/Cleanup setting again or
recommitting the same cap retries only failed stages. Failures remain gated while
retrying; healthy results are retained. Changing Cleanup does not retry a failed
limiter. All bypasses limiting, Cleanup Off bypasses cleanup, and 1-bit bypasses
palette gates. Changed inputs/source identity and owner teardown retire obsolete
failures. Healthy job start/success does not invalidate app-wide failure state.

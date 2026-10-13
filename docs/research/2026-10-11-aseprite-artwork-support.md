# Aseprite artwork support — deferred task

Date: October 11, 2026
Status: Deferred; code/history and format reviewed, artwork decoding not prototyped or implemented.

## Decision and constraints

The user decided direct Aseprite artwork import is too niche to prioritize now.
Keep existing embedded-palette import. Defer both first-frame artwork import and
animated artwork import with GIF export.

The priorities are a small initial download, little additional complexity, and
reuse of existing code. Conditional loading can keep a renderer out of ordinary
startup and image imports, but does not remove its implementation, testing and
maintenance costs. Supporting just one frame still requires most of the basic
artwork renderer; animation adds frame state and memory costs rather than an
entirely new playback/export pipeline.

If revisited, basic stills plus animation appear to offer better value than
first-frame-only support once a correct renderer exists. This is an architectural
assessment, not a measured implementation result or authorization to implement.

## Findings from existing code and commits

| Evidence | Finding |
| --- | --- |
| `ac380bb` — Import embedded Aseprite palettes on demand | Added the bounded, dynamically imported palette parser and regression coverage. |
| `df9dd28` — Expand palette presets and accept palette URL drops | Added palette-editor URL acquisition, including Aseprite signature routing; kept artwork fetching separate. |
| `bd9bab3` — Explain blocked palette URL downloads and local import recovery | Improved acquisition errors and local-file recovery guidance. |
| `src/lib/palette-decode.js` | `.ase` / `.aseprite` files dynamically import `palette-ase.js`; ordinary imports use their existing paths. |
| `src/lib/palette-ase.js` | Validates document/frame/chunk boundaries, then reads first-frame embedded palette entries without decompressing or rendering cels. |
| `src/App.svelte` | Artwork decoding already returns `{ frames: [{ original, delay }], loop }`, where `original` is `ImageData`. |
| `src/lib/save.js` and `src/lib/gif.js` | Existing converted animation exports use GIF, with PNG output for stills and first-frame clipboard copy. |

The palette parser caps input at 32 MiB and embedded tables at 4096 entries. It
supports modern and legacy palette chunks, yields cooperatively, and checks
cancellation. It validates later frame framing, but only reads the first frame's
palette. It does not allocate artwork bitmaps, decompressed cels, layer composites
or a color-profile converter.

Palette import preserves stored numeric RGB values rather than color-managed
artwork appearance. Its returned color list removes duplicate and fully
transparent entries, and turns partially transparent entries into opaque colors.
That list cannot serve as an indexed artwork lookup table: original palette
indexes and alpha must be retained separately by an artwork decoder.

The performance record for `ac380bb`, compared with `2963cd3`, reports:

| Build component | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| Added startup code | 575 | 201 |
| Separate palette parser | 2492 | 1326 |

These are recorded production-build measurements using the same Node gzip
settings. They are not new measurements, network timings, or estimates of an
artwork renderer's size. Existing browser regression coverage checks that the
parser is absent from startup/editor/PNG/text requests, loads on the first
Aseprite palette import, and is reused on repeat imports.

No artwork fixture was decoded in this assessment. No new package was selected,
and renderer download size, import time, peak memory and mobile compatibility
remain unmeasured.

## Why artwork import is a larger addition

Aseprite files contain separate layers and cels rather than a ready-to-display
flattened image. A basic renderer must decompress zlib-compressed cel pixels,
interpret RGBA/grayscale/indexed color modes, place and clip cels at their offsets,
and combine visible layers with correct transparency and opacity. Layer ordering,
background-layer semantics and group visibility also affect the result.

The official format additionally supports linked cels, per-frame palette changes,
cel z-index, multiple blend modes, group compositing, tilemaps/tilesets, precise
cel bounds, embedded color profiles and animation tags. Implementing all of these
faithfully would expand the scope considerably. Unsupported features that change
visible artwork should cause a clear rejection rather than a misleading render.

First-frame-only import avoids retaining an animation and most later-frame state,
but still needs cel decoding and compositing for that first frame. For animation,
linked cels must resolve their source pixels while respecting the current cel's
placement and applicable rendering state; indexed pixels need the palette active
for the frame being rendered.

Color profiles need a separate decision. Ignoring profiles is intentional for
raw palette numbers, but can change artwork appearance. Initial artwork support
should define accepted profile/gamma cases and reject unsupported ones with PNG
export guidance, rather than inherit the palette importer's profile policy.

## Proposed implementation scope

- Accept local `.ase` / `.aseprite` artwork through the picker and file drop route.
  Keep palette-editor imports as embedded-palette extraction. Remote artwork URLs
  are outside the initial scope; the existing artwork fetch helper would require
  its own changes to accept Aseprite attachments.
- Decode locally in a separate module loaded only when an Aseprite artwork file
  is encountered. Do not introduce a backend or a broad document editor.
- Support ordinary image layers with normal blending, raw/compressed cels,
  transparency, opacity and linked cels for animation. Define support for groups,
  color modes, palette changes, ordering and profiles before advertising support.
- Reject unsupported visible rendering features with a useful request to export
  PNG/GIF from Aseprite. Metadata such as names and slices can be ignored when it
  does not affect the chosen full-canvas rendering contract.
- Produce the existing `{ frames: [{ original, delay }], loop }` representation.
  A single frame becomes a still; multiple frames reuse tile playback, original
  comparison, both conversion families, GIF download, ZIP export and still copy.
- Do not encode a GIF during import and decode it again. Feed source RGBA frames
  directly into the app and use the existing GIF encoder on converted export.
  This avoids extra work and an intermediate GIF palette/timing reduction.
- Start with the complete timeline in file order, using frame durations and a
  documented looping default. Tag-specific ranges, reverse/ping-pong playback
  and animation selection are outside the initial scope.
- Show progress during decoding, allow Remove all to cancel work, and stop
  retaining buffers for canceled or failed imports. Continue the rest of a batch
  while reporting unsupported/malformed input clearly.

## Lazy loading and reuse

Extract reusable binary bounds checks, frame/chunk traversal and indexed palette
table reading into a small shared module if implementation warrants it. Preserve
the palette extraction behavior and its existing validation/cancellation tests.
Share underlying parsing, not the normalized palette result used by the editor.

Keep the artwork decoder and decompressor out of the palette parser's dependency
graph. Loading an Aseprite palette should not fetch artwork rendering code.
Startup and ordinary PNG/JPEG/GIF/text routes should not request either Aseprite
entry point unnecessarily. A shared parser module can be reused from the browser
module cache when both import types are used in one session.

`fflate` is already a dependency used for saving. Investigate reusing its zlib
decompression exports from the lazy artwork module before considering another
package. An existing dependency does not guarantee zero added startup bytes:
tree shaking and shared-chunk placement must be checked in a production build.
Avoid putting a renderer or decompression import in startup code merely to reuse
the package. No particular decompression API or chunk layout was tested here.

Extend the existing network regression to verify that startup, ordinary imports
and Aseprite palette imports do not request the renderer/decompressor; first
artwork import loads it, and repeat imports reuse it. Inspect HTML/module preload
links as well as actual browser requests.

## Open decisions before implementation

1. Choose the supported rendering subset and test it against Aseprite-exported
   reference images. Decide group compositing, background transparency, z-index,
   color profiles and indexed palette behavior explicitly.
2. Choose dimension, frame-count, cel-size, total decoded-pixel and cumulative
   import limits using mobile measurements. The palette importer's 32 MiB file
   cap does not bound decompressed artwork memory. Source RGBA alone occupies
   `width × height × 4 × frame count` bytes, before analysis and export buffers.
   Bound decompression output before large allocations, not only afterward.
3. Choose cooperative decoding versus worker execution. Cancellation/progress
   checks between cels do not make one very large synchronous decompression
   interruptible. Measure responsiveness before choosing the simplest approach.
4. Define zero/missing frame-duration fallback, looping defaults and tag policy.
   The existing GIF encoder rounds delays to hundredths of a second, so GIF
   output cannot preserve arbitrary millisecond timing exactly. Existing full
   palette GIF restrictions, including 256 colors plus transparency, still apply.
5. Decide whether first-frame-only import should be an earlier milestone or an
   explicit memory-saving option. If used, disclose that later frames are omitted;
   do not silently downgrade failed animated decoding to a still.
6. Measure added raw/compressed startup and lazy bytes. Reassess if supporting
   the useful subset requires a large dependency or extensive renderer code.

## Completion criteria for the deferred task

- Supported still and animated fixtures match independent Aseprite-rendered
  pixels, including offsets, hidden layers, opacity, linked cels, transparency
  and any supported indexed/palette-change cases.
- Multiple frames play and compare correctly, export valid GIFs with documented
  timing/loop behavior, and work with both conversion families, ZIP and still copy.
- Malformed bounds, broken links, oversized decompression, unsupported visible
  features and cumulative-memory cases fail clearly without publishing partial
  artwork or retaining abandoned buffers.
- Production browser requests prove lazy loading remains intact for startup,
  ordinary imports and existing Aseprite palette extraction.
- Desktop and phone UI checks cover picker/drop, progress, cancellation and
  recovery; Safari/iOS and Android are checked before broad compatibility claims.
- Record production bundle size, decode time, responsiveness and peak memory.
  Update the behavior spec, Help, README and performance record with implementation.
  Until then, this note adds no artwork support or changes to palette behavior.

## References

- [Official Aseprite file format specification](https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md),
  reviewed during the October 11, 2026 assessment. It defines layers, cels,
  compression, palettes, profiles, durations, tags and ordering details.
- Existing palette integration: `src/lib/palette-ase.js`,
  `src/lib/palette-decode.js`, `src/lib/palette-drop.js`, their unit tests, and
  `bench/palette-qa.mjs`.
- Existing artwork integration: `src/App.svelte` (`decode`, `toItem`, `addFiles`),
  `src/lib/gif.js`, `src/lib/save.js`, and `src/lib/image-drop.js`.
- [Performance constraints and recorded Aseprite bundle measurements](../performance.md)
  and [behavior spec](../superpowers/specs/2026-10-06-colorfetti-app-design.md).
- [MP4 support — deferred task](2026-10-11-mp4-support.md), which uses the same
  existing frame representation and records a separate deferred import feature.

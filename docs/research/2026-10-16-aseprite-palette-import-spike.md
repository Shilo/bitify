# Aseprite palette import research spike

Date: October 16, 2026. Research only; no product behavior changes.

Colorfetti can already receive Aseprite palettes through its palette editor. The
best streamlined workflows are copying selected Aseprite swatches as HEX and
dropping a saved `.aseprite` document into the editor. Neither requires an
Aseprite plugin. The main opportunities are making those routes discoverable,
accepting HEX paste throughout the editor, and closing compatibility gaps in
Aseprite's alpha-bearing GPL and PAL exports.

Aseprite has a publicly documented native document format and several palette
interchange formats. There is no single special palette-only format that must
replace the existing importer. A saved palette can itself be an `.ase` or
`.aseprite` document. Aseprite extension bundles are a separate packaging layer.

## What the formats mean

| Format | Role in Aseprite | Colorfetti today |
| --- | --- | --- |
| `.aseprite`, Aseprite `.ase` | Native document, containing palette records as well as artwork. Save Palette can also write a small native document. | Reads the first frame's embedded table. Full documents and palette-only exports both worked in this spike. |
| `.hex` | One six-digit RGB value per line on export. Selected swatch clipboard text uses a leading `#` per color. | File import and Paste colors accept these values. |
| `.gpl` | GIMP-style palette text. Aseprite adds a `Channels: RGBA` variant when the palette contains nonopaque entries. | Ordinary RGB exports work. The RGBA variant is rejected. |
| `.pal` | Aseprite writes JASC-PAL version 0100 text, optionally with a fourth alpha value per row. | Three-channel RGB works. Four-channel Aseprite rows are rejected. Binary PAL is a different format and is unsupported. |
| Palette `.png` and other supported palette images | Aseprite can write a swatch image containing its palette. | Image colors can be extracted. PNG is the preferred image interchange choice. |
| `.act` | Adobe Color Table binary palette. Available from Aseprite's palette exporter. | Unsupported. Export HEX, native Aseprite, or PNG instead. |
| `.col` | Legacy Animator/Animator Pro palette. Available from Aseprite's palette exporter. | Unsupported. Export another supported format instead. |
| `.aseprite-extension`, extension `.zip` | Bundle containing `package.json` and contributed palette files, possibly other extension content. | No package import. Extract a supported palette file, or load the preset in Aseprite and copy/save its colors. |
| Adobe `.ase`, `.aco` | Adobe swatch formats; Adobe ASE shares a suffix with Aseprite but has a different binary structure. | Unsupported. Adding Aseprite import does not add Adobe swatch import. |

The native aliases are documented in [Aseprite Files](https://www.aseprite.org/docs/files/).
The palette exporter dispatches native/image formats and ACT/COL/GPL/HEX/PAL in
[palette_file.cpp](https://github.com/aseprite/aseprite/blob/b3e34acbae812b8a1d814c2e6285343b351c8945/src/app/file/palette_file.cpp).
The alpha variations are explicit in the
[GPL writer](https://github.com/aseprite/aseprite/blob/b3e34acbae812b8a1d814c2e6285343b351c8945/src/doc/file/gpl_file.cpp)
and [PAL writer](https://github.com/aseprite/aseprite/blob/b3e34acbae812b8a1d814c2e6285343b351c8945/src/doc/file/pal_file.cpp).
Extension packaging is documented in
[Extensions](https://www.aseprite.org/docs/extensions/) and
[Palette extensions](https://www.aseprite.org/docs/extensions/palettes/).

## Every practical transfer workflow

### 1. Copy selected palette swatches directly

In Aseprite, select the desired entries in the color bar, then use Edit > Copy
or its configured shortcut. Switch to Colorfetti, open the palette editor,
choose Paste colors, paste into the textarea, click Review colors (or Replace
colors for an existing draft), review and save.
Selecting all desired swatches transfers a whole palette; selecting fewer
transfers just a ramp or subset. Selecting colors in the palette matters:
copying the canvas or timeline invokes other copy behavior.

This is a native feature since Aseprite 1.3.3, released February 14, 2024.
Aseprite's native clipboard implementation serializes picked entries as plain
`#RRGGBB` text separated by newlines. No custom binary parser or extension is
needed for that payload. Native clipboard access must be enabled in Aseprite.
See [release notes](https://www.aseprite.org/release-notes/#aseprite-v1-3-3),
[palette selection copying](https://github.com/aseprite/aseprite/blob/b3e34acbae812b8a1d814c2e6285343b351c8945/src/app/ui/palette_view.cpp#L556),
and [native HEX clipboard output](https://github.com/aseprite/aseprite/blob/b3e34acbae812b8a1d814c2e6285343b351c8945/src/app/util/clipboard_native.cpp#L316).

Current friction: Colorfetti's dialog paste handler imports files only. Plain
text uses the normal textarea paste, followed by the import action. Pasting
with Close, a swatch, or the dialog body focused does not import HEX. A future
dialog-level handler could recognize valid palette text and open a reviewed
draft. It should preserve normal paste into the name input and other text
fields, validate the whole payload, and keep the existing draft on failure.

Copying HEX loses alpha and entry names at the Aseprite export boundary.
Its [HEX writer](https://github.com/aseprite/aseprite/blob/b3e34acbae812b8a1d814c2e6285343b351c8945/src/doc/file/hex_file.cpp)
uses RGB channels only, including for selected entries that have zero alpha.
Do not promise the same transparent-entry filtering as native file import.

### 2. Drop or choose the actual saved Aseprite document

Save the document in Aseprite. In Colorfetti's open palette editor, drop the
`.aseprite` or `.ase` file from Explorer/Finder, or choose it with Image or file.
Review and save the extracted palette. This avoids a separate palette export.

This is already wired in `PaletteImport.svelte` and `palette-decode.js`.
It imports the saved file's table, including unused palette colors. Unsaved
changes in the running Aseprite instance are absent from the file. It does not
render the sprite, flatten layers, sample a screenshot, or require Aseprite to
be installed for end users.

The drop target is significant: the palette dialog handles palette extraction;
the main image wall's drop route handles artwork. This spike does not add
native Aseprite artwork decoding. A future global `.aseprite` drop could open
the palette editor with the file preloaded, clearly labelled as palette import.

### 3. Save a palette as a small native Aseprite file

In Aseprite's palette Options menu, use Save Palette and choose `.aseprite`
or `.ase`; then drop or choose that file in Colorfetti's editor. This is useful
for sharing the full swatch table without including a large working document.

The [SavePalette command](https://www.aseprite.org/api/command/SavePalette)
saves the current palette, and the native/image export path constructs a
small swatch document. Both suffixes were generated by the installed program
and accepted by Colorfetti's existing parser in this spike.

### 4. Save a HEX file, or copy its contents

Use Save Palette with a `.hex` filename. Drop/choose the file in the palette
editor, or open it as text and paste its contents into Paste colors. This is
an easy portable backup and an option for Aseprite versions without native
swatch-to-text copy. It preserves RGB values and order before Colorfetti's
deduplication, with the alpha limitation described above.

### 5. Save a GPL or PAL file

Use Save Palette with `.gpl` or `.pal`, then drop/choose the file. Whole valid
GPL/JASC-PAL text can also be pasted into Paste colors because the parser
recognizes their headers.

Opaque Aseprite exports work today. Nonopaque palettes produce Aseprite-specific
RGBA text variants, and the native-generated samples were rejected by the
current strict RGB parser. A future extension should explicitly recognize the
RGBA header/row grammar, skip alpha-zero entries, normalize positive alpha to
opaque with a notice, and retain the existing RGB behavior. Silently deleting
unknown columns would make malformed data look valid.

### 6. Save the palette as PNG

Use Save Palette with `.png`, then drop/choose the PNG in Colorfetti's editor.
This is different from File > Export of the artwork: the palette export is a
swatch image. In the generated samples, every visible unique palette RGB was
recovered in first-occurrence order, including entries unused by the artwork.

Use Every color for small exported swatches. Find solid colors requires 3 by 3
patches and is unsuitable for one-pixel swatches. Colorfetti reads visible image
pixels, not all unused PNG color-table entries. Prepared palette images work
better than screenshots with UI borders, labels, backgrounds and antialiasing.
PNG uses the browser's color-managed decoding, so profiled images can differ
from the raw numeric channels imported from native/HEX files.

### 7. Copy sprite pixels, a selection, or merged visible artwork

Copy a canvas selection in Aseprite, or use Copy Merged for the intended visible
composite. Paste into Colorfetti's open palette editor. If the OS/browser
exposes the native bitmap as a supported clipboard image file, the existing
dialog handler can scan it for colors. This gives colors present in the copied
pixels, rather than the complete swatch table. It need not include other
frames, unused entries, hidden layers or colors outside the selection.

Aseprite emits a standard bitmap plus a private `org.aseprite.Image` format
which can include palette/mask data. The portable bitmap is the appropriate
web route. Browser web-custom formats use their own mapping and do not imply
access to arbitrary existing native formats. See
[native image clipboard handling](https://github.com/aseprite/aseprite/blob/b3e34acbae812b8a1d814c2e6285343b351c8945/src/app/util/clipboard_native.cpp#L82)
and [Chrome custom clipboard interoperability](https://developer.chrome.com/blog/web-custom-formats-for-the-async-clipboard-api/#interoperability-with-platform-specific-apps).
Native bitmap-to-browser paste still requires OS/browser testing, especially
for transparency. It was not exercised end to end here.

### 8. Export the rendered artwork, then extract its colors

Export PNG from Aseprite and import it through the palette editor. For a
selection of animation frames, export a sprite sheet containing those frames
and scan the sheet. A GIF can also be supplied, but Colorfetti's palette-image
path scans only its first frame. A sheet can combine colors across frames
without adding a native renderer; padding/background colors need review.

This is the reliable fallback when the user's intent is colors actually visible
in the artwork. RGB sprites can contain colors outside the color bar palette,
as documented in [Color bar](https://www.aseprite.org/docs/color-bar/).
Aseprite's [export documentation](https://www.aseprite.org/docs/exporting/)
and [CLI](https://www.aseprite.org/docs/cli/) cover image and sheet export.

Alternatively, use Aseprite's New Palette from Sprite workflow, then copy/save
that palette. That operation can quantize colors; review its choices before
treating it as an exact list. See the
[color bar tutorial](https://www.aseprite.org/docs/tutorial/color-bar-tutorial/).

### 9. Reuse a preset or palette already installed in Aseprite

Load the preset in Aseprite, then use selected-swatch copy or Save Palette.
If its backing file is accessible, import that supported file directly.
Save Palette as Preset is a local Aseprite library operation, not a special
Colorfetti transport or cloud synchronization feature. A normal website cannot
silently inspect Aseprite's preset/configuration directories; the user supplies
a file or grants an appropriate file handle.

### 10. Import an Aseprite palette extension pack

Today, extract the extension ZIP and import a supported contributed palette,
or install/load it in Aseprite and copy/save the palette there. A possible
future Colorfetti route is to accept `.aseprite-extension`/ZIP, inspect
`package.json`'s `contributes.palettes`, and offer a palette chooser.

That is archive/data import only. It must not run bundled scripts, install
extensions or fetch package paths as URLs. Bound expanded bytes and entries,
reject unsafe paths, and preview each chosen palette. This has lower value for
routine Aseprite-to-Colorfetti transfer than ordinary files and clipboard.

### 11. Drop a hosted palette image or native Aseprite attachment URL

The open palette editor already handles HTTP(S) image/Aseprite URL drops,
including compatible link drags from web pages or messaging apps. The URL must
return a supported file and permit browser cross-origin access. Download and
choose/drop locally when the host blocks the request. This transports a saved
file; it does not connect to the running Aseprite application.

Paste colors currently recognizes HEX and Lospec references, not arbitrary
native-file URLs. Remote text palette URLs also remain unsupported by the
download helper. A future unified URL input could reuse acquisition logic with
explicit format handling. No backend proxy is necessary for permitted hosts.
The current policy and timeout/size limits are in `palette-drop.js` and the
existing behavior spec.

### 12. Provide an optional Aseprite script or extension command

A custom command could read the active document palette, selected indices, or
the user's default palette and serialize HEX. A Copy for Colorfetti command
could normalize transparency deliberately and use the documented clipboard
API, which may show Aseprite's access prompt. Built-in copy already handles
ordinary selected swatches, so a script needs an additional benefit.

An optional Send to Colorfetti command could launch the website with a bounded,
versioned palette payload in its URL fragment. That would require a new
Colorfetti receiver which validates the payload and opens a review draft.
This is an architectural proposal, not a currently supported URL. Fragments
avoid putting palette data in the HTTP request, but remain visible to page
scripts and browser history. Avoid embedding artwork or file paths.

The relevant documented APIs are
[Palette](https://www.aseprite.org/api/palette),
[Range.colors](https://github.com/aseprite/api/blob/662b12efe00fd374909bc3a0e9cce5d0d0d35d63/api/range.md#rangecolors),
[Sprite.palettes](https://github.com/aseprite/api/blob/662b12efe00fd374909bc3a0e9cce5d0d0d35d63/api/sprite.md#spritepalettes),
and [app.clipboard](https://github.com/aseprite/api/blob/662b12efe00fd374909bc3a0e9cce5d0d0d35d63/api/app_clipboard.md).
The application has a
[Launch command accepting a URL path](https://github.com/aseprite/aseprite/blob/b3e34acbae812b8a1d814c2e6285343b351c8945/src/app/commands/cmd_launch.cpp).
Launching from a script and handing off to a browser would need a separate
cross-platform prototype.

### 13. Automate exports with the Aseprite CLI

For repeated work or a library of assets, run Aseprite in batch mode with a Lua
script that reads/saves palettes or invokes SavePalette. Import the resulting
files in Colorfetti. The current dialog uses only the first dropped source;
bulk palette library import would require new review/naming behavior.

The CLI `--palette` option applies a palette to a sprite; it is not a palette
extraction flag. Use `--script` with the palette API for extraction. The
fixture generator in this spike demonstrates native batch palette export.

### 14. Live synchronization or a desktop bridge

Aseprite and browser scripts both have WebSocket client APIs. A live connection
therefore needs a server/relay or local companion; two clients do not directly
connect to each other. A local bridge could also expose otherwise inaccessible
native clipboard data. This adds installation, pairing, lifecycle and transport
work to a currently browser-only app. See
[Aseprite WebSocket](https://github.com/aseprite/api/blob/662b12efe00fd374909bc3a0e9cce5d0d0d35d63/api/websocket.md)
and [browser WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

A lighter optional workflow is choosing a local exported palette file once,
then explicitly reloading it after Aseprite saves. File System Access could
retain a user-granted handle on supported browsers; universal background
watching is not provided by the ordinary file picker. Keep a normal file-input
fallback. See [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
and [showOpenFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker).
Neither approach is needed for basic import.

## Drag and drop directly out of Aseprite

Dragging a saved file from Explorer/Finder into the palette editor is already
a practical route. Dragging palette selection outlines in Aseprite is its
internal move/copy operation. The inspected palette-view implementation does
not create an external OS file/text drag payload, and the tutorial describes
reordering/duplicating entries. Do not advertise dragging raw color-bar
swatches or an unsaved document tab directly into a browser as an established
cross-application palette transfer.

Colorfetti cannot add an outbound drag payload to another application's UI.
Such a gesture would require Aseprite support or an external integration.
Accepting dragged HEX text from a text-capable source is a possible Colorfetti
enhancement, but does not establish that native Aseprite swatches emit it.
The browser receives the source's actual payload through its
[drag data store](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API).

## Import semantics to communicate

Colorfetti stores up to 256 unique opaque RGB colors. Its native parser accepts
at most 32 MiB and 4096 embedded entries for review, uses the first frame,
keeps first-occurrence index order, deduplicates RGB, skips stored alpha-zero
entries and makes positive alpha opaque. Entry names, duplicate index slots,
profile metadata and palette animation are not retained in the saved library.

The document's transparent pixel index is separate from an entry's stored
alpha. The current parser intentionally keeps an opaque entry even when its
index is the document's transparency slot. Native import supplies colors for
recoloring, not an indexed-artwork lookup table.

The [native file specification](https://github.com/aseprite/aseprite/blob/b3e34acbae812b8a1d814c2e6285343b351c8945/docs/ase-file-specs.md)
defines modern RGBA/name palette records, legacy records, profile records and
possible external references. The current importer reads embedded records
only, applies no document profile, resolves no external palette, and does not
combine later frame tables. A missing/incomplete table should continue to
offer Save Palette/HEX/PNG guidance rather than inventing default colors.

## Native experiment and confidence

The installed Steam Aseprite 1.3.18.6, API 41, ran in a separate hidden batch
process. The generator created its own two-pixel RGB documents and palette
exports only; it did not access user documents or clipboard contents.

One palette had five opaque entries including a duplicate red. The other had
six entries including duplicate red, an alpha-zero entry with RGB `#090807`,
and half-transparent `#04c850`. Artwork was deliberately magenta `#ff00ff`,
which was absent from both palettes.

| Native-generated input | Existing parser observation |
| --- | --- |
| Full artwork `.aseprite` | Extracted embedded palette, not magenta artwork. |
| Save Palette `.ase`, `.aseprite` | Both accepted; correct order, RGB deduplication and alpha notice. |
| Opaque HEX/GPL/PAL | All accepted, yielding the same four unique RGB values. |
| Alpha GPL/PAL | Both rejected, confirming the interoperability gap. |
| Alpha HEX | Accepted but retained `#090807`, because Aseprite's HEX export had removed alpha. |
| Palette PNG | Recovered expected visible unique RGB values, including positive-alpha green. |
| Artwork PNG | Extracted magenta only, demonstrating table-versus-artwork intent. |
| ACT/COL | Native exports created, unsupported by the current Colorfetti router. |

All experiment assertions passed. Twenty small native files were generated;
four were unsupported formats and two were rejected alpha-text variants.
PNG checks used an independent fixture-only decoder and the existing
`extractPalette` function; they do not constitute browser color-management QA.
The exact upstream clipboard text grammar also passed `parsePaletteText`.
OS clipboard acquisition and physical drag gestures were not exercised.

The four existing relevant unit suites passed: **94 tests** across Aseprite,
palette text/image extraction, file decoding and remote drops. The first test
attempt hit a sandbox temp-cache rename error; rerunning with a workspace temp
directory and `--no-cache` passed. No product fix was needed.

Reproduce the native experiment with:

```powershell
node bench/aseprite-import-spike/run.mjs
```

Override `ASEPRITE_EXE` if the executable is installed elsewhere.
See [generator](../../bench/aseprite-import-spike/generate.lua),
[harness](../../bench/aseprite-import-spike/run.mjs),
[results](../../bench/aseprite-import-spike/results.json), and
[native fixtures](../../bench/aseprite-import-spike/fixtures/).
The harness intentionally asserts the current alpha-text rejection; a later
compatibility implementation should update that expectation.

Code inspection used the working checkout at base
`cb1c4ab2c673aa5d574f00c668e6f466a4bb1540`, with unrelated ongoing edits present.
Upstream source snapshot: Aseprite
`b3e34acbae812b8a1d814c2e6285343b351c8945` and API documentation
`662b12efe00fd374909bc3a0e9cce5d0d0d35d63`. The native HEX clipboard routine
was also checked at the installed version's `v1.3.18.6` tag.

## Recommended follow-up scope

1. Make native swatch copy the leading Aseprite instruction: select swatches,
   Copy, paste into the palette editor, review, Save. Explain the 1.3.3 minimum
   and palette-versus-canvas selection only where relevant.
2. Let valid HEX paste anywhere appropriate in the open palette editor create
   a reviewed draft, while retaining normal text-field paste behavior. Use the
   paste event's data; an async clipboard-read button can be optional because
   browser permission/activation requirements vary.
3. Mention native `.aseprite`/`.ase` files explicitly beside file/drop guidance.
   Consider opening the palette editor automatically for a native file dropped
   on the wall, with a clear palette-import result and no accidental artwork claim.
4. Support Aseprite's explicit RGBA GPL/PAL variants with the existing transparent
   entry normalization/notice policy. Keep malformed and unrelated formats strict.
5. Keep palette PNG and rendered artwork PNG/sheets as visible fallbacks. Label
   embedded swatches versus used artwork colors so users select the right route.
6. Defer extension-pack import, ACT/COL readers, a custom Send command and live
   synchronization until repeated use justifies their extra UI and maintenance.

Before shipping follow-up behavior, test native swatch copy on Windows/macOS/
Linux browsers, file picker and OS file drop, image/Copy Merged paste, input
focus, duplicate/transparent entries, large/over-limit palettes, failed imports,
and cancel/replace races. Preserve mobile picker and text-paste fallbacks.
Native image paste and raw swatch drag should not receive broad compatibility
claims based solely on parser tests.

Existing implementation references: `src/PaletteImport.svelte`,
`src/lib/palette-ase.js`, `src/lib/palette-decode.js`,
`src/lib/palette-import.js`, `src/lib/palette-drop.js`,
`src/lib/image-drop.js`, `src/App.svelte`, and `docs/palettes.md`.
The prior [deferred artwork study](2026-10-11-aseprite-artwork-support.md)
remains applicable: palette workflow improvements do not require native
artwork rendering or reopen that larger feature.

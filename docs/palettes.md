# Palettes

Bitify's Palette panel has two families: **1-bit**, with twelve preset color pairs, and
**Palette**, with nine curated palettes, optional Auto and a named local library. The pairs are
defined in [src/lib/presets.js](../src/lib/presets.js); full palettes and their provenance
are in [src/lib/palette-library.js](../src/lib/palette-library.js).

Open Palette and choose **Palette** or **1-bit**. Palette mode's import icon accepts
an image, palette file or pasted colors; its edit icon opens color review. Names under
the round choices use a single line with an ellipsis when needed; full names remain in
accessible labels and tooltips. More → Help lists the current mode's controls.

**Auto is selected on fresh visits and global Reset, and leads the rail.**
Saved choices remain intact, including older 1-bit preferences. ENDESGA 32 remains
the curated fallback for missing/deleted saved selections. PICO-8 remains available for its
distinctive stylization. A shared preset supplies consistent allowed RGB values;
Max colors can restrict each asset further.

Choose **Auto** to fit up to 32 shared colors from every wall image, including
all animation frames. It runs only when selected and refreshes when images or Opacity
cut change. Matching, Max colors and Cleanup use that palette without changing its
colors. Adding/removing art can recolor earlier tiles. Edit saves a fixed copy that
stops following the wall. Generated improves source fidelity in the tested corpus,
but may preserve unwanted AI noise; it does not infer intentional outlines/details.

Auto's tooltip starts with its completed color count and source: for example,
**Auto · 32 colors · Your images**, or **Auto · 11 colors · Example image**.
The next line explains generation. This metadata updates with the published palette;
opening the tooltip does not scan images or start work. During regeneration it describes
the retained completed swatches. Imported images and the empty-wall example are never
combined. The visible name is Auto; its stable saved identity remains `generated-32`.

## 1-bit color pairs

A 1-bit preset is two colors, a dark one and a light one.

The 1-bit family draws images using those two colors:

- **First color**, the left swatch in the dock. It is used for lines and dark pixels.
- **Second color**, the right swatch. It is used for fill and light pixels.

Three controls decide the result, and each does one job:

| Control | Decides |
|---|---|
| Palette | Which two colors are used. |
| Swap | Which of the two is the first color. |
| Style | Which pixels get the first color and which the second; see [styles.md](styles.md). |

They are independent. A palette does not favor a style or a way round, and a style does
not favor any colors. Every palette works with every style, either way round.

Either color can also be **None**: the small switch beside the palette's name leaves the
first or the second color out, and its pixels are transparent on the wall and in the saved
files. None is not part of a palette. Choosing a palette changes the two colors and leaves
None where it is, and Swap takes None along with its color.

For minimal inventory icons, choose **Icon** and make the **first color None**. The second
color fills the body; the inferred outline and selected inner grooves become transparent.
Changing the ink does not change the geometry. Icon reads source RGB directly, so converting
the source to grayscale can remove useful material boundaries.

## The twelve palettes

The panel shows round choices with their names underneath in one horizontal scrolling
row, with vertical dividers between three groups: classics and decorative pairs
(Glow, Mono, Paper, Torch, Rose), handheld screens (Game Boy, Pocket, Nokia, Playdate),
and monitors (Phosphor, Amber, Commodore). Keyboard and gesture stepping follow this order.

Contrast is the WCAG contrast ratio between the two colors, from 1 (identical) to 21 (black
on white). Higher means the two colors are easier to tell apart.

| Name | Dark color | Light color | Contrast | Source |
|---|---|---|---|---|
| Glow | `#222323` soft black | `#f0f6f0` soft white | 14.4 | Lospec, [1bit Monitor Glow](https://lospec.com/palette-list/1bit-monitor-glow) by Polyducks |
| Mono | `#000000` black | `#ffffff` white | 21.0 | Plain black and white |
| Paper | `#382b26` dark brown | `#b8c2b9` grey-green | 7.4 | Lospec, [Paperback-2](https://lospec.com/palette-list/paperback-2) by Doph |
| Torch | `#0b0a0c` near-black | `#f6dfa4` warm cream | 15.1 | Bitify's own, after the game End of End |
| Rose | `#4a0d2b` dark wine | `#ffd1dc` pale pink | 11.1 | Bitify's own |
| Game Boy | `#0f380f` dark green | `#9bbc0f` pea green | 6.0 | Original Game Boy, darkest and lightest shade |
| Pocket | `#1f1f1f` near-black | `#c4cfa1` pale olive | 10.0 | Game Boy Pocket, darkest and lightest shade |
| Nokia | `#43523d` grey-green | `#c7f0d8` mint | 6.7 | Nokia 3310 screen, Lospec [Nokia 3310](https://lospec.com/palette-list/nokia-3310) |
| Playdate | `#322f29` warm black | `#d7d4cc` warm grey | 9.0 | Playdate screen, Lospec [Playdate](https://lospec.com/palette-list/playdate) |
| Phosphor | `#25342f` dark green-grey | `#01eb5f` bright green | 8.1 | Return of the Obra Dinn, IBM 5151 setting |
| Amber | `#3f291e` dark brown | `#fdca55` amber | 8.9 | Return of the Obra Dinn, Zenith ZVM 1240 setting |
| Commodore | `#40318e` indigo | `#88d7de` cyan | 6.3 | Return of the Obra Dinn, Commodore 1084 setting |

The 1-bit family initially uses Glow, with the dark color first. Fresh app visits
start in Palette with Auto.

### Dark first, and Swap

Choosing a palette puts its dark color first unless you have swapped. Dark first means
dark lines on a light fill, and dark pixels of the original stay dark.

Swap puts the light color first. That gives light lines on a dark fill, the look of a
glowing screen, and suits Torch, Phosphor and Amber in the Lines style. It is the same
press for every palette, and no palette does it for you.

### Why Glow is the initial 1-bit pair

Glow supplies the initial colors when switching to 1-bit; saved 1-bit colors remain
independent of Palette mode.

- **It is the most used.** Glow is the most downloaded two-color palette on Lospec, about
  four times ahead of the next one and far ahead of plain black and white.
- **It is neutral.** Saved images come out as soft black and white, with no tint added.
- **It reads in both themes.** Its light fill stands out on the dark tile and its dark
  lines stand out on the light tile.

Mono was the other candidate. It is the same idea with full contrast, which is harsher on
the eye.

### Where the values come from

- **Glow and Paper** are the two most downloaded two-color palettes on
  [Lospec](https://lospec.com/palette-list), a palette library widely used by pixel
  artists. Glow is black and white with the harshness taken off.
- **Game Boy and Pocket.** No Game Boy is 1-bit; the screen shows four shades. These
  presets use the darkest and the lightest of the four. The values are the ones emulators
  and art tools commonly use for each model. They are a convention, not a measurement of a
  real screen, which varies with age, light and the contrast wheel.
- **Nokia and Playdate** are real 1-bit screens. The values are the Lospec entries for each.
- **Phosphor, Amber and Commodore** are three of the monitor settings in the 1-bit game
  Return of the Obra Dinn, as recorded on Lospec. They stand for a green monochrome
  monitor, an amber one, and a Commodore color monitor.
- **Torch and Rose** were made for Bitify.

### What was left out

- Virtual Boy (red on black): contrast 4.7, and harsh on most sprites.
- Game Boy Light: contrast 3.1 between its darkest and lightest shade.
- A Casio calculator green: a third muted green beside Game Boy and Nokia.
- Obra Dinn's Macintosh and IBM 8503 settings: too close to Glow.
- The earlier presets Citron, Moss, Plum, Ember and Tide. Moss and Citron had nearly the
  same light color, Plum was a second pink, and Game Boy, Amber and Commodore now cover
  the green, orange and blue they stood for.

## How they behave in the app

- Choosing a palette replaces both colors and redraws every image at once.
- Choosing a palette does not undo Swap. If the lighter color is first when you choose,
  the new palette goes in light first too; otherwise dark first. So you can swap once and
  then try palette after palette.
- A palette is shown as selected while the two current colors are its two colors, either
  way round. Swap never deselects it. Changing either color with a swatch does.
- The chip in the panel always shows the dark color on the left, whichever way round the
  colors are in use.
- The panel has one row of circular choices with names beneath, scrolling sideways when
  necessary. Images move up to make room. A faded edge indicates more choices. The
  selected name appears right of the fixed-position 1-bit/Palette switch only when measured space permits;
  the individual choices always retain their names. Long names are shortened visually and
  remain available in accessible labels and shared tooltips. A custom pair is named Custom.
- Palettes are a starting point. Either color can be changed to anything with the swatches.
- The Palette panel stays open while you pick, so you can try several in a row. It closes
  on Escape, on a second press of its button, or on a press outside the dock.
- The two colors are remembered between visits, so the app opens on the palette you last
  used, the way round you left it. The first time, it opens on Glow, dark first.
- The 1-bit preset list is fixed. Two colors of your own are kept as one more stop, named
  Custom, while stepping through color pairs, until the page is closed. Named full palettes
  are separate and do not change this behavior.

## Full palettes

Choose **Palette** in the panel to convert source RGB directly into a selected set of
**1–256 unique opaque sRGB colors**. Exact selected RGB values map to themselves; other
pixels choose the nearest color using Oklab (default) or RGB, with the first palette entry winning equal-distance
ties. Selected order is preserved and duplicates are removed. A palette is an allowed set,
not a promise that every selected color will be used.

| Preset | Colors | Attribution |
|---|---:|---|
| Resurrect 64 | 64 | [Kerrie Lake](https://lospec.com/palette-list/resurrect-64) |
| ENDESGA 32 | 32 | [ENDESGA](https://lospec.com/palette-list/endesga-32), originally for NYKRA |
| PICO-8 | 16 | [Lexaloffle Games](https://www.lexaloffle.com/pico-8.php) |
| DawnBringer 16 | 16 | [DawnBringer](https://lospec.com/palette-list/dawnbringer-16) |
| Grayscale 8 | 8 | Bitify: eight evenly spaced sRGB grays |
| Ice Cream GB | 4 | [Kerrie Lake](https://lospec.com/palette-list/ice-cream-gb) |
| Game Boy green | 4 | Common Game Boy LCD-inspired RGB interpretation; hardware does not define one canonical RGB set |
| Glow | 2 | [Polyducks, 1bit Monitor Glow](https://lospec.com/palette-list/1bit-monitor-glow) |
| Paper | 2 | [Doph, Paperback-2](https://lospec.com/palette-list/paperback-2) |

The rail groups presets by descending color count: 64, 32, 16, 8, 4, 2, with vertical
dividers between counts. Glow and Paper form the final preset group, using the exact
same color pairs as their 1-bit counterparts but applying nearest-color matching.
PICO-8 precedes
DawnBringer 16 using Lospec download counts as a popularity signal; the four-color
pair puts the warm artist palette before the familiar handheld palette. This curated
order balances recognition with distinct results, rather than claiming a universal
popularity ranking. ENDESGA 32 is the default full palette independently of rail order. Existing
preset IDs and saved selections are preserved. Published colors retain their original order.

ENDESGA 32 offers broader shared color ramps for varied PixelLab assets while still
restricting the collection to 32 colors. All, Oklab and Cleanup Off remain the defaults;
the median sampled asset used 12 colors with All. PICO-8 remains a distinctive console
look. This is a practical default, not a guarantee of neutral conversion or artist intent;
see `research/2026-10-12-palette-default-and-adaptive.md` for counterexamples.

Curated presets are immutable. Edit creates a named copy. Saved and session-only palettes
follow the presets on the same rail, with a divider. One round preview represents each
palette. A small preview shows all colors up to sixteen; larger palettes show sixteen actual
colors selected to cover their RGB range, in original palette order. This overview avoids
hairline wedges and does not change conversion, editing or export colors. It does not
represent color frequency or which colors an image uses. Palette circles remain 44px; touch targets are at least 44px, while fine-pointer
desktop header controls remain compact. Import and Edit are icon buttons with
accessible names and tooltips; they open a native dialog. There is no separate full-color
style list, no one-option method picker, and no Swap/None role in this family.

The comparison button shows the selected palette's name rather than the generic word
Palette. Short names keep their natural width; long names use CSS ellipsis within a
responsive maximum of 156–208px. Full text is retained in the DOM,
in its accessible label and tooltip. Pressing it still compares the converted result
with the original. The 1-bit comparison button keeps the current style's name.

Nearest-color conversion deliberately remains the full palette method. The supplied
research recommends it first and lists multi-color ordered/error-diffusion dithering
and shape preservation as later work. Dithering can help gradients with sparse palettes,
but it introduces spatial texture and needs explicit sampled-preview, transparency,
animation and performance rules. Legacy Cutout/Stencil/Icon classify two ink roles;
they do not define how arbitrary full-palette entries should represent those roles.
Optional palette methods deserve a separate visual comparison before implementation.

### One shared palette for several images

Select or import a palette once; it applies to every image on the wall. A visible pixel
keeps its RGB if that color is already in the active palette or selected Max colors
subset, including with Cleanup On. Otherwise, the nearest stage checks
every palette entry and chooses the closest using the selected matching rule. **Oklab**
approximates perceived color differences; **RGB** minimizes squared differences between
encoded sRGB channel values (0–255), without channel weighting or brightness adjustment.
Choose either in **Palette settings → Matching**; Oklab is the default. This global setting
is remembered across visits and family switches; selecting a palette does not change it.
Hover or hold the Matching or Cleanup label for its explanation; the descriptions
are also available to screen readers.
With **Max colors: All** and **Cleanup: Off** (the defaults), the same source RGB maps to the same palette RGB
at the same matching setting in every image. All preserves the existing nearest conversion.
The shared palette is never regenerated or changed.

**Max colors** optionally selects up to 2–256 colors from that palette per image. Move
the slider or enter a number; both controls stop at the active palette's color count.
They show the effective limit while retaining a higher remembered limit for larger
palettes. Switching palettes or leaving an untouched field does not change the preference;
editing the limit does. Unfinished edits are discarded when the palette changes.
Slider changes apply after a 200ms pause or immediately on release; number changes apply
when you finish editing. The previous preview stays visible during recalculation.
**All** places the slider at the active palette's maximum and shows that color count as
the number field's placeholder. It removes the limit and stays distinct
from a numeric limit equal to the palette's size. A one-color palette uses its sole color
and disables both limit inputs. Two-color palettes disable the immovable slider, while
the number can select 2. Previous saved limits of 1 restore as 2; All remains unchanged.
Selection reduces weighted color error using a bounded search, then pixels use nearest matching
within the chosen subset. Small details can merge and separate images can choose different
subsets, so identical source RGBs need not match identically when limited. Animations use
one subset for all frames, weighted by frame duration. Transparency does not count toward
the limit. The limit is remembered across visits and family switches.

Each image can use a different subset of that shared set. It does not have to use every
selected color. PNG exports compact unused entries, so files can have different stored
color tables while all visible RGBs still belong to the same shared palette. GIF frames
share one used-color table per exported animation. Fully transparent pixels stay empty;
the Opacity cut decides whether partially transparent pixels become empty or opaque.

**Cleanup: Off / On** optionally merges isolated palette-colored pixels with compatible
neighbors. Off is the default and keeps ordinary nearest output. On can remove deliberate
eyes/highlights and map the same source RGB differently depending
on its surroundings. It never adds a color outside the selected palette/subset or changes
transparency. Cleanup uses full-source decisions for previews, Save, Copy, ZIP and export
dragging. GIFs apply a change at a coordinate only when every frame agrees on both the
original nearest color and the proposed replacement. Moving noise can therefore remain.
On preserves exact RGB matches in the active palette/subset. A final veto limits added
squared Oklab error to the smaller of 0.005 and half the original matching error plus
0.0004. The fixed ceiling also applies with RGB matching and smaller Max colors subsets.
This reduces expensive color changes; it cannot identify every intentional detail.
Read the [research and detail-loss limits](research/2026-10-12-one-pixel-cleanup.md) before
using it for small sprites.

Nearest matching minimizes each individual visible pixel's distance under the selected rule to the allowed
set. Dithering instead spreads different allowed colors over neighboring pixels to
approximate a missing shade; it can improve averaged shading while increasing individual
pixel error and changing crisp pixel-art textures. Palette-specific Ordered and Diffusion
remain research ideas, not available app controls.

Output pixels are fully opaque or fully transparent. Opacity cut defaults to 128:
source alpha below the cut becomes empty. The range is 1–255, so alpha zero always stays
empty. Palette settings always offers the compact Oklab / RGB control. Opacity cut appears
only when an image has partial alpha or the cut has changed. The popup's 16px semibold **Nearest**
title identifies the conversion method for both matching choices, with an icon-only Reset
button aligned at its right. Rows are Max colors, Matching, Cleanup, then
Opacity cut when applicable. Reset restores Oklab, All, Cleanup Off and cut
128 without changing the selected palette. Neither rule is universally visually best;
compare with the original, especially when a palette lacks the source's hue. Other color
spaces and palette dithering remain outside the current controls; see the
[matching decision](research/2026-10-11-palette-matching.md).
Switching families retains 1-bit colors, None, style and per-style settings.
Selecting or altering a palette returns the display to converted output; hold comparison
and the persistent-label conversion switch remain available.

### Import and review

One dialog has an editable palette name, download and Close in its fixed header.
Download stays visible and is disabled when the draft is empty, incomplete or busy.
The scrolling content shows the shared color count (initially **0 colors**), swatches
and editing/recovery controls, then **Image or file**, **Paste colors** and **Add colors**.
Only the chosen input controls appear below those buttons, followed by source notices
and acquisition errors. Switch methods without losing the draft or pasted text.
Large swatch lists scroll within a bounded grid; the save footer stays visible.
Editing and copying start with Add colors.

While this dialog is open, drop a local palette file or an HTTP(S) image/Aseprite URL
from Discord or a web page anywhere on it. Files take precedence over URLs; only the
first source replaces the draft, with the chosen method and entered name retained.
Signed URL queries are kept. Downloads omit credentials and referrers, have a 30-second
download timeout and stop above 32 MiB. The host must permit browser cross-origin access.
Failures and cancellation retain the current colors; a failed link can be saved and
imported as a file instead. Remote text palette links are not supported; use the existing
file picker/drop or Paste colors for HEX/TXT, GPL and JASC-PAL.
File and text actions say Replace when colors exist; manual Add appends a unique color.
New drafts suggest New palette, or the first available New palette 2, 3, etc.
when saved or session palettes already use that name (ignoring case and outer spaces).
Existing and entered names are preserved. An untouched file import can suggest its filename.
The name-to-count gap matches other sections: 12px, or 6px in short landscape.
An image with no visible colors reports that and keeps the draft. The round HEX backup
button is beside Close; Image options/More options expand only when needed. Image
options opens automatically for an over-limit image. Errors and recovery actions stay
visible, and the saving limit is explained when the draft needs reduction.
If an earlier GIF export exceeds its color limit while this editor is open, an inline
notice identifies that export palette and asks you to finish or cancel the draft, then
try Save again. The draft, editing limit and saved record remain unchanged.

- **Images:** PNG, JPEG, WebP, BMP and GIF, up to 32 MiB and 16 × 1024 × 1024 decoded
  pixels. GIF contributes its first frame, with a notice. Decoding is browser-managed,
  color-managed sRGB. These are decoded values, not a guarantee about original profile or
  file bytes, and the browser may allocate decode buffers before dimensions are known.
- **Text:** pasted or HEX/TXT colors, legacy RGB GPL, and text JASC-PAL version 0100,
  up to 256 KiB. Hex tokens accept `#RGB`, `#RRGGBB`, or bare six-digit hex, separated
  by whitespace, commas or semicolons. Alpha hex, binary PAL, Adobe ASE/ACO and malformed or
  mismatched RGB rows are rejected. TXT uses the hex grammar, rather than every format
  another program happens to call TXT.
- **Aseprite:** `.ase` / `.aseprite`, up to 32 MiB and 4096 embedded table entries.
  A lazy parser reads the first frame's
  embedded palette, preferring modern palette records over legacy ones. Stored RGB
  channels are imported in palette-index order, with duplicates removed and alpha-zero
  entries skipped. Partial alpha becomes opaque, with the existing notice. Later frame
  palettes are not combined. Missing or incomplete palettes, malformed framing or palette data
  are rejected without replacing the draft. Artwork, layers and document color profiles
  are not rendered, validated or applied: this preserves authored numeric colors like HEX import.
  Export a color-managed PNG first to import colors from the rendered appearance.
- **Every color:** all full-resolution pixels with alpha greater than zero are scanned
  in reading order. RGB duplicates are removed, alpha-zero pixels are ignored, and
  partial alpha produces an opaque-normalization notice. No assumed image layout, color
  popularity filter, automatic background removal or black/white exclusion is used.
- **Find solid colors:** an optional proposal from matching visible RGB in 3×3 patches,
  even when their positive alpha levels differ. It can retain borders and backgrounds.
  Review the result yourself; it does not identify intended swatches. A zero-candidate
  result explains the problem and keeps the current draft.

The dialog reviews up to 4096 colors in pages of 64. Select colors to remove them, edit
one selected color with the color picker, add a color, or undo edits. Duplicate edits are
rejected and the picker keeps its original value. A committed palette needs 1–256 unique
colors and a trimmed name of 1–64 Unicode characters. Above 4096 distinct colors the
exact total is reported, only the first 4096 are shown, and that incomplete draft cannot
be saved or exported as a complete backup. Try solid candidates or a smaller prepared
palette image/file. Cancel leaves the existing palette and library unchanged.

The three supplied regression images produce 255, 31 and 345 exact visible RGB values.
Solid candidates produce 0, 31 and 31. Removing the strip background `#202125` or grid
border `#babacc` manually produces their intended 30-color sets. These are fixture
results, not a guarantee that arbitrary screenshot borders can be inferred automatically.

### Saving, persistence and reset

Named palettes are committed to the separately versioned `bitify-palettes-v1` local
storage key, with a maximum of 100 records and 256 KiB of serialized UTF-8 data. The
capacity limit can be reached before 100 large palettes. Source images and drafts are not
saved. Record validation restores valid palettes independently of damaged records.
The latest library is read before writing; changed/deleted revisions offer Save copy or
Reload. Web Storage provides no transaction across simultaneous tab writes.
Changes or clearing local storage in another tab refresh the saved choices. Session
palettes and an open editor draft remain available; saving a removed record offers recovery.

Storage failure keeps the draft visible, offers Use for this session, and permits a HEX
backup. Successful Save selects the palette; it is not labeled saved before persistence
succeeds. Delete requires confirmation. Reset settings preserves saved palettes by default;
its unchecked Delete saved palettes option removes only the palette-library key when
selected. Reset keeps artwork files and reconverts the wall with default 1-bit settings.
A deletion/storage failure is reported rather than silently clearing data.

### Export boundaries

Full palette still images save as `-palette.png`; animated images save as `-palette.gif`.
Save and Copy use every original-resolution pixel and a snapshot of the current matching rule, colors
and alpha cut, including the optional maximum. Preview, Save and Copy select from the
same full-resolution source; animation Copy uses its shared all-frame subset. PNG packs only used colors at the smallest 1/2/4/8-bit depth; all 256 used
opaque colors plus empty use directly encoded RGBA PNG instead. No canvas encoding or
implicit color reduction is used. Copy supplies a PNG of the first animation frame.

GIF uses a stable global table of the used colors across all frames, including an empty
entry when needed. It permits 256 opaque used colors, or 255 opaque colors plus empty.
If all 256 colors and transparency are used, Save opens a named copy constrained to 255
colors. Remove colors explicitly, save the copy, then request a new download. Cancel
preserves the original selection. Save all downloads no ZIP until all files succeed.
Local GIF tables and implicit automatic reduction are not implemented. An explicit Max
colors limit applies before this compatibility check. Converted preview playback
waits for each frame and may slow down on expensive images. Original comparison follows
the source frame timers independently of conversion; exports retain source frame delays.

## Adding or changing one

Edit the `PRESETS` list in `src/lib/presets.js`. Each entry is a name, a dark color and a
light color, as lowercase `#rrggbb`:

```js
{ name: 'Glow', dark: '#222323', light: '#f0f6f0' },
```

- `dark` must be the darker of the two. Do not store a palette light first to give it a
  look; that is what Swap is for.
- Prefer a pair people already know, from real hardware or a widely used palette, over an
  invented one, and record its source in the table above.
- Do not add a pair that looks like one already there. Two muted greens or two pinks make
  the panel harder to choose from, not richer.
- Use lowercase six-digit hex. The browser's color picker reports colors that way, and a
  palette is matched against the current colors by exact text.
- Keep names short for readable labels under the circular choices. Long names use the
  shared truncation/tooltip behavior; selection must not change the panel's height.
- Keep contrast at 6 or higher. Game Boy is the lowest at 6.0; below that the two colors
  are hard to tell apart in the result.
- To change the default, also change the starting values of `first` and `second` in
  [src/App.svelte](../src/App.svelte).
- Update the palette table in the design spec and in this file.

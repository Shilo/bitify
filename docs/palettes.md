# Palettes

The twelve preset palettes in Bitify's Palettes panel. Each is a pair of colors. They are
defined in the `PRESETS` list at the top of [src/Dock.svelte](../src/Dock.svelte).

## What a palette is

A palette is two colors, a dark one and a light one, and nothing else.

Bitify draws every image in exactly two colors:

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

## The twelve palettes

The panel shows them four to a row, in this order: a row of classics, a row of handheld
screens, a row of monitors.

Contrast is the WCAG contrast ratio between the two colors, from 1 (identical) to 21 (black
on white). Higher means the two colors are easier to tell apart.

| Name | Dark color | Light color | Contrast | Source |
|---|---|---|---|---|
| Glow | `#222323` soft black | `#f0f6f0` soft white | 14.4 | Lospec, [1bit Monitor Glow](https://lospec.com/palette-list/1bit-monitor-glow) by Polyducks |
| Mono | `#000000` black | `#ffffff` white | 21.0 | Plain black and white |
| Paper | `#382b26` dark brown | `#b8c2b9` grey-green | 7.4 | Lospec, [Paperback-2](https://lospec.com/palette-list/paperback-2) by Doph |
| Torch | `#0b0a0c` near-black | `#f6dfa4` warm cream | 15.1 | Bitify's own, after the game End of End |
| Game Boy | `#0f380f` dark green | `#9bbc0f` pea green | 6.0 | Original Game Boy, darkest and lightest shade |
| Pocket | `#1f1f1f` near-black | `#c4cfa1` pale olive | 10.0 | Game Boy Pocket, darkest and lightest shade |
| Nokia | `#43523d` grey-green | `#c7f0d8` mint | 6.7 | Nokia 3310 screen, Lospec [Nokia 3310](https://lospec.com/palette-list/nokia-3310) |
| Playdate | `#322f29` warm black | `#d7d4cc` warm grey | 9.0 | Playdate screen, Lospec [Playdate](https://lospec.com/palette-list/playdate) |
| Phosphor | `#25342f` dark green-grey | `#01eb5f` bright green | 8.1 | Return of the Obra Dinn, IBM 5151 setting |
| Amber | `#3f291e` dark brown | `#fdca55` amber | 8.9 | Return of the Obra Dinn, Zenith ZVM 1240 setting |
| Commodore | `#40318e` indigo | `#88d7de` cyan | 6.3 | Return of the Obra Dinn, Commodore 1084 setting |
| Rose | `#4a0d2b` dark wine | `#ffd1dc` pale pink | 11.1 | Bitify's own |

The app opens on Glow, with the dark color first.

### Dark first, and Swap

Choosing a palette puts its dark color first unless you have swapped. Dark first means
dark lines on a light fill, and dark pixels of the original stay dark.

Swap puts the light color first. That gives light lines on a dark fill, the look of a
glowing screen, and suits Torch, Phosphor and Amber in the Lines style. It is the same
press for every palette, and no palette does it for you.

### Why Glow is the default

The default decides what someone gets who never opens the Palettes panel, so it should be
the pair the most people would pick.

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
- Palettes are a starting point. Either color can be changed to anything with the swatches.
- The Palettes panel stays open while you pick, so you can try several in a row. It closes
  on Escape, on a second press of its button, or on a press outside the dock.
- Colors are not remembered between visits. The app always opens on Glow, dark first.
- There are no custom palettes; the list is fixed.

## Adding or changing one

Edit the `PRESETS` list in `src/Dock.svelte`. Each entry is a name, a dark color and a
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
- Keep the list at a multiple of four. The panel lays palettes out four to a row, and a
  thirteenth would sit alone on a fourth row.
- Keep names short. Each sits under a 36px chip in a narrow column. "Commodore" is about
  as long as fits.
- Keep contrast at 6 or higher. Game Boy is the lowest at 6.0; below that the two colors
  are hard to tell apart in the result.
- To change the default, also change the starting values of `first` and `second` in
  [src/App.svelte](../src/App.svelte).
- Update the palette table in the design spec and in this file.

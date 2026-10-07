# Palettes

The eight preset palettes in Bitify's Palettes panel. Each is a pair of colors. They are
defined in the `PRESETS` list at the top of [src/Dock.svelte](../src/Dock.svelte).

## What a palette is

Bitify draws every image in exactly two colors:

- **First color**, the left swatch in the dock. It is used for lines and dark pixels.
- **Second color**, the right swatch. It is used for fill and light pixels.

A palette sets both at once. Which pixels get which color is decided by the style, not by
the palette; see [styles.md](styles.md).

## The eight palettes

Contrast is the WCAG contrast ratio between the two colors, from 1 (identical) to 21 (black
on white). Higher means the two colors are easier to tell apart.

| Name | First color | Second color | Contrast | Looks like |
|---|---|---|---|---|
| Torch | `#f6dfa4` warm cream | `#0b0a0c` near-black | 15.1 | Light lines on a dark fill |
| Citron | `#262262` deep indigo | `#e6f0b4` pale yellow-green | 11.8 | Dark lines on a light fill |
| Moss | `#1e3a2b` dark green | `#d7e8a0` light yellow-green | 9.4 | Dark lines on a light fill |
| Plum | `#3b1f3f` dark purple | `#f6c7b6` peach | 9.5 | Dark lines on a light fill |
| Ember | `#2a1414` dark brown | `#ff9f45` orange | 8.5 | Dark lines on a light fill |
| Tide | `#0e3b5c` deep blue | `#bfe9e0` pale aqua | 8.9 | Dark lines on a light fill |
| Rose | `#4a0d2b` dark wine | `#ffd1dc` pale pink | 11.1 | Dark lines on a light fill |
| Mono | `#000000` black | `#ffffff` white | 21.0 | Dark lines on a light fill |

Torch is the default when the app opens. It is the only preset whose first color is the
lighter one, so it gives light line art on a dark body, in the style of the game End of End.
The other seven put the dark color first. Pressing Swap turns any of them into the opposite
arrangement.

Mono is plain black and white, the classic 1-bit look and the highest contrast possible.

## How they behave in the app

- Choosing a palette replaces both colors and redraws every image at once.
- A palette is shown as selected only while both colors match it exactly. Changing either
  color with a swatch, or pressing Swap, deselects it. Swapping back selects it again.
- Palettes are a starting point. Either color can be changed to anything with the swatches.
- The Palettes panel stays open while you pick, so you can try several in a row. It closes
  on Escape, on a second press of its button, or on a press outside the dock.
- Colors are not remembered between visits. The app always opens on Torch.
- There are no custom palettes; the list is fixed.

## Adding or changing one

Edit the `PRESETS` list in `src/Dock.svelte`. Each entry is a name and two lowercase
`#rrggbb` colors:

```js
{ name: 'Torch', first: '#f6dfa4', second: '#0b0a0c' },
```

- Use lowercase six-digit hex. The browser's color picker reports colors that way, and a
  palette is matched against the current colors by exact text.
- Keep the list at a multiple of four. The panel lays palettes out four to a row, and a
  ninth would sit alone on a third row.
- Keep names short. Each sits under a 36px chip in a narrow column.
- Aim for strong contrast. Every current palette is 8.5 or higher. With a low-contrast pair
  the two colors are hard to tell apart in the result.
- To change the default, also change the starting values of `first` and `second` in
  [src/App.svelte](../src/App.svelte).
- Update the palette table in the design spec and in this file.

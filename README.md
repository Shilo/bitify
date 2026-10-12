<img src="src/assets/logo.gif" width="240" alt="Bitify logo: a spinning gold coin">

# Bitify

Convert sprites and animations with 1-bit styles or color palettes. Runs entirely in the browser; nothing is uploaded.

**[shilo.github.io/bitify](https://shilo.github.io/bitify/)**

## Features

- Add any number of images by drag and drop, file picker or paste. Web and Discord image drops work when the host allows access, including animated GIFs.
- In 1-bit, choose two colors, swap them, or pick from twelve presets. Either color can be None, for a transparent result. Changes redraw every image at once.
- Full palettes with 1–256 unique opaque RGB colors, seven curated presets, and a named local palette library. One editor lets you import images or palette files, paste hex colors, or add colors manually, then review and save. Drop an image or Aseprite file from your device into the editor. Discord and web URL drops require the host to allow browser access; otherwise save the attachment and import the local file. Files support HEX/TXT, legacy RGB GPL, JASC-PAL and Aseprite embedded palettes.
- Eleven 1-bit styles: Cutout (filled shapes with their parts cut apart, after the game End of End), Solid, Stencil (a filled shape with its inner lines cut out, for one-color icons), Lines (outlines each part of a sprite), Checker, Hatch, Bayer, Noise, Atkinson, Icon and Shape.
- In 1-bit, use the threshold slider or per-image Auto setting. Palette mode matches each pixel to the nearest selected color using Oklab (default) or RGB, preserving exact matches and sharing the selected palette across all images. A separate opacity cut appears when needed.
- An immersive checker canvas with grouped floating glass controls and readable image actions/labels.
- Compare with the original: click the style- or palette-named button, hold a tile, or hold Space.
- Save PNGs and animated GIFs at original size, or all images as a ZIP. Full palette GIFs allow up to 256 used colors, including transparency; incompatible exports offer an explicitly edited palette copy.
- Copy an image to the clipboard with its Copy button (on phones, from its Share button), or the first one with Ctrl+C.
- Responsive desktop, iOS and Android interface, with app installation where the browser supports it.

## Development

```bash
npm install
npm run dev
```

`npm test` runs the unit tests, `npm run build` writes the site to `dist/`.

`node bench/palette-qa.mjs dist` checks the built app through real controls, including all twelve color pairs with all eleven legacy styles, independently decoded full palette exports, cross-tab storage changes and GIF comparison during pending conversion. Set `BASE_REF` to the pre-feature Git revision when running this compatibility check after committing the feature.

Saved palettes stay on this browser/device. Reset settings keeps them unless **Delete saved palettes** is selected. The download icon beside Close exports a HEX backup when colors are available. Shared color review sits above the editor's three input methods. The new palette workflows have browser automation coverage; physical-phone and Safari validation remain outstanding.

Aseprite `.ase` / `.aseprite` import reads the first frame's embedded palette in index order, using its stored RGB values without applying the artwork's color profile. It does not render the sprite. Its parser downloads only when an Aseprite file is selected; other imports use their existing paths. Export a color-managed PNG first if you want colors from the rendered artwork instead.

Open Palette to choose **1-bit** or **Palette**. In Palette, the import icon accepts an image, palette file or pasted colors; the edit icon opens color review. The **Nearest** settings popup offers **Matching: Oklab / RGB**, remembered across visits, and Opacity cut when needed. Oklab compares perceived differences; RGB compares channel values. Neither guarantees the best-looking result for every palette. Large palettes use up to sixteen representative colors in their small preview; conversion uses the full palette. Help in More lists the controls available in the current mode. See [palettes.md](docs/palettes.md) and [styles.md](docs/styles.md) for details.

Built with Svelte 5 and Vite. Every push to `main` is deployed to GitHub Pages by [deploy.yml](.github/workflows/deploy.yml).

The full design is in [docs/superpowers/specs/2026-10-06-bitify-app-design.md](docs/superpowers/specs/2026-10-06-bitify-app-design.md).

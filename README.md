<img src="src/assets/logo2.gif" width="240" alt="Bitify logo: a spinning gold coin, and the same coin converted to two colors">

# Bitify

Convert sprites and animated GIFs with 1-bit styles or a full color palette. Runs entirely in the browser; nothing is uploaded.

**[shilo.github.io/bitify](https://shilo.github.io/bitify/)**

## Features

- Add any number of images by drag and drop, file picker or paste.
- Two colors, swap, and twelve preset palettes. Either color can be None, for a transparent result. Changes redraw every image at once.
- Full palettes with 1–256 unique opaque RGB colors, five curated presets, and a named local palette library. Import palette images, HEX/TXT, legacy RGB GPL, JASC-PAL, or pasted hex colors; review and edit before saving.
- Eleven styles: Cutout (filled shapes with their parts cut apart, after the game End of End), Solid, Stencil (a filled shape with its inner lines cut out, for one-color icons), Lines (outlines each part of a sprite), Checker, Hatch, Bayer, Noise, Atkinson, Icon and Shape.
- Threshold slider, with a per-image Auto setting.
- An immersive checker canvas with grouped floating glass controls and readable image actions/labels.
- Compare with the original: click the style-named button, hold a tile, or hold Space.
- Save PNGs and animated GIFs at original size, or all images as a ZIP. Full palette GIFs allow up to 256 used colors, including transparency; incompatible exports offer an explicitly edited palette copy.
- Copy an image to the clipboard with its Copy button (on phones, from its Share button), or the first one with Ctrl+C.
- Responsive desktop, iOS and Android interface, with app installation where the browser supports it.

## Development

```bash
npm install
npm run dev
```

`npm test` runs the unit tests, `npm run build` writes the site to `dist/`.

`node bench/palette-qa.mjs dist` checks the built app through real controls, including all twelve color pairs with all eleven legacy styles and independently decoded full palette exports. Set `BASE_REF` to the pre-feature Git revision when running this compatibility check after committing the feature.

Saved palettes stay on this browser/device. Reset settings keeps them unless **Delete saved palettes** is selected. Export HEX backups to keep a portable copy. The new palette workflows have browser automation coverage; physical-phone and Safari validation remain outstanding.

Built with Svelte 5 and Vite. Every push to `main` is deployed to GitHub Pages by [deploy.yml](.github/workflows/deploy.yml).

The full design is in [docs/superpowers/specs/2026-10-06-bitify-app-design.md](docs/superpowers/specs/2026-10-06-bitify-app-design.md).

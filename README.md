<img src="src/assets/logo.gif" width="240" alt="Bitify logo: a spinning gold coin">

# Bitify

Convert sprites and animations with 1-bit styles or color palettes. Runs entirely in the browser; nothing is uploaded.

**[shilo.github.io/bitify](https://shilo.github.io/bitify/)**

## Features

- Add any number of images by drag and drop, file picker or paste. Web and Discord image drops work when the host allows access, including animated GIFs.
- In 1-bit, choose two colors, swap them, or pick from twelve presets. Either color can be None, for a transparent result. Changes redraw every image at once.
- Full palettes with 1–256 unique opaque RGB colors, seven curated presets, and a named local palette library. One editor lets you import images or palette files, paste hex colors, or add colors manually, then review and save. Drop an image or Aseprite file from your device into the editor. Discord and web URL drops require the host to allow browser access; otherwise save the attachment and import the local file. Files support HEX/TXT, legacy RGB GPL, JASC-PAL and Aseprite embedded palettes.
- Eleven 1-bit styles: Cutout (filled shapes with their parts cut apart, after the game End of End), Solid, Stencil (a filled shape with its inner lines cut out, for one-color icons), Lines (outlines each part of a sprite), Checker, Hatch, Bayer, Noise, Atkinson, Icon and Shape.
- In 1-bit, use the threshold slider or per-image Auto setting. Palette mode matches colors using Oklab (default) or RGB. **Max colors** optionally limits each image to a smaller subset of the shared palette. Optional **Cleanup** merges isolated pixels and can remove small details; it defaults to Off. A separate opacity cut appears when needed.
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

Open Palette to choose **1-bit** or **Palette**. In Palette, the import icon accepts an image, palette file or pasted colors; the edit icon opens color review. **Nearest** offers **Matching: Oklab / RGB**, **Max colors**, **Cleanup: Off / On**, and Opacity cut when needed. The slider and number run from 2 to the active palette's color count; a higher remembered limit returns with a larger palette. One-color palettes disable both limit inputs. **All** restores unrestricted matching, places the slider at the palette maximum and shows that count in the field. Slider edits apply after a pause or release; number edits apply when finished. Settings are remembered. Oklab compares perceived differences; RGB compares channel values. Neither guarantees the best-looking result for every palette. A limit can merge details; sprites use different subsets, while GIF frames share one stable subset. Large palettes show up to sixteen representative colors in their thumbnail. Help in More lists the controls available in the current mode. See [palettes.md](docs/palettes.md) and [styles.md](docs/styles.md) for details.

Max colors previews update after a short slider pause or release, keeping the previous
preview visible while recalculating. Number edits apply when finished.

**Cleanup: Off / On** in Nearest optionally merges isolated pixels with compatible
neighbors. It can remove eyes or highlights, so Off is the default. GIFs keep a change
only where every frame agrees on the nearest color and replacement. Moving noise can
remain. Cleanup uses the same full-source decisions for previews and exports; it retains
the palette, color cap and transparency. See the [research and limitations](docs/research/2026-10-12-one-pixel-cleanup.md).

Built with Svelte 5 and Vite. Every push to `main` is deployed to GitHub Pages by [deploy.yml](.github/workflows/deploy.yml).

The full design is in [docs/superpowers/specs/2026-10-06-bitify-app-design.md](docs/superpowers/specs/2026-10-06-bitify-app-design.md).

## Deferred work

[MP4 import feasibility and deferred task](docs/research/2026-10-11-mp4-support.md) records the tested browser-decoding approach, memory and compatibility limits, and proposed scope for MP4 import with GIF export. MP4 app support is not implemented; MP4 export is deferred separately.

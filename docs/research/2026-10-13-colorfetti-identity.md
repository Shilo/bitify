# Colorfetti brand guide

Colorfetti is the identity of the browser-based image, sprite and animated GIF recoloring app. This guide defines its name, logo, colors and production icon suite.

## Name and positioning

Use **Colorfetti**, with a capital C and lowercase f. The name blends color and confetti: small colorful pieces connect pixels, palettes and creative transformation. The identity is playful and clear enough to represent creative software beyond pixel art.

Lead with recoloring and palette choice. Automatic colors derived from the images are the default; preset and custom palettes offer other looks. Two-color styles are an additional creative option.

## Product description

**Throw your pixels a palette party. Recolor images and animations.**

For a short category label, use **Image and animation recoloring tool**. Where privacy needs a separate line, use **Images stay on your device.**

Use the approved two-sentence copy consistently in Help, site metadata, installation metadata and the README. “Animations” keeps the positioning open to future formats; current technical support remains documented separately.

## Logo

The logo combines a thick **C** (black on light surfaces, off-white on dark surfaces), a picture frame and five flat confetti pieces. Its overall silhouette is square. The C forms the top, left and bottom of the frame, with equally long top and bottom arms. A separate right column contains a square at each corner and a tall center piece. Two wide pieces fill the interior to the left of that column.

Every neighboring shape has the same gap. The right column's three pieces share their left and right edges. Its corner squares have the same height as the C's thickness. The interior pieces fill the remaining area, preserving consistent gaps to the frame and to each other.

Use crisp rectangular geometry and solid fills. The frame weight, square silhouette, fixed arrangement and equal spacing are essential parts of the mark. Only the C changes color between the two transparent theme variants; the five confetti colors stay fixed.

### Master geometry

Coordinates are logical grid units in a tightly cropped 30 × 30 artboard. The occupied mark is the full artboard, with no outer padding. Transparent gaps remain part of the geometry. All internal gaps are **2 units**; the C is **6 units** thick. Preserve these proportions when scaling.

| Shape | X | Y | Width | Height | Fill |
| --- | ---: | ---: | ---: | ---: | --- |
| C top arm | 0 | 0 | 22 | 6 | Black |
| C left spine | 0 | 6 | 6 | 18 | Black |
| C bottom arm | 0 | 24 | 22 | 6 | Black |
| Top-right corner | 24 | 0 | 6 | 6 | Orange |
| Bottom-right corner | 24 | 24 | 6 | 6 | Violet |
| Upper interior piece | 8 | 8 | 14 | 6 | Pink |
| Lower interior piece | 8 | 16 | 14 | 6 | Yellow |
| Right-center piece | 24 | 8 | 6 | 14 | Teal |

### Brand palette

| Color | HEX | Placement |
| --- | --- | --- |
| Black | `#202020` | C frame on light surfaces |
| Off-white | `#FFFDF9` | C frame on dark surfaces; installed icon background |
| Orange | `#F47A34` | Top-right corner |
| Violet | `#7952C7` | Bottom-right corner |
| Pink | `#E63E82` | Upper interior piece |
| Yellow | `#F4C340` | Lower interior piece |
| Teal | `#0EAAA5` | Right-center piece |

The five confetti colors give the mark a bright, playful personality against the neutral frame. Keep each color in its assigned position. The C silhouette and consistent gaps provide recognition as well as color separation.

## Consistent use

The favicon, installed app icons, Help branding, README artwork and social previews derive from [one SVG master](../../src/assets/logo.svg). Pair the icon with the exact name **Colorfetti**; in-app text uses the app's existing typography.

A live recoloring demonstration may use the logo geometry as example artwork. Public brand assets use the fixed palette above.

### Background and theme handling

General SVG and PNG logos have transparent backgrounds and fill the full square bounds of the drawn pixels. The light-surface variant uses a `#202020` C; the dark-surface variant uses a `#FFFDF9` C. Every confetti fill and geometric proportion stays unchanged. Never invert or filter the entire image: that would alter the five brand colors.

Help explicitly selects the app's current theme variant, including a saved override. The 60×60 example switches source artwork when the app theme changes and remains a live recoloring demonstration; its gaps remain transparent. The two tiny PNG sources decode once and are reused. The demo tile is keyed by source identity so conversion caches reset between variants; imported artwork retains its identity and does not change source with the theme. Unmount cancels outstanding demo decoding. README uses GitHub-supported picture sources for light/dark appearance.

Browser favicon selection follows `prefers-color-scheme`, independently of app theme settings. Early startup selects explicit light/dark SVG, PNG and ICO URLs and updates them on preference changes. Versioned favicon URLs bypass cached copies of the earlier opaque artwork. This avoids depending on SVG-internal dark CSS in Safari versions with [the reported SVG media-query issue](https://bugs.webkit.org/show_bug.cgi?id=309949). The initial SVG is adaptive when scripts are disabled. A browser's reported preference cannot identify every custom tab-bar background; unusual themes and older/script-disabled raster-only browsers can still require platform testing. ICO exports contain both alpha and matching legacy AND masks.

Installed PWA and Apple home-screen icons are dedicated opaque `#FFFDF9` tiles with black C artwork. Ordinary exports use a 38-unit grid with 4-unit inset; maskables use a 56-unit grid with 13-unit inset, keeping the entire square mark inside the centered 40%-radius safe circle. They retain padding because OS masks can crop full-bounds artwork. We do not claim installed icons dynamically follow the app or OS theme. These exports comply with [maskable-icon guidance](https://web.dev/articles/maskable-icon) and avoid OS-selected fills for transparent installation icons.

An optional separate monochrome PNG and Safari pinned-tab SVG preserve the silhouette and transparent gaps; the platform chooses a single display color. They do not replace ordinary multicolor icons.

### Production files

| Surface | Files and sizes |
| --- | --- |
| Master, Help and README | `src/assets/logo.svg` and generated `src/assets/logo-dark.svg`, tightly cropped 30 × 30 grid |
| Browser tabs | Adaptive `public/favicon.svg`; explicit `favicon-light.svg` / `favicon-dark.svg`; light/dark PNGs at 16, 32 and 48px; light/dark ICOs with 16, 32 and 48px frames |
| Installed PWA, desktop and Android | `public/pwa-192x192.png`, `public/pwa-512x512.png` |
| Android adaptive masks | `public/maskable-icon-192x192.png`, `public/maskable-icon-512x512.png` |
| iPhone and iPad home screen | `public/apple-touch-icon-152x152.png`, `public/apple-touch-icon-167x167.png`, `public/apple-touch-icon-180x180.png` |
| Social link preview | `public/pwa-512x512.png` |
| Recoloring example artwork | `src/assets/logo.png` and `src/assets/logo-dark.png`, tightly cropped transparent 60 × 60 PNGs |
| Monochrome surfaces | `public/monochrome-192x192.png` and `public/safari-pinned-tab.svg` |

The example starts with the selected transparent theme artwork. Conversion controls process its occupied pixels; its unoccupied gaps remain transparent. Installed brand exports retain their fixed colors and dedicated background.

Run `npm run icons` to regenerate exports from the master. Run `node build/brand-assets.mjs --check` to verify all 23 generated exports, reproducibility and the maskable safe area. Raster edges snap to whole pixels without introducing blended colors. At small sizes, pixel rounding necessarily changes some measured widths by a pixel; the master proportions remain unchanged.

All generated files come from the transparent master. Regeneration also verifies cropped bounds and maskable safe-area containment. The suite follows [manifest icon guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons) and [Apple's web clip icon guidance](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html). Operating systems can still apply user-selected icon effects. Installed-device testing is needed to verify each platform's presentation; this is not a native App Store icon package.

Small-size recognition and color-blind accessibility have not been established through user testing. Trademark clearance remains unresolved.

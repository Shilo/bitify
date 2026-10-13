# Colorfetti brand guide

Colorfetti is the identity of the browser-based image, sprite and animated GIF recoloring app. This guide defines its name, logo, colors and production icon suite.

## Name and positioning

Use **Colorfetti**, with a capital C and lowercase f. The name blends color and confetti: small colorful pieces connect pixels, palettes and creative transformation. The identity is playful and clear enough to represent creative software beyond pixel art.

Lead with recoloring and palette choice. Automatic colors derived from the images are the default; preset and custom palettes offer other looks. Two-color styles are an additional creative option.

## Product description

Recolor images, sprites, and animated GIFs with automatic, preset, or custom palettes. Explore two-color styles for a different look.

For a short category label, use **Image and GIF recoloring tool**. Where privacy needs a separate line, use **Images stay on your device.**

Keep copy concise, friendly and specific. Confetti language can express play and color exploration, but the app's purpose should remain clear. Recoloring changes an image's colors; it does not add decorative confetti. A campaign tagline has not been selected.

## Logo

The logo combines a thick black **C**, a picture frame and five flat confetti pieces. Its overall silhouette is square. The C forms the top, left and bottom of the frame, with equally long top and bottom arms. A separate right column contains a square at each corner and a tall center piece. Two wide pieces fill the interior to the left of that column.

Every neighboring shape has the same gap. The right column's three pieces share their left and right edges. Its corner squares have the same height as the C's thickness. The interior pieces fill the remaining area, preserving consistent gaps to the frame and to each other.

Use crisp rectangular geometry and solid fills. The black frame, square silhouette, fixed arrangement and equal spacing are essential parts of the mark.

### Master geometry

Coordinates are logical grid units in a 38 × 38 artboard. The occupied mark is 30 × 30, with 4 units of outer padding on each side. All internal gaps are **2 units**; the C is **6 units** thick. Preserve these proportions when scaling.

| Shape | X | Y | Width | Height | Fill |
| --- | ---: | ---: | ---: | ---: | --- |
| C top arm | 4 | 4 | 22 | 6 | Black |
| C left spine | 4 | 10 | 6 | 18 | Black |
| C bottom arm | 4 | 28 | 22 | 6 | Black |
| Top-right corner | 28 | 4 | 6 | 6 | Orange |
| Bottom-right corner | 28 | 28 | 6 | 6 | Violet |
| Upper interior piece | 12 | 12 | 14 | 6 | Pink |
| Lower interior piece | 12 | 20 | 14 | 6 | Yellow |
| Right-center piece | 28 | 12 | 6 | 14 | Teal |

### Brand palette

| Color | HEX | Placement |
| --- | --- | --- |
| Black | `#202020` | C frame |
| Orange | `#F47A34` | Top-right corner |
| Violet | `#7952C7` | Bottom-right corner |
| Pink | `#E63E82` | Upper interior piece |
| Yellow | `#F4C340` | Lower interior piece |
| Teal | `#0EAAA5` | Right-center piece |

The five confetti colors give the mark a bright, playful personality against the heavy black frame. Keep each color in its assigned position. The C silhouette and consistent gaps provide recognition as well as color separation.

## Consistent use

The favicon, installed app icons, Help branding, README artwork and social previews derive from [one SVG master](../../src/assets/logo.svg). Pair the icon with the exact name **Colorfetti**; in-app text uses the app's existing typography.

A live recoloring demonstration may use the logo geometry as example artwork. Public brand assets use the fixed palette above.

### Background and theme handling

Use the same **`#FFFDF9` off-white backplate** in light and dark mode. It keeps the black C visible and preserves all five approved colors. Separate light and dark artwork would add theme-selection dependencies to installation surfaces; this suite uses one universal identity. Platform masks control installed-icon corners; rounding is not baked into the artwork.

Android maskable exports use extra outer padding. The entire foreground fits inside the centered safe circle with radius 40% of the icon width, as specified by [web.dev's maskable guidance](https://web.dev/articles/maskable-icon). Ordinary and maskable assets have separate manifest purposes, avoiding unnecessary padding on ordinary icons.

### Production files

| Surface | Files and sizes |
| --- | --- |
| Master, Help and README | `src/assets/logo.svg`, scalable 38 × 38 grid |
| Browser tabs | `public/favicon.svg`; PNGs at 16 and 32px; `public/favicon.ico` containing 16, 32 and 48px images |
| Installed PWA, desktop and Android | `public/pwa-192x192.png`, `public/pwa-512x512.png` |
| Android adaptive masks | `public/maskable-icon-192x192.png`, `public/maskable-icon-512x512.png` |
| iPhone and iPad home screen | `public/apple-touch-icon-152x152.png`, `public/apple-touch-icon-167x167.png`, `public/apple-touch-icon-180x180.png` |
| Social link preview | `public/pwa-512x512.png` |
| Recoloring example artwork | `src/assets/logo.png`, 76 × 76 PNG with the same backplate |

The example starts with the same background and colors as the public icons. The app's conversion controls process the whole example image, including its background; the public brand exports retain the fixed palette.

Run `npm run icons` to regenerate exports from the master. Run `node build/brand-assets.mjs --check` to verify reproducibility and the maskable safe area. Raster edges snap to whole pixels without introducing blended colors. At small sizes, pixel rounding necessarily changes some measured widths by a pixel; the master proportions remain unchanged.

The suite follows [manifest icon guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons) and [Apple's web clip icon guidance](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html). Operating systems can still apply user-selected icon effects. Installed-device testing is needed to verify each platform's presentation; this is not a native App Store icon package.

Small-size recognition and color-blind accessibility have not been established through user testing. Trademark clearance remains unresolved.

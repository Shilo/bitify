# Colorfetti trailer project

Start here when an agent or editor resumes work on the trailer. This directory
contains the editable composition, deterministic animation code, actual app
captures, original artwork crops, original music, font, licenses, and export tools.
It has no dependency on `.tmp/`, a Codex conversation, a remote design mockup, or
the original creator's machine. The app and trailer have separate npm dependencies.

## Current deliverables

| File, relative to repository root | Purpose | Git |
|---|---|---|
| `public/colorfetti-trailer.mp4` | Website, GitHub and Discord; 1920×1080, 30 fps, 30 seconds, H.264/AAC; below **10,000,000 bytes** | Tracked |
| `public/colorfetti-trailer-poster.png` | Intro still linked near the top of the root README | Tracked |
| `output/colorfetti-trailer/colorfetti-trailer-1080.mp4` | 1080 master, CRF 17 video / 192 kbps audio | Ignored; regenerate locally |
| `video/.work/` | Generated HTML, enlarged control crops, mixed audio, QA stills, logs and reports | Ignored |

The original accepted compact export is 8,808,894 bytes (8.81 MB decimal). A fresh
render may differ with Chromium, FFmpeg, OS font rendering, or dependency changes.
`npm run verify` checks the real file size, codec, frame count, streaming layout,
decoded quality and browser playback. Only the compact MP4 belongs in Git. Original
audio and PNG source assets are deliberately tracked so a fresh checkout can render.
No Git LFS, external asset service or API keys are needed.

The root README links to the deployed MP4 with a clickable poster; GitHub Markdown
does not provide dependable inline playback for a committed MP4. Help has a
“Watch the 30-second trailer” link that opens the same asset in a new tab. Vite
copies `public/` to the deployed site. A local commit does not update that site;
the repository's existing Pages workflow deploys on a push to `main`.

## Setup and export

Use Node.js **22.12 or newer** (the app's Vite requirement). Install FFmpeg with
`libx264`, AAC, and `ffprobe` available on PATH. The original export used FFmpeg
2024-10-31 build `87068b9600` from Gyan; codec/platform changes can produce different bytes. Playwright 1.62.1 and
Sharp 0.35.5 are pinned in this project's lockfile.

From the repository root:

```sh
npm ci
npm --prefix video ci
cd video
npx playwright install chromium
npm run qa
npm run preview
```

The preview server prints a local URL and provides play/pause, audio, and a scrubber.
Stop it with Ctrl+C. After editing source, rebuild (`npm run build`) and refresh.
The composition is fixed at 1920×1080; the preview scales it to your window.
The export renders each frame from time, rather than recording playback in real
time, so preview speed cannot cause dropped export frames.

To regenerate both variants and the poster, from `video/`:

```sh
npm run export
```

That runs `render` → `share` → `verify`. Rendering 900 PNG frames takes a few minutes.
It overwrites the ignored master, tracked compact MP4 and tracked poster. Review
the changes before committing. Run individual steps when appropriate:

| Command, inside `video/` | Action |
|---|---|
| `npm run build` | Generate `.work/film.html` and focus crops from source |
| `npm run audio` | Prepare the 30-second normalized music bed |
| `npm run qa` | Build and render ten stills without encoding video |
| `npm run preview` | Build, prepare music and serve the interactive preview |
| `npm run render` | Build, prepare music, render master and update poster |
| `npm run share` | Two-pass compact encode from the existing master |
| `npm run verify` | Probe both files, decode/compare and test native playback |
| `npm run capture` | Replace saved app captures and comparison results; see below |

Optional environment overrides: `BROWSER_EXECUTABLE` for an existing compatible
Chromium binary, `FFMPEG_PATH`, `FFPROBE_PATH`, and `PORT` for the preview server.
`CAPTURE_DIR` optionally redirects capture output to an isolated folder for rehearsal
(relative paths resolve from the repository root).
For example in PowerShell, `$env:BROWSER_EXECUTABLE = 'C:\path\to\chrome.exe'`.
Normally no overrides are necessary after `playwright install chromium`.
Linux hosts may also need `npx playwright install-deps chromium`.

## Where to edit

| Source | Responsibility |
|---|---|
| `composition.html` | All headlines, bookend branding, device frames, layout and CSS |
| `timeline.json` | Scene boundaries, capture order and per-control captions |
| `runtime.js` | Time-based crossfades, drift, comparison reveals and credit fade |
| `assets/captures/*.png` | Frozen real app screenshots, desktop and touch mobile |
| `assets/captures/metadata.json` | CSS panel bounds, viewport and DPR for focus crops |
| `assets/town.png`, `assets/platformer.png` | The two CC0 example scenes |
| `assets/palette-result.png`, `assets/onebit-solid.png` | Actual full-resolution app results used in the comparison |
| `assets/audio/wholesome-source.mp3` | Original licensed music; keep this source |
| `assets/schibsted-grotesk.ttf` | Local variable font for reproducible, network-free rendering |
| `scripts/build.mjs` | Asset mapping and focus-crop generation |
| `scripts/audio.mjs` | Excerpt, level and fades |
| `scripts/render.mjs` | 1080 render, QA frame times, master quality and poster selection |
| `scripts/encode.mjs` | Compact bitrate, two-pass settings and strict size gate |
| `scripts/capture.mjs` | Browser actions that recreate the real UI and result captures |
| `scripts/verify.mjs` | Technical validation and generated production report |
| `scripts/project.mjs` | Portable paths, tool overrides, export names and metadata credits |
| `editorial-review.json` | Copy/image decisions and rejected ambiguous claims |
| `source-manifest.json` | Baseline source/license byte counts and SHA-256 hashes |
| `baseline-manifest.json` | Historical technical evidence for the approved export, using its original filenames |
| `CREDITS.txt`, `licenses/`, `provenance.json` | Attribution, redistribution terms, source URLs and edits |

In the composition, `data-scene` is a zero-based scene index. `data-screen`,
`data-focus` and `data-caption` use that same index. `data-asset` resolves through
the map in `build.mjs`. The runtime and verifier currently assume **seven scenes,
30 seconds, 30 fps**. Changing duration/scene count requires updating the runtime,
build validation, renderer frame loop/audio duration/QA times, encoder bitrate and
verifier expectations together. Boundaries can move within the existing 30 seconds.
All sample captures in a scene receive equal time; the runtime eases between them
over 260 ms. Scene transitions take 500 ms. Do not add CSS animations whose state
depends on elapsed wall-clock time; `renderFrame(t)` must remain deterministic.

## Approved editorial direction

Professional, concise, dark neutral surfaces with Colorfetti's five confetti colors
and actual SVG brand mark (`src/assets/logo-dark.svg`). Screens are real app captures;
enlarged control crops make the edits readable. No voiceover. Music stays subtle.
Intro and conclusion use empty app states, title, approved slogan and website,
with a mirrored closing composition that uses the surrounding background space.

| Time | Headline / focus | Visible material |
|---|---|---|
| 0–3 s | Colorfetti + slogan + website | Empty desktop and phone app |
| 3–7 s | Choose a palette. | Tiny Town: Auto → ENDESGA 32 → PICO-8 |
| 7–12 s | Fine-tune your palette. | Max colors All → 16 → 8, then Cleanup On |
| 12–16 s | Explore two-color looks. | Phone/platform scene: Mono → Game Boy → Rose |
| 16–21 s | Tune the 1-bit effect. | Phone: threshold Auto → 140, pattern matrix 4 → 8 |
| 21–26 s | Compare the results. | Same town source: original / PICO-8 with 8 colors and Cleanup On / Mono + Solid |
| 26–30 s | Colorfetti + slogan + website | Empty desktop and phone; music attribution footer |

Use the exact slogan: “Throw your pixels a palette party. Recolor images and
animations.” Website: `shilo.github.io/colorfetti`.

Keep the user-approved constraints: show desktop **and** mobile; focus on palettes,
1-bit palettes, max colors, cleanup, and 1-bit settings. Do not add dedicated
importing, dropping artwork, saving, or privacy slides. “A new character” was
rejected because the image is a scene. Do not use “Torch / Bayer” as the final
comparison: it must be the actual Mono + Solid black-and-white result, labeled
“Black & white”. Bayer is appropriate in the settings demonstration only.
Cleanup can remove details; avoid claims that it always improves the image.
Compare identical crops, with identical scaling and no misleading retouching.

## Refreshing app screens

Ordinary copy/layout edits do not require recapturing. Frozen captures protect
approved visuals from later UI changes. To intentionally refresh them, first build
the current app into the isolated capture directory, **from the repository root**:

```sh
npm run build -- --outDir video/.work/app
npm --prefix video run capture
npm --prefix video run qa
```

The capture script starts a temporary static server, uses desktop 1280×720 and
touch phone 390×844 at DPR 2, closes first-visit Help, imports the tracked artwork,
and drives the real palette/style controls. It replaces the PNGs, metadata, and
comparison outputs under `assets/`. It serves the local Schibsted font instead of
relying on Google Fonts, and uses Node fetch to fulfill local browser requests.
Selectors may need updating after app UI changes; read the script before a refresh.

Capture pitfalls: blur controls and move the pointer away before screenshots to
hide tooltips. Panel rectangles are CSS pixels; multiply by recorded DPR when
cropping. The full-resolution comparison result is read from the **visible enlarged
viewer canvas**, not the smaller wall preview; closing that viewer closes the Dock
panel too. Reopen panels before subsequent actions. Avoid the Vite dev server for
capture: a built static app avoids optimizer stalls and stale CSS.

After intentionally changing assets, regenerate `source-manifest.json` using
`node scripts/source-manifest.mjs`, then rebuild, visually inspect and export. The
manifest uses canonical UTF-8/LF bytes for text to remain useful across Git line-ending
settings. It is an inventory, not a substitute for reviewing images and license terms.

## Quality checks and release

Inspect `.work/qa/frame-*.png` and the whole encoded compact video. Check for cropped
type, overlapping device frames, readable settings, clean transitions, music fades,
and the closing credit. Listen with headphones as well as speakers.

`verify` checks 1920×1080 H.264/yuv420p, 900 frames at 30 fps, AAC stereo at 48 kHz,
duration within 0.1 seconds, MP4 fast-start (`moov` before `mdat`), **strictly less
than 10,000,000 bytes**, full decoded SSIM ≥ 0.99 against master, and advancing native
Chromium playback. It extracts encoded QA frames and writes
`.work/qa/production-manifest.json`. It needs the locally generated master and
`.work/qa/render.json`; use `export` on a fresh checkout first.

The compact uses two-pass 2200 kbps H.264 and 128 kbps AAC. If duration/content changes
push it over the limit, lower video bitrate and run `share` and `verify` again.
Keep headroom under the cap. The master uses CRF 17 and is not size-constrained.
Audio takes the original track from 00:12 for 30 seconds, fades in over 0.8 seconds
and out over the last 2.5 seconds, and applies loudness normalization targeting
−23 LUFS / −3 dBTP (original measured result −23.2 LUFS / −10.2 dBTP).

For app integration changes, run `npm test` and `npm run build` from the root.
Check Help on desktop and touch mobile, in light and dark themes. Verify the link
under both `/` and `/colorfetti/`, opens a separate tab, leaves Help usable, and does
not request the MP4 before being clicked. The link should remain an ordinary
anchor: no embedded player or preload is needed in Help.

Before committing, inspect `git status` and `git diff --cached --stat`. Confirm the
only staged MP4 is `public/colorfetti-trailer.mp4`; master and `.work` must stay
ignored. Include source edits, poster, relevant docs and refreshed licenses/credits.
Do not publish/push merely to validate a local preview.

## Attribution

Music is **“Wholesome” by Kevin MacLeod (incompetech.com), CC BY 4.0**. Its
attribution is embedded in the closing frame, MP4 metadata and `CREDITS.txt`.
Retain credit in derivative exports. Recommended text for GitHub/Discord posts:

> Music: “Wholesome” by Kevin MacLeod (incompetech.com),
> [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Edited excerpt.
> Artwork: Kenney (CC0).

Artwork comes from Kenney Tiny Town 1.1 and Pixel Platformer 1.2 (CC0); the cropped
scenes and actual app conversions are tracked. Schibsted Grotesk is OFL 1.1; retain
its license when redistributing the font. Full source URLs, crop coordinates and
edits are in `provenance.json`. These third-party licenses apply independently of
the application's license.

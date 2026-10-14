# Colorfetti trailer project

Start here when an agent or editor resumes work on the trailer. This directory
contains the editable composition, deterministic animation code, actual app
captures, original artwork crops, font, licenses, and export tools. Music files
are kept locally and gitignored; their source metadata and restoration steps are tracked.
It has no dependency on `.tmp/`, a Codex conversation, a remote design mockup, or
the original creator's machine. The app and trailer have separate npm dependencies.

## Current deliverables

| File, relative to repository root | Purpose | Git |
|---|---|---|
| `public/colorfetti-trailer.mp4` | Website, GitHub and Discord; 1920×1080, 30 fps, 30 seconds, H.264/AAC; below **10,000,000 bytes** | Tracked |
| `public/colorfetti-trailer-poster.png` | Intro still linked near the top of the root README | Tracked |
| `output/colorfetti-trailer/colorfetti-trailer-1080.mp4` | 1080 master, CRF 17 video / 192 kbps audio | Ignored; regenerate locally |
| `video/.work/` | Generated HTML, enlarged control crops, mixed audio, QA stills, logs and reports | Ignored |
| `video/assets/audio/music.mp3` | Active soundtrack, copied from the supplied sibling-project file | Ignored; local only |
| `video/assets/audio/wholesome-source.mp3` | Previous soundtrack preserved as a local backup | Ignored; local only |

The compact export targets approximately 8.8 MB decimal. Its exact byte count is
recorded in `.work/qa/production-manifest.json` after verification. A fresh
render may differ with Chromium, FFmpeg, OS font rendering, or dependency changes.
`npm run verify` checks the real file size, codec, frame count, streaming layout,
decoded quality and browser playback. Only the compact MP4 belongs in Git. PNG
source assets are tracked; a fresh checkout must restore the ignored music before exporting.
No Git LFS, external asset service or API keys are needed.

The root README links to the deployed MP4 with a clickable poster; GitHub Markdown
does not provide dependable inline playback for a committed MP4. Help has a compact
“Trailer” button at the bottom left with a clapperboard icon before its label,
followed by the external-link indicator, and the
accessible label “Watch trailer (opens in a new tab)”,
that opens the same asset in a new tab. Vite
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
```

Restore `video/assets/audio/music.mp3` before `preview`, `audio`, `render`, or `export`.
On this workstation the supplied source is in the sibling `rg-backpack-planner`
repository. From the Colorfetti repository root, in PowerShell:

```powershell
Copy-Item -LiteralPath '..\rg-backpack-planner\showcase-video\public\music.mp3' -Destination 'video\assets\audio\music.mp3'
npm --prefix video run preview
```

On another machine, restore the same file from your own backup or obtain the track
from the collection linked in `assets/audio/source.json`. That record contains the
expected size and SHA-256; the particular track title is not known from the supplied
file. The current source is 734,771 bytes, SHA-256
`fb9a931aac0f786febf5b1373d8996b8080bbad6a858a88eeb42699bd4d6aa03`.
Neither soundtrack is downloaded automatically or added to the tracked manifest.
The previous `wholesome-source.mp3` remains locally in the same folder, with its
source, license and hash in tracked `archive-wholesome.json`. Restoring the previous
music requires changing the audio input and 12-second excerpt offset, and restoring
its CC BY 4.0 attribution; never silently use it as a fallback for missing new music.

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
| `npm run capture -- --desktop-only` | Refresh only the seven two-image desktop palette/settings captures |

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
| `runtime.js` | Time-based crossfades, drift and comparison reveals |
| `assets/captures/*.png` | Frozen real app screenshots, desktop and touch mobile |
| `assets/captures/metadata.json` | CSS panel bounds, viewport, DPR and captured image names for focus crops/QA |
| `assets/town.png`, `assets/platformer.png` | The two CC0 example scenes |
| `assets/palette-result.png`, `assets/onebit-solid.png` | Actual full-resolution app results used in the comparison |
| `assets/audio/music.mp3` | Active licensed music; ignored local source |
| `assets/audio/wholesome-source.mp3` | Previous music; ignored local backup |
| `assets/audio/source.json`, `assets/audio/archive-wholesome.json` | Active and archived music provenance and hashes |
| `assets/schibsted-grotesk.ttf` | Local variable font for reproducible, network-free rendering |
| `scripts/build.mjs` | Asset mapping and focus-crop generation |
| `scripts/audio.mjs` | Excerpt, level and fades |
| `scripts/render.mjs` | 1080 render, QA frame times, master quality and poster selection |
| `scripts/encode.mjs` | Compact bitrate, two-pass settings and strict size gate |
| `scripts/capture.mjs` | Browser actions that recreate the real UI and result captures |
| `scripts/verify.mjs` | Technical validation and generated production report |
| `scripts/project.mjs` | Portable paths, tool overrides, export names and MP4 metadata |
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

Phone frames use a modest 14px outer radius, 6px border and 6px inner padding at
the 1920×1080 render size. The screenshot remains rectangular and sets its own
height from its natural aspect ratio. Crossfade layers occupy that same inset
screen rectangle. Do not round or crop the screenshot, use `object-fit: cover`,
or force the outer frame to the screenshot's aspect ratio: the border and padding
would change the available screen proportions and cut off the app UI.

Intro and conclusion use empty app states, title, approved slogan, website and repository,
with a mirrored closing composition that uses the surrounding background space.

| Time | Headline / focus | Visible material |
|---|---|---|
| 0–3 s | Colorfetti + slogan + website + repository | Empty desktop and phone app |
| 3–7 s | Choose a palette. | Desktop wall with Tiny Town and Pixel Platformer together: Auto → ENDESGA 32 → PICO-8 |
| 7–12 s | Fine-tune your palette. | Same two-image desktop wall: Max colors All → 16 → 8, then Cleanup On; phone inset stays single-image |
| 12–16 s | Explore two-color looks. | Phone/platform scene: Mono → Game Boy → Rose |
| 16–21 s | Tune the 1-bit effect. | Phone: threshold Auto → 140, pattern matrix 4 → 8 |
| 21–26 s | Compare the results. | Same town source: original / PICO-8 with 8 colors and Cleanup On / Mono + Solid |
| 26–30 s | Colorfetti + slogan + website + repository | Empty desktop and phone; no music-credit footer |

Use the exact slogan: “Throw your pixels a palette party. Recolor images and
animations.” Website: `shilo.github.io/colorfetti`.
Place `github.com/Shilo/colorfetti` below it on both bookends, in smaller muted
type. The website remains the primary yellow call to action; both URLs omit the
scheme for readability and map to their HTTPS addresses.

Keep the user-approved constraints: show desktop **and** mobile; focus on palettes,
1-bit palettes, max colors, cleanup, and 1-bit settings. Do not add dedicated
importing, dropping artwork, saving, or privacy slides. “A new character” was
rejected because the image is a scene. Do not use “Torch / Bayer” as the final
comparison: it must be the actual Mono + Solid black-and-white result, labeled
“Black & white”. Bayer is appropriate in the settings demonstration only.
Cleanup can remove details; avoid claims that it always improves the image.
Compare identical crops, with identical scaling and no misleading retouching.
The desktop palette and palette-settings examples must show exactly two wall images
at once: `town.png` and `platformer.png`. Mobile examples and phone insets must
show one image only. Empty bookends remain empty, and the result comparison keeps
one identical Town crop across its three treatments.

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

Desktop feature captures import Town and Platformer together. The comparison uses
a separate single-Town context; mobile contexts import just one source. The capture
script checks each wall's image count before saving it and records image names in
metadata. To preserve frozen mobile/bookend/comparison assets while refreshing only
the desktop feature shots, use `npm --prefix video run capture -- --desktop-only`
from the root after building the capture app. This partial mode merges updated
desktop metadata with the existing tracked metadata.

Capture pitfalls: blur controls and move the pointer away before screenshots to
hide tooltips. Panel rectangles are CSS pixels; multiply by recorded DPR when
cropping. The full-resolution comparison result is read from the **visible enlarged
viewer canvas**, not the smaller wall preview; closing that viewer closes the Dock
panel too. Reopen panels before subsequent actions. Avoid the Vite dev server for
capture: a built static app avoids optimizer stalls and stale CSS.

After intentionally changing assets, regenerate `source-manifest.json` using
`node scripts/source-manifest.mjs`, then rebuild, visually inspect and export. The
manifest uses canonical UTF-8/LF bytes for text to remain useful across Git line-ending
settings and excludes ignored MP3 files. It is an inventory, not a substitute for
reviewing images and license terms.

## Quality checks and release

Inspect `.work/qa/frame-*.png` and the whole encoded compact video. Check for cropped
type, overlapping device frames, readable settings, clean transitions, music fades,
and both bookend URLs. There must be no music-credit overlay. Listen with headphones
as well as speakers.

`verify` checks 1920×1080 H.264/yuv420p, 900 frames at 30 fps, AAC stereo at 48 kHz,
duration within 0.1 seconds, MP4 fast-start (`moov` before `mdat`), **strictly less
than 10,000,000 bytes**, full decoded SSIM ≥ 0.99 against master, and advancing native
Chromium playback. It extracts encoded QA frames and writes
`.work/qa/production-manifest.json`. It needs the locally generated master and
`.work/qa/render.json`; use `export` on a fresh checkout first.

The compact uses two-pass 2200 kbps H.264 and 128 kbps AAC. If duration/content changes
push it over the limit, lower video bitrate and run `share` and `verify` again.
Keep headroom under the cap. The master uses CRF 17 and is not size-constrained.
Audio takes the first 30 seconds of the supplied 30.589-second file, fades in over 0.8 seconds
and out over the last 2.5 seconds, and applies loudness normalization targeting
−23 LUFS / −3 dBTP. The current prepared WAV measures −23.41 LUFS integrated and
−4.93 dBTP. Do not reuse the old track's measured loudness values for this track.

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

Current music comes from **Cinematic Trailer Music - Collection by Gregor Quendel**.
The creator identifies the collection as **CC BY-NC 4.0** on its itch.io page;
the supplied source project's README uses that same license. CC0 was not verified.
The bottom of the repository README carries attribution and describes the edits.
The trailer has no on-screen music credit or music attribution in its MP4 metadata.
Keep the README attribution when distributing this version. `CREDITS.txt` records
both the active source and the archived previous soundtrack's provenance.

Artwork comes from Kenney Tiny Town 1.1 and Pixel Platformer 1.2 (CC0); the cropped
scenes and actual app conversions are tracked. Schibsted Grotesk is OFL 1.1; retain
its license when redistributing the font. Full source URLs, crop coordinates and
edits are in `provenance.json`. These third-party licenses apply independently of
the application's license.

Trailer video music from **[Cinematic Trailer Music - Collection](https://gregor-quendel.itch.io/cinematic-trailer-music-collection)** by [Gregor Quendel](https://gregor-quendel.itch.io/) (CC BY-NC 4.0). Edited excerpt, with volume adjustment and fades.

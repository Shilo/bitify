# Independent UI/integration review

October 15, 2026. Reviewed final production diff from
`f08d4d3f6e3df771d17524f00f1bba2e492c4ec0`, with current production unchanged since
`310df63`. This review is independent of the candidate-kernel and service reviewers.

## Scope and result

Read the complete changed UI paths in App, Dock, Tile, ImageViewer, PaletteImport,
PalettePreview and their changed CSS, plus palette usage, Lospec routing/fetching,
paint actions and the relevant snapshots. No actionable production defect was
identified in this pass. This is bounded evidence, not a claim of zero possible
bugs or exhaustive mobile performance coverage.

The changed fields are consistently carried into captured export and preview
requests. The image-viewer Tile receives dither/strength/alpha mode. Count uses
full export conversion, filters obsolete source/settings ownership before
publication, and rechecks ownership after closing a sheet before opening a draft.
Count/Use do not infer colors from a scaled canvas or reserved palette entries.
Source/settings edits retire stale usage records. Count remains explicit work.

The new dither-strength range owns its palette/method context, rejects detached
events and cancels its paused commit when closing/switching. Reset restores its
remembered default and returns keyboard focus to an enabled control. The opacity
cut gesture rejects detached/Keep-mode input. Current fitting is intentionally
unweighted, so Keep and Cut1 may share preparation; their quantized preview/cache
identities include actual opacity mode. Reopening rejected weighting experiments
would require new identity threading and is not implied by this audit.

Lospec UI routing now handles scheme-less canonical links without interpreting
multiline local palette text containing URL comments as a remote request. The
fetch destination is canonical fixed-origin; credentials/referrer omitted,
redirects rejected, input bounded, timeout/cancel retained. Import replacement is
published only for the current job/dialog/text. Canceling a still-loading optional
Lospec module retires ownership immediately; stale completion cannot publish.
Provenance links are canonicalized and text escaped. Color paint actions validate
all entries before resetting canvases and never feed UI canvas values into output.

## Actual built-app responsive touch walkthrough

`responsive-app-check.mjs` launches a separate Chromium with **its sandbox enabled**.
It exercises the built app at `http://127.0.0.1:5328/colorfetti/` in isolated
320×568 portrait and 568×320 landscape contexts with touch/mobile emulation.
It does not connect to Android, CDP phone surfaces or user tabs.

Both layouts completed these tasks using actual UI controls:

1. Dismiss welcome; open Add images file picker; import the owned 24×24 knight.
2. Open the palette rail; choose PICO-8; close the rail; open Recolor.
3. Commit maximum eight colors; choose 4×4 dithering; adjust Dither strength by
   touch (both settled at 51%, with matching spoken value).
4. Open Image actions, Count eight actual output colors, then Use those colors.
5. Reach Image or file, Paste colors and Add colors in the shared draft.
6. Import local HEX text into the draft; verify three swatches; close unsaved.
7. Save a native PNG through the real image action.
8. Open image Preview; Use the same counted colors; close its draft; verify the
   Preview remains operable; Save again from Preview; close Preview.

Independent Sharp decoding confirms both native downloads are 24×24, source alpha
is exact, all used colors belong to PICO-8, and the actual eight used RGB entries
equal both Count and the reused editor draft. Preview Save is byte-identical to
Image-actions Save; both orientations are byte-identical, SHA256
`661017650cae13ddd2ff64e96b7d94359a65028bd7b5b40629b12a403e145975`.
Build index SHA256 is
`67b5a088de09d901f63badcb14a4f7ba41e4e8c4b78ddc8b9b8767d8128dd82f`.
No page errors or horizontal document overflow were recorded.

Controls require scrolling in short landscape, especially the editor. The fixed
editor header/Close and footer remain reachable. Narrow dither segments are about
42 pixels wide but 44 high; the existing compact row is operable in this bounded
touch test. It is not evidence that all targets meet a 44×44 recommendation, and
does not by itself justify adding a second mobile row or changing accepted layout.

Receipts: `responsive-app-results.json`; screenshots have `touch-portrait-` and
`touch-landscape-` prefixes. Generated PNGs are actual native downloads, not canvas
re-encodings or research-module approximations.

## Cross-challenge and design outcome

The kernel reviewer correctly challenged two proposed color-protection policies:
already forced source pixels should not compete for residual palette slots, and
fully ineligible source mappings need an explicit inactive-slot policy. The latter
remains an approval-blocking design decision. The root reviewer correctly rejected
an exact-four-color budget implication; the mockup now says reserved slots and
**up to** a maximum rather than promising used-color count. Reserving availability
cannot promise a muted eye becomes red; the recommended source-to-target workflow
is explicit about exact RGB scope and bypassing later dither/Cleanup for mapped
pixels. No algorithm or feature is implemented by this design.

The service output-quality differences remain meaningful observations, not a reason
to require universal numerical superiority or clone every control. A service can
preserve a desired hue while changing exact source colors; our exact-color path can
be preferable while losing a small hue under a tight cap. Existing studies reject
automatic rules with visible losses. The correct comparison checks native output,
target membership, alpha, stability and useful detail separately. Service network
latency is not comparable with a local matching-kernel timing.

The service reviewer independently confirmed fresh website outputs preserving
blue eyes and red cloth in the two-frame knight at eight colors, while local
output favors metal/wood shading. The fixed ENDESGA-8 comparison also showed more
coherent service skin colors where local nearest matching fragments between
yellow/orange/red targets. That is a reason to retain the quality gap, not to
promise a one-HEX mapping solves material-level hue ramps. The design explicitly
maps exact colors only; semantic regions/material ramps remain out of scope.

No new physical Android, Safari, Mac/iOS, OS clipboard, assistive-technology study,
human usability observation or sustained thermal/memory test is claimed. The user
explicitly disconnected the phone for this pass. Color-protection implementation
stays deferred pending mockup review and a clear useful contract.

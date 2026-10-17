# Android caption-spacing acceptance

Run: `node bench/caption-spacing-2026-10-16/android/qa.mjs`.
Target: staged caption-text fix based on `730fbb0`, isolated build port 5340.
Fixture: parent directory's owned 64×64 two-color `spacing-source.png`.

Four checks passed without page errors: one-image and 12-image walls, each in
native portrait and real Android OS landscape. All DOM captions were exactly
`64×64 · 2 colors`. DOM Range geometry measured approximately 2.9 CSS pixels
between the height and middle dot and another 2.9 pixels after the dot. The
dimension multiplication sign retained positive 1px margins on each side in
these mobile layouts. Captions remained nowrap and within the viewport; the
document did not overflow horizontally.

The 12-image short-landscape wall retained its existing intentional ellipsis
behavior: 86px is available for a 95px metadata string. The full literal string
remains in the DOM; it does not wrap or escape the caption. Single-image
portrait/landscape and the 12-image portrait case showed the entire metadata.
This spacing fix does not redesign narrow caption truncation.

`results.json` contains geometry for every tile. The four PNGs are full native
Android screenshots, not viewport emulation. This checks OS display rotation,
not a human physically rotating the phone or accelerometer behavior.

At completion (**2026-10-17 02:36:56 UTC**) the owned tab was closed and original
origin storage and rotation policy were restored exactly: `free`,
`accelerometer_rotation=1`, `user_rotation=0`. Existing tabs, forwards and device
preferences were preserved. No performance reruns or production edits occurred.

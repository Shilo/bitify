# Stable output-count captions — October 16, 2026

Baseline: `3df3a4a` runtime, served by the identical pre-fix four-file swatch build
on port 5343. Fixed production build: port 5344. All fixtures are owned generated
blocks or retained CC0 sprites, sheets and animation from the practical study.

- `check.mjs URL before|after`: record caption DOM changes through number edits,
  Matching, Cleanup, Dithering and a range sweep from 64 to 44. The settings are
  asserted to have actually committed. Before: nine empty transitions. After:
  zero. The fixed native PNG is independently decoded and equals the two-color
  source byte for byte. Close the open settings panel before Save; its existing
  outside-press behavior otherwise consumes that first press in both builds.
- `ANDROID=1 node check.mjs http://localhost:5344/ android`: same checks on the
  real 448×819 Pixel 8 Pro viewport, without emulation or browser-setting changes.
  Native Android exports are not claimed by this script. One owned tab and only
  its test-origin storage are used/restored; never close the attached browser.
  In PowerShell, set `$env:ANDROID='1'` before the command and remove it afterward.
  Requires unlocked Brave, CDP forwarding on 9333 and `adb reverse tcp:5344 tcp:5344`.
- `regressions.mjs`: four-color caps 2/3/4, 1-bit round trip, transparent Cut 0 →
  Keep 4 → Cut 0, and six-frame GIF 12 → 2. All transitions stay nonempty; native
  PNG/GIF visible RGB unions agree with the captions. The broader desktop cases
  pass. The additional Android run could not reconnect after the phone locked;
  it did not execute those cases and is not an app failure.
- `inspection-race.mjs`: a rejected first candidate cloned a pending inspection
  when sampled preview finished. The retained failure proves Reuse did not open.
  The corrected candidate leaves pending ownership intact and opens the actual
  updated 25-color draft. Independent `pending-review.mjs` also verifies sampled
  previews without inspection retire previous counts.
- `save-dismiss-review.mjs`: independent before/after check of the existing
  outside-settings dismissal rule; subsequent native PNGs are byte-identical.

Actual Codex Browser used native file choice, number/settings edits and real
pointer range drags 44 → 18 → 60, retaining `2 colors`. Its native saved PNG also
matches the source's decoded RGB and alpha exactly. `codex-after.png` records the
final view. Automated mutation evidence is from sandbox-enabled Edge and native
Android, rather than claiming screenshots alone prove a lack of flicker.

No extra pixel scans, full-source wall inspections, image caches or timers were
added. Retained presentation is one bounded RGB/count result. Current-key Reuse
data remains separate; pending display is identified by aria-busy and its tooltip.
Full suite: 982 passed / 2 skipped; production build passed. Independent review
and its initially reproduced candidate issue are retained in `review.md`.

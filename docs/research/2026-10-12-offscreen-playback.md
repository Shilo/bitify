# Offscreen animation suspension

## Finding and agreed change

The previous wall stress audit found that offscreen GIF tiles continued advancing,
palette matching, colorizing and uploading canvases. The shared 8 MiB index cache
reduces repeated matching for admitted clips, but does not eliminate colorization
or canvas uploads. A scrollable wall can therefore spend CPU on animation frames
that are never displayed.

The parent review challenged a per-tile observer design. The agreed implementation
uses one shared IntersectionObserver only for animated art surfaces. Stills do not
register. Visible area must be positive; touching the viewport edge alone does
not keep an animation running. Where the browser cannot construct an observer,
playback retains its existing behavior.

A further self-review caught an observer boundary trap: at an edge,
`isIntersecting` may already be true while the ratio is zero. A threshold of zero
alone need not report the transition to positive area. Thresholds of zero and
`Number.EPSILON` request that transition, avoiding a stuck paused tile on entry.

## Playback and resource rules

- The initial frame may render before the browser's first visibility measurement,
  avoiding a blank visible tile while waiting for observation.
- Offscreen timers pause in both families and Original comparison. The frame
  index, completed canvas and existing caches remain. Returning to view resumes
  the held frame with its normal source delay; there is no hidden-time catch-up.
- Subsequent full-palette animated preview jobs pause offscreen and cancel any
  obsolete in-flight job. Returning converts the held frame with current settings
  before converted playback resumes. Relevant cache identities remain unchanged.
- Visibility does not gate Auto generation, Max colors subset selection or
  guarded Cleanup. These preparations operate on the complete source/animation.
- Opening Preview still pauses wall tiles through their existing `active` prop.
  The enlarged tile has independent visibility and playback. No export path uses
  the wall timer; source frames, GIF delays and loop metadata remain unchanged.
- Removing an animation unobserves its node and drops the callback. The last
  removal disconnects the singleton observer. Late callbacks from disconnected
  observers and removed nodes cannot update destroyed tiles.

This changes scheduling, not matching or exported pixels. It does not lower source
RGBA/legacy analysis memory, evict cached frames, defer whole-source preparations
or solve GIF decoding/import long tasks. Legacy setting changes may still convert
an offscreen frame once, but no recurring animation loop remains there.

## Verification

Seven focused observer tests cover immediate visibility, shared dispatch,
edge-touch exclusion, unsupported/failed observers, last-consumer cleanup,
late callbacks and animation/still action updates. Built-app wall scrolling,
Original comparison, enlarged Preview, settings changes while offscreen and
physical-phone performance are checked by the parent integration audit; its final
measurements should be read separately from these lifecycle tests.

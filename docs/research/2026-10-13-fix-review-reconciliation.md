# Committed-fix review reconciliation

Baseline: `707f732`. Claude's review of `3ce4e14..707f732` accepted the first
batch after independent desktop build, tests and adversarial preview checks.
The Codex reviewer independently read the review and challenged its proposals.
This record distinguishes accepted repairs from the next measured batch.

## R-1: brief mouse departures

Supported. Immediate cancellation on every leave needlessly restarted an in-flight
hover export when the same request returned before it finished. Running preparation
now receives the existing 180 ms hover delay before departure abort. Queued work
still stops immediately. A new item, invalidated settings, explicit cancellation
and destruction still abort immediately. A captured operation identity prevents
an old timer from aborting another job. Active native drag and URL grace are unchanged.

Completion while the pointer is away still discards its result, as in the baseline.
Returning after completion can therefore start a new preparation; this repair is
specifically for returning while the same request remains in flight. We rejected
retaining extra departure results or adding another export cache.

Targeted tests cover jitter, sustained departure, queued cancellation, result
completion while away, late/replacement results and immediate invalidation.
Codex accepted the actual diff. Full suite: 702 passed, two known GC skips;
production build passed, entry gzip 87.42 kB. Worker/algorithm paths are unchanged.
The behavior is desktop-only; no new phone benchmark was needed for R-1.
Claude's original real-timer reproduction also passes with the changed module:
staying and leaving for 10 ms both start one preparation and reach ready; a permanent
departure starts one preparation, aborts it and remains not ready.

## N-1: tracked preview-reuse coverage

Supported. The earlier ignored diagnostics are useful evidence, but are not a
maintained regression check. A focused production-browser harness is preferable
to adding an unrun assertion to the older palette matrix, whose Auto/editor
expectations have become stale. A zero MessageChannel count is a witness of no
cooperative conversion in an isolated still/fixed-palette scenario, not a universal
quantizer counter. The check must also confirm changed settings produce fresh,
correct pixels, rather than merely testing unchanged reuse.

Tracked check: build normally, run
`node bench/palette-preview-reuse-server.mjs dist 5281`, open `/qa` in a foreground
desktop browser and press Run checks. One run per page load, then reload to repeat.
Only local test-origin preferences, canvas-paint counters, MessageChannel counters
and error traps are injected into HTML; production assets are unchanged.

Native Codex browser passed six imported 32×32 stills: unchanged Original return
has six paints and zero posted tasks; viewer close has zero paints/tasks; palette
change under Space-held Original preserves source pixels until release, then every
image changes and matches an independently fresh PICO-8 iframe byte for byte.
The subsequent unchanged return reuses those updated pixels. App, fresh-oracle
and QA-page runtime error traps recorded zero errors. Codex accepted the bounded
source/oracle design; this is not animation, resize or speed measurement coverage.

The automation console recorded an unattributed MutationObserver error during
synthetic iframe lifecycle checks, outside all three runtime traps. We bounded
the harness to one run and retained both test frames until closure, without
inferring a production repair from that log. A separate standalone Codex production
tab loaded all six supplied buildings and exercised Original/viewer/palette changes
with no console warnings or errors. Screenshot evidence is under
`.tmp/performance-fixes/reuse-qa-pass.jpg` and `standalone-buildings-after-jitter.jpg`.

## F3: failed subset or cleanup recovery

We agree on the user-facing contract: retain the last same-item preview, persistent
guidance, explicit retry, and disable Save/Copy for an affected current failure.
Save-all is blocked if any current exported item is affected. A valid item need not
be disabled because another item failed. Palette failures do not block 1-bit exports.
This decision does not require another user preference question.

We reject one unscoped global failure boolean and clearing it on every wall change:
adding an unrelated image does not rerun the failed existing limiter. Likewise,
Cleanup changes must not hide an unchanged limiter failure. One successful item
must not clear another item's failed job.

The next implementation should own failure by item/source, stage, immutable stage
inputs and request attempt. Aborted/stale callbacks cannot update current state.
Explicit same-value palette/number selection must trigger retry even when a scalar
binding is unchanged. Preserve the same-input failure through the retry until
success. Wall/viewer subscriptions must not clear each other's valid failures.
Cover buttons, keyboard, share and drag entrypoints. Already-running exports retain
their captured signatures; unrelated/newer preview failures must not cancel them.
Only failure of an export's own preparation can reject its output.

Before implementation, Claude and Codex should agree on the smallest ownership
model satisfying these cases. No client, worker or cache redesign is justified.
Required tests include two failures with one recovered, unrelated wall additions,
stale callbacks, abort, same-value retry and an old captured export surviving a
newer preview failure. F3 is not implemented in this reconciliation batch.

## F9 / CXS-01: next physical-device measurement

Phone access is free: prior task test tabs/servers/mappings were closed. Coordinate
with the parent before another ADB run. Measure Dungeon GIF Save and the real
23-file ZIP in 1-bit mode: total time and longest task are separate results.
Attribute eager source reanalysis, eager mask generation, encoding and final zipSync
separately. A between-file posted yield is the smallest candidate. Incremental GIF
encoding alone will not remove eager whole-clip mask generation upstream.

Retain captured analysis/settings, encoder call ordering, delays, loop, None and
transparency. Verify bytes where compatible and independently decode all output.
Keep CXS-02 live analysis separate and last; measure a brightness-source-changing
style step on the real wall before designing that repair.

## N-2 / N-3: optional GIF-import work

Header classification can avoid the discarded single-frame worker LZW pass. The
cited main-thread decode measurements are not the eliminated worker pass cost.
Measure that actual phase before claiming a gain; reuse the parsed reader for
animated decoding rather than adding a second header parse to every animation.
Preserve native single-frame pixels and recovery semantics.

The existing ≤4096-pixel cooperative analysis route may also help tiny single GIFs
after native decoding inside the same serial job. No phone benefit is established.
Both optimizations stay optional until measured; they are not necessary to accept
the stable worker repair already reviewed by all three parties.

## Coverage limits

No claim of universally smooth imports, bounded whole-app memory or Safari/iOS
coverage. Existing native/large import long tasks remain. Real hidden-tab and
no-worker-browser coverage remain open. Original Claude diagnostic harnesses and
unrelated branding work are preserved untracked.

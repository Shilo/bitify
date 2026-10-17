# Android theme and practical acceptance

Authorized Pixel 8 Pro / Brave 155, genuine device viewport and native `adb screencap`. No browser flags, OS theme or rotation preferences were changed. Owned tabs, origin storage snapshots and uniquely named Downloads were restored/removed. The read-only flag screenshot establishes that this device explicitly enables browser-forced darkening; the full Light interface is still overridden.

- `theme.mjs` / `results.json`: initial native appearance and controlled per-tab media/auto-dark comparison. Scoped overrides are destroyed with their tab.
- `guard.mjs` / `guard-results.json`: rejected root dark-scheme workaround; it did not improve native Light colors.
- `onebit-flags.mjs`: actual 1-bit surfaces and read-only Brave flag value.
- `onebit-fixed.mjs light` and `dark`: reviewed 1-bit pair/solid canvas candidate on 5343. Native screenshot probes for all twelve presets plus actual Android picker Blue/Set, None restoration and Swap. The first selectors/touch-timing attempts are harness diagnostics; final theme-specific receipts are authoritative.
- `onebit-exports.mjs`: native PNG/GIF downloads from baseline 5342 and UI-only candidate 5343, independently decoded and checked against scalar 1-bit threshold/alpha calculations; exact byte comparisons included.
- `workloads.mjs KIND`: run **one kind per process** against final committed `62dc29c` on 5342, with shared licensed fixtures/oracles from `../practical-workloads-2026-10-16/`. Final `workloads/receipt-KIND.json` and `workloads/KIND/results.json` are authoritative. Old `workloads/receipt.json` is explicitly superseded; early repeated init scripts inflated paint counters and extra observers, without affecting native export byte accuracy. The shared instrumentation now guards against duplicate setup. The initial batch assertion also ignored an intentionally paused offscreen GIF; final visibility evidence scrolls it into view before asserting progression.
- `auto.mjs`: bounded large-sheet Auto supplement. First attempt's unconditional post-rail-close paint requirement was invalid on unchanged phone canvas dimensions; its retained failure does not identify a product bug. The corrected helper distinguishes editable Auto publication from optional resize repaint and independently checks native output against the published palette.

Example: `$env:QA_COMMIT='62dc29c'; node bench/android-theme-practical-2026-10-16/workloads.mjs sheet2048` (requires approved USB ADB access, existing CDP forward 9333, and isolated build on 5342). ADB location and serial are explicit in the scripts. Never close the attached browser, only owned tabs.

CPU metrics are renderer-main-thread observations; worker CPU is excluded. Timings include described UI/await windows, not pure converter latency or universal performance guarantees. See the theme diagnosis and practical workload reports for decisions and limits.

# Keep opacity real-art acceptance: metrics (unblinded)

Date: October 15, 2026. Metric-analyst pass; this is not a visual judgment. Inputs: the frozen cohort
`bench/keep-real-art-study/cohort/manifest.json` (4525906/f49000d) and
`bench/keep-real-art-study/results/results.json` (36 units, 576 cases, 0 control
failures). Reproduce with `node bench/keep-real-art-study/analysis/metrics.mjs`.
All per-case deltas (per region × background, Oklab and linear) are in
`analysis/metrics.json`. Blind judge sheets were selected first (see the end).

## Materiality (fixed before any delta was computed)

- Region verdicts use composited Oklab RMSE (dE_ok) per source-alpha region
  (opaque/strong/soft/faint) on each of black/white/checker/colored. A change is
  material when |policy − none| ≥ 0.01 on a background (about half an Oklab JND,
  averaged over the whole region). Regions with < 16 source pixels are reported but
  do not vote.
- Strict case verdict: **worse** if any region on any background is ≥ +0.01, or if a
  salient source cluster (≥ 1% of visible alpha mass) becomes lost (nearest output
  > 0.08 dE_ok) when none kept it. **Better** is the symmetric case. If both apply the
  case is **mixed**, which counts as a regression. The `all` region never decides a
  verdict, so an aggregate gain cannot hide a soft-region loss.
- Linear-light RMSE (×255) is reported alongside, with a secondary threshold of 2.0.
- Spill screen: the opaque+strong group (pixel-weighted RMS, averaged over backgrounds)
  improves by ≥ 0.02 and by ≥ 25% against none, in a unit with ≥ 25% soft+faint pixels.

Post-hoc caveat, found after the primary run and not used to change any verdict: at
caps 3–4, almost any palette change swaps which salient clusters are lost, so the strict
rule labels most changed cases "mixed". The tables therefore add two sensitivity views:
one using regions only, and one that ignores faint votes but counts a net lost-share
change of ≥ 1%.

## Rollups (cases; "identical" means output bytes equal none)

| Policy | Group | n | identical | better | tie | worse | mixed | regions-only B/T/W/M | no-faint + net-cluster B/T/W/M |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| linear | real units | 420 | 184 | 40 | 289 | 8 | 83 | 56/313/13/38 | 89/295/5/31 |
| linear | real walls | 60 | 6 | 9 | 29 | 2 | 20 | 16/34/4/6 | 22/32/2/4 |
| linear | synthetic units | 84 | 63 | 2 | 74 | 5 | 3 | 0/81/1/2 | 5/74/5/0 |
| linear | synthetic walls | 12 | 0 | 0 | 11 | 1 | 0 | 0/12/0/0 | 0/11/1/0 |
| squared | real units | 420 | 142 | 31 | 239 | 32 | 118 | 39/266/36/79 | 84/252/20/64 |
| squared | real walls | 60 | 6 | 5 | 24 | 6 | 25 | 8/28/7/17 | 17/27/6/10 |
| squared | synthetic units | 84 | 60 | 2 | 73 | 3 | 6 | 0/80/1/3 | 4/73/6/1 |
| squared | synthetic walls | 12 | 0 | 0 | 8 | 4 | 0 | 0/12/0/0 | 0/8/4/0 |

Region drivers in real art (number of cases with a material region on some background):

| Policy | worse: opaque / strong / soft / faint / cluster lost | better: opaque / strong / soft / faint / cluster kept |
|---|---|---|
| linear | 0 / 5 / 18 / 54 / 88 | 39 / 91 / 8 / 2 / 124 |
| squared | 0 / 8 / 54 / 124 / 136 | 53 / 115 / 5 / 3 / 146 |

Neither policy changes the output color count of any per-unit case, because both fill
the cap. On walls, three cases change by +1. Cut128 is only a reference and discards
translucency: its real-unit mean soft-region delta is +0.103 and its all-region delta
is +0.062, so it is not a substitute.

## Category × setting family, primary verdict B/T/W/M [identical]

Linear:

| Category | auto-capped | auto-all | fixed-preset | auto-dither | wall |
|---|---|---|---|---|---|
| glow | 7/7/2/8 [0] | 0/4/0/0 [0] | 4/15/1/4 [7] | 1/0/0/3 [0] | 3/2/0/3 [0] |
| shadow | 0/24/0/0 [18] | 0/4/0/0 [3] | 0/23/0/1 [23] | 0/4/0/0 [4] | 0/7/1/0 [4] |
| antialiased | 0/22/0/8 [18] | 0/5/0/0 [3] | 0/26/1/3 [26] | 0/3/0/2 [3] | 0/5/0/5 [0] |
| fade | 4/7/0/7 [0] | 0/3/0/0 [0] | 4/9/0/5 [8] | 0/1/0/2 [0] | 1/2/0/3 [0] |
| effect | 5/15/0/10 [0] | 0/5/0/0 [0] | 4/23/0/3 [19] | 0/2/0/3 [0] | 1/5/0/4 [0] |
| all-soft | 3/16/1/10 [3] | 0/5/0/0 [1] | 1/25/1/3 [22] | 0/2/0/3 [0] | 2/4/0/4 [0] |
| animation | 3/16/1/4 [8] | 0/4/0/0 [1] | 3/17/1/3 [15] | 1/2/0/1 [2] | 2/4/1/1 [2] |
| synthetic | 2/29/2/3 [22] | 0/6/0/0 [4] | 0/34/2/0 [33] | 0/5/1/0 [4] | 0/11/1/0 [0] |

Squared:

| Category | auto-capped | auto-all | fixed-preset | auto-dither | wall |
|---|---|---|---|---|---|
| glow | 5/3/5/11 [0] | 0/4/0/0 [0] | 3/14/1/6 [2] | 1/0/0/3 [0] | 2/1/1/4 [0] |
| shadow | 0/21/2/1 [14] | 0/4/0/0 [3] | 0/21/1/2 [19] | 0/3/1/0 [3] | 0/6/2/0 [4] |
| antialiased | 0/16/5/9 [14] | 0/5/0/0 [3] | 0/22/0/8 [21] | 0/2/1/2 [2] | 0/4/1/5 [0] |
| fade | 1/5/2/10 [0] | 0/3/0/0 [0] | 4/6/0/8 [5] | 0/1/0/2 [0] | 0/2/0/4 [0] |
| effect | 1/11/4/14 [0] | 0/5/0/0 [0] | 4/21/1/4 [16] | 0/1/1/3 [0] | 1/3/2/4 [0] |
| all-soft | 0/12/3/15 [1] | 0/5/0/0 [1] | 3/20/2/5 [14] | 0/1/1/3 [0] | 0/4/0/6 [0] |
| animation | 5/12/1/6 [8] | 0/4/0/0 [1] | 3/15/1/5 [13] | 1/2/0/1 [2] | 2/4/0/2 [2] |
| synthetic | 2/28/1/5 [21] | 0/6/0/0 [4] | 0/34/2/0 [31] | 0/5/0/1 [4] | 0/8/4/0 [0] |

Per real unit, the number of cases with a non-faint material regression or improvement:

| Unit | linear worse (max) | linear better (best) | squared worse (max) | squared better (best) |
|---|---|---|---|---|
| aa-tango-face-smile | 9 (+0.086) | 4 (−0.020) | 11 (+0.101) | 5 (−0.033) |
| aa-tango-system-search | 5 (+0.042) | 6 (−0.021) | 13 (+0.059) | 8 (−0.024) |
| aa-magic-orbs-sheet | 1, wall (+0.147) | 0 | 5 (+0.144) | 0 |
| shadow-glass-orb | 1 (+0.017) | 0 | 7 (+0.038) | 0 |
| shadow-tree-topdown | 0 | 0 | 1 (+0.119) | 1 (−0.016) |
| fx-energy-star | 2 (+0.027) | 10 (−0.049) | 4 (+0.029) | 10 (−0.048) |
| fade-trail-streak | 1 (+0.035) | 11 (−0.067) | 0 | 13 (−0.087) |
| fx-black-smoke / anim-kenney-explosion | 1 / 1 (≤ +0.014) | 5 / 8 | 0 / 5 (+0.015) | 5 / 11 |
| fx-teleporter-burst / anim-para-fire / fade-island-shore / glow-orb-red | 0 | 8 / 0 / 0 / 4 | 5 / 2 / 1 / 1 (≤ +0.039) | 9 / 1 / 0 / 5 |
| glow-lens-flare, soft-magic-ring, fade-radial-light, soft-smoke-puff, soft-bubble, glow-light-64, glow-flash-yellow, anim-rubberduck-magic, fx-green-magic-32 | 0 | 2–11 each (to −0.122) | 0 | 2–13 each (to −0.141) |
| shadow-cloud-cast, shadow-lpc-character, aa-twemoji-fire/ghost, fx-sparks-64, soft-cloud, soft-air-bubbles, anim-tango-spinner | 0 | 0 | 0 | 0 |

## Top 10 real-art regressions, linear (by worst region × background Oklab delta)

| Case | Sheet (sheet-NNNN) | Regions (worst bg) | Mean Δ opaque/strong/soft/faint/all | Clusters |
|---|---|---|---|---|
| aa-magic-orbs-sheet @ wall-auto-c4-oklab | 0319.png | strong +0.147 black; soft +0.097 black; faint +0.046 black | +0.000 / +0.078 / +0.034 / +0.012 / +0.001 | lost #000000 14%; kept 2 |
| aa-tango-face-smile @ wall-auto-c4-oklab | 0317.png | strong +0.020 white; soft +0.086 black; faint +0.051 black | -0.007 / +0.019 / +0.037 / +0.014 / +0.001 | lost #e6840d 15%, #000000 3%, #6b4d26 4%, #7d521b 2%; kept 8 |
| aa-tango-face-smile @ auto-c3-oklab | 0072.png | soft +0.069 black; faint +0.034 black (better opaque -0.020; better strong -0.020) | -0.020 / -0.016 / +0.034 / +0.010 / -0.014 | lost #000000 3%, #886231 3%, #a2753b 4%; kept 5 |
| aa-tango-system-search @ auto-c4-oklab | 0084.png | soft +0.042 black; faint +0.062 black (better opaque -0.021) | -0.021 / +0.001 / +0.014 / +0.018 / -0.003 | lost #474747 3%, #000000 2%, #555555 1%; kept 5 |
| aa-tango-system-search @ auto-c4-oklab-dither4x4 | 0096.png | soft +0.041 black; faint +0.062 black (better opaque -0.019) | -0.019 / +0.005 / +0.015 / +0.018 / -0.001 | lost #474747 3%, #000000 2%, #555555 1%; kept 5 |
| aa-tango-system-search @ auto-c3-oklab | 0083.png | soft +0.022 black; faint +0.060 black (better strong -0.014; better soft -0.010) | +0.000 / -0.013 / -0.002 / +0.018 / -0.004 | lost #000000 2% |
| aa-tango-system-search @ pico8-c4-rgb | 0095.png | faint +0.055 black | +0.000 / -0.005 / -0.001 / +0.017 / -0.001 | lost #000000 2% |
| fx-black-smoke @ auto-c3-oklab | 0185.png | faint +0.049 black (better opaque -0.014; better strong -0.017) | -0.014 / -0.016 / +0.000 / +0.014 / -0.008 |  |
| fx-black-smoke @ auto-c4-rgb | 0187.png | faint +0.049 black (better opaque -0.013) | -0.013 / -0.000 / -0.002 / +0.014 / -0.005 |  |
| aa-tango-face-smile @ auto-c4-rgb | 0074.png | soft +0.044 black; faint +0.020 black | -0.003 / -0.008 / +0.026 / +0.007 / -0.001 | lost #6b4d26 4%, #14120c 2%, #7d521b 2%; kept 7 |

## Top 10 real-art improvements, linear

| Case | Sheet (sheet-NNNN) | Regions (worst bg) | Mean Δ opaque/strong/soft/faint/all | Clusters |
|---|---|---|---|---|
| glow-lens-flare @ auto-c3-oklab | 0042.png | strong -0.122 black | -0.221 / -0.118 / +0.002 / +0.002 / -0.012 | lost #0f0f0f 7%, #3a3a3a 11%, #070707 4%, #797979 5%, #898989 2%; kept 5 |
| soft-magic-ring @ auto-c3-oklab | 0211.png | strong -0.115 black | — / -0.113 / +0.000 / +0.000 / -0.011 | lost #020202 2%, #8b8b8b 3%, #9a9a9a 2%, #7e7e7e 1%; kept 4 |
| glow-lens-flare @ wall-auto-c4-oklab | 0306.png | strong -0.072 black | -0.147 / -0.070 / -0.002 / +0.001 / -0.008 | lost #070707 4%, #898989 2%, #a1a1a1 2%; kept 5 |
| fade-trail-streak @ auto-c3-oklab | 0125.png | strong -0.067 black | — / -0.066 / -0.002 / +0.002 / -0.008 | lost #020202 8%, #282828 10%, #393939 7%, #acacac 6%, #8b8b8b 4%, #9e9e9e 2%; kept 6 |
| glow-lens-flare @ auto-c4-oklab | 0043.png | strong -0.055 black | -0.118 / -0.054 / -0.003 / +0.001 / -0.006 | lost #070707 4%, #898989 2%, #a1a1a1 2%; kept 4 |
| soft-magic-ring @ auto-c4-oklab | 0212.png | strong -0.055 colored | — / -0.054 / -0.005 / +0.002 / -0.005 | lost #020202 2%, #b0b0b0 3%; kept 4 |
| fade-trail-streak @ auto-c4-oklab | 0126.png | strong -0.052 white | — / -0.052 / -0.007 / +0.002 / -0.007 | lost #020202 8%, #c4c4c4 5%; kept 4 |
| soft-magic-ring @ auto-c4-oklab-dither4x4 | 0222.png | strong -0.051 white | — / -0.051 / -0.006 / +0.001 / -0.006 | lost #020202 2%, #b0b0b0 3%; kept 4 |
| anim:anim-rubberduck-magic @ auto-c4-oklab-dither4x4 | 0284.png | opaque -0.050 black; strong -0.016 checker | -0.050 / -0.016 / -0.003 / +0.002 / -0.014 | kept 1 |
| fx-energy-star @ pico8-c4-rgb | 0183.png | soft -0.049 black (worse strong +0.027; worse faint +0.012) | -0.004 / +0.024 / -0.012 / +0.007 / -0.001 | kept 2 |

## Top 10 real-art regressions, squared

| Case | Sheet (sheet-NNNN) | Regions (worst bg) | Mean Δ opaque/strong/soft/faint/all | Clusters |
|---|---|---|---|---|
| aa-magic-orbs-sheet @ wall-auto-c4-oklab | 0319.png | strong +0.144 black; soft +0.095 black; faint +0.045 black | +0.000 / +0.076 / +0.033 / +0.012 / +0.001 | lost #000000 14%; kept 2 |
| aa-magic-orbs-sheet @ auto-c3-oklab | 0097.png | strong +0.121 black; soft +0.080 black; faint +0.038 black | -0.007 / +0.061 / +0.027 / +0.010 / -0.006 | lost #000000 14% |
| shadow-tree-topdown @ auto-c4-rgb | 0055.png | strong +0.119 black; soft +0.082 black; faint +0.037 black (better opaque -0.016) | -0.016 / +0.050 / +0.027 / +0.010 / +0.004 | lost #000000 36%; kept 1 |
| aa-magic-orbs-sheet @ auto-c4-oklab | 0098.png | strong +0.107 black; soft +0.071 black; faint +0.033 black | -0.001 / +0.050 / +0.022 / +0.009 / -0.001 | lost #000000 14% |
| aa-magic-orbs-sheet @ auto-c4-oklab-dither4x4 | 0101.png | strong +0.107 black; soft +0.071 black; faint +0.033 black | +0.004 / +0.050 / +0.022 / +0.009 / +0.004 | lost #000000 14% |
| aa-tango-face-smile @ wall-auto-c4-oklab | 0317.png | strong +0.013 checker; soft +0.101 black; faint +0.056 black | -0.007 / +0.012 / +0.048 / +0.016 / +0.001 | lost #000000 3%, #6b4d26 4%, #7d521b 2%; kept 8 |
| aa-tango-face-smile @ pico8-c4-oklab | 0081.png | soft +0.083 black; faint +0.050 black (better strong -0.018) | -0.003 / -0.014 / +0.037 / +0.014 / -0.002 | lost #000000 3% |
| aa-tango-system-search @ wall-auto-c4-oklab | 0318.png | soft +0.056 black; faint +0.081 black (better opaque -0.017; better strong -0.014) | -0.017 / -0.013 / +0.022 / +0.028 / -0.005 | lost #474747 3%, #000000 2%, #555555 1%; kept 4 |
| aa-tango-system-search @ auto-c3-oklab | 0083.png | soft +0.044 black; faint +0.080 black (better opaque -0.024; better strong -0.019) | -0.024 / -0.019 / +0.014 / +0.027 / -0.011 | lost #719ece 8%, #000000 2%, #618fc3 4%; kept 3 |
| aa-tango-system-search @ pico8-c4-oklab | 0094.png | soft +0.038 black; faint +0.077 black (better strong -0.011) | -0.001 / -0.011 / +0.008 / +0.025 / -0.001 | lost #000000 2%; kept 2 |

## Top 10 real-art improvements, squared

| Case | Sheet (sheet-NNNN) | Regions (worst bg) | Mean Δ opaque/strong/soft/faint/all | Clusters |
|---|---|---|---|---|
| soft-magic-ring @ auto-c3-oklab | 0211.png | strong -0.141 black (worse faint +0.016) | — / -0.138 / -0.002 / +0.006 / -0.010 | lost #1c1c1c 39%, #0e0e0e 4%, #020202 2%, #7e7e7e 1%; kept 3 |
| glow-lens-flare @ auto-c3-oklab | 0042.png | strong -0.124 black (worse faint +0.018) | -0.243 / -0.120 / -0.001 / +0.006 / -0.011 | lost #1f1f1f 20%, #0f0f0f 7%, #070707 4%, #898989 2%; kept 4 |
| glow-lens-flare @ wall-auto-c4-oklab | 0306.png | strong -0.107 black (worse faint +0.020) | -0.271 / -0.104 / -0.002 / +0.007 / -0.008 | lost #1f1f1f 20%, #0f0f0f 7%, #4c4c4c 9%, #070707 4%, #898989 2%; kept 7 |
| glow-lens-flare @ auto-c4-oklab | 0043.png | strong -0.090 black (worse faint +0.020) | -0.244 / -0.088 / -0.003 / +0.007 / -0.006 | lost #1f1f1f 20%, #0f0f0f 7%, #4c4c4c 9%, #070707 4%, #898989 2%; kept 6 |
| fade-trail-streak @ auto-c3-oklab | 0125.png | strong -0.087 black (worse faint +0.024) | — / -0.087 / -0.006 / +0.008 / -0.007 | lost #020202 8%, #0c0c0c 8%, #1a1a1a 16%; kept 4 |
| glow-lens-flare @ auto-c4-oklab-dither4x4 | 0054.png | strong -0.083 black (worse faint +0.018) | -0.244 / -0.082 / -0.003 / +0.006 / -0.006 | lost #1f1f1f 20%, #0f0f0f 7%, #4c4c4c 9%, #070707 4%, #898989 2%; kept 6 |
| fade-trail-streak @ auto-c4-oklab | 0126.png | strong -0.068 black (worse faint +0.022) | — / -0.068 / -0.008 / +0.007 / -0.006 | lost #020202 8%, #0c0c0c 8%, #1a1a1a 16%, #484848 5%; kept 6 |
| soft-magic-ring @ auto-c4-oklab | 0212.png | strong -0.068 black (worse faint +0.011) | — / -0.067 / -0.004 / +0.003 / -0.005 | lost #3a3a3a 14%, #0e0e0e 4%, #020202 2%; kept 4 |
| fade-trail-streak @ wall-auto-c4-oklab | 0326.png | strong -0.067 black; soft -0.012 black (worse faint +0.024) | — / -0.066 / -0.010 / +0.007 / -0.005 | lost #020202 8%, #0c0c0c 8%, #1a1a1a 16%, #484848 5%; kept 6 |
| soft-magic-ring @ auto-c4-oklab-dither4x4 | 0222.png | strong -0.063 black | — / -0.063 / -0.005 / +0.003 / -0.006 | lost #3a3a3a 14%, #0e0e0e 4%, #020202 2%; kept 4 |

These regressions are not just Oklab's sensitivity near black. For example, the
linear soft region of `aa-tango-face-smile @ auto-c3-oklab` is
+0.069/+0.021/+0.023/+0.022 on black/white/checker/colored, and the strong region of
`aa-magic-orbs-sheet @ wall-auto-c4-oklab` is +0.147/+0.050/+0.056/+0.058. The weakest
evidence is the faint-only "worse" verdicts, such as glow-flash-yellow and
anim-kenney-explosion, which reach +0.015 to +0.036 on black only.

## Spill pathology in real art

For calibration, the synthetic spill units at Auto cap 3 improve opaque+strong from
0.184 to 0 and from 0.147 to 0 under both policies. **Real art reproduces the same kind
of defect** under the fixed screen: 47 real cases over 11 units for linear, and 64 cases
over 12 units for squared. They cluster in luminous effects whose faint or soft tails
carry dark RGB:

- glow-lens-flare: Auto c3 opaque+strong 0.181 → 0.062 (opaque −0.221).
- soft-magic-ring: 0.179 → 0.067.
- fade-trail-streak: 0.130 → 0.064.
- Also affected: fx-teleporter-burst, fx-energy-star, fade-radial-light, soft-bubble,
  soft-smoke-puff, anim-kenney-explosion, anim-rubberduck-magic and glow-light-64.

Under linear these repairs carry no material soft cost in the same case (lens flare c3:
soft +0.002, faint +0.002). Squared adds faint +0.016 to +0.024 on black. No real case is
as extreme as the synthetic one, where the core is displaced completely. In real art,
none instead leaves the core partly darkened or desaturated.

## Preliminary read (metrics only; blind judging pending)

- **Squared: reject.** It reproduces the cyan-halo pathology on real authored art, where
  deliberate shadows lose their color. In shadow-tree-topdown at Auto c4 RGB, a black
  shadow cluster with 36% of the mass is lost (strong +0.119). The shadow-glass-orb
  contact shadow is lost in 7 cases. Magic-orbs dark rims fail per unit (strong
  +0.107 to +0.121).
- **Linear: the only candidate, but not shippable as a blanket change.** It never makes
  an opaque region materially worse. It wins clearly on luminous effects, glows, fades
  and all-soft grayscale art, and its output is byte-identical in 44% of real per-unit
  cases. Its regressions follow one pattern: opaque icons or sprites whose **dark
  translucent antialiasing or soft shadow** carries an intended color.
  - aa-tango-face-smile: 9 cases, soft up to +0.086.
  - aa-tango-system-search: 5 cases.
  - aa-magic-orbs-sheet in the shared c4 wall: strong +0.147, with a black rim cluster
    holding 14% of the mass lost.
  - shadow-glass-orb at res64 c4 RGB: soft +0.017.

  Walls amplify the problem, because weighting one asset moves the palette shared with
  the others.
- The gate was "improvement without regressions". On real art, linear fails it for the
  antialiased category, and its soft/strong losses show on every background. The visual
  judges should check two things: whether the tango icons' dark fringes and the
  magic-orbs wall rims are noticeable at 1×, and whether the lens-flare/magic-ring
  repairs are large enough to matter.

## Blind judge packets

The selection rule was fixed in `analysis/selection-rule.md` before it was applied. It is
applied by `analysis/select-judges.mjs`, and the full mapping with case IDs is in
`analysis/judge-selection.json`. It selected 106 unique sheets:

- rule 1, synthetic: 9.
- rule 2, real units: 81.
- rule 3, extremes: 8 + 8, of which 12 were new after de-duplication.
- rule 4, walls: 4.

The packets are `.tmp/keep-judge/A` and `.tmp/keep-judge/B`, with 59 sheets each and 12
shared. Two manifest-note clauses that describe policy behavior were removed from the
judge indexes. The 70 sheets larger than 1600 px have nearest-neighbour `-view.png`
copies.

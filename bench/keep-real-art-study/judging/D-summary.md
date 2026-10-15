# Blind Judge D: R2 sheets K045–K097

Scope: 53 sheets, using only `.tmp/keep-judge/R2/` (K045–K097 PNGs and index.json). R2 was regenerated while I was waiting to start. I judged a byte-identical snapshot taken after `READY` reappeared, and confirmed afterwards that every judged sheet and index.json still matched the live files.

Method: I viewed each sheet in full, plus an extracted Source/P/Q crop grid on all four backgrounds. Animations were viewed frame by frame. Rims, fringes, glows and shadows got their own close-ups. As a cross-check I also computed per-background Oklab composite differences, split by source alpha class (alpha recovered from the black and white composites). Visual judgment decided every case. Measured alpha matched the source for both P and Q everywhere, with a maximum error under 0.3/255.

## Counts

| | P | Q | tie |
|---|---|---|---|
| preferred | 22 | 25 | 6 |

The loser's severity was 2 or higher in 24 sheets:
- **P was the loser (Q preferred) in 14:** K047, K048, K053(3), K058, K062(3), K064, K066, K070, K073, K078, K085, K086, K089, K091.
- **Q was the loser (P preferred) in 10:** K049, K056, K063, K069, K072, K076, K080(3), K088, K093, K096.

## Most important observations

1. **K053 (Q, sev 3):** P maps the energy star's whole yellow fringe to peach/brown, so it reads as a salmon blob. Q keeps a yellow rim.
2. **K062 (Q, sev 3) and K080 (P, sev 3):** in the same capped animation, the loser turns the yellow and cyan sparkle frames peach/khaki. Each side fails once, so this is a per-case frame-color fragility, not a consistent bias.
3. **Hot cores and bright rims are the most frequent meaningful loss, and they split both ways.**
   - P dims them in K058 (ring nearly lost on checker), K070 (streak core), K085 (core darker and tan) and K087.
   - Q dims them in K072 (flare center vanishes on checker), K093 (white center lost) and K096 (streak core gray).
4. **Soft-glow hue drift.**
   - P tints the soft smoke purple in K047, makes the green-magic ring muddy in K048, muddies the cyan glow in K086 and shifts mid-particles to indigo in K064.
   - Q tints the faint haze navy in K061 and K096.
5. **Antialiased icon rims and outlines mostly favor P:**
   - K049: Q's lens rim goes mauve.
   - K056: Q loses the dark handle outline.
   - K063: Q's handle turns blue and dark dashes appear on the lens rim.
   - K069: Q's rim goes red-brown with purple eyes.
   - K088: Q adds brown face blotches.

   But Q wins K089 (P's face goes salmon with an olive fringe) and K091 (P's face goes brown and the smile is lost).
6. **Opaque core transitions:**
   - P inserts harsh black outline rings in K066 (visible at 1x) and K071.
   - P adds olive blotches in the K073 yellow-flash core.
   - Q flattens the starburst into a mint disc with a mauve halo in K076.
7. **K078 and K082 are major failures for both sides** (pico8 c4 and shared-wall c4). The preference there only says which output is less wrong. In K082, Q collapses three orbs into one magenta; P keeps slightly more distinction but browns the rim antialiasing.
8. **Six cases are effectively identical** (K052, K060, K067, K079, K084, K092). Fully soft faint content (the bubbles) and the fire animation show no meaningful difference.

## Overall impression

Neither method dominates. Q is preferred slightly more often (25 to 22) and P has more meaningful losses (14 to 10). Those losses cluster in soft glow and smoke hue (purple/indigo drift) and in dimmed hot cores. Q's meaningful losses cluster in antialiased icon rims and outlines, and in a few lost hot cores. Most decisions turn on capped palette subsets: which colors each method keeps decides whether a glow, rim or core survives.

# Blind Judge C: sheets K001 to K053 (R2)

I judged by eye from each sheet, using enlarged three-column crops and contrast-boosted crops for faint art. A per-background RGB error figure against Source was computed only as a cross-check. The full record is in `C-judgments.json`.

## Counts

| | P | Q | tie |
|---|---|---|---|
| Preferred | 20 | 17 | 16 |

The table counts losses with severity 2 or higher, grouped by the side that lost.

| Losing side | sev >= 2 | of which sev 3 | Sheets |
|---|---|---|---|
| Q lost | 14 | 0 | K002 K009 K011 K014 K015 K020 K024 K029 K038 K040 K041 K045 K049 K050 |
| P lost | 8 | 2 (K034, K053) | K001 K013 K021 K025 K028 K034 K047 K053 |

The 16 ties are almost all sheets where the outputs are pixel-identical or close to it: the c8 sparks, fire, cloud, bubbles, teleporter and rubber-duck sheets. Neither method shows a systematic advantage on those.

## Most important observations

1. **K034** (lens flare, auto-c8, sev 3, P loses). P loses the white flare hotspot. The core becomes a dim gray disk, and on white the center is darker than its surroundings. Q keeps the bright star and streak. This is the clearest single failure.
2. **K053 and K001** (energy star and yellow flash, pico8-c4; P loses, sev 3 and 2). P maps the whole effect to peach, salmon and brown with no yellow, so the object no longer reads as a yellow effect. Q keeps a saturated yellow fringe or rim.
3. **K040, K045, K050** (soft magic ring, every setting; Q loses, sev 2). Q dims the thin white rings and lines. They nearly disappear on the checker background and look grainy on white. P keeps the rings bright.
4. **K011 and K029** (radial light fade; Q loses, sev 2). Q loses the central hotspot, which then reads darker than its surroundings on white. P keeps a light center. In K029 P is tinted mint, but the light still reads.
5. **K038** (glass orb shadow, res64-c4; Q loses, sev 2). Q tints the neutral gray drop shadow pink-purple, while P's shadow stays near-neutral. The orb body is off-hue in both.
6. **Rubber-duck animation, mixed results.** In K020 Q speckles the yellow duck with pink pixels and P wins. In K002 Q turns the duck gray and P wins. In K025 P turns it fully peach and Q wins. With a palette shared across frames, either method can drop the yellow of frame 0.
7. **Explosion and fire smoke tint.** In K015 Q loses the yellow core and tints the smoke purple, so P wins. In K047 P tints the smoke pink-magenta and Q's rust-colored smoke is closer, so Q wins. In K028, Q keeps the amber flame tips that P drops.
8. **Glow halos and sparkles.** In K009 Q adds blotchy brown-gray patches to the outer haze, and P wins. In K023 Q keeps the two white sparkle points at their correct positions, and Q wins. In K044 Q's sparkles come out khaki and look like dirt, and P wins. Each method sometimes spends a palette slot on a sparkle; that helps only when the slot color is close to white.

## Other notes

- **Red orb sheets (K008, K010, K019, K021).** These trade a rim highlight against the core gradient. Q usually keeps the orange rim or specular highlight, and P sometimes spends its color on the core-to-dark ring. I preferred Q three times and called K019 a tie.
- **Antialiased icons (K014, K024, K049).** P won all three on core features: the handle stays silver, the eyes stay black, and the lens ring stays blue. Q produced blue handle patches, brown eyes and a mauve ring. K042, the wall palette case, went to Q on its shading.
- **Ties.** I scored every tie as severity 0, including the mixed ones (K019 and K051).

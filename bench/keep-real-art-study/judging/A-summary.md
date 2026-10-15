# Blind Judge A summary

I judged all 59 sheets visually and cropped the questionable ones at enlarged size. I never looked at method identities. The letters are randomized per sheet, so per-letter totals mean nothing.

## Counts
- **23 sheets** where at least one letter shows a meaningful loss (severity 2 or worse) relative to the best of the three: J001, J007, J011, J013, J014, J018, J019, J025, J029, J032, J034, J036, J037, J039, J040, J042, J044, J045, J051, J052, J054, J058, J059.
- **17 sheets** with only minor differences (largest severity 1): J002, J006, J008, J009, J015, J020, J022, J024, J026, J028, J030, J031, J043, J047, J048, J055, J057.
- **19 sheets** where the three outputs are equal in faithfulness. 17 are effectively indistinguishable. In J023 and J041 the outputs differ, but all three are about equally wrong.

## Patterns
1. **Hot cores flattened into plateaus.** The most common meaningful loss. One output turns a white-hot or very bright translucent/opaque core into a flat cream, gray or mint area. It also often drops the saturated ring around that core. Examples: J018/J052 (yellow flash), J039/J051 (energy star), J014/J034/J058 (gray light/flare cookies), J001/J043 (trail streak), and J048/J055 more mildly.
2. **Contact shadow recolored.** On the glass-orb sheets, one output often tints the neutral gray translucent shadow peach, pink or brown (J011, J040, J044, and J047 more mildly). The others keep it gray. The opaque-looking orb body is banded about equally in every output.
3. **Intentional translucent hue lost.** Examples: the cyan glow core grayed (J037), the cyan frame grayed (J025), the yellow burst turned peach (J036), the flare core turned yellow-olive (J029), the outer smoke turned plum (J030), and the neutral ring linework went dim or dark (J007, J045).
4. **Opaque core repair versus translucent color.** J032 is the clearest tradeoff. Two outputs keep the intentional cyan halo but recolor the opaque tan target rings cyan. The third repairs the tan core but turns the whole halo beige, which is worse because the halo dominates the image.
   Other cases where one output keeps or repairs an opaque core that another dulls:
   - J042: saturated orange face versus a dull tan one.
   - J059: yellow explosion core versus dull orange.
   - J039: white core versus cream.
   - J013: dark eyes versus navy eyes.
   - J054, dithered: the gray handle stays gray versus turning blue.
5. **Oversaturated accents.** Some outputs add vivid cyan particles (J020, J057) or false colored arcs on a neutral rim (J041, which all three outputs do). These outputs ignore the fade.
6. **Most all-soft or faint assets are ties** (bubbles, cloud, green swirl, sparks, island, synthetic ramps). Several losses come from the palette itself and hit all three outputs equally, for example the island's teal and orange, and PICO-8's lost indigo and cyan.
7. **Animations:** the losses were consistent across frames. No output flickers between colors from frame to frame in any sheet I checked (J025, J030, J031, J036, J059).

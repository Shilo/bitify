// Shared held-out case list. Eleven paid reductions (10 REST + 1 MCP; spill1-count3 added after offline evidence), three free rejections.
export const CASES = [
  { id: 'knight-count4', inputs: ['knight-a.png'], count: 4, claim: 'Explicit K4 on held-out character (outline/skin/metal/cloth/wood ramps, rare accents)' },
  { id: 'knight-count16', inputs: ['knight-a.png'], count: 16, claim: 'Explicit K16 on 17-color source: which single color is dropped' },
  { id: 'knight-pico8', inputs: ['knight-a.png'], target: 'target-pico8.png', claim: 'Fixed PICO-8 target, nearest, held-out sprite' },
  { id: 'knight-edg8', inputs: ['knight-a.png'], target: 'target-edg8.png', claim: 'Fixed ENDESGA 8 target, nearest, held-out sprite' },
  { id: 'hue-edg8-none', inputs: ['hue-ramp.png'], target: 'target-edg8.png', claim: 'Saturated ramp onto EDG8, dither off (calibration base)' },
  { id: 'hue-edg8-4x4-s2', inputs: ['hue-ramp.png'], target: 'target-edg8.png', dither: '4x4', strength: 2, claim: 'Strength calibration, low' },
  { id: 'hue-edg8-4x4-s8', inputs: ['hue-ramp.png'], target: 'target-edg8.png', dither: '4x4', strength: 8, claim: 'Strength calibration, high' },
  { id: 'glow-count4', inputs: ['glow-alpha.png'], count: 4, alpha: true, claim: 'Partial alpha 0/1/64/127/128/192/254/255 with near-invisible green spill: does faint RGB steal palette slots' },
  { id: 'knight-2frame-count8', inputs: ['knight-a.png', 'knight-b.png'], count: 8, claim: 'Two frames, moving sword, shared generated palette, unchanged-region churn' },
  { id: 'spill1-count3', inputs: ['spill-alpha1.png'], count: 3, alpha: true, claim: 'Follow-up (11th op): green spill ONLY at alpha 1 (invisible); does the service also spend a slot on it' },
  { id: 'knight-count4-mcp', inputs: ['knight-a.png'], count: 4, mcp: true, repeatOf: 'knight-count4', claim: 'MCP surface + repeat determinism of knight-count4' },
];
export const REJECTED = [
  { id: 'reject-count257', body: { num_colors: 257 } },
  { id: 'reject-dither-3x3', body: { num_colors: 4, dithering: '3x3' } },
  { id: 'reject-strength11', body: { num_colors: 4, dithering: '4x4', dithering_strength: 11 } },
];

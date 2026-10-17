// Test-only transformation. Production remains unchanged until acceptance.
export function candidate(source){
 const marker='    const lo = Math.max(1, middle - 1), hi = Math.min(cells - 1, middle + 1);';
 if(!source.includes(marker))throw Error('Candidate source marker changed');
 source=source.replace(marker,marker+`
    // Cache only demonstrably varied, large jobs; repeated sprites retain their
    // existing RGB-plan memo and allocate no pair cache. Ordered direction keeps
    // the original floating-point operations and tie decisions exactly.
    let pair;
    if (state.memo === null && state.result.indices.length >= 65536) {
      const key = ai * 256 + bi;
      d.pairMemo ??= new Map();
      pair = d.pairMemo.get(key);
      if (!pair && d.pairMemo.size < 128) {
        pair = { labs: new Float64Array(cells * 3), ready: new Uint8Array(cells) };
        d.pairMemo.set(key, pair);
      }
    }`);
 const formula='      lab(light[ap] + t * dr, light[ap + 1] + t * dg, light[ap + 2] + t * db, mixed, 0);';
 if(!source.includes(formula))throw Error('Candidate formula changed');
 return source.replace(formula,`      if (pair?.ready[weight]) {
        const at = weight * 3;
        mixed[0] = pair.labs[at]; mixed[1] = pair.labs[at + 1]; mixed[2] = pair.labs[at + 2];
      } else {
${formula}
        if (pair) {
          const at = weight * 3;
          pair.labs[at] = mixed[0]; pair.labs[at + 1] = mixed[1]; pair.labs[at + 2] = mixed[2]; pair.ready[weight] = 1;
        }
      }`);
}

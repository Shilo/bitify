// Preview failures are owned by a surface and an attempt, never by the wall.
// Logical inputs exclude retry tokens and display size: the clients share these jobs.
export function paletteFailureInputs(item, palette, alphaCut, metric, maxColors) {
  return { item, palette, alphaCut, metric, maxColors };
}

export function samePaletteFailureInputs(a, b) {
  return !!a && !!b && a.item === b.item && a.palette === b.palette
    && a.alphaCut === b.alphaCut && a.metric === b.metric && a.maxColors === b.maxColors;
}

export function paletteFailureRegistry() {
  const owners = new Map();
  function begin(owner, stage, inputs, attempt) {
    let stages = owners.get(owner);
    if (!stages) owners.set(owner, stages = new Map());
    const previous = stages.get(stage);
    stages.set(stage, { inputs, attempt, error: samePaletteFailureInputs(previous?.inputs, inputs) ? previous.error : null });
    return !!previous?.error && !samePaletteFailureInputs(previous.inputs, inputs);
  }
  function settle(owner, stage, attempt, error = null) {
    const entry = owners.get(owner)?.get(stage);
    if (!entry || entry.attempt !== attempt) return false;
    const changed = !!entry.error !== !!error;
    entry.error = error;
    return changed;
  }
  function current(items, context) {
    if (context.family !== 'full-palette' || !context.palette) return [];
    const result = [];
    const present = new Set(items);
    for (const stages of owners.values()) for (const [stage, entry] of stages) {
      const input = entry.inputs;
      if (!entry.error || !present.has(input.item)
        || !samePaletteFailureInputs(input, paletteFailureInputs(input.item, context.palette, context.alphaCut, context.metric, context.maxColors))) continue;
      if (stage === 'limit' ? context.maxColors && context.maxColors < context.palette.size : context.cleanup) result.push({ ...entry, stage });
    }
    return result;
  }
  function clear(owner, stage) {
    const stages = owners.get(owner), failed = !!stages?.get(stage)?.error;
    stages?.delete(stage);
    return failed;
  }
  function remove(owner) {
    const failed = [...(owners.get(owner)?.values() ?? [])].some(entry => entry.error);
    owners.delete(owner);
    return failed;
  }
  return { begin, settle, current, clear, remove };
}

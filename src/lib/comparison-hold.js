// Pointer comparison and focused Space are independent input sources. Releasing
// either keeps comparison active until all sources end; cancellation clears both.
export function comparisonHold() {
  let pointer = false, keyboard = false;
  return {
    set(source, active) {
      if (source === 'pointer') pointer = active;
      else if (source === 'keyboard') keyboard = active;
      return pointer || keyboard;
    },
    clear() { pointer = false; keyboard = false; return false; },
    active() { return pointer || keyboard; },
  };
}

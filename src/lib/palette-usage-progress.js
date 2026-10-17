// Aggregate metadata already produced by exact-size previews. Never scan pixels
// or start conversions to populate wall captions. At most one byte per frame and
// 256 RGB values survive; incomplete animation unions are not output counts.
export function addUsageFrame(progress, colors, used, frame, frames) {
  if (!Number.isSafeInteger(frames) || frames < 1 || !Number.isSafeInteger(frame)
    || frame < 0 || frame >= frames || !Array.isArray(colors) || colors.length > 256
    || !(used instanceof Uint8Array) || used.length !== 256) return null;
  if (!progress || progress.seen.length !== frames)
    progress = { seen: new Uint8Array(frames), remaining: frames, colors: new Set() };
  if (progress.seen[frame]) return null;
  progress.seen[frame] = 1;
  progress.remaining--;
  for (let i = 0; i < colors.length; i++) if (used[i]) progress.colors.add(colors[i]);
  return progress;
}

export function completedUsage(progress, targetColors) {
  if (!progress || progress.remaining) return null;
  const colors = Object.freeze(targetColors.filter(color => progress.colors.has(color)));
  return Object.freeze({ colors, count: colors.length, frames: progress.seen.length });
}

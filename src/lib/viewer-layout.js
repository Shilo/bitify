// Immersive inspection fits the entire source aspect into the full art viewport.
// Controls overlay it; they do not subtract a second header/caption area.
export function fitViewerImage(w, h, width, height, inset = 0) {
  const availableWidth = Math.max(1, width - inset * 2);
  const availableHeight = Math.max(1, height - inset * 2);
  const scale = Math.min(availableWidth / w, availableHeight / h);
  return { width: w * scale + inset * 2, height: h * scale + inset * 2 };
}

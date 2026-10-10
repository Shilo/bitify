// A viewer fits the source aspect ratio into the remaining viewport, unlike the
// deliberately square wall tiles. Keep conversion bounded to visible pixels.
export function fitViewerImage(w, h, width, height, inset = 4) {
  const availableWidth = Math.max(1, width - 24 - inset * 2);
  const availableHeight = Math.max(1, height - 24 - 35 - inset * 2);
  const scale = Math.min(availableWidth / w, availableHeight / h);
  return { width: w * scale + inset * 2, height: h * scale + inset * 2 };
}

(() => {
  const root = document.getElementById("cf-studio"),
    assets = window.filmAssets,
    shots = window.filmShots;
  const views = [...root.querySelectorAll("[data-scene]")],
    layers = new Map();
  const clamp = (x) => Math.max(0, Math.min(1, x)),
    ease = (x) => {
      x = clamp(x);
      return x * x * (3 - 2 * x);
    };
  root.querySelectorAll("[data-asset]").forEach((img) => {
    img.src = assets[img.dataset.asset];
  });
  for (const img of root.querySelectorAll("[data-screen],[data-focus]")) {
    const old = img.cloneNode(false);
    old.removeAttribute("data-screen");
    old.removeAttribute("data-focus");
    old.classList.add("cfs-crossfade");
    img.parentElement.appendChild(old);
    layers.set(img, { old, current: "" });
  }
  function imagePair(img, current, previous, alpha) {
    const state = layers.get(img);
    if (img.getAttribute("src") !== current) img.src = current;
    const last = state.old;
    if (last.getAttribute("src") !== previous) last.src = previous;
    img.style.opacity = "1";
    last.style.opacity = String(1 - alpha);
  }
  function stage(index, time) {
    const s = shots[index],
      local = clamp((time - s.start) / (s.end - s.start)),
      view = views[index];
    view.style.setProperty("--cfs-drift", String(local * 14));
    if (s.frames) {
      const slot = ((time - s.start) / (s.end - s.start)) * s.frames.length,
        k = Math.min(s.frames.length - 1, Math.max(0, Math.floor(slot))),
        current = s.frames[k],
        previous = s.frames[Math.max(0, k - 1)],
        alpha =
          k === 0
            ? 1
            : ease(((slot - k) * (s.end - s.start)) / s.frames.length / 0.26);
      imagePair(
        root.querySelector('[data-screen="' + index + '"]'),
        assets[current],
        assets[previous],
        alpha,
      );
      imagePair(
        root.querySelector('[data-focus="' + index + '"]'),
        assets["focus-" + current],
        assets["focus-" + previous],
        alpha,
      );
      root.querySelector('[data-caption="' + index + '"]').textContent =
        s.captions[k];
    }
    if (index === 5)
      root.querySelectorAll(".cfs-triptych figure").forEach((f, j) => {
        const p = ease((time - s.start - 0.15 - j * 0.32) / 0.75);
        f.style.setProperty("--cfs-reveal", String(p));
        f.querySelector("figcaption").style.opacity = String(p);
      });
  }
  window.renderFrame = (time) => {
    const t = Math.max(0, Math.min(30, time));
    let index = shots.findIndex((s) => t >= s.start && t < s.end);
    if (index < 0) index = 6;
    const entering = index === 0 ? 1 : ease((t - shots[index].start) / 0.5);
    for (let i = 0; i < views.length; i++) {
      const active = i === index,
        previous = i === index - 1 && entering < 1;
      views[i].style.visibility = active || previous ? "visible" : "hidden";
      views[i].style.opacity = String(
        active ? entering : previous ? 1 - entering : 0,
      );
      views[i].style.transform =
        "translateY(" +
        (active ? (1 - entering) * 24 : previous ? -entering * 16 : 0) +
        "px)";
      views[i].style.zIndex = active ? "2" : "1";
      views[i].setAttribute("aria-hidden", String(!active));
      if (active || previous) stage(i, t);
    }
    return { time: t, scene: shots[index].name };
  };
  window.filmReady = (async () => {
    await document.fonts.ready;
    const preload = Object.values(assets).map(
      (src) =>
        new Promise((ok, fail) => {
          const img = new Image();
          img.onload = ok;
          img.onerror = () => fail(Error("Image failed: " + src));
          img.src = src;
        }),
    );
    await Promise.all(preload);
    window.renderFrame(0);
    return true;
  })();
})();

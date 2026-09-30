const preferenceKey = "clemi-motion";

export function createMotionPreference({
  root,
  view,
  defaultPreference = "system",
}) {
  const system = view.matchMedia("(prefers-reduced-motion: reduce)");
  const listeners = new Set();
  const toggle = root.querySelector("[data-motion-toggle]");
  const label = toggle?.querySelector("[data-motion-label]");
  if (toggle) toggle.hidden = false;
  let preference = null;
  try {
    const saved = view.localStorage.getItem(preferenceKey);
    if (saved === "full" || saved === "reduce") preference = saved;
  } catch {
    // Private browsing can still keep the preference for this open page.
  }

  const motion = {
    get matches() {
      const effective = preference ?? defaultPreference;
      if (effective === "full") return false;
      if (effective === "reduce") return true;
      return system.matches;
    },
    addEventListener(type, listener) {
      if (type === "change") listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "change") listeners.delete(listener);
    },
  };
  let previous = motion.matches;
  function update() {
    const reduced = motion.matches;
    root.documentElement.dataset.motion = reduced ? "reduce" : "full";
    const action = reduced ? "Activar animaciones" : "Pausar animaciones";
    toggle?.setAttribute("aria-pressed", String(!reduced));
    toggle?.setAttribute("aria-label", `${action} en esta landing`);
    if (label) label.textContent = action;
    if (previous === reduced) return;
    previous = reduced;
    for (const listener of listeners) {
      listener.call(motion, { type: "change", matches: reduced });
    }
  }

  toggle?.addEventListener("click", () => {
    preference = motion.matches ? "full" : "reduce";
    try {
      view.localStorage.setItem(preferenceKey, preference);
    } catch {
      // The effective preference remains available even without storage.
    }
    update();
  });
  system.addEventListener("change", update);
  view.addEventListener("storage", (event) => {
    if (event.key !== preferenceKey && event.key !== null) return;
    preference = ["full", "reduce"].includes(event.newValue)
      ? event.newValue
      : null;
    update();
  });
  update();
  return motion;
}

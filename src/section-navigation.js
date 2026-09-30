export function initializeSectionNavigation({
  root,
  view,
  header,
  reducedMotion,
}) {
  let animation = null;
  let arrival = null;
  let focusCleanup = null;
  const cleanups = [];

  function listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    cleanups.push(() => target.removeEventListener(type, listener, options));
  }
  function clearArrival() {
    if (!arrival) return;
    view.clearTimeout(arrival.timer);
    arrival.element.classList.remove("is-arriving");
    arrival = null;
  }
  function cancel() {
    if (!animation) return;
    view.cancelAnimationFrame(animation.frame);
    animation = null;
  }
  function destinationTop(target) {
    const padding = Number.parseFloat(
      view.getComputedStyle(root.documentElement).scrollPaddingTop,
    );
    const clearance = Math.max(
      Number.isFinite(padding) ? padding : 0,
      (header?.getBoundingClientRect().height || 0) + 18,
    );
    const extent = Math.max(
      0,
      root.documentElement.scrollHeight - view.innerHeight,
    );
    return Math.max(
      0,
      Math.min(
        extent,
        view.scrollY + target.getBoundingClientRect().top - clearance,
      ),
    );
  }
  function focusDestination(target) {
    focusCleanup?.();
    const focusTarget = target.querySelector("h1, h2") || target;
    if (!focusTarget.hasAttribute("tabindex") && focusTarget.tabIndex < 0) {
      focusTarget.setAttribute("tabindex", "-1");
      const clean = () => {
        focusTarget.removeAttribute("tabindex");
        focusTarget.removeEventListener("blur", clean);
        if (focusCleanup === clean) focusCleanup = null;
      };
      focusTarget.addEventListener("blur", clean, { once: true });
      focusCleanup = clean;
    }
    focusTarget.focus({ preventScroll: true });
  }
  function finish(target) {
    animation = null;
    focusDestination(target);
    if (reducedMotion.matches) return;
    const element = target.closest("section") || target;
    element.classList.add("is-arriving");
    arrival = { element, timer: view.setTimeout(clearArrival, 850) };
  }
  function navigate(target) {
    cancel();
    clearArrival();
    const start = view.scrollY;
    const end = destinationTop(target);
    const distance = end - start;
    if (reducedMotion.matches || Math.abs(distance) < 2) {
      view.scrollTo({ top: end, behavior: "instant" });
      finish(target);
      return;
    }
    const duration = Math.min(
      1100,
      Math.max(460, Math.abs(distance) * 0.35 + 280),
    );
    const current = { frame: 0, started: view.performance.now() };
    animation = current;
    function step(now) {
      if (animation !== current) return;
      const progress = Math.max(
        0,
        Math.min(1, (now - current.started) / duration),
      );
      const eased =
        progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      // An instant frame prevents CSS scroll-behavior from starting a second animation.
      view.scrollTo({ top: start + distance * eased, behavior: "instant" });
      if (progress === 1) finish(target);
      else current.frame = view.requestAnimationFrame(step);
    }
    current.frame = view.requestAnimationFrame(step);
  }

  listen(root, "click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = event.target.closest?.("a[href]");
    if (
      !link ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self")
    )
      return;
    const url = new URL(link.href, view.location.href);
    if (
      !url.hash ||
      url.origin !== view.location.origin ||
      url.pathname !== view.location.pathname ||
      url.search !== view.location.search
    )
      return;
    let target;
    try {
      target = root.getElementById(decodeURIComponent(url.hash.slice(1)));
    } catch {
      return;
    }
    if (!target) return;
    if (url.hash !== view.location.hash) {
      try {
        view.history.pushState(view.history.state, "", url.hash);
      } catch {
        // If history is unavailable, keep the browser's ordinary anchor behavior.
        return;
      }
    }
    event.preventDefault();
    navigate(target);
  });

  listen(view, "wheel", cancel, { passive: true });
  listen(view, "touchstart", cancel, { passive: true });
  listen(view, "pointerdown", cancel, { passive: true });
  listen(view, "keydown", (event) => {
    if (!["Shift", "Control", "Alt", "Meta"].includes(event.key)) cancel();
  });
  listen(view, "resize", cancel);
  listen(view, "blur", cancel);
  listen(view, "popstate", () => {
    cancel();
    clearArrival();
  });
  listen(view, "hashchange", () => {
    cancel();
    clearArrival();
  });
  listen(root, "visibilitychange", () => {
    if (root.hidden) cancel();
  });
  listen(reducedMotion, "change", () => {
    if (!reducedMotion.matches) return;
    cancel();
    clearArrival();
  });
  return () => {
    cancel();
    clearArrival();
    focusCleanup?.();
    cleanups.forEach((cleanup) => cleanup());
  };
}

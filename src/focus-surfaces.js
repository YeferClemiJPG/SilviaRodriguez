export function initializeFocusSurfaces({ root, reducedMotion, finePointer }) {
  let pointerInput = false;
  const cleanups = [];
  const groups = [...root.querySelectorAll("[data-focus-group]")].map(
    (element) => ({
      element,
      cards: [...element.querySelectorAll("[data-focus-card]")].filter(
        (card) => card.closest("[data-focus-group]") === element,
      ),
      hovered: null,
      focused: null,
    }),
  );

  function listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    cleanups.push(() => target.removeEventListener(type, listener, options));
  }

  function cardFor(group, target) {
    const card = target?.closest?.("[data-focus-card]");
    return group.cards.includes(card) ? card : null;
  }

  function render(group) {
    const featured = reducedMotion.matches
      ? null
      : group.focused || group.hovered;
    group.element.classList.toggle("has-featured", Boolean(featured));
    for (const card of group.cards) {
      card.classList.toggle("is-featured", card === featured);
    }
  }

  function reset() {
    for (const group of groups) {
      group.hovered = null;
      group.focused = null;
      render(group);
    }
  }

  // Pointer focus should not leave a card selected after a tap or click.
  // Keyboard focus keeps priority while a pointer crosses another card.
  listen(
    root,
    "pointerdown",
    (event) => {
      pointerInput = true;
      for (const group of groups) {
        group.focused = null;
        if (event.pointerType === "touch") group.hovered = null;
        render(group);
      }
    },
    true,
  );
  listen(
    root,
    "keydown",
    () => {
      pointerInput = false;
    },
    true,
  );

  for (const group of groups) {
    listen(group.element, "pointerover", (event) => {
      if (
        reducedMotion.matches ||
        !finePointer.matches ||
        event.pointerType === "touch"
      )
        return;
      group.hovered = cardFor(group, event.target);
      render(group);
    });

    const clearHover = () => {
      group.hovered = null;
      render(group);
    };
    listen(group.element, "pointerleave", clearHover);
    listen(group.element, "pointercancel", clearHover);
    listen(group.element, "focusin", (event) => {
      group.focused = pointerInput ? null : cardFor(group, event.target);
      render(group);
    });
    listen(group.element, "focusout", (event) => {
      group.focused = pointerInput ? null : cardFor(group, event.relatedTarget);
      render(group);
    });
  }

  listen(reducedMotion, "change", reset);
  listen(finePointer, "change", reset);
  return () => {
    cleanups.forEach((cleanup) => cleanup());
    reset();
  };
}

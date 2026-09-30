import assert from "node:assert/strict";
import test from "node:test";
import { createMotionPreference } from "../../src/motion-preference.js";

function dispatch(target, type, properties = {}) {
  const event = new Event(type);
  for (const [key, value] of Object.entries(properties)) {
    Object.defineProperty(event, key, { value });
  }
  target.dispatchEvent(event);
}

function landing({
  systemReduced = true,
  stored = null,
  storageBlocked = false,
  defaultPreference,
} = {}) {
  const root = {
    documentElement: { dataset: {} },
    // The published landing intentionally has no visible motion control.
    querySelector: () => null,
  };
  const system = new EventTarget();
  system.matches = systemReduced;
  const view = new EventTarget();
  view.matchMedia = () => system;
  const saved = new Map(stored === null ? [] : [["clemi-motion", stored]]);
  view.localStorage = {
    getItem(key) {
      if (storageBlocked) throw new Error("Storage unavailable");
      return saved.get(key) ?? null;
    },
    setItem(key, value) {
      if (storageBlocked) throw new Error("Storage unavailable");
      saved.set(key, value);
    },
  };
  const motion = createMotionPreference({ root, view, defaultPreference });
  return {
    root,
    motion,
    saved,
    changeSystem(reduced) {
      system.matches = reduced;
      dispatch(system, "change");
    },
    changeStorage(value, key = "clemi-motion") {
      dispatch(view, "storage", { key, newValue: value });
    },
  };
}

function expectMode(page, mode) {
  assert.equal(page.motion.matches, mode === "reduce");
  assert.equal(page.root.documentElement.dataset.motion, mode);
}

test("a fresh published origin enables the landing without a visible toggle", () => {
  const page = landing({ defaultPreference: "full", systemReduced: true });
  expectMode(page, "full");
  // A site default must not silently create a saved visitor preference.
  assert.equal(page.saved.size, 0);
  page.changeSystem(false);
  page.changeSystem(true);
  expectMode(page, "full");
});

test("an explicitly saved reduced preference overrides the landing default", () => {
  const page = landing({
    defaultPreference: "full",
    stored: "reduce",
    systemReduced: false,
  });
  expectMode(page, "reduce");
  page.changeSystem(true);
  page.changeSystem(false);
  expectMode(page, "reduce");
  assert.equal(page.saved.get("clemi-motion"), "reduce");
});

test("a saved full preference also overrides a reduced default", () => {
  expectMode(landing({ defaultPreference: "reduce", stored: "full" }), "full");
});

test("invalid or unavailable storage keeps the published default usable", () => {
  for (const options of [{ stored: "invalid" }, { storageBlocked: true }]) {
    const page = landing({ defaultPreference: "full", ...options });
    expectMode(page, "full");
    page.changeSystem(false);
    page.changeSystem(true);
    expectMode(page, "full");
  }
});

test("removing, clearing or invalidating a saved preference restores the site default", () => {
  for (const [value, key] of [
    [null, "clemi-motion"],
    [null, null],
    ["invalid", "clemi-motion"],
  ]) {
    const page = landing({ defaultPreference: "full", stored: "reduce" });
    expectMode(page, "reduce");
    page.changeStorage(value, key);
    expectMode(page, "full");
  }
});

test("cross-tab preferences notify consumers only when the effective mode changes", () => {
  const page = landing({ defaultPreference: "full" });
  const changes = [];
  const listener = (event) => changes.push(event.matches);
  page.motion.addEventListener("change", listener);

  page.changeStorage("reduce", "another-setting");
  expectMode(page, "full");
  page.changeStorage("reduce");
  expectMode(page, "reduce");
  page.changeStorage("reduce");
  page.changeSystem(false);
  page.changeStorage("full");
  expectMode(page, "full");
  page.changeSystem(true);
  assert.deepEqual(changes, [true, false]);

  page.motion.removeEventListener("change", listener);
  page.changeStorage("reduce");
  expectMode(page, "reduce");
  assert.deepEqual(changes, [true, false]);
});

test("generic callers continue to follow the system when no site default is selected", () => {
  for (const defaultPreference of [undefined, "system", "invalid"]) {
    const page = landing({ defaultPreference });
    expectMode(page, "reduce");
    page.changeSystem(false);
    expectMode(page, "full");
    page.changeSystem(true);
    expectMode(page, "reduce");
  }
});

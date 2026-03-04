const MOTION_STORAGE_KEY = "tsn-motion";
const MOTION_DISABLED_CLASS = "motion-off";

function isMotionEnabled(storageKey) {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved !== "off";
  } catch {
    return true;
  }
}

function saveMotionPreference(storageKey, enabled) {
  try {
    window.localStorage.setItem(storageKey, enabled ? "on" : "off");
  } catch {
    // noop: fallback to runtime-only state when storage is unavailable
  }
}

function applyMotionState(enabled, button, labels) {
  document.body.classList.toggle(MOTION_DISABLED_CLASS, !enabled);

  if (!button) {
    return;
  }

  button.dataset.motion = enabled ? "on" : "off";
  button.textContent = enabled ? labels.on : labels.off;
  button.setAttribute("aria-pressed", String(!enabled));
}

export function initMotionToggle({
  button = null,
  storageKey = MOTION_STORAGE_KEY,
  labels = {
    on: "Movimento: ligado",
    off: "Movimento: pausado",
  },
} = {}) {
  const currentState = isMotionEnabled(storageKey);
  applyMotionState(currentState, button, labels);

  if (!button) {
    return {
      enabled: currentState,
      setEnabled: () => {},
    };
  }

  let enabled = currentState;

  button.addEventListener("click", () => {
    enabled = !enabled;
    applyMotionState(enabled, button, labels);
    saveMotionPreference(storageKey, enabled);
  });

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(nextValue) {
      enabled = Boolean(nextValue);
      applyMotionState(enabled, button, labels);
      saveMotionPreference(storageKey, enabled);
    },
  };
}

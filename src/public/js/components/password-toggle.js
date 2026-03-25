const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const HIDDEN_LABEL = "Show password";
const VISIBLE_LABEL = "Hide password";

function createSvgIcon(paths = []) {
  const icon = document.createElement("span");
  icon.className = "password-toggle-icon";
  icon.setAttribute("aria-hidden", "true");

  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("focusable", "false");

  paths.forEach((pathValue) => {
    const path = document.createElementNS(SVG_NAMESPACE, "path");
    path.setAttribute("d", pathValue);
    svg.append(path);
  });

  icon.append(svg);
  return icon;
}

function ensureWrapper(input) {
  const existingWrapper = input.parentElement;
  if (existingWrapper?.matches("[data-password-toggle-field]")) {
    return existingWrapper;
  }

  const wrapper = document.createElement("span");
  wrapper.className = "password-toggle-field";
  wrapper.dataset.passwordToggleField = "";
  input.insertAdjacentElement("beforebegin", wrapper);
  wrapper.append(input);
  return wrapper;
}

function createToggleButton(input) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "password-toggle-button";
  button.dataset.passwordToggleButton = "";

  if (input.id) {
    button.setAttribute("aria-controls", input.id);
  }

  const showIcon = createSvgIcon([
    "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z",
    "M12 9.25A2.75 2.75 0 1 1 12 14.75A2.75 2.75 0 0 1 12 9.25Z",
  ]);
  showIcon.dataset.passwordToggleIcon = "show";

  const hideIcon = createSvgIcon([
    "M3 3 21 21",
    "M10.6 6.35A11.4 11.4 0 0 1 12 6c6.5 0 10 6 10 6a19.57 19.57 0 0 1-4.07 4.62",
    "M6.82 6.8C3.86 8.45 2 12 2 12a19.73 19.73 0 0 0 10 6c1.27 0 2.44-.23 3.52-.64",
    "M9.88 9.88A3 3 0 0 0 14.12 14.12",
  ]);
  hideIcon.dataset.passwordToggleIcon = "hide";
  hideIcon.hidden = true;

  const text = document.createElement("span");
  text.className = "sr-only";
  text.dataset.passwordToggleText = "";

  button.append(showIcon, hideIcon, text);
  return button;
}

function syncPasswordToggle(input, isVisible) {
  const wrapper = input.parentElement;
  const button = wrapper?.querySelector("[data-password-toggle-button]");
  const showIcon = button?.querySelector('[data-password-toggle-icon="show"]');
  const hideIcon = button?.querySelector('[data-password-toggle-icon="hide"]');
  const label = button?.querySelector("[data-password-toggle-text]");
  const nextType = isVisible ? "text" : "password";
  const nextLabel = isVisible ? VISIBLE_LABEL : HIDDEN_LABEL;

  if (!button || !label) {
    return;
  }

  input.type = nextType;
  wrapper.dataset.passwordState = isVisible ? "visible" : "hidden";
  button.setAttribute("aria-pressed", String(isVisible));
  button.setAttribute("aria-label", nextLabel);
  label.textContent = nextLabel;

  if (showIcon) {
    showIcon.hidden = isVisible;
  }

  if (hideIcon) {
    hideIcon.hidden = !isVisible;
  }
}

function ensureToggle(input) {
  if (!(input instanceof HTMLInputElement) || input.dataset.passwordToggleReady === "true") {
    return;
  }

  const wrapper = ensureWrapper(input);
  let button = wrapper.querySelector("[data-password-toggle-button]");

  if (!button) {
    button = createToggleButton(input);
    wrapper.append(button);
  }

  syncPasswordToggle(input, false);

  button.addEventListener("click", () => {
    if (input.disabled) {
      return;
    }

    const isVisible = input.type === "text";
    syncPasswordToggle(input, !isVisible);
  });

  input.dataset.passwordToggleReady = "true";
}

function bindReset(form) {
  if (!(form instanceof HTMLFormElement) || form.dataset.passwordToggleResetBound === "true") {
    return;
  }

  form.dataset.passwordToggleResetBound = "true";
  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      form.querySelectorAll("[data-password-toggle]").forEach((input) => {
        if (input instanceof HTMLInputElement) {
          syncPasswordToggle(input, false);
        }
      });
    }, 0);
  });
}

export function initPasswordToggles(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") {
    return;
  }

  root.querySelectorAll("[data-password-toggle]").forEach((input) => {
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    ensureToggle(input);
    bindReset(input.form);
  });
}

export function createFlash(target) {
  if (target) {
    target.setAttribute("role", "status");
    target.setAttribute("aria-live", "polite");

    if (!String(target.textContent ?? "").trim()) {
      target.hidden = true;
    }
  }

  function show(message, type = "info") {
    if (!target) {
      return;
    }

    target.textContent = message;
    target.dataset.state = type;
    target.hidden = false;
  }

  function clear() {
    if (!target) {
      return;
    }

    target.textContent = "";
    target.dataset.state = "info";
    target.hidden = true;
  }

  return { show, clear };
}

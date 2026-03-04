export function createFlash(target) {
  function show(message, type = "info") {
    if (!target) {
      return;
    }

    target.textContent = message;
    target.dataset.state = type;
  }

  function clear() {
    if (!target) {
      return;
    }

    target.textContent = "";
    target.dataset.state = "info";
  }

  return { show, clear };
}

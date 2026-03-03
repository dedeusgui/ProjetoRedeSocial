export function createFlash(target) {
  function show(message, type = "info") {
    if (!target) {
      return;
    }

    target.textContent = message;
    target.dataset.state = type;
  }

  return { show };
}

export function bindNavigation(root = document) {
  if (!root) {
    return;
  }

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const navigationButton = target.closest("[data-nav-href]");
    if (!navigationButton || !root.contains(navigationButton)) {
      return;
    }

    if (navigationButton instanceof HTMLButtonElement && navigationButton.disabled) {
      return;
    }

    const destination = String(navigationButton.dataset.navHref ?? "").trim();
    if (!destination) {
      return;
    }

    window.location.href = destination;
  });
}

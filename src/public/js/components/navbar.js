import { auth } from "../api.js";

export function renderNavbarAuthState({
  loginLink = null,
  logoutButton = null,
  protectedButtons = [],
} = {}) {
  const hasToken = Boolean(auth.getToken());

  if (loginLink) {
    loginLink.hidden = hasToken;
  }

  if (logoutButton) {
    logoutButton.hidden = !hasToken;
  }

  protectedButtons.forEach((button) => {
    if (button) {
      button.disabled = !hasToken;
    }
  });

  return hasToken;
}

export function bindLogout(logoutButton, onLogout) {
  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", () => {
    auth.clearToken();
    if (typeof onLogout === "function") {
      onLogout();
    }
  });
}

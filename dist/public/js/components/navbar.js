import { clearSession, hasSession } from "../core/session.js";

export function renderNavbarAuthState({
  loginLink = null,
  logoutButton = null,
  protectedButtons = [],
} = {}) {
  const hasToken = hasSession();

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
    clearSession();
    if (typeof onLogout === "function") {
      onLogout();
    }
  });
}

export function initNavbar({
  loginLink = null,
  logoutButton = null,
  protectedButtons = [],
  onLogout = null,
} = {}) {
  function refresh() {
    return renderNavbarAuthState({
      loginLink,
      logoutButton,
      protectedButtons,
    });
  }

  bindLogout(logoutButton, onLogout);
  const hasToken = refresh();

  return {
    hasToken,
    refresh,
  };
}

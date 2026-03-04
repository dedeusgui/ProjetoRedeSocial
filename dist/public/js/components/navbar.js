import { clearSession, hasSession } from "../core/session.js";

export const HOME_NOTICE_KEY = "thesocial_home_notice";

export function renderNavbarAuthState({
  loginLink = null,
  profileLink = null,
  logoutButton = null,
  protectedButtons = [],
} = {}) {
  const hasToken = hasSession();

  if (loginLink) {
    loginLink.hidden = hasToken;
  }

  if (profileLink) {
    profileLink.hidden = !hasToken;
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

function persistHomeNotice(message) {
  if (!message) {
    return;
  }

  try {
    window.sessionStorage.setItem(HOME_NOTICE_KEY, message);
  } catch {
    // noop: sessionStorage can be unavailable in restricted environments
  }
}

export function bindLogout(
  logoutButton,
  {
    onLogout = null,
    redirectOnLogout = true,
    logoutRedirectUrl = "./index.html",
    logoutNotice = "Sessão encerrada.",
  } = {},
) {
  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", () => {
    clearSession();

    if (typeof onLogout === "function") {
      onLogout();
    }

    if (redirectOnLogout) {
      persistHomeNotice(logoutNotice);
      window.location.href = logoutRedirectUrl;
    }
  });
}

export function initNavbar({
  loginLink = null,
  profileLink = null,
  logoutButton = null,
  protectedButtons = [],
  onLogout = null,
  redirectOnLogout = true,
  logoutRedirectUrl = "./index.html",
  logoutNotice = "Sessão encerrada.",
} = {}) {
  function refresh() {
    return renderNavbarAuthState({
      loginLink,
      profileLink,
      logoutButton,
      protectedButtons,
    });
  }

  bindLogout(logoutButton, {
    onLogout,
    redirectOnLogout,
    logoutRedirectUrl,
    logoutNotice,
  });
  const hasToken = refresh();

  return {
    hasToken,
    refresh,
  };
}

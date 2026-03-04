import { ApiError, api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { HOME_NOTICE_KEY, initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { resolveAuthApiMessage } from "../core/http-state.js";
import { clearSession, hasSession } from "../core/session.js";
import { renderProfileView } from "../features/profile/renderers.js";

const AUTH_REQUIRED_NOTICE = "Autenticacao necessaria para acessar seu perfil.";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-profile-status]"),
  profile: document.querySelector("[data-profile]"),
};

const statusFlash = createFlash(elements.status);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  logoutRedirectUrl: "./index.html",
});

function resolveMessage(error) {
  return resolveAuthApiMessage(
    error,
    AUTH_REQUIRED_NOTICE,
    "Erro inesperado ao comunicar com a API.",
  );
}

function redirectToHome(noticeMessage = AUTH_REQUIRED_NOTICE) {
  try {
    window.sessionStorage.setItem(HOME_NOTICE_KEY, noticeMessage);
  } catch {
    // noop: redirect still happens without persisted notice
  }

  window.location.href = "./index.html";
}

async function loadProfile() {
  if (!hasSession()) {
    redirectToHome();
    return;
  }

  statusFlash.show("Carregando perfil...", "info");

  try {
    const profile = await api.users.meProfile();
    renderProfileView(elements.profile, profile);
    statusFlash.show("M\u00e9tricas privadas dispon\u00edveis no seu perfil.", "success");
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.code === "UNAUTHENTICATED" || error.status === 401)
    ) {
      clearSession();
      redirectToHome();
      return;
    }

    statusFlash.show(resolveMessage(error), "error");
  }
}

function init() {
  bindNavigation();
  navbar.refresh();
  loadProfile();
}

init();

import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { resolveAuthApiMessage } from "../core/http-state.js";
import { hasSession } from "../core/session.js";
import { renderProfileView } from "../features/profile/renderers.js";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-profile-status]"),
  profile: document.querySelector("[data-profile]"),
};

const statusFlash = createFlash(elements.status);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  logoutButton: elements.logoutButton,
  onLogout: () => {
    navbar.refresh();
    loadProfile();
    statusFlash.show("Sessao encerrada.", "info");
  },
});

function resolveMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Autenticacao necessaria. Faca login para ver seu perfil.",
    "Erro inesperado ao comunicar com a API.",
  );
}

async function loadProfile() {
  if (!hasSession()) {
    statusFlash.show("Faca login para visualizar seu perfil.", "error");
    if (elements.profile) {
      elements.profile.innerHTML = "";
    }
    return;
  }

  statusFlash.show("Carregando perfil...", "info");

  try {
    const profile = await api.users.meProfile();
    renderProfileView(elements.profile, profile);
    statusFlash.show("Metricas privadas visiveis apenas para voce.", "success");
  } catch (error) {
    statusFlash.show(resolveMessage(error), "error");
  }
}

function init() {
  navbar.refresh();
  loadProfile();
}

init();

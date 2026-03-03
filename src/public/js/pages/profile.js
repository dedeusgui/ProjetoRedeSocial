import { api, ApiError, auth } from "../api.js";
import { createFlash } from "../components/flash.js";
import { bindLogout, renderNavbarAuthState } from "../components/navbar.js";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-profile-status]"),
  profile: document.querySelector("[data-profile]"),
};

const statusFlash = createFlash(elements.status);

function resolveApiMessage(error) {
  if (error instanceof ApiError) {
    if (error.code === "UNAUTHENTICATED" || error.status === 401) {
      return "Autenticacao necessaria. Faca login para ver seu perfil.";
    }
    return error.message;
  }

  return "Erro inesperado ao comunicar com a API.";
}

function renderSessionState() {
  renderNavbarAuthState({
    loginLink: elements.loginLink,
    logoutButton: elements.logoutButton,
  });
}

function renderProfile(profile) {
  if (!elements.profile) {
    return;
  }

  elements.profile.innerHTML = `
    <section class="card profile-card">
      <h2>@${profile.username}</h2>
      <p class="muted">${profile.email}</p>
      <p class="muted">Papel: ${profile.role}</p>
      <p class="muted">Criado em: ${dateFormatter.format(new Date(profile.createdAt))}</p>
      <div class="metrics-grid">
        <article class="card metric-box">
          <h3>Approval rate</h3>
          <p>${profile.privateMetrics?.approvalRate ?? 0}%</p>
        </article>
        <article class="card metric-box">
          <h3>Rejection rate</h3>
          <p>${profile.privateMetrics?.rejectionRate ?? 0}%</p>
        </article>
      </div>
    </section>
  `;
}

async function loadProfile() {
  if (!auth.getToken()) {
    statusFlash.show("Faca login para visualizar seu perfil.", "error");
    if (elements.profile) {
      elements.profile.innerHTML = "";
    }
    return;
  }

  statusFlash.show("Carregando perfil...", "info");

  try {
    const profile = await api.users.meProfile();
    renderProfile(profile);
    statusFlash.show("Metricas privadas visiveis apenas para voce.", "success");
  } catch (error) {
    statusFlash.show(resolveApiMessage(error), "error");
  }
}

function bindEvents() {
  bindLogout(elements.logoutButton, () => {
    renderSessionState();
    loadProfile();
    statusFlash.show("Sessao encerrada.", "info");
  });
}

function init() {
  renderSessionState();
  bindEvents();
  loadProfile();
}

init();

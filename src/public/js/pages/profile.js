import { api, ApiError, auth } from "../api.js";

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

function setMessage(target, message) {
  if (target) {
    target.textContent = message;
  }
}

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
  const hasToken = Boolean(auth.getToken());

  if (elements.loginLink) {
    elements.loginLink.hidden = hasToken;
  }

  if (elements.logoutButton) {
    elements.logoutButton.hidden = !hasToken;
  }
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
    setMessage(elements.status, "Faca login para visualizar seu perfil.");
    if (elements.profile) {
      elements.profile.innerHTML = "";
    }
    return;
  }

  setMessage(elements.status, "Carregando perfil...");

  try {
    const profile = await api.users.meProfile();
    renderProfile(profile);
    setMessage(elements.status, "Metricas privadas visiveis apenas para voce.");
  } catch (error) {
    setMessage(elements.status, resolveApiMessage(error));
  }
}

function bindEvents() {
  if (elements.logoutButton) {
    elements.logoutButton.addEventListener("click", () => {
      auth.clearToken();
      renderSessionState();
      loadProfile();
      setMessage(elements.status, "Sessao encerrada.");
    });
  }
}

function init() {
  renderSessionState();
  bindEvents();
  loadProfile();
}

init();

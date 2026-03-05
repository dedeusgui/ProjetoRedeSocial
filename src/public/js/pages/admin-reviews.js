import { api, ApiError } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { escapeHtml, formatDateTime, formatPercent } from "../core/formatters.js";
import { hasSession } from "../core/session.js";
import { resolveAuthApiMessage } from "../core/http-state.js";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-review-status]"),
  panel: document.querySelector("[data-admin-panel]"),
  requirements: document.querySelector("[data-admin-requirements]"),
  eligibleList: document.querySelector("[data-eligible-list]"),
  moderatorsList: document.querySelector("[data-moderators-list]"),
  refreshButton: document.querySelector("[data-admin-refresh]"),
};

const statusFlash = createFlash(elements.status);
const state = {
  isLoading: false,
  isUpdating: false,
};

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  logoutRedirectUrl: "../index.html",
});

function init() {
  bindNavigation();
  navbar.refresh();
  bindEvents();
  loadAdminPanel();
}

init();

function resolveMessage(error) {
  if (error instanceof ApiError && (error.code === "FORBIDDEN" || error.status === 403)) {
    return "Acesso restrito a administradores.";
  }

  return resolveAuthApiMessage(
    error,
    "Autentica\u00e7\u00e3o necess\u00e1ria. Fa\u00e7a login para acessar o painel administrativo.",
    "Erro inesperado ao carregar o painel administrativo.",
  );
}

function renderUserCards(target, users, emptyMessage, actionLabel, actionKind, buttonClassName = "") {
  if (!target) {
    return;
  }

  if (!Array.isArray(users) || users.length === 0) {
    target.innerHTML = `<p class="muted">${emptyMessage}</p>`;
    return;
  }

  target.innerHTML = users
    .map((user) => {
      const buttonClasses = ["button-link-inline"];
      if (buttonClassName) {
        buttonClasses.push(buttonClassName);
      }

      return `
        <article class="card managed-user-card">
          <p><strong>@${escapeHtml(user.username)}</strong> <span class="muted">(${escapeHtml(user.email)})</span></p>
          <p class="muted">Papel: ${escapeHtml(user.role)}</p>
          <p class="muted">Taxa de aprova\u00e7\u00e3o: ${formatPercent(user.approvalRate)} | Posts: ${user.postCount}</p>
          <p class="muted">Criado em: ${formatDateTime(user.createdAt)}</p>
          <button
            type="button"
            class="${buttonClasses.join(" ")}"
            data-admin-action="${actionKind}"
            data-user-id="${user.id}"
            ${state.isUpdating ? "disabled" : ""}
          >
            ${actionLabel}
          </button>
        </article>
      `;
    })
    .join("");
}

function renderRequirements(requirements) {
  if (!elements.requirements || !requirements) {
    return;
  }

  elements.requirements.textContent =
    `Requisitos atuais: ${requirements.minPosts} posts, ` +
    `conta com ${requirements.minAccountAgeDays}+ dias e ` +
    `aprova\u00e7\u00e3o >= ${requirements.minApprovalRate}%.`;
}

function renderPanel(data) {
  renderRequirements(data?.requirements);

  renderUserCards(
    elements.eligibleList,
    data?.eligibleUsers ?? [],
    "Nenhum usu\u00e1rio eleg\u00edvel no momento.",
    "Conceder moderador",
    "grant",
    "button-approve",
  );

  renderUserCards(
    elements.moderatorsList,
    data?.moderators ?? [],
    "Nenhum moderador ativo.",
    "Remover moderador",
    "revoke",
    "button-reject",
  );
}

async function ensureAdminProfile() {
  const profile = await api.users.meProfile();
  if (profile.role !== "admin") {
    throw new ApiError({
      message: "Acesso restrito a administradores.",
      code: "FORBIDDEN",
      status: 403,
    });
  }
}

async function loadAdminPanel() {
  if (state.isLoading) {
    return;
  }

  if (!hasSession()) {
    statusFlash.show("Fa\u00e7a login para acessar o painel administrativo.", "error");
    window.location.href = "../index.html";
    return;
  }

  state.isLoading = true;
  if (elements.refreshButton) {
    elements.refreshButton.disabled = true;
  }
  statusFlash.show("Carregando painel administrativo...", "info");

  try {
    await ensureAdminProfile();
    const data = await api.admin.listModeratorEligibility();
    if (elements.panel) {
      elements.panel.hidden = false;
    }
    renderPanel(data);
    statusFlash.show("Painel administrativo atualizado.", "success");
  } catch (error) {
    if (elements.panel) {
      elements.panel.hidden = true;
    }
    statusFlash.show(resolveMessage(error), "error");
  } finally {
    state.isLoading = false;
    if (elements.refreshButton) {
      elements.refreshButton.disabled = false;
    }
  }
}

async function handleRoleAction(button) {
  if (state.isUpdating || !button) {
    return;
  }

  const userId = String(button.dataset.userId ?? "").trim();
  const action = String(button.dataset.adminAction ?? "").trim();
  if (!userId || !action) {
    return;
  }

  state.isUpdating = true;
  statusFlash.show("Aplicando altera\u00e7\u00e3o de papel...", "info");
  try {
    await api.admin.setModeratorRole(userId, action);
    await loadAdminPanel();
    statusFlash.show("Papel atualizado com sucesso.", "success");
  } catch (error) {
    statusFlash.show(resolveMessage(error), "error");
  } finally {
    state.isUpdating = false;
  }
}

function bindEvents() {
  if (elements.refreshButton) {
    elements.refreshButton.addEventListener("click", () => {
      loadAdminPanel();
    });
  }

  const panelTarget = elements.panel;
  if (!panelTarget) {
    return;
  }

  panelTarget.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-action]");
    if (!button || !panelTarget.contains(button)) {
      return;
    }

    handleRoleAction(button);
  });
}

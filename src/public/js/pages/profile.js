import { ApiError, api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { HOME_NOTICE_KEY, initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { resolveAuthApiMessage } from "../core/http-state.js";
import { clearSession, hasSession } from "../core/session.js";
import { renderAdminUserList } from "../features/admin/renderers.js";
import { renderProfileView } from "../features/profile/renderers.js";

const AUTH_REQUIRED_NOTICE = "Autenticacao necessaria para acessar seu perfil.";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-profile-status]"),
  profile: document.querySelector("[data-profile]"),
  adminTools: document.querySelector("[data-admin-tools]"),
  adminUsersStatus: document.querySelector("[data-admin-users-status]"),
  adminUsersList: document.querySelector("[data-admin-users-list]"),
  adminUsersRefresh: document.querySelector("[data-admin-users-refresh]"),
};

const statusFlash = createFlash(elements.status);
const adminUsersFlash = createFlash(elements.adminUsersStatus);
const state = {
  currentUserId: null,
  isDeletingUser: false,
};

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
    state.currentUserId = profile.id;
    renderProfileView(elements.profile, profile);
    statusFlash.clear();

    if (profile.role === "admin" && elements.adminTools) {
      elements.adminTools.hidden = false;
      await loadAdminUsers();
    } else if (elements.adminTools) {
      elements.adminTools.hidden = true;
    }
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

function resolveAdminUsersMessage(error) {
  return resolveAuthApiMessage(
    error,
    AUTH_REQUIRED_NOTICE,
    "Falha ao carregar a lista de usu\u00e1rios.",
  );
}

async function loadAdminUsers() {
  if (!elements.adminUsersList) {
    return;
  }

  adminUsersFlash.show("Carregando usu\u00e1rios...", "info");
  try {
    const users = await api.admin.listUsers();
    renderAdminUserList(elements.adminUsersList, users, {
      currentAdminId: state.currentUserId,
    });
    adminUsersFlash.clear();
  } catch (error) {
    adminUsersFlash.show(resolveAdminUsersMessage(error), "error");
  }
}

async function deleteUserForTesting(userId) {
  if (!userId || state.isDeletingUser) {
    return;
  }

  state.isDeletingUser = true;
  adminUsersFlash.show("Excluindo usu\u00e1rio...", "info");
  try {
    await api.admin.deleteUser(userId);
    await loadAdminUsers();
    adminUsersFlash.show("Usu\u00e1rio exclu\u00eddo e estat\u00edsticas recalculadas.", "success");
  } catch (error) {
    adminUsersFlash.show(resolveAdminUsersMessage(error), "error");
  } finally {
    state.isDeletingUser = false;
  }
}

function bindAdminEvents() {
  if (!elements.adminUsersRefresh) {
    return;
  }

  elements.adminUsersRefresh.addEventListener("click", () => {
    loadAdminUsers();
  });

  if (elements.adminUsersList) {
    elements.adminUsersList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-admin-delete-user-id]");
      if (!button || !elements.adminUsersList.contains(button)) {
        return;
      }

      const userId = String(button.dataset.adminDeleteUserId ?? "").trim();
      if (!userId) {
        return;
      }

      deleteUserForTesting(userId);
    });
  }
}

function init() {
  bindNavigation();
  navbar.refresh();
  bindAdminEvents();
  loadProfile();
}

init();

import { ApiError, api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { HOME_NOTICE_KEY, initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { resolveAuthApiMessage } from "../core/http-state.js";
import { clearSession, hasSession } from "../core/session.js";
import { renderAdminUserList } from "../features/admin/renderers.js";
import { renderProfileView } from "../features/profile/renderers.js";

const AUTH_REQUIRED_NOTICE = "Autenticação necessária para acessar seu perfil.";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
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
  isUpdatingAvatar: false,
  profile: null,
};

const navbar = initNavbar({
  loginLink: elements.loginLink,
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

function renderProfile() {
  if (!state.profile) {
    return;
  }

  renderProfileView(elements.profile, state.profile, {
    isAvatarBusy: state.isUpdatingAvatar,
  });
}

function handleAuthFailure(error) {
  if (
    error instanceof ApiError &&
    (error.code === "UNAUTHENTICATED" || error.status === 401)
  ) {
    clearSession();
    redirectToHome();
    return true;
  }

  return false;
}

async function loadProfile({ showLoading = true } = {}) {
  if (!hasSession()) {
    redirectToHome();
    return;
  }

  if (showLoading) {
    statusFlash.show("Carregando perfil...", "info");
  }

  try {
    const profile = await api.users.meProfile();
    state.currentUserId = profile.id;
    state.profile = profile;
    renderProfile();
    statusFlash.clear();

    if (profile.role === "admin" && elements.adminTools) {
      elements.adminTools.hidden = false;
      await loadAdminUsers();
    } else if (elements.adminTools) {
      elements.adminTools.hidden = true;
    }
  } catch (error) {
    if (handleAuthFailure(error)) {
      return;
    }

    statusFlash.show(resolveMessage(error), "error");
  }
}

function resolveAdminUsersMessage(error) {
  return resolveAuthApiMessage(
    error,
    AUTH_REQUIRED_NOTICE,
    "Falha ao carregar a lista de usuários.",
  );
}

async function loadAdminUsers() {
  if (!elements.adminUsersList) {
    return;
  }

  adminUsersFlash.show("Carregando usuários...", "info");
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
  adminUsersFlash.show("Excluindo usuário...", "info");
  try {
    await api.admin.deleteUser(userId);
    await loadAdminUsers();
    adminUsersFlash.show("Usuário excluído e estatísticas recalculadas.", "success");
  } catch (error) {
    adminUsersFlash.show(resolveAdminUsersMessage(error), "error");
  } finally {
    state.isDeletingUser = false;
  }
}

async function uploadAvatar(file) {
  if (!file || state.isUpdatingAvatar) {
    return;
  }

  state.isUpdatingAvatar = true;
  renderProfile();
  statusFlash.show("Enviando foto de perfil...", "info");

  try {
    const result = await api.users.uploadAvatar(file);
    if (state.profile) {
      state.profile = {
        ...state.profile,
        avatarUrl: result.avatarUrl ?? null,
        publicReputation: result.publicReputation ?? state.profile.publicReputation,
      };
    }
    statusFlash.show("Foto de perfil atualizada.", "success");
  } catch (error) {
    if (handleAuthFailure(error)) {
      return;
    }

    statusFlash.show(resolveMessage(error), "error");
  } finally {
    state.isUpdatingAvatar = false;
    renderProfile();
  }
}

async function removeAvatar() {
  if (state.isUpdatingAvatar || !state.profile?.avatarUrl) {
    return;
  }

  state.isUpdatingAvatar = true;
  renderProfile();
  statusFlash.show("Removendo foto de perfil...", "info");

  try {
    const result = await api.users.deleteAvatar();
    if (state.profile) {
      state.profile = {
        ...state.profile,
        avatarUrl: result.avatarUrl ?? null,
        publicReputation: result.publicReputation ?? state.profile.publicReputation,
      };
    }
    statusFlash.show("Foto de perfil removida.", "success");
  } catch (error) {
    if (handleAuthFailure(error)) {
      return;
    }

    statusFlash.show(resolveMessage(error), "error");
  } finally {
    state.isUpdatingAvatar = false;
    renderProfile();
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

function bindProfileEvents() {
  if (!elements.profile) {
    return;
  }

  elements.profile.addEventListener("change", (event) => {
    const input = event.target.closest("[data-avatar-input]");
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const [file] = Array.from(input.files ?? []);
    input.value = "";
    uploadAvatar(file ?? null);
  });

  elements.profile.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-avatar]");
    if (!removeButton || !elements.profile.contains(removeButton)) {
      return;
    }

    removeAvatar();
  });
}

function init() {
  bindNavigation();
  navbar.refresh();
  bindAdminEvents();
  bindProfileEvents();
  loadProfile();
}

init();

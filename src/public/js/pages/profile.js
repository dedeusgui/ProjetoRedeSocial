import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import {
  applyDestructiveActionUi,
  bindManagedDialog,
} from "../components/destructive-confirmation.js";
import { HOME_NOTICE_KEY, initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { resolveAuthApiMessage } from "../core/http-state.js";
import { clearSession, hasSession } from "../core/session.js";
import { renderAdminDeleteUserPreview, renderAdminUserList } from "../features/admin/renderers.js";
import { renderProfilePostList } from "../features/profile/content-renderers.js";
import { renderProfileView } from "../features/profile/renderers.js";
import { createPostModalController } from "../features/posts/post-modal.js";

const AUTH_REQUIRED_NOTICE = "Authentication required to access your profile.";
const ACCOUNT_DELETED_NOTICE = "Your account was permanently deleted.";
const DELETE_ACCOUNT_CONFIRMATION = "DELETE";
const DELETE_ACCOUNT_BLOCKED_NOTICE = "Admin accounts cannot be deleted from the profile page.";
const DELETE_USER_ROLE_BLOCKED_NOTICE = "Only standard users can be deleted from the admin tools.";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-profile-status]"),
  profile: document.querySelector("[data-profile]"),
  postsStatus: document.querySelector("[data-profile-posts-status]"),
  posts: document.querySelector("[data-profile-posts]"),
  adminTools: document.querySelector("[data-admin-tools]"),
  adminUsersStatus: document.querySelector("[data-admin-users-status]"),
  adminUsersList: document.querySelector("[data-admin-users-list]"),
  adminUsersRefresh: document.querySelector("[data-admin-users-refresh]"),
  adminDeleteUserModal: document.querySelector("[data-admin-delete-user-modal]"),
  adminDeleteUserForm: document.querySelector("[data-admin-delete-user-form]"),
  adminDeleteUserTitle: document.querySelector("[data-admin-delete-user-title]"),
  adminDeleteUserDescription: document.querySelector("[data-admin-delete-user-description]"),
  adminDeleteUserSummary: document.querySelector("[data-admin-delete-user-summary]"),
  adminDeleteImpactSection: document.querySelector("[data-admin-delete-impact-section]"),
  adminDeleteImpactLead: document.querySelector("[data-admin-delete-impact-lead]"),
  adminDeleteImpactList: document.querySelector("[data-admin-delete-impact-list]"),
  adminDeleteConfirmationSection: document.querySelector("[data-admin-delete-confirmation-section]"),
  adminDeleteConfirmationHandle: document.querySelector("[data-admin-delete-confirmation-handle]"),
  adminDeleteConfirmationInput: document.querySelector("[data-admin-delete-confirmation]"),
  adminDeleteUserCancelButton: document.querySelector("[data-admin-delete-user-cancel]"),
  adminDeleteUserConfirmButton: document.querySelector("[data-admin-delete-user-confirm]"),
  adminDeleteUserStatus: document.querySelector("[data-admin-delete-user-status]"),
  dangerZone: document.querySelector("[data-profile-danger-zone]"),
  deleteAccountNote: document.querySelector("[data-delete-account-note]"),
  openDeleteAccountModalButton: document.querySelector("[data-open-delete-account-modal]"),
  deleteAccountModal: document.querySelector("[data-delete-account-modal]"),
  deleteAccountForm: document.querySelector("[data-delete-account-form]"),
  deleteAccountTitle: document.querySelector("[data-delete-account-title]"),
  deleteAccountDescription: document.querySelector("[data-delete-account-description]"),
  deleteAccountUsername: document.querySelector("[data-delete-account-username]"),
  deleteAccountConfirmationInput: document.querySelector("[data-delete-account-confirmation]"),
  deleteAccountCancelButton: document.querySelector("[data-delete-account-cancel]"),
  deleteAccountSubmitButton: document.querySelector("[data-delete-account-submit]"),
  deleteAccountStatus: document.querySelector("[data-delete-account-status]"),
  openPostModalButton: document.querySelector("[data-open-post-modal]"),
  postModal: document.querySelector("[data-post-modal]"),
  postModalTitle: document.querySelector("[data-post-modal-title]"),
  postModalCancelButton: document.querySelector("[data-post-modal-cancel]"),
  postModalSubmitButton: document.querySelector("[data-post-modal-submit]"),
  postModalForm: document.querySelector("[data-post-modal-form]"),
  postModalStatus: document.querySelector("[data-post-modal-status]"),
  postMediaInput: document.querySelector("[data-post-media-input]"),
  postPreviousSelect: document.querySelector("[data-post-previous-select]"),
  selectedPostMedia: document.querySelector("[data-selected-post-media]"),
  existingPostMedia: document.querySelector("[data-existing-post-media]"),
  questionnaireEditor: document.querySelector("[data-post-questionnaire-editor]"),
};

const statusFlash = createFlash(elements.status);
const postsFlash = createFlash(elements.postsStatus);
const adminUsersFlash = createFlash(elements.adminUsersStatus);
const adminDeleteUserFlash = createFlash(elements.adminDeleteUserStatus);
const deleteAccountFlash = createFlash(elements.deleteAccountStatus);

const state = {
  currentUserId: null,
  pendingAdminDeleteUserId: null,
  adminDeletePreview: null,
  isDeletingUser: false,
  isLoadingAdminDeletePreview: false,
  isDeletingAccount: false,
  isUpdatingAvatar: false,
  isAvatarMenuOpen: false,
  profile: null,
  posts: [],
};

const navbar = initNavbar({
  loginLink: elements.loginLink,
  logoutButton: elements.logoutButton,
  protectedButtons: [elements.openPostModalButton],
  logoutRedirectUrl: "./index.html",
});

function resolveMessage(error) {
  return resolveAuthApiMessage(
    error,
    AUTH_REQUIRED_NOTICE,
    "Unexpected error while communicating with the API.",
  );
}

function resolveDeleteAccountMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Authentication required to delete your account.",
    "Could not delete your account.",
  );
}

function redirectToHome(noticeMessage = AUTH_REQUIRED_NOTICE) {
  try {
    window.sessionStorage.setItem(HOME_NOTICE_KEY, noticeMessage);
  } catch {
    // noop
  }

  window.location.href = "./index.html";
}

function renderProfile() {
  if (!state.profile) {
    if (elements.dangerZone) {
      elements.dangerZone.hidden = true;
    }
    return;
  }

  renderProfileView(elements.profile, state.profile, {
    isAvatarBusy: state.isUpdatingAvatar,
    isAvatarMenuOpen: state.isAvatarMenuOpen,
  });
  syncDeleteAccountAvailability();
}

function getAvatarMenuRoot() {
  return elements.profile?.querySelector("[data-avatar-menu-root]") ?? null;
}

function getAvatarMenuToggle() {
  return elements.profile?.querySelector("[data-avatar-menu-toggle]") ?? null;
}

function getAvatarInput() {
  const input = elements.profile?.querySelector("[data-avatar-input]");
  return input instanceof HTMLInputElement ? input : null;
}

function getFirstAvatarAction() {
  const actions = Array.from(
    elements.profile?.querySelectorAll("[data-upload-avatar], [data-remove-avatar]") ?? [],
  );

  return actions.find((action) => action instanceof HTMLButtonElement && !action.disabled) ?? null;
}

function setAvatarMenuOpen(nextValue, { focusTarget = "none" } = {}) {
  if (state.isAvatarMenuOpen === nextValue && focusTarget === "none") {
    return;
  }

  state.isAvatarMenuOpen = nextValue;
  renderProfile();

  if (focusTarget === "menu" && nextValue) {
    getFirstAvatarAction()?.focus();
    return;
  }

  if (focusTarget === "toggle") {
    getAvatarMenuToggle()?.focus();
  }
}

function closeAvatarMenu({ focusTarget = "none" } = {}) {
  if (!state.isAvatarMenuOpen) {
    return;
  }

  setAvatarMenuOpen(false, { focusTarget });
}

function renderOwnedContent() {
  renderProfilePostList(elements.posts, state.posts);
}

function getAdminDeleteConfirmationValue() {
  const username = String(state.adminDeletePreview?.user?.username ?? "").trim();
  return username ? `@${username}` : "";
}

function canDeleteManagedUser(preview = state.adminDeletePreview) {
  return Boolean(preview?.canDelete) && String(preview?.user?.role ?? "") === "user";
}

function requiresAdminDeleteUsernameConfirmation(preview = state.adminDeletePreview) {
  return canDeleteManagedUser(preview) && preview?.riskLevel === "level_2";
}

function renderAdminDeleteUserState() {
  renderAdminDeleteUserPreview(
    {
      summaryTarget: elements.adminDeleteUserSummary,
      impactLeadTarget: elements.adminDeleteImpactLead,
      impactListTarget: elements.adminDeleteImpactList,
    },
    state.adminDeletePreview,
  );
}

function updateAdminDeleteUserModalUi() {
  const content = applyDestructiveActionUi({
    actionKey: "admin.user.delete",
    titleTarget: elements.adminDeleteUserTitle,
    descriptionTarget: elements.adminDeleteUserDescription,
    cancelButton: elements.adminDeleteUserCancelButton,
    confirmButton: elements.adminDeleteUserConfirmButton,
    isBusy: state.isDeletingUser,
  });
  const requiresConfirmation = requiresAdminDeleteUsernameConfirmation();
  const expectedConfirmation = getAdminDeleteConfirmationValue();
  const confirmationValue = elements.adminDeleteConfirmationInput?.value ?? "";
  const canConfirmDeletion =
    canDeleteManagedUser() &&
    !state.isLoadingAdminDeletePreview &&
    !state.isDeletingUser &&
    (!requiresConfirmation || confirmationValue === expectedConfirmation);

  if (elements.adminDeleteImpactSection) {
    elements.adminDeleteImpactSection.hidden = !requiresConfirmation;
  }

  if (elements.adminDeleteConfirmationSection) {
    elements.adminDeleteConfirmationSection.hidden = !requiresConfirmation;
  }

  if (elements.adminDeleteConfirmationHandle) {
    elements.adminDeleteConfirmationHandle.textContent = expectedConfirmation || "@username";
  }

  if (elements.adminDeleteConfirmationInput) {
    elements.adminDeleteConfirmationInput.disabled =
      state.isLoadingAdminDeletePreview ||
      state.isDeletingUser ||
      !requiresConfirmation;
  }

  if (elements.adminDeleteUserCancelButton) {
    elements.adminDeleteUserCancelButton.disabled = state.isDeletingUser;
  }

  if (elements.adminDeleteUserConfirmButton) {
    elements.adminDeleteUserConfirmButton.disabled = !canConfirmDeletion;
    elements.adminDeleteUserConfirmButton.textContent = state.isDeletingUser
      ? content.busyLabel
      : content.confirmLabel;
  }
}

function resetAdminDeleteUserModalState() {
  state.pendingAdminDeleteUserId = null;
  state.adminDeletePreview = null;
  state.isDeletingUser = false;
  state.isLoadingAdminDeletePreview = false;
  elements.adminDeleteUserForm?.reset();
  adminDeleteUserFlash.clear();
  renderAdminDeleteUserState();
  updateAdminDeleteUserModalUi();
}

function closeAdminDeleteUserModal({ force = false } = {}) {
  if (!force && state.isDeletingUser) {
    return;
  }

  if (!elements.adminDeleteUserModal?.open) {
    return;
  }

  elements.adminDeleteUserModal.close();
}

function canDeleteOwnAccount() {
  return Boolean(state.profile) && state.profile.role !== "admin";
}

function syncDeleteAccountAvailability() {
  if (!elements.dangerZone || !state.profile) {
    return;
  }

  elements.dangerZone.hidden = false;

  if (elements.deleteAccountUsername) {
    elements.deleteAccountUsername.textContent = `@${state.profile.username ?? "user"}`;
  }

  if (elements.deleteAccountNote) {
    const blockedMessage = canDeleteOwnAccount() ? "" : DELETE_ACCOUNT_BLOCKED_NOTICE;
    elements.deleteAccountNote.textContent = blockedMessage;
    elements.deleteAccountNote.hidden = !blockedMessage;
    if (blockedMessage) {
      elements.deleteAccountNote.dataset.state = "error";
    } else {
      delete elements.deleteAccountNote.dataset.state;
    }
  }

  if (elements.openDeleteAccountModalButton) {
    elements.openDeleteAccountModalButton.disabled = !canDeleteOwnAccount() || state.isDeletingAccount;
  }

  updateDeleteAccountModalUi();

  if (!canDeleteOwnAccount() && elements.deleteAccountModal?.open && !state.isDeletingAccount) {
    elements.deleteAccountModal.close();
  }
}

function updateDeleteAccountModalUi() {
  const content = applyDestructiveActionUi({
    actionKey: "account.delete",
    titleTarget: elements.deleteAccountTitle,
    descriptionTarget: elements.deleteAccountDescription,
    cancelButton: elements.deleteAccountCancelButton,
    confirmButton: elements.deleteAccountSubmitButton,
    isBusy: state.isDeletingAccount,
  });
  const confirmationValue = elements.deleteAccountConfirmationInput?.value ?? "";
  const canConfirmDeletion =
    canDeleteOwnAccount() &&
    confirmationValue === DELETE_ACCOUNT_CONFIRMATION &&
    !state.isDeletingAccount;

  if (elements.deleteAccountConfirmationInput) {
    elements.deleteAccountConfirmationInput.disabled = state.isDeletingAccount || !canDeleteOwnAccount();
  }

  if (elements.deleteAccountCancelButton) {
    elements.deleteAccountCancelButton.disabled = state.isDeletingAccount;
  }

  if (elements.deleteAccountSubmitButton) {
    elements.deleteAccountSubmitButton.disabled = !canConfirmDeletion;
    elements.deleteAccountSubmitButton.textContent = state.isDeletingAccount
      ? content.busyLabel
      : content.confirmLabel;
  }
}

function resetDeleteAccountModalState() {
  elements.deleteAccountForm?.reset();
  deleteAccountFlash.clear();
  updateDeleteAccountModalUi();
}

function closeDeleteAccountModal() {
  if (state.isDeletingAccount || !elements.deleteAccountModal?.open) {
    return;
  }

  elements.deleteAccountModal.close();
}

function openDeleteAccountModal() {
  if (!state.profile) {
    return;
  }

  if (!canDeleteOwnAccount()) {
    statusFlash.show(DELETE_ACCOUNT_BLOCKED_NOTICE, "error");
    return;
  }

  resetDeleteAccountModalState();
  elements.deleteAccountModal?.showModal();
  elements.deleteAccountConfirmationInput?.focus();
}

function handleAuthFailure(error) {
  if (error?.code === "UNAUTHENTICATED" || error?.status === 401) {
    clearSession();
    redirectToHome();
    return true;
  }

  return false;
}

async function refreshOwnedContent() {
  const posts = await api.posts.listMine();
  state.posts = Array.isArray(posts) ? posts : [];
  renderOwnedContent();
}

async function loadProfile({ showLoading = true } = {}) {
  if (!hasSession()) {
    redirectToHome();
    return;
  }

  if (showLoading) {
    statusFlash.show("Loading profile...", "info");
    postsFlash.show("Loading posts...", "info");
  }

  try {
    const [profile, posts] = await Promise.all([
      api.users.meProfile(),
      api.posts.listMine(),
    ]);
    state.currentUserId = profile.id;
    state.isAvatarMenuOpen = false;
    state.profile = profile;
    state.posts = Array.isArray(posts) ? posts : [];
    renderProfile();
    renderOwnedContent();
    statusFlash.clear();
    postsFlash.clear();

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
    postsFlash.show(resolveMessage(error), "error");
  }
}

function resolveAdminUsersMessage(error) {
  return resolveAuthApiMessage(
    error,
    AUTH_REQUIRED_NOTICE,
    "Could not load the user list.",
  );
}

function resolveAdminDeleteUserMessage(error, fallbackMessage = "Could not load the deletion preview.") {
  return resolveAuthApiMessage(
    error,
    AUTH_REQUIRED_NOTICE,
    fallbackMessage,
  );
}

async function loadAdminUsers() {
  if (!elements.adminUsersList) {
    return;
  }

  adminUsersFlash.show("Loading users...", "info");
  try {
    const users = await api.admin.listUsers();
    renderAdminUserList(elements.adminUsersList, users, {
      currentAdminId: state.currentUserId,
    });
    adminUsersFlash.clear();
  } catch (error) {
    if (handleAuthFailure(error)) {
      return;
    }

    adminUsersFlash.show(resolveAdminUsersMessage(error), "error");
  }
}

async function openAdminDeleteUserModal(userId) {
  const resolvedUserId = String(userId ?? "").trim();
  if (!resolvedUserId || state.isDeletingUser || state.isLoadingAdminDeletePreview) {
    return;
  }

  state.pendingAdminDeleteUserId = resolvedUserId;
  state.adminDeletePreview = null;
  state.isLoadingAdminDeletePreview = true;
  elements.adminDeleteUserForm?.reset();
  renderAdminDeleteUserState();
  updateAdminDeleteUserModalUi();
  adminDeleteUserFlash.show("Loading deletion impact...", "info");
  elements.adminDeleteUserModal?.showModal();

  window.requestAnimationFrame(() => {
    elements.adminDeleteUserCancelButton?.focus();
  });

  try {
    const preview = await api.admin.getDeletePreview(resolvedUserId);

    if (String(state.pendingAdminDeleteUserId ?? "") !== resolvedUserId) {
      return;
    }

    state.adminDeletePreview = preview;
    renderAdminDeleteUserState();
    updateAdminDeleteUserModalUi();

    if (!canDeleteManagedUser(preview)) {
      const message = preview?.blockingReason ?? DELETE_USER_ROLE_BLOCKED_NOTICE;
      adminDeleteUserFlash.show(message, "error");
      adminUsersFlash.show(message, "error");
      return;
    }

    adminDeleteUserFlash.clear();
  } catch (error) {
    if (handleAuthFailure(error)) {
      return;
    }

    const message = resolveAdminDeleteUserMessage(error);
    adminDeleteUserFlash.show(message, "error");
    adminUsersFlash.show(message, "error");
  } finally {
    if (String(state.pendingAdminDeleteUserId ?? "") === resolvedUserId) {
      state.isLoadingAdminDeletePreview = false;
      updateAdminDeleteUserModalUi();
    }
  }
}

async function deleteManagedUser(event) {
  event.preventDefault();

  const preview = state.adminDeletePreview;
  const userId = String(preview?.user?.id ?? state.pendingAdminDeleteUserId ?? "").trim();
  if (!userId || state.isDeletingUser || state.isLoadingAdminDeletePreview) {
    return;
  }

  if (!canDeleteManagedUser(preview)) {
    const message = preview?.blockingReason ?? DELETE_USER_ROLE_BLOCKED_NOTICE;
    adminDeleteUserFlash.show(message, "error");
    adminUsersFlash.show(message, "error");
    updateAdminDeleteUserModalUi();
    return;
  }

  if (
    requiresAdminDeleteUsernameConfirmation(preview) &&
    (elements.adminDeleteConfirmationInput?.value ?? "") !== getAdminDeleteConfirmationValue()
  ) {
    updateAdminDeleteUserModalUi();
    return;
  }

  state.isDeletingUser = true;
  updateAdminDeleteUserModalUi();
  adminDeleteUserFlash.show("Deleting user...", "info");
  adminUsersFlash.show("Deleting user...", "info");

  try {
    await api.admin.deleteUser(userId);
    closeAdminDeleteUserModal({ force: true });
    await loadAdminUsers();
    adminUsersFlash.show("User deleted and statistics recalculated.", "success");
  } catch (error) {
    if (handleAuthFailure(error)) {
      return;
    }

    const message = resolveAdminDeleteUserMessage(error, "Could not delete the user.");
    adminDeleteUserFlash.show(message, "error");
    adminUsersFlash.show(message, "error");
  } finally {
    state.isDeletingUser = false;
    updateAdminDeleteUserModalUi();
  }
}

async function deleteOwnAccount(event) {
  event.preventDefault();

  if (state.isDeletingAccount || !canDeleteOwnAccount()) {
    return;
  }

  if ((elements.deleteAccountConfirmationInput?.value ?? "") !== DELETE_ACCOUNT_CONFIRMATION) {
    updateDeleteAccountModalUi();
    return;
  }

  state.isDeletingAccount = true;
  syncDeleteAccountAvailability();
  deleteAccountFlash.show("Deleting account...", "info");

  try {
    await api.users.deleteMe();
    clearSession();
    redirectToHome(ACCOUNT_DELETED_NOTICE);
  } catch (error) {
    if (handleAuthFailure(error)) {
      return;
    }

    deleteAccountFlash.show(resolveDeleteAccountMessage(error), "error");
  } finally {
    state.isDeletingAccount = false;
    syncDeleteAccountAvailability();
  }
}

async function uploadAvatar(file) {
  if (!file || state.isUpdatingAvatar) {
    return;
  }

  state.isAvatarMenuOpen = false;
  state.isUpdatingAvatar = true;
  renderProfile();
  statusFlash.show("Uploading profile image...", "info");

  try {
    const result = await api.users.uploadAvatar(file);
    if (state.profile) {
      state.profile = {
        ...state.profile,
        avatarUrl: result.avatarUrl ?? null,
        publicReputation: result.publicReputation ?? state.profile.publicReputation,
      };
    }
    statusFlash.show("Profile image updated.", "success");
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

  state.isAvatarMenuOpen = false;
  state.isUpdatingAvatar = true;
  renderProfile();
  statusFlash.show("Removing profile image...", "info");

  try {
    const result = await api.users.deleteAvatar();
    if (state.profile) {
      state.profile = {
        ...state.profile,
        avatarUrl: result.avatarUrl ?? null,
        publicReputation: result.publicReputation ?? state.profile.publicReputation,
      };
    }
    statusFlash.show("Profile image removed.", "success");
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

function getManagedPost(postId) {
  return state.posts.find((item) => String(item.id) === String(postId));
}

async function submitPostCreate(payload) {
  return api.posts.create(payload);
}

async function submitPostUpdate(postId, payload) {
  return api.posts.update(postId, payload);
}

const postModalController = createPostModalController({
  modal: elements.postModal,
  form: elements.postModalForm,
  title: elements.postModalTitle,
  submitButton: elements.postModalSubmitButton,
  cancelButton: elements.postModalCancelButton,
  statusTarget: elements.postModalStatus,
  openCreateButton: elements.openPostModalButton,
  mediaInput: elements.postMediaInput,
  previousPostSelect: elements.postPreviousSelect,
  selectedMediaTarget: elements.selectedPostMedia,
  existingMediaTarget: elements.existingPostMedia,
  questionnaireTarget: elements.questionnaireEditor,
  resolveErrorMessage: resolveMessage,
  loadOwnedPosts() {
    return api.posts.listMine();
  },
  onBeforeOpenCreate() {
    if (!hasSession()) {
      statusFlash.show("Sign in to publish posts.", "error");
      redirectToHome();
      return false;
    }
    return true;
  },
  onBeforeOpenEdit(post) {
    const isOwner = String(post?.author?.id ?? state.currentUserId ?? "") === String(state.currentUserId ?? "");
    if (!hasSession() || !isOwner) {
      postsFlash.show("Only the author can edit this post.", "error");
      return false;
    }
    return true;
  },
  submitPostCreate,
  submitPostUpdate,
  uploadPostMedia(postId, files) {
    return api.posts.uploadMedia(postId, files);
  },
  deletePostMedia(postId, mediaId) {
    return api.posts.deleteMedia(postId, mediaId);
  },
  async onMediaChanged() {
    await refreshOwnedContent();
  },
  async onAfterSuccess({ mode, mediaError, mediaErrorMessage }) {
    await refreshOwnedContent();
    if (mode === "edit") {
      postsFlash.show(
        mediaError
          ? `Post updated, but the images could not be uploaded: ${mediaErrorMessage ?? "check the selected files."}`
          : "Post updated.",
        mediaError ? "error" : "success",
      );
      return;
    }

    postsFlash.show(
      mediaError
        ? `Post published, but the images could not be uploaded: ${mediaErrorMessage ?? "check the selected files."}`
        : "Post published.",
      mediaError ? "error" : "success",
    );
  },
});

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
      if (userId) {
        openAdminDeleteUserModal(userId);
      }
    });
  }

  elements.adminDeleteConfirmationInput?.addEventListener("input", () => {
    updateAdminDeleteUserModalUi();
  });

  elements.adminDeleteUserCancelButton?.addEventListener("click", () => {
    closeAdminDeleteUserModal();
  });

  elements.adminDeleteUserForm?.addEventListener("submit", deleteManagedUser);

  bindManagedDialog({
    dialog: elements.adminDeleteUserModal,
    requestClose: () => {
      closeAdminDeleteUserModal();
    },
    canClose: () => !state.isDeletingUser,
    onClosed: resetAdminDeleteUserModalState,
  });
}

function bindDeleteAccountEvents() {
  elements.openDeleteAccountModalButton?.addEventListener("click", openDeleteAccountModal);

  elements.deleteAccountCancelButton?.addEventListener("click", closeDeleteAccountModal);

  elements.deleteAccountConfirmationInput?.addEventListener("input", () => {
    updateDeleteAccountModalUi();
  });

  elements.deleteAccountForm?.addEventListener("submit", deleteOwnAccount);

  bindManagedDialog({
    dialog: elements.deleteAccountModal,
    requestClose: closeDeleteAccountModal,
    canClose: () => !state.isDeletingAccount,
    onClosed: resetDeleteAccountModalState,
  });
}

function bindProfileEvents() {
  if (elements.profile) {
    elements.profile.addEventListener("change", (event) => {
      const input = event.target.closest("[data-avatar-input]");
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      const [file] = Array.from(input.files ?? []);
      closeAvatarMenu();
      input.value = "";
      if (file) {
        uploadAvatar(file);
      }
    });

    elements.profile.addEventListener("click", (event) => {
      const toggleButton = event.target.closest("[data-avatar-menu-toggle]");
      if (toggleButton && elements.profile.contains(toggleButton)) {
        event.stopPropagation();
        setAvatarMenuOpen(!state.isAvatarMenuOpen, {
          focusTarget: state.isAvatarMenuOpen ? "toggle" : "menu",
        });
        return;
      }

      const uploadButton = event.target.closest("[data-upload-avatar]");
      if (uploadButton && elements.profile.contains(uploadButton)) {
        event.stopPropagation();
        const input = getAvatarInput();
        if (!input || input.disabled) {
          return;
        }

        input.click();
        return;
      }

      const removeButton = event.target.closest("[data-remove-avatar]");
      if (removeButton && elements.profile.contains(removeButton)) {
        event.stopPropagation();
        removeAvatar();
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (!state.isAvatarMenuOpen) {
      return;
    }

    const root = getAvatarMenuRoot();
    if (root && event.target instanceof Node && root.contains(event.target)) {
      return;
    }

    closeAvatarMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !state.isAvatarMenuOpen) {
      return;
    }

    event.preventDefault();
    closeAvatarMenu({ focusTarget: "toggle" });
  });

  if (elements.posts) {
    elements.posts.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-manage-edit-post-id]");
      if (editButton && elements.posts.contains(editButton)) {
        const postId = String(editButton.dataset.manageEditPostId ?? "").trim();
        const post = getManagedPost(postId);
        if (post) {
          postModalController.openPostModalEdit(post);
        }
        return;
      }

      const continueButton = event.target.closest("[data-manage-continue-post-id]");
      if (continueButton && elements.posts.contains(continueButton)) {
        const postId = String(continueButton.dataset.manageContinuePostId ?? "").trim();
        if (postId) {
          postModalController.openPostModalCreate({ previousPostId: postId });
        }
      }
    });
  }
}

async function init() {
  bindNavigation();
  navbar.refresh();
  bindAdminEvents();
  bindDeleteAccountEvents();
  bindProfileEvents();
  await loadProfile();
}

init();

import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { HOME_NOTICE_KEY, initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { resolveAuthApiMessage } from "../core/http-state.js";
import { clearSession, hasSession } from "../core/session.js";
import { renderAdminUserList } from "../features/admin/renderers.js";
import { renderProfilePostList } from "../features/profile/content-renderers.js";
import { renderProfileView } from "../features/profile/renderers.js";
import { createPostModalController } from "../features/posts/post-modal.js";

const AUTH_REQUIRED_NOTICE = "Authentication required to access your profile.";

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

const state = {
  currentUserId: null,
  isDeletingUser: false,
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
    return;
  }

  renderProfileView(elements.profile, state.profile, {
    isAvatarBusy: state.isUpdatingAvatar,
    isAvatarMenuOpen: state.isAvatarMenuOpen,
  });
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
    adminUsersFlash.show(resolveAdminUsersMessage(error), "error");
  }
}

async function deleteUserForTesting(userId) {
  if (!userId || state.isDeletingUser) {
    return;
  }

  state.isDeletingUser = true;
  adminUsersFlash.show("Deleting user...", "info");
  try {
    await api.admin.deleteUser(userId);
    await loadAdminUsers();
    adminUsersFlash.show("User deleted and statistics recalculated.", "success");
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
        deleteUserForTesting(userId);
      }
    });
  }
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
  bindProfileEvents();
  await loadProfile();
}

init();

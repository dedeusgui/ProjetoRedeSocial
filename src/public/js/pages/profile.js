import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { HOME_NOTICE_KEY, initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { parseCsvTags } from "../core/formatters.js";
import { resolveAuthApiMessage } from "../core/http-state.js";
import { clearSession, hasSession } from "../core/session.js";
import { renderAdminUserList } from "../features/admin/renderers.js";
import { renderProfileCollectionList, renderProfilePostList } from "../features/profile/content-renderers.js";
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
  collectionsStatus: document.querySelector("[data-profile-collections-status]"),
  collections: document.querySelector("[data-profile-collections]"),
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
  openCollectionModalButton: document.querySelector("[data-open-collection-modal]"),
  collectionModal: document.querySelector("[data-collection-modal]"),
  collectionModalTitle: document.querySelector("[data-collection-modal-title]"),
  collectionModalCancelButton: document.querySelector("[data-collection-modal-cancel]"),
  collectionModalSubmitButton: document.querySelector("[data-collection-modal-submit]"),
  collectionModalForm: document.querySelector("[data-collection-modal-form]"),
  collectionModalStatus: document.querySelector("[data-collection-modal-status]"),
};

const statusFlash = createFlash(elements.status);
const postsFlash = createFlash(elements.postsStatus);
const collectionsFlash = createFlash(elements.collectionsStatus);
const adminUsersFlash = createFlash(elements.adminUsersStatus);
const collectionModalFlash = createFlash(elements.collectionModalStatus);

const state = {
  currentUserId: null,
  isDeletingUser: false,
  isUpdatingAvatar: false,
  isMutatingCollection: false,
  profile: null,
  posts: [],
  collections: [],
  editingCollectionId: null,
  avatarFileLabel: "No file selected.",
};

const navbar = initNavbar({
  loginLink: elements.loginLink,
  logoutButton: elements.logoutButton,
  protectedButtons: [elements.openPostModalButton, elements.openCollectionModalButton],
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
    avatarFileLabel: state.avatarFileLabel,
  });
}

function renderOwnedContent() {
  renderProfilePostList(elements.posts, state.posts);
  renderProfileCollectionList(elements.collections, state.collections, {
    availablePosts: state.posts,
  });
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
  const [posts, collections] = await Promise.all([
    api.posts.listMine(),
    api.collections.listMine(),
  ]);
  state.posts = Array.isArray(posts) ? posts : [];
  state.collections = Array.isArray(collections) ? collections : [];
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
    collectionsFlash.show("Loading collections...", "info");
  }

  try {
    const [profile, posts, collections] = await Promise.all([
      api.users.meProfile(),
      api.posts.listMine(),
      api.collections.listMine(),
    ]);
    state.currentUserId = profile.id;
    state.profile = profile;
    state.posts = Array.isArray(posts) ? posts : [];
    state.collections = Array.isArray(collections) ? collections : [];
    renderProfile();
    renderOwnedContent();
    statusFlash.clear();
    postsFlash.clear();
    collectionsFlash.clear();

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
    collectionsFlash.show(resolveMessage(error), "error");
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
    state.avatarFileLabel = "No file selected.";
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
    state.avatarFileLabel = "No file selected.";
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

function getManagedCollection(collectionId) {
  return state.collections.find((item) => String(item.id) === String(collectionId));
}

function resetCollectionModal() {
  state.editingCollectionId = null;
  elements.collectionModalForm?.reset();
  if (elements.collectionModalTitle) {
    elements.collectionModalTitle.textContent = "New collection";
  }
  if (elements.collectionModalSubmitButton) {
    elements.collectionModalSubmitButton.textContent = "Save collection";
  }
  collectionModalFlash.clear();
}

function openCollectionModalCreate() {
  resetCollectionModal();
  elements.collectionModal?.showModal();
}

function openCollectionModalEdit(collectionId) {
  const collection = getManagedCollection(collectionId);
  if (!collection || !elements.collectionModalForm) {
    return;
  }

  resetCollectionModal();
  state.editingCollectionId = String(collectionId);
  elements.collectionModalForm.querySelector("[name='title']").value = collection.title ?? "";
  elements.collectionModalForm.querySelector("[name='description']").value = collection.description ?? "";
  elements.collectionModalForm.querySelector("[name='tags']").value = Array.isArray(collection.tags)
    ? collection.tags.join(", ")
    : "";
  if (elements.collectionModalTitle) {
    elements.collectionModalTitle.textContent = "Edit collection";
  }
  if (elements.collectionModalSubmitButton) {
    elements.collectionModalSubmitButton.textContent = "Save changes";
  }
  elements.collectionModal?.showModal();
}

async function submitCollectionModal(event) {
  event.preventDefault();
  if (!elements.collectionModalForm || state.isMutatingCollection) {
    return;
  }

  const formData = new FormData(elements.collectionModalForm);
  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    tags: parseCsvTags(formData.get("tags")),
  };

  state.isMutatingCollection = true;
  collectionModalFlash.show(
    state.editingCollectionId ? "Saving collection changes..." : "Creating collection...",
    "info",
  );

  try {
    if (state.editingCollectionId) {
      await api.collections.update(state.editingCollectionId, payload);
      collectionsFlash.show("Collection updated.", "success");
    } else {
      await api.collections.create(payload);
      collectionsFlash.show("Collection created.", "success");
    }

    await refreshOwnedContent();
    elements.collectionModal?.close();
  } catch (error) {
    collectionModalFlash.show(resolveMessage(error), "error");
  } finally {
    state.isMutatingCollection = false;
  }
}

async function deleteCollection(collectionId) {
  if (!collectionId || state.isMutatingCollection) {
    return;
  }

  state.isMutatingCollection = true;
  collectionsFlash.show("Deleting collection...", "info");
  try {
    await api.collections.delete(collectionId);
    await refreshOwnedContent();
    collectionsFlash.show("Collection deleted.", "success");
  } catch (error) {
    collectionsFlash.show(resolveMessage(error), "error");
  } finally {
    state.isMutatingCollection = false;
  }
}

async function addPostToCollection(collectionId, postId) {
  if (!collectionId || !postId || state.isMutatingCollection) {
    return;
  }

  state.isMutatingCollection = true;
  collectionsFlash.show("Adding post to collection...", "info");
  try {
    await api.collections.addItems(collectionId, [postId]);
    await refreshOwnedContent();
    collectionsFlash.show("Post added to the collection.", "success");
  } catch (error) {
    collectionsFlash.show(resolveMessage(error), "error");
  } finally {
    state.isMutatingCollection = false;
  }
}

async function removePostFromCollection(collectionId, postId) {
  if (!collectionId || !postId || state.isMutatingCollection) {
    return;
  }

  state.isMutatingCollection = true;
  collectionsFlash.show("Removing post from collection...", "info");
  try {
    await api.collections.removeItem(collectionId, postId);
    await refreshOwnedContent();
    collectionsFlash.show("Post removed from the collection.", "success");
  } catch (error) {
    collectionsFlash.show(resolveMessage(error), "error");
  } finally {
    state.isMutatingCollection = false;
  }
}

async function reorderCollectionItem(collectionId, postId, direction) {
  const collection = getManagedCollection(collectionId);
  if (!collection || state.isMutatingCollection) {
    return;
  }

  const items = Array.isArray(collection.items) ? [...collection.items] : [];
  const index = items.findIndex((item) => String(item.id) === String(postId));
  if (index === -1) {
    return;
  }

  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return;
  }

  const [moved] = items.splice(index, 1);
  items.splice(nextIndex, 0, moved);

  state.isMutatingCollection = true;
  collectionsFlash.show("Reordering collection...", "info");
  try {
    await api.collections.reorderItems(collectionId, items.map((item) => item.id));
    await refreshOwnedContent();
    collectionsFlash.show("Collection reordered.", "success");
  } catch (error) {
    collectionsFlash.show(resolveMessage(error), "error");
  } finally {
    state.isMutatingCollection = false;
  }
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
      state.avatarFileLabel = file?.name ? String(file.name) : "No file selected.";
      renderProfile();
      input.value = "";
      if (file) {
        uploadAvatar(file);
      }
    });

    elements.profile.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-avatar]");
      if (removeButton && elements.profile.contains(removeButton)) {
        removeAvatar();
      }
    });
  }

  if (elements.openCollectionModalButton) {
    elements.openCollectionModalButton.addEventListener("click", () => {
      if (!hasSession()) {
        statusFlash.show(AUTH_REQUIRED_NOTICE, "error");
        redirectToHome();
        return;
      }
      openCollectionModalCreate();
    });
  }

  if (elements.collectionModalCancelButton) {
    elements.collectionModalCancelButton.addEventListener("click", () => {
      elements.collectionModal?.close();
    });
  }

  if (elements.collectionModal) {
    elements.collectionModal.addEventListener("click", (event) => {
      if (event.target === elements.collectionModal) {
        elements.collectionModal.close();
      }
    });
    elements.collectionModal.addEventListener("close", resetCollectionModal);
  }

  if (elements.collectionModalForm) {
    elements.collectionModalForm.addEventListener("submit", submitCollectionModal);
  }

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

  if (elements.collections) {
    elements.collections.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-collection-id]");
      if (editButton && elements.collections.contains(editButton)) {
        const collectionId = String(editButton.dataset.editCollectionId ?? "").trim();
        if (collectionId) {
          openCollectionModalEdit(collectionId);
        }
        return;
      }

      const deleteButton = event.target.closest("[data-delete-collection-id]");
      if (deleteButton && elements.collections.contains(deleteButton)) {
        const collectionId = String(deleteButton.dataset.deleteCollectionId ?? "").trim();
        if (collectionId) {
          deleteCollection(collectionId);
        }
        return;
      }

      const addButton = event.target.closest("[data-add-collection-post-button]");
      if (addButton && elements.collections.contains(addButton)) {
        const collectionId = String(addButton.dataset.addCollectionPostButton ?? "").trim();
        const select = elements.collections.querySelector(`[data-collection-post-select="${collectionId}"]`);
        const postId = String(select?.value ?? "").trim();
        if (collectionId && postId) {
          addPostToCollection(collectionId, postId);
        }
        return;
      }

      const removeButton = event.target.closest("[data-remove-collection-post-id]");
      if (removeButton && elements.collections.contains(removeButton)) {
        const collectionId = String(removeButton.dataset.collectionId ?? "").trim();
        const postId = String(removeButton.dataset.removeCollectionPostId ?? "").trim();
        if (collectionId && postId) {
          removePostFromCollection(collectionId, postId);
        }
        return;
      }

      const moveButton = event.target.closest("[data-move-collection-post-id]");
      if (moveButton && elements.collections.contains(moveButton)) {
        const collectionId = String(moveButton.dataset.collectionId ?? "").trim();
        const postId = String(moveButton.dataset.moveCollectionPostId ?? "").trim();
        const direction = String(moveButton.dataset.direction ?? "").trim();
        if (collectionId && postId && direction) {
          reorderCollectionItem(collectionId, postId, direction);
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

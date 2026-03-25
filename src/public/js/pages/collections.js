import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { createDestructiveModalController } from "../components/destructive-confirmation.js";
import { HOME_NOTICE_KEY, initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { createTagInputController } from "../components/tag-input.js";
import { resolveContentTagValidationMessage } from "../core/content-tags.js";
import {
  normalizeFollowTagValue,
  normalizeFollowedTags,
} from "../core/followed-tags.js";
import { resolveAuthApiMessage } from "../core/http-state.js";
import { clearSession, hasSession } from "../core/session.js";
import { UI_TEXT } from "../core/ui-text.js";
import { renderProfileCollectionList } from "../features/profile/content-renderers.js";

const AUTH_REQUIRED_NOTICE = "Authentication required to manage your collections.";
const ADD_COLLECTION_POST_SELECTION_NOTICE = "Choose a post before adding it.";

const state = {
  ownedPosts: [],
  collections: [],
  followedTags: [],
  editingCollectionId: null,
  isManagingCollections: false,
  isManagingFollowedTags: false,
};

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-collections-status]"),
  list: document.querySelector("[data-collections-list]"),
  openCollectionModalPanelButton: document.querySelector("[data-open-collection-modal-panel]"),
  collectionModal: document.querySelector("[data-collection-modal]"),
  collectionModalTitle: document.querySelector("[data-collection-modal-title]"),
  collectionModalCancelButton: document.querySelector("[data-collection-modal-cancel]"),
  collectionModalSubmitButton: document.querySelector("[data-collection-modal-submit]"),
  collectionModalForm: document.querySelector("[data-collection-modal-form]"),
  collectionModalStatus: document.querySelector("[data-collection-modal-status]"),
  deleteCollectionModal: document.querySelector("[data-delete-collection-modal]"),
  deleteCollectionTitle: document.querySelector("[data-delete-collection-title]"),
  deleteCollectionDescription: document.querySelector("[data-delete-collection-description]"),
  deleteCollectionNote: document.querySelector("[data-delete-collection-note]"),
  deleteCollectionCancelButton: document.querySelector("[data-delete-collection-cancel]"),
  deleteCollectionConfirmButton: document.querySelector("[data-delete-collection-confirm]"),
  deleteCollectionStatus: document.querySelector("[data-delete-collection-status]"),
};

const statusFlash = createFlash(elements.status);
const collectionModalFlash = createFlash(elements.collectionModalStatus);
const collectionTagInputController = createTagInputController({
  input: elements.collectionModalForm?.querySelector("[name='tags']") ?? null,
  noun: "tags",
});

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  protectedButtons: [elements.openCollectionModalPanelButton],
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

function handleAuthFailure(error) {
  if (error?.code === "UNAUTHENTICATED" || error?.status === 401) {
    clearSession();
    redirectToHome();
    return true;
  }

  return false;
}

function renderCollections() {
  const preservedSelections = new Map(
    Array.from(elements.list?.querySelectorAll("[data-collection-post-select]") ?? []).map((select) => [
      String(select.dataset.collectionPostSelect ?? "").trim(),
      String(select.value ?? ""),
    ]),
  );

  renderProfileCollectionList(elements.list, state.collections, {
    availablePosts: state.ownedPosts,
    canManageTagFollows: hasSession(),
    followedTagSet: new Set(state.followedTags),
  });

  preservedSelections.forEach((value, collectionId) => {
    const select = getCollectionPostSelect(collectionId);
    if (select && Array.from(select.options).some((option) => option.value === value)) {
      select.value = value;
    }
  });

  syncAllAddCollectionPostButtonStates();
}

function getCollectionPostSelect(collectionId) {
  if (!elements.list || !collectionId) {
    return null;
  }

  return elements.list.querySelector(`[data-collection-post-select="${collectionId}"]`);
}

function getAddCollectionPostButton(collectionId) {
  if (!elements.list || !collectionId) {
    return null;
  }

  return elements.list.querySelector(`[data-add-collection-post-button="${collectionId}"]`);
}

function syncAddCollectionPostButtonState(collectionId) {
  const resolvedCollectionId = String(collectionId ?? "").trim();
  if (!resolvedCollectionId) {
    return;
  }

  const select = getCollectionPostSelect(resolvedCollectionId);
  const button = getAddCollectionPostButton(resolvedCollectionId);
  if (!button) {
    return;
  }

  const hasSelectedPost = String(select?.value ?? "").trim().length > 0;
  button.disabled = state.isManagingCollections || !hasSelectedPost;
}

function syncAllAddCollectionPostButtonStates() {
  const addButtons = Array.from(
    elements.list?.querySelectorAll("[data-add-collection-post-button]") ?? [],
  );

  addButtons.forEach((button) => {
    syncAddCollectionPostButtonState(button.dataset.addCollectionPostButton);
  });
}

function getManagedCollection(collectionId) {
  return state.collections.find((item) => String(item.id) === String(collectionId));
}

function resolveFollowTagMessage(error) {
  return resolveAuthApiMessage(
    error,
    UI_TEXT.auth.loginToFollowTags,
    UI_TEXT.followTags.updateError,
  );
}

function setFollowedTags(tags) {
  state.followedTags = normalizeFollowedTags(tags);
}

function getManagedCollectionPostCount(collection) {
  if (Array.isArray(collection?.items)) {
    return collection.items.length;
  }

  const fallbackCount = Number(collection?.itemCount);
  return Number.isFinite(fallbackCount) && fallbackCount >= 0 ? fallbackCount : 0;
}

const deleteCollectionController = createDestructiveModalController({
  dialog: elements.deleteCollectionModal,
  titleTarget: elements.deleteCollectionTitle,
  descriptionTarget: elements.deleteCollectionDescription,
  noteTarget: elements.deleteCollectionNote,
  cancelButton: elements.deleteCollectionCancelButton,
  confirmButton: elements.deleteCollectionConfirmButton,
  statusTarget: elements.deleteCollectionStatus,
  async onConfirm({ context, close }) {
    const collectionId = String(context?.collectionId ?? "").trim();
    if (!collectionId || state.isManagingCollections) {
      return;
    }

    state.isManagingCollections = true;
    syncAllAddCollectionPostButtonStates();

    try {
      await api.collections.delete(collectionId);
      await refreshCollections({ showLoading: false });
      statusFlash.show("Collection deleted.", "success");
    } catch (error) {
      if (handleAuthFailure(error)) {
        close({ force: true });
        return;
      }

      throw error;
    } finally {
      state.isManagingCollections = false;
      syncAllAddCollectionPostButtonStates();
    }
  },
});

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
  collectionTagInputController.sync();
}

function openCollectionModalCreate() {
  if (!hasSession()) {
    redirectToHome();
    return;
  }

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
  collectionTagInputController.setValue(
    Array.isArray(collection.tags) ? collection.tags.join(", ") : "",
  );

  if (elements.collectionModalTitle) {
    elements.collectionModalTitle.textContent = "Edit collection";
  }

  if (elements.collectionModalSubmitButton) {
    elements.collectionModalSubmitButton.textContent = "Save changes";
  }

  elements.collectionModal?.showModal();
}

function openDeleteCollectionModal(collectionId, restoreFocusTo = null) {
  if (!hasSession()) {
    redirectToHome();
    return;
  }

  if (state.isManagingCollections) {
    return;
  }

  const collection = getManagedCollection(collectionId);
  if (!collection) {
    return;
  }

  deleteCollectionController.open({
    actionKey: "collection.delete",
    context: {
      collectionId: String(collectionId),
      itemCount: getManagedCollectionPostCount(collection),
      resolveErrorMessage: resolveMessage,
    },
    restoreFocusTo,
  });
}

async function refreshCollections({ showLoading = true } = {}) {
  if (!hasSession()) {
    redirectToHome();
    return;
  }

  if (showLoading) {
    statusFlash.show("Loading collections...", "info");
  }

  try {
    const [posts, collections] = await Promise.all([
      api.posts.listMine(),
      api.collections.listMine(),
    ]);
    state.ownedPosts = Array.isArray(posts) ? posts : [];
    state.collections = Array.isArray(collections) ? collections : [];

    try {
      const followedTags = await api.users.listFollowedTags();
      setFollowedTags(followedTags.followedTags);
    } catch (error) {
      if (handleAuthFailure(error)) {
        return;
      }

      setFollowedTags([]);
    }

    renderCollections();
    statusFlash.clear();
  } catch (error) {
    if (handleAuthFailure(error)) {
      return;
    }

    statusFlash.show(resolveMessage(error), "error");
  }
}

async function submitCollectionModal(event) {
  event.preventDefault();
  if (!elements.collectionModalForm || state.isManagingCollections) {
    return;
  }

  const tagValidation = collectionTagInputController.getValidation();
  if (tagValidation.hasErrors) {
    collectionModalFlash.show(resolveContentTagValidationMessage(tagValidation), "error");
    collectionTagInputController.focus();
    return;
  }

  const formData = new FormData(elements.collectionModalForm);
  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    tags: collectionTagInputController.getNormalizedTags(),
  };

  state.isManagingCollections = true;
  collectionModalFlash.show(
    state.editingCollectionId ? "Saving collection changes..." : "Creating collection...",
    "info",
  );

  try {
    if (state.editingCollectionId) {
      await api.collections.update(state.editingCollectionId, payload);
      statusFlash.show("Collection updated.", "success");
    } else {
      await api.collections.create(payload);
      statusFlash.show("Collection created.", "success");
    }

    await refreshCollections({ showLoading: false });
    elements.collectionModal?.close();
  } catch (error) {
    if (handleAuthFailure(error)) {
      return;
    }

    collectionModalFlash.show(resolveMessage(error), "error");
  } finally {
    state.isManagingCollections = false;
  }
}

async function addPostToCollection(collectionId, postId) {
  if (!collectionId || !postId || state.isManagingCollections) {
    return;
  }

  state.isManagingCollections = true;
  syncAddCollectionPostButtonState(collectionId);
  statusFlash.show("Adding post to collection...", "info");

  try {
    await api.collections.addItems(collectionId, [postId]);
    await refreshCollections({ showLoading: false });
    statusFlash.show("Post added to the collection.", "success");
  } catch (error) {
    if (handleAuthFailure(error)) {
      return;
    }

    statusFlash.show(resolveMessage(error), "error");
  } finally {
    state.isManagingCollections = false;
    syncAddCollectionPostButtonState(collectionId);
  }
}

async function toggleFollowTag(tag, currentlyFollowing) {
  if (state.isManagingFollowedTags) {
    return false;
  }

  if (!hasSession()) {
    redirectToHome(UI_TEXT.auth.loginToFollowTags);
    return false;
  }

  const normalizedTag = normalizeFollowTagValue(tag);
  if (!normalizedTag) {
    return false;
  }

  state.isManagingFollowedTags = true;
  statusFlash.show(
    currentlyFollowing
      ? UI_TEXT.followTags.loadingUnfollow(normalizedTag)
      : UI_TEXT.followTags.loadingFollow(normalizedTag),
    "info",
  );

  try {
    const result = currentlyFollowing
      ? await api.users.unfollowTag(normalizedTag)
      : await api.users.followTag(normalizedTag);

    setFollowedTags(result.followedTags);
    renderCollections();
    statusFlash.show(
      currentlyFollowing
        ? UI_TEXT.followTags.stoppedFollowing(normalizedTag)
        : UI_TEXT.followTags.nowFollowing(normalizedTag),
      "success",
    );
    return true;
  } catch (error) {
    if (handleAuthFailure(error)) {
      return false;
    }

    statusFlash.show(resolveFollowTagMessage(error), "error");
    return false;
  } finally {
    state.isManagingFollowedTags = false;
  }
}

async function removePostFromCollection(collectionId, postId) {
  if (!collectionId || !postId || state.isManagingCollections) {
    return;
  }

  state.isManagingCollections = true;
  statusFlash.show("Removing post from collection...", "info");

  try {
    await api.collections.removeItem(collectionId, postId);
    await refreshCollections({ showLoading: false });
    statusFlash.show("Post removed from the collection.", "success");
  } catch (error) {
    if (handleAuthFailure(error)) {
      return;
    }

    statusFlash.show(resolveMessage(error), "error");
  } finally {
    state.isManagingCollections = false;
  }
}

async function reorderCollectionItem(collectionId, postId, direction) {
  const collection = getManagedCollection(collectionId);
  if (!collection || state.isManagingCollections) {
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

  state.isManagingCollections = true;
  statusFlash.show("Reordering collection...", "info");

  try {
    await api.collections.reorderItems(collectionId, items.map((item) => item.id));
    await refreshCollections({ showLoading: false });
    statusFlash.show("Collection reordered.", "success");
  } catch (error) {
    if (handleAuthFailure(error)) {
      return;
    }

    statusFlash.show(resolveMessage(error), "error");
  } finally {
    state.isManagingCollections = false;
  }
}

function bindEvents() {
  elements.openCollectionModalPanelButton?.addEventListener("click", openCollectionModalCreate);

  elements.collectionModalCancelButton?.addEventListener("click", () => {
    elements.collectionModal?.close();
  });

  if (elements.collectionModal) {
    elements.collectionModal.addEventListener("click", (event) => {
      if (event.target === elements.collectionModal) {
        elements.collectionModal.close();
      }
    });
    elements.collectionModal.addEventListener("close", resetCollectionModal);
  }

  elements.collectionModalForm?.addEventListener("submit", submitCollectionModal);

  elements.list?.addEventListener("click", (event) => {
    const followButton = event.target.closest("[data-follow-tag]");
    if (followButton && elements.list.contains(followButton)) {
      const tag = String(followButton.dataset.followTag ?? "").trim();
      const currentlyFollowing = followButton.dataset.following === "true";
      if (tag) {
        toggleFollowTag(tag, currentlyFollowing);
      }
      return;
    }

    const editButton = event.target.closest("[data-edit-collection-id]");
    if (editButton && elements.list.contains(editButton)) {
      const collectionId = String(editButton.dataset.editCollectionId ?? "").trim();
      if (collectionId) {
        openCollectionModalEdit(collectionId);
      }
      return;
    }

    const deleteButton = event.target.closest("[data-delete-collection-id]");
    if (deleteButton && elements.list.contains(deleteButton)) {
      const collectionId = String(deleteButton.dataset.deleteCollectionId ?? "").trim();
      if (collectionId) {
        openDeleteCollectionModal(collectionId, deleteButton);
      }
      return;
    }

    const addButton = event.target.closest("[data-add-collection-post-button]");
    if (addButton && elements.list.contains(addButton)) {
      const collectionId = String(addButton.dataset.addCollectionPostButton ?? "").trim();
      const select = getCollectionPostSelect(collectionId);
      const postId = String(select?.value ?? "").trim();
      if (!collectionId) {
        return;
      }

      if (!postId) {
        syncAddCollectionPostButtonState(collectionId);
        statusFlash.show(ADD_COLLECTION_POST_SELECTION_NOTICE, "error");
        select?.focus();
        return;
      }

      addPostToCollection(collectionId, postId);
      return;
    }

    const removeButton = event.target.closest("[data-remove-collection-post-id]");
    if (removeButton && elements.list.contains(removeButton)) {
      const collectionId = String(removeButton.dataset.collectionId ?? "").trim();
      const postId = String(removeButton.dataset.removeCollectionPostId ?? "").trim();
      if (collectionId && postId) {
        removePostFromCollection(collectionId, postId);
      }
      return;
    }

    const moveButton = event.target.closest("[data-move-collection-post-id]");
    if (moveButton && elements.list.contains(moveButton)) {
      const collectionId = String(moveButton.dataset.collectionId ?? "").trim();
      const postId = String(moveButton.dataset.moveCollectionPostId ?? "").trim();
      const direction = String(moveButton.dataset.direction ?? "").trim();
      if (collectionId && postId && direction) {
        reorderCollectionItem(collectionId, postId, direction);
      }
    }
  });

  elements.list?.addEventListener("change", (event) => {
    const select = event.target.closest("[data-collection-post-select]");
    if (!select || !elements.list.contains(select)) {
      return;
    }

    syncAddCollectionPostButtonState(select.dataset.collectionPostSelect);
  });
}

async function init() {
  bindNavigation();
  navbar.refresh();
  bindEvents();
  await refreshCollections();
}

init();

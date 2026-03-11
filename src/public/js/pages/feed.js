import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { parseCsvTags } from "../core/formatters.js";
import { resolveAuthApiMessage, resolveModerationApiMessage } from "../core/http-state.js";
import { hasSession, requireSession } from "../core/session.js";
import { renderFeedList } from "../features/feed/renderers.js";
import { reviewSavedMessage } from "../features/moderation/renderers.js";
import { renderProfileCollectionList } from "../features/profile/content-renderers.js";
import { createPostModalController } from "../features/posts/post-modal.js";

const FEED_LIMIT = 20;
const FEED_NOTICE_KEY = "thesocial_feed_notice";

const state = {
  items: [],
  nextCursor: null,
  searchTerm: "",
  feedMode: "all",
  followedTags: [],
  viewerRole: null,
  viewerId: null,
  ownedPosts: [],
  collections: [],
  isLoading: false,
  isReviewing: false,
  isDeletingPost: false,
  isManagingTags: false,
  isManagingCollections: false,
  editingCollectionId: null,
};

const elements = {
  status: document.querySelector("[data-feed-status]"),
  list: document.querySelector("[data-feed-list]"),
  loadMore: document.querySelector("[data-feed-more]"),
  searchForm: document.querySelector("[data-feed-search-form]"),
  searchInput: document.querySelector("[data-feed-search-input]"),
  searchSubmitButton: document.querySelector("[data-feed-search-submit]"),
  searchResetButton: document.querySelector("[data-feed-search-reset]"),
  followTagsGuest: document.querySelector("[data-follow-tags-guest]"),
  followTagsAuth: document.querySelector("[data-follow-tags-auth]"),
  followTagsHelp: document.querySelector("[data-follow-tags-help]"),
  followTagForm: document.querySelector("[data-follow-tag-form]"),
  followTagInput: document.querySelector("[data-follow-tag-input]"),
  followTagSubmit: document.querySelector("[data-follow-tag-submit]"),
  followedTagsList: document.querySelector("[data-followed-tags-list]"),
  followTagStatus: document.querySelector("[data-follow-tag-status]"),
  collectionsPanel: document.querySelector("[data-feed-collections-panel]"),
  collectionsStatus: document.querySelector("[data-feed-collections-status]"),
  collectionsList: document.querySelector("[data-feed-collections]"),
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  openModalButton: document.querySelector("[data-open-post-modal]"),
  openCollectionModalButton: document.querySelector("[data-open-collection-modal]"),
  openCollectionModalPanelButton: document.querySelector("[data-open-collection-modal-panel]"),
  logoutButton: document.querySelector("[data-logout]"),
  modal: document.querySelector("[data-post-modal]"),
  modalTitle: document.querySelector("[data-post-modal-title]"),
  modalCancelButton: document.querySelector("[data-post-modal-cancel]"),
  modalSubmitButton: document.querySelector("[data-post-modal-submit]"),
  postModalForm: document.querySelector("[data-post-modal-form]"),
  postModalStatus: document.querySelector("[data-post-modal-status]"),
  postMediaInput: document.querySelector("[data-post-media-input]"),
  postPreviousSelect: document.querySelector("[data-post-previous-select]"),
  selectedPostMedia: document.querySelector("[data-selected-post-media]"),
  existingPostMedia: document.querySelector("[data-existing-post-media]"),
  questionnaireEditor: document.querySelector("[data-post-questionnaire-editor]"),
  collectionModal: document.querySelector("[data-collection-modal]"),
  collectionModalTitle: document.querySelector("[data-collection-modal-title]"),
  collectionModalCancelButton: document.querySelector("[data-collection-modal-cancel]"),
  collectionModalSubmitButton: document.querySelector("[data-collection-modal-submit]"),
  collectionModalForm: document.querySelector("[data-collection-modal-form]"),
  collectionModalStatus: document.querySelector("[data-collection-modal-status]"),
};

const statusFlash = createFlash(elements.status);
const followTagFlash = createFlash(elements.followTagStatus);
const collectionsFlash = createFlash(elements.collectionsStatus);
const collectionModalFlash = createFlash(elements.collectionModalStatus);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  protectedButtons: [
    elements.openModalButton,
    elements.openCollectionModalButton,
    elements.openCollectionModalPanelButton,
  ],
  logoutRedirectUrl: "./index.html",
});

function resolveMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Authentication required. Sign in to publish to the feed.",
    "Unexpected error while communicating with the API.",
  );
}

function resolveFollowTagMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Authentication required. Sign in to follow tags.",
    "Could not update followed tags.",
  );
}

function resolveFeedLoadMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Authentication required. Sign in to access your followed-tags feed.",
    "Unexpected error while loading the feed.",
  );
}

function normalizeFollowTagValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/^#+/, "")
    .toLowerCase();
}

function setFollowedTags(tags) {
  state.followedTags = [...new Set((Array.isArray(tags) ? tags : [])
    .map((tag) => normalizeFollowTagValue(tag))
    .filter((tag) => tag.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

function isFollowingMode() {
  return state.feedMode === "following";
}

function hasFollowedTags() {
  return state.followedTags.length > 0;
}

function hasActiveSearch() {
  return state.searchTerm.length > 0;
}

function resolveLoadingMessage({ append = false } = {}) {
  if (isFollowingMode()) {
    if (append) {
      return "Loading more posts from the tags you follow...";
    }

    return hasActiveSearch()
      ? `Searching the tags you follow for "${state.searchTerm}"...`
      : "Loading your followed-tags feed...";
  }

  if (append) {
    return hasActiveSearch() ? "Loading more results..." : "Loading more posts...";
  }

  return hasActiveSearch() ? `Searching posts for "${state.searchTerm}"...` : "Loading feed...";
}

function resolveEmptyFeedMessage() {
  if (isFollowingMode() && !hasFollowedTags()) {
    return "Follow a tag to build your personalized feed.";
  }

  if (isFollowingMode()) {
    return hasActiveSearch()
      ? `No posts were found in the tags you follow for "${state.searchTerm}".`
      : "No posts were found in the tags you follow.";
  }

  return hasActiveSearch()
    ? `No posts were found for "${state.searchTerm}".`
    : "No posts yet.";
}

function resolveLoadedFeedMessage() {
  if (state.items.length === 0) {
    return resolveEmptyFeedMessage();
  }

  return "";
}

function syncSearchControls() {
  if (elements.searchInput) {
    elements.searchInput.value = state.searchTerm;
    elements.searchInput.disabled = state.isLoading;
  }

  if (elements.searchSubmitButton) {
    elements.searchSubmitButton.disabled = state.isLoading;
  }

  if (elements.searchResetButton) {
    elements.searchResetButton.hidden = !hasActiveSearch();
    elements.searchResetButton.disabled = state.isLoading;
  }
}

function renderFollowedTagsPanel() {
  const authenticated = hasSession();

  if (elements.followTagsGuest) {
    elements.followTagsGuest.hidden = authenticated;
  }

  if (elements.followTagsAuth) {
    elements.followTagsAuth.hidden = !authenticated;
  }

  if (!authenticated) {
    return;
  }

  const modeButtons = Array.from(document.querySelectorAll("[data-feed-mode-button]"));
  modeButtons.forEach((button) => {
    const mode = String(button.dataset.feedModeButton ?? "").trim();
    const isActive = mode === state.feedMode;
    button.dataset.active = isActive ? "true" : "false";
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.classList.toggle("button-ghost", !isActive);
    button.disabled = state.isLoading || state.isManagingTags;
  });

  if (elements.followTagsHelp) {
    elements.followTagsHelp.textContent = isFollowingMode()
      ? "Your personal feed stays chronological and shows posts matching any tag you follow."
      : "Follow tags to open a second feed without changing the public feed.";
  }

  if (elements.followTagInput) {
    elements.followTagInput.disabled = state.isManagingTags;
  }

  if (elements.followTagSubmit) {
    elements.followTagSubmit.disabled = state.isManagingTags;
  }

  if (!elements.followedTagsList) {
    return;
  }

  if (!hasFollowedTags()) {
    elements.followedTagsList.innerHTML = "<p class='muted'>You are not following any tags yet.</p>";
    return;
  }

  elements.followedTagsList.innerHTML = `
    <ul class="tag-list" aria-label="Followed tags">
      ${state.followedTags
        .map(
          (tag) => `
            <li class="tag-item tag-item-actionable">
              <span class="tag-label">#${tag}</span>
              <button
                type="button"
                class="tag-follow-button button-ghost"
                data-follow-tag="${tag}"
                data-following="true"
                aria-pressed="true"
                ${state.isManagingTags ? "disabled" : ""}
              >
                Following
              </button>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderCollectionsPanel() {
  if (elements.collectionsPanel) {
    elements.collectionsPanel.hidden = !hasSession();
  }

  if (!hasSession() || !elements.collectionsList) {
    return;
  }

  renderProfileCollectionList(elements.collectionsList, state.collections, {
    availablePosts: state.ownedPosts,
  });
}

async function refreshCollectionManagement({ showLoading = false } = {}) {
  if (!hasSession()) {
    state.ownedPosts = [];
    state.collections = [];
    state.editingCollectionId = null;
    collectionsFlash.clear();
    renderCollectionsPanel();
    return;
  }

  if (showLoading) {
    collectionsFlash.show("Loading collections...", "info");
  }

  try {
    const [posts, collections] = await Promise.all([
      api.posts.listMine(),
      api.collections.listMine(),
    ]);
    state.ownedPosts = Array.isArray(posts) ? posts : [];
    state.collections = Array.isArray(collections) ? collections : [];
    renderCollectionsPanel();
    collectionsFlash.clear();
  } catch (error) {
    collectionsFlash.show(resolveMessage(error), "error");
  }
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
  if (!hasSession()) {
    statusFlash.show("Sign in to manage collections.", "error");
    window.location.href = "./index.html";
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
  if (!elements.collectionModalForm || state.isManagingCollections) {
    return;
  }

  const formData = new FormData(elements.collectionModalForm);
  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    tags: parseCsvTags(formData.get("tags")),
  };

  state.isManagingCollections = true;
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

    await refreshCollectionManagement();
    elements.collectionModal?.close();
  } catch (error) {
    collectionModalFlash.show(resolveMessage(error), "error");
  } finally {
    state.isManagingCollections = false;
  }
}

async function deleteCollection(collectionId) {
  if (!collectionId || state.isManagingCollections) {
    return;
  }

  state.isManagingCollections = true;
  collectionsFlash.show("Deleting collection...", "info");

  try {
    await api.collections.delete(collectionId);
    await refreshCollectionManagement();
    collectionsFlash.show("Collection deleted.", "success");
  } catch (error) {
    collectionsFlash.show(resolveMessage(error), "error");
  } finally {
    state.isManagingCollections = false;
  }
}

async function addPostToCollection(collectionId, postId) {
  if (!collectionId || !postId || state.isManagingCollections) {
    return;
  }

  state.isManagingCollections = true;
  collectionsFlash.show("Adding post to collection...", "info");

  try {
    await api.collections.addItems(collectionId, [postId]);
    await refreshCollectionManagement();
    collectionsFlash.show("Post added to the collection.", "success");
  } catch (error) {
    collectionsFlash.show(resolveMessage(error), "error");
  } finally {
    state.isManagingCollections = false;
  }
}

async function removePostFromCollection(collectionId, postId) {
  if (!collectionId || !postId || state.isManagingCollections) {
    return;
  }

  state.isManagingCollections = true;
  collectionsFlash.show("Removing post from collection...", "info");

  try {
    await api.collections.removeItem(collectionId, postId);
    await refreshCollectionManagement();
    collectionsFlash.show("Post removed from the collection.", "success");
  } catch (error) {
    collectionsFlash.show(resolveMessage(error), "error");
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
  collectionsFlash.show("Reordering collection...", "info");

  try {
    await api.collections.reorderItems(collectionId, items.map((item) => item.id));
    await refreshCollectionManagement();
    collectionsFlash.show("Collection reordered.", "success");
  } catch (error) {
    collectionsFlash.show(resolveMessage(error), "error");
  } finally {
    state.isManagingCollections = false;
  }
}

function renderFeed() {
  if (!elements.list) {
    return;
  }

  if (state.items.length === 0) {
    elements.list.innerHTML = "";
    if (elements.loadMore) {
      elements.loadMore.hidden = true;
    }
    return;
  }

  renderFeedList(elements.list, state.items, {
    viewerRole: state.viewerRole,
    viewerId: state.viewerId,
    canReviewPosts: hasSession(),
    canManageTagFollows: hasSession(),
    followedTagSet: new Set(state.followedTags),
  });

  if (elements.loadMore) {
    elements.loadMore.hidden = !state.nextCursor;
    elements.loadMore.disabled = state.isLoading;
  }
}

async function loadFeed({ append = false } = {}) {
  if (state.isLoading || (append && !state.nextCursor)) {
    return;
  }

  if (isFollowingMode() && !hasFollowedTags()) {
    state.items = [];
    state.nextCursor = null;
    renderFeed();
    statusFlash.show(resolveEmptyFeedMessage(), "info");
    return;
  }

  state.isLoading = true;
  syncSearchControls();
  renderFollowedTagsPanel();
  statusFlash.show(resolveLoadingMessage({ append }), "info");
  if (elements.loadMore) {
    elements.loadMore.disabled = true;
  }

  try {
    const data = await (isFollowingMode() ? api.feed.listFollowing : api.feed.list)({
      cursor: append ? state.nextCursor : undefined,
      limit: FEED_LIMIT,
      search: state.searchTerm || undefined,
    });

    const incoming = Array.isArray(data.items) ? data.items : [];
    state.items = append ? [...state.items, ...incoming] : incoming;
    state.nextCursor = data.pageInfo?.nextCursor ?? null;

    renderFeed();

    const nextMessage = resolveLoadedFeedMessage();
    if (nextMessage) {
      statusFlash.show(nextMessage, "info");
    } else {
      statusFlash.clear();
    }
  } catch (error) {
    statusFlash.show(resolveFeedLoadMessage(error), "error");
    if (!append) {
      state.items = [];
      state.nextCursor = null;
      renderFeed();
    }
  } finally {
    state.isLoading = false;
    if (elements.loadMore) {
      elements.loadMore.disabled = false;
    }
    syncSearchControls();
    renderFollowedTagsPanel();
  }
}

async function submitPostCreate(payload) {
  return api.posts.create(payload);
}

async function submitPostUpdate(postId, payload) {
  return api.posts.update(postId, payload);
}

const postModalController = createPostModalController({
  modal: elements.modal,
  form: elements.postModalForm,
  title: elements.modalTitle,
  submitButton: elements.modalSubmitButton,
  cancelButton: elements.modalCancelButton,
  statusTarget: elements.postModalStatus,
  openCreateButton: elements.openModalButton,
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
    const isAuthenticated = requireSession({
      onFail: () => {
        statusFlash.show("Sign in to publish to the feed.", "error");
        window.location.href = "./index.html";
      },
    });

    return isAuthenticated;
  },
  onBeforeOpenEdit() {
    const isAuthenticated = hasSession();
    if (!isAuthenticated) {
      statusFlash.show("Sign in to edit posts.", "error");
    }
    return isAuthenticated;
  },
  submitPostCreate,
  submitPostUpdate,
  loadOwnedPosts() {
    return api.posts.listMine();
  },
  uploadPostMedia(postId, files) {
    return api.posts.uploadMedia(postId, files);
  },
  deletePostMedia(postId, mediaId) {
    return api.posts.deleteMedia(postId, mediaId);
  },
  async onMediaChanged({ action }) {
    if (action === "delete") {
      await Promise.all([
        loadFeed(),
        refreshCollectionManagement(),
      ]);
    }
  },
  async onAfterSuccess({ mode, mediaError, mediaErrorMessage }) {
    await Promise.all([
      loadFeed(),
      refreshCollectionManagement(),
    ]);
    if (mode === "edit") {
      statusFlash.show(
        mediaError
          ? `Post updated, but the images could not be uploaded: ${mediaErrorMessage ?? "check the selected files."}`
          : "Post updated.",
        mediaError ? "error" : "success",
      );
      return;
    }

    statusFlash.show(
      mediaError
        ? `Post published, but the images could not be uploaded: ${mediaErrorMessage ?? "check the selected files."}`
        : "Post published.",
      mediaError ? "error" : "success",
    );
  },
});

async function syncViewerContext() {
  if (!hasSession()) {
    state.viewerRole = null;
    state.viewerId = null;
    state.ownedPosts = [];
    state.collections = [];
    setFollowedTags([]);
    renderFollowedTagsPanel();
    renderCollectionsPanel();
    return;
  }

  const [profileResult, followedTagsResult] = await Promise.allSettled([
    api.users.meProfile(),
    api.users.listFollowedTags(),
  ]);

  if (profileResult.status === "fulfilled") {
    const profile = profileResult.value;
    state.viewerRole = profile.role ?? null;
    state.viewerId = profile.id ?? null;
  } else {
    state.viewerRole = null;
    state.viewerId = null;
  }

  if (followedTagsResult.status === "fulfilled") {
    setFollowedTags(followedTagsResult.value.followedTags);
  } else {
    setFollowedTags([]);
  }

  renderFollowedTagsPanel();
  renderCollectionsPanel();
}

async function toggleFollowTag(tag, currentlyFollowing) {
  if (state.isManagingTags) {
    return false;
  }

  if (!hasSession()) {
    statusFlash.show("Sign in to follow tags.", "error");
    return false;
  }

  const normalizedTag = normalizeFollowTagValue(tag);
  if (!normalizedTag) {
    return false;
  }

  state.isManagingTags = true;
  renderFollowedTagsPanel();
  followTagFlash.show(
    currentlyFollowing ? `Unfollowing #${normalizedTag}...` : `Following #${normalizedTag}...`,
    "info",
  );

  try {
    const result = currentlyFollowing
      ? await api.users.unfollowTag(normalizedTag)
      : await api.users.followTag(normalizedTag);

    setFollowedTags(result.followedTags);
    renderFollowedTagsPanel();
    renderFeed();

    if (isFollowingMode()) {
      state.nextCursor = null;
      await loadFeed();
    }

    const successMessage = currentlyFollowing
      ? `You no longer follow #${normalizedTag}.`
      : `You now follow #${normalizedTag}.`;
    statusFlash.show(successMessage, "success");
    followTagFlash.show(successMessage, "success");
    return true;
  } catch (error) {
    const message = resolveFollowTagMessage(error);
    statusFlash.show(message, "error");
    followTagFlash.show(message, "error");
    return false;
  } finally {
    state.isManagingTags = false;
    renderFollowedTagsPanel();
  }
}

async function handleManualFollowTag(event) {
  event.preventDefault();

  const formData = new FormData(elements.followTagForm);
  const rawValue = String(formData.get("tag") ?? "");
  const normalizedTag = normalizeFollowTagValue(rawValue);

  if (!normalizedTag) {
    followTagFlash.show("Type a tag before submitting.", "error");
    return;
  }

  if (state.followedTags.includes(normalizedTag)) {
    followTagFlash.show(`You already follow #${normalizedTag}.`, "info");
    elements.followTagInput?.focus();
    elements.followTagInput?.select();
    return;
  }

  const success = await toggleFollowTag(normalizedTag, false);
  if (success) {
    elements.followTagForm.reset();
  }
}

async function submitFeedReview(postId, decision, actionsContainer) {
  if (state.isReviewing) {
    return;
  }

  if (!hasSession()) {
    statusFlash.show("Sign in to review a post.", "error");
    return;
  }

  const reviewButtons = Array.from(
    actionsContainer?.querySelectorAll("[data-review-action]") ?? [],
  );

  state.isReviewing = true;
  reviewButtons.forEach((button) => {
    button.disabled = true;
  });
  statusFlash.show("Saving review...", "info");

  try {
    const result = await api.posts.review(postId, decision, null);
    await loadFeed();
    statusFlash.show(reviewSavedMessage(result), "success");
  } catch (error) {
    statusFlash.show(
      resolveModerationApiMessage(error, "Could not save the review."),
      "error",
    );
  } finally {
    state.isReviewing = false;
    reviewButtons.forEach((button) => {
      button.disabled = false;
    });
  }
}

function resolveDeleteMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Authentication required to delete posts.",
    "Could not delete the post.",
  );
}

async function deleteFeedPost(postId) {
  if (state.isDeletingPost) {
    return;
  }

  if (!hasSession()) {
    statusFlash.show("Sign in to delete posts.", "error");
    window.location.href = "./index.html";
    return;
  }

  const post = state.items.find((item) => String(item.id) === String(postId));
  const isOwner = String(state.viewerId ?? "") === String(post?.author?.id ?? "");
  if (!["moderator", "admin"].includes(state.viewerRole ?? "") && !isOwner) {
    statusFlash.show(
      "Only the post author, moderators, or administrators can delete posts.",
      "error",
    );
    return;
  }

  state.isDeletingPost = true;
  statusFlash.show("Deleting post...", "info");
  try {
    await api.posts.delete(postId);
    await Promise.all([
      loadFeed(),
      refreshCollectionManagement(),
    ]);
    statusFlash.show("Post deleted.", "success");
  } catch (error) {
    statusFlash.show(resolveDeleteMessage(error), "error");
  } finally {
    state.isDeletingPost = false;
  }
}

function editFeedPost(postId) {
  const post = state.items.find((item) => String(item.id) === String(postId));
  const isOwner = String(state.viewerId ?? "") === String(post?.author?.id ?? "");

  if (!isOwner) {
    statusFlash.show("Only the author can edit this post.", "error");
    return;
  }

  postModalController.openPostModalEdit(post);
}

function bindEvents() {
  if (elements.searchForm) {
    elements.searchForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(elements.searchForm);
      state.searchTerm = String(formData.get("search") ?? "").trim();
      state.nextCursor = null;
      loadFeed();
    });
  }

  if (elements.searchResetButton) {
    elements.searchResetButton.addEventListener("click", () => {
      state.searchTerm = "";
      state.nextCursor = null;
      syncSearchControls();
      loadFeed();
      elements.searchInput?.focus();
    });
  }

  if (elements.followTagForm) {
    elements.followTagForm.addEventListener("submit", handleManualFollowTag);
  }

  if (elements.openCollectionModalButton) {
    elements.openCollectionModalButton.addEventListener("click", openCollectionModalCreate);
  }

  if (elements.openCollectionModalPanelButton) {
    elements.openCollectionModalPanelButton.addEventListener("click", openCollectionModalCreate);
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

  if (elements.followTagsAuth) {
    elements.followTagsAuth.addEventListener("click", (event) => {
      const modeButton = event.target.closest("[data-feed-mode-button]");
      if (modeButton && elements.followTagsAuth.contains(modeButton)) {
        const nextMode = String(modeButton.dataset.feedModeButton ?? "").trim();
        if (!nextMode || nextMode === state.feedMode) {
          return;
        }

        state.feedMode = nextMode;
        state.nextCursor = null;
        renderFollowedTagsPanel();
        loadFeed();
        return;
      }

      const followButton = event.target.closest("[data-follow-tag]");
      if (followButton && elements.followTagsAuth.contains(followButton)) {
        const tag = String(followButton.dataset.followTag ?? "").trim();
        const currentlyFollowing = followButton.dataset.following === "true";
        if (tag) {
          toggleFollowTag(tag, currentlyFollowing);
        }
      }
    });
  }

  if (elements.loadMore) {
    elements.loadMore.addEventListener("click", () => {
      loadFeed({ append: true });
    });
  }

  if (elements.list) {
    elements.list.addEventListener("click", (event) => {
      const followButton = event.target.closest("[data-follow-tag]");
      if (followButton && elements.list.contains(followButton)) {
        const tag = String(followButton.dataset.followTag ?? "").trim();
        const currentlyFollowing = followButton.dataset.following === "true";
        if (tag) {
          toggleFollowTag(tag, currentlyFollowing);
        }
        return;
      }

      const button = event.target.closest("[data-review-action]");
      if (!button || !elements.list.contains(button)) {
        return;
      }

      const postId = String(button.dataset.postId ?? "").trim();
      const decision = String(button.dataset.reviewAction ?? "").trim();
      if (!postId || !decision) {
        return;
      }

      const actionsContainer = button.closest(".review-actions");
      submitFeedReview(postId, decision, actionsContainer);
    });

    elements.list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-edit-post-id]");
      if (!button || !elements.list.contains(button)) {
        return;
      }

      const postId = String(button.dataset.editPostId ?? "").trim();
      if (!postId) {
        return;
      }

      editFeedPost(postId);
    });

    elements.list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete-post-id]");
      if (!button || !elements.list.contains(button)) {
        return;
      }

      const postId = String(button.dataset.deletePostId ?? "").trim();
      if (!postId) {
        return;
      }

      deleteFeedPost(postId);
    });
  }

  if (elements.collectionsList) {
    elements.collectionsList.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-collection-id]");
      if (editButton && elements.collectionsList.contains(editButton)) {
        const collectionId = String(editButton.dataset.editCollectionId ?? "").trim();
        if (collectionId) {
          openCollectionModalEdit(collectionId);
        }
        return;
      }

      const deleteButton = event.target.closest("[data-delete-collection-id]");
      if (deleteButton && elements.collectionsList.contains(deleteButton)) {
        const collectionId = String(deleteButton.dataset.deleteCollectionId ?? "").trim();
        if (collectionId) {
          deleteCollection(collectionId);
        }
        return;
      }

      const addButton = event.target.closest("[data-add-collection-post-button]");
      if (addButton && elements.collectionsList.contains(addButton)) {
        const collectionId = String(addButton.dataset.addCollectionPostButton ?? "").trim();
        const select = elements.collectionsList.querySelector(`[data-collection-post-select="${collectionId}"]`);
        const postId = String(select?.value ?? "").trim();
        if (collectionId && postId) {
          addPostToCollection(collectionId, postId);
        }
        return;
      }

      const removeButton = event.target.closest("[data-remove-collection-post-id]");
      if (removeButton && elements.collectionsList.contains(removeButton)) {
        const collectionId = String(removeButton.dataset.collectionId ?? "").trim();
        const postId = String(removeButton.dataset.removeCollectionPostId ?? "").trim();
        if (collectionId && postId) {
          removePostFromCollection(collectionId, postId);
        }
        return;
      }

      const moveButton = event.target.closest("[data-move-collection-post-id]");
      if (moveButton && elements.collectionsList.contains(moveButton)) {
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
  if (!elements.list) {
    return;
  }

  bindNavigation();
  navbar.refresh();
  syncSearchControls();
  renderFollowedTagsPanel();
  renderCollectionsPanel();
  try {
    const pendingNotice = window.sessionStorage.getItem(FEED_NOTICE_KEY);
    if (pendingNotice) {
      statusFlash.show(pendingNotice, "success");
      window.sessionStorage.removeItem(FEED_NOTICE_KEY);
    }
  } catch {
    // noop: sessionStorage can be unavailable in restricted environments
  }

  await syncViewerContext();
  bindEvents();
  await refreshCollectionManagement({ showLoading: true });
  await loadFeed();
}

init();

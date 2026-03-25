import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { createDestructiveModalController } from "../components/destructive-confirmation.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import {
  FOLLOWED_TAG_ALLOWED_DESCRIPTION,
  FOLLOWED_TAG_MAX_LENGTH,
  normalizeFollowTagValue,
  normalizeFollowedTags,
  validateFollowTagValue,
} from "../core/followed-tags.js";
import { resolveAuthApiMessage, resolveModerationApiMessage } from "../core/http-state.js";
import { hasSession, requireSession } from "../core/session.js";
import { renderCollectionFeedList } from "../features/collections/feed-renderers.js";
import { renderFeedList } from "../features/feed/renderers.js";
import {
  renderFollowedTagsBanner,
  renderFollowedTagsList,
} from "../features/followed-tags/renderers.js";
import { reviewSavedMessage } from "../features/moderation/renderers.js";
import { createPostModalController } from "../features/posts/post-modal.js";

const FEED_LIMIT = 20;
const FEED_NOTICE_KEY = "thesocial_feed_notice";
const SEARCH_DEBOUNCE_MS = 400;
const FOLLOWED_TAG_BANNER_PREVIEW_LIMIT = 3;

let searchDebounceTimer = null;
let feedRequestSequence = 0;
let latestFeedRequestId = 0;
let latestLoadingFeedRequestId = 0;

const state = {
  items: [],
  nextCursor: null,
  searchInputValue: "",
  searchTerm: "",
  feedType: "posts",
  followedOnly: false,
  followedTags: [],
  viewerRole: null,
  viewerId: null,
  isLoading: false,
  isReviewing: false,
  isDeletingPost: false,
  isManagingTags: false,
};

const elements = {
  status: document.querySelector("[data-feed-status]"),
  list: document.querySelector("[data-feed-list]"),
  loadMore: document.querySelector("[data-feed-more]"),
  searchForm: document.querySelector("[data-feed-search-form]"),
  searchLabel: document.querySelector("[data-feed-search-label]"),
  searchInput: document.querySelector("[data-feed-search-input]"),
  searchResetButton: document.querySelector("[data-feed-search-reset]"),
  followTagsGuest: document.querySelector("[data-follow-tags-guest]"),
  followTagsAuth: document.querySelector("[data-follow-tags-auth]"),
  followTagForm: document.querySelector("[data-follow-tag-form]"),
  followTagInput: document.querySelector("[data-follow-tag-input]"),
  followTagSubmit: document.querySelector("[data-follow-tag-submit]"),
  followedTagsDropdown: document.querySelector("[data-followed-tags-dropdown]"),
  followedTagsSummary: document.querySelector("[data-followed-tags-summary]"),
  followedTagsList: document.querySelector("[data-followed-tags-list]"),
  followTagStatus: document.querySelector("[data-follow-tag-status]"),
  feedTypeButtons: Array.from(document.querySelectorAll("[data-feed-type-button]")),
  followToggleShell: document.querySelector("[data-feed-follow-toggle-shell]"),
  followToggleButton: document.querySelector("[data-feed-following-toggle]"),
  followBanner: document.querySelector("[data-feed-follow-banner]"),
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  collectionsLink: document.querySelector("[data-collections-link]"),
  openModalButton: document.querySelector("[data-open-post-modal]"),
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
  deletePostModal: document.querySelector("[data-delete-post-modal]"),
  deletePostTitle: document.querySelector("[data-delete-post-title]"),
  deletePostDescription: document.querySelector("[data-delete-post-description]"),
  deletePostNote: document.querySelector("[data-delete-post-note]"),
  deletePostCancelButton: document.querySelector("[data-delete-post-cancel]"),
  deletePostConfirmButton: document.querySelector("[data-delete-post-confirm]"),
  deletePostStatus: document.querySelector("[data-delete-post-status]"),
};

const statusFlash = createFlash(elements.status);
const followTagFlash = createFlash(elements.followTagStatus);

function showFollowTagStatus(message, type = "info", kind = "feedback") {
  followTagFlash.show(message, type);
  if (elements.followTagStatus) {
    elements.followTagStatus.dataset.messageKind = kind;
  }
}

function clearFollowTagStatus(kind = null) {
  if (kind && elements.followTagStatus?.dataset.messageKind !== kind) {
    return;
  }

  followTagFlash.clear();
  if (elements.followTagStatus) {
    delete elements.followTagStatus.dataset.messageKind;
  }
}

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  protectedButtons: [elements.collectionsLink, elements.openModalButton],
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
    "Authentication required. Sign in to access followed tags.",
    "Unexpected error while loading the feed.",
  );
}

function setFollowedTags(tags) {
  state.followedTags = normalizeFollowedTags(tags);
}

function isCollectionsFeed() {
  return state.feedType === "collections";
}

function hasFollowedTags() {
  return state.followedTags.length > 0;
}

function hasActiveSearch() {
  return state.searchTerm.length > 0;
}

function getFeedTypeLabel() {
  return isCollectionsFeed() ? "collections" : "posts";
}

function resolveSearchLabel() {
  return isCollectionsFeed() ? "Search collections" : "Search posts";
}

function resolveSearchPlaceholder() {
  return isCollectionsFeed()
    ? "Search by title, description, or tag"
    : "Search by title, content, or tag";
}

function resolveLoadingMessage({ append = false } = {}) {
  const subject = getFeedTypeLabel();

  if (state.followedOnly) {
    if (append) {
      return `Loading more ${subject} from the tags you follow...`;
    }

    return hasActiveSearch()
      ? `Searching ${subject} from the tags you follow for "${state.searchTerm}"...`
      : `Loading ${subject} from your followed tags...`;
  }

  if (append) {
    return hasActiveSearch() ? "Loading more results..." : `Loading more ${subject}...`;
  }

  return hasActiveSearch()
    ? `Searching ${subject} for "${state.searchTerm}"...`
    : `Loading ${subject} feed...`;
}

function resolveEmptyFeedMessage() {
  const subject = getFeedTypeLabel();

  if (state.followedOnly && !hasFollowedTags()) {
    return isCollectionsFeed()
      ? "Follow a tag to filter public collections."
      : "Follow a tag to build your personalized posts feed.";
  }

  if (state.followedOnly) {
    return hasActiveSearch()
      ? `No ${subject} were found in the tags you follow for "${state.searchTerm}".`
      : `No ${subject} were found in the tags you follow.`;
  }

  return hasActiveSearch()
    ? `No ${subject} were found for "${state.searchTerm}".`
    : `No ${subject} yet.`;
}

function resolveLoadedFeedMessage() {
  if (state.items.length === 0) {
    return resolveEmptyFeedMessage();
  }

  return "";
}

function resolveFollowedTagsCountLabel(count) {
  if (count <= 0) {
    return "Followed tags";
  }

  return count === 1 ? "Followed tags (1)" : `Followed tags (${count})`;
}

function resolveFollowTagValidationMessage(result) {
  if (!result || !result.errorCode) {
    return "";
  }

  if (result.errorCode === "too_long") {
    return `Use at most ${FOLLOWED_TAG_MAX_LENGTH} characters.`;
  }

  if (result.errorCode === "invalid_chars") {
    return `Use only ${FOLLOWED_TAG_ALLOWED_DESCRIPTION}.`;
  }

  return "Type a tag before submitting.";
}

function clearSearchDebounce() {
  if (searchDebounceTimer) {
    window.clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
}

function scheduleSearchReload() {
  clearSearchDebounce();

  const nextSearchTerm = state.searchInputValue.trim();
  if (nextSearchTerm === state.searchTerm) {
    return;
  }

  searchDebounceTimer = window.setTimeout(() => {
    searchDebounceTimer = null;
    loadFeed();
  }, SEARCH_DEBOUNCE_MS);
}

function syncSearchControls() {
  if (elements.searchLabel) {
    elements.searchLabel.textContent = resolveSearchLabel();
  }

  if (elements.searchInput) {
    if (elements.searchInput.value !== state.searchInputValue) {
      elements.searchInput.value = state.searchInputValue;
    }
    elements.searchInput.placeholder = resolveSearchPlaceholder();
  }

  if (elements.searchResetButton) {
    elements.searchResetButton.hidden = state.searchInputValue.length === 0 && !hasActiveSearch();
  }
}

function previewFollowedTagLabel(labelButton) {
  const label = labelButton?.textContent?.trim();
  if (!label) {
    return;
  }

  showFollowTagStatus(`Full tag: ${label}`, "info", "preview");
}

function renderFollowedTagsPanel() {
  const authenticated = hasSession();

  renderFollowedTagsBanner(elements.followBanner, state.followedTags, {
    active: authenticated && state.followedOnly && hasFollowedTags(),
    previewLimit: FOLLOWED_TAG_BANNER_PREVIEW_LIMIT,
  });

  if (elements.followTagsGuest) {
    elements.followTagsGuest.hidden = authenticated;
  }

  if (elements.followTagsAuth) {
    elements.followTagsAuth.hidden = !authenticated;
  }

  if (elements.followToggleShell) {
    elements.followToggleShell.hidden = !authenticated;
  }

  elements.feedTypeButtons.forEach((button) => {
    const feedType = String(button.dataset.feedTypeButton ?? "").trim();
    const isActive = feedType === state.feedType;
    button.dataset.active = isActive ? "true" : "false";
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.classList.toggle("button-ghost", !isActive);
    button.disabled = state.isLoading || state.isManagingTags;
  });

  if (!authenticated) {
    if (elements.followedTagsSummary) {
      elements.followedTagsSummary.textContent = resolveFollowedTagsCountLabel(0);
    }
    if (elements.followedTagsDropdown) {
      elements.followedTagsDropdown.open = false;
    }
    renderFollowedTagsList(elements.followedTagsList, []);
    return;
  }

  if (elements.followToggleButton) {
    elements.followToggleButton.textContent = state.followedOnly ? "On" : "Off";
    elements.followToggleButton.setAttribute("aria-pressed", state.followedOnly ? "true" : "false");
    elements.followToggleButton.classList.toggle("button-ghost", !state.followedOnly);
    elements.followToggleButton.disabled = state.isLoading || state.isManagingTags;
  }

  if (elements.followTagInput) {
    elements.followTagInput.disabled = state.isManagingTags;
  }

  if (elements.followTagSubmit) {
    elements.followTagSubmit.disabled = state.isManagingTags;
  }

  if (elements.followedTagsSummary) {
    elements.followedTagsSummary.textContent = resolveFollowedTagsCountLabel(state.followedTags.length);
  }

  renderFollowedTagsList(elements.followedTagsList, state.followedTags, {
    disabled: state.isManagingTags,
  });
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

  if (isCollectionsFeed()) {
    renderCollectionFeedList(elements.list, state.items, {
      currentUserId: state.viewerId,
      currentUserRole: state.viewerRole,
      canManageTagFollows: hasSession(),
      followedTagSet: new Set(state.followedTags),
    });
  } else {
    renderFeedList(elements.list, state.items, {
      viewerRole: state.viewerRole,
      viewerId: state.viewerId,
      canReviewPosts: hasSession(),
      canManageTagFollows: hasSession(),
      followedTagSet: new Set(state.followedTags),
    });
  }

  if (elements.loadMore) {
    elements.loadMore.hidden = !state.nextCursor;
    elements.loadMore.disabled = state.isLoading;
  }
}

function getFeedRequest() {
  if (isCollectionsFeed()) {
    return state.followedOnly ? api.collections.listFeedFollowing : api.collections.listFeed;
  }

  return state.followedOnly ? api.feed.listFollowing : api.feed.list;
}

async function loadFeed({ append = false } = {}) {
  if (append && (state.isLoading || !state.nextCursor)) {
    return;
  }

  const requestId = ++feedRequestSequence;
  latestFeedRequestId = requestId;

  if (!append) {
    clearSearchDebounce();
    state.searchInputValue = state.searchInputValue.trim();
    state.searchTerm = state.searchInputValue;
    state.nextCursor = null;
  }

  if (state.followedOnly && !hasFollowedTags()) {
    latestLoadingFeedRequestId = 0;
    state.isLoading = false;
    syncSearchControls();
    renderFollowedTagsPanel();
    state.items = [];
    state.nextCursor = null;
    renderFeed();
    statusFlash.show(resolveEmptyFeedMessage(), "info");
    return;
  }

  latestLoadingFeedRequestId = requestId;
  state.isLoading = true;
  syncSearchControls();
  renderFollowedTagsPanel();
  statusFlash.show(resolveLoadingMessage({ append }), "info");
  if (elements.loadMore) {
    elements.loadMore.disabled = true;
  }

  try {
    const data = await getFeedRequest()({
      cursor: append ? state.nextCursor : undefined,
      limit: FEED_LIMIT,
      search: state.searchTerm || undefined,
    });

    // Ignore stale responses when a newer realtime search has already started.
    if (requestId !== latestFeedRequestId) {
      return;
    }

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
    if (requestId !== latestFeedRequestId) {
      return;
    }

    statusFlash.show(resolveFeedLoadMessage(error), "error");
    if (!append) {
      state.items = [];
      state.nextCursor = null;
      renderFeed();
    }
  } finally {
    if (requestId === latestLoadingFeedRequestId) {
      latestLoadingFeedRequestId = 0;
      state.isLoading = false;
      if (elements.loadMore) {
        elements.loadMore.disabled = false;
      }
      syncSearchControls();
      renderFollowedTagsPanel();
    }
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
  uploadPostMedia(postId, files) {
    return api.posts.uploadMedia(postId, files);
  },
  deletePostMedia(postId, mediaId) {
    return api.posts.deleteMedia(postId, mediaId);
  },
  async onMediaChanged({ action }) {
    if (action === "delete") {
      await loadFeed();
    }
  },
  async onAfterSuccess({ mode, mediaError, mediaErrorMessage }) {
    await loadFeed();
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
    state.followedOnly = false;
    setFollowedTags([]);
    renderFollowedTagsPanel();
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
  showFollowTagStatus(
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

    if (state.followedOnly) {
      state.nextCursor = null;
      await loadFeed();
    }

    const successMessage = currentlyFollowing
      ? `You no longer follow #${normalizedTag}.`
      : `You now follow #${normalizedTag}.`;
    statusFlash.show(successMessage, "success");
    showFollowTagStatus(successMessage, "success");
    return true;
  } catch (error) {
    const message = resolveFollowTagMessage(error);
    statusFlash.show(message, "error");
    showFollowTagStatus(message, "error");
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
  const validation = validateFollowTagValue(rawValue);
  const normalizedTag = validation.normalizedValue;

  if (validation.errorCode) {
    showFollowTagStatus(resolveFollowTagValidationMessage(validation), "error");
    elements.followTagInput?.focus();
    return;
  }

  if (state.followedTags.includes(normalizedTag)) {
    showFollowTagStatus(`You already follow #${normalizedTag}.`, "info");
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
  if (state.isReviewing || isCollectionsFeed()) {
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

const deletePostController = createDestructiveModalController({
  dialog: elements.deletePostModal,
  titleTarget: elements.deletePostTitle,
  descriptionTarget: elements.deletePostDescription,
  noteTarget: elements.deletePostNote,
  cancelButton: elements.deletePostCancelButton,
  confirmButton: elements.deletePostConfirmButton,
  statusTarget: elements.deletePostStatus,
  async onConfirm({ context, close }) {
    const postId = String(context?.postId ?? "").trim();
    if (!postId || state.isDeletingPost || isCollectionsFeed()) {
      return;
    }

    state.isDeletingPost = true;

    try {
      await api.posts.delete(postId);
      await loadFeed();
      statusFlash.show("Post deleted.", "success");
    } catch (error) {
      if (error?.code === "UNAUTHENTICATED" || error?.status === 401) {
        statusFlash.show("Sign in to delete posts.", "error");
        close({ force: true });
        window.location.href = "./index.html";
        return;
      }

      throw error;
    } finally {
      state.isDeletingPost = false;
    }
  },
});

function openDeleteFeedPostModal(postId, restoreFocusTo = null) {
  if (isCollectionsFeed() || state.isDeletingPost) {
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

  deletePostController.open({
    actionKey: "post.delete",
    context: {
      postId: String(postId),
      resolveErrorMessage: resolveDeleteMessage,
    },
    restoreFocusTo,
  });
}

function editFeedPost(postId) {
  if (isCollectionsFeed()) {
    return;
  }

  const post = state.items.find((item) => String(item.id) === String(postId));
  const isOwner = String(state.viewerId ?? "") === String(post?.author?.id ?? "");

  if (!isOwner) {
    statusFlash.show("Only the author can edit this post.", "error");
    return;
  }

  postModalController.openPostModalEdit(post);
}

function bindEvents() {
  elements.searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.searchInputValue = String(elements.searchInput?.value ?? "");
    clearSearchDebounce();
    loadFeed();
  });

  elements.searchInput?.addEventListener("input", (event) => {
    state.searchInputValue = String(elements.searchInput?.value ?? event.target?.value ?? "");
    syncSearchControls();
    scheduleSearchReload();
  });

  elements.searchResetButton?.addEventListener("click", () => {
    clearSearchDebounce();
    state.searchInputValue = "";
    syncSearchControls();
    loadFeed();
    elements.searchInput?.focus();
  });

  elements.followTagForm?.addEventListener("submit", handleManualFollowTag);

  elements.feedTypeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextFeedType = String(button.dataset.feedTypeButton ?? "").trim();
      if (!nextFeedType || nextFeedType === state.feedType) {
        return;
      }

      state.feedType = nextFeedType;
      state.nextCursor = null;
      syncSearchControls();
      renderFollowedTagsPanel();
      loadFeed();
    });
  });

  elements.followToggleButton?.addEventListener("click", () => {
    if (!hasSession()) {
      statusFlash.show("Sign in to use followed tags.", "error");
      return;
    }

    state.followedOnly = !state.followedOnly;
    state.nextCursor = null;
    renderFollowedTagsPanel();
    loadFeed();
  });

  elements.followedTagsDropdown?.addEventListener("click", (event) => {
    const labelButton = event.target.closest("[data-followed-tag-preview]");
    if (labelButton && elements.followedTagsDropdown.contains(labelButton)) {
      previewFollowedTagLabel(labelButton);
      return;
    }

    const followButton = event.target.closest("[data-follow-tag]");
    if (followButton && elements.followedTagsDropdown.contains(followButton)) {
      const tag = String(followButton.dataset.followTag ?? "").trim();
      const currentlyFollowing = followButton.dataset.following === "true";
      if (tag) {
        toggleFollowTag(tag, currentlyFollowing);
      }
    }
  });

  elements.followedTagsDropdown?.addEventListener("toggle", () => {
    if (!elements.followedTagsDropdown.open) {
      clearFollowTagStatus("preview");
    }
  });

  elements.loadMore?.addEventListener("click", () => {
    loadFeed({ append: true });
  });

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

    const reviewButton = event.target.closest("[data-review-action]");
    if (reviewButton && elements.list.contains(reviewButton)) {
      const postId = String(reviewButton.dataset.postId ?? "").trim();
      const decision = String(reviewButton.dataset.reviewAction ?? "").trim();
      if (!postId || !decision) {
        return;
      }

      const actionsContainer = reviewButton.closest(".review-actions");
      submitFeedReview(postId, decision, actionsContainer);
      return;
    }

    const editButton = event.target.closest("[data-edit-post-id]");
    if (editButton && elements.list.contains(editButton)) {
      const postId = String(editButton.dataset.editPostId ?? "").trim();
      if (postId) {
        editFeedPost(postId);
      }
      return;
    }

    const deleteButton = event.target.closest("[data-delete-post-id]");
    if (deleteButton && elements.list.contains(deleteButton)) {
      const postId = String(deleteButton.dataset.deletePostId ?? "").trim();
      if (postId) {
        openDeleteFeedPostModal(postId, deleteButton);
      }
    }
  });
}

async function init() {
  if (!elements.list) {
    return;
  }

  state.searchInputValue = String(elements.searchInput?.value ?? "");
  bindNavigation();
  navbar.refresh();
  syncSearchControls();
  renderFollowedTagsPanel();
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
  await loadFeed();
}

init();

import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { normalizeFollowedTags, normalizeFollowTagValue } from "../core/followed-tags.js";
import { resolveAuthApiMessage, resolveModerationApiMessage } from "../core/http-state.js";
import { hasSession, requireSession } from "../core/session.js";
import { UI_TEXT } from "../core/ui-text.js";
import { renderFeedList } from "../features/feed/renderers.js";
import { reviewSavedMessage } from "../features/moderation/renderers.js";
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
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  openModalButton: document.querySelector("[data-open-post-modal]"),
  logoutButton: document.querySelector("[data-logout]"),
  modal: document.querySelector("[data-post-modal]"),
  modalTitle: document.querySelector("[data-post-modal-title]"),
  modalCancelButton: document.querySelector("[data-post-modal-cancel]"),
  modalSubmitButton: document.querySelector("[data-post-modal-submit]"),
  postModalForm: document.querySelector("[data-post-modal-form]"),
  postModalStatus: document.querySelector("[data-post-modal-status]"),
  postMediaInput: document.querySelector("[data-post-media-input]"),
  selectedPostMedia: document.querySelector("[data-selected-post-media]"),
  existingPostMedia: document.querySelector("[data-existing-post-media]"),
  questionnaireEditor: document.querySelector("[data-post-questionnaire-editor]"),
};

const statusFlash = createFlash(elements.status);
const followTagFlash = createFlash(elements.followTagStatus);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  protectedButtons: [elements.openModalButton],
  logoutRedirectUrl: "./index.html",
});

function resolveMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Autentica\u00e7\u00e3o necess\u00e1ria. Fa\u00e7a login para publicar no feed.",
    UI_TEXT.genericApiError,
  );
}

function resolveFollowTagMessage(error) {
  return resolveAuthApiMessage(error, UI_TEXT.auth.loginToFollowTags, UI_TEXT.followTags.updateError);
}

function resolveFeedLoadMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Autentica\u00e7\u00e3o necess\u00e1ria. Fa\u00e7a login para acessar seu feed de tags.",
    "Erro inesperado ao carregar o feed.",
  );
}

function setFollowedTags(tags) {
  state.followedTags = normalizeFollowedTags(tags);
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
      return "Carregando mais posts das tags que voc\u00ea segue...";
    }

    return hasActiveSearch()
      ? `Buscando nas tags que voc\u00ea segue por "${state.searchTerm}"...`
      : "Carregando feed das tags que voc\u00ea segue...";
  }

  if (append) {
    return hasActiveSearch() ? "Carregando mais resultados..." : "Carregando mais posts...";
  }

  return hasActiveSearch() ? `Buscando posts por "${state.searchTerm}"...` : "Carregando feed...";
}

function resolveEmptyFeedMessage() {
  if (isFollowingMode() && !hasFollowedTags()) {
    return "Siga uma tag para montar seu feed personalizado.";
  }

  if (isFollowingMode()) {
    return hasActiveSearch()
      ? `Nenhum post encontrado nas tags que voc\u00ea segue para "${state.searchTerm}".`
      : "Nenhum post encontrado nas tags que voc\u00ea segue.";
  }

  return hasActiveSearch()
    ? `Nenhum post encontrado para "${state.searchTerm}".`
    : "Nenhuma publica\u00e7\u00e3o ainda.";
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
      ? "Seu feed pessoal continua cronol\u00f3gico e mostra posts com qualquer tag que voc\u00ea segue."
      : "Siga tags para abrir um segundo feed sem alterar o feed p\u00fablico principal.";
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
    elements.followedTagsList.innerHTML = `<p class="muted">${UI_TEXT.followTags.empty}</p>`;
    return;
  }

  elements.followedTagsList.innerHTML = `
    <ul class="tag-list" aria-label="Tags seguidas">
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
                Seguindo
              </button>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
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
  selectedMediaTarget: elements.selectedPostMedia,
  existingMediaTarget: elements.existingPostMedia,
  questionnaireTarget: elements.questionnaireEditor,
  resolveErrorMessage: resolveMessage,
  onBeforeOpenCreate() {
    const isAuthenticated = requireSession({
      onFail: () => {
        statusFlash.show(UI_TEXT.auth.loginToCreatePost, "error");
        window.location.href = "./index.html";
      },
    });

    return isAuthenticated;
  },
  onBeforeOpenEdit() {
    const isAuthenticated = hasSession();
    if (!isAuthenticated) {
      statusFlash.show(UI_TEXT.auth.loginToEditPost, "error");
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
          ? UI_TEXT.posts.updateMediaError(mediaErrorMessage)
          : UI_TEXT.posts.updateSuccess,
        mediaError ? "error" : "success",
      );
      return;
    }

    statusFlash.show(
      mediaError
        ? UI_TEXT.posts.createMediaError(mediaErrorMessage)
        : UI_TEXT.posts.createSuccess,
      mediaError ? "error" : "success",
    );
  },
});

async function syncViewerContext() {
  if (!hasSession()) {
    state.viewerRole = null;
    state.viewerId = null;
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
    statusFlash.show(UI_TEXT.auth.loginToFollowTags, "error");
    return false;
  }

  const normalizedTag = normalizeFollowTagValue(tag);
  if (!normalizedTag) {
    return false;
  }

  state.isManagingTags = true;
  renderFollowedTagsPanel();
  followTagFlash.show(
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
    renderFollowedTagsPanel();
    renderFeed();

    if (isFollowingMode()) {
      state.nextCursor = null;
      await loadFeed();
    }

    const successMessage = currentlyFollowing
      ? UI_TEXT.followTags.stoppedFollowing(normalizedTag)
      : UI_TEXT.followTags.nowFollowing(normalizedTag);
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
    followTagFlash.show("Digite uma tag antes de enviar.", "error");
    return;
  }

  if (state.followedTags.includes(normalizedTag)) {
    followTagFlash.show(UI_TEXT.followTags.alreadyFollowing(normalizedTag), "info");
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
    statusFlash.show(UI_TEXT.auth.loginToReviewPost, "error");
    return;
  }

  const reviewButtons = Array.from(
    actionsContainer?.querySelectorAll("[data-review-action]") ?? [],
  );

  state.isReviewing = true;
  reviewButtons.forEach((button) => {
    button.disabled = true;
  });
  statusFlash.show("Salvando avaliação...", "info");

  try {
    const result = await api.posts.review(postId, decision, null);
    await loadFeed();
    statusFlash.show(reviewSavedMessage(result), "success");
  } catch (error) {
    statusFlash.show(
      resolveModerationApiMessage(error, "Falha ao salvar avaliação."),
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
    "Autenticação necessária para excluir posts.",
    "Falha ao excluir o post.",
  );
}

async function deleteFeedPost(postId) {
  if (state.isDeletingPost) {
    return;
  }

  if (!hasSession()) {
    statusFlash.show(UI_TEXT.auth.loginToDeletePosts, "error");
    window.location.href = "./index.html";
    return;
  }

  const post = state.items.find((item) => String(item.id) === String(postId));
  const isOwner = String(state.viewerId ?? "") === String(post?.author?.id ?? "");
  if (!["moderator", "admin"].includes(state.viewerRole ?? "") && !isOwner) {
    statusFlash.show(
      "Apenas autor do post, moderadores ou administradores podem excluir posts.",
      "error",
    );
    return;
  }

  state.isDeletingPost = true;
  statusFlash.show("Excluindo post...", "info");
  try {
    await api.posts.delete(postId);
    await loadFeed();
    statusFlash.show(UI_TEXT.posts.deleted, "success");
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
    statusFlash.show("Apenas o autor pode editar este post.", "error");
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
        const editPostId = String(editButton.dataset.editPostId ?? "").trim();
        if (editPostId) {
          editFeedPost(editPostId);
        }
        return;
      }

      const deleteButton = event.target.closest("[data-delete-post-id]");
      if (deleteButton && elements.list.contains(deleteButton)) {
        const deletePostId = String(deleteButton.dataset.deletePostId ?? "").trim();
        if (deletePostId) {
          deleteFeedPost(deletePostId);
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

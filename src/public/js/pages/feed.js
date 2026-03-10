import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { resolveAuthApiMessage, resolveModerationApiMessage } from "../core/http-state.js";
import { hasSession, requireSession } from "../core/session.js";
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
    "Autenticação necessária. Faça login para publicar no feed.",
    "Erro inesperado ao comunicar com a API.",
  );
}

function resolveFollowTagMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Autenticação necessária. Faça login para seguir tags.",
    "Falha ao atualizar as tags seguidas.",
  );
}

function resolveFeedLoadMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Autenticação necessária. Faça login para acessar seu feed de tags.",
    "Erro inesperado ao carregar o feed.",
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
      return "Carregando mais posts das tags que você segue...";
    }

    return hasActiveSearch()
      ? `Buscando nas tags que você segue por "${state.searchTerm}"...`
      : "Carregando feed das tags que você segue...";
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
      ? `Nenhum post encontrado nas tags que você segue para "${state.searchTerm}".`
      : "Nenhum post encontrado nas tags que você segue.";
  }

  return hasActiveSearch()
    ? `Nenhum post encontrado para "${state.searchTerm}".`
    : "Nenhuma publicação ainda.";
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
      ? "Seu feed pessoal continua cronológico e mostra posts com qualquer tag que você segue."
      : "Siga tags para abrir um segundo feed sem alterar o feed público principal.";
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
    elements.followedTagsList.innerHTML = "<p class='muted'>Você ainda não segue nenhuma tag.</p>";
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
        statusFlash.show("Faça login para publicar no feed.", "error");
        window.location.href = "./index.html";
      },
    });

    return isAuthenticated;
  },
  onBeforeOpenEdit() {
    const isAuthenticated = hasSession();
    if (!isAuthenticated) {
      statusFlash.show("Faça login para editar posts.", "error");
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
          ? `Post atualizado, mas as imagens não foram enviadas: ${mediaErrorMessage ?? "verifique os arquivos selecionados."}`
          : "Post atualizado.",
        mediaError ? "error" : "success",
      );
      return;
    }

    statusFlash.show(
      mediaError
        ? `Post publicado, mas as imagens não foram enviadas: ${mediaErrorMessage ?? "verifique os arquivos selecionados."}`
        : "Post publicado.",
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
    statusFlash.show("Faça login para seguir tags.", "error");
    return false;
  }

  const normalizedTag = normalizeFollowTagValue(tag);
  if (!normalizedTag) {
    return false;
  }

  state.isManagingTags = true;
  renderFollowedTagsPanel();
  followTagFlash.show(
    currentlyFollowing ? `Parando de seguir #${normalizedTag}...` : `Seguindo #${normalizedTag}...`,
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
      ? `Você deixou de seguir #${normalizedTag}.`
      : `Agora você segue #${normalizedTag}.`;
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
    followTagFlash.show(`Você já segue #${normalizedTag}.`, "info");
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
    statusFlash.show("Faça login para avaliar um post.", "error");
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
    statusFlash.show("Faça login para excluir posts.", "error");
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
    statusFlash.show("Post excluído.", "success");
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

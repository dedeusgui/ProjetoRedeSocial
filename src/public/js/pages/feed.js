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
  viewerRole: null,
  viewerId: null,
  isLoading: false,
  isReviewing: false,
  isDeletingPost: false,
};

const elements = {
  status: document.querySelector("[data-feed-status]"),
  list: document.querySelector("[data-feed-list]"),
  loadMore: document.querySelector("[data-feed-more]"),
  searchForm: document.querySelector("[data-feed-search-form]"),
  searchInput: document.querySelector("[data-feed-search-input]"),
  searchSubmitButton: document.querySelector("[data-feed-search-submit]"),
  searchResetButton: document.querySelector("[data-feed-search-reset]"),
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
};

const statusFlash = createFlash(elements.status);

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
    "Autenticacao necessaria. Faca login para publicar no feed.",
    "Erro inesperado ao comunicar com a API.",
  );
}

function hasActiveSearch() {
  return state.searchTerm.length > 0;
}

function resolveLoadingMessage({ append = false } = {}) {
  if (append) {
    return hasActiveSearch() ? "Carregando mais resultados..." : "Carregando mais posts...";
  }

  return hasActiveSearch() ? `Buscando posts por "${state.searchTerm}"...` : "Carregando feed...";
}

function resolveEmptyFeedMessage() {
  return hasActiveSearch()
    ? `Nenhum post encontrado para "${state.searchTerm}".`
    : "Nenhuma publicacao ainda.";
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

  state.isLoading = true;
  syncSearchControls();
  statusFlash.show(resolveLoadingMessage({ append }), "info");
  if (elements.loadMore) {
    elements.loadMore.disabled = true;
  }

  try {
    const data = await api.feed.list({
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
    statusFlash.show(resolveMessage(error), "error");
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
  }
}

async function submitPostCreate(payload) {
  const created = await api.posts.create(payload);
  await loadFeed();
  return created;
}

async function submitPostUpdate(postId, payload) {
  const updated = await api.posts.update(postId, payload);
  if (hasActiveSearch()) {
    await loadFeed();
    return updated;
  }

  const index = state.items.findIndex((item) => String(item.id) === String(postId));
  if (index >= 0) {
    const current = state.items[index];
    state.items[index] = {
      ...current,
      title: updated.title ?? current.title,
      content: updated.content ?? current.content,
      tags: Array.isArray(updated.tags) ? updated.tags : current.tags,
      updatedAt: updated.updatedAt ?? current.updatedAt,
    };
    renderFeed();
  }
  return updated;
}

const postModalController = createPostModalController({
  modal: elements.modal,
  form: elements.postModalForm,
  title: elements.modalTitle,
  submitButton: elements.modalSubmitButton,
  cancelButton: elements.modalCancelButton,
  statusTarget: elements.postModalStatus,
  openCreateButton: elements.openModalButton,
  resolveErrorMessage: resolveMessage,
  onBeforeOpenCreate() {
    const isAuthenticated = requireSession({
      onFail: () => {
        statusFlash.show("Faca login para publicar no feed.", "error");
        window.location.href = "./index.html";
      },
    });

    return isAuthenticated;
  },
  onBeforeOpenEdit() {
    const isAuthenticated = hasSession();
    if (!isAuthenticated) {
      statusFlash.show("Faca login para editar posts.", "error");
    }
    return isAuthenticated;
  },
  submitPostCreate,
  submitPostUpdate,
  async onAfterSuccess({ mode, result }) {
    if (mode === "edit") {
      statusFlash.show("Post atualizado.", "success");
      return;
    }

    statusFlash.show("Post publicado.", "success");
  },
});

async function syncViewerRole() {
  if (!hasSession()) {
    state.viewerRole = null;
    state.viewerId = null;
    return;
  }

  try {
    const profile = await api.users.meProfile();
    state.viewerRole = profile.role ?? null;
    state.viewerId = profile.id ?? null;
  } catch {
    state.viewerRole = null;
    state.viewerId = null;
  }
}

async function submitFeedReview(postId, decision, actionsContainer) {
  if (state.isReviewing) {
    return;
  }

  if (!hasSession()) {
    statusFlash.show("Faca login para avaliar um post.", "error");
    return;
  }

  const reviewButtons = Array.from(
    actionsContainer?.querySelectorAll("[data-review-action]") ?? [],
  );

  state.isReviewing = true;
  reviewButtons.forEach((button) => {
    button.disabled = true;
  });
  statusFlash.show("Salvando avaliacao...", "info");

  try {
    const result = await api.posts.review(postId, decision, null);
    await loadFeed();
    statusFlash.show(reviewSavedMessage(result), "success");
  } catch (error) {
    statusFlash.show(
      resolveModerationApiMessage(error, "Falha ao salvar avaliacao."),
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
    "Autenticacao necessaria para excluir posts.",
    "Falha ao excluir o post.",
  );
}

async function deleteFeedPost(postId) {
  if (state.isDeletingPost) {
    return;
  }

  if (!hasSession()) {
    statusFlash.show("Faca login para excluir posts.", "error");
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
    statusFlash.show("Post excluido.", "success");
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

  if (elements.loadMore) {
    elements.loadMore.addEventListener("click", () => {
      loadFeed({ append: true });
    });
  }

  if (elements.list) {
    elements.list.addEventListener("click", (event) => {
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
  try {
    const pendingNotice = window.sessionStorage.getItem(FEED_NOTICE_KEY);
    if (pendingNotice) {
      statusFlash.show(pendingNotice, "success");
      window.sessionStorage.removeItem(FEED_NOTICE_KEY);
    }
  } catch {
    // noop: sessionStorage can be unavailable in restricted environments
  }

  await syncViewerRole();
  bindEvents();
  await loadFeed();
}

init();

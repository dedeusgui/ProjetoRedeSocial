import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { parseCsvTags } from "../core/formatters.js";
import { resolveAuthApiMessage, resolveModerationApiMessage } from "../core/http-state.js";
import { hasSession, requireSession } from "../core/session.js";
import { renderFeedList } from "../features/feed/renderers.js";

const FEED_LIMIT = 20;
const FEED_NOTICE_KEY = "thesocial_feed_notice";

const state = {
  items: [],
  nextCursor: null,
  isLoading: false,
  isCreating: false,
  isReviewing: false,
};

const elements = {
  status: document.querySelector("[data-feed-status]"),
  list: document.querySelector("[data-feed-list]"),
  loadMore: document.querySelector("[data-feed-more]"),
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  openModalButton: document.querySelector("[data-open-post-modal]"),
  logoutButton: document.querySelector("[data-logout]"),
  modal: document.querySelector("[data-create-post-modal]"),
  closeModalButton: document.querySelector("[data-close-post-modal]"),
  createForm: document.querySelector("[data-create-post-form]"),
  createStatus: document.querySelector("[data-create-post-status]"),
};

const statusFlash = createFlash(elements.status);
const createFlashStatus = createFlash(elements.createStatus);

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
    "Erro inesperado ao comunicar com a API.",
  );
}

function renderFeed() {
  if (!elements.list) {
    return;
  }

  if (state.items.length === 0) {
    elements.list.innerHTML = "";
    statusFlash.show("Nenhuma publica\u00e7\u00e3o ainda.", "info");
    if (elements.loadMore) {
      elements.loadMore.hidden = true;
    }
    return;
  }

  renderFeedList(elements.list, state.items);

  if (elements.loadMore) {
    elements.loadMore.hidden = !state.nextCursor;
    elements.loadMore.disabled = state.isLoading;
  }
}

async function loadFeed({ append = false } = {}) {
  if (state.isLoading) {
    return;
  }

  state.isLoading = true;
  statusFlash.show("Carregando feed...", "info");
  if (elements.loadMore) {
    elements.loadMore.disabled = true;
  }

  try {
    const data = await api.feed.list({
      cursor: append ? state.nextCursor : undefined,
      limit: FEED_LIMIT,
    });

    const incoming = Array.isArray(data.items) ? data.items : [];
    state.items = append ? [...state.items, ...incoming] : incoming;
    state.nextCursor = data.pageInfo?.nextCursor ?? null;

    renderFeed();
    statusFlash.show(
      state.items.length > 0
        ? "Feed atualizado."
        : "Nenhuma publica\u00e7\u00e3o ainda.",
      "success",
    );
  } catch (error) {
    statusFlash.show(resolveMessage(error), "error");
    if (!append) {
      state.items = [];
      renderFeed();
    }
  } finally {
    state.isLoading = false;
    if (elements.loadMore) {
      elements.loadMore.disabled = false;
    }
  }
}

function openModal() {
  if (!elements.modal) {
    return;
  }

  const isAuthenticated = requireSession({
    onFail: () => {
      statusFlash.show("Fa\u00e7a login para publicar no feed.", "error");
      window.location.href = "./index.html";
    },
  });

  if (!isAuthenticated) {
    return;
  }

  elements.modal.showModal();
  createFlashStatus.clear();
}

function closeModal() {
  if (elements.modal?.open) {
    elements.modal.close();
  }
}

async function submitCreatePost(event) {
  event.preventDefault();
  if (state.isCreating || !elements.createForm) {
    return;
  }

  const formData = new FormData(elements.createForm);
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const tags = parseCsvTags(formData.get("tags"));

  state.isCreating = true;
  createFlashStatus.show("Publicando post...", "info");

  try {
    const created = await api.posts.create({ title, content, tags });
    elements.createForm.reset();
    closeModal();
    await loadFeed();
    statusFlash.show(`Post publicado: ${created.title}`, "success");
  } catch (error) {
    createFlashStatus.show(resolveMessage(error), "error");
  } finally {
    state.isCreating = false;
  }
}

async function submitFeedReview(postId, decision, actionsContainer) {
  if (state.isReviewing) {
    return;
  }

  if (!hasSession()) {
    statusFlash.show("Fa\u00e7a login para avaliar um post.", "error");
    window.location.href = "./index.html";
    return;
  }

  const reviewButtons = Array.from(
    actionsContainer?.querySelectorAll("[data-review-action]") ?? [],
  );

  state.isReviewing = true;
  reviewButtons.forEach((button) => {
    button.disabled = true;
  });
  statusFlash.show("Salvando avalia\u00e7\u00e3o...", "info");

  try {
    const result = await api.posts.review(postId, decision, null);
    await loadFeed();
    statusFlash.show(`Avalia\u00e7\u00e3o salva. Tend\u00eancia atual: ${result.trend}.`, "success");
  } catch (error) {
    statusFlash.show(
      resolveModerationApiMessage(error, "Falha ao salvar avalia\u00e7\u00e3o."),
      "error",
    );
  } finally {
    state.isReviewing = false;
    reviewButtons.forEach((button) => {
      button.disabled = false;
    });
  }
}

function bindEvents() {
  if (elements.loadMore) {
    elements.loadMore.addEventListener("click", () => {
      loadFeed({ append: true });
    });
  }

  if (elements.openModalButton) {
    elements.openModalButton.addEventListener("click", openModal);
  }

  if (elements.closeModalButton) {
    elements.closeModalButton.addEventListener("click", closeModal);
  }

  if (elements.modal) {
    elements.modal.addEventListener("click", (event) => {
      if (event.target === elements.modal) {
        closeModal();
      }
    });
  }

  if (elements.createForm) {
    elements.createForm.addEventListener("submit", submitCreatePost);
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
  }
}

function init() {
  if (!elements.list) {
    return;
  }

  bindNavigation();
  navbar.refresh();
  try {
    const pendingNotice = window.sessionStorage.getItem(FEED_NOTICE_KEY);
    if (pendingNotice) {
      statusFlash.show(pendingNotice, "success");
      window.sessionStorage.removeItem(FEED_NOTICE_KEY);
    }
  } catch {
    // noop: sessionStorage can be unavailable in restricted environments
  }

  if (!hasSession()) {
    createFlashStatus.clear();
  }
  bindEvents();
  loadFeed();
}

init();

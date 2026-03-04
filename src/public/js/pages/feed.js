import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initMotionToggle } from "../components/motion.js";
import { initNavbar } from "../components/navbar.js";
import { parseCsvTags } from "../core/formatters.js";
import { resolveAuthApiMessage } from "../core/http-state.js";
import { hasSession, requireSession } from "../core/session.js";
import { renderFeedList } from "../features/feed/renderers.js";

const FEED_LIMIT = 20;

const state = {
  items: [],
  nextCursor: null,
  isLoading: false,
  isCreating: false,
};

const elements = {
  status: document.querySelector("[data-feed-status]"),
  list: document.querySelector("[data-feed-list]"),
  loadMore: document.querySelector("[data-feed-more]"),
  loginLink: document.querySelector("[data-login-link]"),
  openModalButton: document.querySelector("[data-open-post-modal]"),
  logoutButton: document.querySelector("[data-logout]"),
  modal: document.querySelector("[data-create-post-modal]"),
  closeModalButton: document.querySelector("[data-close-post-modal]"),
  createForm: document.querySelector("[data-create-post-form]"),
  createStatus: document.querySelector("[data-create-post-status]"),
  motionToggle: document.querySelector("[data-motion-toggle]"),
};

const statusFlash = createFlash(elements.status);
const createFlashStatus = createFlash(elements.createStatus);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  logoutButton: elements.logoutButton,
  protectedButtons: [elements.openModalButton],
  onLogout: () => {
    statusFlash.show("Sessao encerrada. O feed continua cronologico.", "info");
    navbar.refresh();
    closeModal();
  },
});

function resolveMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Autenticacao necessaria. Faca login para contribuir com posts.",
    "Erro inesperado ao comunicar com a API.",
  );
}

function renderFeed() {
  if (!elements.list) {
    return;
  }

  if (state.items.length === 0) {
    elements.list.innerHTML = "";
    statusFlash.show("Sem publicacoes por enquanto. Poste algo que agregue.", "info");
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
  statusFlash.show("Carregando feed cronologico...", "info");
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
        ? "Feed atualizado. Conteudo acima de status."
        : "Sem publicacoes por enquanto. Poste algo que agregue.",
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
      statusFlash.show("Faca login para publicar conhecimento.", "error");
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
  createFlashStatus.show("Publicando conteudo...", "info");

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
}

function init() {
  if (!elements.list) {
    return;
  }

  initMotionToggle({ button: elements.motionToggle });
  navbar.refresh();
  if (!hasSession()) {
    createFlashStatus.clear();
  }
  bindEvents();
  loadFeed();
}

init();

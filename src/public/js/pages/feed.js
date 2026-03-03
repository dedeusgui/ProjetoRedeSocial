import { api, ApiError, auth } from "../api.js";

const FEED_LIMIT = 20;
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

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
};

function setMessage(target, message) {
  if (target) {
    target.textContent = message;
  }
}

function parseTags(raw) {
  return String(raw ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function resolveApiMessage(error) {
  if (!(error instanceof ApiError)) {
    return "Erro inesperado ao comunicar com a API.";
  }

  if (error.code === "UNAUTHENTICATED" || error.status === 401) {
    return "Autenticacao necessaria. Faca login na pagina inicial.";
  }

  return error.message;
}

function trendClass(trend) {
  if (trend === "positive") return "status-positive";
  if (trend === "negative") return "status-negative";
  return "status-neutral";
}

function ensureChronologicalOrder(items) {
  return [...items].sort((a, b) => {
    const dateDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }
    return String(b.id).localeCompare(String(a.id));
  });
}

function createPostCard(post) {
  const article = document.createElement("article");
  article.className = "card post-card";

  const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [];
  const createdAtText = dateFormatter.format(new Date(post.createdAt));

  article.innerHTML = `
    <p class="muted post-meta">@${post.author?.username ?? "desconhecido"} - ${createdAtText}</p>
    <h2 class="post-title"></h2>
    <p class="post-content"></p>
    <p class="muted post-tags"></p>
    <p class="${trendClass(post.trend)}">Tendencia: ${post.trend ?? "neutral"}</p>
    <p><a class="link-inline" href="./post.html?id=${post.id}">Abrir post e comentarios</a></p>
  `;

  article.querySelector(".post-title").textContent = post.title ?? "";
  article.querySelector(".post-content").textContent = post.content ?? "";
  article.querySelector(".post-tags").textContent =
    tags.length > 0 ? tags.map((tag) => `#${tag}`).join(" ") : "";

  return article;
}

function renderAuthState() {
  const hasToken = Boolean(auth.getToken());

  if (elements.loginLink) {
    elements.loginLink.hidden = hasToken;
  }
  if (elements.logoutButton) {
    elements.logoutButton.hidden = !hasToken;
  }
  if (elements.openModalButton) {
    elements.openModalButton.disabled = !hasToken;
  }
}

function renderFeed() {
  if (!elements.list) {
    return;
  }

  elements.list.innerHTML = "";

  if (state.items.length === 0) {
    setMessage(elements.status, "Sem posts no momento.");
    if (elements.loadMore) {
      elements.loadMore.hidden = true;
    }
    return;
  }

  const orderedItems = ensureChronologicalOrder(state.items);
  orderedItems.forEach((post) => {
    elements.list.appendChild(createPostCard(post));
  });

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
  setMessage(elements.status, "Carregando feed...");
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
    setMessage(elements.status, state.items.length > 0 ? "Feed atualizado." : "Sem posts no momento.");
  } catch (error) {
    setMessage(elements.status, resolveApiMessage(error));
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

  if (!auth.getToken()) {
    setMessage(elements.status, "Faca login para publicar um post.");
    window.location.href = "./index.html";
    return;
  }

  elements.modal.showModal();
  setMessage(elements.createStatus, "");
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
  const tags = parseTags(formData.get("tags"));

  state.isCreating = true;
  setMessage(elements.createStatus, "Publicando...");

  try {
    const created = await api.posts.create({ title, content, tags });
    elements.createForm.reset();
    closeModal();
    await loadFeed();
    setMessage(elements.status, `Post criado com sucesso: ${created.title}`);
  } catch (error) {
    setMessage(elements.createStatus, resolveApiMessage(error));
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

  if (elements.logoutButton) {
    elements.logoutButton.addEventListener("click", () => {
      auth.clearToken();
      renderAuthState();
      setMessage(elements.status, "Sessao encerrada.");
      closeModal();
    });
  }
}

function init() {
  if (!elements.list) {
    return;
  }

  renderAuthState();
  bindEvents();
  loadFeed();
}

init();

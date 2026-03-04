import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { resolveAuthApiMessage, resolveModerationApiMessage } from "../core/http-state.js";
import { hasSession } from "../core/session.js";
import { renderPostView } from "../features/post/renderers.js";

const state = {
  postId: null,
  isReviewSubmitting: false,
};

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-post-status]"),
  view: document.querySelector("[data-post-view]"),
  commentForm: document.querySelector("[data-comment-form]"),
  commentHelp: document.querySelector("[data-comment-help]"),
  reviewPanel: document.querySelector("[data-review-panel]"),
  reviewApprove: document.querySelector("[data-review-approve]"),
  reviewReject: document.querySelector("[data-review-reject]"),
  reviewStatus: document.querySelector("[data-review-status]"),
};

const statusFlash = createFlash(elements.status);
const commentHelpFlash = createFlash(elements.commentHelp);
const reviewFlash = createFlash(elements.reviewStatus);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  logoutButton: elements.logoutButton,
  onLogout: () => {
    renderSessionState();
    refreshReviewPanel();
    statusFlash.show("Sess\u00e3o encerrada. Fa\u00e7a login para comentar.", "info");
  },
});

function resolveMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Autentica\u00e7\u00e3o necess\u00e1ria. Fa\u00e7a login para comentar.",
    "Erro inesperado ao comunicar com a API.",
  );
}

function renderSessionState() {
  const isAuthenticated = navbar.refresh();

  if (elements.commentForm) {
    const textarea = elements.commentForm.querySelector("textarea[name='content']");
    const submit = elements.commentForm.querySelector("button[type='submit']");

    if (textarea) {
      textarea.disabled = !isAuthenticated;
    }

    if (submit) {
      submit.disabled = !isAuthenticated;
    }
  }

  commentHelpFlash.show(
    isAuthenticated
      ? "Seu coment\u00e1rio ser\u00e1 exibido na discuss\u00e3o deste post."
      : "Fa\u00e7a login para comentar neste post.",
    "info",
  );
}

function getPostId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function refreshReviewPanel({ preserveStatus = false } = {}) {
  if (!elements.reviewPanel) {
    return;
  }

  if (!state.postId) {
    elements.reviewPanel.hidden = true;
    reviewFlash.clear();
    return;
  }

  elements.reviewPanel.hidden = false;
  const isAuthenticated = hasSession();

  if (elements.reviewApprove) {
    elements.reviewApprove.disabled = !isAuthenticated || state.isReviewSubmitting;
  }

  if (elements.reviewReject) {
    elements.reviewReject.disabled = !isAuthenticated || state.isReviewSubmitting;
  }

  if (preserveStatus || state.isReviewSubmitting) {
    return;
  }

  if (!isAuthenticated) {
    reviewFlash.show("Fa\u00e7a login para aprovar ou marcar como n\u00e3o relevante.", "info");
    return;
  }

  reviewFlash.show("Use aprovar/n\u00e3o relevante. Para contexto adicional, use coment\u00e1rios.", "info");
}

function renderMissingPostState(message) {
  if (!elements.view) {
    return;
  }

  elements.view.innerHTML = `
    <section class="card empty-card">
      <h2 class="ink-underline">Post indispon\u00edvel</h2>
      <p class="muted">${message}</p>
      <p class="muted">Volte ao feed para continuar.</p>
      <a class="button-link button-link-inline" href="./feed.html">Voltar ao feed</a>
    </section>
  `;
}

async function loadPost() {
  const postId = getPostId();
  state.postId = postId;

  if (!postId) {
    renderMissingPostState("ID do post ausente na URL.");
    statusFlash.show("N\u00e3o foi poss\u00edvel abrir o post.", "error");
    refreshReviewPanel();
    return;
  }

  statusFlash.show("Carregando post...", "info");

  try {
    const post = await api.posts.getById(postId);
    renderPostView(elements.view, post);
    refreshReviewPanel();
    statusFlash.show("Post carregado.", "success");
  } catch (error) {
    renderMissingPostState("Este post n\u00e3o pode ser exibido no momento.");
    refreshReviewPanel();
    statusFlash.show(resolveMessage(error), "error");
  }
}

async function handleCommentSubmit(event) {
  event.preventDefault();
  if (!elements.commentForm) {
    return;
  }

  const postId = getPostId();
  if (!postId) {
    statusFlash.show("ID do post ausente na URL.", "error");
    return;
  }

  if (!hasSession()) {
    statusFlash.show("Fa\u00e7a login para comentar neste post.", "error");
    return;
  }

  const formData = new FormData(elements.commentForm);
  const content = String(formData.get("content") ?? "").trim();
  if (!content) {
    statusFlash.show("Escreva um coment\u00e1rio antes de enviar.", "error");
    return;
  }

  try {
    await api.posts.createComment(postId, content);
    elements.commentForm.reset();
    await loadPost();
    statusFlash.show("Coment\u00e1rio enviado.", "success");
  } catch (error) {
    statusFlash.show(resolveMessage(error), "error");
  }
}

async function handleReview(decision) {
  if (!state.postId) {
    reviewFlash.show("Post inv\u00e1lido para avalia\u00e7\u00e3o.", "error");
    return;
  }

  if (!hasSession()) {
    window.location.href = "./index.html";
    return;
  }

  state.isReviewSubmitting = true;
  refreshReviewPanel({ preserveStatus: true });
  reviewFlash.show("Salvando avalia\u00e7\u00e3o...", "info");

  try {
    const result = await api.posts.review(state.postId, decision, null);
    reviewFlash.show(`Avalia\u00e7\u00e3o salva. Tend\u00eancia atual: ${result.trend}.`, "success");
    await loadPost();
  } catch (error) {
    reviewFlash.show(resolveModerationApiMessage(error, "Falha ao salvar avalia\u00e7\u00e3o."), "error");
  } finally {
    state.isReviewSubmitting = false;
    refreshReviewPanel({ preserveStatus: true });
  }
}

function bindEvents() {
  if (elements.commentForm) {
    elements.commentForm.addEventListener("submit", handleCommentSubmit);
  }

  if (elements.reviewApprove) {
    elements.reviewApprove.addEventListener("click", () => {
      handleReview("approved");
    });
  }

  if (elements.reviewReject) {
    elements.reviewReject.addEventListener("click", () => {
      handleReview("not_relevant");
    });
  }
}

async function init() {
  renderSessionState();
  bindEvents();
  await loadPost();
}

init();

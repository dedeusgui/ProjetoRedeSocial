import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initMotionToggle } from "../components/motion.js";
import { initNavbar } from "../components/navbar.js";
import { resolveAuthApiMessage, resolveModerationApiMessage } from "../core/http-state.js";
import { hasSession } from "../core/session.js";
import { renderPostView } from "../features/post/renderers.js";

const MODERATOR_ROLES = new Set(["admin", "moderator"]);

const state = {
  postId: null,
  postAuthorId: null,
  viewerId: null,
  viewerRole: null,
  canModerate: false,
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
  reviewReason: document.querySelector("[data-review-reason]"),
  reviewStatus: document.querySelector("[data-review-status]"),
  motionToggle: document.querySelector("[data-motion-toggle]"),
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
    statusFlash.show("Sess\u00e3o encerrada. Para comentar, entre novamente.", "info");
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
      ? "Coment\u00e1rio p\u00fablico e vis\u00edvel no detalhe do post."
      : "Fa\u00e7a login para comentar neste post.",
    "info",
  );
}

function getPostId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function refreshReviewPanel() {
  if (!elements.reviewPanel) {
    return;
  }

  const isAuthenticated = hasSession();
  const isAuthor = state.viewerId && state.postAuthorId && state.viewerId === state.postAuthorId;

  if (!isAuthenticated || !state.canModerate || !state.postId) {
    elements.reviewPanel.hidden = true;
    reviewFlash.clear();
    return;
  }

  elements.reviewPanel.hidden = false;

  if (isAuthor) {
    if (elements.reviewApprove) {
      elements.reviewApprove.disabled = true;
    }

    if (elements.reviewReject) {
      elements.reviewReject.disabled = true;
    }

    reviewFlash.show("O autor do post n\u00e3o pode revisar o pr\u00f3prio conte\u00fado.", "error");
    return;
  }

  if (elements.reviewApprove) {
    elements.reviewApprove.disabled = state.isReviewSubmitting;
  }

  if (elements.reviewReject) {
    elements.reviewReject.disabled = state.isReviewSubmitting;
  }

  if (!state.isReviewSubmitting && !elements.reviewStatus?.textContent) {
    reviewFlash.show("Modera\u00e7\u00e3o: escolha aprovar ou marcar como n\u00e3o relevante.", "info");
  }
}

async function loadViewerContext() {
  state.viewerId = null;
  state.viewerRole = null;
  state.canModerate = false;

  if (!hasSession()) {
    return;
  }

  try {
    const profile = await api.users.meProfile();
    state.viewerId = String(profile.id ?? "");
    state.viewerRole = String(profile.role ?? "");
    state.canModerate = MODERATOR_ROLES.has(state.viewerRole);
  } catch {
    state.viewerId = null;
    state.viewerRole = null;
    state.canModerate = false;
  }
}

function renderMissingPostState(message) {
  if (!elements.view) {
    return;
  }

  elements.view.innerHTML = `
    <section class="card empty-card">
      <h2 class="ink-underline">Post indispon\u00edvel</h2>
      <p class="muted">${message}</p>
      <p class="muted">Volte ao feed cronol\u00f3gico para continuar.</p>
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
    state.postAuthorId = String(post.author?.id ?? "");
    renderPostView(elements.view, post);
    refreshReviewPanel();
    statusFlash.show("Discuss\u00e3o carregada.", "success");
  } catch (error) {
    renderMissingPostState("Este conte\u00fado n\u00e3o pode ser exibido agora.");
    state.postAuthorId = null;
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
    reviewFlash.show("Post inv\u00e1lido para modera\u00e7\u00e3o.", "error");
    return;
  }

  if (!hasSession()) {
    window.location.href = "./index.html";
    return;
  }

  if (!state.canModerate) {
    reviewFlash.show("Apenas moderadores e administradores podem revisar posts.", "error");
    return;
  }

  const reason = String(elements.reviewReason?.value ?? "").trim();
  state.isReviewSubmitting = true;
  refreshReviewPanel();
  reviewFlash.show("Salvando review...", "info");

  try {
    const result = await api.posts.review(state.postId, decision, reason || null);
    reviewFlash.show(`Review salva. Tend\u00eancia atual: ${result.trend}.`, "success");
    await loadPost();
  } catch (error) {
    reviewFlash.show(resolveModerationApiMessage(error, "Falha ao salvar review."), "error");
  } finally {
    state.isReviewSubmitting = false;
    refreshReviewPanel();
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
  initMotionToggle({ button: elements.motionToggle });
  await loadViewerContext();
  renderSessionState();
  bindEvents();
  await loadPost();
}

init();

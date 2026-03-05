import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { resolveAuthApiMessage, resolveModerationApiMessage } from "../core/http-state.js";
import { hasSession } from "../core/session.js";
import { reviewSavedMessage } from "../features/moderation/renderers.js";
import { renderPostView } from "../features/post/renderers.js";

const state = {
  postId: null,
  viewerRole: null,
  viewerId: null,
  postAuthorId: null,
  isReviewSubmitting: false,
  isDeletingPost: false,
  isDeletingComment: false,
};

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
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
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  logoutRedirectUrl: "./index.html",
});

function resolveMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Autentica\u00e7\u00e3o necess\u00e1ria. Fa\u00e7a login para comentar.",
    "Erro inesperado ao comunicar com a API.",
  );
}

function resolveDeleteMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Autentica\u00e7\u00e3o necess\u00e1ria para excluir conte\u00fado.",
    "Falha ao excluir conte\u00fado.",
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
      <button type="button" class="button-link button-link-inline" data-nav-href="./feed.html">Voltar ao feed</button>
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
    state.postAuthorId = post.author?.id ?? null;
    const canDeletePost =
      ["moderator", "admin"].includes(state.viewerRole ?? "") ||
      String(state.viewerId ?? "") === String(state.postAuthorId ?? "");
    renderPostView(elements.view, post, {
      canDeletePost,
      canDeleteComments: ["moderator", "admin"].includes(state.viewerRole ?? ""),
    });
    refreshReviewPanel();
    statusFlash.show("Post carregado.", "success");
  } catch (error) {
    state.postAuthorId = null;
    renderMissingPostState("Este post n\u00e3o pode ser exibido no momento.");
    refreshReviewPanel();
    statusFlash.show(resolveMessage(error), "error");
  }
}

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
    reviewFlash.show(reviewSavedMessage(result), "success");
    await loadPost();
  } catch (error) {
    reviewFlash.show(resolveModerationApiMessage(error, "Falha ao salvar avalia\u00e7\u00e3o."), "error");
  } finally {
    state.isReviewSubmitting = false;
    refreshReviewPanel({ preserveStatus: true });
  }
}

async function handleDeletePost() {
  if (!state.postId || state.isDeletingPost) {
    return;
  }

  const isOwner = String(state.viewerId ?? "") === String(state.postAuthorId ?? "");
  if (!hasSession() || (!["moderator", "admin"].includes(state.viewerRole ?? "") && !isOwner)) {
    statusFlash.show("Apenas autor do post, moderadores ou administradores podem excluir posts.", "error");
    return;
  }

  state.isDeletingPost = true;
  statusFlash.show("Excluindo post...", "info");
  try {
    await api.posts.delete(state.postId);
    window.location.href = "./feed.html";
  } catch (error) {
    statusFlash.show(resolveDeleteMessage(error), "error");
  } finally {
    state.isDeletingPost = false;
  }
}

async function handleDeleteComment(commentId) {
  if (!commentId || state.isDeletingComment) {
    return;
  }

  if (!hasSession() || !["moderator", "admin"].includes(state.viewerRole ?? "")) {
    statusFlash.show("Apenas moderadores ou administradores podem excluir coment\u00e1rios.", "error");
    return;
  }

  state.isDeletingComment = true;
  statusFlash.show("Excluindo coment\u00e1rio...", "info");
  try {
    await api.comments.delete(commentId);
    await loadPost();
    statusFlash.show("Coment\u00e1rio exclu\u00eddo.", "success");
  } catch (error) {
    statusFlash.show(resolveDeleteMessage(error), "error");
  } finally {
    state.isDeletingComment = false;
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

  if (elements.view) {
    elements.view.addEventListener("click", (event) => {
      const deletePostButton = event.target.closest("[data-delete-post-id]");
      if (deletePostButton && elements.view.contains(deletePostButton)) {
        handleDeletePost();
        return;
      }

      const deleteCommentButton = event.target.closest("[data-delete-comment-id]");
      if (!deleteCommentButton || !elements.view.contains(deleteCommentButton)) {
        return;
      }

      const commentId = String(deleteCommentButton.dataset.deleteCommentId ?? "").trim();
      if (!commentId) {
        return;
      }

      handleDeleteComment(commentId);
    });
  }
}

async function init() {
  bindNavigation();
  renderSessionState();
  bindEvents();
  await syncViewerRole();
  await loadPost();
}

init();

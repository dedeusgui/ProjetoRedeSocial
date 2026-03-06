import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { resolveAuthApiMessage, resolveModerationApiMessage } from "../core/http-state.js";
import { hasSession } from "../core/session.js";
import { reviewSavedMessage } from "../features/moderation/renderers.js";
import { createPostModalController } from "../features/posts/post-modal.js";
import { renderPostView } from "../features/post/renderers.js";

const state = {
  postId: null,
  postData: null,
  viewerRole: null,
  viewerId: null,
  postAuthorId: null,
  commentsOpen: true,
  isReviewSubmitting: false,
  isDeletingPost: false,
  isDeletingComment: false,
  commentEdit: {
    editingCommentId: null,
    draft: "",
    isSaving: false,
  },
};

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-post-status]"),
  view: document.querySelector("[data-post-view]"),
  commentForm: document.querySelector("[data-comment-form]"),
  commentHelp: document.querySelector("[data-comment-help]"),
  commentComposer: document.querySelector("[data-comment-compose]"),
  modal: document.querySelector("[data-post-modal]"),
  modalTitle: document.querySelector("[data-post-modal-title]"),
  modalCancelButton: document.querySelector("[data-post-modal-cancel]"),
  modalSubmitButton: document.querySelector("[data-post-modal-submit]"),
  postModalForm: document.querySelector("[data-post-modal-form]"),
  postModalStatus: document.querySelector("[data-post-modal-status]"),
};

const statusFlash = createFlash(elements.status);
const commentHelpFlash = createFlash(elements.commentHelp);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  logoutRedirectUrl: "./index.html",
});

function getReviewStatusElement() {
  return elements.view?.querySelector("[data-review-status]") ?? null;
}

function setReviewStatus(message, stateName = "info") {
  const el = getReviewStatusElement();
  if (!el) {
    return;
  }

  el.textContent = message ?? "";
  if (!message) {
    el.hidden = true;
    delete el.dataset.state;
    return;
  }

  el.hidden = false;
  el.dataset.state = stateName;
}

function resolveMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Autenticacao necessaria. Faca login para comentar.",
    "Erro inesperado ao comunicar com a API.",
  );
}

function resolveDeleteMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Autenticacao necessaria para excluir conteudo.",
    "Falha ao excluir conteudo.",
  );
}

function resetCommentEditState() {
  state.commentEdit.editingCommentId = null;
  state.commentEdit.draft = "";
  state.commentEdit.isSaving = false;
}

function renderSessionState() {
  const isAuthenticated = navbar.refresh();
  const commentsVisible = state.commentsOpen;

  if (elements.commentForm) {
    const textarea = elements.commentForm.querySelector("textarea[name='content']");
    const submit = elements.commentForm.querySelector("button[type='submit']");

    if (textarea) {
      textarea.disabled = !isAuthenticated || !commentsVisible;
    }

    if (submit) {
      submit.disabled = !isAuthenticated || !commentsVisible;
    }
  }

  if (elements.commentComposer) {
    elements.commentComposer.hidden = !commentsVisible;
  }

  commentHelpFlash.show(
    !commentsVisible
      ? "Comentarios ocultos. Clique em Abrir comentarios para voltar."
      : !isAuthenticated
        ? "Faca login para comentar neste post."
        : "",
    "info",
  );

  if (commentsVisible && isAuthenticated) {
    commentHelpFlash.clear();
  }
}

function getPostId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderMissingPostState(message) {
  if (!elements.view) {
    return;
  }

  elements.view.innerHTML = `
    <section class="card empty-card">
      <h2 class="ink-underline">Post indisponivel</h2>
      <p class="muted">${message}</p>
      <p class="muted">Volte ao feed para continuar.</p>
      <button type="button" class="button-link button-link-inline" data-nav-href="./feed.html">Voltar ao feed</button>
    </section>
  `;
}

function renderCurrentPost() {
  if (!elements.view || !state.postData) {
    return;
  }

  const canDeletePost =
    ["moderator", "admin"].includes(state.viewerRole ?? "") ||
    String(state.viewerId ?? "") === String(state.postAuthorId ?? "");
  const canEditPost = String(state.viewerId ?? "") === String(state.postAuthorId ?? "");

  renderPostView(elements.view, state.postData, {
    canDeletePost,
    canEditPost,
    canDeleteAnyComment: ["moderator", "admin"].includes(state.viewerRole ?? ""),
    canReviewPosts: hasSession(),
    viewerId: state.viewerId,
    commentsOpen: state.commentsOpen,
    commentEdit: state.commentEdit,
  });

  refreshReviewActions();
}

function focusCommentEditInput(commentId) {
  if (!elements.view || !commentId) {
    return;
  }

  const input = elements.view.querySelector(
    `[data-comment-edit-input-id="${String(commentId)}"]`,
  );
  if (!input) {
    return;
  }

  input.focus();
  const valueLength = String(input.value ?? "").length;
  input.setSelectionRange(valueLength, valueLength);
}

function refreshReviewActions({ preserveStatus = false } = {}) {
  const isAuthenticated = hasSession();
  const reviewButtons = Array.from(
    elements.view?.querySelectorAll("[data-review-action]") ?? [],
  );

  reviewButtons.forEach((button) => {
    button.disabled = !isAuthenticated || state.isReviewSubmitting;
  });

  if (preserveStatus || state.isReviewSubmitting) {
    return;
  }

  if (!isAuthenticated) {
    setReviewStatus("", "info");
    return;
  }

  setReviewStatus("", "info");
}

async function loadPost() {
  const postId = getPostId();
  state.postId = postId;

  if (!postId) {
    state.postData = null;
    state.postAuthorId = null;
    resetCommentEditState();
    renderMissingPostState("ID do post ausente na URL.");
    statusFlash.show("Nao foi possivel abrir o post.", "error");
    return;
  }

  statusFlash.show("Carregando post...", "info");

  try {
    const post = await api.posts.getById(postId);
    state.postData = post;
    state.postAuthorId = post.author?.id ?? null;
    resetCommentEditState();
    renderCurrentPost();
    renderSessionState();
    statusFlash.clear();
  } catch (error) {
    state.postData = null;
    state.postAuthorId = null;
    resetCommentEditState();
    renderMissingPostState("Este post nao pode ser exibido no momento.");
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
  if (!elements.commentForm || !state.commentsOpen) {
    return;
  }

  const postId = state.postId;
  if (!postId) {
    statusFlash.show("ID do post ausente na URL.", "error");
    return;
  }

  if (!hasSession()) {
    statusFlash.show("Faca login para comentar neste post.", "error");
    return;
  }

  const formData = new FormData(elements.commentForm);
  const content = String(formData.get("content") ?? "").trim();
  if (!content) {
    statusFlash.show("Escreva um comentario antes de enviar.", "error");
    return;
  }

  try {
    await api.posts.createComment(postId, content);
    elements.commentForm.reset();
    await loadPost();
    statusFlash.show("Comentario enviado.", "success");
  } catch (error) {
    statusFlash.show(resolveMessage(error), "error");
  }
}

async function handleReview(decision) {
  if (!state.postId) {
    setReviewStatus("Post invalido para avaliacao.", "error");
    return;
  }

  if (!hasSession()) {
    setReviewStatus("Faca login para avaliar este post.", "error");
    return;
  }

  state.isReviewSubmitting = true;
  refreshReviewActions({ preserveStatus: true });
  setReviewStatus("Salvando avaliacao...", "info");

  try {
    const result = await api.posts.review(state.postId, decision, null);
    setReviewStatus(reviewSavedMessage(result), "success");
    await loadPost();
  } catch (error) {
    setReviewStatus(resolveModerationApiMessage(error, "Falha ao salvar avaliacao."), "error");
  } finally {
    state.isReviewSubmitting = false;
    refreshReviewActions({ preserveStatus: true });
  }
}

async function handleDeletePost() {
  if (!state.postId || state.isDeletingPost) {
    return;
  }

  const isOwner = String(state.viewerId ?? "") === String(state.postAuthorId ?? "");
  if (!hasSession() || (!["moderator", "admin"].includes(state.viewerRole ?? "") && !isOwner)) {
    statusFlash.show("Apenas autor, moderador ou admin podem excluir posts.", "error");
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

async function submitPostUpdate(postId, payload) {
  const updated = await api.posts.update(postId, payload);
  if (state.postData && String(state.postData.id) === String(postId)) {
    state.postData = {
      ...state.postData,
      title: updated.title ?? state.postData.title,
      content: updated.content ?? state.postData.content,
      tags: Array.isArray(updated.tags) ? updated.tags : state.postData.tags,
      updatedAt: updated.updatedAt ?? state.postData.updatedAt,
    };
    renderCurrentPost();
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
  resolveErrorMessage: resolveMessage,
  onBeforeOpenEdit() {
    const isOwner = String(state.viewerId ?? "") === String(state.postAuthorId ?? "");
    if (!hasSession() || !isOwner) {
      statusFlash.show("Apenas o autor pode editar este post.", "error");
      return false;
    }
    return true;
  },
  async submitPostCreate() {
    throw new Error("Criacao de post nao disponivel nesta tela.");
  },
  submitPostUpdate,
  async onAfterSuccess({ mode }) {
    if (mode === "edit") {
      statusFlash.show("Post atualizado.", "success");
    }
  },
});

function handleEditPost() {
  if (!state.postData?.id) {
    return;
  }

  postModalController.openPostModalEdit(state.postData);
}

function startCommentEdit(commentId) {
  const comment = (state.postData?.comments ?? []).find(
    (item) => String(item.id) === String(commentId),
  );
  const isOwner = String(comment?.author?.id ?? "") === String(state.viewerId ?? "");
  if (!hasSession() || !isOwner || !comment) {
    statusFlash.show("Apenas o autor pode editar o comentario.", "error");
    return;
  }

  state.commentEdit.editingCommentId = String(commentId);
  state.commentEdit.draft = String(comment.content ?? "");
  state.commentEdit.isSaving = false;
  renderCurrentPost();
  focusCommentEditInput(commentId);
}

function cancelCommentEdit(commentId) {
  if (String(state.commentEdit.editingCommentId ?? "") !== String(commentId ?? "")) {
    return;
  }

  resetCommentEditState();
  renderCurrentPost();
}

async function saveCommentEdit(commentId) {
  if (String(state.commentEdit.editingCommentId ?? "") !== String(commentId ?? "")) {
    return;
  }

  if (state.commentEdit.isSaving) {
    return;
  }

  const nextContent = String(state.commentEdit.draft ?? "").trim();
  if (!nextContent) {
    statusFlash.show("O comentario nao pode ficar vazio.", "error");
    focusCommentEditInput(commentId);
    return;
  }

  state.commentEdit.isSaving = true;
  renderCurrentPost();
  statusFlash.show("Salvando edicao do comentario...", "info");

  try {
    const updated = await api.comments.update(commentId, { content: nextContent });
    state.postData = {
      ...state.postData,
      comments: (state.postData?.comments ?? []).map((comment) =>
        String(comment.id) === String(commentId)
          ? {
              ...comment,
              content: updated.content ?? nextContent,
              updatedAt: updated.updatedAt ?? comment.updatedAt,
            }
          : comment,
      ),
    };
    resetCommentEditState();
    renderCurrentPost();
    statusFlash.show("Comentario atualizado.", "success");
  } catch (error) {
    state.commentEdit.isSaving = false;
    renderCurrentPost();
    statusFlash.show(resolveMessage(error), "error");
    focusCommentEditInput(commentId);
  }
}

async function handleDeleteComment(commentId) {
  if (!commentId || state.isDeletingComment) {
    return;
  }

  const comment = (state.postData?.comments ?? []).find(
    (item) => String(item.id) === String(commentId),
  );
  const isOwner = String(comment?.author?.id ?? "") === String(state.viewerId ?? "");
  const isPrivileged = ["moderator", "admin"].includes(state.viewerRole ?? "");

  if (!hasSession() || (!isOwner && !isPrivileged)) {
    statusFlash.show("Sem permissao para excluir este comentario.", "error");
    return;
  }

  state.isDeletingComment = true;
  statusFlash.show("Excluindo comentario...", "info");
  try {
    await api.comments.delete(commentId);
    state.postData = {
      ...state.postData,
      comments: (state.postData?.comments ?? []).filter(
        (item) => String(item.id) !== String(commentId),
      ),
    };
    if (String(state.commentEdit.editingCommentId ?? "") === String(commentId)) {
      resetCommentEditState();
    }
    renderCurrentPost();
    statusFlash.show("Comentario excluido.", "success");
  } catch (error) {
    statusFlash.show(resolveDeleteMessage(error), "error");
  } finally {
    state.isDeletingComment = false;
  }
}

function setCommentsOpen(nextValue) {
  state.commentsOpen = nextValue;
  renderSessionState();
  renderCurrentPost();
}

function bindEvents() {
  if (elements.commentForm) {
    elements.commentForm.addEventListener("submit", handleCommentSubmit);
  }

  if (elements.view) {
    elements.view.addEventListener("click", (event) => {
      const reviewButton = event.target.closest("[data-review-action]");
      if (reviewButton && elements.view.contains(reviewButton)) {
        const decision = String(reviewButton.dataset.reviewAction ?? "").trim();
        if (decision) {
          handleReview(decision);
        }
        return;
      }

      const deletePostButton = event.target.closest("[data-delete-post-id]");
      if (deletePostButton && elements.view.contains(deletePostButton)) {
        handleDeletePost();
        return;
      }

      const editPostButton = event.target.closest("[data-edit-post-id]");
      if (editPostButton && elements.view.contains(editPostButton)) {
        handleEditPost();
        return;
      }

      const deleteCommentButton = event.target.closest("[data-delete-comment-id]");
      if (deleteCommentButton && elements.view.contains(deleteCommentButton)) {
        const commentId = String(deleteCommentButton.dataset.deleteCommentId ?? "").trim();
        if (commentId) {
          handleDeleteComment(commentId);
        }
        return;
      }

      const editCommentButton = event.target.closest("[data-edit-comment-id]");
      if (editCommentButton && elements.view.contains(editCommentButton)) {
        const commentId = String(editCommentButton.dataset.editCommentId ?? "").trim();
        if (commentId) {
          startCommentEdit(commentId);
        }
        return;
      }

      const saveCommentEditButton = event.target.closest("[data-save-comment-edit-id]");
      if (saveCommentEditButton && elements.view.contains(saveCommentEditButton)) {
        const commentId = String(saveCommentEditButton.dataset.saveCommentEditId ?? "").trim();
        if (commentId) {
          saveCommentEdit(commentId);
        }
        return;
      }

      const cancelCommentEditButton = event.target.closest("[data-cancel-comment-edit-id]");
      if (cancelCommentEditButton && elements.view.contains(cancelCommentEditButton)) {
        const commentId = String(cancelCommentEditButton.dataset.cancelCommentEditId ?? "").trim();
        if (commentId) {
          cancelCommentEdit(commentId);
        }
        return;
      }

      const closeCommentsButton = event.target.closest("[data-close-comments]");
      if (closeCommentsButton && elements.view.contains(closeCommentsButton)) {
        setCommentsOpen(false);
        return;
      }

      const openCommentsButton = event.target.closest("[data-open-comments]");
      if (openCommentsButton && elements.view.contains(openCommentsButton)) {
        setCommentsOpen(true);
      }
    });

    elements.view.addEventListener("input", (event) => {
      const input = event.target.closest("[data-comment-edit-input-id]");
      if (!input || !elements.view.contains(input)) {
        return;
      }

      const commentId = String(input.dataset.commentEditInputId ?? "").trim();
      if (!commentId || String(state.commentEdit.editingCommentId ?? "") !== commentId) {
        return;
      }

      state.commentEdit.draft = String(input.value ?? "");
    });

    elements.view.addEventListener("keydown", (event) => {
      const input = event.target.closest("[data-comment-edit-input-id]");
      if (!input || !elements.view.contains(input)) {
        return;
      }

      const commentId = String(input.dataset.commentEditInputId ?? "").trim();
      if (!commentId || String(state.commentEdit.editingCommentId ?? "") !== commentId) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancelCommentEdit(commentId);
        return;
      }

      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        saveCommentEdit(commentId);
      }
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

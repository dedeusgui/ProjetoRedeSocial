import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { resolveAuthApiMessage } from "../core/http-state.js";
import { hasSession } from "../core/session.js";
import { renderPostView } from "../features/post/renderers.js";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-post-status]"),
  view: document.querySelector("[data-post-view]"),
  commentForm: document.querySelector("[data-comment-form]"),
  commentHelp: document.querySelector("[data-comment-help]"),
};

const statusFlash = createFlash(elements.status);
const commentHelpFlash = createFlash(elements.commentHelp);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  logoutButton: elements.logoutButton,
  onLogout: () => {
    renderSessionState();
    statusFlash.show("Sessao encerrada.", "info");
  },
});

function resolveMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Autenticacao necessaria. Faca login para comentar.",
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
      ? "Comentario publico e visivel no detalhe do post."
      : "Faca login para comentar neste post.",
    "info",
  );
}

function getPostId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function loadPost() {
  const postId = getPostId();

  if (!postId) {
    statusFlash.show("ID do post ausente na URL.", "error");
    return;
  }

  statusFlash.show("Carregando post...", "info");

  try {
    const post = await api.posts.getById(postId);
    renderPostView(elements.view, post);
    statusFlash.show("Post carregado.", "success");
  } catch (error) {
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
    statusFlash.show("Faca login para comentar neste post.", "error");
    return;
  }

  const formData = new FormData(elements.commentForm);
  const content = String(formData.get("content") ?? "").trim();

  try {
    await api.posts.createComment(postId, content);
    elements.commentForm.reset();
    await loadPost();
  } catch (error) {
    statusFlash.show(resolveMessage(error), "error");
  }
}

function bindEvents() {
  if (elements.commentForm) {
    elements.commentForm.addEventListener("submit", handleCommentSubmit);
  }
}

function init() {
  renderSessionState();
  bindEvents();
  loadPost();
}

init();

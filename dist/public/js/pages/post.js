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

  if (!postId) {
    renderMissingPostState("ID do post ausente na URL.");
    statusFlash.show("N\u00e3o foi poss\u00edvel abrir o post.", "error");
    return;
  }

  statusFlash.show("Carregando post...", "info");

  try {
    const post = await api.posts.getById(postId);
    renderPostView(elements.view, post);
    statusFlash.show("Post carregado.", "success");
  } catch (error) {
    renderMissingPostState("Este post n\u00e3o pode ser exibido no momento.");
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

function bindEvents() {
  if (elements.commentForm) {
    elements.commentForm.addEventListener("submit", handleCommentSubmit);
  }
}

async function init() {
  renderSessionState();
  bindEvents();
  await loadPost();
}

init();

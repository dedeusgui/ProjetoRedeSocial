import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initMotionToggle } from "../components/motion.js";
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
  motionToggle: document.querySelector("[data-motion-toggle]"),
};

const statusFlash = createFlash(elements.status);
const commentHelpFlash = createFlash(elements.commentHelp);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  logoutButton: elements.logoutButton,
  onLogout: () => {
    renderSessionState();
    statusFlash.show("Sessao encerrada. Para comentar, entre novamente.", "info");
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

function renderMissingPostState(message) {
  if (!elements.view) {
    return;
  }

  elements.view.innerHTML = `
    <section class="card empty-card">
      <h2 class="ink-underline">Post indisponivel</h2>
      <p class="muted">${message}</p>
      <p class="muted">Volte ao feed cronologico para continuar.</p>
      <a class="button-link button-link-inline" href="./feed.html">Voltar ao feed</a>
    </section>
  `;
}

async function loadPost() {
  const postId = getPostId();

  if (!postId) {
    renderMissingPostState("ID do post ausente na URL.");
    statusFlash.show("Nao foi possivel abrir o post.", "error");
    return;
  }

  statusFlash.show("Carregando post...", "info");

  try {
    const post = await api.posts.getById(postId);
    renderPostView(elements.view, post);
    statusFlash.show("Discussao carregada.", "success");
  } catch (error) {
    renderMissingPostState("Este conteudo nao pode ser exibido agora.");
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

function bindEvents() {
  if (elements.commentForm) {
    elements.commentForm.addEventListener("submit", handleCommentSubmit);
  }
}

function init() {
  initMotionToggle({ button: elements.motionToggle });
  renderSessionState();
  bindEvents();
  loadPost();
}

init();

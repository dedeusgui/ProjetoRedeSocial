import { api, ApiError, auth } from "../api.js";
import { createFlash } from "../components/flash.js";
import { bindLogout, renderNavbarAuthState } from "../components/navbar.js";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

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

function resolveApiMessage(error) {
  if (error instanceof ApiError) {
    if (error.code === "UNAUTHENTICATED" || error.status === 401) {
      return "Autenticacao necessaria. Faca login para comentar.";
    }
    return error.message;
  }

  return "Erro inesperado ao comunicar com a API.";
}

function trendClass(trend) {
  if (trend === "positive") return "status-positive";
  if (trend === "negative") return "status-negative";
  return "status-neutral";
}

function renderSessionState() {
  const hasToken = renderNavbarAuthState({
    loginLink: elements.loginLink,
    logoutButton: elements.logoutButton,
  });

  if (elements.commentForm) {
    const textarea = elements.commentForm.querySelector("textarea[name='content']");
    const submit = elements.commentForm.querySelector("button[type='submit']");

    if (textarea) {
      textarea.disabled = !hasToken;
    }

    if (submit) {
      submit.disabled = !hasToken;
    }
  }

  commentHelpFlash.show(
    hasToken
      ? "Comentario publico e visivel no detalhe do post."
      : "Faca login para comentar neste post.",
    "info",
  );
}

function getPostId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderPost(post) {
  if (!elements.view) {
    return;
  }

  const comments = Array.isArray(post.comments) ? post.comments : [];
  const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [];

  elements.view.innerHTML = `
    <article class="card post-card">
      <p class="muted post-meta">@${post.author?.username ?? "desconhecido"} - ${dateFormatter.format(new Date(post.createdAt))}</p>
      <h2 class="post-title"></h2>
      <p class="post-content"></p>
      <p class="muted post-tags"></p>
      <p class="${trendClass(post.trend)}">Tendencia: ${post.trend ?? "neutral"}</p>
    </article>
    <section class="card">
      <h3>Comentarios</h3>
      <div class="comments-list" data-comments-list></div>
    </section>
  `;

  elements.view.querySelector(".post-title").textContent = post.title ?? "";
  elements.view.querySelector(".post-content").textContent = post.content ?? "";
  elements.view.querySelector(".post-tags").textContent =
    tags.length > 0 ? tags.map((tag) => `#${tag}`).join(" ") : "";

  const commentsList = elements.view.querySelector("[data-comments-list]");
  if (!commentsList) {
    return;
  }

  if (comments.length === 0) {
    commentsList.innerHTML = "<p class='muted'>Nenhum comentario ainda.</p>";
    return;
  }

  commentsList.innerHTML = comments
    .map(
      (comment) =>
        `<article class='comment-item'><p><strong>@${comment.author?.username ?? "desconhecido"}</strong> <span class='muted'>${dateFormatter.format(new Date(comment.createdAt))}</span></p><p>${comment.content}</p></article>`,
    )
    .join("");
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
    renderPost(post);
    statusFlash.show("Post carregado.", "success");
  } catch (error) {
    statusFlash.show(resolveApiMessage(error), "error");
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

  const formData = new FormData(elements.commentForm);
  const content = String(formData.get("content") ?? "").trim();

  try {
    await api.posts.createComment(postId, content);
    elements.commentForm.reset();
    await loadPost();
  } catch (error) {
    statusFlash.show(resolveApiMessage(error), "error");
  }
}

function bindEvents() {
  if (elements.commentForm) {
    elements.commentForm.addEventListener("submit", handleCommentSubmit);
  }

  bindLogout(elements.logoutButton, () => {
    renderSessionState();
    statusFlash.show("Sessao encerrada.", "info");
  });
}

function init() {
  renderSessionState();
  bindEvents();
  loadPost();
}

init();

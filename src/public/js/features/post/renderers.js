import { escapeHtml, formatDateTime, trendClass } from "../../core/formatters.js";

export function renderPostView(target, post) {
  if (!target) {
    return;
  }

  const comments = Array.isArray(post.comments) ? post.comments : [];
  const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [];

  target.innerHTML = `
    <article class="card post-card">
      <p class="muted post-meta">@${escapeHtml(post.author?.username ?? "desconhecido")} - ${escapeHtml(formatDateTime(post.createdAt))}</p>
      <h2 class="post-title"></h2>
      <p class="post-content"></p>
      <p class="muted post-tags"></p>
      <p class="${escapeHtml(trendClass(post.trend))}">Tendencia: ${escapeHtml(post.trend ?? "neutral")}</p>
    </article>
    <section class="card">
      <h3>Comentarios</h3>
      <div class="comments-list" data-comments-list></div>
    </section>
  `;

  target.querySelector(".post-title").textContent = post.title ?? "";
  target.querySelector(".post-content").textContent = post.content ?? "";
  target.querySelector(".post-tags").textContent =
    tags.length > 0 ? tags.map((tag) => `#${tag}`).join(" ") : "";

  const commentsList = target.querySelector("[data-comments-list]");
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
        `<article class='comment-item'><p><strong>@${escapeHtml(comment.author?.username ?? "desconhecido")}</strong> <span class='muted'>${escapeHtml(formatDateTime(comment.createdAt))}</span></p><p>${escapeHtml(comment.content)}</p></article>`,
    )
    .join("");
}

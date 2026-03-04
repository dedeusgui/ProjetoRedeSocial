import { escapeHtml, formatDateTime, trendClass } from "../../core/formatters.js";

function renderTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return "<p class='muted post-tags'>Sem tags.</p>";
  }

  return `
    <ul class="tag-list" aria-label="Tags do post">
      ${tags.map((tag) => `<li class="tag-item">#${escapeHtml(tag)}</li>`).join("")}
    </ul>
  `;
}

export function renderPostView(target, post) {
  if (!target) {
    return;
  }

  const comments = Array.isArray(post.comments) ? post.comments : [];
  const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [];
  const trend = post.trend ?? "neutral";
  const trendStyleClass = trendClass(trend);

  target.innerHTML = `
    <article class="card post-card">
      <header class="post-header">
        <p class="muted post-meta">@${escapeHtml(post.author?.username ?? "desconhecido")} - ${escapeHtml(formatDateTime(post.createdAt))}</p>
        <p class="trend-chip ${escapeHtml(trendStyleClass)}">Tendencia: ${escapeHtml(trend)}</p>
      </header>
      <h2 class="post-title"></h2>
      <p class="post-content"></p>
      ${renderTags(tags)}
    </article>
    <section class="card">
      <h3 class="ink-underline">Comentarios</h3>
      <div class="comments-list" data-comments-list></div>
    </section>
  `;

  target.querySelector(".post-title").textContent = post.title ?? "";
  target.querySelector(".post-content").textContent = post.content ?? "";

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
        `<article class="comment-item"><p><strong>@${escapeHtml(comment.author?.username ?? "desconhecido")}</strong> <span class="muted">${escapeHtml(formatDateTime(comment.createdAt))}</span></p><p>${escapeHtml(comment.content)}</p></article>`,
    )
    .join("");
}

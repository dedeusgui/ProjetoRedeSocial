import {
  escapeHtml,
  formatDateTime,
  formatPercent,
} from "../../core/formatters.js";

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

export function renderPostView(
  target,
  post,
  { canDeletePost = false, canDeleteComments = false } = {},
) {
  if (!target) {
    return;
  }

  const comments = Array.isArray(post.comments) ? post.comments : [];
  const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [];
  const approvalPercentage = post.moderationMetrics?.approvalPercentage ?? 0;
  const notRelevantPercentage = post.moderationMetrics?.notRelevantPercentage ?? 0;

  target.innerHTML = `
    <article class="card post-card">
      <header class="post-header">
        <p class="muted post-meta">@${escapeHtml(post.author?.username ?? "desconhecido")} - ${escapeHtml(formatDateTime(post.createdAt))}</p>
        <p class="trend-chip status-neutral">Aprova&ccedil;&atilde;o: ${escapeHtml(formatPercent(approvalPercentage))}</p>
      </header>
      <h2 class="post-title"></h2>
      <p class="post-content"></p>
      <p class="muted">N&atilde;o relevante: ${escapeHtml(formatPercent(notRelevantPercentage))}</p>
      ${renderTags(tags)}
      ${canDeletePost ? `<div class="review-actions"><button type="button" class="button-reject" data-delete-post-id="${escapeHtml(post.id ?? "")}">Excluir post</button></div>` : ""}
    </article>
    <section class="card">
      <h3 class="ink-underline">Coment&aacute;rios</h3>
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
    commentsList.innerHTML = "<p class='muted'>Nenhum coment&aacute;rio ainda.</p>";
    return;
  }

  commentsList.innerHTML = comments
    .map(
      (comment) =>
        `<article class="comment-item"><p><strong>@${escapeHtml(comment.author?.username ?? "desconhecido")}</strong> <span class="muted">${escapeHtml(formatDateTime(comment.createdAt))}</span></p><p>${escapeHtml(comment.content)}</p>${canDeleteComments ? `<button type="button" class="button-reject button-link-inline" data-delete-comment-id="${escapeHtml(comment.id)}">Excluir coment&aacute;rio</button>` : ""}</article>`,
    )
    .join("");
}

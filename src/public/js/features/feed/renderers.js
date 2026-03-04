import { escapeHtml, formatDateTime, trendClass, trendLabel } from "../../core/formatters.js";

export function ensureChronologicalOrder(items) {
  return [...items].sort((a, b) => {
    const dateDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return String(b.id).localeCompare(String(a.id));
  });
}

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

export function createPostCard(post) {
  const article = document.createElement("article");
  article.className = "card post-card";

  const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [];
  const createdAtText = formatDateTime(post.createdAt);
  const postId = encodeURIComponent(String(post.id ?? ""));
  const postIdAttr = escapeHtml(String(post.id ?? ""));
  const trend = post.trend ?? "neutral";
  const trendStyleClass = trendClass(trend);
  const trendText = trendLabel(trend);

  article.innerHTML = `
    <header class="post-header">
      <p class="muted post-meta">@${escapeHtml(post.author?.username ?? "desconhecido")} - ${escapeHtml(createdAtText)}</p>
      <p class="trend-chip ${escapeHtml(trendStyleClass)}">Tend&ecirc;ncia: ${escapeHtml(trendText)}</p>
    </header>
    <h2 class="post-title"></h2>
    <p class="post-content"></p>
    ${renderTags(tags)}
    <div class="feed-card-actions">
      <button type="button" class="link-inline post-link" data-nav-href="./post.html?id=${postId}">Abrir discuss&atilde;o</button>
      <div class="review-actions review-actions-inline">
        <button type="button" class="button-approve" data-review-action="approved" data-post-id="${postIdAttr}">Aprovar</button>
        <button type="button" class="button-reject" data-review-action="not_relevant" data-post-id="${postIdAttr}">N&atilde;o relevante</button>
      </div>
    </div>
  `;

  article.querySelector(".post-title").textContent = post.title ?? "";
  article.querySelector(".post-content").textContent = post.content ?? "";

  return article;
}

export function renderFeedList(target, items) {
  if (!target) {
    return;
  }

  target.innerHTML = "";
  ensureChronologicalOrder(items).forEach((post) => {
    target.appendChild(createPostCard(post));
  });
}

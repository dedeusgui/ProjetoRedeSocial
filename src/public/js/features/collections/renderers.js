import { escapeHtml, formatDateTime } from "../../core/formatters.js";
import { renderAuthorSummary } from "../authors/renderers.js";
import { renderPostContextLinks } from "../posts/context-renderers.js";

function renderCollectionPost(post, index) {
  return `
    <article class="card post-card collection-post-card">
      <div class="collection-card-order">
        <p class="questionnaire-eyebrow">Collection post</p>
        <span class="questionnaire-question-number">Step ${escapeHtml(String(index + 1))}</span>
      </div>
      <div class="collection-item-body">
        <p class="muted">${escapeHtml(formatDateTime(post.createdAt))}</p>
        <h3 class="post-title collection-item-title">${escapeHtml(post.title ?? "Untitled")}</h3>
      </div>
      <p class="post-content">${escapeHtml(post.content ?? "")}</p>
      ${renderPostContextLinks({
        postId: post.id,
        sequence: post.sequence,
        collections: [],
      })}
      <div class="feed-card-actions">
        <button type="button" class="button-link button-link-inline" data-nav-href="./post.html?id=${encodeURIComponent(String(post.id ?? ""))}">
          Open post
        </button>
      </div>
    </article>
  `;
}

export function renderCollectionView(target, collection) {
  if (!target) {
    return;
  }

  const items = Array.isArray(collection?.items) ? collection.items : [];

  target.innerHTML = `
    <div class="collection-view-shell">
      <section class="card post-card collection-hero">
      <header class="post-header collection-hero-header">
        ${renderAuthorSummary(collection?.author, {
          metaText: formatDateTime(collection?.createdAt),
          avatarClassName: "author-avatar-sm",
          className: "post-author-summary",
        })}
        <span class="managed-collection-count">${escapeHtml(String(items.length))} post(s)</span>
      </header>
      <div class="collection-detail-copy">
        <p class="questionnaire-eyebrow">Curated collection</p>
        <h2 class="post-title collection-title">${escapeHtml(collection?.title ?? "Collection")}</h2>
        <p class="post-content collection-description">${escapeHtml(collection?.description ?? "")}</p>
      </div>
      <div class="collection-hero-meta">
        <span class="post-context-pill post-context-pill-static">Manual order</span>
      </div>
      <ul class="tag-list" aria-label="Collection tags">
        ${(Array.isArray(collection?.tags) ? collection.tags : [])
          .map((tag) => `<li class="tag-item"><span class="tag-label">#${escapeHtml(tag)}</span></li>`)
          .join("")}
      </ul>
    </section>
      <section class="collection-post-list">
      ${items.length === 0 ? "<p class='muted'>No visible posts are available in this collection.</p>" : items.map(renderCollectionPost).join("")}
      </section>
    </div>
  `;

}

import { escapeHtml, formatDateTime } from "../../core/formatters.js";
import { renderAuthorSummary } from "../authors/renderers.js";
import { renderPostContextLinks } from "../posts/context-renderers.js";

function renderCollectionPost(post, index) {
  return `
    <article class="card collection-post-card">
      <div class="row collection-post-header">
        <span class="questionnaire-question-number">${escapeHtml(String(index + 1))}</span>
        <button type="button" class="button-link button-link-inline" data-nav-href="./post.html?id=${encodeURIComponent(String(post.id ?? ""))}">
          Open post
        </button>
      </div>
      <h3>${escapeHtml(post.title ?? "Untitled")}</h3>
      <p class="muted">${escapeHtml(formatDateTime(post.createdAt))}</p>
      <p class="post-content">${escapeHtml(post.content ?? "")}</p>
      ${renderPostContextLinks({
        postId: post.id,
        sequence: post.sequence,
        collections: [],
      })}
    </article>
  `;
}

export function renderCollectionView(target, collection) {
  if (!target) {
    return;
  }

  const items = Array.isArray(collection?.items) ? collection.items : [];

  target.innerHTML = `
    <section class="card collection-hero">
      <div class="collection-hero-copy">
        <p class="questionnaire-eyebrow">Reading path</p>
        <h2 class="ink-underline">${escapeHtml(collection?.title ?? "Collection")}</h2>
        <p class="muted">${escapeHtml(collection?.description ?? "")}</p>
        ${renderAuthorSummary(collection?.author, {
          metaText: formatDateTime(collection?.createdAt),
          avatarClassName: "author-avatar-sm",
          className: "post-author-summary",
        })}
        <div class="collection-hero-meta">
          <span class="post-context-pill post-context-pill-static">${escapeHtml(String(items.length))} post(s)</span>
          <span class="post-context-pill post-context-pill-static">Manual order</span>
        </div>
        <ul class="tag-list" aria-label="Collection tags">
          ${(Array.isArray(collection?.tags) ? collection.tags : [])
            .map((tag) => `<li class="tag-item"><span class="tag-label">#${escapeHtml(tag)}</span></li>`)
            .join("")}
        </ul>
      </div>
    </section>
    <section class="collection-post-list">
      ${items.length === 0 ? "<p class='muted'>No visible posts are available in this collection.</p>" : items.map(renderCollectionPost).join("")}
    </section>
  `;
}
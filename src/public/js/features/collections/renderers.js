import { escapeHtml, formatDateTime } from "../../core/formatters.js";
import {
  formatFollowTagLabel,
  normalizeFollowTagValue,
} from "../../core/followed-tags.js";
import { renderAuthorSummary } from "../authors/renderers.js";
import { renderPostContextLinks } from "../posts/context-renderers.js";

function renderTags(tags, { canManageTagFollows = false, followedTagSet = new Set() } = {}) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return "<p class='muted post-tags'>No tags yet.</p>";
  }

  return `
    <ul class="tag-list" aria-label="Collection tags">
      ${tags
        .map((tag) => {
          const followTag = normalizeFollowTagValue(tag);
          const label = formatFollowTagLabel(tag);
          const isFollowing = canManageTagFollows && followedTagSet.has(followTag);

          return `
            <li class="pill pill-chip tag-item tag-item-actionable">
              <span class="tag-label">#${escapeHtml(label)}</span>
              ${
                canManageTagFollows && followTag
                  ? `
                    <button
                      type="button"
                      class="tag-follow-button ${isFollowing ? "button-ghost" : ""}"
                      data-follow-tag="${escapeHtml(followTag)}"
                      data-following="${isFollowing ? "true" : "false"}"
                      aria-pressed="${isFollowing ? "true" : "false"}"
                    >
                      ${isFollowing ? "Following" : "Follow"}
                    </button>
                  `
                  : ""
              }
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

function renderCollectionPost(post, index) {
  return `
    <article class="card post-card collection-post-card">
      <div class="collection-card-order">
        <p class="questionnaire-eyebrow">Collection post</p>
        <span class="pill pill-soft pill-patrick questionnaire-question-number">Step ${escapeHtml(String(index + 1))}</span>
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

export function renderCollectionView(
  target,
  collection,
  {
    isOwner = false,
    canManageTagFollows = false,
    followedTagSet = new Set(),
  } = {},
) {
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
        <span class="pill pill-soft pill-roomy pill-patrick managed-collection-count">${escapeHtml(String(items.length))} post(s)</span>
      </header>
      <div class="collection-detail-copy">
        <p class="questionnaire-eyebrow">Curated collection</p>
        <h2 class="post-title collection-title">${escapeHtml(collection?.title ?? "Collection")}</h2>
        <p class="post-content collection-description">${escapeHtml(collection?.description ?? "")}</p>
      </div>
      ${
        isOwner
          ? `
            <div class="feed-card-actions">
              <button type="button" class="button-link button-link-inline" data-nav-href="./collections.html">
                Manage collection
              </button>
            </div>
          `
          : ""
      }
      ${renderTags(collection?.tags, { canManageTagFollows, followedTagSet })}
    </section>
      <section class="collection-post-list">
      ${items.length === 0 ? "<p class='muted'>No visible posts are available in this collection.</p>" : items.map(renderCollectionPost).join("")}
      </section>
    </div>
  `;

}

import { escapeHtml, formatDateTime } from "../../core/formatters.js";
import {
  formatFollowTagLabel,
  normalizeFollowTagValue,
} from "../../core/followed-tags.js";
import { renderAuthorSummary } from "../authors/renderers.js";

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

function createCollectionFeedCard(
  collection,
  {
    currentUserId = null,
    currentUserRole = null,
    canManageTagFollows = false,
    followedTagSet = new Set(),
  } = {},
) {
  const viewerId = String(currentUserId ?? "").trim();
  const ownerId = String(collection?.author?.id ?? "").trim();
  const isOwner = viewerId.length > 0 && ownerId.length > 0 && viewerId === ownerId;

  const article = document.createElement("article");
  article.className = "card post-card managed-collection-card";

  article.innerHTML = `
    <header class="post-header">
      ${renderAuthorSummary(collection.author, {
        metaText: formatDateTime(collection.createdAt),
        avatarClassName: "author-avatar-sm",
        className: "post-author-summary",
      })}
      <span class="pill pill-soft pill-roomy pill-patrick managed-collection-count">${escapeHtml(String(collection.itemCount ?? 0))} post(s)</span>
    </header>
    <div class="collection-feed-copy">
      <p class="questionnaire-eyebrow">Curated collection</p>
      <h2 class="post-title"></h2>
      <p class="post-content"></p>
    </div>
    ${renderTags(collection.tags, { canManageTagFollows, followedTagSet })}
    <div class="feed-card-actions">
      <button
        type="button"
        class="button-link button-link-inline"
        data-nav-href="./collection.html?id=${encodeURIComponent(String(collection.id ?? ""))}"
      >
        Open collection
      </button>
      ${
        isOwner
          ? `
            <button
              type="button"
              class="button-ghost button-link-inline"
              data-nav-href="./collections.html"
            >
              Manage collection
            </button>
          `
          : ""
      }
    </div>
  `;

  article.querySelector(".post-title").textContent = collection.title ?? "";
  article.querySelector(".post-content").textContent = collection.description ?? "";

  return article;
}

export function renderCollectionFeedList(target, items, options = {}) {
  if (!target) {
    return;
  }

  const followedTagSet =
    options.followedTagSet instanceof Set
      ? options.followedTagSet
      : new Set(Array.isArray(options.followedTags) ? options.followedTags : []);

  target.innerHTML = "";
  (Array.isArray(items) ? items : []).forEach((collection) => {
    target.appendChild(
      createCollectionFeedCard(collection, {
        ...options,
        followedTagSet,
      }),
    );
  });
}

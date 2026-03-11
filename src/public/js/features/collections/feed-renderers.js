import { escapeHtml, formatDateTime } from "../../core/formatters.js";
import { renderAuthorSummary } from "../authors/renderers.js";

function normalizeTagForFollow(tag) {
  return String(tag ?? "")
    .trim()
    .replace(/^#+/, "")
    .toLowerCase();
}

function formatTagLabel(tag) {
  const normalized = String(tag ?? "").trim().replace(/^#+/, "");
  return normalized || String(tag ?? "").trim();
}

function renderTags(tags, { canManageTagFollows = false, followedTagSet = new Set() } = {}) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return "<p class='muted post-tags'>No tags yet.</p>";
  }

  return `
    <ul class="tag-list" aria-label="Collection tags">
      ${tags
        .map((tag) => {
          const followTag = normalizeTagForFollow(tag);
          const label = formatTagLabel(tag);
          const isFollowing = canManageTagFollows && followedTagSet.has(followTag);

          return `
            <li class="tag-item tag-item-actionable">
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
    canManageTagFollows = false,
    followedTagSet = new Set(),
  } = {},
) {
  const article = document.createElement("article");
  article.className = "card managed-collection-card";

  article.innerHTML = `
    <header class="post-header">
      ${renderAuthorSummary(collection.author, {
        metaText: formatDateTime(collection.createdAt),
        avatarClassName: "author-avatar-sm",
        className: "post-author-summary",
      })}
      <span class="managed-collection-count">${escapeHtml(String(collection.itemCount ?? 0))} post(s)</span>
    </header>
    <div class="managed-collection-header-copy">
      <p class="questionnaire-eyebrow">Public collection</p>
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

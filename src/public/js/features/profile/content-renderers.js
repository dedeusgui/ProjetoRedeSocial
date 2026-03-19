import { escapeHtml, formatDateTime } from "../../core/formatters.js";
import {
  formatFollowTagLabel,
  normalizeFollowTagValue,
} from "../../core/followed-tags.js";
import { renderCollectionPillList, renderPostContextLinks } from "../posts/context-renderers.js";

function renderPostListItem(post) {
  return `
    <article class="card managed-post-card">
      <div class="row collection-post-header">
        <div>
          <h3>${escapeHtml(post.title ?? "Untitled")}</h3>
          <p class="muted">${escapeHtml(formatDateTime(post.createdAt))}</p>
        </div>
        <button type="button" class="button-link button-link-inline" data-nav-href="./post.html?id=${encodeURIComponent(String(post.id ?? ""))}">
          Open
        </button>
      </div>
      <p class="post-content">${escapeHtml(post.content ?? "")}</p>
      ${renderPostContextLinks({
        postId: post.id,
        sequence: post.sequence,
        collections: post.collections,
      })}
      <div class="review-actions review-actions-inline">
        <button type="button" class="button-ghost" data-manage-edit-post-id="${escapeHtml(post.id ?? "")}">
          Edit
        </button>
        <button type="button" class="button-ghost" data-manage-continue-post-id="${escapeHtml(post.id ?? "")}">
          Continue sequence
        </button>
      </div>
    </article>
  `;
}

function renderCollectionItemRow(item, index, itemCount) {
  return `
    <li class="collection-item-row">
      <div class="collection-item-copy">
        <div class="collection-card-order">
          <p class="questionnaire-eyebrow">Collection post</p>
          <span class="questionnaire-question-number">Step ${escapeHtml(String(index + 1))}</span>
        </div>
        <strong class="collection-item-title">${escapeHtml(item.title ?? "Untitled")}</strong>
        <span class="muted">${escapeHtml(formatDateTime(item.createdAt))}</span>
      </div>
      <div class="review-actions review-actions-inline">
        <button type="button" class="button-link button-link-inline" data-nav-href="./post.html?id=${encodeURIComponent(String(item.id ?? ""))}">
          Open
        </button>
        <button type="button" class="button-ghost" data-move-collection-post-id="${escapeHtml(item.id ?? "")}" data-collection-id="${escapeHtml(item.collectionId ?? "")}" data-direction="up" ${index === 0 ? "disabled" : ""}>
          Move up
        </button>
        <button type="button" class="button-ghost" data-move-collection-post-id="${escapeHtml(item.id ?? "")}" data-collection-id="${escapeHtml(item.collectionId ?? "")}" data-direction="down" ${index === itemCount - 1 ? "disabled" : ""}>
          Move down
        </button>
        <button type="button" class="button-reject" data-remove-collection-post-id="${escapeHtml(item.id ?? "")}" data-collection-id="${escapeHtml(item.collectionId ?? "")}">
          Remove
        </button>
      </div>
    </li>
  `;
}

function renderCollectionTags(
  tags,
  {
    canManageTagFollows = false,
    followedTagSet = new Set(),
  } = {},
) {
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

function renderCollectionCard(
  collection,
  availablePosts = [],
  {
    canManageTagFollows = false,
    followedTagSet = new Set(),
  } = {},
) {
  const collectionId = String(collection.id ?? "");
  const collectionItems = Array.isArray(collection.items) ? collection.items : [];
  const addablePosts = availablePosts.filter(
    (post) => !collectionItems.some((item) => String(item.id ?? "") === String(post.id ?? "")),
  );

  return `
    <article class="card post-card managed-collection-card">
      <div class="managed-collection-header">
        <div class="managed-collection-header-copy">
          <p class="questionnaire-eyebrow">Curated collection</p>
          <h3 class="post-title collection-item-title">${escapeHtml(collection.title ?? "Untitled")}</h3>
          <p class="muted">${escapeHtml(collection.description ?? "")}</p>
        </div>
        <div class="collection-hero-meta">
          <span class="managed-collection-count">${escapeHtml(String(collection.itemCount ?? collectionItems.length ?? 0))} post(s)</span>
        </div>
      </div>
      ${renderCollectionTags(collection.tags, { canManageTagFollows, followedTagSet })}
      <div class="review-actions review-actions-inline">
        <button type="button" class="button-link button-link-inline" data-nav-href="./collection.html?id=${encodeURIComponent(collectionId)}">
          Open collection
        </button>
        <button type="button" class="button-ghost" data-edit-collection-id="${escapeHtml(collectionId)}">
          Edit
        </button>
        <button type="button" class="button-reject" data-delete-collection-id="${escapeHtml(collectionId)}">
          Delete
        </button>
      </div>
      <label class="managed-collection-select">
        Add a post
        <select data-collection-post-select="${escapeHtml(collectionId)}">
          <option value="">Choose a post</option>
          ${addablePosts
            .map(
              (post) => `
                <option value="${escapeHtml(String(post.id ?? ""))}">
                  ${escapeHtml(post.title ?? "Untitled")}
                </option>
              `,
            )
            .join("")}
        </select>
      </label>
      <button
        type="button"
        class="button-ghost"
        data-add-collection-post-button="${escapeHtml(collectionId)}"
        disabled
      >
        Add to collection
      </button>
      ${
        collectionItems.length === 0
          ? "<p class='muted'>No posts in this collection yet.</p>"
          : `
            <ul class="collection-item-list">
              ${collectionItems
                .map((item, index) =>
                  renderCollectionItemRow(
                    {
                      ...item,
                      collectionId,
                    },
                    index,
                    collectionItems.length,
                  ),
                )
                .join("")}
            </ul>
          `
      }
    </article>
  `;
}

export function renderProfilePostList(target, posts) {
  if (!target) {
    return;
  }

  const items = Array.isArray(posts) ? posts : [];
  if (items.length === 0) {
    target.innerHTML = "<p class='muted'>You have not published any posts yet.</p>";
    return;
  }

  target.innerHTML = items.map((post) => renderPostListItem(post)).join("");
}

export function renderProfileCollectionList(
  target,
  collections,
  {
    availablePosts = [],
    canManageTagFollows = false,
    followedTagSet = new Set(),
    followedTags = [],
  } = {},
) {
  if (!target) {
    return;
  }

  const items = Array.isArray(collections) ? collections : [];
  if (items.length === 0) {
    target.innerHTML = "<p class='muted'>You have not created any collections yet.</p>";
    return;
  }

  const resolvedFollowedTagSet =
    followedTagSet instanceof Set ? followedTagSet : new Set(Array.isArray(followedTags) ? followedTags : []);

  target.innerHTML = items
    .map((collection) =>
      renderCollectionCard(collection, availablePosts, {
        canManageTagFollows,
        followedTagSet: resolvedFollowedTagSet,
      }),
    )
    .join("");
}

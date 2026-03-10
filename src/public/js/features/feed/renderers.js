import {
  escapeHtml,
  formatDateTime,
  formatPercent,
} from "../../core/formatters.js";
import { renderAuthorSummary } from "../authors/renderers.js";
import { renderQuestionnairePreview } from "../questionnaire/renderers.js";

export function ensureChronologicalOrder(items) {
  return [...items].sort((a, b) => {
    const dateDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return String(b.id).localeCompare(String(a.id));
  });
}

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

function renderFeedMedia(media, fallbackText) {
  const firstMedia = Array.isArray(media) ? media[0] : null;
  if (!firstMedia?.url) {
    return "";
  }

  const extraCount = Math.max(0, (Array.isArray(media) ? media.length : 0) - 1);
  return `
    <figure class="post-media-preview">
      <img
        class="post-media-image"
        src="${escapeHtml(firstMedia.url)}"
        alt="${escapeHtml(firstMedia.originalName ?? fallbackText ?? "Imagem do post")}"
        loading="lazy"
      />
      ${
        extraCount > 0
          ? `<figcaption class="muted">+${escapeHtml(String(extraCount))} imagem(ns)</figcaption>`
          : ""
      }
    </figure>
  `;
}

function renderTags(tags, { canManageTagFollows = false, followedTagSet = new Set() } = {}) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return "<p class='muted post-tags'>Sem tags.</p>";
  }

  return `
    <ul class="tag-list" aria-label="Tags do post">
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
                      ${isFollowing ? "Seguindo" : "Seguir"}
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

export function createPostCard(
  post,
  {
    viewerRole = null,
    viewerId = null,
    canReviewPosts = false,
    canManageTagFollows = false,
    followedTagSet = new Set(),
  } = {},
) {
  const article = document.createElement("article");
  article.className = "card post-card";

  const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [];
  const createdAtText = formatDateTime(post.createdAt);
  const postId = encodeURIComponent(String(post.id ?? ""));
  const postIdAttr = escapeHtml(String(post.id ?? ""));
  const canDeletePost =
    ["moderator", "admin"].includes(viewerRole ?? "") ||
    (viewerId && String(viewerId) === String(post.author?.id ?? ""));
  const canEditPost = viewerId && String(viewerId) === String(post.author?.id ?? "");
  const approvalPercentage = post.moderationMetrics?.approvalPercentage ?? 0;

  article.innerHTML = `
    <header class="post-header">
      ${renderAuthorSummary(post.author, {
        metaText: createdAtText,
        avatarClassName: "author-avatar-sm",
        className: "post-author-summary",
      })}
      <p class="trend-chip status-neutral">Aprovação: ${escapeHtml(formatPercent(approvalPercentage))}</p>
    </header>
    <h2 class="post-title"></h2>
    <p class="post-content"></p>
    ${renderFeedMedia(post.media, post.title)}
    ${renderQuestionnairePreview(post.questionnaire)}
    ${renderTags(tags, { canManageTagFollows, followedTagSet })}
    <div class="feed-card-actions">
      <button type="button" class="link-inline post-link" data-nav-href="./post.html?id=${postId}">Abrir discussão</button>
      <div class="review-actions review-actions-inline">
        ${canReviewPosts ? `<button type="button" class="button-approve" data-review-action="approved" data-post-id="${postIdAttr}">Aprovar</button>` : ""}
        ${canReviewPosts ? `<button type="button" class="button-reject" data-review-action="not_relevant" data-post-id="${postIdAttr}">Não relevante</button>` : ""}
        ${canEditPost ? `<button type="button" class="button-ghost" data-edit-post-id="${postIdAttr}">Editar post</button>` : ""}
        ${canDeletePost ? `<button type="button" class="button-reject" data-delete-post-id="${postIdAttr}">Excluir post</button>` : ""}
      </div>
    </div>
  `;

  article.querySelector(".post-title").textContent = post.title ?? "";
  article.querySelector(".post-content").textContent = post.content ?? "";

  return article;
}

export function renderFeedList(target, items, options = {}) {
  if (!target) {
    return;
  }

  const followedTagSet =
    options.followedTagSet instanceof Set
      ? options.followedTagSet
      : new Set(Array.isArray(options.followedTags) ? options.followedTags : []);

  target.innerHTML = "";
  ensureChronologicalOrder(items).forEach((post) => {
    target.appendChild(
      createPostCard(post, {
        ...options,
        followedTagSet,
      }),
    );
  });
}

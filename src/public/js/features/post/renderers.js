import { escapeHtml, formatDateTime, formatPercent } from "../../core/formatters.js";
import {
  formatFollowTagLabel,
  normalizeFollowTagValue,
} from "../../core/followed-tags.js";
import { renderAuthorSummary } from "../authors/renderers.js";
import {
  COMMENT_MAX_LENGTH,
  formatCommentCharacterCount,
} from "./constants.js";
import { renderCollectionPillList, renderPostContextLinks } from "../posts/context-renderers.js";
import { renderQuestionnaireDetail } from "../questionnaire/renderers.js";

function renderPostMedia(media, fallbackText) {
  const items = Array.isArray(media) ? media.filter((item) => item?.url) : [];
  if (items.length === 0) {
    return "";
  }

  return `
    <section class="post-media-gallery" aria-label="Post images">
      ${items
        .map(
          (item) => `
            <figure class="post-media-frame">
              <img
                class="post-media-image"
                src="${escapeHtml(item.url)}"
                alt="${escapeHtml(item.originalName ?? fallbackText ?? "Post image")}"
                loading="lazy"
                decoding="async"
              />
            </figure>
          `,
        )
        .join("")}
    </section>
  `;
}

function renderTags(tags, { canManageTagFollows = false, followedTagSet = new Set() } = {}) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return "<p class='muted post-tags'>No tags yet.</p>";
  }

  return `
    <ul class="tag-list" aria-label="Post tags">
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

function renderCommentItem(comment, { canDeleteAnyComment, viewerId, commentEdit } = {}) {
  const isOwner = String(viewerId ?? "") === String(comment.author?.id ?? "");
  const canEditComment = isOwner;
  const canDeleteComment = isOwner || canDeleteAnyComment;
  const isEditing = String(commentEdit?.editingCommentId ?? "") === String(comment.id ?? "");
  const draft = String(commentEdit?.draft ?? comment.content ?? "");
  const isSaving = Boolean(commentEdit?.isSaving);

  return `
    <article class="comment-item">
      ${renderAuthorSummary(comment.author, {
        metaText: formatDateTime(comment.createdAt),
        avatarClassName: "author-avatar-xs",
        className: "author-summary-comment",
      })}
      ${
        isEditing
          ? `
            <label class="comment-edit-form" aria-label="Edit comment">
              <textarea
                class="comment-edit-input"
                rows="4"
                maxlength="${COMMENT_MAX_LENGTH}"
                data-comment-edit-input-id="${escapeHtml(comment.id)}"
              >${escapeHtml(draft)}</textarea>
            </label>
            <p class="muted" data-comment-edit-counter-id="${escapeHtml(comment.id)}">
              ${escapeHtml(formatCommentCharacterCount(draft.length))}
            </p>
            <div class="review-actions review-actions-inline">
              <button
                type="button"
                class="button-approve button-link-inline"
                data-save-comment-edit-id="${escapeHtml(comment.id)}"
                ${isSaving ? "disabled" : ""}
              >
                Save
              </button>
              <button
                type="button"
                class="button-ghost button-link-inline"
                data-cancel-comment-edit-id="${escapeHtml(comment.id)}"
                ${isSaving ? "disabled" : ""}
              >
                Cancel
              </button>
            </div>
          `
          : `<p class="comment-body">${escapeHtml(comment.content ?? "")}</p>`
      }
      <div class="review-actions review-actions-inline">
        ${
          !isEditing && canEditComment
            ? `<button type="button" class="button-ghost button-link-inline" data-edit-comment-id="${escapeHtml(comment.id)}">Edit</button>`
            : ""
        }
        ${
          canDeleteComment
            ? `<button type="button" class="button-reject button-link-inline" data-delete-comment-id="${escapeHtml(comment.id)}">Delete</button>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderSequencePanel(sequenceItems = [], currentPostId = null) {
  if (!Array.isArray(sequenceItems) || sequenceItems.length <= 1) {
    return "";
  }

  return `
    <section class="card sequence-panel">
      <div class="row comments-panel-header">
        <h3 class="ink-underline">Full sequence</h3>
        <p class="muted">${escapeHtml(String(sequenceItems.length))} post(s)</p>
      </div>
      <div class="sequence-list">
        ${sequenceItems
          .map(
            (item, index) => `
              <article class="sequence-item ${String(item.id) === String(currentPostId) ? "sequence-item-current" : ""}">
                <div class="row collection-post-header">
                  <span class="questionnaire-question-number">${escapeHtml(String(index + 1))}</span>
                  <button
                    type="button"
                    class="button-ghost button-link-inline"
                    data-nav-href="./post.html?id=${encodeURIComponent(String(item.id ?? ""))}"
                  >
                    ${String(item.id) === String(currentPostId) ? "Current post" : "Open"}
                  </button>
                </div>
                <h4>${escapeHtml(item.title ?? "Untitled")}</h4>
                <p class="muted">${escapeHtml(formatDateTime(item.createdAt))}</p>
                <p class="post-content">${escapeHtml(item.content ?? "")}</p>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderPostView(
  target,
  post,
  {
    canDeletePost = false,
    canEditPost = false,
    canDeleteAnyComment = false,
    canReviewPosts = false,
    viewerId = null,
    commentsOpen = true,
    commentEdit = null,
    canManageTagFollows = false,
    followedTagSet = new Set(),
    questionnaireSession = null,
  } = {},
) {
  if (!target) {
    return;
  }

  const comments = Array.isArray(post.comments) ? post.comments : [];
  const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [];
  const collectionMembership = renderCollectionPillList(post.collections, {
    emptyLabel: "This post is not part of any collection yet.",
  });
  const approvalPercentage = post.moderationMetrics?.approvalPercentage ?? 0;

  target.innerHTML = `
    <article class="card post-card">
      <header class="post-header">
        ${renderAuthorSummary(post.author, {
          metaText: formatDateTime(post.createdAt),
          avatarClassName: "author-avatar-sm",
          className: "post-author-summary",
        })}
        <p class="trend-chip status-neutral">Approval: ${escapeHtml(formatPercent(approvalPercentage))}</p>
      </header>
      <h2 class="post-title"></h2>
      <p class="post-content"></p>
      ${renderPostMedia(post.media, post.title)}
      ${renderQuestionnaireDetail(post.questionnaire, {
        canAnswer: canReviewPosts,
        answers: questionnaireSession?.answers ?? {},
        result: questionnaireSession?.submittedResult ?? null,
      })}
      ${renderPostContextLinks({
        postId: post.id,
        sequence: post.sequence,
        collections: post.collections,
      })}
      ${renderTags(tags, { canManageTagFollows, followedTagSet })}
      <div class="review-actions">
        ${canReviewPosts ? `<button type="button" class="button-approve" data-review-action="approved" data-post-id="${escapeHtml(post.id ?? "")}">Approve</button>` : ""}
        ${canReviewPosts ? `<button type="button" class="button-reject" data-review-action="not_relevant" data-post-id="${escapeHtml(post.id ?? "")}">Not relevant</button>` : ""}
        ${canEditPost ? `<button type="button" class="button-ghost" data-edit-post-id="${escapeHtml(post.id ?? "")}">Edit post</button>` : ""}
        ${canDeletePost ? `<button type="button" class="button-reject" data-delete-post-id="${escapeHtml(post.id ?? "")}">Delete post</button>` : ""}
      </div>
      <p class="muted status-line" data-review-status></p>
    </article>
    ${renderSequencePanel(post.sequenceItems, post.id)}
    ${
      collectionMembership
        ? `
          <section class="card collection-panel">
            <div class="row comments-panel-header">
              <h3 class="ink-underline">Collections with this post</h3>
            </div>
            ${collectionMembership}
          </section>
        `
        : ""
    }
    <section class="card comments-panel" data-comments-panel>
      <div class="row comments-panel-header">
        <h3 class="ink-underline">Comments</h3>
        ${
          commentsOpen
            ? '<button type="button" class="button-ghost" data-close-comments>Hide</button>'
            : '<button type="button" class="button-ghost" data-open-comments>Open comments</button>'
        }
      </div>
      <div class="comments-list" data-comments-list ${commentsOpen ? "" : "hidden"}></div>
    </section>
  `;

  target.querySelector(".post-title").textContent = post.title ?? "";
  target.querySelector(".post-content").textContent = post.content ?? "";

  const commentsList = target.querySelector("[data-comments-list]");
  if (!commentsList) {
    return;
  }

  if (!commentsOpen) {
    commentsList.innerHTML = "";
    return;
  }

  if (comments.length === 0) {
    commentsList.innerHTML = "<p class='muted'>No comments yet.</p>";
    return;
  }

  commentsList.innerHTML = comments
    .map((comment) =>
      renderCommentItem(comment, {
        canDeleteAnyComment,
        viewerId,
        commentEdit,
      }),
    )
    .join("");
}

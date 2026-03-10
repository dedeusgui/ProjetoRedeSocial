import { escapeHtml, formatDateTime, formatPercent } from "../../core/formatters.js";

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

function renderCommentItem(comment, { canDeleteAnyComment, viewerId, commentEdit } = {}) {
  const isOwner = String(viewerId ?? "") === String(comment.author?.id ?? "");
  const canEditComment = isOwner;
  const canDeleteComment = isOwner || canDeleteAnyComment;
  const isEditing = String(commentEdit?.editingCommentId ?? "") === String(comment.id ?? "");
  const draft = String(commentEdit?.draft ?? comment.content ?? "");
  const isSaving = Boolean(commentEdit?.isSaving);

  return `
    <article class="comment-item">
      <p>
        <strong>@${escapeHtml(comment.author?.username ?? "desconhecido")}</strong>
        <span class="muted">${escapeHtml(formatDateTime(comment.createdAt))}</span>
      </p>
      ${
        isEditing
          ? `
            <label class="comment-edit-form" aria-label="Editar comentario">
              <textarea
                class="comment-edit-input"
                rows="4"
                data-comment-edit-input-id="${escapeHtml(comment.id)}"
              >${escapeHtml(draft)}</textarea>
            </label>
            <div class="review-actions review-actions-inline">
              <button
                type="button"
                class="button-approve button-link-inline"
                data-save-comment-edit-id="${escapeHtml(comment.id)}"
                ${isSaving ? "disabled" : ""}
              >
                Salvar
              </button>
              <button
                type="button"
                class="button-ghost button-link-inline"
                data-cancel-comment-edit-id="${escapeHtml(comment.id)}"
                ${isSaving ? "disabled" : ""}
              >
                Cancelar
              </button>
            </div>
          `
          : `<p class="comment-body">${escapeHtml(comment.content ?? "")}</p>`
      }
      <div class="review-actions review-actions-inline">
        ${
          !isEditing && canEditComment
            ? `<button type="button" class="button-ghost button-link-inline" data-edit-comment-id="${escapeHtml(comment.id)}">Editar</button>`
            : ""
        }
        ${
          canDeleteComment
            ? `<button type="button" class="button-reject button-link-inline" data-delete-comment-id="${escapeHtml(comment.id)}">Excluir</button>`
            : ""
        }
      </div>
    </article>
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
  } = {},
) {
  if (!target) {
    return;
  }

  const comments = Array.isArray(post.comments) ? post.comments : [];
  const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [];
  const approvalPercentage = post.moderationMetrics?.approvalPercentage ?? 0;

  target.innerHTML = `
    <article class="card post-card">
      <header class="post-header">
        <p class="muted post-meta">@${escapeHtml(post.author?.username ?? "desconhecido")} - ${escapeHtml(formatDateTime(post.createdAt))}</p>
        <p class="trend-chip status-neutral">Aprovacao: ${escapeHtml(formatPercent(approvalPercentage))}</p>
      </header>
      <h2 class="post-title"></h2>
      <p class="post-content"></p>
      ${renderTags(tags, { canManageTagFollows, followedTagSet })}
      <div class="review-actions">
        ${canReviewPosts ? `<button type="button" class="button-approve" data-review-action="approved" data-post-id="${escapeHtml(post.id ?? "")}">Aprovar</button>` : ""}
        ${canReviewPosts ? `<button type="button" class="button-reject" data-review-action="not_relevant" data-post-id="${escapeHtml(post.id ?? "")}">Nao relevante</button>` : ""}
        ${canEditPost ? `<button type="button" class="button-ghost" data-edit-post-id="${escapeHtml(post.id ?? "")}">Editar post</button>` : ""}
        ${canDeletePost ? `<button type="button" class="button-reject" data-delete-post-id="${escapeHtml(post.id ?? "")}">Excluir post</button>` : ""}
      </div>
      <p class="muted status-line" data-review-status></p>
    </article>
    <section class="card comments-panel" data-comments-panel>
      <div class="row comments-panel-header">
        <h3 class="ink-underline">Comentarios</h3>
        ${
          commentsOpen
            ? '<button type="button" class="button-ghost" data-close-comments>Fechar</button>'
            : '<button type="button" class="button-ghost" data-open-comments>Abrir comentarios</button>'
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
    commentsList.innerHTML = "<p class='muted'>Nenhum comentario ainda.</p>";
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

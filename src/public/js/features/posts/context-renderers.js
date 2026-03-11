import { escapeHtml } from "../../core/formatters.js";

function renderSequenceContext(sequence, postId) {
  if (!sequence?.isPartOfSequence || !postId) {
    return "";
  }

  let stateLabel = "Standalone";
  if (sequence.previousPostId && sequence.hasNext) {
    stateLabel = "Middle step";
  } else if (sequence.previousPostId) {
    stateLabel = "Continues a sequence";
  } else if (sequence.hasNext) {
    stateLabel = "Sequence starting point";
  }

  return `
    <div class="post-context-group" aria-label="Sequence context">
      <span class="post-context-pill post-context-pill-static">In sequence</span>
      <span class="post-context-pill post-context-pill-static">${escapeHtml(stateLabel)}</span>
      ${
        sequence.previousPostId
          ? '<span class="post-context-pill post-context-pill-static">Has previous</span>'
          : ""
      }
      ${
        sequence.hasNext
          ? '<span class="post-context-pill post-context-pill-static">Has next</span>'
          : ""
      }
      <button
        type="button"
        class="button-ghost button-link-inline post-context-link"
        data-nav-href="./post.html?id=${encodeURIComponent(String(postId))}"
      >
        View sequence
      </button>
    </div>
  `;
}

function renderCollectionLinks(collections) {
  return (Array.isArray(collections) ? collections : [])
    .map(
      (collection) => `
        <button
          type="button"
          class="button-ghost button-link-inline post-context-link"
          data-nav-href="./collection.html?id=${encodeURIComponent(String(collection.id ?? ""))}"
        >
          ${escapeHtml(collection.title ?? "Collection")}
        </button>
      `,
    )
    .join("");
}

export function renderPostContextLinks({ postId, sequence, collections } = {}) {
  const items = [
    renderSequenceContext(sequence, postId),
    Array.isArray(collections) && collections.length > 0
      ? `
        <div class="post-context-group" aria-label="Collection context">
          <span class="post-context-pill post-context-pill-static">Collection(s)</span>
          ${renderCollectionLinks(collections)}
        </div>
      `
      : "",
  ]
    .filter(Boolean)
    .join("");

  if (!items) {
    return "";
  }

  return `
    <div class="post-context-strip" aria-label="Post context">
      ${items}
    </div>
  `;
}

export function renderCollectionPillList(collections, { emptyLabel = "No collections yet." } = {}) {
  if (!Array.isArray(collections) || collections.length === 0) {
    return `<p class="muted">${escapeHtml(emptyLabel)}</p>`;
  }

  return `
    <div class="post-context-strip" aria-label="Related collections">
      <div class="post-context-group">
        <span class="post-context-pill post-context-pill-static">Collection(s)</span>
        ${renderCollectionLinks(collections)}
      </div>
    </div>
  `;
}

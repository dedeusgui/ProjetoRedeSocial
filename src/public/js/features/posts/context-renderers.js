import { escapeHtml } from "../../core/formatters.js";

function renderSequenceContext(sequence, postId) {
  if (!sequence?.isPartOfSequence || !postId) {
    return "";
  }

  const stateLabel = sequence.previousPostId ? "Has previous sequence" : "In sequence";

  return `
    <div class="post-context-group" aria-label="Sequence context">
      <span class="post-context-pill post-context-pill-static">${escapeHtml(stateLabel)}</span>
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

export function renderPostContextLinks({ postId, sequence, collections } = {}) {
  const items = [renderSequenceContext(sequence, postId)].filter(Boolean).join("");

  if (!items) {
    return "";
  }

  return `
    <div class="post-context-strip" aria-label="Post context">
      ${items}
    </div>
  `;
}

export function renderCollectionPillList(
  collections,
  { emptyLabel = "No collections yet.", canOpenCollections = false } = {},
) {
  const items = Array.isArray(collections) ? collections.filter(Boolean) : [];

  if (items.length === 0) {
    return `<p class="muted">${escapeHtml(emptyLabel)}</p>`;
  }

  return `
    <ul class="collection-membership-list" aria-label="Collections with this post">
      ${items
        .map((collection) => {
          const collectionId = String(collection.id ?? "").trim();

          return `
            <li class="collection-membership-item">
              <div class="collection-membership-copy">
                <span class="collection-item-title">${escapeHtml(collection.title ?? "Untitled collection")}</span>
              </div>
              ${
                canOpenCollections && collectionId
                  ? `
                    <button
                      type="button"
                      class="button-ghost button-link-inline"
                      data-nav-href="./collection.html?id=${encodeURIComponent(collectionId)}"
                    >
                      Open
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

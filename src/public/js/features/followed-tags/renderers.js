import { formatFollowTagLabel } from "../../core/followed-tags.js";

function createEmptyState() {
  const emptyState = document.createElement("section");
  emptyState.className = "empty-card followed-tags-empty";

  const title = document.createElement("p");
  title.className = "followed-tags-empty-title";
  title.textContent = "No followed tags yet";

  const copy = document.createElement("p");
  copy.className = "muted";
  copy.textContent = "Follow a tag above to build your personalized feed.";

  emptyState.append(title, copy);
  return emptyState;
}

function createFollowedTagChip(tag, { disabled = false } = {}) {
  const rawTag = String(tag ?? "").trim();
  const labelText = `#${formatFollowTagLabel(rawTag)}`;

  const item = document.createElement("li");
  item.className = "tag-item tag-item-actionable followed-tag-chip";
  item.title = labelText;

  const label = document.createElement("button");
  label.type = "button";
  label.className = "tag-label followed-tag-chip-label-button";
  label.dataset.followedTagPreview = rawTag;
  label.setAttribute("aria-label", `Show full tag ${labelText}`);
  label.textContent = labelText;
  label.title = labelText;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "tag-follow-button button-ghost followed-tag-chip-button";
  button.dataset.followTag = rawTag;
  button.dataset.following = "true";
  button.setAttribute("aria-pressed", "true");
  button.setAttribute("aria-label", `Stop following ${labelText}`);
  button.disabled = disabled;
  button.textContent = "Unfollow";

  item.append(label, button);
  return item;
}

export function renderFollowedTagsList(target, tags, { disabled = false } = {}) {
  if (!target) {
    return;
  }

  target.replaceChildren();

  const items = Array.isArray(tags) ? tags : [];
  if (items.length === 0) {
    target.append(createEmptyState());
    return;
  }

  const list = document.createElement("ul");
  list.className = "tag-list followed-tags-chip-list";
  list.setAttribute("aria-label", "Followed tags");

  items.forEach((tag) => {
    list.append(createFollowedTagChip(tag, { disabled }));
  });

  target.append(list);
}

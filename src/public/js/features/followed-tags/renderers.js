import { formatFollowTagLabel } from "../../core/followed-tags.js";

const FOLLOWED_TAG_BANNER_COPY = "Showing only your followed tags";

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

function createBannerTagChip(tag) {
  const rawTag = String(tag ?? "").trim();
  const labelText = formatFollowTagLabel(rawTag);

  const chip = document.createElement("span");
  chip.className = "feed-follow-banner-chip";
  chip.textContent = labelText;
  chip.title = `#${labelText}`;
  return chip;
}

function createBannerOverflowChip(remainingCount) {
  const chip = document.createElement("span");
  chip.className = "feed-follow-banner-chip feed-follow-banner-chip-more";
  chip.textContent = `+${remainingCount}`;
  chip.title = `${remainingCount} more followed tags`;
  return chip;
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

export function renderFollowedTagsBanner(target, tags, { active = false, previewLimit = 4 } = {}) {
  if (!target) {
    return;
  }

  target.replaceChildren();

  const items = Array.isArray(tags) ? tags : [];
  const resolvedPreviewLimit = Math.max(1, Math.trunc(previewLimit) || 4);
  const shouldShow = active && items.length > 0;
  target.dataset.visible = shouldShow ? "true" : "false";
  target.setAttribute("aria-hidden", shouldShow ? "false" : "true");

  if (!shouldShow) {
    return;
  }

  const previewItems = items.slice(0, resolvedPreviewLimit);
  const remainingCount = Math.max(0, items.length - previewItems.length);

  const banner = document.createElement("section");
  banner.className = "feed-follow-banner";

  const copy = document.createElement("p");
  copy.className = "feed-follow-banner-copy";
  copy.textContent = FOLLOWED_TAG_BANNER_COPY;

  const chips = document.createElement("div");
  chips.className = "feed-follow-banner-chip-list";
  chips.setAttribute("aria-label", "Followed tag preview");

  previewItems.forEach((tag) => {
    chips.append(createBannerTagChip(tag));
  });

  if (remainingCount > 0) {
    chips.append(createBannerOverflowChip(remainingCount));
  }

  banner.append(copy, chips);
  target.append(banner);
}

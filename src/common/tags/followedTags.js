function normalizeFollowedTag(value) {
  return String(value ?? "")
    .trim()
    .replace(/^#+/, "")
    .toLowerCase();
}

function normalizeFollowedTags(values) {
  const unique = new Set();

  return (Array.isArray(values) ? values : [])
    .map((value) => normalizeFollowedTag(value))
    .filter((tag) => {
      if (!tag || unique.has(tag)) {
        return false;
      }

      unique.add(tag);
      return true;
    })
    .sort((left, right) => left.localeCompare(right));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildStoredTagMatcher(value) {
  return new RegExp(`^#?${escapeRegex(value)}$`, "i");
}

export { buildStoredTagMatcher, normalizeFollowedTag, normalizeFollowedTags };

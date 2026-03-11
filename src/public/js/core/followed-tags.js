export function normalizeFollowTagValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/^#+/, "")
    .toLowerCase();
}

export function normalizeFollowedTags(tags) {
  return [...new Set((Array.isArray(tags) ? tags : [])
    .map((tag) => normalizeFollowTagValue(tag))
    .filter((tag) => tag.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

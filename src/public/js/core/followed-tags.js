export const FOLLOWED_TAG_MAX_LENGTH = 32;
export const FOLLOWED_TAG_ALLOWED_DESCRIPTION = "letters, numbers, hyphen, and underscore";

const FOLLOWED_TAG_ALLOWED_PATTERN = /^[a-z0-9_-]+$/;

function collapseWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function sortUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function formatFollowTagLabel(value) {
  const normalized = collapseWhitespace(value).replace(/^#+/, "");
  return normalized || collapseWhitespace(value);
}

export function normalizeFollowTagCandidate(value) {
  return collapseWhitespace(value)
    .replace(/^#+/, "")
    .toLowerCase();
}

export function validateFollowTagValue(value) {
  const normalizedValue = normalizeFollowTagCandidate(value);

  if (!normalizedValue) {
    return {
      normalizedValue: "",
      errorCode: "empty",
    };
  }

  if (normalizedValue.length > FOLLOWED_TAG_MAX_LENGTH) {
    return {
      normalizedValue,
      errorCode: "too_long",
      maxLength: FOLLOWED_TAG_MAX_LENGTH,
    };
  }

  if (!FOLLOWED_TAG_ALLOWED_PATTERN.test(normalizedValue)) {
    return {
      normalizedValue,
      errorCode: "invalid_chars",
      allowedDescription: FOLLOWED_TAG_ALLOWED_DESCRIPTION,
    };
  }

  return {
    normalizedValue,
    errorCode: null,
  };
}

export function normalizeFollowTagValue(value) {
  const result = validateFollowTagValue(value);
  return result.errorCode ? "" : result.normalizedValue;
}

export function normalizeFollowedTags(tags) {
  return sortUnique(
    (Array.isArray(tags) ? tags : [])
      .map((tag) => normalizeFollowTagValue(tag))
      .filter((tag) => tag.length > 0),
  );
}

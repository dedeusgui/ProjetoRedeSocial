const FOLLOWED_TAG_MAX_LENGTH = 32;
const FOLLOWED_TAG_ALLOWED_DESCRIPTION = "letters, numbers, hyphen, and underscore";
const FOLLOWED_TAG_ALLOWED_PATTERN = /^[a-z0-9_-]+$/;

function collapseWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLooseTagValue(value) {
  return collapseWhitespace(value)
    .replace(/^#+/, "")
    .toLowerCase();
}

function normalizeLooseTagValues(values) {
  const unique = new Set();

  return (Array.isArray(values) ? values : [])
    .map((value) => normalizeLooseTagValue(value))
    .filter((tag) => {
      if (!tag || unique.has(tag)) {
        return false;
      }

      unique.add(tag);
      return true;
    })
    .sort((left, right) => left.localeCompare(right));
}

function validateFollowedTagValue(value) {
  const normalizedValue = normalizeLooseTagValue(value);

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
      allowedPattern: FOLLOWED_TAG_ALLOWED_PATTERN.source,
    };
  }

  return {
    normalizedValue,
    errorCode: null,
  };
}

function normalizeFollowedTag(value) {
  const result = validateFollowedTagValue(value);
  return result.errorCode ? "" : result.normalizedValue;
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
  return new RegExp(`^#?${escapeRegex(normalizeLooseTagValue(value))}$`, "i");
}

export {
  FOLLOWED_TAG_ALLOWED_DESCRIPTION,
  FOLLOWED_TAG_ALLOWED_PATTERN,
  FOLLOWED_TAG_MAX_LENGTH,
  buildStoredTagMatcher,
  normalizeFollowedTag,
  normalizeFollowedTags,
  normalizeLooseTagValue,
  normalizeLooseTagValues,
  validateFollowedTagValue,
};

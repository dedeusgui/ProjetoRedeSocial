const CONTENT_TAG_MAX_LENGTH = 10;
const CONTENT_TAG_MAX_ITEMS = 5;
const CONTENT_TAG_ALLOWED_DESCRIPTION = "letters, numbers, hyphen, and underscore";
const CONTENT_TAG_ALLOWED_INPUT_DESCRIPTION =
  "letters, numbers, spaces, hyphen, underscore, or a leading #";

function collapseWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeContentTag(value) {
  return collapseWhitespace(value)
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

function validateContentTagValue(value) {
  const rawValue = collapseWhitespace(value);

  if (!rawValue) {
    return {
      rawValue: "",
      normalizedValue: "",
      errorCode: "empty",
    };
  }

  const normalizedValue = normalizeContentTag(rawValue);

  if (!normalizedValue) {
    return {
      rawValue,
      normalizedValue: "",
      errorCode: "empty_after_normalization",
    };
  }

  if (normalizedValue.length > CONTENT_TAG_MAX_LENGTH) {
    return {
      rawValue,
      normalizedValue,
      errorCode: "too_long",
      maxLength: CONTENT_TAG_MAX_LENGTH,
    };
  }

  return {
    rawValue,
    normalizedValue,
    errorCode: null,
  };
}

function validateContentTags(values) {
  const items = [];
  const normalizedTags = [];
  const seen = new Set();

  for (const value of Array.isArray(values) ? values : []) {
    const result = validateContentTagValue(value);

    if (result.errorCode === "empty") {
      continue;
    }

    const item = {
      rawValue: result.rawValue,
      normalizedValue: result.normalizedValue,
      errorCodes: result.errorCode ? [result.errorCode] : [],
    };

    if (!result.errorCode && seen.has(result.normalizedValue)) {
      item.errorCodes.push("duplicate");
    } else if (!result.errorCode) {
      seen.add(result.normalizedValue);
    }

    items.push(item);
  }

  items.forEach((item, index) => {
    if (index >= CONTENT_TAG_MAX_ITEMS) {
      item.errorCodes.push("too_many");
    }

    if (item.errorCodes.length === 0) {
      normalizedTags.push(item.normalizedValue);
    }
  });

  const tooLongTags = items
    .filter((item) => item.errorCodes.includes("too_long"))
    .map((item) => item.normalizedValue);
  const duplicateTags = items
    .filter((item) => item.errorCodes.includes("duplicate"))
    .map((item) => item.normalizedValue);
  const emptyTags = items
    .filter((item) => item.errorCodes.includes("empty_after_normalization"))
    .map((item) => item.rawValue);
  const overflowTags = items
    .filter((item) => item.errorCodes.includes("too_many"))
    .map((item) => item.normalizedValue || item.rawValue);

  return {
    items,
    normalizedTags,
    tagCount: items.length,
    hasErrors: items.some((item) => item.errorCodes.length > 0),
    tooLongTags,
    duplicateTags,
    emptyTags,
    overflowTags,
    maxItems: CONTENT_TAG_MAX_ITEMS,
    maxLength: CONTENT_TAG_MAX_LENGTH,
  };
}

export {
  CONTENT_TAG_ALLOWED_DESCRIPTION,
  CONTENT_TAG_ALLOWED_INPUT_DESCRIPTION,
  CONTENT_TAG_MAX_ITEMS,
  CONTENT_TAG_MAX_LENGTH,
  normalizeContentTag,
  validateContentTagValue,
  validateContentTags,
};

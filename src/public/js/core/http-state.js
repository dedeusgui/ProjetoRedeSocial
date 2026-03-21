import { ApiError } from "../api.js";

function formatList(items) {
  return items
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .join(", ");
}

function resolveValidationDetailsMessage(error) {
  const details = error.details ?? {};
  const fieldLabel = String(details.fieldLabel ?? details.field ?? "").trim().toLowerCase();
  const isAvatarField = details.field === "avatar" || fieldLabel.includes("avatar") || fieldLabel.includes("profile");
  const uploadSubject = isAvatarField ? "profile image" : "image";

  if (Array.isArray(details.missingLabels) && details.missingLabels.length > 0) {
    return `Fill in the required fields: ${formatList(details.missingLabels)}.`;
  }

  if (details.field === "media" && typeof details.maxItems === "number") {
    return `A post can include up to ${details.maxItems} images.`;
  }

  if (details.field === "media" && typeof details.maxItemsPerRequest === "number") {
    return `You can upload up to ${details.maxItemsPerRequest} images per request.`;
  }

  if (details.field === "media" && typeof details.maxFileSizeMb === "number") {
    return `Each image must be at most ${details.maxFileSizeMb} MB.`;
  }

  if (details.field === "tags" && typeof details.maxItems === "number" && typeof details.tagCount === "number") {
    return `Use up to ${details.maxItems} tags.`;
  }

  if (details.field === "tags" && typeof details.maxLength === "number") {
    return `Use at most ${details.maxLength} characters per tag.`;
  }

  if (details.field === "tags" && Array.isArray(details.duplicateTags) && details.duplicateTags.length > 0) {
    return "Each tag must be unique.";
  }

  if (details.field === "tags" && Array.isArray(details.emptyTags) && details.emptyTags.length > 0) {
    return "Each tag must contain at least one letter or number after normalization.";
  }

  if (isAvatarField && typeof details.maxItemsPerRequest === "number") {
    return `You can upload up to ${details.maxItemsPerRequest} ${uploadSubject}${details.maxItemsPerRequest > 1 ? "s" : ""} per request.`;
  }

  if (isAvatarField && typeof details.maxFileSizeMb === "number") {
    return `Each ${uploadSubject} must be at most ${details.maxFileSizeMb} MB.`;
  }

  if (Array.isArray(details.allowedExtensions) && details.allowedExtensions.length > 0) {
    return isAvatarField
      ? `Upload profile images only in these formats: ${formatList(details.allowedExtensions)}.`
      : `Upload images only in these formats: ${formatList(details.allowedExtensions)}.`;
  }

  return error.message;
}

function resolveDetailedApiMessage(error, fallbackMessage) {
  if (!(error instanceof ApiError)) {
    return fallbackMessage;
  }

  if (error.code === "VALIDATION_ERROR") {
    return resolveValidationDetailsMessage(error);
  }

  return error.message;
}

export function resolveApiMessage(error, fallbackMessage) {
  return resolveDetailedApiMessage(error, fallbackMessage);
}

export function resolveAuthApiMessage(error, unauthenticatedMessage, fallbackMessage) {
  if (error instanceof ApiError) {
    if (error.code === "UNAUTHENTICATED" || error.status === 401) {
      return unauthenticatedMessage;
    }

    if (error.code === "TOKEN_EXPIRED") {
      return error.message;
    }

    return resolveDetailedApiMessage(error, fallbackMessage);
  }

  return fallbackMessage;
}

export function resolveModerationApiMessage(error, fallbackMessage) {
  if (!(error instanceof ApiError)) {
    return fallbackMessage;
  }

  if (error.code === "UNAUTHENTICATED" || error.status === 401) {
    return "Authentication required to review posts.";
  }

  if (error.code === "FORBIDDEN" || error.status === 403) {
    return "You cannot review this post.";
  }

  return resolveDetailedApiMessage(error, fallbackMessage);
}

import mongoose from "mongoose";
import AppError from "../errors/AppError.js";

const FIELD_LABELS = Object.freeze({
  action: "action",
  collectionId: "collection",
  commentId: "comment",
  content: "content",
  decision: "decision",
  email: "e-mail",
  id: "identifier",
  password: "password",
  postId: "post",
  previousPostId: "previous post",
  requesterId: "requester",
  reviewerId: "reviewer",
  tag: "tag",
  title: "title",
  userId: "user",
  username: "username",
});

function resolveFieldLabel(field) {
  return FIELD_LABELS[field] ?? field;
}

function requireFields(payload, fields) {
  const source = payload ?? {};
  const missing = fields.filter((field) => {
    const value = source[field];
    if (value === undefined || value === null) {
      return true;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      return true;
    }

    return false;
  });

  if (missing.length > 0) {
    const missingLabels = missing.map((field) => resolveFieldLabel(field));
    throw new AppError(
      `Fill in the required fields: ${missingLabels.join(", ")}.`,
      "VALIDATION_ERROR",
      400,
      { missing, missingLabels },
    );
  }
}

function ensureObjectId(id, fieldName = "id") {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(
      `The identifier provided for ${resolveFieldLabel(fieldName)} is invalid.`,
      "VALIDATION_ERROR",
      400,
      { field: fieldName },
    );
  }
}

function parseLimit(value, fallback = 20, max = 50) {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export { requireFields, ensureObjectId, parseLimit };

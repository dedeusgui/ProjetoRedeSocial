import mongoose from "mongoose";
import AppError from "../errors/AppError.js";

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
    throw new AppError(
      `Missing required fields: ${missing.join(", ")}`,
      "VALIDATION_ERROR",
      400,
      { missing },
    );
  }
}

function ensureObjectId(id, fieldName = "id") {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${fieldName}`, "VALIDATION_ERROR", 400);
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

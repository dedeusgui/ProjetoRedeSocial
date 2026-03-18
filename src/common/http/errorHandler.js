import AppError from "../errors/AppError.js";
import {
  AVATAR_MEDIA_FIELD_NAME,
  AVATAR_MEDIA_MAX_FILE_SIZE_MB,
  AVATAR_MEDIA_MAX_ITEMS,
} from "../media/avatarMedia.js";
import {
  POST_MEDIA_MAX_FILE_SIZE_MB,
  POST_MEDIA_MAX_ITEMS,
} from "../media/postMedia.js";
import { sendError } from "./responses.js";

function resolveUploadFieldName(error) {
  if (typeof error?.field === "string" && error.field.trim().length > 0) {
    return error.field;
  }

  return "media";
}

function resolveUploadFieldLabel(fieldName) {
  return fieldName === AVATAR_MEDIA_FIELD_NAME ? "profile image" : "image";
}

function resolveUploadLimits(fieldName) {
  if (fieldName === AVATAR_MEDIA_FIELD_NAME) {
    return {
      maxFileSizeMb: AVATAR_MEDIA_MAX_FILE_SIZE_MB,
      maxItemsPerRequest: AVATAR_MEDIA_MAX_ITEMS,
    };
  }

  return {
    maxFileSizeMb: POST_MEDIA_MAX_FILE_SIZE_MB,
    maxItemsPerRequest: POST_MEDIA_MAX_ITEMS,
  };
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    sendError(
      res,
      {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      error.statusCode,
    );
    return;
  }

  if (error?.name === "MulterError") {
    const fieldName = resolveUploadFieldName(error);
    const fieldLabel = resolveUploadFieldLabel(fieldName);
    const limits = resolveUploadLimits(fieldName);
    const isFileSizeError = error.code === "LIMIT_FILE_SIZE";
    const isFileCountError = error.code === "LIMIT_FILE_COUNT";
    const message = isFileSizeError
      ? `Each ${fieldLabel} must be at most ${limits.maxFileSizeMb} MB.`
      : isFileCountError
        ? `You can upload up to ${limits.maxItemsPerRequest} ${fieldLabel}${limits.maxItemsPerRequest > 1 ? "s" : ""} per request.`
        : "The uploaded files are invalid.";
    const details = isFileSizeError
      ? {
          field: fieldName,
          maxFileSizeMb: limits.maxFileSizeMb,
        }
      : isFileCountError
        ? {
            field: fieldName,
            maxItemsPerRequest: limits.maxItemsPerRequest,
          }
        : {
            field: fieldName,
          };

    sendError(
      res,
      {
        code: "VALIDATION_ERROR",
        message,
        details,
      },
      400,
    );
    return;
  }

  if (error?.code === 11000) {
    sendError(
      res,
      {
        code: "CONFLICT",
        message: "The provided resource conflicts with an existing record.",
      },
      409,
    );
    return;
  }

  sendError(
    res,
    {
      code: "INTERNAL_ERROR",
      message: "An unexpected internal error occurred.",
    },
    500,
  );
}

export default errorHandler;
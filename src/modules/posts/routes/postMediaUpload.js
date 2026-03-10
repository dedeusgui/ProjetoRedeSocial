import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import AppError from "../../../common/errors/AppError.js";
import {
  POST_MEDIA_ALLOWED_MIME_TYPES,
  POST_MEDIA_FIELD_NAME,
  POST_MEDIA_MAX_FILE_SIZE_BYTES,
  POST_MEDIA_MAX_ITEMS,
} from "../../../common/media/postMedia.js";
import env from "../../../config/env.js";

const MIME_TYPE_TO_EXTENSION = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function sanitizePathSegment(value) {
  const safeValue = String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
  return safeValue || "post";
}

function resolvePostUploadDirectory(postId) {
  return path.join(env.uploadRoot, "posts", sanitizePathSegment(postId));
}

function resolveFileExtension(file) {
  const preferredExtension = MIME_TYPE_TO_EXTENSION.get(file.mimetype);
  if (preferredExtension) {
    return preferredExtension;
  }

  const originalExtension = path.extname(String(file.originalname ?? "")).toLowerCase();
  return originalExtension || ".bin";
}

const storage = multer.diskStorage({
  destination(req, file, callback) {
    const uploadDirectory = resolvePostUploadDirectory(req.params.id);
    fs.mkdirSync(uploadDirectory, { recursive: true });
    callback(null, uploadDirectory);
  },
  filename(req, file, callback) {
    callback(null, `${Date.now()}-${crypto.randomUUID()}${resolveFileExtension(file)}`);
  },
});

function fileFilter(req, file, callback) {
  if (!POST_MEDIA_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(
      new AppError(
        "Envie apenas imagens nos formatos JPG, PNG ou WebP.",
        "VALIDATION_ERROR",
        400,
        {
          field: "media",
          allowedMimeTypes: POST_MEDIA_ALLOWED_MIME_TYPES,
          allowedExtensions: ["JPG", "PNG", "WebP"],
        },
      ),
    );
    return;
  }

  callback(null, true);
}

const postMediaUpload = multer({
  storage,
  fileFilter,
  limits: {
    files: POST_MEDIA_MAX_ITEMS,
    fileSize: POST_MEDIA_MAX_FILE_SIZE_BYTES,
  },
});

export { postMediaUpload, resolvePostUploadDirectory };

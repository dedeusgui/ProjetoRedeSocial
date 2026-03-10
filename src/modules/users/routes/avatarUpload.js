import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import AppError from "../../../common/errors/AppError.js";
import {
  AVATAR_MEDIA_ALLOWED_MIME_TYPES,
  AVATAR_MEDIA_FIELD_NAME,
  AVATAR_MEDIA_MAX_FILE_SIZE_BYTES,
  AVATAR_MEDIA_MAX_ITEMS,
} from "../../../common/media/avatarMedia.js";
import env from "../../../config/env.js";

const MIME_TYPE_TO_EXTENSION = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function sanitizePathSegment(value) {
  const safeValue = String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
  return safeValue || "user";
}

function resolveAvatarUploadDirectory(userId) {
  return path.join(env.uploadRoot, "avatars", sanitizePathSegment(userId));
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
    const uploadDirectory = resolveAvatarUploadDirectory(req.user?.id ?? req.params.id);
    fs.mkdirSync(uploadDirectory, { recursive: true });
    callback(null, uploadDirectory);
  },
  filename(req, file, callback) {
    callback(null, `${Date.now()}-${crypto.randomUUID()}${resolveFileExtension(file)}`);
  },
});

function fileFilter(req, file, callback) {
  if (!AVATAR_MEDIA_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(
      new AppError(
        "Envie apenas imagens de perfil nos formatos JPG, PNG ou WebP.",
        "VALIDATION_ERROR",
        400,
        {
          field: AVATAR_MEDIA_FIELD_NAME,
          allowedMimeTypes: AVATAR_MEDIA_ALLOWED_MIME_TYPES,
          allowedExtensions: ["JPG", "PNG", "WebP"],
        },
      ),
    );
    return;
  }

  callback(null, true);
}

const avatarUpload = multer({
  storage,
  fileFilter,
  limits: {
    files: AVATAR_MEDIA_MAX_ITEMS,
    fileSize: AVATAR_MEDIA_MAX_FILE_SIZE_BYTES,
  },
});

export { avatarUpload, resolveAvatarUploadDirectory };

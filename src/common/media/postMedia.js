const POST_MEDIA_FIELD_NAME = "media";
const POST_MEDIA_KIND_IMAGE = "image";
const POST_MEDIA_MAX_ITEMS = 4;
const POST_MEDIA_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const POST_MEDIA_MAX_FILE_SIZE_MB = Math.round(POST_MEDIA_MAX_FILE_SIZE_BYTES / (1024 * 1024));
const POST_MEDIA_ALLOWED_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function formatPostMediaItem(media) {
  return {
    id: media?.id ?? null,
    kind: media?.kind ?? POST_MEDIA_KIND_IMAGE,
    url: media?.url ?? "",
    originalName: media?.originalName ?? "",
    mimeType: media?.mimeType ?? "",
    sizeBytes: media?.sizeBytes ?? 0,
    createdAt: media?.createdAt ?? null,
  };
}

function formatPostMediaCollection(mediaItems) {
  return Array.isArray(mediaItems) ? mediaItems.map(formatPostMediaItem) : [];
}

export {
  POST_MEDIA_ALLOWED_MIME_TYPES,
  POST_MEDIA_FIELD_NAME,
  POST_MEDIA_KIND_IMAGE,
  POST_MEDIA_MAX_FILE_SIZE_BYTES,
  POST_MEDIA_MAX_FILE_SIZE_MB,
  POST_MEDIA_MAX_ITEMS,
  formatPostMediaCollection,
};

export const POST_MEDIA_MAX_ITEMS = 4;

export function filterPostImageFiles(files) {
  if (!Array.isArray(files)) {
    return [];
  }

  return files.filter((file) => String(file?.type ?? "").startsWith("image/"));
}

export function getRemainingPostImageSlots({
  occupiedSlots = 0,
  selectedCount = 0,
  maxItems = POST_MEDIA_MAX_ITEMS,
} = {}) {
  const safeMaxItems = Number.isFinite(maxItems) ? Math.max(0, Math.trunc(maxItems)) : POST_MEDIA_MAX_ITEMS;
  const safeOccupiedSlots = Number.isFinite(occupiedSlots)
    ? Math.max(0, Math.trunc(occupiedSlots))
    : 0;
  const safeSelectedCount = Number.isFinite(selectedCount)
    ? Math.max(0, Math.trunc(selectedCount))
    : 0;

  return Math.max(0, safeMaxItems - safeOccupiedSlots - safeSelectedCount);
}

export function appendPostImageSelection(
  currentFiles,
  incomingFiles,
  {
    occupiedSlots = 0,
    maxItems = POST_MEDIA_MAX_ITEMS,
  } = {},
) {
  const safeCurrentFiles = Array.isArray(currentFiles) ? [...currentFiles] : [];
  const imageFiles = filterPostImageFiles(Array.isArray(incomingFiles) ? incomingFiles : []);
  const invalidTypeCount = Math.max(0, (Array.isArray(incomingFiles) ? incomingFiles.length : 0) - imageFiles.length);
  const remainingSlots = getRemainingPostImageSlots({
    occupiedSlots,
    selectedCount: safeCurrentFiles.length,
    maxItems,
  });
  const acceptedIncomingFiles = imageFiles.slice(0, remainingSlots);
  const overflowCount = Math.max(0, imageFiles.length - acceptedIncomingFiles.length);

  return {
    selectedFiles: [...safeCurrentFiles, ...acceptedIncomingFiles],
    acceptedIncomingFiles,
    invalidTypeCount,
    overflowCount,
    remainingSlots: getRemainingPostImageSlots({
      occupiedSlots,
      selectedCount: safeCurrentFiles.length + acceptedIncomingFiles.length,
      maxItems,
    }),
  };
}

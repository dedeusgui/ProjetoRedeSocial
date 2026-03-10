import { ApiError } from "../api.js";

function formatList(items) {
  return items
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .join(", ");
}

function resolveValidationDetailsMessage(error) {
  const details = error.details ?? {};

  if (Array.isArray(details.missingLabels) && details.missingLabels.length > 0) {
    return `Preencha os campos obrigatórios: ${formatList(details.missingLabels)}.`;
  }

  if (details.field === "media" && typeof details.maxItems === "number") {
    return `Um post pode ter no máximo ${details.maxItems} imagens.`;
  }

  if (details.field === "media" && typeof details.maxItemsPerRequest === "number") {
    return `Você pode enviar até ${details.maxItemsPerRequest} imagens por envio.`;
  }

  if (details.field === "media" && typeof details.maxFileSizeMb === "number") {
    return `Cada imagem deve ter no máximo ${details.maxFileSizeMb} MB.`;
  }

  if (Array.isArray(details.allowedExtensions) && details.allowedExtensions.length > 0) {
    return `Envie apenas imagens nos formatos ${formatList(details.allowedExtensions)}.`;
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
    return "Autentica\u00e7\u00e3o necess\u00e1ria para avaliar posts.";
  }

  if (error.code === "FORBIDDEN" || error.status === 403) {
    return "Você não pode avaliar este post.";
  }

  return resolveDetailedApiMessage(error, fallbackMessage);
}

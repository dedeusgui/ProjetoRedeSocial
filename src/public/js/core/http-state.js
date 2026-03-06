import { ApiError } from "../api.js";

export function resolveApiMessage(error, fallbackMessage) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallbackMessage;
}

export function resolveAuthApiMessage(error, unauthenticatedMessage, fallbackMessage) {
  if (error instanceof ApiError) {
    if (error.code === "UNAUTHENTICATED" || error.status === 401) {
      return unauthenticatedMessage;
    }

    return error.message;
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
    return "Voc\u00ea n\u00e3o pode avaliar este post.";
  }

  return error.message;
}

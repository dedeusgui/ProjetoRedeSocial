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
    return "Autentica\u00e7\u00e3o necess\u00e1ria para acessar modera\u00e7\u00e3o.";
  }

  if (error.code === "FORBIDDEN" || error.status === 403) {
    return "Sua conta n\u00e3o possui permiss\u00e3o de modera\u00e7\u00e3o.";
  }

  return error.message;
}

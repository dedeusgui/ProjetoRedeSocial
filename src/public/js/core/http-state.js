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
    return "Autenticacao necessaria para acessar moderacao.";
  }

  if (error.code === "FORBIDDEN" || error.status === 403) {
    return "Sua conta nao possui permissao de moderacao.";
  }

  return error.message;
}

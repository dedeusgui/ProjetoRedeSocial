import { auth } from "../api.js";

export function hasSession() {
  return Boolean(auth.getToken());
}

export function requireSession({ onFail } = {}) {
  if (hasSession()) {
    return true;
  }

  if (typeof onFail === "function") {
    onFail();
  }

  return false;
}

export function clearSession() {
  auth.clearToken();
}

export function saveSessionToken(token) {
  auth.setToken(token);
}

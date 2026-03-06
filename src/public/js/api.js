const API_BASE = "/api/v1";
const TOKEN_KEY = "thesocial_token";

export class ApiError extends Error {
  constructor({ message, code = "REQUEST_FAILED", status = 0, details = null }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path, query) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return `${url.pathname}${url.search}`;
}

async function request(method, path, { body, token, query } = {}) {
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const resolvedToken = token ?? auth.getToken();
  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError({
        message: "Resposta invalida do servidor.",
        code: "INVALID_JSON",
        status: response.status,
      });
    }
  }

  if (!payload || typeof payload !== "object") {
    throw new ApiError({
      message: "Resposta vazia do servidor.",
      code: "EMPTY_RESPONSE",
      status: response.status,
    });
  }

  if (!response.ok || payload.ok !== true) {
    throw new ApiError({
      message: payload?.error?.message ?? "Falha na requisicao.",
      code: payload?.error?.code ?? "REQUEST_FAILED",
      status: response.status,
      details: payload?.error?.details ?? null,
    });
  }

  return payload.data;
}

export const auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      return;
    }

    localStorage.removeItem(TOKEN_KEY);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

export const api = {
  get(path, options = {}) {
    return request("GET", path, options);
  },
  post(path, body, options = {}) {
    return request("POST", path, { ...options, body });
  },
  patch(path, body, options = {}) {
    return request("PATCH", path, { ...options, body });
  },
  delete(path, options = {}) {
    return request("DELETE", path, options);
  },
  auth: {
    register(payload) {
      return request("POST", "/auth/register", { body: payload });
    },
    login(payload) {
      return request("POST", "/auth/login", { body: payload });
    },
  },
  users: {
    meProfile() {
      return request("GET", "/me/profile");
    },
  },
  feed: {
    list({ cursor, limit, search } = {}) {
      return request("GET", "/feed", { query: { cursor, limit, search } });
    },
  },
  posts: {
    create(payload) {
      return request("POST", "/posts", { body: payload });
    },
    getById(postId) {
      return request("GET", `/posts/${postId}`);
    },
    createComment(postId, content) {
      return request("POST", `/posts/${postId}/comments`, {
        body: { content },
      });
    },
    review(postId, decision, reason = null) {
      return request("POST", `/posts/${postId}/review`, {
        body: {
          decision,
          reason,
        },
      });
    },
    update(postId, payload) {
      return request("PATCH", `/posts/${postId}`, { body: payload });
    },
    delete(postId) {
      return request("DELETE", `/posts/${postId}`);
    },
  },
  comments: {
    update(commentId, payload) {
      return request("PATCH", `/comments/${commentId}`, { body: payload });
    },
    delete(commentId) {
      return request("DELETE", `/comments/${commentId}`);
    },
  },
  admin: {
    listUsers() {
      return request("GET", "/admin/users");
    },
    listModeratorEligibility() {
      return request("GET", "/admin/moderator-eligibility");
    },
    setModeratorRole(userId, action) {
      return request("PATCH", `/admin/users/${userId}/moderator`, {
        body: { action },
      });
    },
    deleteUser(userId) {
      return request("DELETE", `/admin/users/${userId}`);
    },
  },
};

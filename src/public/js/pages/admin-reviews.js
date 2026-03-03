import { api, ApiError } from "../api.js";
import { createFlash } from "../components/flash.js";
import { bindLogout, renderNavbarAuthState } from "../components/navbar.js";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-review-status]"),
  form: document.querySelector("[data-review-form]"),
};

const statusFlash = createFlash(elements.status);

function resolveApiMessage(error) {
  if (!(error instanceof ApiError)) {
    return "Erro inesperado ao comunicar com a API.";
  }

  if (error.code === "UNAUTHENTICATED" || error.status === 401) {
    return "Autenticacao necessaria para acessar moderacao.";
  }

  if (error.code === "FORBIDDEN" || error.status === 403) {
    return "Sua conta nao possui permissao de moderacao.";
  }

  return error.message;
}

function renderSessionState() {
  renderNavbarAuthState({
    loginLink: elements.loginLink,
    logoutButton: elements.logoutButton,
  });
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!elements.form) {
    return;
  }

  const formData = new FormData(elements.form);
  const postId = String(formData.get("postId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  statusFlash.show("Salvando review...", "info");

  try {
    const result = await api.posts.review(postId, decision, reason || null);
    elements.form.reset();
    statusFlash.show(`Review salva. Tendencia atual: ${result.trend}`, "success");
  } catch (error) {
    statusFlash.show(resolveApiMessage(error), "error");
  }
}

function bindEvents() {
  if (elements.form) {
    elements.form.addEventListener("submit", handleSubmit);
  }

  bindLogout(elements.logoutButton, () => {
    renderSessionState();
    statusFlash.show("Sessao encerrada.", "info");
  });
}

function init() {
  renderSessionState();
  bindEvents();
}

init();

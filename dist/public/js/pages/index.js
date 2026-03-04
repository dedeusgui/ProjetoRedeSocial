import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { resolveApiMessage } from "../core/http-state.js";
import { hasSession, saveSessionToken } from "../core/session.js";

const FEED_NOTICE_KEY = "thesocial_feed_notice";

const elements = {
  registerForm: document.querySelector("[data-register-form]"),
  loginForm: document.querySelector("[data-login-form]"),
  authStatus: document.querySelector("[data-auth-status]"),
  sessionStatus: document.querySelector("[data-session-status]"),
  loginLink: document.querySelector("[data-login-link]"),
  logoutButton: document.querySelector("[data-logout]"),
};

const authFlash = createFlash(elements.authStatus);
const sessionFlash = createFlash(elements.sessionStatus);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  logoutButton: elements.logoutButton,
  onLogout: () => {
    renderSessionState();
    authFlash.show("Sess\u00e3o encerrada.", "info");
  },
});

function renderSessionState() {
  const isAuthenticated = navbar.refresh();

  sessionFlash.show(
    isAuthenticated
      ? "Sess\u00e3o ativa. Voc\u00ea pode publicar no feed."
      : "Fa\u00e7a login para publicar no feed.",
    "info",
  );
}

function redirectToFeed(noticeMessage) {
  try {
    window.sessionStorage.setItem(FEED_NOTICE_KEY, noticeMessage);
  } catch {
    // noop: redirect still happens without persisted notice
  }

  window.location.href = "./feed.html";
}

async function handleRegister(event) {
  event.preventDefault();
  if (!elements.registerForm) {
    return;
  }

  const formData = new FormData(elements.registerForm);

  try {
    const data = await api.auth.register({
      username: String(formData.get("username") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    });

    saveSessionToken(data.token);
    elements.registerForm.reset();
    redirectToFeed("Conta criada. Bem-vindo ao feed.");
  } catch (error) {
    authFlash.show(
      resolveApiMessage(error, "Erro inesperado ao comunicar com a API."),
      "error",
    );
  }
}

async function handleLogin(event) {
  event.preventDefault();
  if (!elements.loginForm) {
    return;
  }

  const formData = new FormData(elements.loginForm);

  try {
    const data = await api.auth.login({
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    });

    saveSessionToken(data.token);
    elements.loginForm.reset();
    redirectToFeed("Login realizado. Voc\u00ea entrou no feed.");
  } catch (error) {
    authFlash.show(
      resolveApiMessage(error, "Erro inesperado ao comunicar com a API."),
      "error",
    );
  }
}

function bindEvents() {
  if (elements.registerForm) {
    elements.registerForm.addEventListener("submit", handleRegister);
  }

  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", handleLogin);
  }

  if (!hasSession()) {
    authFlash.clear();
  }
}

function init() {
  renderSessionState();
  bindEvents();
}

init();

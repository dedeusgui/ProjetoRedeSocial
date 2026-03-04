import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { HOME_NOTICE_KEY, initNavbar } from "../components/navbar.js";
import { resolveApiMessage } from "../core/http-state.js";
import { saveSessionToken } from "../core/session.js";

const FEED_NOTICE_KEY = "thesocial_feed_notice";

const elements = {
  authAnon: document.querySelector("[data-auth-anon]"),
  registerForm: document.querySelector("[data-register-form]"),
  loginForm: document.querySelector("[data-login-form]"),
  authStatus: document.querySelector("[data-auth-status]"),
  sessionStatus: document.querySelector("[data-session-status]"),
  sessionActionsAnon: document.querySelector("[data-session-actions-anon]"),
  sessionActionsAuth: document.querySelector("[data-session-actions-auth]"),
  privateMetricsCta: document.querySelector("[data-private-metrics-cta]"),
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  logoutButton: document.querySelector("[data-logout]"),
};

const authFlash = createFlash(elements.authStatus);
const sessionFlash = createFlash(elements.sessionStatus);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  logoutRedirectUrl: "./index.html",
});

function toggleHidden(element, hidden) {
  if (element) {
    element.hidden = hidden;
  }
}

function renderAuthExperience() {
  const isAuthenticated = navbar.refresh();

  toggleHidden(elements.authAnon, isAuthenticated);
  toggleHidden(elements.sessionActionsAnon, isAuthenticated);
  toggleHidden(elements.sessionActionsAuth, !isAuthenticated);
  toggleHidden(elements.privateMetricsCta, !isAuthenticated);

  sessionFlash.show(
    isAuthenticated
      ? "Sessao ativa. Voce pode publicar no feed e ver metricas privadas."
      : "Faca login para publicar no feed.",
    "info",
  );

  if (!isAuthenticated) {
    authFlash.clear();
  }

  return isAuthenticated;
}

function consumeHomeNotice() {
  try {
    const notice = window.sessionStorage.getItem(HOME_NOTICE_KEY);
    if (!notice) {
      return;
    }

    window.sessionStorage.removeItem(HOME_NOTICE_KEY);
    sessionFlash.show(notice, "info");
  } catch {
    // noop: sessionStorage can be unavailable in restricted environments
  }
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
}

function init() {
  renderAuthExperience();
  consumeHomeNotice();
  bindEvents();
}

init();

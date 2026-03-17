import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { HOME_NOTICE_KEY } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { resolveApiMessage } from "../core/http-state.js";
import { clearSession } from "../core/session.js";
import { hasSession } from "../core/session.js";
import { saveSessionToken } from "../core/session.js";

const FEED_NOTICE_KEY = "thesocial_feed_notice";

const elements = {
  authAnon: document.querySelector("[data-auth-anon]"),
  registerForm: document.querySelector("[data-register-form]"),
  loginForm: document.querySelector("[data-login-form]"),
  authStatus: document.querySelector("[data-auth-status]"),
  registerPasswordInput: document.querySelector("[data-register-password-input]"),
  registerPasswordConfirmationInput: document.querySelector(
    "[data-register-password-confirmation-input]",
  ),
};

const authFlash = createFlash(elements.authStatus);

function toggleHidden(element, hidden) {
  if (element) {
    element.hidden = hidden;
  }
}

function renderAuthExperience() {
  const isAuthenticated = hasSession();

  toggleHidden(elements.authAnon, isAuthenticated);

  if (!isAuthenticated) {
    authFlash.clear();
  }

  return isAuthenticated;
}

async function checkAuthOnLoad() {
  if (!hasSession()) {
    renderAuthExperience();
    return false;
  }

  toggleHidden(elements.authAnon, true);

  try {
    await api.users.meProfile();
    window.location.href = "./feed.html";
    return true;
  } catch {
    clearSession();
    renderAuthExperience();
    return false;
  }
}

function consumeHomeNotice() {
  try {
    const notice = window.sessionStorage.getItem(HOME_NOTICE_KEY);
    if (!notice) {
      return;
    }

    window.sessionStorage.removeItem(HOME_NOTICE_KEY);
    authFlash.show(notice, "info");
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

function syncRegisterPasswordConfirmationValidity() {
  const password = String(elements.registerPasswordInput?.value ?? "");
  const confirmationInput = elements.registerPasswordConfirmationInput;
  const confirmation = String(confirmationInput?.value ?? "");

  if (!confirmationInput) {
    return true;
  }

  if (!confirmation || confirmation === password) {
    confirmationInput.setCustomValidity("");
    return true;
  }

  confirmationInput.setCustomValidity("Passwords must match.");
  return false;
}

async function handleRegister(event) {
  event.preventDefault();
  if (!elements.registerForm) {
    return;
  }

  const formData = new FormData(elements.registerForm);
  const passwordsMatch = syncRegisterPasswordConfirmationValidity();

  if (!passwordsMatch) {
    authFlash.show("Passwords must match.", "error");
    elements.registerPasswordConfirmationInput?.reportValidity();
    elements.registerPasswordConfirmationInput?.focus();
    return;
  }

  try {
    const data = await api.auth.register({
      username: String(formData.get("username") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    });

    saveSessionToken(data.token);
    elements.registerForm.reset();
    syncRegisterPasswordConfirmationValidity();
    redirectToFeed("Account created. Welcome to the feed.");
  } catch (error) {
    authFlash.show(
      resolveApiMessage(error, "Unexpected error while communicating with the API."),
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
    redirectToFeed("Signed in. You are now in the feed.");
  } catch (error) {
    authFlash.show(
      resolveApiMessage(error, "Unexpected error while communicating with the API."),
      "error",
    );
  }
}

function bindEvents() {
  if (elements.registerForm) {
    elements.registerForm.addEventListener("submit", handleRegister);
  }

  elements.registerPasswordInput?.addEventListener("input", syncRegisterPasswordConfirmationValidity);
  elements.registerPasswordConfirmationInput?.addEventListener(
    "input",
    syncRegisterPasswordConfirmationValidity,
  );

  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", handleLogin);
  }
}

async function init() {
  bindNavigation();

  const redirectedToFeed = await checkAuthOnLoad();
  if (redirectedToFeed) {
    return;
  }

  consumeHomeNotice();
  bindEvents();
}

void init();

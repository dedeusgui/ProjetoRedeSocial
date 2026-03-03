import { api, ApiError, auth } from "../api.js";

const elements = {
  registerForm: document.querySelector("[data-register-form]"),
  loginForm: document.querySelector("[data-login-form]"),
  authStatus: document.querySelector("[data-auth-status]"),
  sessionStatus: document.querySelector("[data-session-status]"),
  logoutButton: document.querySelector("[data-logout]"),
};

function setMessage(target, message) {
  if (target) {
    target.textContent = message;
  }
}

function resolveApiMessage(error) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Erro inesperado ao comunicar com a API.";
}

function renderSessionState() {
  const hasToken = Boolean(auth.getToken());

  if (elements.logoutButton) {
    elements.logoutButton.hidden = !hasToken;
  }

  setMessage(
    elements.sessionStatus,
    hasToken
      ? "Sessao ativa. Voce pode publicar, comentar e acessar metricas privadas."
      : "Faca login para comentar, publicar e acessar metricas privadas.",
  );
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

    auth.setToken(data.token);
    elements.registerForm.reset();
    renderSessionState();
    setMessage(elements.authStatus, "Conta criada. Sessao iniciada.");
  } catch (error) {
    setMessage(elements.authStatus, resolveApiMessage(error));
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

    auth.setToken(data.token);
    elements.loginForm.reset();
    renderSessionState();
    setMessage(elements.authStatus, "Login realizado com sucesso.");
  } catch (error) {
    setMessage(elements.authStatus, resolveApiMessage(error));
  }
}

function bindEvents() {
  if (elements.registerForm) {
    elements.registerForm.addEventListener("submit", handleRegister);
  }

  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", handleLogin);
  }

  if (elements.logoutButton) {
    elements.logoutButton.addEventListener("click", () => {
      auth.clearToken();
      renderSessionState();
      setMessage(elements.authStatus, "Sessao encerrada.");
    });
  }
}

function init() {
  renderSessionState();
  bindEvents();
}

init();

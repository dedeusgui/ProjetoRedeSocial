import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initMotionToggle } from "../components/motion.js";
import { initNavbar } from "../components/navbar.js";
import { resolveApiMessage } from "../core/http-state.js";
import { hasSession, saveSessionToken } from "../core/session.js";

const elements = {
  registerForm: document.querySelector("[data-register-form]"),
  loginForm: document.querySelector("[data-login-form]"),
  authStatus: document.querySelector("[data-auth-status]"),
  sessionStatus: document.querySelector("[data-session-status]"),
  loginLink: document.querySelector("[data-login-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  motionToggle: document.querySelector("[data-motion-toggle]"),
};

const authFlash = createFlash(elements.authStatus);
const sessionFlash = createFlash(elements.sessionStatus);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  logoutButton: elements.logoutButton,
  onLogout: () => {
    renderSessionState();
    authFlash.show("Sessao encerrada. Sem truques, sem pressa.", "info");
  },
});

function renderSessionState() {
  const isAuthenticated = navbar.refresh();

  sessionFlash.show(
    isAuthenticated
      ? "Sessao ativa. Va para o feed e compartilhe algo util para a comunidade."
      : "Faca login para publicar conhecimento. Sem seguidores, sem disputa.",
    "info",
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

    saveSessionToken(data.token);
    elements.registerForm.reset();
    renderSessionState();
    authFlash.show(
      "Conta criada com sucesso. Proximo passo: publicar seu primeiro post.",
      "success",
    );
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
    renderSessionState();
    authFlash.show(
      "Login realizado. Abra o feed e poste algo que agregue.",
      "success",
    );
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
  initMotionToggle({ button: elements.motionToggle });
  renderSessionState();
  bindEvents();
}

init();

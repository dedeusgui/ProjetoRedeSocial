import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { resolveModerationApiMessage } from "../core/http-state.js";
import { reviewSavedMessage } from "../features/moderation/renderers.js";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-review-status]"),
  form: document.querySelector("[data-review-form]"),
};

const statusFlash = createFlash(elements.status);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  logoutButton: elements.logoutButton,
  onLogout: () => {
    navbar.refresh();
    statusFlash.show("Sessao encerrada.", "info");
  },
});

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
    statusFlash.show(reviewSavedMessage(result), "success");
  } catch (error) {
    statusFlash.show(resolveModerationApiMessage(error, "Erro inesperado ao comunicar com a API."), "error");
  }
}

function init() {
  navbar.refresh();

  if (elements.form) {
    elements.form.addEventListener("submit", handleSubmit);
  }
}

init();

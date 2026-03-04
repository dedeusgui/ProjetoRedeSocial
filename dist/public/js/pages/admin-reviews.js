import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-review-status]"),
};

const statusFlash = createFlash(elements.status);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  logoutButton: elements.logoutButton,
  onLogout: () => {
    navbar.refresh();
    statusFlash.show("Sess\u00e3o encerrada.", "info");
  },
});

function init() {
  navbar.refresh();
  statusFlash.show("Avalie posts com aprovar/n\u00e3o relevante. Use coment\u00e1rios para contexto.", "info");
}

init();

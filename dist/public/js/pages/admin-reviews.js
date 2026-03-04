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
  statusFlash.show("A avalia\u00e7\u00e3o de posts est\u00e1 restrita \u00e0 \u00e1rea administrativa.", "info");
}

init();

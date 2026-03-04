import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-review-status]"),
};

const statusFlash = createFlash(elements.status);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  logoutRedirectUrl: "../index.html",
});

function init() {
  bindNavigation();
  navbar.refresh();
  statusFlash.show("Avalie posts com aprovar/n\u00e3o relevante. Use coment\u00e1rios para contexto.", "info");
}

init();

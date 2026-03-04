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
  statusFlash.show("Use a p\u00e1gina do post para revisar conte\u00fado.", "info");
}

init();

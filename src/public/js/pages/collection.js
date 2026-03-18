import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { resolveAuthApiMessage } from "../core/http-state.js";
import { renderCollectionView } from "../features/collections/renderers.js";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-collection-status]"),
  view: document.querySelector("[data-collection-view]"),
};

const statusFlash = createFlash(elements.status);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  logoutRedirectUrl: "./index.html",
});

function getCollectionId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderMissingState(message) {
  if (!elements.view) {
    return;
  }

  elements.view.innerHTML = `
      <section class="card empty-card">
      <h2 class="ink-underline">Collection unavailable</h2>
      <p class="muted">${message}</p>
      <button type="button" class="button-link button-link-inline" data-nav-href="./feed.html">Back to feed</button>
    </section>
  `;
}

async function loadCollection() {
  const collectionId = getCollectionId();
  if (!collectionId) {
    renderMissingState("Collection ID is missing from the URL.");
    statusFlash.show("Could not open the collection.", "error");
    return;
  }

  statusFlash.show("Loading collection...", "info");
  try {
    const collection = await api.collections.getById(collectionId);
    renderCollectionView(elements.view, collection);
    statusFlash.clear();
  } catch (error) {
    renderMissingState("This collection cannot be displayed right now.");
    statusFlash.show(
      resolveAuthApiMessage(error, "Authentication required.", "Could not load the collection."),
      "error",
    );
  }
}

async function init() {
  bindNavigation();
  navbar.refresh();
  await loadCollection();
}

init();

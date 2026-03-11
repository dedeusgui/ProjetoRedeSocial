import { api, ApiError } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { escapeHtml, formatDateTime, formatPercent } from "../core/formatters.js";
import { hasSession } from "../core/session.js";
import { resolveAuthApiMessage } from "../core/http-state.js";

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-review-status]"),
  panel: document.querySelector("[data-admin-panel]"),
  requirements: document.querySelector("[data-admin-requirements]"),
  eligibleList: document.querySelector("[data-eligible-list]"),
  moderatorsList: document.querySelector("[data-moderators-list]"),
  refreshButton: document.querySelector("[data-admin-refresh]"),
};

const statusFlash = createFlash(elements.status);
const state = {
  isLoading: false,
  isUpdating: false,
};

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  logoutRedirectUrl: "../index.html",
});

function init() {
  bindNavigation();
  navbar.refresh();
  bindEvents();
  loadAdminPanel();
}

init();

function resolveMessage(error) {
  if (error instanceof ApiError && (error.code === "FORBIDDEN" || error.status === 403)) {
    return "Access restricted to administrators.";
  }

  return resolveAuthApiMessage(
    error,
    "Authentication required. Sign in to access the admin panel.",
    "Unexpected error while loading the admin panel.",
  );
}

function renderUserCards(target, users, emptyMessage, actionLabel, actionKind, buttonClassName = "") {
  if (!target) {
    return;
  }

  if (!Array.isArray(users) || users.length === 0) {
    target.innerHTML = `<p class="muted">${emptyMessage}</p>`;
    return;
  }

  target.innerHTML = users
    .map((user) => {
      const buttonClasses = ["button-link-inline"];
      if (buttonClassName) {
        buttonClasses.push(buttonClassName);
      }

      return `
        <article class="card managed-user-card">
          <p><strong>@${escapeHtml(user.username)}</strong> <span class="muted">(${escapeHtml(user.email)})</span></p>
          <p class="muted">Role: ${escapeHtml(user.role)}</p>
          <p class="muted">Approval: ${formatPercent(user.score ?? 0)} | Posts: ${user.postCount}</p>
          <p class="muted">Reviews received: ${escapeHtml(user.totalReviews ?? 0)}</p>
          <p class="muted">Created: ${formatDateTime(user.createdAt)}</p>
          <button
            type="button"
            class="${buttonClasses.join(" ")}"
            data-admin-action="${actionKind}"
            data-user-id="${user.id}"
            ${state.isUpdating ? "disabled" : ""}
          >
            ${actionLabel}
          </button>
        </article>
      `;
    })
    .join("");
}

function renderRequirements(requirements) {
  if (!elements.requirements || !requirements) {
    return;
  }

  elements.requirements.textContent =
    `Current requirements: ${requirements.minPosts} posts, ` +
    `account age ${requirements.minAccountAgeDays}+ days, and ` +
    `approval >= ${formatPercent(requirements.minScore)}.`;
}

function renderPanel(data) {
  renderRequirements(data?.requirements);

  renderUserCards(
    elements.eligibleList,
    data?.eligibleUsers ?? [],
    "No eligible users right now.",
    "Grant moderator",
    "grant",
    "button-approve",
  );

  renderUserCards(
    elements.moderatorsList,
    data?.moderators ?? [],
    "No active moderators.",
    "Remove moderator",
    "revoke",
    "button-reject",
  );
}

async function ensureAdminProfile() {
  const profile = await api.users.meProfile();
  if (profile.role !== "admin") {
    throw new ApiError({
      message: "Access restricted to administrators.",
      code: "FORBIDDEN",
      status: 403,
    });
  }
}

async function loadAdminPanel() {
  if (state.isLoading) {
    return;
  }

  if (!hasSession()) {
    statusFlash.show("Sign in to access the admin panel.", "error");
    window.location.href = "../index.html";
    return;
  }

  state.isLoading = true;
  if (elements.refreshButton) {
    elements.refreshButton.disabled = true;
  }
  statusFlash.show("Loading admin panel...", "info");

  try {
    await ensureAdminProfile();
    const data = await api.admin.listModeratorEligibility();
    if (elements.panel) {
      elements.panel.hidden = false;
    }
    renderPanel(data);
    statusFlash.clear();
  } catch (error) {
    if (elements.panel) {
      elements.panel.hidden = true;
    }
    statusFlash.show(resolveMessage(error), "error");
  } finally {
    state.isLoading = false;
    if (elements.refreshButton) {
      elements.refreshButton.disabled = false;
    }
  }
}

async function handleRoleAction(button) {
  if (state.isUpdating || !button) {
    return;
  }

  const userId = String(button.dataset.userId ?? "").trim();
  const action = String(button.dataset.adminAction ?? "").trim();
  if (!userId || !action) {
    return;
  }

  state.isUpdating = true;
  statusFlash.show("Applying role change...", "info");
  try {
    await api.admin.setModeratorRole(userId, action);
    await loadAdminPanel();
    statusFlash.show("Role updated successfully.", "success");
  } catch (error) {
    statusFlash.show(resolveMessage(error), "error");
  } finally {
    state.isUpdating = false;
  }
}

function bindEvents() {
  if (elements.refreshButton) {
    elements.refreshButton.addEventListener("click", () => {
      loadAdminPanel();
    });
  }

  const panelTarget = elements.panel;
  if (!panelTarget) {
    return;
  }

  panelTarget.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-action]");
    if (!button || !panelTarget.contains(button)) {
      return;
    }

    handleRoleAction(button);
  });
}

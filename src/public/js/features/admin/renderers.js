import { escapeHtml, formatDateTime, formatPercent } from "../../core/formatters.js";

export function renderAdminUserList(target, users, { currentAdminId = null } = {}) {
  if (!target) {
    return;
  }

  if (!Array.isArray(users) || users.length === 0) {
    target.innerHTML = "<p class='muted'>No users found.</p>";
    return;
  }

  target.innerHTML = users
    .map((user) => {
      const canDelete =
        user.role !== "admin" &&
        String(user.id) !== String(currentAdminId ?? "");

      return `
        <article class="card managed-user-card">
          <p><strong>@${escapeHtml(user.username)}</strong> <span class="muted">(${escapeHtml(user.email)})</span></p>
          <p class="muted">Role: ${escapeHtml(user.role)}</p>
          <p class="muted">Posts: ${escapeHtml(user.postCount)} | Approval: ${escapeHtml(formatPercent(user.score ?? 0))}</p>
          <p class="muted">Reviews received: ${escapeHtml(user.totalReviews ?? 0)}</p>
          <p class="muted">Created: ${escapeHtml(formatDateTime(user.createdAt))}</p>
          ${canDelete ? `<button type="button" class="button-reject button-link-inline" data-admin-delete-user-id="${escapeHtml(user.id)}">Delete user</button>` : ""}
        </article>
      `;
    })
    .join("");
}
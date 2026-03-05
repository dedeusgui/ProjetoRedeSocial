import { escapeHtml, formatDateTime } from "../../core/formatters.js";

export function renderAdminUserList(target, users, { currentAdminId = null } = {}) {
  if (!target) {
    return;
  }

  if (!Array.isArray(users) || users.length === 0) {
    target.innerHTML = "<p class='muted'>Nenhum usu\u00e1rio encontrado.</p>";
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
          <p class="muted">Papel: ${escapeHtml(user.role)}</p>
          <p class="muted">Posts: ${escapeHtml(user.postCount)}</p>
          <p class="muted">Criado em: ${escapeHtml(formatDateTime(user.createdAt))}</p>
          ${canDelete ? `<button type="button" class="button-reject button-link-inline" data-admin-delete-user-id="${escapeHtml(user.id)}">Excluir usu\u00e1rio</button>` : ""}
        </article>
      `;
    })
    .join("");
}

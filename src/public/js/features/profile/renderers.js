import { escapeHtml, formatDateTime } from "../../core/formatters.js";

export function renderProfileView(target, profile) {
  if (!target) {
    return;
  }

  target.innerHTML = `
    <section class="card profile-card">
      <h2>@${escapeHtml(profile.username)}</h2>
      <p class="muted">${escapeHtml(profile.email)}</p>
      <p class="muted">Papel: ${escapeHtml(profile.role)}</p>
      <p class="muted">Criado em: ${escapeHtml(formatDateTime(profile.createdAt))}</p>
      <div class="metrics-grid">
        <article class="card metric-box">
          <h3>Taxa de aprova&ccedil;&atilde;o</h3>
          <p>${escapeHtml(profile.privateMetrics?.approvalRate ?? 0)}%</p>
        </article>
        <article class="card metric-box">
          <h3>Taxa de reprova&ccedil;&atilde;o</h3>
          <p>${escapeHtml(profile.privateMetrics?.rejectionRate ?? 0)}%</p>
        </article>
      </div>
    </section>
  `;
}

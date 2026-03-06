import {
  escapeHtml,
  formatDateTime,
  formatPercent,
} from "../../core/formatters.js";

export function renderProfileView(target, profile) {
  if (!target) {
    return;
  }

  const approvalPercentage = Number(profile.privateMetrics?.score ?? 0);
  const totalReviews = profile.privateMetrics?.totalReviews ?? 0;

  target.innerHTML = `
    <section class="card profile-card">
      <h2>@${escapeHtml(profile.username)}</h2>
      <p class="muted">${escapeHtml(profile.email)}</p>
      <p class="muted">Papel: ${escapeHtml(profile.role)}</p>
      <p class="muted">Criado em: ${escapeHtml(formatDateTime(profile.createdAt))}</p>
      <div class="metrics-grid">
        <article class="card metric-box">
          <h3>Avalia&ccedil;&atilde;o geral</h3>
          <p><strong>Aprova&ccedil;&atilde;o: <span class="status-neutral">${escapeHtml(formatPercent(approvalPercentage))}</span></strong></p>
          <p class="muted">Avalia&ccedil;&otilde;es recebidas: ${escapeHtml(totalReviews)}</p>
        </article>
      </div>
    </section>
  `;
}
